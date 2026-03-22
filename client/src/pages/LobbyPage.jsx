import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { getRooms, createRoom } from '../services';

export default function LobbyPage() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [tab,  setTab]  = useState('join');
  const [code, setCode] = useState('');
  const [rooms,setRooms]= useState([]);
  const [form, setForm] = useState({ name:'', startingBudget:1000, minIncrement:5, timerSeconds:30, maxPlayers:8 });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  useEffect(() => { getRooms().then(d => setRooms(d.rooms||[])).catch(()=>{}); }, []);

  const joinRoom = e => {
    e.preventDefault();
    if (!code.trim()) return setErr('Enter room code');
    nav(`/room/${code.trim().toUpperCase()}`);
  };

  const makeRoom = async e => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const { room } = await createRoom({ name: form.name || `${user.username}'s Auction`, settings: { startingBudget:+form.startingBudget, minIncrement:+form.minIncrement, timerSeconds:+form.timerSeconds, maxPlayers:+form.maxPlayers } });
      nav(`/room/${room.code}`);
    } catch(e) { setErr(e.error||'Failed to create'); }
    finally { setBusy(false); }
  };

  return (
    <div style={s.page}>
      <div style={s.bg} />
      <header style={s.header}>
        <div style={s.logo}>🏏 <span style={s.logoTxt}>BidWar</span></div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ color:'var(--text2)', fontSize:14 }}>👤 {user?.username}</span>
          <button onClick={logout} className="btn btn-ghost btn-sm">Sign Out</button>
        </div>
      </header>

      <main style={s.main}>
        <div style={s.hero}>
          <h1 style={s.heroTitle}>CRICKET AUCTION</h1>
          <p style={s.heroSub}>Open bidding — everyone bids, highest wins!</p>
        </div>

        <div style={s.tabs}>
          {[['join','Join Room'],['create','Create Room'],['browse','Browse']].map(([id,l]) => (
            <button key={id} style={{ ...s.tab, ...(tab===id?s.tabA:{}) }} onClick={() => { setTab(id); setErr(''); }}>{l}</button>
          ))}
        </div>

        <div style={s.panel} className="fade-in">
          {tab === 'join' && (
            <>
              <h2 style={s.panelTitle}>Enter Room Code</h2>
              <p style={{ color:'var(--text2)', fontSize:14, marginBottom:20 }}>Get the 6-letter code from the host</p>
              <form onSubmit={joinRoom} style={{ display:'flex', gap:10 }}>
                <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} className="input" style={{ fontFamily:'var(--font-m)', fontSize:22, textAlign:'center', letterSpacing:'.15em' }} />
                <button type="submit" className="btn btn-gold btn-lg">Join →</button>
              </form>
              {err && <p style={s.err}>{err}</p>}
            </>
          )}

          {tab === 'create' && (
            <>
              <h2 style={s.panelTitle}>Create Auction Room</h2>
              <form onSubmit={makeRoom} style={{ display:'flex', flexDirection:'column', gap:14, marginTop:16 }}>
                <label style={s.field}><span style={s.label}>Room Name</span>
                  <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder={`${user?.username}'s Auction`} className="input" /></label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <label style={s.field}><span style={s.label}>Budget per Team (₹L)</span>
                    <input type="number" value={form.startingBudget} min={100} max={10000} onChange={e=>setForm(f=>({...f,startingBudget:e.target.value}))} className="input" /></label>
                  <label style={s.field}><span style={s.label}>Min Increment (₹L)</span>
                    <input type="number" value={form.minIncrement} min={1} max={100} onChange={e=>setForm(f=>({...f,minIncrement:e.target.value}))} className="input" /></label>
                  <label style={s.field}><span style={s.label}>Timer (seconds)</span>
                    <input type="number" value={form.timerSeconds} min={10} max={120} onChange={e=>setForm(f=>({...f,timerSeconds:e.target.value}))} className="input" /></label>
                  <label style={s.field}><span style={s.label}>Max Players</span>
                    <input type="number" value={form.maxPlayers} min={2} max={12} onChange={e=>setForm(f=>({...f,maxPlayers:e.target.value}))} className="input" /></label>
                </div>
                {err && <p style={s.err}>{err}</p>}
                <button type="submit" disabled={busy} className="btn btn-gold btn-lg btn-full">
                  {busy ? 'Creating…' : '🏏 Create Room'}
                </button>
              </form>
            </>
          )}

          {tab === 'browse' && (
            <>
              <h2 style={s.panelTitle}>Active Rooms</h2>
              {rooms.length === 0
                ? <p style={{ color:'var(--text3)', textAlign:'center', padding:'32px 0' }}>No active rooms. Create one!</p>
                : <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:16 }}>
                    {rooms.map(r => (
                      <div key={r._id} style={s.roomRow}>
                        <div>
                          <div style={{ fontWeight:600 }}>{r.name}</div>
                          <div style={{ fontSize:13, color:'var(--text2)' }}>Host: {r.host?.username} · Code: <strong style={{ color:'var(--gold)' }}>{r.code}</strong></div>
                        </div>
                        <button onClick={() => nav(`/room/${r.code}`)} className="btn btn-outline btn-sm">Join</button>
                      </div>
                    ))}
                  </div>
              }
            </>
          )}
        </div>
      </main>
    </div>
  );
}

const s = {
  page:      { minHeight:'100vh', display:'flex', flexDirection:'column', position:'relative' },
  bg:        { position:'fixed', inset:0, background:'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(245,200,66,.1), transparent 60%), var(--bg)' },
  header:    { position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 28px', borderBottom:'1px solid var(--border)', background:'rgba(10,10,15,.85)', backdropFilter:'blur(12px)' },
  logo:      { display:'flex', alignItems:'center', gap:10, fontSize:20 },
  logoTxt:   { fontFamily:'var(--font-d)', fontSize:28, color:'var(--gold)', letterSpacing:'.05em' },
  main:      { position:'relative', zIndex:1, flex:1, display:'flex', flexDirection:'column', alignItems:'center', padding:'48px 24px' },
  hero:      { textAlign:'center', marginBottom:36 },
  heroTitle: { fontFamily:'var(--font-d)', fontSize:'clamp(48px,8vw,90px)', color:'var(--gold)', letterSpacing:'.06em', lineHeight:1 },
  heroSub:   { color:'var(--text2)', fontSize:16, marginTop:10 },
  tabs:      { display:'flex', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:4, gap:4, marginBottom:24, width:'100%', maxWidth:540 },
  tab:       { flex:1, padding:'10px 0', border:'none', background:'transparent', color:'var(--text2)', cursor:'pointer', borderRadius:7, fontSize:14, fontWeight:600, fontFamily:'var(--font-b)', transition:'all 150ms' },
  tabA:      { background:'var(--bg3)', color:'var(--text)' },
  panel:     { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:28, width:'100%', maxWidth:540 },
  panelTitle:{ fontFamily:'var(--font-d)', fontSize:28, marginBottom:4 },
  field:     { display:'flex', flexDirection:'column', gap:5 },
  label:     { fontSize:13, color:'var(--text2)', fontWeight:500 },
  err:       { color:'var(--red)', fontSize:13, padding:'8px 12px', background:'rgba(231,76,60,.1)', borderRadius:6, marginTop:4 },
  roomRow:   { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', background:'var(--bg3)', borderRadius:10, border:'1px solid var(--border)' },
};
