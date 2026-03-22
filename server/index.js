require('dotenv').config();
const express = require('express');
const http    = require('http');
const cors    = require('cors');
const { Server } = require('socket.io');
const connectDB  = require('./config/database');
const { initSockets } = require('./sockets');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || '*', methods: ['GET','POST'], credentials: true },
  transports: ['websocket','polling'],
});

app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());
app.use((req,_,next) => { req.io = io; next(); });

app.use('/api/auth',    require('./routes/auth'));
app.use('/api/rooms',   require('./routes/rooms'));
app.use('/api/players', require('./routes/players'));
app.get('/api/health',  (_,res) => res.json({ ok: true }));
app.use(require('./middleware/errorHandler'));

initSockets(io);

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`\n🏏  BidWar v2 running on port ${PORT}`);
    console.log(`✅  Real-time open bidding enabled\n`);
  });
});
