const jwt  = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function protect(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const { id } = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET || 'secret');
    req.user = await User.findById(id).select('-password');
    if (!req.user) return res.status(401).json({ error: 'User not found' });
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};
