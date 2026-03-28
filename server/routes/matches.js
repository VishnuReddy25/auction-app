const router          = require('express').Router();
const protect         = require('../middleware/auth');
const Match           = require('../models/Match');
const Season          = require('../models/Season');
const MatchSelection  = require('../models/MatchSelection');
const CricSheetService= require('../services/CricSheetService');
const FantasyPoints   = require('../services/FantasyPoints');

// ── Add match to season ───────────────────────────────────────────────────────
router.post('/', protect, async (req, res, next) => {
  try {
    const { seasonId, team1, team2, matchDate, venue } = req.body;
    const match = await Match.create({ seasonId, team1, team2, matchDate: new Date(matchDate), venue, isPublicMatch: true });
    res.json({ match });
  } catch(err) { next(err); }
});

// ── Get all upcoming public matches (for solo fantasy) ────────────────────────
router.get('/upcoming', protect, async (req, res, next) => {
  try {
    const matches = await Match.find({
      isPublicMatch: true,
      matchDate: { $gte: new Date() }
    }).sort({ matchDate: 1 }).limit(20);
    res.json({ matches });
  } catch(err) { next(err); }
});

// ── Get completed matches ─────────────────────────────────────────────────────
router.get('/completed', protect, async (req, res, next) => {
  try {
    const matches = await Match.find({ status: 'completed' }).sort({ matchDate: -1 }).limit(20);
    res.json({ matches });
  } catch(err) { next(err); }
});

// ── Fetch scores from CricSheet and calculate points ─────────────────────────
router.post('/:id/fetch-scores', protect, async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    // Find cricsheet match ID
    const dateStr   = match.matchDate.toISOString().split('T')[0];
    const matchId   = match.cricsheetId || await CricSheetService.findMatch(match.team1, match.team2, dateStr);
    if (!matchId) return res.status(404).json({ error: 'Match not found on CricSheet yet. Try after match completes.' });

    // Fetch scorecard
    const data = await CricSheetService.getMatchData(matchId);
    if (!data)  return res.status(500).json({ error: 'Failed to fetch scorecard' });

    // Calculate fantasy points for all players
    const playerPoints = FantasyPoints.calculate(data);

    // Save to match
    match.playerPoints  = playerPoints;
    match.status        = 'completed';
    match.cricsheetId   = matchId;
    match.result        = data.info?.outcome?.winner
      ? `${data.info.outcome.winner} won`
      : 'Result not available';
    await match.save();

    // Update all match selections with points
    await updateAllSelections(match._id, playerPoints);

    // Update season member totals if this is a season match
    if (match.seasonId) {
      await updateSeasonTotals(match.seasonId, match._id, playerPoints);
    }

    res.json({ match, playerPoints, playersScored: Object.keys(playerPoints).length });
  } catch(err) { next(err); }
});

// ── Manual score entry (if CricSheet not available yet) ───────────────────────
router.post('/:id/manual-scores', protect, async (req, res, next) => {
  try {
    const { playerPoints } = req.body; // { "Virat Kohli": { points: 85, breakdown: {...} } }
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    match.playerPoints = playerPoints;
    match.status       = 'completed';
    await match.save();

    await updateAllSelections(match._id, playerPoints);
    if (match.seasonId) await updateSeasonTotals(match.seasonId, match._id, playerPoints);

    res.json({ match });
  } catch(err) { next(err); }
});

// ── Get match details + leaderboard ──────────────────────────────────────────
router.get('/:id', protect, async (req, res, next) => {
  try {
    const match      = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    const selections = await MatchSelection.find({ matchId: match._id }).sort({ totalPoints:-1 });
    res.json({ match, leaderboard: selections });
  } catch(err) { next(err); }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
async function updateAllSelections(matchId, playerPoints) {
  const selections = await MatchSelection.find({ matchId });
  for (const sel of selections) {
    const withMult = FantasyPoints.applyMultipliers(playerPoints, sel.captain, sel.viceCaptain);
    const result   = FantasyPoints.squadTotal(
      sel.playing11.map(name => ({ name })),
      withMult, sel.captain, sel.viceCaptain
    );
    sel.totalPoints      = result.totalPoints;
    sel.pointsBreakdown  = result.playing11;
    sel.locked           = true;
    await sel.save();
  }
}

async function updateSeasonTotals(seasonId, matchId, playerPoints) {
  const season     = await Season.findById(seasonId);
  if (!season) return;
  const selections = await MatchSelection.find({ matchId, seasonId });

  for (const sel of selections) {
    const member = season.members.find(m => m.userId === sel.userId);
    if (member) {
      member.totalFantasyPoints = (member.totalFantasyPoints || 0) + sel.totalPoints;
    }
  }
  await season.save();
}

module.exports = router;
