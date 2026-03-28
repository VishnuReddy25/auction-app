import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'https://auction-app-m9xw.onrender.com/api';
const api  = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

const IPL_TEAMS = ['MI','CSK','RCB','KKR','DC','RR','PBKS','SRH','GT','LSG'];
const TEAM_FULL = {
  MI:'Mumbai Indians', CSK:'Chennai Super Kings', RCB:'Royal Challengers Bengaluru',
  KKR:'Kolkata Knight Riders', DC:'Delhi Capitals', RR:'Rajasthan Royals',
  PBKS:'Punjab Kings', SRH:'Sunrisers Hyderabad', GT:'Gujarat Titans', LSG:'Lucknow Super Giants',
};
const TEAM_COLOR = {
  MI:'#004BA0', CSK:'#F5C842', RCB:'#EC1C24', KKR:'#3A225D',
  DC:'#0078BC', RR:'#FF69B4', PBKS:'#ED1B24', SRH:'#F7A721',
  GT:'#888', LSG:'#A4262C',
};

export default function SeasonDashboard() {
  const { id }   = useParams();
  const nav      = useNavigate();
  const { user } = useAuth();

  const [season,      setSeason]      = useState(null);
  const [matches,     setMatches]     = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [tab,         setTab]         = useState('matches');
  const [loading,     setLoading]     = useState(true);

  // Add match form
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [matchForm,    setMatchForm]    = useState({ team1:'MI', team2:'CSK', matchDate:'', venue:'' });
  const [addingMatch,  setAddingMatch]  = useState(false);

  // Fetch scores
  const [fetchingId,  setFetchingId]  = useState(null);
  const [fetchMsg,    setFetchMsg]    = useState('');

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    try {
      const [s, lb] = await Promise.all([
        axios.get(`${API}/seasons/${id}`, api()),
        axios.get(`${API}/seasons/${id}/leaderboard`, api()),
      ]);
      setSeason(s.data.season);
      setMatches(s.data.matches || []);
      setLeaderboard(lb.data.leaderboard || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const addMatch = async e => {
    e.preventDefault();
    setAddingMatch(true);
    try {
      await axios.post(`${API}/matches`, { ...matchForm, seasonId: id }, api());
      await load();
      setShowAddMatch(false);
      setMatchForm({ team1:'MI', team2:'CSK', matchDate:'', venue:'' });
    } catch(e) { alert(e.response?.data?.error || 'Failed to add match'); }
    finally { setAddingMatch(false); }
  };

  const fetchScores = async (matchId) => {
    setFetchingId(matchId);
    setFetchMsg('');
    try {
      const res = await axios.post(`${API}/matches/${matchId}/fetch-scores`, {}, api());
      setFetchMsg(`✅ Scores fetched! ${res.data.playersScored} players scored.`);
      await load();
    } catch(e) {
      setFetchMsg(`❌ ${e.response?.data?.error || 'Failed to fetch scores'}`);
    } finally { setFetchingId(null); }
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="spin" style={{ width:44, height:44, border:'3px solid var(--border2)', borderTopColor:'var(--gold)', borderRadius:'50%' }} />
    </div>
  );

  if (!season) return <div style={{ padding:40, textAlign:'center', color:'var(--text2)' }}>Season not found</div>;

  const isHost = season.host?._id === user?._id || season.host?.toString() === user?._id;
  const medals = ['🥇','🥈','🥉'];

  return (
    <div style={s.page}>
      <div style={s.bg} />

      {/* Header */}
      <header style={s.header}>
        <button onClick={() => nav('/fantasy')} className="btn btn-ghost btn-sm">← Fantasy</button>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:'var(--font-d)', fontSize:20, color:'var(--gold)' }}>{season.name}</div>
          <div style={{ fontSize:12, color:'var(--text2)' }}>
            Code: <strong style={{ letterSpacing:'.1em', color:'var(--gold)' }}>{season.code}</strong>
            · {season.members.length} members
          </div>
        </div>
        <div style={{ width:80 }} />
      </header>

      {/* How it works banner — shown to everyone */}
      <div style={s.howItWorks}>
        <span style={{ fontSize:16 }}>ℹ️</span>
        <span style={{ fontSize:13, color:'var(--text2)' }}>
          Your squad earns points <strong style={{ color:'var(--gold)' }}>automatically</strong> after every IPL match.
          Top 11 scorers from your squad count each match. Points accumulate all season!
        </span>
      </div>

      {/* Tabs */}
      <div style={s.tabRow}>
        {[['matches','📅 Matches'],['standings','🏆 Standings'],['members','👥 Members']].map(([id2,label]) => (
          <button key={id2} onClick={() => setTab(id2)}
            style={{ ...s.tab, ...(tab===id2?s.tabA:{}) }}>{label}</button>
        ))}
      </div>

      <main style={s.main}>

        {/* ── MATCHES TAB ── */}
        {tab === 'matches' && (
          <div>
            {/* Host: Add Match button */}
            {isHost && (
              <div style={{ marginBottom:16 }}>
                <button onClick={() => setShowAddMatch(v=>!v)} className="btn btn-gold btn-full">
                  {showAddMatch ? '✕ Cancel' : '+ Add IPL Match'}
                </button>

                {/* Add Match Form */}
                {showAddMatch && (
                  <div style={s.formCard}>
                    <h3 style={{ fontFamily:'var(--font-d)', fontSize:18, marginBottom:16 }}>Add Match</h3>
                    <form onSubmit={addMatch} style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        <div>
                          <label style={s.label}>Team 1</label>
                          <select className="input" value={matchForm.team1}
                            onChange={e => setMatchForm(f=>({...f,team1:e.target.value}))}>
                            {IPL_TEAMS.map(t => <option key={t} value={t}>{t} — {TEAM_FULL[t]}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={s.label}>Team 2</label>
                          <select className="input" value={matchForm.team2}
                            onChange={e => setMatchForm(f=>({...f,team2:e.target.value}))}>
                            {IPL_TEAMS.filter(t=>t!==matchForm.team1).map(t => <option key={t} value={t}>{t} — {TEAM_FULL[t]}</option>)}
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
                        <input className="input" placeholder="e.g. Wankhede Stadium, Mumbai"
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

            {fetchMsg && (
              <div style={{ padding:'10px 14px', borderRadius:10, background:'var(--bg3)', marginBottom:12, fontSize:13 }}>
                {fetchMsg}
              </div>
            )}

            {/* Match list */}
            {matches.length === 0 ? (
              <div style={s.empty}>
                <span style={{ fontSize:48 }}>📅</span>
                <p style={{ fontWeight:600 }}>No matches added yet</p>
                {isHost
                  ? <p style={{ fontSize:13, color:'var(--text3)' }}>Click "+ Add IPL Match" above before each match day</p>
                  : <p style={{ fontSize:13, color:'var(--text3)' }}>The season host will add matches before each IPL game</p>
                }
              </div>
            ) : (
              matches.map(m => (
                <div key={m._id} style={{ ...s.matchCard, ...(m.status==='completed'?s.matchDone:{}) }}>
                  {/* Match info */}
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

                  {/* Actions */}
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8 }}>
                    <StatusBadge status={m.status} />

                    {/* Host: Fetch scores after match */}
                    {isHost && m.status !== 'completed' && (
                      <button
                        onClick={() => fetchScores(m._id)}
                        disabled={fetchingId === m._id}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize:11 }}>
                        {fetchingId===m._id ? '⏳ Fetching…' : '📥 Fetch Scores'}
                      </button>
                    )}

                    {/* Everyone: view points if completed */}
                    {m.status === 'completed' && (
                      <button onClick={() => nav(`/fantasy/match/${m._id}/results`)}
                        className="btn btn-ghost btn-sm" style={{ fontSize:11 }}>
                        📊 View Points
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── STANDINGS TAB ── */}
        {tab === 'standings' && (
          <div>
            <h3 style={{ fontFamily:'var(--font-d)', fontSize:20, marginBottom:6 }}>Season Standings</h3>
            <p style={{ fontSize:13, color:'var(--text2)', marginBottom:16 }}>
              Total fantasy points accumulated across all {matches.filter(m=>m.status==='completed').length} completed matches
            </p>

            {leaderboard.length === 0 ? (
              <div style={s.empty}>
                <span style={{ fontSize:48 }}>📊</span>
                <p>No points yet</p>
                <p style={{ fontSize:13, color:'var(--text3)' }}>Standings will appear after the first match is scored</p>
              </div>
            ) : leaderboard.map((entry, i) => (
              <div key={entry.userId} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:i===0?'rgba(245,200,66,.08)':'var(--surface)', border:`1px solid ${i===0?'rgba(245,200,66,.35)':'var(--border)'}`, borderRadius:12, marginBottom:8 }}>
                <span style={{ fontSize:22, width:32, textAlign:'center' }}>{medals[i]||`#${i+1}`}</span>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:16 }}>
                  {entry.username[0].toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700 }}>{entry.username}</div>
                  <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>
                    {entry.squad?.length || 0} players in squad
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'var(--font-d)', fontSize:28, color:'var(--gold)', lineHeight:1 }}>{entry.totalPoints || 0}</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>points</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── MEMBERS TAB ── */}
        {tab === 'members' && (
          <div>
            <h3 style={{ fontFamily:'var(--font-d)', fontSize:20, marginBottom:6 }}>Members</h3>
            <p style={{ fontSize:13, color:'var(--text2)', marginBottom:16 }}>
              Share code <strong style={{ color:'var(--gold)', letterSpacing:'.1em' }}>{season.code}</strong> with friends to join
            </p>
            {season.members.map(m => (
              <div key={m.userId} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, marginBottom:8 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>
                  {m.username[0].toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600 }}>{m.username}</div>
                  <div style={{ fontSize:12, color:'var(--text2)' }}>
                    {m.userId === (season.host?._id || season.host?.toString()) ? '👑 Host · ' : ''}
                    {m.squad?.length > 0 ? `${m.squad.length} players in squad` : 'No squad yet'}
                  </div>
                </div>
                <div style={{ fontFamily:'var(--font-m)', color:'var(--gold)', fontWeight:700 }}>
                  {m.totalFantasyPoints || 0} pts
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
  const color = TEAM_COLOR[team] || '#555';
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:6, background:`${color}22`, border:`1px solid ${color}55`, fontWeight:700, fontSize:12, color }}>
      {team}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    upcoming: { icon:'⏰', color:'var(--gold)',  label:'UPCOMING' },
    live:     { icon:'🔴', color:'var(--red)',   label:'LIVE' },
    completed:{ icon:'✅', color:'var(--green)', label:'COMPLETED' },
  };
  const { icon, color, label } = map[status] || { icon:'❓', color:'var(--text3)', label:status };
  return <span style={{ fontSize:11, fontWeight:700, color }}>{icon} {label}</span>;
}

const s = {
  page:       { minHeight:'100vh', display:'flex', flexDirection:'column', position:'relative' },
  bg:         { position:'fixed', inset:0, background:'var(--bg)', zIndex:0 },
  header:     { position:'sticky', top:0, zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', borderBottom:'1px solid var(--border)', background:'rgba(10,10,15,.95)', backdropFilter:'blur(12px)' },
  howItWorks: { position:'relative', zIndex:1, display:'flex', alignItems:'center', gap:10, padding:'10px 20px', background:'rgba(245,200,66,.06)', borderBottom:'1px solid rgba(245,200,66,.15)' },
  tabRow:     { position:'relative', zIndex:1, display:'flex', borderBottom:'1px solid var(--border)', padding:'0 20px' },
  tab:        { padding:'10px 16px', border:'none', background:'transparent', color:'var(--text2)', cursor:'pointer', fontSize:14, fontWeight:600, borderBottom:'2px solid transparent', transition:'all .15s' },
  tabA:       { color:'var(--gold)', borderBottomColor:'var(--gold)' },
  main:       { position:'relative', zIndex:1, flex:1, padding:'20px', maxWidth:760, margin:'0 auto', width:'100%' },
  empty:      { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 0', gap:10, color:'var(--text2)', textAlign:'center' },
  formCard:   { background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:14, padding:'20px', marginTop:12 },
  label:      { fontSize:12, color:'var(--text2)', marginBottom:5, display:'block' },
  matchCard:  { display:'flex', alignItems:'flex-start', gap:14, padding:'16px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, marginBottom:10, transition:'all .15s' },
  matchDone:  { opacity:0.8 },
};
