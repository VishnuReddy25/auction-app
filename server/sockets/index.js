/**
 * Socket handler — thin communication layer only
 * All game logic lives in GameService
 */
const Room        = require('../models/Room');
const GameService = require('../services/GameService');
const Store       = require('../engine/StateStore');

const meta = new Map(); // socketId -> { roomCode, userId, username, isHost }

module.exports = { initSockets };

function initSockets(io) {
  io.on('connection', socket => {
    console.log('connected', socket.id);

    // ── Join room ──────────────────────────────────────────────────────────
    socket.on('room:join', async ({ roomCode, userId, username }, ack) => {
      try {
        const room = await Room.findOne({ code: roomCode.toUpperCase() }).populate('host','username');
        if (!room) return ack?.({ ok: false, error: 'Room not found' });

        const isHost = room.host._id.toString() === userId;

        if (!room.members.find(m => m.userId === userId)) {
          room.members.push({ userId, username, isHost });
          await room.save();
        }

        socket.join(roomCode.toUpperCase());
        meta.set(socket.id, { roomCode: roomCode.toUpperCase(), userId, username, isHost });

        // Init game state if needed
        if (!Store.has(roomCode.toUpperCase())) {
          await GameService.initRoom(roomCode.toUpperCase(), room.members, room.settings);
        } else {
          const state = Store.get(roomCode.toUpperCase());
          if (!state.players.find(p => p.id === userId)) {
            state.players.push({ id: userId, username, isHost, budget: room.settings.startingBudget, isActive: true, team: [], startingBudget: room.settings.startingBudget });
            Store.set(roomCode.toUpperCase(), state);
          }
        }

        const state = Store.get(roomCode.toUpperCase());
        io.to(roomCode.toUpperCase()).emit('room:updated', { state, members: room.members });
        socket.emit('room:joined', { room, state });
        io.to(roomCode.toUpperCase()).emit('chat:msg', { username: 'System', message: `${username} joined`, type: 'system' });
        ack?.({ ok: true, state, room });
      } catch(err) {
        console.error('room:join error', err);
        ack?.({ ok: false, error: err.message });
      }
    });

    // ── Start auction ──────────────────────────────────────────────────────
    socket.on('auction:start', async (_, ack) => {
      const m = meta.get(socket.id);
      if (!m?.isHost) return ack?.({ ok: false, error: 'Only host' });
      const result = await GameService.startAuction(m.roomCode, io);
      ack?.(result);
    });

    // ── Place bid ──────────────────────────────────────────────────────────
    socket.on('bid:place', ({ amount }, ack) => {
      const m = meta.get(socket.id);
      if (!m) return ack?.({ ok: false, error: 'Not in room' });
      const result = GameService.placeBid(m.roomCode, m.userId, m.username, amount, io);
      ack?.(result);
    });

    // ── Host controls ──────────────────────────────────────────────────────
    socket.on('host:sold',   async (_, ack) => {
      const m = meta.get(socket.id);
      if (!m?.isHost) return ack?.({ ok: false, error: 'Only host' });
      await GameService.forceSold(m.roomCode, io);
      ack?.({ ok: true });
    });

    socket.on('host:unsold', async (_, ack) => {
      const m = meta.get(socket.id);
      if (!m?.isHost) return ack?.({ ok: false, error: 'Only host' });
      await GameService.forceUnsold(m.roomCode, io);
      ack?.({ ok: true });
    });

    socket.on('host:next', async (_, ack) => {
      const m = meta.get(socket.id);
      if (!m?.isHost) return ack?.({ ok: false, error: 'Only host' });
      const result = await GameService.nextItem(m.roomCode, io);
      ack?.(result);
    });

    socket.on('host:pause', (_, ack) => {
      const m = meta.get(socket.id);
      if (!m?.isHost) return;
      GameService.pause(m.roomCode, io);
      ack?.({ ok: true });
    });

    socket.on('host:resume', (_, ack) => {
      const m = meta.get(socket.id);
      if (!m?.isHost) return;
      GameService.resume(m.roomCode, io);
      ack?.({ ok: true });
    });

    // ── AI suggestion ──────────────────────────────────────────────────────
    socket.on('bid:suggest', (_, ack) => {
      const m = meta.get(socket.id);
      if (!m) return ack?.({ suggestion: null });
      ack?.({ suggestion: GameService.suggest(m.roomCode, m.userId) });
    });

    // ── Analytics ──────────────────────────────────────────────────────────
    socket.on('analytics:get', (_, ack) => {
      const m = meta.get(socket.id);
      if (!m) return ack?.({ analytics: null });
      ack?.({ analytics: GameService.getAnalytics(m.roomCode, m.userId) });
    });

    // ── Chat ───────────────────────────────────────────────────────────────
    socket.on('chat:send', ({ message }, ack) => {
      const m = meta.get(socket.id);
      if (!m || !message?.trim()) return;
      const msg = { username: m.username, message: message.trim().slice(0,300), type:'user', time: new Date() };
      io.to(m.roomCode).emit('chat:msg', msg);
      Room.findOneAndUpdate({ code: m.roomCode }, { $push: { chat: { $each:[msg], $slice:-100 } } }).catch(()=>{});
      ack?.({ ok: true });
    });

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const m = meta.get(socket.id);
      if (m) {
        io.to(m.roomCode).emit('chat:msg', { username:'System', message:`${m.username} disconnected`, type:'system' });
        meta.delete(socket.id);
      }
    });
  });
}
