// Simple in-memory store for active game states
const store = new Map();

module.exports = {
  get: roomId => store.get(roomId) || null,
  set: (roomId, state) => store.set(roomId, state),
  del: roomId => store.delete(roomId),
  has: roomId => store.has(roomId),
};
