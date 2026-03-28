const router         = require('express').Router();
const protect        = require('../middleware/auth');
const MatchSelection = require('../models/MatchSelection');
const Match          = require('../models/Match');
const Season         = require('../models/Season');
const FantasyPoints  = require('../services/FantasyPoints');
const IPL_PLAYERS    = require('../services/iplPlayers');

// ── Save/update team selection ────────────────────────────────────────────────
router.post('/select', protect, async (req, res, next) => {
  try {
    const { matchId, seasonId, playing11, captain, viceCaptain } = req.body;

    if (!playing11 || playing11.length !== 11)
      return res.status(400).json({ error: 'Select exactly 11 players' });
    if (!captain || !viceCaptain)
      return res.status(400).json({ error: 'Select captain and vice-captain' });
    if (!playing11.includes(captain) || !playing11.includes(viceCaptain))
      return res.status(400).json({ error: 'Captain/VC must be in playing 11' });

    // Check match hasn't started
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.status !== 'upcoming')
      return res.status(400).json({ error: 'Match already started — team locked!' });

    const sel = await MatchSelection.findOneAndUpdate(
      { matchId, userId: req.user.id, seasonId: seasonId || null },
      { matchId, userId: req.user.id, seasonId: seasonId || null, username: req.user.username, playing11, captain, viceCaptain },
      { upsert: true, new: true }
    );

    res.json({ selection: sel });
  } catch(err) { next(err); }
});

// ── Get my selection for a match ──────────────────────────────────────────────
router.get('/my-selection/:matchId', protect, async (req, res, next) => {
  try {
    const { seasonId } = req.query;
    const sel = await MatchSelection.findOne({
      matchId: req.params.matchId,
      userId:  req.user.id,
      seasonId: seasonId || null,
    });
    res.json({ selection: sel });
  } catch(err) { next(err); }
});

// ── Get my fantasy history (solo) ─────────────────────────────────────────────
router.get('/my-history', protect, async (req, res, next) => {
  try {
    const selections = await MatchSelection.find({ userId: req.user.id, seasonId: null })
      .populate('matchId').sort({ createdAt: -1 }).limit(20);
    res.json({ selections });
  } catch(err) { next(err); }
});

// ── Global solo fantasy leaderboard (all time) ────────────────────────────────
router.get('/leaderboard', protect, async (req, res, next) => {
  try {
    const { matchId } = req.query;
    const query = { seasonId: null };
    if (matchId) query.matchId = matchId;

    const lb = await MatchSelection.aggregate([
      { $match: query },
      { $group: { _id:'$userId', username:{ $first:'$username' }, totalPoints:{ $sum:'$totalPoints' }, matches:{ $sum:1 } } },
      { $sort: { totalPoints: -1 } },
      { $limit: 50 },
    ]);

    res.json({ leaderboard: lb });
  } catch(err) { next(err); }
});

// ── Get player points for a completed match ───────────────────────────────────
router.get('/match-points/:matchId', protect, async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    res.json({ playerPoints: Object.fromEntries(match.playerPoints || new Map()), match });
  } catch(err) { next(err); }
});

module.exports = router;
