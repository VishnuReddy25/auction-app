require('dotenv').config();
const express = require('express');
const http    = require('http');
const cors    = require('cors');
const { Server } = require('socket.io');
const connectDB  = require('./config/database');
const { initSockets }        = require('./sockets');
const { initVoiceSignaling } = require('./sockets/voiceSignaling');
const GameService = require('./services/GameService');
const Store       = require('./engine/StateStore');
const Timer       = require('./engine/TimerManager');

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
app.use('/api/replay',  require('./routes/replay'));
app.get('/api/health',  (_,res) => res.json({ ok: true, uptime: process.uptime() }));
app.use(require('./middleware/errorHandler'));

initSockets(io);
initVoiceSignaling(io);

// ── Timer watchdog ────────────────────────────────────────────────────────────
// Every 10 seconds, check all active rooms.
// If a room is in 'bidding' phase but has no running timer, restart it.
// This recovers from Render sleeping mid-game.
setInterval(() => {
  const rooms = Store.getAll?.() || [];
  rooms.forEach(({ code, state }) => {
    if (state.phase === 'bidding' && !Timer.isRunning(code)) {
      console.log(`⚠️  Watchdog: restarting timer for room ${code}`);
      GameService._startTimer(code, state.settings?.timerSeconds || 30, io);
    }
  });
}, 10000);

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`\n🏏  BidWar v2 running on port ${PORT}`);
    console.log(`✅  Real-time open bidding enabled`);
    console.log(`✅  Timer watchdog active\n`);
  });
});
