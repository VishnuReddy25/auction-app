import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '../services';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export default function VoiceChat({ roomCode, userId, username }) {
  const [joined,       setJoined]       = useState(false);
  const [muted,        setMuted]        = useState(false);
  const [participants, setParticipants] = useState([]);
  const [speaking,     setSpeaking]     = useState({});
  const [error,        setError]        = useState('');
  const [connecting,   setConnecting]   = useState(false);

  const localStreamRef = useRef(null);
  const peersRef       = useRef({});
  const audioRefs      = useRef({});
  const analyserRef    = useRef(null);
  const rafRef         = useRef(null);
  const socket         = getSocket();

  const startSpeakDetection = useCallback((stream) => {
    try {
      const ctx      = new (window.AudioContext || window.webkitAudioContext)();
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = { analyser, ctx };
      const data = new Uint8Array(analyser.frequencyBinCount);
      let wasSpeaking = false;
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const vol = data.reduce((a,b)=>a+b,0)/data.length;
        const now = vol > 15;
        if (now !== wasSpeaking) {
          wasSpeaking = now;
          socket.emit('voice:speaking', { speaking: now });
          setSpeaking(p => ({ ...p, [socket.id]: now }));
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {}
  }, [socket]);

  const createPeer = useCallback((targetId, initiator, peerInfo) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[targetId] = pc;

    localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit('voice:ice_candidate', { to: targetId, candidate });
    };

    pc.ontrack = ({ streams }) => {
      const stream = streams[0];
      if (!audioRefs.current[targetId]) {
        const audio = document.createElement('audio');
        audio.autoplay = true;
        audio.volume   = 1;
        document.body.appendChild(audio);
        audioRefs.current[targetId] = audio;
      }
      audioRefs.current[targetId].srcObject = stream;
      setParticipants(p => [...p.filter(x => x.socketId !== targetId), { ...peerInfo, socketId: targetId }]);
    };

    if (initiator) {
      pc.createOffer()
        .then(o => pc.setLocalDescription(o))
        .then(() => socket.emit('voice:offer', { to: targetId, offer: pc.localDescription }))
        .catch(() => {});
    }

    return pc;
  }, [socket]);

  const join = useCallback(async () => {
    setConnecting(true); setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      startSpeakDetection(stream);
      socket.emit('voice:join', { roomCode, userId, username });
      setJoined(true);
    } catch (err) {
      if (err.name === 'NotAllowedError')    setError('Microphone permission denied.');
      else if (err.name === 'NotFoundError') setError('No microphone found.');
      else setError('Could not access microphone.');
    } finally { setConnecting(false); }
  }, [roomCode, userId, username, socket, startSpeakDetection]);

  const leave = useCallback(() => {
    socket.emit('voice:leave');
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};
    Object.values(audioRefs.current).forEach(el => { el.srcObject = null; el.remove(); });
    audioRefs.current = {};
    cancelAnimationFrame(rafRef.current);
    analyserRef.current?.ctx?.close();
    analyserRef.current = null;
    setJoined(false); setParticipants([]); setSpeaking({}); setMuted(false);
  }, [socket]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const next = !muted;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !next; });
    socket.emit('voice:mute', { muted: next });
    setMuted(next);
  }, [muted, socket]);

  useEffect(() => {
    socket.on('voice:peers', ({ peers }) => {
      peers.forEach(peer => createPeer(peer.socketId, true, peer));
    });
    socket.on('voice:peer_joined', (peer) => {
      setParticipants(p => [...p.filter(x => x.socketId !== peer.socketId), peer]);
    });
    socket.on('voice:offer', async ({ from, fromUser, offer }) => {
      const pc = createPeer(from, false, fromUser);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('voice:answer', { to: from, answer: pc.localDescription });
      } catch {}
    });
    socket.on('voice:answer', async ({ from, answer }) => {
      try { await peersRef.current[from]?.setRemoteDescription(new RTCSessionDescription(answer)); } catch {}
    });
    socket.on('voice:ice_candidate', async ({ from, candidate }) => {
      try { await peersRef.current[from]?.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    });
    socket.on('voice:peer_left', ({ socketId }) => {
      peersRef.current[socketId]?.close();
      delete peersRef.current[socketId];
      if (audioRefs.current[socketId]) {
        audioRefs.current[socketId].srcObject = null;
        audioRefs.current[socketId].remove();
        delete audioRefs.current[socketId];
      }
      setParticipants(p => p.filter(x => x.socketId !== socketId));
      setSpeaking(p => { const n={...p}; delete n[socketId]; return n; });
    });
    socket.on('voice:peer_muted',    ({ socketId, muted:m })    => setParticipants(p => p.map(x => x.socketId===socketId ? {...x,muted:m} : x)));
    socket.on('voice:peer_speaking', ({ socketId, speaking:sp })=> setSpeaking(p => ({...p,[socketId]:sp})));
    socket.on('voice:room_update',   ({ participants:ps })       => setParticipants(ps.filter(p => p.socketId !== socket.id)));

    return () => {
      ['voice:peers','voice:peer_joined','voice:offer','voice:answer','voice:ice_candidate',
       'voice:peer_left','voice:peer_muted','voice:peer_speaking','voice:room_update']
        .forEach(e => socket.off(e));
    };
  }, [socket, createPeer]);

  useEffect(() => () => { if (joined) leave(); }, []);

  // ── Not joined ─────────────────────────────────────────────────────────────
  if (!joined) {
    return (
      <div style={s.joinBox}>
        <button onClick={join} disabled={connecting} className="btn btn-outline btn-full" style={{ fontSize:13 }}>
          {connecting ? '⏳ Connecting…' : '🎙 Join Voice Chat'}
        </button>
        {error && <p style={s.error}>{error}</p>}
      </div>
    );
  }

  // ── Joined ─────────────────────────────────────────────────────────────────
  const all = [
    { socketId: socket.id, username, muted, isMe: true },
    ...participants,
  ];

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={s.liveDot} className="pulse" />
          <span style={s.title}>🎙 Voice</span>
          <span style={s.count}>{all.length}</span>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={toggleMute} title={muted?'Unmute':'Mute'}
            style={{ ...s.btn, background:muted?'rgba(231,76,60,.2)':'var(--bg3)', color:muted?'var(--red)':'var(--text2)' }}>
            {muted ? '🔇' : '🎙'}
          </button>
          <button onClick={leave} title="Leave voice"
            style={{ ...s.btn, background:'rgba(231,76,60,.1)', color:'var(--red)' }}>
            📵
          </button>
        </div>
      </div>

      <div style={s.list}>
        {all.map(p => {
          const isSpeaking = speaking[p.socketId];
          return (
            <div key={p.socketId} style={s.participant}>
              <div style={{
                ...s.avatar,
                border:`2px solid ${isSpeaking ? 'var(--green)' : 'transparent'}`,
                boxShadow: isSpeaking ? '0 0 10px rgba(46,204,113,.5)' : 'none',
                background: p.isMe ? 'var(--gold-dim)' : 'var(--surface2)',
                color:      p.isMe ? 'var(--gold)'     : 'var(--text2)',
                transition: 'all .15s',
              }}>
                {p.username?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <span style={{ fontSize:12, fontWeight:600 }}>{p.username}</span>
                {p.isMe && <span style={s.youBadge}>you</span>}
                {isSpeaking && !p.muted && <span style={s.speaking}> speaking…</span>}
              </div>
              {p.muted && <span style={{ fontSize:13 }}>🔇</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  joinBox:     { display:'flex', flexDirection:'column', gap:6 },
  error:       { fontSize:12, color:'var(--red)', margin:0 },
  wrap:        { display:'flex', flexDirection:'column', gap:8 },
  header:      { display:'flex', alignItems:'center', justifyContent:'space-between' },
  liveDot:     { width:8, height:8, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 6px var(--green)' },
  title:       { fontWeight:700, fontSize:14 },
  count:       { fontSize:12, color:'var(--text3)', background:'var(--bg3)', padding:'1px 7px', borderRadius:100 },
  btn:         { width:30, height:30, borderRadius:8, border:'none', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 150ms' },
  list:        { display:'flex', flexDirection:'column', gap:6 },
  participant: { display:'flex', alignItems:'center', gap:8, padding:'6px 8px', background:'var(--bg3)', borderRadius:8 },
  avatar:      { width:30, height:30, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, flexShrink:0 },
  youBadge:    { fontSize:9, background:'rgba(59,130,246,.2)', color:'var(--blue)', padding:'1px 5px', borderRadius:3, marginLeft:5 },
  speaking:    { fontSize:10, color:'var(--green)', fontStyle:'italic' },
};
