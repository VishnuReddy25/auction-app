import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '../services';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export default function VoiceChat({ roomCode, userId, username, isMinimized = false }) {
  const [joined,       setJoined]       = useState(false);
  const [muted,        setMuted]        = useState(false);
  const [participants, setParticipants] = useState([]);
  const [speaking,     setSpeaking]     = useState({}); // socketId -> bool
  const [error,        setError]        = useState('');
  const [connecting,   setConnecting]   = useState(false);

  const localStreamRef  = useRef(null);
  const peersRef        = useRef({}); // socketId -> RTCPeerConnection
  const audioRefs       = useRef({}); // socketId -> <audio> element
  const analyserRef     = useRef(null);
  const speakTimerRef   = useRef(null);

  const socket = getSocket();

  // ── Speaking detection via AudioContext analyser ──────────────────────
  const startSpeakingDetection = useCallback((stream) => {
    try {
      const ctx      = new (window.AudioContext || window.webkitAudioContext)();
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = { analyser, ctx };

      const data = new Uint8Array(analyser.frequencyBinCount);
      let wasSpeaking = false;

      const check = () => {
        analyser.getByteFrequencyData(data);
        const vol = data.reduce((a, b) => a + b, 0) / data.length;
        const isSpeaking = vol > 15;

        if (isSpeaking !== wasSpeaking) {
          wasSpeaking = isSpeaking;
          socket.emit('voice:speaking', { speaking: isSpeaking });
          setSpeaking(prev => ({ ...prev, [socket.id]: isSpeaking }));
        }
        speakTimerRef.current = requestAnimationFrame(check);
      };
      check();
    } catch {}
  }, [socket]);

  // ── Create peer connection ────────────────────────────────────────────
  const createPeer = useCallback((targetSocketId, initiator) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[targetSocketId] = pc;

    // Add local audio tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
    }

    // ICE candidates
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit('voice:ice_candidate', { to: targetSocketId, candidate });
    };

    // Remote audio stream
    pc.ontrack = ({ streams }) => {
      const stream = streams[0];
      if (!audioRefs.current[targetSocketId]) {
        const audio = document.createElement('audio');
        audio.autoplay = true;
        audio.volume   = 1;
        document.body.appendChild(audio);
        audioRefs.current[targetSocketId] = audio;
      }
      audioRefs.current[targetSocketId].srcObject = stream;
    };

    // If initiator, create offer
    if (initiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => socket.emit('voice:offer', { to: targetSocketId, offer: pc.localDescription }))
        .catch(() => {});
    }

    return pc;
  }, [socket]);

  // ── Join voice ────────────────────────────────────────────────────────
  const joinVoice = useCallback(async () => {
    setConnecting(true);
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      startSpeakingDetection(stream);

      socket.emit('voice:join', { roomCode, userId, username });
      setJoined(true);
    } catch (err) {
      if (err.name === 'NotAllowedError') setError('Microphone permission denied');
      else if (err.name === 'NotFoundError') setError('No microphone found');
      else setError('Could not access microphone');
    } finally {
      setConnecting(false);
    }
  }, [roomCode, userId, username, socket, startSpeakingDetection]);

  // ── Leave voice ───────────────────────────────────────────────────────
  const leaveVoice = useCallback(() => {
    socket.emit('voice:leave');

    // Stop all tracks
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;

    // Close all peer connections
    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};

    // Remove audio elements
    Object.values(audioRefs.current).forEach(el => { el.srcObject = null; el.remove(); });
    audioRefs.current = {};

    // Stop speaking detection
    cancelAnimationFrame(speakTimerRef.current);
    analyserRef.current?.ctx?.close();
    analyserRef.current = null;

    setJoined(false);
    setParticipants([]);
    setSpeaking({});
  }, [socket]);

  // ── Mute toggle ───────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const newMuted = !muted;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !newMuted; });
    socket.emit('voice:mute', { muted: newMuted });
    setMuted(newMuted);
  }, [muted, socket]);

  // ── Socket event listeners ────────────────────────────────────────────
  useEffect(() => {
    // Existing peers when joining
    socket.on('voice:peers', ({ peers }) => {
      peers.forEach(peer => createPeer(peer.socketId, true));
    });

    // New peer joined — wait for their offer
    socket.on('voice:peer_joined', (peer) => {
      setParticipants(prev => [...prev.filter(p => p.socketId !== peer.socketId), peer]);
    });

    // Received offer from peer
    socket.on('voice:offer', async ({ from, fromUser, offer }) => {
      const pc = createPeer(from, false);
      setParticipants(prev => [...prev.filter(p => p.socketId !== from), fromUser]);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('voice:answer', { to: from, answer: pc.localDescription });
      } catch {}
    });

    // Received answer
    socket.on('voice:answer', async ({ from, answer }) => {
      try {
        await peersRef.current[from]?.setRemoteDescription(new RTCSessionDescription(answer));
      } catch {}
    });

    // ICE candidate
    socket.on('voice:ice_candidate', async ({ from, candidate }) => {
      try {
        await peersRef.current[from]?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    });

    // Peer left
    socket.on('voice:peer_left', ({ socketId }) => {
      peersRef.current[socketId]?.close();
      delete peersRef.current[socketId];
      if (audioRefs.current[socketId]) {
        audioRefs.current[socketId].srcObject = null;
        audioRefs.current[socketId].remove();
        delete audioRefs.current[socketId];
      }
      setParticipants(prev => prev.filter(p => p.socketId !== socketId));
      setSpeaking(prev => { const n = {...prev}; delete n[socketId]; return n; });
    });

    // Mute state changed
    socket.on('voice:peer_muted', ({ socketId, muted: m }) => {
      setParticipants(prev => prev.map(p => p.socketId === socketId ? { ...p, muted: m } : p));
    });

    // Room update
    socket.on('voice:room_update', ({ participants: ps }) => {
      setParticipants(ps.filter(p => p.socketId !== socket.id));
    });

    // Speaking
    socket.on('voice:peer_speaking', ({ socketId, speaking: sp }) => {
      setSpeaking(prev => ({ ...prev, [socketId]: sp }));
    });

    return () => {
      ['voice:peers','voice:peer_joined','voice:offer','voice:answer',
       'voice:ice_candidate','voice:peer_left','voice:peer_muted',
       'voice:room_update','voice:peer_speaking'].forEach(e => socket.off(e));
    };
  }, [socket, createPeer]);

  // Cleanup on unmount
  useEffect(() => () => { if (joined) leaveVoice(); }, []);

  // ── Render ────────────────────────────────────────────────────────────
  if (!joined) {
    return (
      <div style={s.joinWrap}>
        <button
          onClick={joinVoice}
          disabled={connecting}
          className="btn btn-outline btn-full"
          style={{ gap:8 }}>
          {connecting ? '⏳ Connecting…' : '🎙 Join Voice Chat'}
        </button>
        {error && <p style={s.error}>{error}</p>}
      </div>
    );
  }

  const allParticipants = [
    { socketId: socket.id, userId, username, muted, isMe: true },
    ...participants,
  ];

  return (
    <div style={s.wrap}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.dot} className="pulse" />
          <span style={s.title}>🎙 Voice</span>
          <span style={s.count}>{allParticipants.length}</span>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={toggleMute} style={{ ...s.iconBtn, background: muted ? 'rgba(231,76,60,.2)' : 'var(--bg3)', color: muted ? 'var(--red)' : 'var(--text2)' }} title={muted?'Unmute':'Mute'}>
            {muted ? '🔇' : '🎙'}
          </button>
          <button onClick={leaveVoice} style={{ ...s.iconBtn, background:'rgba(231,76,60,.1)', color:'var(--red)' }} title="Leave voice">
            📵
          </button>
        </div>
      </div>

      {/* Participants */}
      <div style={s.participants}>
        {allParticipants.map(p => {
          const isSpeaking = speaking[p.socketId];
          return (
            <div key={p.socketId} style={s.participant}>
              <div style={{
                ...s.avatar,
                boxShadow: isSpeaking ? '0 0 0 2px var(--green), 0 0 12px rgba(46,204,113,.5)' : 'none',
                background: p.isMe ? 'var(--gold-dim)' : 'var(--surface2)',
                color:      p.isMe ? 'var(--gold)'     : 'var(--text2)',
                border:     `2px solid ${isSpeaking ? 'var(--green)' : 'transparent'}`,
                transition: 'box-shadow .15s, border-color .15s',
              }}>
                {p.username?.[0]?.toUpperCase()}
              </div>
              <div style={s.participantInfo}>
                <span style={{ fontSize:12, fontWeight:600 }}>
                  {p.username}{p.isMe && <span style={s.youBadge}>you</span>}
                </span>
                {isSpeaking && !p.muted && <span style={s.speakingLabel}>speaking…</span>}
              </div>
              <span style={{ fontSize:14 }}>{p.muted ? '🔇' : ''}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  joinWrap:        { display:'flex', flexDirection:'column', gap:6 },
  error:           { fontSize:12, color:'var(--red)', textAlign:'center' },
  wrap:            { display:'flex', flexDirection:'column', gap:8 },
  header:          { display:'flex', alignItems:'center', justifyContent:'space-between' },
  headerLeft:      { display:'flex', alignItems:'center', gap:8 },
  dot:             { width:8, height:8, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 6px var(--green)' },
  title:           { fontWeight:700, fontSize:14 },
  count:           { fontSize:12, color:'var(--text3)', background:'var(--bg3)', padding:'1px 7px', borderRadius:100 },
  iconBtn:         { width:30, height:30, borderRadius:8, border:'none', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 150ms' },
  participants:    { display:'flex', flexDirection:'column', gap:6 },
  participant:     { display:'flex', alignItems:'center', gap:8, padding:'6px 8px', background:'var(--bg3)', borderRadius:8 },
  avatar:          { width:30, height:30, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, flexShrink:0 },
  participantInfo: { flex:1, display:'flex', flexDirection:'column', gap:1 },
  youBadge:        { fontSize:9, background:'rgba(59,130,246,.2)', color:'var(--blue)', padding:'1px 5px', borderRadius:3, marginLeft:5, fontWeight:700 },
  speakingLabel:   { fontSize:10, color:'var(--green)', fontStyle:'italic' },
};
