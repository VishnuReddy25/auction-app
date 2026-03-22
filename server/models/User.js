const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const schema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
}, { timestamps: true });

schema.pre('save', async function(next) {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
  next();
});
schema.methods.checkPassword = function(p) { return bcrypt.compare(p, this.password); };

module.exports = mongoose.model('User', schema);
