const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3 },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String },           // optional — not set for Google users
  googleId: { type: String, sparse: true, unique: true },
  avatar:   { type: String },           // Google profile picture URL
}, { timestamps: true });

module.exports = mongoose.model('User', schema);