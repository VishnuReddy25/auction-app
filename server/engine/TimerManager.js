const timers = new Map();

module.exports = {
  start(roomId, seconds, { onTick, onEnd }) {
    this.clear(roomId); // always clear existing before starting new
    let left = seconds;

    const id = setInterval(() => {
      left--;
      // Update stored value so getLeft() is accurate
      if (timers.has(roomId)) timers.get(roomId).left = left;
      onTick?.(left);
      if (left <= 0) {
        this.clear(roomId);
        onEnd?.();
      }
    }, 1000);

    timers.set(roomId, { id, left });
  },

  clear(roomId) {
    const t = timers.get(roomId);
    if (t) {
      clearInterval(t.id);
      timers.delete(roomId);
    }
  },

  getLeft(roomId) {
    return timers.get(roomId)?.left ?? 0;
  },

  reset(roomId, seconds, callbacks) {
    this.start(roomId, seconds, callbacks);
  },

  isRunning(roomId) {
    return timers.has(roomId);
  },
};
