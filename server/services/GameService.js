const Engine            = require('../engine/AuctionEngine');
const ScoreEngine       = require('../engine/ScoreEngine');
const HiddenValueEngine = require('../engine/HiddenValueEngine');
const AnalyticsEngine   = require('../engine/AnalyticsEngine');
const ReplayService     = require('../engine/ReplayService');
const Timer             = require('../engine/TimerManager');
const Store             = require('../engine/StateStore');
const Room              = require('../models/Room');
const PLAYERS           = require('./players');

const hiddenValuesStore = new Map();
const clutchMapStore    = new Map();
const closingRound      = new Set(); // prevent double-close

const GameService = {

  async initRoom(roomCode, members, settings) {
    const players = members.map(m => ({
      id: m.userId, username: m.username, isHost: m.isHost,
      budget: settings.startingBudget, startingBudget: settings.startingBudget,
    }));
    const shuffled = [...PLAYERS].sort(() => Math.random() - 0.5);
    const state = Engine.createState({ roomId: roomCode, players, items: shuffled, settings });
    Store.set(roomCode, state);
    const hv = HiddenValueEngine.generateForRoom(shuffled);
    hiddenValuesStore.set(roomCode, hv);
    return state;
  },

  getState(roomCode)        { return Store.get(roomCode); },
  getHiddenValues(roomCode) { return hiddenValuesStore.get(roomCode) || {}; },

  async startAuction(roomCode, io) {
    const state = Store.get(roomCode);
    if (!state) return { ok: false, error: 'No state' };
    if (state.phase !== 'waiting') return { ok: false, error: 'Already started' };

    const newState = Engine.start(state);
    newState.players.forEach(p => { p.startingBudget = newState.settings.startingBudget; });
    Store.set(roomCode, newState);

    await Room.findOneAndUpdate({ code: roomCode }, { status: 'active' }).catch(() => {});
    const item = Engine.getCurrentItem(newState);
    io.to(roomCode).emit('auction:started', { state: newState, item });
    this._startTimer(roomCode, newState.settings.timerSeconds, io);
    return { ok: true };
  },

  placeBid(roomCode, userId, username, amount, io) {
    const state = Store.get(roomCode);
    if (!state) return { ok: false, error: 'No active game' };
    if (state.phase !== 'bidding') return { ok: false, error: 'Not in bidding phase' };

    const result = Engine.placeBid(state, userId, amount);
    if (!result.success) return { ok: false, error: result.reason };

    Store.set(roomCode, result.state);

    const hv       = this.getHiddenValues(roomCode);
    const item     = Engine.getCurrentItem(result.state);
    const timeLeft = Timer.getLeft(roomCode);
    const isClutch = timeLeft <= 3 && timeLeft > 0;
    const isSniper = timeLeft <= 5 && state.currentBidderId && state.currentBidderId !== userId;

    const analytics = AnalyticsEngine.onBid(result.state, hv, userId, amount);

    ReplayService.record(roomCode, {
      itemIndex: result.state.currentIndex, itemName: item?.name,
      playerId: userId, playerName: username, amount,
      previousBid: state.currentBid, previousBidder: state.currentBidderName,
      timeLeft, isClutch, isSniper, isBargain: false,
      isContested: (state.bidHistory?.length || 0) >= 3,
    });

    this._startTimer(roomCode, result.state.settings.timerSeconds, io);

    io.to(roomCode).emit('bid:new', {
      username, amount, state: result.state,
      timerReset: result.state.settings.timerSeconds,
      analytics: { hint: analytics.hint, isClutch, isSniper },
    });

    return { ok: true };
  },

  async closeRound(roomCode, io) {
    // Prevent double-close race condition
    if (closingRound.has(roomCode)) return;
    closingRound.add(roomCode);

    try {
      Timer.clear(roomCode);
      const state = Store.get(roomCode);
      if (!state) return;
      if (state.phase !== 'bidding') return;

      const hv = this.getHiddenValues(roomCode);
      const { state: newState, result } = Engine.closeBidding(state);

      if (result.type === 'sold') {
        const tv = hv[result.item?.name] || result.item?.basePrice;
        const isBargain   = result.price <= tv;
        const isContested = (state.bidHistory?.length || 0) >= 3;
        const replay      = ReplayService.get(roomCode);
        const last        = replay[replay.length - 1];
        if (last && last.playerName === result.winner) {
          last.isBargain = isBargain; last.isContested = isContested;
          last.savings   = tv - result.price;
        }
      }

      Store.set(roomCode, newState);
      io.to(roomCode).emit('round:closed', { result, state: newState });
      return result;
    } finally {
      closingRound.delete(roomCode);
    }
  },

  async nextItem(roomCode, io) {
    Timer.clear(roomCode);
    const state = Store.get(roomCode);
    if (!state) return { ok: false };

    // Guard: only advance from sold/unsold phase
    if (state.phase !== 'sold' && state.phase !== 'unsold') return { ok: false, error: 'Round not finished yet' };

    const { state: newState, done } = Engine.nextItem(state);
    Store.set(roomCode, newState);

    if (done) {
      const leaderboard = await this._buildFinalLeaderboard(roomCode, newState);
      io.to(roomCode).emit('auction:complete', { leaderboard, state: newState });
      await Room.findOneAndUpdate({ code: roomCode }, { status: 'completed' }).catch(() => {});
    } else {
      const item = Engine.getCurrentItem(newState);
      io.to(roomCode).emit('item:next', { state: newState, item });
      this._startTimer(roomCode, newState.settings.timerSeconds, io);
    }

    return { ok: true, done };
  },

  async forceSold(roomCode, io)   { return this.closeRound(roomCode, io); },

  async forceUnsold(roomCode, io) {
    Timer.clear(roomCode);
    const state = Store.get(roomCode);
    if (!state) return;
    if (state.phase !== 'bidding') return;
    Store.set(roomCode, { ...state, currentBidderId: null, currentBid: 0, currentBidderName: null });
    return this.closeRound(roomCode, io);
  },

  pause(roomCode, io) {
    Timer.clear(roomCode);
    io.to(roomCode).emit('auction:paused');
  },

  resume(roomCode, io) {
    const state = Store.get(roomCode);
    if (!state || state.phase !== 'bidding') return;
    this._startTimer(roomCode, state.settings.timerSeconds, io);
    io.to(roomCode).emit('auction:resumed', { state });
  },

  suggest(roomCode, userId) {
    const state = Store.get(roomCode);
    return state ? Engine.suggest(state, userId) : null;
  },

  getAnalytics(roomCode, userId) {
    const state = Store.get(roomCode);
    if (!state) return null;
    const player = state.players.find(p => p.id === userId);
    if (!player) return null;
    return AnalyticsEngine.teamSnapshot(player, this.getHiddenValues(roomCode));
  },

  getReplay(roomCode)       { return ReplayService.get(roomCode); },
  getReplayByItem(roomCode) { return ReplayService.getByItem(roomCode); },

  _startTimer(roomCode, seconds, io) {
    Timer.reset(roomCode, seconds, {
      onTick: left => io.to(roomCode).emit('timer', { left }),
      onEnd:  () => this.closeRound(roomCode, io),
    });
  },

  async _buildFinalLeaderboard(roomCode, state) {
    const hv        = this.getHiddenValues(roomCode);
    const clutchMap = ReplayService.buildClutchMap(roomCode);
    clutchMapStore.set(roomCode, clutchMap);
    return ScoreEngine.buildLeaderboard(state.players, hv, clutchMap);
  },
};

module.exports = GameService;
