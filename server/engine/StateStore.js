/**
 * StateStore — persists game state to MongoDB so server restarts don't lose progress
 * In-memory cache + async MongoDB backup
 */
const store = new Map(); // fast in-memory cache

// Lazy-load model to avoid circular deps
let GameState = null;
function getModel() {
  if (!GameState) GameState = require('../models/GameState');
  return GameState;
}

// Debounce saves — don't hammer DB on every bid
const saveTimers = new Map();
function debouncedSave(roomId, state) {
  if (saveTimers.has(roomId)) clearTimeout(saveTimers.get(roomId));
  saveTimers.set(roomId, setTimeout(() => {
    getModel().findOneAndUpdate(
      { roomId },
      { roomId, state, updatedAt: new Date() },
      { upsert: true, new: true }
    ).catch(() => {});
    saveTimers.delete(roomId);
  }, 500)); // save 500ms after last update
}

module.exports = {
  get: roomId => store.get(roomId) || null,

  set: (roomId, state) => {
    store.set(roomId, state);
    debouncedSave(roomId, state); // async persist
  },

  del: (roomId) => {
    store.delete(roomId);
    getModel().deleteOne({ roomId }).catch(() => {});
  },

  has: roomId => store.has(roomId),

  // Return all active rooms for watchdog
  getAll: () => [...store.entries()].map(([code, state]) => ({ code, state })),

  // Called on server start — restore active games from DB
  async restore() {
    try {
      const Model  = getModel();
      const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6 hours
      const saved  = await Model.find({ updatedAt: { $gt: cutoff } });
      let count = 0;
      saved.forEach(doc => {
        // Only restore active games (not completed)
        if (doc.state?.phase !== 'completed') {
          store.set(doc.roomId, doc.state);
          count++;
        }
      });
      if (count > 0) console.log(`✅  Restored ${count} active game(s) from DB`);
    } catch (err) {
      console.error('StateStore restore error:', err.message);
    }
  },
};
