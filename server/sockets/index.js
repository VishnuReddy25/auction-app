const Room        = require('../models/Room');
const GameService = require('../services/GameService');
const Store       = require('../engine/StateStore');

const meta = new Map();

module.exports = { initSockets };

function initSockets(io) {
  io.on('connection', socket => {

    socket.on('room:join', async ({ roomCode, userId, username }, ack) => {
      try {
        const code = roomCode.toUpperCase();
        const room = await Room.findOne({ code }).populate('host','username');
        if (!room) return ack?.({ ok: false, error: 'Room not found' });

        const isHost = room.host._id.toString() === userId;

        if (!room.members.find(m => m.userId === userId)) {
          room.members.push({ userId, username, isHost });
          await room.save();
        }

        socket.join(code);
        meta.set(socket.id, { roomCode: code, userId, username, isHost });

        if (!Store.has(code)) {
          await GameService.initRoom(code, room.members, room.settings);
        } else {
          const state = Store.get(code);
          if (!state.players.find(p => p.id === userId)) {
            state.players.push({ id: userId, username, isHost, budget: room.settings.startingBudget, startingBudget: room.settings.startingBudget, isActive: true, team: [] });
            Store.set(code, state);
          }
        }

        const state = Store.get(code);
        io.to(code).emit('room:updated', { state, members: room.members });
        socket.emit('room:joined', { room, state });
        io.to(code).emit('chat:msg', { username:'System', message:`${username} joined`, type:'system' });
        ack?.({ ok: true, state, room });
      } catch(err) {
        console.error('room:join error', err.message);
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('auction:start', async (_, ack) => {
      const m = meta.get(socket.id);
      if (!m?.isHost) return ack?.({ ok: false, error: 'Only host' });
      const result = await GameService.startAuction(m.roomCode, io);
      ack?.(result);
    });

    socket.on('bid:place', ({ amount }, ack) => {
      const m = meta.get(socket.id);
      if (!m) return ack?.({ ok: false, error: 'Not in room' });
      const result = GameService.placeBid(m.roomCode, m.userId, m.username, amount, io);
      ack?.(result);
    });

    socket.on('host:sold', async (_, ack) => {
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

    socket.on('bid:suggest', (_, ack) => {
      const m = meta.get(socket.id);
      if (!m) return ack?.({ suggestion: null });
      ack?.({ suggestion: GameService.suggest(m.roomCode, m.userId) });
    });

    socket.on('analytics:get', (_, ack) => {
      const m = meta.get(socket.id);
      if (!m) return ack?.({ analytics: null });
      ack?.({ analytics: GameService.getAnalytics(m.roomCode, m.userId) });
    });

    socket.on('chat:send', ({ message }, ack) => {
      const m = meta.get(socket.id);
      if (!m || !message?.trim()) return;
      const msg = { username: m.username, message: message.trim().slice(0,300), type:'user', time: new Date() };
      io.to(m.roomCode).emit('chat:msg', msg);
      Room.findOneAndUpdate({ code: m.roomCode }, { $push: { chat: { $each:[msg], $slice:-100 } } }).catch(()=>{});
      ack?.({ ok: true });
    });

    socket.on('disconnect', async () => {
      const m = meta.get(socket.id);
      if (!m) return;
      meta.delete(socket.id);

      try {
        // Only remove from room if auction hasn't started yet (waiting phase)
        const state = require('./engine/StateStore').get?.(m.roomCode) ||
                      require('../engine/StateStore').get?.(m.roomCode);
        const phase = state?.phase || 'waiting';

        if (phase === 'waiting') {
          // Remove from DB members list
          await Room.findOneAndUpdate(
            { code: m.roomCode },
            { $pull: { members: { userId: m.userId } } }
          );
          // Also remove from in-memory state
          const Store = require('../engine/StateStore');
          const st    = Store.get(m.roomCode);
          if (st) {
            st.players = st.players.filter(p => p.id !== m.userId);
            Store.set(m.roomCode, st);
          }
          // Get updated room and broadcast
          const room = await Room.findOne({ code: m.roomCode });
          if (room) {
            io.to(m.roomCode).emit('room:updated', { state: Store.get(m.roomCode), members: room.members });
          }
          io.to(m.roomCode).emit('chat:msg', { username:'System', message:`${m.username} left the room`, type:'system' });
        } else {
          // Auction in progress — just notify, keep them in the list
          io.to(m.roomCode).emit('chat:msg', { username:'System', message:`${m.username} disconnected`, type:'system' });
        }
      } catch(err) {
        console.error('disconnect error:', err.message);
      }
    });
  });
}
