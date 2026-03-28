/**
 * StateStore — simple in-memory store
 * No database dependency — fast and reliable
 */
const store = new Map();
 
module.exports = {
  get:    roomId => store.get(roomId) || null,
  set:    (roomId, state) => store.set(roomId, state),
  del:    roomId => store.delete(roomId),
  has:    roomId => store.has(roomId),
  getAll: () => [...store.entries()].map(([code, state]) => ({ code, state })),
};
 
