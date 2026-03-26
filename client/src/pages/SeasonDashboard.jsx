import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'https://auction-app-m9xw.onrender.com/api';
const api  = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });

const TEAM_COLORS = {
  MI:'#004BA0', CSK:'#F5C842', RCB:'#EC1C24', KKR:'#3A225D',
  DC:'#0078BC', RR:'#FF69B4', PBKS:'#ED1B24', SRH:'#F7A721',
  GT:'#1C1C1C', LSG:'#A4262C',
};

export default function SeasonDashboard() {
  const { id }    = useParams();
  const nav       = useNavigate();
  const { user }  = useAuth();

  const [season,      setSeason]      = useState(null);
  const [matches,     setMatches]     = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [tab,         setTab]         = useState('matches');
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/seasons/${id}`, api()),
      axios.get(`${API}/seasons/${id}/leaderboard`, api()),
    ]).then(([s, lb]) => {
      setSeason(s.data.season);
      setMatches(s.data.matches || []);
      setLeaderboard(lb.data.leaderboard || []);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="spin" style={{ width:44, height:44, border:'3px solid var(--border2)', borderTopColor:'var(--gold)', borderRadius:'50%' }} />
    </div>
  );

  if (!season) return <div style={{ padding:40, textAlign:'center', color:'var(--text2)' }}>Season not found</div>;

  const isHost  = season.host?._id === user?._id || season.host === user?._id;
  const medals  = ['🥇','🥈','🥉'];

  return (
    <div style={s.page}>
      <div style={s.bg} />

      {/* Header */}
      <header style={s.header}>
        <button onClick={() => nav('/fantasy')} className="btn btn-ghost btn-sm">← Fantasy</button>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:'var(--font-d)', fontSize:20, color:'var(--gold)' }}>{season.name}</div>
          <div style={{ fontSize:12, color:'var(--text2)' }}>Code: <strong style={{ letterSpacing:'.12em' }}>{season.code}</strong> · {season.members.length} members</div>
        </div>
        <div style={{ width:80 }} />
      </header>

      {/* Tabs */}
      <div style={s.tabRow}>
        {[['matches','Matches'],['standings','Standings'],['members','Members']].map(([id2,label]) => (
          <button key={id2} onClick={() => setTab(id2)}
            style={{ ...s.tab, ...(tab===id2?s.tabA:{}) }}>{label}</button>
        ))}
      </div>

      <main style={s.main}>

        {/* ── MATCHES ── */}
        {tab === 'matches' && (
          <div>
            {isHost && (
              <div className="card" style={{ marginBottom:16, border:'1px solid rgba(245,200,66,.25)' }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:12, color:'var(--gold)' }}>👑 Host Controls</div>
                <div style={{ display:'flex', gap:8 }}>
                  {season.auctionRoomCode ? (
                    <button onClick={() => nav(`/room/${season.auctionRoomCode}`)} className="btn btn-outline" style={{ flex:1 }}>
                      🏏 Go to Auction Room
                    </button>
                  ) : (
                    <button onClick={() => nav(`/?linkSeason=${season._id}`)} className="btn btn-gold" style={{ flex:1 }}>
                      + Link Auction Room
                    </button>
                  )}
                </div>
              </div>
            )}

            <h3 style={{ fontFamily:'var(--font-d)', fontSize:20, marginBottom:12 }}>Matches</h3>

            {matches.length === 0 ? (
              <div style={s.empty}>
                <span style={{ fontSize:48 }}>📅</span>
                <p>No matches yet.</p>
                {isHost && <p style={{ fontSize:12, color:'var(--text3)' }}>Admin will add matches before each game.</p>}
              </div>
            ) : (
              matches.map(m => (
                <div key={m._id} style={s.matchCard}
                  onClick={() => m.status === 'upcoming' ? nav(`/fantasy/match/${m._id}?season=${season._id}`) : nav(`/fantasy/match/${m._id}/results`)}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                      <TeamChip team={m.team1} />
                      <span style={{ color:'var(--text3)', fontSize:12 }}>vs</span>
                      <TeamChip team={m.team2} />
                    </div>
                    <div style={{ fontSize:12, color:'var(--text2)' }}>{fmtDate(m.matchDate)}</div>
                    {m.result && <div style={{ fontSize:12, color:'var(--gold)', marginTop:4 }}>🏆 {m.result}</div>}
                  </div>
                  <div>
                    <StatusBadge status={m.status} />
                    <div style={{ fontSize:11, color:'var(--text3)', marginTop:4, textAlign:'right' }}>
                      {m.status==='upcoming' ? 'Pick Team →' : 'View Points →'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── STANDINGS ── */}
        {tab === 'standings' && (
          <div>
            <h3 style={{ fontFamily:'var(--font-d)', fontSize:20, marginBottom:16 }}>Season Standings</h3>
            {leaderboard.map((entry, i) => (
              <div key={entry.userId} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background: i===0?'rgba(245,200,66,.08)':'var(--surface)', border:`1px solid ${i===0?'rgba(245,200,66,.35)':'var(--border)'}`, borderRadius:12, marginBottom:8 }}>
                <span style={{ fontSize:22, width:32, textAlign:'center' }}>{medals[i]||`#${i+1}`}</span>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>
                  {entry.username[0].toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700 }}>{entry.username}</div>
                  <div style={{ fontSize:12, color:'var(--text2)' }}>{entry.squad?.length || 0} players in squad</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'var(--font-d)', fontSize:24, color:'var(--gold)' }}>{entry.totalPoints}</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>pts</div>
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <div style={s.empty}>
                <span style={{ fontSize:48 }}>📊</span>
                <p>No points yet. Points update after each match.</p>
              </div>
            )}
          </div>
        )}

        {/* ── MEMBERS ── */}
        {tab === 'members' && (
          <div>
            <h3 style={{ fontFamily:'var(--font-d)', fontSize:20, marginBottom:16 }}>Members ({season.members.length})</h3>
            {season.members.map((m, i) => (
              <div key={m.userId} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, marginBottom:8 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>
                  {m.username[0].toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600 }}>{m.username}</div>
                  <div style={{ fontSize:12, color:'var(--text2)' }}>
                    {m.userId === (season.host?._id || season.host) ? '👑 Host' : 'Member'}
                    {m.squad?.length > 0 && ` · ${m.squad.length} players`}
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
  const color = TEAM_COLORS[team] || '#555';
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:6, background:`${color}22`, border:`1px solid ${color}44`, fontWeight:700, fontSize:12, color }}>
      {team}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = { upcoming:['⏰','var(--gold)'], live:['🔴','var(--red)'], completed:['✅','var(--green)'] };
  const [icon, color] = map[status] || ['❓','var(--text3)'];
  return <span style={{ fontSize:11, fontWeight:700, color }}>{icon} {status.toUpperCase()}</span>;
}

const s = {
  page:      { minHeight:'100vh', display:'flex', flexDirection:'column', position:'relative' },
  bg:        { position:'fixed', inset:0, background:'var(--bg)', zIndex:0 },
  header:    { position:'sticky', top:0, zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid var(--border)', background:'rgba(10,10,15,.95)', backdropFilter:'blur(12px)' },
  tabRow:    { position:'relative', zIndex:1, display:'flex', borderBottom:'1px solid var(--border)', padding:'0 16px' },
  tab:       { padding:'10px 16px', border:'none', background:'transparent', color:'var(--text2)', cursor:'pointer', fontSize:14, fontWeight:600, borderBottom:'2px solid transparent' },
  tabA:      { color:'var(--gold)', borderBottomColor:'var(--gold)' },
  main:      { position:'relative', zIndex:1, flex:1, padding:'20px 16px', maxWidth:720, margin:'0 auto', width:'100%' },
  empty:     { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 0', gap:12, color:'var(--text2)', textAlign:'center' },
  matchCard: { display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, cursor:'pointer', marginBottom:10 },
};
