import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../App';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'https://auction-app-m9xw.onrender.com/api';
const api  = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const ROLE_COLOR = { BAT:'#f5c842', BOWL:'#3b82f6', AR:'#2ecc71', WK:'#e05a2b' };
const ROLE_LABEL = { BAT:'Batsman', BOWL:'Bowler', AR:'All-Rounder', WK:'Keeper' };
const TEAM_COLORS = {
  MI:'#004BA0', CSK:'#F5C842', RCB:'#EC1C24', KKR:'#3A225D',
  DC:'#0078BC', RR:'#FF69B4', PBKS:'#ED1B24', SRH:'#F7A721',
  GT:'#1C1C1C', LSG:'#A4262C',
};

export default function MatchSelectionPage() {
  const { matchId }       = useParams();
  const [sp]              = useSearchParams();
  const seasonId          = sp.get('season');
  const nav               = useNavigate();
  const { user }          = useAuth();

  const [match,     setMatch]     = useState(null);
  const [players,   setPlayers]   = useState([]);
  const [selected,  setSelected]  = useState([]); // array of player names
  const [captain,   setCaptain]   = useState('');
  const [vc,        setVc]        = useState('');
  const [existing,  setExisting]  = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [filter,    setFilter]    = useState('ALL');
  const [err,       setErr]       = useState('');
  const [tab,       setTab]       = useState('select'); // select | preview

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/seasons/players/match/${matchId}`, api()),
      axios.get(`${API}/fantasy/my-selection/${matchId}?seasonId=${seasonId||''}`, api()),
    ]).then(([p, sel]) => {
      setMatch(p.data.match);
      setPlayers(p.data.players || []);
      if (sel.data.selection) {
        const s = sel.data.selection;
        setExisting(s);
        setSelected(s.playing11 || []);
        setCaptain(s.captain || '');
        setVc(s.viceCaptain || '');
      }
    }).catch(console.error);
  }, [matchId, seasonId]);

  const toggle = (name) => {
    if (selected.includes(name)) {
      setSelected(s => s.filter(n => n !== name));
      if (captain === name)    setCaptain('');
      if (vc      === name)    setVc('');
    } else {
      if (selected.length >= 11) return;
      setSelected(s => [...s, name]);
    }
  };

  const setCap = (name) => {
    if (!selected.includes(name)) return;
    if (vc === name) setVc('');
    setCaptain(name);
  };

  const setVcap = (name) => {
    if (!selected.includes(name)) return;
    if (captain === name) setCaptain('');
    setVc(name);
  };

  const save = async () => {
    if (selected.length !== 11) return setErr('Select exactly 11 players');
    if (!captain || !vc)        return setErr('Select captain and vice-captain');
    setSaving(true); setErr('');
    try {
      await axios.post(`${API}/fantasy/select`, {
        matchId, seasonId: seasonId || undefined,
        playing11: selected, captain, viceCaptain: vc,
      }, api());
      setSaved(true);
      setTimeout(() => nav('/fantasy'), 1500);
    } catch(e) { setErr(e.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  if (!match) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="spin" style={{ width:44, height:44, border:'3px solid var(--border2)', borderTopColor:'var(--gold)', borderRadius:'50%' }} />
    </div>
  );

  const filtered = filter === 'ALL' ? players : players.filter(p => p.role === filter || p.team === filter);
  const locked   = match.status !== 'upcoming';

  const roleCount = (role) => selected.filter(n => players.find(p=>p.name===n)?.role===role).length;

  return (
    <div style={s.page}>
      <div style={s.bg} />

      {/* Header */}
      <header style={s.header}>
        <button onClick={() => nav('/fantasy')} className="btn btn-ghost btn-sm">← Back</button>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:'var(--font-d)', fontSize:18, color:'var(--gold)' }}>
            {match.team1} vs {match.team2}
          </div>
          <div style={{ fontSize:12, color:'var(--text2)' }}>
            {new Date(match.matchDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontFamily:'var(--font-d)', fontSize:20, color: selected.length===11?'var(--green)':'var(--gold)' }}>
            {selected.length}/11
          </span>
        </div>
      </header>

      {/* Tabs */}
      <div style={s.tabRow}>
        {[['select','Select Team'],['preview','Preview']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ ...s.tab, ...(tab===id?s.tabA:{}) }}>{label}</button>
        ))}
      </div>

      {/* Role breakdown */}
      <div style={s.roleBar}>
        {[['WK','Keeper'],['BAT','Bat'],['AR','AR'],['BOWL','Bowl']].map(([role,label]) => (
          <div key={role} style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'var(--font-d)', fontSize:18, color:ROLE_COLOR[role] }}>{roleCount(role)}</div>
            <div style={{ fontSize:10, color:'var(--text3)' }}>{label}</div>
          </div>
        ))}
      </div>

      {tab === 'select' && (
        <>
          {/* Filter bar */}
          <div style={s.filterBar}>
            {['ALL', match.team1, match.team2, 'WK','BAT','AR','BOWL'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ ...s.filterBtn, ...(filter===f?{ background:TEAM_COLORS[f]||'var(--gold)', color:'#fff', borderColor:'transparent' }:{}) }}>
                {f}
              </button>
            ))}
          </div>

          {/* Player list */}
          <div style={s.playerList}>
            {filtered.map(p => {
              const isSelected = selected.includes(p.name);
              const isCap      = captain === p.name;
              const isVc       = vc === p.name;
              const rc         = ROLE_COLOR[p.role] || '#999';
              const tc         = TEAM_COLORS[p.team] || '#555';

              return (
                <div key={p.name} style={{ ...s.playerCard, ...(isSelected?{ border:`1px solid ${rc}60`, background:`${rc}08` }:{}) }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:`${rc}20`, color:rc, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, flexShrink:0, border:`1px solid ${rc}40` }}>
                      {p.image || p.name[0]}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
                      <div style={{ display:'flex', gap:6, marginTop:3 }}>
                        <span style={{ fontSize:10, padding:'1px 6px', borderRadius:100, background:`${rc}20`, color:rc, fontWeight:700 }}>{ROLE_LABEL[p.role]}</span>
                        <span style={{ fontSize:10, padding:'1px 6px', borderRadius:100, background:`${tc}20`, color:tc, fontWeight:700 }}>{p.team}</span>
                      </div>
                    </div>
                  </div>

                  {/* C / VC buttons */}
                  {isSelected && (
                    <div style={{ display:'flex', gap:4 }}>
                      <button onClick={() => setCap(p.name)}
                        style={{ width:28, height:28, borderRadius:6, border:`1px solid ${isCap?'var(--gold)':'var(--border2)'}`, background:isCap?'var(--gold)':'transparent', color:isCap?'#000':'var(--text2)', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                        C
                      </button>
                      <button onClick={() => setVcap(p.name)}
                        style={{ width:28, height:28, borderRadius:6, border:`1px solid ${isVc?'#3b82f6':'var(--border2)'}`, background:isVc?'#3b82f6':'transparent', color:isVc?'#fff':'var(--text2)', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                        VC
                      </button>
                    </div>
                  )}

                  {/* Select button */}
                  <button onClick={() => !locked && toggle(p.name)} disabled={locked}
                    style={{ width:32, height:32, borderRadius:8, border:`1px solid ${isSelected?rc:'var(--border2)'}`, background:isSelected?rc:'transparent', color:isSelected?'#fff':'var(--text2)', fontSize:18, cursor:locked?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}>
                    {isSelected ? '✓' : '+'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'preview' && (
        <div style={{ padding:'16px', maxWidth:600, margin:'0 auto' }}>
          <h3 style={{ fontFamily:'var(--font-d)', fontSize:20, marginBottom:16 }}>Your Playing 11</h3>
          {selected.length === 0 ? (
            <p style={{ color:'var(--text2)', textAlign:'center', padding:'40px 0' }}>No players selected yet</p>
          ) : (
            selected.map(name => {
              const p   = players.find(p=>p.name===name);
              const isCap = captain === name;
              const isVc  = vc === name;
              const rc  = ROLE_COLOR[p?.role] || '#999';
              return (
                <div key={name} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--bg3)', borderRadius:10, marginBottom:8, border:`1px solid ${rc}30` }}>
                  {isCap && <span style={{ fontSize:11, background:'var(--gold)', color:'#000', padding:'2px 6px', borderRadius:4, fontWeight:700 }}>C</span>}
                  {isVc  && <span style={{ fontSize:11, background:'#3b82f6', color:'#fff', padding:'2px 6px', borderRadius:4, fontWeight:700 }}>VC</span>}
                  {!isCap && !isVc && <span style={{ width:30 }} />}
                  <span style={{ flex:1, fontWeight:600, fontSize:13 }}>{name}</span>
                  <span style={{ fontSize:11, color:rc }}>{ROLE_LABEL[p?.role]}</span>
                  <span style={{ fontSize:11, color:'var(--text3)' }}>{p?.team}</span>
                  {isCap && <span style={{ fontSize:11, color:'var(--gold)' }}>2×</span>}
                  {isVc  && <span style={{ fontSize:11, color:'#3b82f6' }}>1.5×</span>}
                </div>
              );
            })
          )}
          <div style={{ padding:'12px', background:'var(--bg3)', borderRadius:10, marginTop:8, fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>
            💡 <strong>Top 11 scorers</strong> from your squad count. Captain gets <strong style={{ color:'var(--gold)' }}>2×</strong> points, Vice-Captain gets <strong style={{ color:'#3b82f6' }}>1.5×</strong> points.
          </div>
        </div>
      )}

      {/* Bottom bar */}
      {!locked && (
        <div style={s.bottomBar}>
          {err && <p style={{ color:'var(--red)', fontSize:13, textAlign:'center', margin:0 }}>{err}</p>}
          {saved ? (
            <div style={{ textAlign:'center', color:'var(--green)', fontWeight:700 }}>✅ Team saved! Redirecting…</div>
          ) : (
            <button onClick={save} disabled={saving || selected.length!==11 || !captain || !vc}
              className="btn btn-gold btn-full btn-lg">
              {saving ? '⏳ Saving…' : `Save Team (${selected.length}/11)`}
            </button>
          )}
        </div>
      )}

      {locked && (
        <div style={{ ...s.bottomBar, background:'rgba(231,76,60,.1)', border:'none' }}>
          <p style={{ textAlign:'center', color:'var(--red)', fontWeight:600, margin:0 }}>🔒 Match started — team is locked</p>
        </div>
      )}
    </div>
  );
}

const s = {
  page:       { minHeight:'100vh', display:'flex', flexDirection:'column', position:'relative', paddingBottom:80 },
  bg:         { position:'fixed', inset:0, background:'var(--bg)', zIndex:0 },
  header:     { position:'sticky', top:0, zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid var(--border)', background:'rgba(10,10,15,.95)', backdropFilter:'blur(12px)' },
  tabRow:     { position:'relative', zIndex:1, display:'flex', borderBottom:'1px solid var(--border)', padding:'0 16px' },
  tab:        { padding:'10px 16px', border:'none', background:'transparent', color:'var(--text2)', cursor:'pointer', fontSize:14, fontWeight:600, borderBottom:'2px solid transparent' },
  tabA:       { color:'var(--gold)', borderBottomColor:'var(--gold)' },
  roleBar:    { position:'relative', zIndex:1, display:'flex', justifyContent:'space-around', padding:'10px 16px', background:'var(--surface)', borderBottom:'1px solid var(--border)' },
  filterBar:  { position:'relative', zIndex:1, display:'flex', gap:6, padding:'10px 16px', overflowX:'auto' },
  filterBtn:  { padding:'5px 12px', border:'1px solid var(--border2)', borderRadius:100, background:'transparent', color:'var(--text2)', cursor:'pointer', fontSize:12, fontWeight:600, whiteSpace:'nowrap', transition:'all .15s' },
  playerList: { position:'relative', zIndex:1, display:'flex', flexDirection:'column', gap:8, padding:'12px 16px' },
  playerCard: { display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, transition:'all .15s' },
  bottomBar:  { position:'fixed', bottom:0, left:0, right:0, padding:'12px 16px', background:'var(--surface)', borderTop:'1px solid var(--border)', zIndex:10, display:'flex', flexDirection:'column', gap:6 },
};
