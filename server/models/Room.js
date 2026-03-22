const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  code:   { type: String, required: true, unique: true, uppercase: true },
  name:   { type: String, required: true },
  host:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['waiting','active','completed'], default: 'waiting' },
  settings: {
    startingBudget: { type: Number, default: 1000 },
    minIncrement:   { type: Number, default: 5 },
    timerSeconds:   { type: Number, default: 30 },
    maxPlayers:     { type: Number, default: 8 },
  },
  members: [{ userId: String, username: String, isHost: Boolean }],
  chat: [{ username: String, message: String, type: { type: String, default: 'user' }, time: { type: Date, default: Date.now } }],
}, { timestamps: true });

module.exports = mongoose.model('Room', schema);
