const router  = require('express').Router();
const protect = require('../middleware/auth');
const PLAYERS = require('../services/players');

router.get('/', protect, (req, res) => res.json({ players: PLAYERS }));

module.exports = router;
