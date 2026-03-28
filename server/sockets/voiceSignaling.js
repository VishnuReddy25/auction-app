/**
 * Voice signaling for WebRTC peer-to-peer audio
 * Added to the existing socket server
 * Each room has its own voice channel
 */

// roomCode -> Set of { socketId, userId, username, muted }
const voiceRooms = new Map();

function initVoiceSignaling(io) {

  io.on('connection', socket => {

    // ── Join voice channel ────────────────────────────────────────────────
    socket.on('voice:join', ({ roomCode, userId, username }) => {
      if (!voiceRooms.has(roomCode)) voiceRooms.set(roomCode, new Map());
      const room = voiceRooms.get(roomCode);

      room.set(socket.id, { socketId: socket.id, userId, username, muted: false });

      // Tell this user about all existing peers
      const peers = [...room.entries()]
        .filter(([id]) => id !== socket.id)
        .map(([, p]) => p);

      socket.emit('voice:peers', { peers });

      // Tell existing peers about this new user
      socket.to(roomCode).emit('voice:peer_joined', {
        socketId: socket.id, userId, username, muted: false,
      });

      io.to(roomCode).emit('voice:room_update', { participants: [...room.values()] });
    });

    // ── WebRTC offer (sent to a specific peer) ────────────────────────────
    socket.on('voice:offer', ({ to, offer }) => {
      const roomCode = getRoomCode(socket.id);
      const from     = getParticipant(socket.id);
      if (!from) return;
      io.to(to).emit('voice:offer', { from: socket.id, fromUser: from, offer });
    });

    // ── WebRTC answer ─────────────────────────────────────────────────────
    socket.on('voice:answer', ({ to, answer }) => {
      io.to(to).emit('voice:answer', { from: socket.id, answer });
    });

    // ── ICE candidate ─────────────────────────────────────────────────────
    socket.on('voice:ice_candidate', ({ to, candidate }) => {
      io.to(to).emit('voice:ice_candidate', { from: socket.id, candidate });
    });

    // ── Mute/unmute ───────────────────────────────────────────────────────
    socket.on('voice:mute', ({ muted }) => {
      const roomCode = getRoomCode(socket.id);
      if (!roomCode) return;
      const room = voiceRooms.get(roomCode);
      if (room?.has(socket.id)) {
        room.get(socket.id).muted = muted;
        socket.to(roomCode).emit('voice:peer_muted', { socketId: socket.id, muted });
        io.to(roomCode).emit('voice:room_update', { participants: [...room.values()] });
      }
    });

    // ── Speaking indicator ────────────────────────────────────────────────
    socket.on('voice:speaking', ({ speaking }) => {
      const roomCode = getRoomCode(socket.id);
      if (!roomCode) return;
      socket.to(roomCode).emit('voice:peer_speaking', { socketId: socket.id, speaking });
    });

    // ── Leave voice ───────────────────────────────────────────────────────
    socket.on('voice:leave', () => handleVoiceLeave(socket, io));
    socket.on('disconnect',  () => handleVoiceLeave(socket, io));
  });
}

function handleVoiceLeave(socket, io) {
  const roomCode = getRoomCode(socket.id);
  if (!roomCode) return;
  const room = voiceRooms.get(roomCode);
  if (!room) return;

  room.delete(socket.id);
  socket.to(roomCode).emit('voice:peer_left', { socketId: socket.id });
  io.to(roomCode).emit('voice:room_update', { participants: [...room.values()] });

  if (room.size === 0) voiceRooms.delete(roomCode);
}

function getRoomCode(socketId) {
  for (const [code, room] of voiceRooms.entries()) {
    if (room.has(socketId)) return code;
  }
  return null;
}

function getParticipant(socketId) {
  const code = getRoomCode(socketId);
  return code ? voiceRooms.get(code)?.get(socketId) : null;
}

module.exports = { initVoiceSignaling };
