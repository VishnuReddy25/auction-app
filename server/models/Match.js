const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  seasonId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Season' },
  team1:          { type: String, required: true },
  team2:          { type: String, required: true },
  venue:          { type: String, default: '' },
  matchDate:      { type: Date, required: true },
  status:         { type: String, enum: ['upcoming','live','completed'], default: 'upcoming' },
  cricsheetId:    { type: String },
  playerPoints:   { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  result:         { type: String, default: '' },
  isPublicMatch:  { type: Boolean, default: true }, // available for solo fantasy too
}, { timestamps: true });

module.exports = mongoose.model('Match', schema);
