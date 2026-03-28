import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'https://auction-app-m9xw.onrender.com/api';
const api  = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

const TEAM_COLORS = {
  MI:'#004BA0', CSK:'#FFFF00', RCB:'#EC1C24', KKR:'#3A225D',
  DC:'#0078BC', RR:'#FF69B4', PBKS:'#ED1B24', SRH:'#F7A721',
  GT:'#1C1C1C', LSG:'#A4262C',
};
const TEAM_NAMES = {
  MI:'Mumbai Indians', CSK:'Chennai Super Kings', RCB:'Royal Challengers Bengaluru',
  KKR:'Kolkata Knight Riders', DC:'Delhi Capitals', RR:'Rajasthan Royals',
  PBKS:'Punjab Kings', SRH:'Sunrisers Hyderabad', GT:'Gujarat Titans', LSG:'Lucknow Super Giants',
};

export default function FantasyPage() {
  const { user }      = useAuth();
  const nav           = useNavigate();
  const [tab,setTab]  = useState('solo');
  const [upcomingMatches, setUpcoming] = useState([]);
  const [mySeasons, setMySeasons]      = useState([]);
  const [completedMatches, setCompleted] = useState([]);
  const [loading, setLoading]          = useState(true);
  const [showCreate, setShowCreate]    = useState(false);
  const [showJoin,   setShowJoin]      = useState(false);
  const [joinCode, setJoinCode]        = useState('');
  const [createForm, setCreateForm]    = useState({ name:'', description:'', isPublic:false });
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/matches/upcoming`,  api()),
      axios.get(`${API}/seasons/my`,        api()),
      axios.get(`${API}/matches/completed`, api()),
    ]).then(([u, s, c]) => {
      setUpcoming(u.data.matches || []);
      setMySeasons(s.data.seasons || []);
      setCompleted(c.data.matches || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const createSeason = async e => {
    e.preventDefault(); setErr('');
    try {
      await axios.post(`${API}/seasons`, createForm, api());
      const s = await axios.get(`${API}/seasons/my`, api());
      setMySeasons(s.data.seasons || []);
      setShowCreate(false);
    } catch(e) { setErr(e.response?.data?.error || 'Failed to create'); }
  };

  const joinSeason = async e => {
    e.preventDefault(); setErr('');
    try {
      await axios.post(`${API}/seasons/join`, { code: joinCode }, api());
      const s = await axios.get(`${API}/seasons/my`, api());
      setMySeasons(s.data.seasons || []);
      setShowJoin(false);
    } catch(e) { setErr(e.response?.data?.error || 'Failed to join'); }
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="spin" style={{ width:44, height:44, border:'3px solid var(--border2)', borderTopColor:'var(--gold)', borderRadius:'50%' }} />
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.bg} />

      {/* Header */}
      <header style={s.header}>
        <button onClick={() => nav('/')} className="btn btn-ghost btn-sm">← Lobby</button>
        <h1 style={s.title}>🏆 Fantasy Cricket</h1>
        <div style={{ width:80 }} />
      </header>

      {/* Tab switcher */}
      <div style={s.tabs}>
        {[['solo','⚡ Solo Fantasy'],['seasons','🏟️ Seasons']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ ...s.tab, ...(tab===id ? s.tabA : {}) }}>
            {label}
          </button>
        ))}
      </div>

      <main style={s.main}>

        {/* ── SOLO FANTASY TAB ── */}
        {tab === 'solo' && (
          <div style={s.col}>
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}>Upcoming Matches</h2>
              <p style={{ fontSize:13, color:'var(--text2)' }}>Pick your 11 before the match starts</p>
            </div>

            {upcomingMatches.length === 0 && (
              <div style={s.empty}>
                <span style={{ fontSize:48 }}>🏏</span>
                <p>No upcoming matches yet.</p>
                <p style={{ fontSize:12, color:'var(--text3)' }}>Admin will add matches before each IPL game.</p>
              </div>
            )}

            {upcomingMatches.map(m => (
              <MatchCard key={m._id} match={m} onClick={() => nav(`/fantasy/match/${m._id}`)} />
            ))}

            {completedMatches.length > 0 && (
              <>
                <h2 style={{ ...s.sectionTitle, marginTop:24 }}>Completed Matches</h2>
                {completedMatches.map(m => (
                  <MatchCard key={m._id} match={m} completed onClick={() => nav(`/fantasy/match/${m._id}/results`)} />
                ))}
              </>
            )}
          </div>
        )}

        {/* ── SEASONS TAB ── */}
        {tab === 'seasons' && (
          <div style={s.col}>
            <div style={{ display:'flex', gap:10, marginBottom:20 }}>
              <button onClick={() => { setShowCreate(true); setErr(''); }} className="btn btn-gold" style={{ flex:1 }}>
                + Create Season
              </button>
              <button onClick={() => { setShowJoin(true); setErr(''); }} className="btn btn-outline" style={{ flex:1 }}>
                Join Season
              </button>
            </div>

            {/* Create Season Modal */}
            {showCreate && (
              <div style={s.modal}>
                <h3 style={s.modalTitle}>Create Season</h3>
                <form onSubmit={createSeason} style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <input className="input" placeholder="Season name (e.g. Friends IPL 2026)" value={createForm.name}
                    onChange={e => setCreateForm(f=>({...f,name:e.target.value}))} required />
                  <input className="input" placeholder="Description (optional)" value={createForm.description}
                    onChange={e => setCreateForm(f=>({...f,description:e.target.value}))} />
                  <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--text2)', cursor:'pointer' }}>
                    <input type="checkbox" checked={createForm.isPublic}
                      onChange={e => setCreateForm(f=>({...f,isPublic:e.target.checked}))} />
                    Make public (anyone can find and join)
                  </label>
                  {err && <p style={{ color:'var(--red)', fontSize:13 }}>{err}</p>}
                  <div style={{ display:'flex', gap:8 }}>
                    <button type="submit" className="btn btn-gold" style={{ flex:1 }}>Create</button>
                    <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost" style={{ flex:1 }}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Join Season Modal */}
            {showJoin && (
              <div style={s.modal}>
                <h3 style={s.modalTitle}>Join Season</h3>
                <form onSubmit={joinSeason} style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <input className="input" placeholder="Enter season code" value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())} required maxLength={6} style={{ letterSpacing:'.2em', fontSize:20, textAlign:'center' }} />
                  {err && <p style={{ color:'var(--red)', fontSize:13 }}>{err}</p>}
                  <div style={{ display:'flex', gap:8 }}>
                    <button type="submit" className="btn btn-gold" style={{ flex:1 }}>Join</button>
                    <button type="button" onClick={() => setShowJoin(false)} className="btn btn-ghost" style={{ flex:1 }}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* My Seasons */}
            {mySeasons.length === 0 ? (
              <div style={s.empty}>
                <span style={{ fontSize:48 }}>🏟️</span>
                <p>No seasons yet.</p>
                <p style={{ fontSize:12, color:'var(--text3)' }}>Create or join a season to play with friends!</p>
              </div>
            ) : (
              mySeasons.map(season => (
                <div key={season._id} onClick={() => nav(`/fantasy/season/${season._id}`)}
                  style={s.seasonCard}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:16 }}>{season.name}</div>
                      <div style={{ fontSize:12, color:'var(--text2)', marginTop:4 }}>
                        {season.members.length} members · Code: <strong style={{ color:'var(--gold)', letterSpacing:'.1em' }}>{season.code}</strong>
                      </div>
                      {season.description && <div style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>{season.description}</div>}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:100, background:season.status==='active'?'rgba(46,204,113,.2)':'var(--bg3)', color:season.status==='active'?'var(--green)':'var(--text3)', fontWeight:700 }}>{season.status.toUpperCase()}</span>
                      {season.isPublic && <span style={{ fontSize:10, color:'var(--text3)' }}>🌐 Public</span>}
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:'var(--text3)', marginTop:8 }}>
                    Created by {season.host?.username} · {new Date(season.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function MatchCard({ match, onClick, completed }) {
  const c1 = TEAM_COLORS[match.team1] || '#333';
  const c2 = TEAM_COLORS[match.team2] || '#333';
  return (
    <div onClick={onClick} style={{ display:'flex', alignItems:'center', gap:14, padding:'16px', background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:14, cursor:'pointer', marginBottom:10, transition:'all 150ms' }}>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
          <TeamBadge team={match.team1} />
          <span style={{ fontFamily:'var(--font-d)', fontSize:18, color:'var(--text2)' }}>vs</span>
          <TeamBadge team={match.team2} />
        </div>
        <div style={{ fontSize:12, color:'var(--text2)' }}>{fmtDate(match.matchDate)}</div>
        {match.venue && <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>📍 {match.venue}</div>}
        {completed && match.result && <div style={{ fontSize:12, color:'var(--gold)', marginTop:4, fontWeight:600 }}>🏆 {match.result}</div>}
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        {completed
          ? <span style={{ fontSize:12, color:'var(--green)', fontWeight:700 }}>View Results →</span>
          : <span style={{ fontSize:12, color:'var(--gold)', fontWeight:700 }}>Pick Team →</span>
        }
      </div>
    </div>
  );
}

function TeamBadge({ team }) {
  const color = TEAM_COLORS[team] || '#555';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <div style={{ width:28, height:28, borderRadius:6, background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:'#fff' }}>{team}</div>
      <span style={{ fontWeight:700, fontSize:13 }}>{TEAM_NAMES[team] || team}</span>
    </div>
  );
}

const s = {
  page:        { minHeight:'100vh', display:'flex', flexDirection:'column', position:'relative' },
  bg:          { position:'fixed', inset:0, background:'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,200,66,.07), transparent 60%), var(--bg)', zIndex:0 },
  header:      { position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 24px', borderBottom:'1px solid var(--border)', background:'rgba(10,10,15,.9)', backdropFilter:'blur(12px)' },
  title:       { fontFamily:'var(--font-d)', fontSize:24, color:'var(--gold)', letterSpacing:'.04em' },
  tabs:        { position:'relative', zIndex:1, display:'flex', padding:'16px 24px 0', gap:8, borderBottom:'1px solid var(--border)' },
  tab:         { padding:'10px 20px', border:'none', background:'transparent', color:'var(--text2)', cursor:'pointer', fontSize:14, fontWeight:600, borderBottom:'2px solid transparent', transition:'all 150ms' },
  tabA:        { color:'var(--gold)', borderBottomColor:'var(--gold)' },
  main:        { position:'relative', zIndex:1, flex:1, padding:'24px', maxWidth:720, margin:'0 auto', width:'100%' },
  col:         { display:'flex', flexDirection:'column' },
  sectionHeader:{ marginBottom:16 },
  sectionTitle:{ fontFamily:'var(--font-d)', fontSize:22, marginBottom:4 },
  empty:       { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 0', gap:12, color:'var(--text2)', textAlign:'center' },
  seasonCard:  { padding:'16px', background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:14, cursor:'pointer', marginBottom:10, transition:'all 150ms' },
  modal:       { padding:'20px', background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:14, marginBottom:16 },
  modalTitle:  { fontFamily:'var(--font-d)', fontSize:20, marginBottom:16 },
};
