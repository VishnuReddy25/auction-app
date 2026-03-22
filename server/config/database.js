const mongoose = require('mongoose');
module.exports = async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bidwar');
  console.log('✅  MongoDB connected');
};
