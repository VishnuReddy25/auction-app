const router    = require('express').Router();
const protect   = require('../middleware/auth');
const Room      = require('../models/Room');
const FantasyPoints    = require('../services/FantasyPoints');
const CricSheetService = require('../services/CricSheetService');
const { customAlphabet } = require('nanoid');
const nanoid    = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

// ── List rooms ────────────────────────────────────────────────────────────────
router.get('/', protect, async (req, res, next) => {
  try {
    const rooms = await Room.find({ status: { $in: ['waiting','active'] } })
      .populate('host', 'username').sort({ createdAt: -1 }).limit(20);
    res.json({ rooms });
  } catch(err) { next(err); }
});

// ── My rooms (host) ───────────────────────────────────────────────────────────
router.get('/my', protect, async (req, res, next) => {
  try {
    const rooms = await Room.find({ host: req.user._id })
      .populate('host', 'username').sort({ createdAt: -1 });
    res.json({ rooms });
  } catch(err) { next(err); }
});

// ── Create room ───────────────────────────────────────────────────────────────
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

// ── Get room ──────────────────────────────────────────────────────────────────
router.get('/:code', protect, async (req, res, next) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() }).populate('host','username');
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ room });
  } catch(err) { next(err); }
});

// ── Delete room (host only) ───────────────────────────────────────────────────
router.delete('/:code', protect, async (req, res, next) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.host.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Only host can delete' });
    await room.deleteOne();
    res.json({ ok: true });
  } catch(err) { next(err); }
});

// ── Save room for IPL season scoring ─────────────────────────────────────────
// Called by host after auction ends
router.post('/:code/save-for-season', protect, async (req, res, next) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.host.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Only host can do this' });

    // Build squads from current game state (passed in body)
    const { squads } = req.body; // [{ userId, username, players: [...] }]
    room.status = 'season';
    if (squads && squads.length) {
      room.squads = squads.map(s => ({
        userId:   s.userId,
        username: s.username,
        players:  s.players || [],
        totalFantasyPoints: 0,
        matchPoints: [],
      }));
    }
    await room.save();
    res.json({ ok: true, room });
  } catch(err) { next(err); }
});

// ── Get season rooms (for fantasy leaderboard) ────────────────────────────────
router.get('/season/all', protect, async (req, res, next) => {
  try {
    const rooms = await Room.find({
      status: 'season',
      'members.userId': req.user._id.toString(),
    }).populate('host','username').sort({ createdAt:-1 });
    res.json({ rooms });
  } catch(err) { next(err); }
});

// ── Add match to a season room ────────────────────────────────────────────────
router.post('/:code/matches', protect, async (req, res, next) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.host.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Only host can add matches' });
    if (room.status !== 'season')
      return res.status(400).json({ error: 'Room must be in season mode' });

    const { team1, team2, matchDate, venue } = req.body;
    room.fantasyMatches.push({ team1, team2, matchDate: new Date(matchDate), venue });
    await room.save();
    res.json({ ok: true, match: room.fantasyMatches[room.fantasyMatches.length-1] });
  } catch(err) { next(err); }
});

// ── Fetch scores for a match ──────────────────────────────────────────────────
router.post('/:code/matches/:matchId/fetch-scores', protect, async (req, res, next) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.host.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Only host' });

    const match = room.fantasyMatches.id(req.params.matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    // Try CricSheet
    const dateStr = match.matchDate.toISOString().split('T')[0];
    const matchId = match.cricsheetId || await CricSheetService.findMatch(match.team1, match.team2, dateStr);
    if (!matchId) return res.status(404).json({ error: 'Match not found on CricSheet yet. Try after match completes.' });

    const data = await CricSheetService.getMatchData(matchId);
    if (!data)  return res.status(500).json({ error: 'Failed to fetch scorecard from CricSheet' });

    // Calculate points for all players
    const playerPoints = FantasyPoints.calculate(data);
    match.playerPoints  = playerPoints;
    match.cricsheetId   = matchId;
    match.status        = 'completed';
    match.result        = data.info?.outcome?.winner
      ? `${data.info.outcome.winner} won`
      : data.info?.outcome?.result || 'Match completed';

    // Update each squad member's points
    room.squads.forEach(squad => {
      // Top 11 scorers from this squad count
      const result = FantasyPoints.squadTotal(squad.players, playerPoints, '', '');
      const pts    = result.totalPoints;
      squad.totalFantasyPoints = (squad.totalFantasyPoints || 0) + pts;
      squad.matchPoints.push({ matchId: match._id.toString(), points: pts, date: new Date() });

      // Sync to fantasyPoints array
      let fp = room.fantasyPoints.find(f => f.userId === squad.userId);
      if (!fp) { room.fantasyPoints.push({ userId:squad.userId, username:squad.username, totalPoints:0, matchPoints:[] }); fp = room.fantasyPoints[room.fantasyPoints.length-1]; }
      fp.totalPoints = (fp.totalPoints||0) + pts;
      fp.matchPoints.push({ matchId: match._id.toString(), points: pts, date: new Date() });
    });

    await room.save();
    res.json({ ok:true, match, playersScored: Object.keys(playerPoints).length });
  } catch(err) { next(err); }
});

// ── Get fantasy leaderboard for a room ───────────────────────────────────────
router.get('/:code/fantasy', protect, async (req, res, next) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() }).populate('host','username');
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const leaderboard = [...(room.squads||[])].sort((a,b) => b.totalFantasyPoints - a.totalFantasyPoints);
    res.json({ room, leaderboard, matches: room.fantasyMatches });
  } catch(err) { next(err); }
});

module.exports = router;
