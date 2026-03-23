import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { getRoom, connectSocket, getSocket } from '../services';
import VoiceChat from '../components/VoiceChat';

export default function RoomPage() {
  const { code } = useParams();
  const { user } = useAuth();
  const nav      = useNavigate();
  const [room,    setRoom]    = useState(null);
  const [state,   setState]   = useState(null);
  const [members, setMembers] = useState([]);
  const [chat,    setChat]    = useState([]);
  const [msg,     setMsg]     = useState('');
  const [err,     setErr]     = useState('');
  const [joined,  setJoined]  = useState(false);
  const chatRef = useRef(null);

  const isHost = room?.host?._id === user?._id || room?.host === user?._id;

  useEffect(() => {
    if (!user) return;
    let s;

    getRoom(code).then(({ room: r }) => {
      setRoom(r);
      s = connectSocket();

      s.on('room:joined',  ({ room: rm, state: st }) => { setRoom(rm); setState(st); setJoined(true); });
      s.on('room:updated', ({ state: st, members: ms }) => { setState(st); setMembers(ms); });
      s.on('chat:msg',     msg => setChat(c => [...c.slice(-99), msg]));
      s.on('auction:started', ({ state: st }) => { setState(st); nav(`/auction/${code}`); });

      s.emit('room:join', { roomCode: code.toUpperCase(), userId: user._id, username: user.username }, res => {
        if (!res?.ok) setErr(res?.error || 'Failed to join');
      });
    }).catch(() => setErr('Room not found'));

    return () => {
      if (s) { s.off('room:joined'); s.off('room:updated'); s.off('chat:msg'); s.off('auction:started'); }
    };
  }, [code, user]);

  useEffect(() => { chatRef.current?.scrollIntoView({ behavior:'smooth' }); }, [chat]);

  const startAuction = () => {
    getSocket().emit('auction:start', {}, res => {
      if (!res?.ok) setErr(res?.error || 'Failed to start');
    });
  };

  const sendChat = e => {
    e.preventDefault();
    if (!msg.trim()) return;
    getSocket().emit('chat:send', { message: msg.trim() });
    setMsg('');
  };

  if (err) return (
    <div style={s.center}>
      <p style={{ color:'var(--red)', fontSize:18 }}>{err}</p>
      <button onClick={() => nav('/')} className="btn btn-ghost" style={{ marginTop:16 }}>← Back</button>
    </div>
  );

  if (!joined) return (
    <div style={s.center}>
      <div className="spin" style={s.spinner} />
      <p style={{ color:'var(--text2)', marginTop:16 }}>Joining room {code}…</p>
    </div>
  );

  const bidders = state?.players?.filter(p => !p.isHost) || [];

  return (
    <div style={s.page}>
      <div style={s.bg} />
      <header style={s.header}>
        <button onClick={() => nav('/')} className="btn btn-ghost btn-sm">← Lobby</button>
        <div style={s.codeBox}>
          <div style={s.codeLabel}>ROOM CODE</div>
          <div style={s.codeVal}>{code}</div>
        </div>
        <div style={{ width:80 }} />
      </header>

      <main style={s.main}>
        <div style={s.grid}>
          {/* Left */}
          <div style={s.left}>
            <div className="card" style={{ marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <h2 style={{ fontFamily:'var(--font-d)', fontSize:24 }}>{room?.name}</h2>
                <span style={s.waitBadge}>WAITING</span>
              </div>
              {[
                ['💰','Budget', `₹${room?.settings?.startingBudget}L per team`],
                ['📈','Min Bid', `₹${room?.settings?.minIncrement}L increment`],
                ['⏱','Timer',  `${room?.settings?.timerSeconds}s per player`],
                ['🏏','Players', `${state?.items?.length || 18} cricket players`],
              ].map(([icon,label,val]) => (
                <div key={label} style={s.settingRow}>
                  <span style={{ color:'var(--text2)' }}>{icon} {label}</span>
                  <span style={{ color:'var(--gold)', fontWeight:600 }}>{val}</span>
                </div>
              ))}
            </div>

            <div className="card">
              <h3 style={{ fontFamily:'var(--font-d)', fontSize:20, marginBottom:14 }}>Players ({bidders.length})</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {bidders.length === 0 && <p style={{ color:'var(--text3)', fontSize:13 }}>Waiting for players to join…</p>}
                {bidders.map(p => (
                  <div key={p.id} style={s.playerRow}>
                    <div style={s.avatar}>{p.username[0].toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight:600, fontSize:14 }}>{p.username} {p.id === user?._id && <span style={s.youBadge}>you</span>}</div>
                      <div style={{ fontSize:12, color:'var(--text2)' }}>Budget: ₹{p.budget}L</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:20 }}>
                {isHost
                  ? <button onClick={startAuction} disabled={bidders.length < 1} className="btn btn-gold btn-full btn-lg">🏏 Start Auction</button>
                  : <p style={{ textAlign:'center', color:'var(--text3)', fontSize:13 }}>Waiting for host to start…</p>
                }
              </div>
            </div>
          </div>

          {/* Right: Voice + Chat */}
          <div style={{ display:'flex', flexDirection:'column', gap:14, height:'100%' }}>
            {/* Voice Chat */}
            <div className="card" style={{ flexShrink:0, border:'1px solid rgba(46,204,113,.2)' }}>
              <VoiceChat
                roomCode={code?.toUpperCase()}
                userId={user?._id}
                username={user?.username}
              />
            </div>
            {/* Chat */}
            <div className="card" style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0, overflow:'hidden' }}>
              <h3 style={{ fontFamily:'var(--font-d)', fontSize:20, marginBottom:12, flexShrink:0 }}>💬 Chat</h3>
              <div style={{ ...s.chatMsgs, flex:1, minHeight:0 }}>
                {chat.filter(m=>m.type==='user').map((m, i) => (
                  <div key={i} style={s.chatMsg}>
                    <span style={{ color:'var(--gold)', fontWeight:700, marginRight:6 }}>{m.username}</span>
                    <span>{m.message}</span>
                  </div>
                ))}
                <div ref={chatRef} />
              </div>
              <form onSubmit={sendChat} style={{ display:'flex', gap:8, paddingTop:10, borderTop:'1px solid var(--border)', flexShrink:0 }}>
                <input value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Say something…" className="input" style={{ fontSize:13 }} />
                <button type="submit" className="btn btn-outline btn-sm">↑</button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const s = {
  page:      { minHeight:'100vh', display:'flex', flexDirection:'column', position:'relative' },
  bg:        { position:'fixed', inset:0, background:'radial-gradient(ellipse 60% 40% at 20% 80%, rgba(245,200,66,.06), transparent 50%), var(--bg)' },
  center:    { minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' },
  spinner:   { width:40, height:40, border:'3px solid var(--border2)', borderTopColor:'var(--gold)', borderRadius:'50%' },
  header:    { position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 28px', borderBottom:'1px solid var(--border)', background:'rgba(10,10,15,.85)', backdropFilter:'blur(12px)' },
  codeBox:   { textAlign:'center' },
  codeLabel: { fontSize:11, color:'var(--text3)', letterSpacing:'.1em', textTransform:'uppercase' },
  codeVal:   { fontFamily:'var(--font-m)', fontSize:22, color:'var(--gold)', letterSpacing:'.15em' },
  main:      { position:'relative', zIndex:1, flex:1, padding:24 },
  grid:      { display:'grid', gridTemplateColumns:'1fr 360px', gap:20, maxWidth:1000, margin:'0 auto', height:'calc(100vh - 130px)' },
  left:      { overflowY:'auto' },
  waitBadge: { background:'rgba(46,204,113,.15)', color:'var(--green)', padding:'3px 10px', borderRadius:100, fontSize:11, fontWeight:700, letterSpacing:'.05em' },
  settingRow:{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:14 },
  playerRow: { display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background:'var(--bg3)', borderRadius:10 },
  avatar:    { width:34, height:34, borderRadius:'50%', background:'var(--gold-dim)', color:'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, flexShrink:0 },
  youBadge:  { fontSize:10, background:'rgba(59,130,246,.2)', color:'var(--blue)', padding:'1px 6px', borderRadius:4, fontWeight:700, marginLeft:6 },
  chatMsgs:  { flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:6, minHeight:0, paddingRight:4 },
  chatMsg:   { fontSize:13, lineHeight:1.4 },
  chatSys:   { textAlign:'center' },
};
