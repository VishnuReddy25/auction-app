import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { getRoom, connectSocket, getSocket } from '../services';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtL = v => {
  if (!v && v !== 0) return '—';
  if (v >= 100) return `₹${(v/100).toFixed(1)}Cr`;
  return `₹${v}L`;
};

const roleColor = { Batsman:'#f5c842', Bowler:'#3b82f6', 'All-Rounder':'#2ecc71', 'Wicket-Keeper':'#e05a2b' };

// ── Countdown ring ────────────────────────────────────────────────────────────
function TimerRing({ left, total }) {
  const pct    = Math.max(0, left / total);
  const urgent = left <= 5;
  const color  = urgent ? '#e74c3c' : left <= 10 ? '#f5c842' : '#2ecc71';
  const r = 42, c = 2 * Math.PI * r;
  return (
    <div style={{ position:'relative', width:100, height:100, flexShrink:0 }}>
      <svg width="100" height="100" style={{ transform:'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="6" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round" style={{ transition:'stroke-dashoffset .9s linear, stroke .3s' }} />
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontFamily:'var(--font-d)', fontSize:30, color, lineHeight:1 }}>{left}</span>
        <span style={{ fontSize:10, color:'var(--text3)', letterSpacing:'.08em' }}>SEC</span>
      </div>
    </div>
  );
}

// ── Player card ───────────────────────────────────────────────────────────────
function PlayerCard({ item, currentBid, currentBidder }) {
  if (!item) return null;
  const rc = roleColor[item.role] || '#9898b0';
  return (
    <div style={{ ...ps.card, '--rc': rc }}>
      <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse at 50% 0%, ${rc}15, transparent 60%)`, pointerEvents:'none', borderRadius:16 }} />
      <div style={ps.top}>
        {/* Avatar */}
        <div style={{ ...ps.avatar, background:`${rc}22`, color:rc, border:`2px solid ${rc}40` }}>
          {item.image || item.name?.[0]}
        </div>
        <div style={ps.info}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <h2 style={ps.name}>{item.name}</h2>
            <span style={{ ...ps.roleBadge, background:`${rc}22`, color:rc, border:`1px solid ${rc}40` }}>{item.role}</span>
          </div>
          <div style={ps.teamTxt}>🏳️ {item.team}</div>
          <div style={{ fontSize:13, color:'var(--text2)', marginTop:4 }}>Base: <strong style={{ color:'var(--gold)' }}>{fmtL(item.basePrice)}</strong></div>
        </div>
      </div>

      <div style={ps.divider} />

      {/* Stats */}
      <div style={ps.stats}>
        {item.stats?.runs   > 0 && <Stat icon="🏏" label="Runs"  val={item.stats.runs} />}
        {item.stats?.avg    > 0 && <Stat icon="📊" label="Avg"   val={item.stats.avg} />}
        {item.stats?.sr     > 0 && <Stat icon="⚡" label="SR"    val={item.stats.sr} />}
        {item.stats?.wkts   > 0 && <Stat icon="🎯" label="Wkts"  val={item.stats.wkts} />}
        {item.stats?.eco    > 0 && <Stat icon="💰" label="Eco"   val={item.stats.eco} />}
      </div>

      {/* Recent form */}
      {item.stats?.form && (
        <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:12 }}>
          <span style={{ fontSize:12, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em' }}>Form</span>
          <div style={{ display:'flex', gap:5 }}>
            {item.stats.form.split('').map((ch, i) => (
              <span key={i} style={{ width:22, height:22, borderRadius:5, background: ch==='W'?'var(--green)':'var(--red)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff' }}>{ch}</span>
            ))}
          </div>
        </div>
      )}

      <div style={ps.divider} />

      {/* Current bid */}
      <div style={ps.bidRow}>
        {currentBid > 0 ? (
          <>
            <div>
              <div style={ps.bidLabel}>CURRENT BID</div>
              <div style={ps.bidAmt}>{fmtL(currentBid)}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={ps.bidLabel}>LEADING BIDDER</div>
              <div style={{ fontWeight:700, fontSize:20, color:'var(--text)' }}>{currentBidder}</div>
            </div>
          </>
        ) : (
          <div style={{ textAlign:'center', width:'100%' }}>
            <div style={ps.bidLabel}>OPENING BID</div>
            <div style={ps.bidAmt}>{fmtL(item.basePrice)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, val }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', background:'var(--bg3)', borderRadius:10, padding:'8px 6px', gap:2, minWidth:60 }}>
      <span style={{ fontSize:14 }}>{icon}</span>
      <span style={{ fontFamily:'var(--font-m)', fontSize:14, fontWeight:600 }}>{val}</span>
      <span style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.05em' }}>{label}</span>
    </div>
  );
}

const ps = {
  card:      { background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:16, padding:22, position:'relative', overflow:'hidden' },
  top:       { display:'flex', gap:16, alignItems:'flex-start' },
  avatar:    { width:72, height:72, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-d)', fontSize:28, letterSpacing:'.05em', flexShrink:0 },
  info:      { flex:1 },
  name:      { fontFamily:'var(--font-d)', fontSize:26, letterSpacing:'.02em', lineHeight:1.1 },
  roleBadge: { fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:100, letterSpacing:'.05em', textTransform:'uppercase' },
  teamTxt:   { color:'var(--text2)', fontSize:13, marginTop:3 },
  divider:   { height:1, background:'var(--border)', margin:'14px 0' },
  stats:     { display:'flex', gap:8, flexWrap:'wrap' },
  bidRow:    { display:'flex', justifyContent:'space-between', alignItems:'center' },
  bidLabel:  { fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:3 },
  bidAmt:    { fontFamily:'var(--font-d)', fontSize:38, color:'var(--gold)', lineHeight:1 },
};

// ── Bid panel ─────────────────────────────────────────────────────────────────
function BidPanel({ state, myId, onBid, onSuggest, suggestion, error }) {
  const me      = state?.players?.find(p => p.id === myId);
  const minBid  = state?.currentBid > 0
    ? state.currentBid + (state.settings?.minIncrement || 5)
    : (state?.items?.[state?.currentIndex]?.basePrice || 20);
  const [amount, setAmount] = useState(minBid);

  useEffect(() => setAmount(a => Math.max(a, minBid)), [minBid]);

  if (!me || me.isHost) return null;

  const inc  = state?.settings?.minIncrement || 5;
  const canBid = state?.phase === 'bidding' && amount >= minBid && amount <= me.budget && me.id !== state?.currentBidderId;

  const quick = [minBid, minBid+inc, minBid+inc*2, minBid+inc*5].filter(v => v <= me.budget);

  return (
    <div style={bp.wrap}>
      {/* Budget */}
      <div style={bp.budgetRow}>
        <span style={bp.budgetLabel}>Your Budget</span>
        <span style={bp.budgetVal}>{fmtL(me.budget)}</span>
      </div>

      {/* You're winning indicator */}
      {state?.currentBidderId === me.id && (
        <div style={bp.winning}>🏆 You have the highest bid! Hold on…</div>
      )}

      {/* Suggestion */}
      {suggestion && (
        <div style={bp.sugg}>
          <span style={{ fontSize:18 }}>🤖</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600, color:'var(--gold)', fontSize:14 }}>Suggested: {fmtL(suggestion.amount)}</div>
            <div style={{ fontSize:12, color:'var(--text2)' }}>{suggestion.reason}</div>
          </div>
          <button onClick={() => setAmount(suggestion.amount)} className="btn btn-ghost btn-sm">Use</button>
        </div>
      )}

      {/* Quick bids */}
      {quick.length > 0 && (
        <div style={bp.quick}>
          {quick.map(v => (
            <button key={v} onClick={() => setAmount(v)}
              style={{ ...bp.qBtn, ...(amount===v ? bp.qBtnA : {}) }}>{fmtL(v)}</button>
          ))}
        </div>
      )}

      {/* Amount stepper */}
      <div style={bp.stepper}>
        <button onClick={() => setAmount(a => Math.max(minBid, a-inc))} style={bp.stepBtn} disabled={amount <= minBid}>−</button>
        <div style={bp.amtBox}>
          <span style={bp.amtVal}>{fmtL(amount)}</span>
          <span style={bp.amtSub}>{amount} Lakhs</span>
        </div>
        <button onClick={() => setAmount(a => Math.min(me.budget, a+inc))} style={bp.stepBtn} disabled={amount >= me.budget}>+</button>
      </div>

      <div style={{ fontSize:12, color:'var(--text3)', textAlign:'center' }}>
        Min: {fmtL(minBid)} · Increment: {fmtL(inc)}
      </div>

      {error && <div style={bp.err}>⚠ {error}</div>}

      {/* Bid button */}
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => onBid(amount)} disabled={!canBid} className="btn btn-gold" style={{ flex:1, padding:'16px', fontSize:16 }}>
          🔨 BID {fmtL(amount)}
        </button>
        <button onClick={onSuggest} className="btn btn-ghost btn-sm" title="AI Suggestion">🤖</button>
      </div>

      {!canBid && state?.currentBidderId !== me.id && state?.phase === 'bidding' && (
        <p style={{ textAlign:'center', fontSize:13, color:'var(--text3)' }}>Increase bid to place a higher offer</p>
      )}
    </div>
  );
}

const bp = {
  wrap:       { display:'flex', flexDirection:'column', gap:10 },
  budgetRow:  { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'var(--bg3)', borderRadius:10 },
  budgetLabel:{ fontSize:12, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.08em' },
  budgetVal:  { fontFamily:'var(--font-m)', fontSize:18, color:'var(--gold)', fontWeight:600 },
  winning:    { padding:'10px 14px', background:'rgba(46,204,113,.1)', border:'1px solid rgba(46,204,113,.3)', borderRadius:10, color:'var(--green)', fontSize:14, fontWeight:600, textAlign:'center' },
  sugg:       { display:'flex', alignItems:'flex-start', gap:10, padding:12, background:'rgba(245,200,66,.06)', border:'1px solid rgba(245,200,66,.2)', borderRadius:10 },
  quick:      { display:'flex', gap:8, flexWrap:'wrap' },
  qBtn:       { flex:'1 1 calc(50% - 4px)', padding:'8px 0', background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, color:'var(--text2)', cursor:'pointer', fontFamily:'var(--font-m)', fontSize:13, fontWeight:600, transition:'all 150ms' },
  qBtnA:      { border:'1px solid var(--gold)', color:'var(--gold)', background:'var(--gold-dim)' },
  stepper:    { display:'flex', gap:8, alignItems:'center' },
  stepBtn:    { width:46, height:54, background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, color:'var(--text)', cursor:'pointer', fontSize:22, fontFamily:'var(--font-b)' },
  amtBox:     { flex:1, display:'flex', flexDirection:'column', alignItems:'center', background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, padding:'8px 12px' },
  amtVal:     { fontFamily:'var(--font-d)', fontSize:28, color:'var(--gold)' },
  amtSub:     { fontSize:11, color:'var(--text3)', marginTop:2 },
  err:        { padding:'8px 12px', background:'rgba(231,76,60,.1)', border:'1px solid rgba(231,76,60,.3)', borderRadius:8, color:'var(--red)', fontSize:13 },
};

// ── Sold/Unsold overlay ───────────────────────────────────────────────────────
function ResultOverlay({ result, isHost, onNext }) {
  if (!result) return null;
  const sold = result.type === 'sold';
  return (
    <div style={ov.backdrop}>
      <div style={ov.modal} className="pop-in">
        <div style={{ ...ov.banner, background: sold ? 'linear-gradient(135deg,#f5c842,#e8a020)' : 'linear-gradient(135deg,#555,#333)' }}>
          <span style={{ fontSize:48 }}>{sold ? '🔨' : '❌'}</span>
          <div>
            <div style={{ fontFamily:'var(--font-d)', fontSize:40, color:'#0a0a0f', letterSpacing:'.04em', lineHeight:1 }}>{sold?'SOLD!':'UNSOLD'}</div>
            <div style={{ fontSize:16, color: sold?'rgba(0,0,0,.7)':'rgba(255,255,255,.7)', fontWeight:600 }}>{result.item?.name}</div>
          </div>
        </div>
        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:12 }}>
          {sold && (
            <>
              <Row label="Winner"      val={result.winner} />
              <Row label="Final Price" val={fmtL(result.price)} gold />
              <Row label="Total Bids"  val={`${result.bids} bids placed`} />
            </>
          )}
          {!sold && <p style={{ color:'var(--text2)', textAlign:'center' }}>No bids — {result.item?.name} goes unsold</p>}
          {isHost && <button onClick={onNext} className="btn btn-gold btn-full btn-lg" style={{ marginTop:8 }}>Next Player →</button>}
          {!isHost && <p style={{ textAlign:'center', color:'var(--text3)', fontSize:13 }}>Waiting for host…</p>}
        </div>
      </div>
    </div>
  );
}

function Row({ label, val, gold }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:13, color:'var(--text2)' }}>{label}</span>
      <span style={{ fontWeight:700, fontSize:16, color: gold ? 'var(--gold)' : 'var(--text)' }}>{val}</span>
    </div>
  );
}

const ov = {
  backdrop:{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(8px)' },
  modal:   { background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:20, width:'100%', maxWidth:420, overflow:'hidden' },
  banner:  { display:'flex', alignItems:'center', gap:16, padding:'22px 24px' },
};

// ── Leaderboard ───────────────────────────────────────────────────────────────
function Leaderboard({ leaderboard, state, onClose, onLobby }) {
  const medals = ['🥇','🥈','🥉'];
  return (
    <div style={ov.backdrop}>
      <div style={{ ...ov.modal, maxWidth:520, maxHeight:'90vh', overflowY:'auto' }} className="pop-in">
        <div style={{ padding:'28px 24px 16px', textAlign:'center', background:'linear-gradient(135deg,rgba(245,200,66,.12),transparent)' }}>
          <div style={{ fontSize:56 }}>🏆</div>
          <h2 style={{ fontFamily:'var(--font-d)', fontSize:40, color:'var(--gold)', letterSpacing:'.05em' }}>AUCTION COMPLETE</h2>
        </div>
        <div style={{ padding:'0 16px', display:'flex', flexDirection:'column', gap:10 }}>
          {leaderboard.map((e, i) => (
            <div key={e.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background: i===0?'rgba(245,200,66,.06)':'var(--bg3)', border:`1px solid ${i===0?'rgba(245,200,66,.3)':'var(--border)'}`, borderRadius:12 }}>
              <span style={{ fontSize:22, width:32, textAlign:'center' }}>{medals[i]||`#${i+1}`}</span>
              <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>{e.username[0].toUpperCase()}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700 }}>{e.username}</div>
                <div style={{ fontSize:12, color:'var(--text2)' }}>{e.teamCount} player{e.teamCount!==1?'s':''} won · Spent {fmtL(e.spent)}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:'var(--font-m)', color:'var(--gold)', fontWeight:700 }}>{fmtL(e.budget)}</div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>remaining</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding:'16px 16px 24px', display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={onClose} className="btn btn-gold btn-full btn-lg">
            📊 View Full Team Stats
          </button>
          <button onClick={onLobby} className="btn btn-ghost btn-full">
            🏠 Back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main AuctionPage ──────────────────────────────────────────────────────────
export default function AuctionPage() {
  const { code } = useParams();
  const { user } = useAuth();
  const nav      = useNavigate();

  const [state,       setState]       = useState(null);
  const [timer,       setTimer]       = useState(0);
  const [timerTotal,  setTimerTotal]  = useState(30);
  const [result,      setResult]      = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [chat,        setChat]        = useState([]);
  const [msg,         setMsg]         = useState('');
  const [bidErr,      setBidErr]      = useState('');
  const [suggestion,  setSuggestion]  = useState(null);
  const [paused,      setPaused]      = useState(false);
  const [joined,      setJoined]      = useState(false);
  const chatRef = useRef(null);

  const myId   = user?._id;
  const me     = state?.players?.find(p => p.id === myId);
  const isHost = me?.isHost || false;
  const currentItem = state?.items?.[state?.currentIndex];

  useEffect(() => {
    if (!user) return;
    const s = connectSocket();

    s.emit('room:join', { roomCode: code.toUpperCase(), userId: user._id, username: user.username }, res => {
      if (res?.ok) { setState(res.state); setTimerTotal(res.state?.settings?.timerSeconds || 30); setJoined(true); }
    });

    s.on('room:joined',    ({ state: st }) => { setState(st); setTimerTotal(st.settings?.timerSeconds||30); setJoined(true); });
    s.on('room:updated',   ({ state: st }) => setState(st));
    s.on('auction:started',({ state: st, item }) => { setState(st); setResult(null); setPaused(false); setTimerTotal(st.settings?.timerSeconds||30); });
    s.on('bid:new',        ({ state: st }) => { setState(st); setBidErr(''); setSuggestion(null); });
    s.on('timer',          ({ left }) => setTimer(left));
    s.on('round:closed',   ({ result: r, state: st }) => { setState(st); setResult(r); setPaused(false); });
    s.on('item:next',      ({ state: st }) => { setState(st); setResult(null); setPaused(false); setTimer(st.settings?.timerSeconds||30); });
    s.on('auction:paused', () => setPaused(true));
    s.on('auction:resumed',({ state: st }) => { setState(st); setPaused(false); });
    s.on('auction:complete',({ leaderboard: lb }) => { setLeaderboard(lb); setResult(null); });
    s.on('chat:msg',       m => setChat(c => [...c.slice(-99), m]));

    return () => {
      ['room:joined','room:updated','auction:started','bid:new','timer','round:closed',
       'item:next','auction:paused','auction:resumed','auction:complete','chat:msg'].forEach(e => s.off(e));
    };
  }, [code, user]);

  useEffect(() => { chatRef.current?.scrollIntoView({ behavior:'smooth' }); }, [chat]);

  const placeBid = useCallback(amount => {
    setBidErr('');
    getSocket().emit('bid:place', { amount }, res => {
      if (!res?.ok) setBidErr(res?.error || 'Bid failed');
    });
  }, []);

  const getSuggestion = useCallback(() => {
    getSocket().emit('bid:suggest', {}, res => setSuggestion(res?.suggestion || null));
  }, []);

  const sendChat = e => {
    e.preventDefault();
    if (!msg.trim()) return;
    getSocket().emit('chat:send', { message: msg.trim() });
    setMsg('');
  };

  const hostSold   = () => getSocket().emit('host:sold',   {});
  const hostUnsold = () => getSocket().emit('host:unsold', {});
  const hostNext   = () => getSocket().emit('host:next',   {});
  const hostPause  = () => getSocket().emit('host:pause',  {});
  const hostResume = () => getSocket().emit('host:resume', {});

  if (!joined) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div className="spin" style={{ width:44, height:44, border:'3px solid var(--border2)', borderTopColor:'var(--gold)', borderRadius:'50%' }} />
      <p style={{ color:'var(--text2)' }}>Connecting to auction…</p>
    </div>
  );

  const bidders = state?.players?.filter(p => !p.isHost) || [];
  const itemIdx = state?.currentIndex || 0;
  const total   = state?.items?.length || 18;

  return (
    <div style={as.page}>
      <div style={as.bg} />

      {/* Header */}
      <header style={as.header}>
        <div style={as.headerL}>
          <span style={{ fontSize:18 }}>🏏</span>
          <span style={as.code}>{code}</span>
          <div style={{ width:7, height:7, borderRadius:'50%', background: joined ? 'var(--green)' : 'var(--red)' }} />
        </div>

        {/* Progress bar */}
        <div style={as.progress}>
          <span style={{ fontSize:12, color:'var(--text2)' }}>Player {itemIdx+1} of {total}</span>
          <div style={as.pBar}><div style={{ ...as.pFill, width:`${(itemIdx/Math.max(total,1))*100}%` }} /></div>
        </div>

        <div style={{ display:'flex', gap:8 }}>
          {isHost && state?.phase === 'bidding' && !paused && (
            <button onClick={hostPause} className="btn btn-ghost btn-sm">⏸</button>
          )}
          {isHost && paused && (
            <button onClick={hostResume} className="btn btn-gold btn-sm">▶ Resume</button>
          )}
          <span style={{ fontSize:11, color:'var(--text3)', letterSpacing:'.1em', textTransform:'uppercase', alignSelf:'center' }}>{paused?'PAUSED':state?.phase?.toUpperCase()}</span>
        </div>
      </header>

      {/* Main 3-col */}
      <div style={as.main}>
        {/* ── Left: Team lists ── */}
        <aside style={as.aside}>
          <div className="card" style={{ height:'100%', overflow:'auto' }}>
            <h3 style={{ fontFamily:'var(--font-d)', fontSize:20, marginBottom:12 }}>Teams</h3>
            {bidders.map(p => {
              const pct = (p.budget / (state?.settings?.startingBudget||1000)) * 100;
              const isLeading = p.id === state?.currentBidderId;
              return (
                <div key={p.id} style={{ ...as.teamRow, ...(isLeading?as.teamRowLead:{}) }}>
                  {isLeading && <div style={as.leadDot} />}
                  <div style={{ width:32, height:32, borderRadius:'50%', background: isLeading?'var(--gold-dim)':'var(--surface2)', color:isLeading?'var(--gold)':'var(--text2)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, flexShrink:0 }}>
                    {p.username[0].toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontWeight:600, fontSize:13 }}>{p.username}{p.id===myId&&<span style={{ fontSize:10, color:'var(--blue)', marginLeft:6, background:'rgba(59,130,246,.2)', padding:'1px 5px', borderRadius:4 }}>you</span>}</span>
                      {isLeading && <span style={{ fontSize:10, color:'var(--gold)', fontWeight:700 }}>LEADING</span>}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text2)', marginTop:1 }}>{fmtL(p.budget)} · {p.team?.length||0} players</div>
                    <div style={{ height:3, background:'var(--border2)', borderRadius:2, marginTop:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:2, background: pct>50?'var(--green)':pct>25?'var(--gold)':'var(--red)', width:`${pct}%`, transition:'width .5s' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── Center ── */}
        <main style={as.center}>
          {/* Status banner */}
          {paused && <div style={as.pauseBanner}>⏸ Auction paused by host</div>}

          {state?.phase === 'bidding' && !paused && (
            <div style={as.liveBanner}>
              🔴 LIVE BIDDING — Place your bid before the timer ends!
            </div>
          )}

          {/* Timer + Card */}
          <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
            {state?.phase === 'bidding' && !paused && (
              <TimerRing left={timer} total={timerTotal} />
            )}
            <div style={{ flex:1 }}>
              <PlayerCard item={currentItem} currentBid={state?.currentBid||0} currentBidder={state?.currentBidderName} />
            </div>
          </div>

          {/* Bid history strip */}
          {state?.bidHistory?.length > 0 && (
            <div style={as.bidStrip}>
              <span style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em', flexShrink:0 }}>Bids</span>
              {[...state.bidHistory].reverse().slice(0,6).map((b,i) => (
                <div key={i} style={{ ...as.bidChip, opacity:1-i*.14 }}>
                  <span style={{ color:'var(--gold)', fontWeight:700 }}>{b.username}</span>
                  <span style={{ color:'var(--text2)', fontFamily:'var(--font-m)', fontSize:12 }}>{fmtL(b.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Bid controls for non-host */}
          {!isHost && state?.phase === 'bidding' && !paused && (
            <div className="card">
              <BidPanel state={state} myId={myId} onBid={placeBid} onSuggest={getSuggestion} suggestion={suggestion} error={bidErr} />
            </div>
          )}

          {/* Host controls */}
          {isHost && state?.phase === 'bidding' && !paused && (
            <div className="card" style={{ border:'1px solid rgba(245,200,66,.25)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <span style={{ background:'var(--gold-dim)', color:'var(--gold)', padding:'4px 10px', borderRadius:6, fontSize:12, fontWeight:700 }}>👑 AUCTIONEER</span>
                <span style={{ color:'var(--text2)', fontSize:13 }}>
                  {state.currentBid > 0 ? `Highest: ${fmtL(state.currentBid)} — ${state.currentBidderName}` : 'No bids yet'}
                </span>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={hostSold} disabled={!state.currentBidderId} className="btn btn-gold" style={{ flex:1, padding:'14px', fontSize:15 }}>
                  🔨 SOLD — {state.currentBid>0?fmtL(state.currentBid):'No bids'}
                </button>
                <button onClick={hostUnsold} className="btn btn-red" style={{ flex:1, padding:'14px', fontSize:15 }}>
                  ❌ UNSOLD
                </button>
              </div>
              <p style={{ textAlign:'center', fontSize:12, color:'var(--text3)', marginTop:10 }}>Or wait for timer to auto-close</p>
            </div>
          )}

          {/* Host next button after round ends */}
          {isHost && (state?.phase==='sold'||state?.phase==='unsold') && (
            <div className="card" style={{ border:'1px solid rgba(245,200,66,.25)' }}>
              <button onClick={hostNext} className="btn btn-gold btn-full btn-lg">Next Player →</button>
            </div>
          )}
        </main>

        {/* ── Right: Chat ── */}
        <aside style={as.chatAside}>
          <div className="card" style={{ height:'100%', display:'flex', flexDirection:'column' }}>
            <h3 style={{ fontFamily:'var(--font-d)', fontSize:20, marginBottom:12, flexShrink:0 }}>💬 Chat</h3>
            <div style={as.chatMsgs}>
              {chat.length === 0 && <p style={{ color:'var(--text3)', fontSize:12, textAlign:'center', padding:'20px 0' }}>Chat is quiet…</p>}
              {chat.map((m, i) => {
                const isMe  = m.username === user?.username;
                const isSys = m.type==='system'||m.type==='bid';
                return (
                  <div key={i} style={{ display:'flex', flexDirection: isMe?'row-reverse':'row', gap:6, alignItems:'flex-end', marginBottom:4 }}>
                    {!isSys && !isMe && <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{m.username?.[0]?.toUpperCase()}</div>}
                    <div style={{ maxWidth:'78%', padding:isSys?'3px 10px':'7px 11px', borderRadius:10, background: isSys?'transparent':isMe?'var(--gold-dim)':'var(--surface2)', border: isMe?'1px solid rgba(245,200,66,.25)':isSys?'none':'none', ...(isSys?{textAlign:'center',width:'100%',maxWidth:'100%'}:{}) }}>
                      {!isSys && !isMe && <div style={{ fontSize:10, color:'var(--gold)', fontWeight:700, marginBottom:2 }}>{m.username}</div>}
                      <div style={{ fontSize:13, lineHeight:1.4, color: isSys?(m.type==='bid'?'var(--green)':'var(--text3)'):undefined, fontStyle:isSys?'italic':undefined }}>{m.message}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatRef} />
            </div>
            <form onSubmit={sendChat} style={{ display:'flex', gap:8, paddingTop:10, borderTop:'1px solid var(--border)', flexShrink:0 }}>
              <input value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Say something…" maxLength={300} className="input" style={{ fontSize:13 }} />
              <button type="submit" disabled={!msg.trim()} className="btn btn-outline btn-sm">↑</button>
            </form>
          </div>
        </aside>
      </div>

      {/* Overlays */}
      {result && <ResultOverlay result={result} isHost={isHost} onNext={hostNext} />}
      {leaderboard && <Leaderboard leaderboard={leaderboard} state={state} onClose={() => nav('/stats', { state: { leaderboard, settings: state?.settings } })} onLobby={() => nav('/')} />}
    </div>
  );
}

const as = {
  page:       { minHeight:'100vh', display:'flex', flexDirection:'column', position:'relative', overflow:'hidden' },
  bg:         { position:'fixed', inset:0, background:'radial-gradient(ellipse 70% 50% at 50% 100%, rgba(245,200,66,.05), transparent 60%), var(--bg)', zIndex:0 },
  header:     { position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 20px', borderBottom:'1px solid var(--border)', background:'rgba(10,10,15,.9)', backdropFilter:'blur(12px)', gap:16 },
  headerL:    { display:'flex', alignItems:'center', gap:10, flexShrink:0 },
  code:       { fontFamily:'var(--font-m)', fontSize:16, color:'var(--gold)', letterSpacing:'.12em' },
  progress:   { display:'flex', flexDirection:'column', alignItems:'center', gap:4, flex:1 },
  pBar:       { width:'100%', maxWidth:240, height:3, background:'var(--border2)', borderRadius:2, overflow:'hidden' },
  pFill:      { height:'100%', background:'linear-gradient(90deg,var(--gold2),var(--gold))', borderRadius:2, transition:'width .5s' },
  main:       { position:'relative', zIndex:1, display:'grid', gridTemplateColumns:'240px 1fr 280px', gap:14, flex:1, padding:14, height:'calc(100vh - 57px)', overflow:'hidden' },
  aside:      { overflow:'hidden' },
  chatAside:  { overflow:'hidden' },
  center:     { display:'flex', flexDirection:'column', gap:12, overflow:'auto' },
  teamRow:    { display:'flex', gap:10, alignItems:'center', padding:'8px 10px', borderRadius:10, background:'var(--bg3)', border:'1px solid var(--border)', marginBottom:8, position:'relative' },
  teamRowLead:{ border:'1px solid rgba(245,200,66,.35)', background:'rgba(245,200,66,.04)' },
  leadDot:    { position:'absolute', left:-3, top:'50%', transform:'translateY(-50%)', width:6, height:6, borderRadius:'50%', background:'var(--gold)', boxShadow:'0 0 8px var(--gold)' },
  pauseBanner:{ padding:'10px 16px', borderRadius:10, background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text2)', textAlign:'center', fontSize:14 },
  liveBanner: { padding:'10px 16px', borderRadius:10, background:'rgba(231,76,60,.1)', border:'1px solid rgba(231,76,60,.3)', color:'#ff6b6b', fontSize:14, fontWeight:600, textAlign:'center', animation:'pulse 2s ease-in-out infinite' },
  bidStrip:   { display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', padding:'10px 14px', background:'var(--bg3)', borderRadius:10 },
  bidChip:    { display:'flex', gap:6, padding:'4px 10px', background:'var(--surface)', borderRadius:6, fontSize:13 },
  chatMsgs:   { flex:1, overflowY:'auto', minHeight:0, paddingRight:4 },
};
