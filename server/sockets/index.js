const Room    = require('../models/Room');
const Engine  = require('../engine/AuctionEngine');
const Timer   = require('../engine/TimerManager');
const Store   = require('../engine/StateStore');
const PLAYERS = require('../services/players');

// socketId -> { roomCode, userId, username, isHost }
const meta = new Map();

function getTimerCallbacks(io, roomCode) {
  return {
    onTick: left => io.to(roomCode).emit('timer', { left }),
    onEnd:  () => closeRound(io, roomCode),
  };
}

async function closeRound(io, roomCode) {
  Timer.clear(roomCode);
  const state = Store.get(roomCode);
  if (!state || state.phase !== 'bidding') return;

  const { state: newState, result } = Engine.closeBidding(state);
  Store.set(roomCode, newState);

  io.to(roomCode).emit('round:closed', { result, state: newState });

  if (result.type === 'sold') {
    io.to(roomCode).emit('chat:msg', {
      username: '🔨 Auctioneer',
      message:  `SOLD! ${result.item.name} → ${result.winner} for ₹${result.price}L`,
      type:     'system',
    });
  } else {
    io.to(roomCode).emit('chat:msg', {
      username: '🔨 Auctioneer',
      message:  `UNSOLD — ${result.item.name} goes back to the pool`,
      type:     'system',
    });
  }
}

module.exports = { initSockets };

function initSockets(io) {
  io.on('connection', socket => {
    console.log('🔌 connected', socket.id);

    // ── Join room ──────────────────────────────────────────────────────────
    socket.on('room:join', async ({ roomCode, userId, username }, ack) => {
      try {
        const room = await Room.findOne({ code: roomCode.toUpperCase() }).populate('host','username');
        if (!room) return ack?.({ ok: false, error: 'Room not found' });

        const isHost = room.host._id.toString() === userId;

        // Add to members if not already there
        if (!room.members.find(m => m.userId === userId)) {
          room.members.push({ userId, username, isHost });
          await room.save();
        }

        socket.join(roomCode.toUpperCase());
        meta.set(socket.id, { roomCode: roomCode.toUpperCase(), userId, username, isHost });

        // Init state if needed
        if (!Store.has(roomCode.toUpperCase())) {
          const players = room.members.map(m => ({
            id: m.userId, username: m.username, isHost: m.isHost,
            budget: room.settings.startingBudget,
          }));
          const state = Engine.createState({
            roomId: roomCode.toUpperCase(),
            players,
            items: PLAYERS,
            settings: room.settings,
          });
          Store.set(roomCode.toUpperCase(), state);
        } else {
          // Ensure this player exists in state
          const state = Store.get(roomCode.toUpperCase());
          if (!state.players.find(p => p.id === userId)) {
            state.players.push({ id: userId, username, isHost, budget: room.settings.startingBudget, isActive: true, team: [] });
            Store.set(roomCode.toUpperCase(), state);
          }
        }

        const state = Store.get(roomCode.toUpperCase());
        io.to(roomCode.toUpperCase()).emit('room:updated', { state, members: room.members });
        socket.emit('room:joined', { room, state });

        // Announce join
        io.to(roomCode.toUpperCase()).emit('chat:msg', {
          username: '🏏 System', message: `${username} joined the room`, type: 'system',
        });

        ack?.({ ok: true, state, room });
      } catch(err) {
        console.error(err);
        ack?.({ ok: false, error: err.message });
      }
    });

    // ── Start auction (host only) ──────────────────────────────────────────
    socket.on('auction:start', async (_, ack) => {
      const m = meta.get(socket.id);
      if (!m?.isHost) return ack?.({ ok: false, error: 'Only host can start' });

      const state = Store.get(m.roomCode);
      if (!state) return ack?.({ ok: false, error: 'No state' });

      const newState = Engine.start(state);
      Store.set(m.roomCode, newState);

      await Room.findOneAndUpdate({ code: m.roomCode }, { status: 'active' });

      io.to(m.roomCode).emit('auction:started', { state: newState, item: Engine.getCurrentItem(newState) });
      io.to(m.roomCode).emit('chat:msg', {
        username: '🔨 Auctioneer', message: `Auction started! Bidding on: ${Engine.getCurrentItem(newState)?.name}`, type: 'system',
      });

      Timer.start(m.roomCode, newState.settings.timerSeconds, getTimerCallbacks(io, m.roomCode));
      ack?.({ ok: true });
    });

    // ── Place bid (open — anyone can bid anytime) ──────────────────────────
    socket.on('bid:place', ({ amount }, ack) => {
      const m = meta.get(socket.id);
      if (!m) return ack?.({ ok: false, error: 'Not in room' });

      const state = Store.get(m.roomCode);
      if (!state) return ack?.({ ok: false, error: 'No active game' });

      const result = Engine.placeBid(state, m.userId, amount);
      if (!result.success) return ack?.({ ok: false, error: result.reason });

      Store.set(m.roomCode, result.state);

      // Broadcast new bid to all
      io.to(m.roomCode).emit('bid:new', {
        username: m.username,
        amount,
        state: result.state,
      });

      // Chat notification
      io.to(m.roomCode).emit('chat:msg', {
        username: '💰 Bid',
        message:  `${m.username} bids ₹${amount}L on ${Engine.getCurrentItem(state)?.name}`,
        type:     'bid',
      });

      ack?.({ ok: true });
    });

    // ── Host: close round early (SOLD) ─────────────────────────────────────
    socket.on('host:sold', (_, ack) => {
      const m = meta.get(socket.id);
      if (!m?.isHost) return ack?.({ ok: false, error: 'Only host' });
      closeRound(io, m.roomCode);
      ack?.({ ok: true });
    });

    // ── Host: mark unsold ─────────────────────────────────────────────────
    socket.on('host:unsold', (_, ack) => {
      const m = meta.get(socket.id);
      if (!m?.isHost) return ack?.({ ok: false, error: 'Only host' });

      Timer.clear(m.roomCode);
      const state = Store.get(m.roomCode);
      if (!state) return;

      // Force unsold by clearing bidder
      const cleared = { ...state, currentBidderId: null, currentBid: 0, currentBidderName: null };
      Store.set(m.roomCode, cleared);
      closeRound(io, m.roomCode);
      ack?.({ ok: true });
    });

    // ── Host: next player ──────────────────────────────────────────────────
    socket.on('host:next', (_, ack) => {
      const m = meta.get(socket.id);
      if (!m?.isHost) return ack?.({ ok: false, error: 'Only host' });

      Timer.clear(m.roomCode);
      const state = Store.get(m.roomCode);
      if (!state) return;

      const { state: newState, done } = Engine.nextItem(state);
      Store.set(m.roomCode, newState);

      if (done) {
        const leaderboard = Engine.getLeaderboard(newState);
        io.to(m.roomCode).emit('auction:complete', { leaderboard, state: newState });
        Room.findOneAndUpdate({ code: m.roomCode }, { status: 'completed' }).catch(() => {});
      } else {
        const item = Engine.getCurrentItem(newState);
        io.to(m.roomCode).emit('item:next', { state: newState, item });
        io.to(m.roomCode).emit('chat:msg', {
          username: '🔨 Auctioneer', message: `Now bidding: ${item.name} (Base: ₹${item.basePrice}L)`, type: 'system',
        });
        Timer.start(m.roomCode, newState.settings.timerSeconds, getTimerCallbacks(io, m.roomCode));
      }
      ack?.({ ok: true });
    });

    // ── Host: pause / resume ───────────────────────────────────────────────
    socket.on('host:pause', (_, ack) => {
      const m = meta.get(socket.id);
      if (!m?.isHost) return;
      Timer.clear(m.roomCode);
      io.to(m.roomCode).emit('auction:paused');
      ack?.({ ok: true });
    });

    socket.on('host:resume', (_, ack) => {
      const m = meta.get(socket.id);
      if (!m?.isHost) return;
      const state = Store.get(m.roomCode);
      if (!state || state.phase !== 'bidding') return;
      Timer.start(m.roomCode, state.settings.timerSeconds, getTimerCallbacks(io, m.roomCode));
      io.to(m.roomCode).emit('auction:resumed', { state });
      ack?.({ ok: true });
    });

    // ── Bid suggestion ─────────────────────────────────────────────────────
    socket.on('bid:suggest', (_, ack) => {
      const m = meta.get(socket.id);
      if (!m) return ack?.({ suggestion: null });
      const state = Store.get(m.roomCode);
      ack?.({ suggestion: state ? Engine.suggest(state, m.userId) : null });
    });

    // ── Chat ───────────────────────────────────────────────────────────────
    socket.on('chat:send', ({ message }, ack) => {
      const m = meta.get(socket.id);
      if (!m || !message?.trim()) return;
      const msg = { username: m.username, message: message.trim().slice(0, 300), type: 'user', time: new Date() };
      io.to(m.roomCode).emit('chat:msg', msg);
      Room.findOneAndUpdate({ code: m.roomCode }, { $push: { chat: { $each: [msg], $slice: -100 } } }).catch(() => {});
      ack?.({ ok: true });
    });

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const m = meta.get(socket.id);
      if (m) {
        io.to(m.roomCode).emit('chat:msg', { username: '🏏 System', message: `${m.username} disconnected`, type: 'system' });
        meta.delete(socket.id);
      }
    });
  });
}
