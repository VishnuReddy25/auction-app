require('dotenv').config();
const express = require('express');
const http    = require('http');
const https   = require('https');
const cors    = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/database');

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
app.use('/api/seasons', require('./routes/seasons'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/fantasy', require('./routes/fantasy'));
app.get('/api/health',  (_,res) => res.json({ ok: true, uptime: process.uptime() }));
app.use(require('./middleware/errorHandler'));

// Init sockets
try {
  const { initSockets } = require('./sockets');
  initSockets(io);
} catch(e) { console.error('Socket init error:', e.message); }

try {
  const { initVoiceSignaling } = require('./sockets/voiceSignaling');
  initVoiceSignaling(io);
} catch(e) { console.error('Voice init error:', e.message); }

// Timer watchdog - checks every 10s if any room timer died
try {
  const Store       = require('./engine/StateStore');
  const Timer       = require('./engine/TimerManager');
  const GameService = require('./services/GameService');
  setInterval(() => {
    const rooms = Store.getAll ? Store.getAll() : [];
    rooms.forEach(({ code, state }) => {
      if (state.phase === 'bidding' && !Timer.isRunning(code)) {
        console.log(`Watchdog: restarting timer for room ${code}`);
        GameService._startTimer(code, state.settings?.timerSeconds || 30, io);
      }
    });
  }, 10000);
} catch(e) { console.error('Watchdog init error:', e.message); }

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`\n🏏  BidWar running on port ${PORT}`);
    console.log(`✅  MongoDB connected`);

    // Self-ping every 4 minutes to prevent Render free tier sleeping
    const SELF_URL = process.env.RENDER_EXTERNAL_URL
      ? `https://${process.env.RENDER_EXTERNAL_URL}`
      : `http://localhost:${PORT}`;

    setInterval(() => {
      const url    = `${SELF_URL}/api/health`;
      const client = url.startsWith('https') ? https : http;
      client.get(url, res => {
        console.log(`Keep-alive ping: ${res.statusCode}`);
      }).on('error', err => {
        console.log(`Keep-alive ping failed: ${err.message}`);
      });
    }, 4 * 60 * 1000);

    console.log(`✅  Keep-alive ping active (every 4 min)`);
    console.log(`✅  Timer watchdog active\n`);
  });
}).catch(err => {
  console.error('DB connection failed:', err.message);
  server.listen(PORT, () => {
    console.log(`🏏  BidWar running on port ${PORT} (no DB)`);
  });
});
