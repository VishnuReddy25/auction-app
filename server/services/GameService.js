/**
 * GameService — single orchestration layer
 * Sockets call this. This calls engines. Clean separation.
 */

const Engine          = require('../engine/AuctionEngine');
const ScoreEngine     = require('../engine/ScoreEngine');
const HiddenValueEngine = require('../engine/HiddenValueEngine');
const AnalyticsEngine = require('../engine/AnalyticsEngine');
const ReplayService   = require('../engine/ReplayService');
const Timer           = require('../engine/TimerManager');
const Store           = require('../engine/StateStore');
const Room            = require('../models/Room');
const PLAYERS         = require('./players');

// roomCode -> hiddenValues map
const hiddenValuesStore = new Map();
// roomCode -> clutchMap (built at end)
const clutchMapStore    = new Map();

const GameService = {

  // ── Initialize room ─────────────────────────────────────────────────────
  async initRoom(roomCode, members, settings) {
    const players = members.map(m => ({
      id: m.userId, username: m.username, isHost: m.isHost,
      budget: settings.startingBudget,
    }));

    const state = Engine.createState({ roomId: roomCode, players, items: PLAYERS, settings });
    Store.set(roomCode, state);

    // Generate hidden values for all players
    const hv = HiddenValueEngine.generateForRoom(PLAYERS);
    hiddenValuesStore.set(roomCode, hv);

    return state;
  },

  getState(roomCode)        { return Store.get(roomCode); },
  getHiddenValues(roomCode) { return hiddenValuesStore.get(roomCode) || {}; },

  // ── Start auction ────────────────────────────────────────────────────────
  async startAuction(roomCode, io) {
    const state = Store.get(roomCode);
    if (!state) return { ok: false, error: 'No state' };

    const newState = Engine.start(state);
    // store startingBudget per player for score calc
    newState.players.forEach(p => { p.startingBudget = newState.settings.startingBudget; });
    Store.set(roomCode, newState);

    await Room.findOneAndUpdate({ code: roomCode }, { status: 'active' });
    const item = Engine.getCurrentItem(newState);

    io.to(roomCode).emit('auction:started', { state: newState, item });
    this._startTimer(roomCode, newState.settings.timerSeconds, io);
    return { ok: true };
  },

  // ── Place bid ────────────────────────────────────────────────────────────
  placeBid(roomCode, userId, username, amount, io) {
    const state = Store.get(roomCode);
    if (!state) return { ok: false, error: 'No active game' };

    const result = Engine.placeBid(state, userId, amount);
    if (!result.success) return { ok: false, error: result.reason };

    Store.set(roomCode, result.state);

    const hv       = this.getHiddenValues(roomCode);
    const item     = Engine.getCurrentItem(result.state);
    const timeLeft = Timer.getLeft(roomCode);
    const isClutch = timeLeft <= 3 && timeLeft > 0;
    const isSniper = timeLeft <= 5 && state.currentBidderId && state.currentBidderId !== userId;

    // Analytics hint
    const analytics = AnalyticsEngine.onBid(result.state, hv, userId, amount);

    // Record replay event
    ReplayService.record(roomCode, {
      itemIndex:      result.state.currentIndex,
      itemName:       item?.name,
      playerId:       userId,
      playerName:     username,
      amount,
      previousBid:    state.currentBid,
      previousBidder: state.currentBidderName,
      timeLeft,
      isClutch,
      isSniper,
      isBargain:      false, // set at round close
      isContested:    (state.bidHistory?.length || 0) >= 3,
    });

    // Reset timer on every bid
    this._startTimer(roomCode, result.state.settings.timerSeconds, io);

    io.to(roomCode).emit('bid:new', {
      username,
      amount,
      state:      result.state,
      timerReset: result.state.settings.timerSeconds,
      analytics:  { hint: analytics.hint, isClutch, isSniper },
    });

    return { ok: true };
  },

  // ── Close round ──────────────────────────────────────────────────────────
  async closeRound(roomCode, io) {
    Timer.clear(roomCode);
    const state = Store.get(roomCode);
    if (!state || state.phase !== 'bidding') return;

    const hv = this.getHiddenValues(roomCode);
    const { state: newState, result } = Engine.closeBidding(state);

    // Mark bargain in replay
    if (result.type === 'sold') {
      const tv = hv[result.item?.name] || result.item?.basePrice;
      const isBargain = result.price <= tv;
      const isContested = (state.bidHistory?.length || 0) >= 3;

      // Update last replay entry
      const replay = ReplayService.get(roomCode);
      const last   = replay[replay.length - 1];
      if (last && last.playerName === result.winner) {
        last.isBargain   = isBargain;
        last.isContested = isContested;
        last.savings     = tv - result.price;
      }
    }

    Store.set(roomCode, newState);
    io.to(roomCode).emit('round:closed', { result, state: newState });
    return result;
  },

  // ── Next item ────────────────────────────────────────────────────────────
  async nextItem(roomCode, io) {
    Timer.clear(roomCode);
    const state = Store.get(roomCode);
    if (!state) return { ok: false };

    const { state: newState, done } = Engine.nextItem(state);
    Store.set(roomCode, newState);

    if (done) {
      const leaderboard = await this._buildFinalLeaderboard(roomCode, newState);
      io.to(roomCode).emit('auction:complete', { leaderboard, state: newState });
      await Room.findOneAndUpdate({ code: roomCode }, { status: 'completed' });
    } else {
      const item = Engine.getCurrentItem(newState);
      io.to(roomCode).emit('item:next', { state: newState, item });
      this._startTimer(roomCode, newState.settings.timerSeconds, io);
    }

    return { ok: true, done };
  },

  // ── Force sold / unsold ──────────────────────────────────────────────────
  async forceSold(roomCode, io)   { return this.closeRound(roomCode, io); },

  async forceUnsold(roomCode, io) {
    Timer.clear(roomCode);
    const state = Store.get(roomCode);
    if (!state) return;
    Store.set(roomCode, { ...state, currentBidderId: null, currentBid: 0, currentBidderName: null });
    return this.closeRound(roomCode, io);
  },

  // ── Pause / Resume ───────────────────────────────────────────────────────
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

  // ── AI suggestion ────────────────────────────────────────────────────────
  suggest(roomCode, userId) {
    const state = Store.get(roomCode);
    return state ? Engine.suggest(state, userId) : null;
  },

  // ── Analytics snapshot for a player ─────────────────────────────────────
  getAnalytics(roomCode, userId) {
    const state = Store.get(roomCode);
    if (!state) return null;
    const player = state.players.find(p => p.id === userId);
    if (!player) return null;
    const hv = this.getHiddenValues(roomCode);
    return AnalyticsEngine.teamSnapshot(player, hv);
  },

  // ── Replay ───────────────────────────────────────────────────────────────
  getReplay(roomCode)        { return ReplayService.get(roomCode); },
  getReplayByItem(roomCode)  { return ReplayService.getByItem(roomCode); },

  // ── Internal helpers ─────────────────────────────────────────────────────
  _startTimer(roomCode, seconds, io) {
    Timer.reset(roomCode, seconds, {
      onTick: left => io.to(roomCode).emit('timer', { left }),
      onEnd:  () => this.closeRound(roomCode, io),
    });
  },

  async _buildFinalLeaderboard(roomCode, state) {
    const hv        = this.getHiddenValues(roomCode);
    const clutchMap = ReplayService.buildClutchMap(roomCode);
    const lb        = ScoreEngine.buildLeaderboard(state.players, hv, clutchMap);
    clutchMapStore.set(roomCode, clutchMap);
    return lb;
  },
};

module.exports = GameService;
