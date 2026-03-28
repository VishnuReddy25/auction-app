const router      = require('express').Router();
const protect     = require('../middleware/auth');
const GameService = require('../services/GameService');
const BidReplay   = require('../models/BidReplay');

// Full replay for a room
router.get('/:code', protect, async (req, res, next) => {
  try {
    const code   = req.params.code.toUpperCase();
    const replay = GameService.getReplay(code);
    if (replay.length) return res.json({ replay, source: 'memory' });

    // Fall back to DB
    const dbReplay = await BidReplay.find({ roomCode: code }).sort({ timestamp: 1 });
    res.json({ replay: dbReplay, source: 'db' });
  } catch(err) { next(err); }
});

// Replay grouped by item
router.get('/:code/by-item', protect, async (req, res, next) => {
  try {
    const grouped = GameService.getReplayByItem(req.params.code.toUpperCase());
    res.json({ grouped });
  } catch(err) { next(err); }
});

module.exports = router;
