const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const axios   = require('axios');
const User    = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'mySecretKey123abc';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const signToken = user => jwt.sign(
  { id: user._id, username: user.username, email: user.email },
  JWT_SECRET,
  { expiresIn: '30d' }
);

// ── Register ──────────────────────────────────────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'All fields required' });
    if (await User.findOne({ email }))
      return res.status(400).json({ error: 'Email already registered' });
    if (await User.findOne({ username }))
      return res.status(400).json({ error: 'Username taken' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hash });
    res.json({ token: signToken(user), user: { _id: user._id, username: user.username, email: user.email } });
  } catch(err) { next(err); }
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.password)
      return res.status(400).json({ error: 'Invalid credentials' });
    if (!await bcrypt.compare(password, user.password))
      return res.status(400).json({ error: 'Invalid credentials' });
    res.json({ token: signToken(user), user: { _id: user._id, username: user.username, email: user.email } });
  } catch(err) { next(err); }
});

// ── Google OAuth — Step 1: redirect to Google ─────────────────────────────────
router.get('/google', (req, res) => {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    redirect_uri:  `${process.env.RENDER_URL || 'https://auction-app-m9xw.onrender.com'}/api/auth/google/callback`,
    response_type: 'code',
    scope:         'openid email profile',
    access_type:   'offline',
    prompt:        'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// ── Google OAuth — Step 2: callback ──────────────────────────────────────────
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.redirect(`${CLIENT_URL}/auth?error=no_code`);

    const RENDER_URL = process.env.RENDER_URL || 'https://auction-app-m9xw.onrender.com';

    // Exchange code for tokens
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri:  `${RENDER_URL}/api/auth/google/callback`,
      grant_type:    'authorization_code',
    });

    // Get user info from Google
    const userRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
    });

    const { email, name, sub: googleId, picture } = userRes.data;

    // Find or create user
    let user = await User.findOne({ $or: [{ googleId }, { email }] });
    if (!user) {
      // New user — create with Google info
      let username = name?.replace(/\s+/g, '').toLowerCase() || email.split('@')[0];
      // Make username unique
      const exists = await User.findOne({ username });
      if (exists) username = username + Math.floor(Math.random() * 999);
      user = await User.create({ username, email, googleId, avatar: picture });
    } else if (!user.googleId) {
      // Existing email user — link Google
      user.googleId = googleId;
      if (picture) user.avatar = picture;
      await user.save();
    }

    const token = signToken(user);

    // Redirect to frontend with token
    res.redirect(`${CLIENT_URL}/auth/callback?token=${token}&username=${encodeURIComponent(user.username)}&id=${user._id}`);
  } catch(err) {
    console.error('Google OAuth error:', err.message);
    res.redirect(`${CLIENT_URL}/auth?error=google_failed`);
  }
});

module.exports = router;