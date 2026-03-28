const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  roomCode:       { type: String, required: true, index: true },
  itemIndex:      Number,
  itemName:       String,
  playerId:       String,
  playerName:     String,
  amount:         Number,
  previousBid:    Number,
  previousBidder: String,
  timeLeft:       Number,
  isClutch:       Boolean,
  isSniper:       Boolean,
  isBargain:      Boolean,
  isContested:    Boolean,
  timestamp:      { type: Date, default: Date.now },
}, { timestamps: false });

schema.index({ roomCode: 1, timestamp: 1 });

module.exports = mongoose.model('BidReplay', schema);
