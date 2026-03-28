const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  code:   { type: String, required: true, unique: true, uppercase: true },
  name:   { type: String, required: true },
  host:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['waiting','active','completed','season'], default: 'waiting' },
  // 'season' = auction done, saved for IPL season scoring

  settings: {
    startingBudget: { type: Number, default: 1000 },
    minIncrement:   { type: Number, default: 5 },
    timerSeconds:   { type: Number, default: 30 },
    maxPlayers:     { type: Number, default: 8 },
  },

  members: [{ userId: String, username: String, isHost: Boolean }],
  chat:    [{ username: String, message: String, type: { type: String, default:'user' }, time: { type: Date, default: Date.now } }],

  // Squads — filled from auction results
  squads: [{
    userId:   String,
    username: String,
    players:  { type: Array, default: [] }, // player objects with name, role, team etc
    totalFantasyPoints: { type: Number, default: 0 },
    matchPoints: [{ matchId: String, points: Number, date: Date }],
  }],

  // IPL matches added by host for scoring
  fantasyMatches: [{
    _id:         { type: mongoose.Schema.Types.ObjectId, auto: true },
    team1:       String,
    team2:       String,
    venue:       String,
    matchDate:   Date,
    status:      { type: String, enum:['upcoming','completed'], default:'upcoming' },
    cricsheetId: String,
    result:      String,
    playerPoints:{ type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    addedAt:     { type: Date, default: Date.now },
  }],

}, { timestamps: true });

module.exports = mongoose.model('Room', schema);
