const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const protect = require('../middleware/auth');

const sign = id => jwt.sign({ id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(409).json({ error: 'Username or email taken' });
    const user  = await User.create({ username, email, password });
    res.status(201).json({ token: sign(user._id), user: { _id: user._id, username: user.username, email: user.email } });
  } catch(err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.checkPassword(password))) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ token: sign(user._id), user: { _id: user._id, username: user.username, email: user.email } });
  } catch(err) { next(err); }
});

router.get('/me', protect, (req, res) => res.json({ user: req.user }));

module.exports = router;
