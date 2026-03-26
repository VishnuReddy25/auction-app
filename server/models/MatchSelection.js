const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  matchId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
  userId:       { type: String, required: true },
  username:     { type: String },
  seasonId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Season' }, // null = solo fantasy
  playing11:    { type: [String], validate: v => v.length <= 11 },        // player names
  captain:      { type: String },
  viceCaptain:  { type: String },
  totalPoints:  { type: Number, default: 0 },
  pointsBreakdown: { type: Array, default: [] },
  locked:       { type: Boolean, default: false }, // locked after match starts
}, { timestamps: true });

schema.index({ matchId: 1, userId: 1, seasonId: 1 }, { unique: true });

module.exports = mongoose.model('MatchSelection', schema);
