/**
 * ReplayService — records all bids and provides replay API
 * Async writes — never blocks real-time flow
 */

// In-memory replay store (persisted to DB asynchronously)
const replays = new Map(); // roomCode -> [bidEvent]

const ReplayService = {

  // Record a bid event
  record(roomCode, event) {
    if (!replays.has(roomCode)) replays.set(roomCode, []);
    replays.get(roomCode).push({
      ...event,
      timestamp:   Date.now(),
      seq:         replays.get(roomCode).length + 1,
    });

    // Async persist to DB (non-blocking)
    setImmediate(() => this._persist(roomCode, event).catch(()=>{}));
  },

  async _persist(roomCode, event) {
    try {
      const BidReplay = require('../models/BidReplay');
      await BidReplay.create({ roomCode, ...event, timestamp: new Date() });
    } catch {}
  },

  // Get full replay for a room
  get(roomCode) {
    return replays.get(roomCode) || [];
  },

  // Get replay grouped by item
  getByItem(roomCode) {
    const events = this.get(roomCode);
    const grouped = {};
    events.forEach(e => {
      const key = e.itemIndex ?? 'unknown';
      if (!grouped[key]) grouped[key] = { itemName: e.itemName, bids: [] };
      grouped[key].bids.push(e);
    });
    return Object.values(grouped);
  },

  // Get clutch events for a player
  getClutchEvents(roomCode, playerId) {
    return this.get(roomCode)
      .filter(e => e.playerId === playerId && e.isClutch);
  },

  // Build clutch map for all players
  buildClutchMap(roomCode) {
    const events  = this.get(roomCode);
    const map     = {};
    events.forEach(e => {
      if (!e.playerId) return;
      if (!map[e.playerId]) map[e.playerId] = [];
      if (e.isClutch)  map[e.playerId].push({ type:'last_second',   itemName:e.itemName, timeLeft:e.timeLeft, points:10 });
      if (e.isSniper)  map[e.playerId].push({ type:'sniper',        itemName:e.itemName, points:8 });
      if (e.isBargain) map[e.playerId].push({ type:'bargain_win',   itemName:e.itemName, savings:e.savings, points:5 });
      if (e.isContested) map[e.playerId].push({ type:'contested_win', itemName:e.itemName, points:6 });
    });
    return map;
  },

  clear(roomCode) {
    replays.delete(roomCode);
  },
};

module.exports = ReplayService;
