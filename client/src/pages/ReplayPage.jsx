import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getRoom } from '../services';

const fmtL = v => { if (!v && v !== 0) return '—'; if (v >= 100) return `₹${(v/100).toFixed(1)}Cr`; return `₹${v}L`; };
const fmtTime = ts => new Date(ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' });

const BADGE = {
  clutch:    { icon:'⚡', label:'CLUTCH',   color:'#e05a2b', bg:'rgba(224,90,43,.15)' },
  sniper:    { icon:'🎯', label:'SNIPER',   color:'#3b82f6', bg:'rgba(59,130,246,.15)' },
  bargain:   { icon:'💎', label:'BARGAIN',  color:'#2ecc71', bg:'rgba(46,204,113,.15)' },
  contested: { icon:'🔥', label:'CONTESTED',color:'#f5c842', bg:'rgba(245,200,66,.15)' },
  panic:     { icon:'😰', label:'PANIC',    color:'#e74c3c', bg:'rgba(231,76,60,.15)' },
};

function getBadges(event) {
  const badges = [];
  if (event.isClutch)    badges.push('clutch');
  if (event.isSniper)    badges.push('sniper');
  if (event.isBargain)   badges.push('bargain');
  if (event.isContested) badges.push('contested');
  return badges;
}

// ── Timeline bar component ────────────────────────────────────────────────────
function TimelineBar({ events, currentIdx, onSeek }) {
  const total = events.length;
  if (!total) return null;

  return (
    <div style={tl.wrap}>
      <div style={tl.bar}>
        {events.map((e, i) => {
          const pct  = (i / Math.max(total - 1, 1)) * 100;
          const type = e.isClutch ? 'clutch' : e.isBargain ? 'bargain' : e.isSniper ? 'sniper' : 'normal';
          const col  = type === 'clutch' ? '#e05a2b' : type === 'bargain' ? '#2ecc71' : type === 'sniper' ? '#3b82f6' : 'var(--border2)';
          return (
            <button key={i} onClick={() => onSeek(i)}
              title={`${e.playerName}: ${fmtL(e.amount)}`}
              style={{ ...tl.dot, left:`${pct}%`, background: i === currentIdx ? 'var(--gold)' : col, width: i === currentIdx ? 14 : 8, height: i === currentIdx ? 14 : 8, marginTop: i === currentIdx ? -4 : -1 }} />
          );
        })}
        {/* Progress fill */}
        <div style={{ ...tl.fill, width:`${(currentIdx / Math.max(total-1,1))*100}%` }} />
      </div>
      <div style={tl.labels}>
        <span style={{ fontSize:11, color:'var(--text3)' }}>Bid 1</span>
        <span style={{ fontSize:11, color:'var(--text3)' }}>Bid {total}</span>
      </div>
    </div>
  );
}

const tl = {
  wrap:   { display:'flex', flexDirection:'column', gap:6, padding:'0 8px' },
  bar:    { position:'relative', height:4, background:'var(--border2)', borderRadius:2, margin:'8px 0' },
  fill:   { position:'absolute', top:0, left:0, height:'100%', background:'var(--gold)', borderRadius:2, transition:'width .3s', pointerEvents:'none' },
  dot:    { position:'absolute', transform:'translateX(-50%)', borderRadius:'50%', border:'none', cursor:'pointer', transition:'all .2s', padding:0, zIndex:1, top:'50%' },
  labels: { display:'flex', justifyContent:'space-between' },
};

// ── Item summary card ─────────────────────────────────────────────────────────
function ItemSummary({ item, isActive, onClick }) {
  const sold = item.result === 'sold';
  return (
    <div onClick={onClick} style={{ ...is.wrap, ...(isActive ? is.active : {}), ...(sold ? is.sold : is.unsold) }}>
      <div style={is.name}>{item.itemName}</div>
      <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:3 }}>
        {sold
          ? <><span style={{ color:'var(--gold)', fontSize:12, fontWeight:700 }}>{fmtL(item.finalPrice)}</span><span style={{ fontSize:11, color:'var(--text2)' }}>→ {item.winner}</span></>
          : <span style={{ fontSize:12, color:'var(--text3)' }}>Unsold</span>
        }
      </div>
      <div style={is.bidCount}>{item.bids?.length || 0} bids</div>
    </div>
  );
}

const is = {
  wrap:    { padding:'10px 12px', borderRadius:10, cursor:'pointer', border:'1px solid var(--border)', background:'var(--bg3)', transition:'all 150ms', position:'relative' },
  active:  { border:'1px solid var(--gold)', background:'rgba(245,200,66,.06)' },
  sold:    { borderLeft:'3px solid var(--gold)' },
  unsold:  { borderLeft:'3px solid var(--text3)' },
  name:    { fontWeight:600, fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  bidCount:{ position:'absolute', top:8, right:8, fontSize:10, color:'var(--text3)', background:'var(--surface2)', padding:'1px 6px', borderRadius:100 },
};

// ── Main ReplayPage ───────────────────────────────────────────────────────────
export default function ReplayPage() {
  const { code }       = useParams();
  const { state }      = useLocation();
  const nav            = useNavigate();

  const [replay,       setReplay]       = useState(state?.replay || null);
  const [grouped,      setGrouped]      = useState(state?.grouped || null);
  const [loading,      setLoading]      = useState(!state?.replay);
  const [activeItem,   setActiveItem]   = useState(0);
  const [currentBid,   setCurrentBid]   = useState(0);
  const [playing,      setPlaying]      = useState(false);
  const [speed,        setSpeed]        = useState(1);
  const playRef        = useRef(null);

  // Fetch replay from API if not passed via location state
  useEffect(() => {
    if (replay) return;
    fetch(`/api/replay/${code}/by-item`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => r.json())
      .then(d => { setGrouped(d.grouped || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [code]);

  // Build grouped from flat replay if needed
  useEffect(() => {
    if (grouped || !replay) return;
    const map = {};
    replay.forEach(e => {
      const k = e.itemIndex ?? 0;
      if (!map[k]) map[k] = { itemName: e.itemName, bids: [], result:'unsold', finalPrice:0, winner:'' };
      map[k].bids.push(e);
      map[k].result = 'bid';
    });
    setGrouped(Object.values(map));
  }, [replay]);

  const items        = grouped || [];
  const activeGroup  = items[activeItem] || { itemName:'', bids:[] };
  const bids         = activeGroup.bids || [];
  const shownBids    = bids.slice(0, currentBid + 1);

  // Auto-play
  useEffect(() => {
    if (!playing) { clearInterval(playRef.current); return; }
    playRef.current = setInterval(() => {
      setCurrentBid(prev => {
        if (prev >= bids.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1200 / speed);
    return () => clearInterval(playRef.current);
  }, [playing, bids.length, speed]);

  const handleItemSelect = idx => {
    setActiveItem(idx);
    setCurrentBid(0);
    setPlaying(false);
  };

  const handleSeek = idx => { setCurrentBid(idx); setPlaying(false); };

  const handlePlay = () => {
    if (currentBid >= bids.length - 1) setCurrentBid(0);
    setPlaying(true);
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div className="spin" style={{ width:44, height:44, border:'3px solid var(--border2)', borderTopColor:'var(--gold)', borderRadius:'50%' }} />
      <p style={{ color:'var(--text2)' }}>Loading replay…</p>
    </div>
  );

  if (!items.length) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <span style={{ fontSize:48 }}>📭</span>
      <p style={{ color:'var(--text2)' }}>No replay data available for this auction.</p>
      <button onClick={() => nav(-1)} className="btn btn-ghost">← Go Back</button>
    </div>
  );

  const currentEvent = bids[currentBid];
  const badges       = currentEvent ? getBadges(currentEvent) : [];

  return (
    <div style={s.page}>
      <div style={s.bg} />

      {/* Header */}
      <header style={s.header}>
        <button onClick={() => nav(-1)} className="btn btn-ghost btn-sm">← Back</button>
        <div style={s.headerCenter}>
          <span style={{ fontFamily:'var(--font-d)', fontSize:22, color:'var(--gold)', letterSpacing:'.04em' }}>🎬 AUCTION REPLAY</span>
          <span style={{ fontSize:13, color:'var(--text2)' }}>Room: {code}</span>
        </div>
        <div style={{ width:80 }} />
      </header>

      <div style={s.main}>
        {/* Left: item list */}
        <aside style={s.aside}>
          <div className="card" style={{ height:'100%', overflow:'auto' }}>
            <h3 style={s.sideTitle}>Players ({items.length})</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {items.map((item, i) => (
                <ItemSummary key={i} item={item} isActive={activeItem === i} onClick={() => handleItemSelect(i)} />
              ))}
            </div>
          </div>
        </aside>

        {/* Center: replay viewer */}
        <main style={s.center}>
          {/* Player being replayed */}
          <div className="card" style={{ border:'1px solid rgba(245,200,66,.25)' }}>
            <div style={s.playerHeader}>
              <div>
                <h2 style={s.playerName}>{activeGroup.itemName || '—'}</h2>
                <div style={{ fontSize:13, color:'var(--text2)', marginTop:4 }}>
                  {bids.length} bids total ·
                  {activeGroup.result === 'sold'
                    ? <span style={{ color:'var(--gold)', marginLeft:4 }}>SOLD to {activeGroup.winner} for {fmtL(activeGroup.finalPrice)}</span>
                    : <span style={{ color:'var(--text3)', marginLeft:4 }}>UNSOLD</span>
                  }
                </div>
              </div>
              <div style={s.bidCounter}>
                <span style={s.bidCountNum}>{currentBid + 1}</span>
                <span style={{ fontSize:11, color:'var(--text3)' }}>/ {bids.length}</span>
              </div>
            </div>
          </div>

          {/* Current event highlight */}
          {currentEvent && (
            <div style={{ ...s.currentEvent, ...(badges.length ? { borderColor:'rgba(245,200,66,.4)', background:'rgba(245,200,66,.05)' } : {}) }} className="pop-in">
              <div style={s.eventAvatar}>{currentEvent.playerName?.[0]?.toUpperCase()}</div>
              <div style={{ flex:1 }}>
                <div style={s.eventName}>
                  {currentEvent.playerName}
                  {badges.map(b => (
                    <span key={b} style={{ ...s.badge, background: BADGE[b].bg, color: BADGE[b].color }}>
                      {BADGE[b].icon} {BADGE[b].label}
                    </span>
                  ))}
                </div>
                <div style={s.eventAmount}>{fmtL(currentEvent.amount)}</div>
                {currentEvent.previousBid > 0 && (
                  <div style={{ fontSize:12, color:'var(--text2)', marginTop:4 }}>
                    Outbid {currentEvent.previousBidder}'s {fmtL(currentEvent.previousBid)}
                    {currentEvent.timeLeft !== undefined && (
                      <span style={{ marginLeft:8, color: currentEvent.timeLeft <= 3 ? 'var(--red)' : 'var(--text3)' }}>
                        · {currentEvent.timeLeft}s left
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div style={{ fontSize:12, color:'var(--text3)', flexShrink:0 }}>
                {currentEvent.timestamp ? fmtTime(currentEvent.timestamp) : `Bid #${currentBid+1}`}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="card">
            <TimelineBar events={bids} currentIdx={currentBid} onSeek={handleSeek} />

            {/* Playback controls */}
            <div style={s.controls}>
              <button onClick={() => setCurrentBid(0)} className="btn btn-ghost btn-sm" title="Start">⏮</button>
              <button onClick={() => setCurrentBid(p => Math.max(0, p-1))} className="btn btn-ghost btn-sm" title="Previous">◀</button>
              {playing
                ? <button onClick={() => setPlaying(false)} className="btn btn-gold" style={{ minWidth:80 }}>⏸ Pause</button>
                : <button onClick={handlePlay} className="btn btn-gold" style={{ minWidth:80 }}>▶ Play</button>
              }
              <button onClick={() => setCurrentBid(p => Math.min(bids.length-1, p+1))} className="btn btn-ghost btn-sm" title="Next">▶</button>
              <button onClick={() => setCurrentBid(bids.length-1)} className="btn btn-ghost btn-sm" title="End">⏭</button>

              {/* Speed control */}
              <div style={s.speedWrap}>
                <span style={{ fontSize:12, color:'var(--text2)' }}>Speed</span>
                {[0.5, 1, 2, 3].map(sp => (
                  <button key={sp} onClick={() => setSpeed(sp)}
                    className={`btn btn-sm ${speed===sp ? 'btn-gold' : 'btn-ghost'}`}
                    style={{ minWidth:40 }}>{sp}×</button>
                ))}
              </div>
            </div>
          </div>

          {/* Bid history list */}
          <div className="card">
            <h3 style={{ fontFamily:'var(--font-d)', fontSize:18, marginBottom:12 }}>Bid History</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:300, overflowY:'auto' }}>
              {shownBids.map((bid, i) => {
                const isCurrent = i === currentBid;
                const bdgs      = getBadges(bid);
                return (
                  <div key={i} onClick={() => handleSeek(i)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, background:isCurrent?'rgba(245,200,66,.08)':'var(--bg3)', border:`1px solid ${isCurrent?'rgba(245,200,66,.35)':'var(--border)'}`, cursor:'pointer', transition:'all 150ms' }}>
                    <span style={{ fontSize:12, color:'var(--text3)', width:20, flexShrink:0 }}>#{i+1}</span>
                    <div style={{ width:26, height:26, borderRadius:'50%', background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{bid.playerName?.[0]?.toUpperCase()}</div>
                    <span style={{ fontWeight:600, fontSize:13, flex:1 }}>{bid.playerName}</span>
                    <div style={{ display:'flex', gap:4 }}>
                      {bdgs.map(b => <span key={b} style={{ fontSize:14 }}>{BADGE[b].icon}</span>)}
                    </div>
                    <span style={{ fontFamily:'var(--font-m)', color:'var(--gold)', fontWeight:700, fontSize:14 }}>{fmtL(bid.amount)}</span>
                    {bid.timeLeft !== undefined && (
                      <span style={{ fontSize:11, color:bid.timeLeft<=3?'var(--red)':'var(--text3)', width:30, textAlign:'right', flexShrink:0 }}>{bid.timeLeft}s</span>
                    )}
                  </div>
                );
              })}
              {shownBids.length === 0 && (
                <p style={{ color:'var(--text3)', fontSize:13, textAlign:'center', padding:'20px 0' }}>Press Play to start the replay</p>
              )}
            </div>
          </div>
        </main>

        {/* Right: stats sidebar */}
        <aside style={s.aside}>
          <div className="card" style={{ height:'100%', overflow:'auto' }}>
            <h3 style={s.sideTitle}>Highlights</h3>

            {/* Clutch moments */}
            <div style={s.highlightSection}>
              <div style={s.hlLabel}>⚡ Clutch Bids</div>
              {bids.filter(b=>b.isClutch).length === 0
                ? <p style={s.hlEmpty}>None in this auction</p>
                : bids.filter(b=>b.isClutch).map((b,i) => (
                    <div key={i} style={s.hlRow}>
                      <span style={{ color:'#e05a2b', fontWeight:700 }}>{b.playerName}</span>
                      <span style={{ color:'var(--gold)', fontFamily:'var(--font-m)' }}>{fmtL(b.amount)}</span>
                      <span style={{ color:'var(--red)', fontSize:11 }}>{b.timeLeft}s left</span>
                    </div>
                  ))
              }
            </div>

            <div style={s.divider} />

            {/* Bargains */}
            <div style={s.highlightSection}>
              <div style={s.hlLabel}>💎 Bargains</div>
              {bids.filter(b=>b.isBargain).length === 0
                ? <p style={s.hlEmpty}>No bargains found</p>
                : bids.filter(b=>b.isBargain).map((b,i) => (
                    <div key={i} style={s.hlRow}>
                      <span style={{ color:'#2ecc71', fontWeight:700 }}>{b.playerName}</span>
                      <span style={{ color:'var(--gold)', fontFamily:'var(--font-m)' }}>{fmtL(b.amount)}</span>
                    </div>
                  ))
              }
            </div>

            <div style={s.divider} />

            {/* Snipers */}
            <div style={s.highlightSection}>
              <div style={s.hlLabel}>🎯 Snipers</div>
              {bids.filter(b=>b.isSniper).length === 0
                ? <p style={s.hlEmpty}>No sniper bids</p>
                : bids.filter(b=>b.isSniper).map((b,i) => (
                    <div key={i} style={s.hlRow}>
                      <span style={{ color:'#3b82f6', fontWeight:700 }}>{b.playerName}</span>
                      <span style={{ color:'var(--gold)', fontFamily:'var(--font-m)' }}>{fmtL(b.amount)}</span>
                    </div>
                  ))
              }
            </div>

            <div style={s.divider} />

            {/* Bid stats */}
            <div style={s.highlightSection}>
              <div style={s.hlLabel}>📊 Stats</div>
              <div style={s.statRow}>
                <span style={s.statLabel}>Total bids</span>
                <span style={s.statVal}>{bids.length}</span>
              </div>
              <div style={s.statRow}>
                <span style={s.statLabel}>Clutch bids</span>
                <span style={{ ...s.statVal, color:'#e05a2b' }}>{bids.filter(b=>b.isClutch).length}</span>
              </div>
              <div style={s.statRow}>
                <span style={s.statLabel}>Bargains</span>
                <span style={{ ...s.statVal, color:'#2ecc71' }}>{bids.filter(b=>b.isBargain).length}</span>
              </div>
              <div style={s.statRow}>
                <span style={s.statLabel}>Snipers</span>
                <span style={{ ...s.statVal, color:'#3b82f6' }}>{bids.filter(b=>b.isSniper).length}</span>
              </div>
              {bids.length > 0 && (
                <div style={s.statRow}>
                  <span style={s.statLabel}>Avg bid</span>
                  <span style={s.statVal}>{fmtL(Math.round(bids.reduce((s,b)=>s+b.amount,0)/bids.length))}</span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

const s = {
  page:          { minHeight:'100vh', display:'flex', flexDirection:'column', position:'relative', overflow:'hidden' },
  bg:            { position:'fixed', inset:0, background:'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,200,66,.07), transparent 60%), var(--bg)', zIndex:0 },
  header:        { position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 24px', borderBottom:'1px solid var(--border)', background:'rgba(10,10,15,.9)', backdropFilter:'blur(12px)', flexShrink:0 },
  headerCenter:  { display:'flex', flexDirection:'column', alignItems:'center', gap:3 },
  main:          { position:'relative', zIndex:1, display:'grid', gridTemplateColumns:'240px 1fr 240px', gap:16, flex:1, padding:16, height:'calc(100vh - 61px)', overflow:'hidden' },
  aside:         { overflow:'hidden', display:'flex', flexDirection:'column' },
  center:        { display:'flex', flexDirection:'column', gap:12, overflow:'auto', minHeight:0 },
  sideTitle:     { fontFamily:'var(--font-d)', fontSize:18, marginBottom:12 },
  playerHeader:  { display:'flex', alignItems:'flex-start', justifyContent:'space-between' },
  playerName:    { fontFamily:'var(--font-d)', fontSize:28, letterSpacing:'.02em' },
  bidCounter:    { display:'flex', alignItems:'baseline', gap:4, flexShrink:0 },
  bidCountNum:   { fontFamily:'var(--font-d)', fontSize:36, color:'var(--gold)', lineHeight:1 },
  currentEvent:  { display:'flex', alignItems:'flex-start', gap:12, padding:'14px 16px', background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:12, transition:'all .3s' },
  eventAvatar:   { width:42, height:42, borderRadius:'50%', background:'var(--gold-dim)', color:'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:18, flexShrink:0 },
  eventName:     { fontWeight:700, fontSize:15, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' },
  eventAmount:   { fontFamily:'var(--font-d)', fontSize:32, color:'var(--gold)', lineHeight:1, marginTop:4 },
  badge:         { fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:100, letterSpacing:'.04em' },
  controls:      { display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginTop:14 },
  speedWrap:     { display:'flex', alignItems:'center', gap:6, marginLeft:'auto' },
  highlightSection:{ display:'flex', flexDirection:'column', gap:6 },
  hlLabel:       { fontSize:13, fontWeight:700, color:'var(--text2)', marginBottom:4 },
  hlEmpty:       { fontSize:12, color:'var(--text3)', fontStyle:'italic' },
  hlRow:         { display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13, padding:'4px 0', borderBottom:'1px solid var(--border)' },
  divider:       { height:1, background:'var(--border)', margin:'12px 0' },
  statRow:       { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0', borderBottom:'1px solid var(--border)' },
  statLabel:     { fontSize:13, color:'var(--text2)' },
  statVal:       { fontSize:13, fontWeight:700, fontFamily:'var(--font-m)' },
};
