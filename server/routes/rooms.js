const router  = require('express').Router();
const protect = require('../middleware/auth');
const Room    = require('../models/Room');
const { customAlphabet } = require('nanoid');
const nanoid  = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

router.get('/', protect, async (req, res, next) => {
  try {
    const rooms = await Room.find({ status: { $in: ['waiting','active'] } })
      .populate('host', 'username').sort({ createdAt: -1 }).limit(20);
    res.json({ rooms });
  } catch(err) { next(err); }
});

router.post('/', protect, async (req, res, next) => {
  try {
    const { name, settings } = req.body;
    const room = await Room.create({
      code: nanoid(),
      name: name || `${req.user.username}'s Auction`,
      host: req.user._id,
      settings: {
        startingBudget: +settings?.startingBudget || 1000,
        minIncrement:   +settings?.minIncrement   || 5,
        timerSeconds:   +settings?.timerSeconds   || 30,
        maxPlayers:     +settings?.maxPlayers     || 8,
      },
      members: [{ userId: req.user._id.toString(), username: req.user.username, isHost: true }],
    });
    res.status(201).json({ room });
  } catch(err) { next(err); }
});

router.get('/:code', protect, async (req, res, next) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() }).populate('host','username');
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ room });
  } catch(err) { next(err); }
});

module.exports = router;
