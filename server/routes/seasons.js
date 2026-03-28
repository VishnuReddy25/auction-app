const router      = require('express').Router();
const protect     = require('../middleware/auth');
const Season      = require('../models/Season');
const Match       = require('../models/Match');
const MatchSelection = require('../models/MatchSelection');
const IPL_PLAYERS = require('../services/iplPlayers');

// Generate random 6-char code
const genCode = () => Math.random().toString(36).substring(2,8).toUpperCase();

// ── Create season ─────────────────────────────────────────────────────────────
router.post('/', protect, async (req, res, next) => {
  try {
    const { name, description, isPublic, tournament } = req.body;
    let code;
    do { code = genCode(); } while (await Season.findOne({ code }));

    const season = await Season.create({
      name, description, isPublic: isPublic || false,
      tournament: tournament || 'IPL',
      code, host: req.user.id,
      members: [{ userId: req.user.id, username: req.user.username }],
    });
    res.json({ season });
  } catch(err) { next(err); }
});

// ── Get all public seasons ────────────────────────────────────────────────────
router.get('/', protect, async (req, res, next) => {
  try {
    const seasons = await Season.find({ isPublic: true, status:'active' })
      .populate('host', 'username').sort({ createdAt: -1 }).limit(20);
    res.json({ seasons });
  } catch(err) { next(err); }
});

// ── Get my seasons ────────────────────────────────────────────────────────────
router.get('/my', protect, async (req, res, next) => {
  try {
    const seasons = await Season.find({ 'members.userId': req.user.id })
      .populate('host', 'username').sort({ createdAt: -1 });
    res.json({ seasons });
  } catch(err) { next(err); }
});

// ── Get season by code ────────────────────────────────────────────────────────
router.get('/code/:code', protect, async (req, res, next) => {
  try {
    const season = await Season.findOne({ code: req.params.code.toUpperCase() })
      .populate('host', 'username');
    if (!season) return res.status(404).json({ error: 'Season not found' });
    res.json({ season });
  } catch(err) { next(err); }
});

// ── Get season by id ──────────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res, next) => {
  try {
    const season  = await Season.findById(req.params.id).populate('host','username');
    if (!season) return res.status(404).json({ error: 'Season not found' });
    const matches = await Match.find({ seasonId: season._id }).sort({ matchDate: 1 });
    res.json({ season, matches });
  } catch(err) { next(err); }
});

// ── Join season ───────────────────────────────────────────────────────────────
router.post('/join', protect, async (req, res, next) => {
  try {
    const { code } = req.body;
    const season   = await Season.findOne({ code: code.toUpperCase() });
    if (!season) return res.status(404).json({ error: 'Season not found' });
    if (season.members.find(m => m.userId === req.user.id))
      return res.status(400).json({ error: 'Already in this season' });

    season.members.push({ userId: req.user.id, username: req.user.username });
    await season.save();
    res.json({ season });
  } catch(err) { next(err); }
});

// ── Link auction room to season ───────────────────────────────────────────────
router.post('/:id/link-auction', protect, async (req, res, next) => {
  try {
    const { roomCode } = req.body;
    const season = await Season.findById(req.params.id);
    if (!season) return res.status(404).json({ error: 'Season not found' });
    if (season.host.toString() !== req.user.id)
      return res.status(403).json({ error: 'Only host can link auction' });
    season.auctionRoomCode = roomCode;
    await season.save();
    res.json({ season });
  } catch(err) { next(err); }
});

// ── Season leaderboard ────────────────────────────────────────────────────────
router.get('/:id/leaderboard', protect, async (req, res, next) => {
  try {
    const season = await Season.findById(req.params.id);
    if (!season) return res.status(404).json({ error: 'Season not found' });

    const leaderboard = [...season.members]
      .sort((a,b) => b.totalFantasyPoints - a.totalFantasyPoints)
      .map((m,i) => ({
        rank: i+1,
        userId: m.userId,
        username: m.username,
        totalPoints: m.totalFantasyPoints,
        squad: m.squad,
      }));

    res.json({ leaderboard });
  } catch(err) { next(err); }
});

// ── Get IPL players ───────────────────────────────────────────────────────────
router.get('/players/all', protect, (req, res) => {
  res.json({ players: IPL_PLAYERS });
});

// ── Get players for a specific match (by team) ────────────────────────────────
router.get('/players/match/:matchId', protect, async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    const players = IPL_PLAYERS.filter(p => p.team === match.team1 || p.team === match.team2);
    res.json({ players, match });
  } catch(err) { next(err); }
});

module.exports = router;
