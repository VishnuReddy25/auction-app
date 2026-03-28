import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'https://auction-app-m9xw.onrender.com/api';
const api  = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });

const IPL_TEAMS = ['MI','CSK','RCB','KKR','DC','RR','PBKS','SRH','GT','LSG'];
const TEAM_COLOR = { MI:'#004BA0',CSK:'#F5C842',RCB:'#EC1C24',KKR:'#3A225D',DC:'#0078BC',RR:'#FF69B4',PBKS:'#ED1B24',SRH:'#F7A721',GT:'#888',LSG:'#A4262C' };
const TEAM_FULL  = { MI:'Mumbai Indians',CSK:'Chennai Super Kings',RCB:'Royal Challengers Bengaluru',KKR:'Kolkata Knight Riders',DC:'Delhi Capitals',RR:'Rajasthan Royals',PBKS:'Punjab Kings',SRH:'Sunrisers Hyderabad',GT:'Gujarat Titans',LSG:'Lucknow Super Giants' };
const ROLE_COLOR = { BAT:'#f5c842',BOWL:'#3b82f6',AR:'#2ecc71',WK:'#e05a2b' };
const medals     = ['🥇','🥈','🥉'];

export default function SeasonRoomPage() {
  const { code }  = useParams();
  const nav       = useNavigate();
  const { user }  = useAuth();

  const [room,       setRoom]       = useState(null);
  const [leaderboard,setLeaderboard]= useState([]);
  const [matches,    setMatches]    = useState([]);
  const [tab,        setTab]        = useState('leaderboard');
  const [loading,    setLoading]    = useState(true);

  const [showAddMatch, setShowAddMatch] = useState(false);
  const [matchForm,    setMatchForm]    = useState({ team1:'MI', team2:'CSK', matchDate:'', venue:'' });
  const [addingMatch,  setAddingMatch]  = useState(false);
  const [fetchingId,   setFetchingId]   = useState(null);
  const [msg,          setMsg]          = useState('');
  const [selectedSquad, setSelectedSquad] = useState(null);

  useEffect(() => { load(); }, [code]);

  const load = async () => {
    try {
      const res = await axios.get(`${API}/rooms/${code}/fantasy`, api());
      setRoom(res.data.room);
      setLeaderboard(res.data.leaderboard || []);
      setMatches(res.data.matches || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const addMatch = async e => {
    e.preventDefault(); setAddingMatch(true); setMsg('');
    try {
      await axios.post(`${API}/rooms/${code}/matches`, matchForm, api());
      await load();
      setShowAddMatch(false);
      setMatchForm({ team1:'MI', team2:'CSK', matchDate:'', venue:'' });
      setMsg('✅ Match added!');
    } catch(e) { setMsg('❌ ' + (e.response?.data?.error || 'Failed')); }
    finally { setAddingMatch(false); }
  };

  const fetchScores = async (matchId) => {
    setFetchingId(matchId); setMsg('');
    try {
      const res = await axios.post(`${API}/rooms/${code}/matches/${matchId}/fetch-scores`, {}, api());
      setMsg(`✅ Scores fetched! ${res.data.playersScored} players scored. Points updated!`);
      await load();
    } catch(e) { setMsg('❌ ' + (e.response?.data?.error || 'Failed to fetch scores')); }
    finally { setFetchingId(null); }
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="spin" style={{ width:44, height:44, border:'3px solid var(--border2)', borderTopColor:'var(--gold)', borderRadius:'50%' }} />
    </div>
  );

  if (!room) return <div style={{ padding:40, textAlign:'center', color:'var(--text2)' }}>Room not found</div>;

  const isHost = room.host?._id === user?._id || room.host?._id?.toString() === user?._id;
  const completedMatches = matches.filter(m => m.status === 'completed').length;

  return (
    <div style={s.page}>
      <div style={s.bg} />

      {/* Header */}
      <header style={s.header}>
        <button onClick={() => nav('/')} className="btn btn-ghost btn-sm">← Lobby</button>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:'var(--font-d)', fontSize:20, color:'var(--gold)' }}>🏆 {room.name}</div>
          <div style={{ fontSize:12, color:'var(--text2)' }}>
            IPL Season · {room.members.length} teams · {completedMatches} matches played
          </div>
        </div>
        <div style={{ width:80 }} />
      </header>

      {/* Info banner */}
      <div style={s.banner}>
        <span>🏏</span>
        <span style={{ fontSize:13, color:'var(--text2)' }}>
          Your squad earns points <strong style={{ color:'var(--gold)' }}>automatically</strong> after every IPL match.
          Top 11 scorers from your squad count. Points accumulate all season!
        </span>
      </div>

      {/* Tabs */}
      <div style={s.tabRow}>
        {[['leaderboard','🏆 Standings'],['matches','📅 Matches'],['squads','👥 Squads']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ ...s.tab, ...(tab===id ? s.tabA : {}) }}>{label}</button>
        ))}
      </div>

      <main style={s.main}>

        {msg && (
          <div style={{ padding:'10px 14px', borderRadius:10, background:'var(--bg3)', marginBottom:14, fontSize:13, border:'1px solid var(--border2)' }}>
            {msg}
          </div>
        )}

        {/* ── LEADERBOARD ── */}
        {tab === 'leaderboard' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h2 style={{ fontFamily:'var(--font-d)', fontSize:22 }}>Season Standings</h2>
              <span style={{ fontSize:12, color:'var(--text3)' }}>{completedMatches} matches played</span>
            </div>

            {leaderboard.length === 0 ? (
              <div style={s.empty}>
                <span style={{ fontSize:48 }}>📊</span>
                <p style={{ fontWeight:600 }}>No points yet</p>
                <p style={{ fontSize:13, color:'var(--text3)' }}>
                  {isHost ? 'Add matches and fetch scores to start accumulating points' : 'Standings will appear after the first match is scored'}
                </p>
              </div>
            ) : leaderboard.map((entry, i) => (
              <div key={entry.userId}
                onClick={() => setSelectedSquad(selectedSquad?.userId === entry.userId ? null : entry)}
                style={{ ...s.leaderRow, ...(i===0 ? s.leaderFirst : {}), cursor:'pointer' }}>
                <span style={{ fontSize:22, width:32, textAlign:'center', flexShrink:0 }}>{medals[i]||`#${i+1}`}</span>
                <div style={{ width:38, height:38, borderRadius:'50%', background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:16, flexShrink:0 }}>
                  {entry.username[0].toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:15 }}>{entry.username}</div>
                  <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>
                    {entry.players?.length || 0} players · click to view squad
                  </div>
                  {/* Match points history */}
                  {entry.matchPoints?.length > 0 && (
                    <div style={{ display:'flex', gap:4, marginTop:4, flexWrap:'wrap' }}>
                      {entry.matchPoints.slice(-5).map((mp,j) => (
                        <span key={j} style={{ fontSize:11, padding:'1px 6px', borderRadius:4, background:'var(--bg3)', color:'var(--gold)' }}>+{mp.points}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontFamily:'var(--font-d)', fontSize:32, color:'var(--gold)', lineHeight:1 }}>{entry.totalFantasyPoints || 0}</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>points</div>
                </div>
              </div>
            ))}

            {/* Squad detail */}
            {selectedSquad && (
              <div style={s.squadDetail}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                  <h3 style={{ fontFamily:'var(--font-d)', fontSize:18 }}>{selectedSquad.username}'s Squad</h3>
                  <button onClick={() => setSelectedSquad(null)} className="btn btn-ghost btn-sm">✕</button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:8 }}>
                  {(selectedSquad.players || []).map((p,i) => {
                    const rc = ROLE_COLOR[p.role] || '#999';
                    return (
                      <div key={i} style={{ padding:'8px 10px', borderRadius:8, background:'var(--bg3)', border:`1px solid ${rc}30` }}>
                        <div style={{ fontWeight:600, fontSize:13 }}>{p.name}</div>
                        <div style={{ display:'flex', gap:6, marginTop:3 }}>
                          <span style={{ fontSize:10, padding:'1px 5px', borderRadius:4, background:`${rc}20`, color:rc }}>{p.role}</span>
                          <span style={{ fontSize:10, color:'var(--text3)' }}>{p.team}</span>
                        </div>
                        <div style={{ fontSize:11, color:'var(--gold)', marginTop:3 }}>{p.boughtFor}L</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MATCHES ── */}
        {tab === 'matches' && (
          <div>
            {/* Add Match — host only */}
            {isHost && (
              <div style={{ marginBottom:16 }}>
                <button onClick={() => setShowAddMatch(v=>!v)} className="btn btn-gold btn-full">
                  {showAddMatch ? '✕ Cancel' : '+ Add IPL Match'}
                </button>

                {showAddMatch && (
                  <div style={s.formCard}>
                    <h3 style={{ fontFamily:'var(--font-d)', fontSize:18, marginBottom:14 }}>Add Match</h3>
                    <form onSubmit={addMatch} style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        <div>
                          <label style={s.label}>Team 1</label>
                          <select className="input" value={matchForm.team1}
                            onChange={e => setMatchForm(f=>({...f,team1:e.target.value}))}>
                            {IPL_TEAMS.map(t=><option key={t} value={t}>{t} — {TEAM_FULL[t]}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={s.label}>Team 2</label>
                          <select className="input" value={matchForm.team2}
                            onChange={e => setMatchForm(f=>({...f,team2:e.target.value}))}>
                            {IPL_TEAMS.filter(t=>t!==matchForm.team1).map(t=><option key={t} value={t}>{t} — {TEAM_FULL[t]}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label style={s.label}>Match Date & Time</label>
                        <input type="datetime-local" className="input" required
                          value={matchForm.matchDate}
                          onChange={e => setMatchForm(f=>({...f,matchDate:e.target.value}))} />
                      </div>
                      <div>
                        <label style={s.label}>Venue (optional)</label>
                        <input className="input" placeholder="e.g. Wankhede Stadium"
                          value={matchForm.venue}
                          onChange={e => setMatchForm(f=>({...f,venue:e.target.value}))} />
                      </div>
                      <button type="submit" disabled={addingMatch} className="btn btn-gold">
                        {addingMatch ? '⏳ Adding…' : '✅ Add Match'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {matches.length === 0 ? (
              <div style={s.empty}>
                <span style={{ fontSize:48 }}>📅</span>
                <p style={{ fontWeight:600 }}>No matches yet</p>
                <p style={{ fontSize:13, color:'var(--text3)' }}>
                  {isHost
                    ? 'Click "+ Add IPL Match" before each match day'
                    : 'Host will add matches before each IPL game'}
                </p>
              </div>
            ) : matches.map(m => (
              <div key={m._id} style={s.matchCard}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                    <TeamChip team={m.team1} />
                    <span style={{ color:'var(--text3)', fontWeight:700 }}>vs</span>
                    <TeamChip team={m.team2} />
                  </div>
                  <div style={{ fontSize:12, color:'var(--text2)' }}>📅 {fmtDate(m.matchDate)}</div>
                  {m.venue && <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>📍 {m.venue}</div>}
                  {m.result && <div style={{ fontSize:12, color:'var(--gold)', marginTop:4, fontWeight:600 }}>🏆 {m.result}</div>}
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                  <StatusBadge status={m.status} />
                  {isHost && m.status === 'upcoming' && (
                    <button onClick={() => fetchScores(m._id)} disabled={fetchingId===m._id}
                      className="btn btn-outline btn-sm" style={{ fontSize:11 }}>
                      {fetchingId===m._id ? '⏳ Fetching…' : '📥 Fetch Scores'}
                    </button>
                  )}
                  {m.status === 'completed' && (
                    <span style={{ fontSize:11, color:'var(--green)' }}>Points updated ✅</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── SQUADS ── */}
        {tab === 'squads' && (
          <div>
            <h2 style={{ fontFamily:'var(--font-d)', fontSize:22, marginBottom:16 }}>All Squads</h2>
            {leaderboard.map(entry => (
              <div key={entry.userId} style={{ marginBottom:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <h3 style={{ fontWeight:700, fontSize:15 }}>{entry.username}'s Squad ({entry.players?.length||0} players)</h3>
                  <span style={{ fontFamily:'var(--font-d)', color:'var(--gold)', fontSize:18 }}>{entry.totalFantasyPoints||0} pts</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:8 }}>
                  {(entry.players||[]).map((p,i) => {
                    const rc = ROLE_COLOR[p.role]||'#999';
                    return (
                      <div key={i} style={{ padding:'8px 10px', borderRadius:8, background:'var(--bg3)', border:`1px solid ${rc}30` }}>
                        <div style={{ fontWeight:600, fontSize:12 }}>{p.name}</div>
                        <div style={{ display:'flex', gap:5, marginTop:3 }}>
                          <span style={{ fontSize:9, padding:'1px 5px', borderRadius:4, background:`${rc}20`, color:rc }}>{p.role}</span>
                          <span style={{ fontSize:9, color:'var(--text3)' }}>{p.team}</span>
                        </div>
                        <div style={{ fontSize:10, color:'var(--gold)', marginTop:2 }}>₹{p.boughtFor}L</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function TeamChip({ team }) {
  const c = TEAM_COLOR[team]||'#555';
  return <span style={{ padding:'3px 10px', borderRadius:6, background:`${c}22`, border:`1px solid ${c}55`, fontWeight:700, fontSize:12, color:c }}>{team}</span>;
}
function StatusBadge({ status }) {
  const m = { upcoming:['⏰','var(--gold)'], completed:['✅','var(--green)'] };
  const [icon,color] = m[status]||['❓','var(--text3)'];
  return <span style={{ fontSize:11, fontWeight:700, color }}>{icon} {status.toUpperCase()}</span>;
}

const s = {
  page:       { minHeight:'100vh', display:'flex', flexDirection:'column', position:'relative' },
  bg:         { position:'fixed', inset:0, background:'var(--bg)', zIndex:0 },
  header:     { position:'sticky', top:0, zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', borderBottom:'1px solid var(--border)', background:'rgba(10,10,15,.95)', backdropFilter:'blur(12px)' },
  banner:     { position:'relative', zIndex:1, display:'flex', alignItems:'center', gap:10, padding:'10px 20px', background:'rgba(245,200,66,.06)', borderBottom:'1px solid rgba(245,200,66,.15)' },
  tabRow:     { position:'relative', zIndex:1, display:'flex', borderBottom:'1px solid var(--border)', padding:'0 20px' },
  tab:        { padding:'10px 16px', border:'none', background:'transparent', color:'var(--text2)', cursor:'pointer', fontSize:14, fontWeight:600, borderBottom:'2px solid transparent', transition:'all .15s' },
  tabA:       { color:'var(--gold)', borderBottomColor:'var(--gold)' },
  main:       { position:'relative', zIndex:1, flex:1, padding:'20px', maxWidth:800, margin:'0 auto', width:'100%' },
  empty:      { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 0', gap:10, color:'var(--text2)', textAlign:'center' },
  leaderRow:  { display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, marginBottom:8, transition:'all .15s' },
  leaderFirst:{ border:'1px solid rgba(245,200,66,.35)', background:'rgba(245,200,66,.06)' },
  squadDetail:{ marginTop:16, padding:'16px', background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:14 },
  matchCard:  { display:'flex', alignItems:'flex-start', gap:14, padding:'14px 16px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, marginBottom:10 },
  formCard:   { background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:14, padding:'18px', marginTop:10 },
  label:      { fontSize:12, color:'var(--text2)', marginBottom:5, display:'block' },
};
