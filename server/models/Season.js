const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  code:        { type: String, unique: true, uppercase: true },
  host:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPublic:    { type: Boolean, default: false },
  status:      { type: String, enum: ['active','completed'], default: 'active' },
  members: [{
    userId:    String,
    username:  String,
    joinedAt:  { type: Date, default: Date.now },
    squad:     { type: Array, default: [] },      // players won in auction
    totalFantasyPoints: { type: Number, default: 0 },
  }],
  auctionRoomCode: { type: String },              // linked auction room
  tournament: { type: String, default: 'IPL' },
}, { timestamps: true });

module.exports = mongoose.model('Season', schema);
