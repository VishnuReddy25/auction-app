import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { connectSocket, getSocket } from '../services';
import SoundEngine from '../services/SoundEngine';
import Confetti    from '../components/Confetti';
import AnimatedBg  from '../components/AnimatedBg';
import NewsPanel      from '../components/NewsPanel';
import AnalyticsPanel from '../components/AnalyticsPanel';
import VoiceChat      from '../components/VoiceChat';

const fmtL = v => { if (!v && v !== 0) return '—'; if (v >= 100) return `₹${(v/100).toFixed(1)}Cr`; return `₹${v}L`; };
const roleColor = { Batsman:'#f5c842', Bowler:'#3b82f6', 'All-Rounder':'#2ecc71', 'Wicket-Keeper':'#e05a2b' };

let newsIdCounter = 0;
function makeNews(type, headline, detail = '', extra = {}) {
  return { id: ++newsIdCounter, type, headline, detail, ts: Date.now(), ...extra };
}

// ── Going Once/Twice text ─────────────────────────────────────────────────────
function GavelText({ left }) {
  if (left === 10) return <div style={gt.wrap} className="pop-in">⏳ Going once…</div>;
  if (left === 5)  return <div style={{ ...gt.wrap, color:'var(--gold)' }} className="pop-in">⏳ Going twice…</div>;
  if (left === 3)  return <div style={{ ...gt.wrap, color:'var(--red)', fontSize:22 }} className="pop-in">🔨 GOING…</div>;
  return null;
}
const gt = { wrap:{ textAlign:'center', fontFamily:'var(--font-d)', fontSize:20, letterSpacing:'.05em', color:'var(--text2)', padding:'4px 0' } };

// ── Outbid alert ──────────────────────────────────────────────────────────────
function OutbidAlert({ show }) {
  if (!show) return null;
  return (
    <div style={oa.wrap} className="pop-in">
      <span style={{ fontSize:32 }}>😱</span>
      <div>
        <div style={oa.title}>YOU'VE BEEN OUTBID!</div>
        <div style={oa.sub}>Place a higher bid to win this player</div>
      </div>
    </div>
  );
}
const oa = {
  wrap:  { display:'flex', alignItems:'center', gap:14, padding:'14px 20px', background:'rgba(231,76,60,.15)', border:'2px solid rgba(231,76,60,.5)', borderRadius:12 },
  title: { fontFamily:'var(--font-d)', fontSize:24, color:'var(--red)', letterSpacing:'.05em', lineHeight:1 },
  sub:   { fontSize:13, color:'var(--text2)', marginTop:3 },
};

// ── Bid war banner ────────────────────────────────────────────────────────────
function BidWarBanner({ show }) {
  if (!show) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, padding:'10px', background:'linear-gradient(135deg,rgba(231,76,60,.2),rgba(245,200,66,.2))', border:'1px solid rgba(245,200,66,.3)', borderRadius:10, animation:'pulse 1s ease-in-out infinite' }}>
      <span style={{ fontSize:28 }}>🔥</span>
      <span style={{ fontFamily:'var(--font-d)', fontSize:28, color:'var(--gold)', letterSpacing:'.1em' }}>BID WAR!</span>
      <span style={{ fontSize:28 }}>🔥</span>
    </div>
  );
}

// ── Timer ring ────────────────────────────────────────────────────────────────
function TimerRing({ left, total }) {
  const pct   = Math.max(0, left / total);
  const urgent= left <= 5;
  const warn  = left <= 10;
  const color = urgent ? '#e74c3c' : warn ? '#f5c842' : '#2ecc71';
  const r = 46, c = 2 * Math.PI * r;
  return (
    <div style={{ position:'relative', width:110, height:110, flexShrink:0 }}>
      {urgent && <div style={{ position:'absolute', inset:0, borderRadius:'50%', boxShadow:'0 0 30px rgba(231,76,60,.5)', animation:'pulse 0.5s ease-in-out infinite' }} />}
      <svg width="110" height="110" style={{ transform:'rotate(-90deg)' }}>
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="7" />
        <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={c} strokeDashoffset={c*(1-pct)} strokeLinecap="round"
          style={{ transition:'stroke-dashoffset .9s linear, stroke .3s', filter:`drop-shadow(0 0 6px ${color})` }} />
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontFamily:'var(--font-d)', fontSize:34, color, lineHeight:1, transition:'color .3s' }}>{left}</span>
        <span style={{ fontSize:10, color:'var(--text3)', letterSpacing:'.08em', marginTop:2 }}>SEC</span>
      </div>
    </div>
  );
}

// ── Player card ───────────────────────────────────────────────────────────────
function PlayerCard({ item, currentBid, currentBidder, isNew }) {
  if (!item) return null;
  const rc = roleColor[item.role] || '#9898b0';
  const stars = getStars(item);
  return (
    <div style={{ ...ps.card, borderColor:`${rc}40` }} className={isNew?'pop-in':''}>
      <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse at 50% 0%, ${rc}18, transparent 55%)`, pointerEvents:'none', borderRadius:16 }} />
      <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:120, height:120, background:`radial-gradient(ellipse, ${rc}25, transparent 70%)`, pointerEvents:'none' }} />
      <div style={ps.top}>
        <div style={{ ...ps.avatar, background:`${rc}20`, color:rc, border:`2px solid ${rc}50`, boxShadow:`0 0 20px ${rc}40` }}>
          <span style={{ fontFamily:'var(--font-d)', fontSize:26 }}>{item.image||item.name?.[0]}</span>
        </div>
        <div style={ps.info}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <h2 style={ps.name}>{item.name}</h2>
            <span style={{ ...ps.roleBadge, background:`${rc}20`, color:rc, border:`1px solid ${rc}40` }}>{item.role}</span>
          </div>
          <div style={{ color:'var(--text2)', fontSize:13, marginTop:4 }}>🏳️ {item.team}</div>
          <div style={{ fontSize:13, color:'var(--text2)', marginTop:6 }}>Base: <strong style={{ color:'var(--gold)', fontSize:16 }}>{fmtL(item.basePrice)}</strong></div>
          <div style={{ display:'flex', gap:3, marginTop:6 }}>
            {stars.map((f,i) => <span key={i} style={{ color:f?'#f5c842':'var(--border2)', fontSize:16 }}>★</span>)}
          </div>
        </div>
      </div>
      <div style={ps.divider} />
      <div style={ps.stats}>
        {item.stats?.runs  > 0 && <Stat icon="🏏" label="Runs"  val={item.stats.runs} />}
        {item.stats?.avg   > 0 && <Stat icon="📊" label="Avg"   val={item.stats.avg} />}
        {item.stats?.sr    > 0 && <Stat icon="⚡" label="SR"    val={item.stats.sr} />}
        {item.stats?.wkts  > 0 && <Stat icon="🎯" label="Wkts"  val={item.stats.wkts} />}
        {item.stats?.eco   > 0 && <Stat icon="💰" label="Eco"   val={item.stats.eco} />}
      </div>
      {item.stats?.form && (
        <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:12 }}>
          <span style={{ fontSize:12, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em' }}>Form</span>
          <div style={{ display:'flex', gap:5 }}>
            {item.stats.form.split('').map((ch,i) => (
              <span key={i} style={{ width:24, height:24, borderRadius:6, background:ch==='W'?'var(--green)':'var(--red)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', boxShadow:`0 0 6px ${ch==='W'?'rgba(46,204,113,.5)':'rgba(231,76,60,.5)'}` }}>{ch}</span>
            ))}
          </div>
        </div>
      )}
      <div style={ps.divider} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        {currentBid > 0 ? (
          <>
            <div>
              <div style={ps.bidLabel}>CURRENT BID</div>
              <div style={{ fontFamily:'var(--font-d)', fontSize:42, color:'var(--gold)', lineHeight:1, textShadow:'0 0 20px rgba(245,200,66,.4)' }}>{fmtL(currentBid)}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={ps.bidLabel}>LEADING BIDDER</div>
              <div style={{ fontWeight:700, fontSize:22 }}>{currentBidder}</div>
              <div style={{ fontSize:12, color:'var(--green)', marginTop:4 }}>🏆 Leading</div>
            </div>
          </>
        ) : (
          <div style={{ textAlign:'center', width:'100%' }}>
            <div style={ps.bidLabel}>OPENING BID</div>
            <div style={{ fontFamily:'var(--font-d)', fontSize:42, color:'var(--gold)', lineHeight:1 }}>{fmtL(item.basePrice)}</div>
            <div style={{ fontSize:13, color:'var(--text3)', marginTop:4 }}>Be the first to bid!</div>
          </div>
        )}
      </div>
    </div>
  );
}
function getStars(item) {
  const score = Math.min(5, Math.round(((item.stats?.avg||0)/15 + (item.stats?.sr||0)/40 + (item.stats?.wkts||0)/40)));
  return Array.from({length:5}, (_,i) => i < Math.max(2, score));
}
function Stat({ icon, label, val }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', background:'var(--bg3)', borderRadius:10, padding:'8px 10px', gap:2, minWidth:65 }}>
      <span style={{ fontSize:15 }}>{icon}</span>
      <span style={{ fontFamily:'var(--font-m)', fontSize:14, fontWeight:600 }}>{val}</span>
      <span style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.05em' }}>{label}</span>
    </div>
  );
}
const ps = {
  card:      { background:'var(--surface)', border:'1px solid', borderRadius:16, padding:22, position:'relative', overflow:'hidden' },
  top:       { display:'flex', gap:18, alignItems:'flex-start', position:'relative' },
  avatar:    { width:80, height:80, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  info:      { flex:1 },
  name:      { fontFamily:'var(--font-d)', fontSize:30, letterSpacing:'.02em', lineHeight:1.1 },
  roleBadge: { fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:100, letterSpacing:'.05em', textTransform:'uppercase' },
  divider:   { height:1, background:'var(--border)', margin:'14px 0' },
  stats:     { display:'flex', gap:8, flexWrap:'wrap' },
  bidLabel:  { fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:4 },
};

// ── Bid panel ─────────────────────────────────────────────────────────────────
function BidPanel({ state, myId, onBid, onSuggest, suggestion, error }) {
  const me        = state?.players?.find(p => p.id === myId);
  const item      = state?.items?.[state?.currentIndex];
  const inc       = state?.settings?.minIncrement || 5;
  const minBid    = state?.currentBid > 0 ? state.currentBid + inc : (item?.basePrice || 20);
  const [amount, setAmount] = useState(minBid);
  useEffect(() => setAmount(a => Math.max(a, minBid)), [minBid]);
  if (!me || me.isHost) return null;

  const myTeamCount  = me.team?.length || 0;
  const totalItems   = state?.items?.length || 100;
  const doneItems    = state?.currentIndex || 0;
  const remaining    = totalItems - doneItems; // players left to auction
  const needMore     = myTeamCount < 11;       // must reach 11
  const isLeading    = state?.currentBidderId === me.id;
  const canBid       = state?.phase==='bidding' && amount>=minBid && amount<=me.budget && !isLeading;
  const base         = state?.currentBid > 0 ? state.currentBid : (item?.basePrice || 20);
  const quick        = [base+10, base+20, base+30, base+50].filter(v => v >= minBid && v <= me.budget);

  // How many players left that they MUST buy to reach 11
  const mustBuy = Math.max(0, 11 - myTeamCount);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {/* Budget + Squad size */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:'var(--bg3)', borderRadius:10 }}>
        <div>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:2 }}>YOUR BUDGET</div>
          <div style={{ fontFamily:'var(--font-m)', fontSize:20, color:'var(--gold)', fontWeight:600 }}>{fmtL(me.budget)}</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:2 }}>SQUAD</div>
          <div style={{ fontFamily:'var(--font-m)', fontSize:20, fontWeight:600, color: myTeamCount >= 11 ? 'var(--green)' : 'var(--gold)' }}>
            {myTeamCount}/11
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:2 }}>SPENT</div>
          <div style={{ fontFamily:'var(--font-m)', fontSize:16, color:'var(--red)' }}>{fmtL((state?.settings?.startingBudget||1000)-me.budget)}</div>
        </div>
      </div>

      {/* Must buy warning */}
      {needMore && remaining <= mustBuy + 5 && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(231,76,60,.12)', border:'1px solid rgba(231,76,60,.35)', borderRadius:10 }}>
          <span style={{ fontSize:18 }}>⚠️</span>
          <div>
            <div style={{ fontWeight:700, color:'var(--red)', fontSize:13 }}>Need {mustBuy} more player{mustBuy!==1?'s':''}!</div>
            <div style={{ fontSize:11, color:'var(--text2)' }}>Minimum 11 players required — bid aggressively!</div>
          </div>
        </div>
      )}

      {/* Reached 11 — good to go */}
      {myTeamCount >= 11 && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', background:'rgba(46,204,113,.08)', border:'1px solid rgba(46,204,113,.25)', borderRadius:10 }}>
          <span style={{ fontSize:16 }}>✅</span>
          <span style={{ fontSize:13, color:'var(--green)', fontWeight:600 }}>Squad complete! Bid for extras if you want.</span>
        </div>
      )}

      {isLeading && <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'rgba(46,204,113,.1)', border:'1px solid rgba(46,204,113,.3)', borderRadius:10 }}>
        <span style={{ fontSize:20 }}>🏆</span>
        <div><div style={{ fontWeight:700, color:'var(--green)', fontSize:15 }}>You're leading!</div>
          <div style={{ fontSize:12, color:'var(--text2)' }}>Hold tight or wait for the timer</div></div>
      </div>}

      {suggestion && <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:12, background:'rgba(245,200,66,.06)', border:'1px solid rgba(245,200,66,.2)', borderRadius:10 }}>
        <span style={{ fontSize:20 }}>🤖</span>
        <div style={{ flex:1 }}><div style={{ fontWeight:600, color:'var(--gold)', fontSize:14 }}>AI: {fmtL(suggestion.amount)}</div>
          <div style={{ fontSize:12, color:'var(--text2)' }}>{suggestion.reason}</div></div>
        <button onClick={() => setAmount(suggestion.amount)} className="btn btn-ghost btn-sm">Use</button>
      </div>}

      {quick.length > 0 && <div style={{ display:'flex', gap:8 }}>
        {quick.map((v) => {
          const isSelected = amount === v;
          return (
            <button key={v} onClick={() => setAmount(v)}
              style={{ flex:1, padding:'10px 0', background:isSelected?'var(--gold-dim)':'var(--bg3)', border:`1px solid ${isSelected?'var(--gold)':'var(--border2)'}`, borderRadius:8, color:isSelected?'var(--gold)':'var(--text2)', cursor:'pointer', fontFamily:'var(--font-m)', fontSize:13, fontWeight:600, transition:'all 150ms', textAlign:'center' }}>
              {fmtL(v)}
            </button>
          );
        })}
      </div>}

      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <button onClick={() => setAmount(a => Math.max(minBid,a-inc))} style={{ width:48, height:56, background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, color:'var(--text)', cursor:'pointer', fontSize:22 }} disabled={amount<=minBid}>−</button>
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, padding:'10px 12px' }}>
          <span style={{ fontFamily:'var(--font-d)', fontSize:30, color:'var(--gold)' }}>{fmtL(amount)}</span>
          <span style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{amount} Lakhs</span>
        </div>
        <button onClick={() => setAmount(a => Math.min(me.budget,a+inc))} style={{ width:48, height:56, background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, color:'var(--text)', cursor:'pointer', fontSize:22 }} disabled={amount>=me.budget}>+</button>
      </div>
      <div style={{ fontSize:12, color:'var(--text3)', textAlign:'center' }}>Min: {fmtL(minBid)} · Increment: {fmtL(inc)}</div>
      {error && <div style={{ padding:'8px 12px', background:'rgba(231,76,60,.1)', border:'1px solid rgba(231,76,60,.3)', borderRadius:8, color:'var(--red)', fontSize:13 }}>⚠ {error}</div>}
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => onBid(amount)} disabled={!canBid} className="btn btn-gold"
          style={{ flex:1, padding:'16px', fontSize:16, boxShadow:canBid?'var(--gold-glow)':'none', transition:'all 200ms' }}>
          🔨 BID {fmtL(amount)}
        </button>
        <button onClick={onSuggest} className="btn btn-ghost btn-sm" title="AI Suggestion">🤖</button>
      </div>
    </div>
  );
}

// ── Result overlay ────────────────────────────────────────────────────────────
function ResultOverlay({ result, isHost, onNext }) {
  if (!result) return null;
  const sold = result.type==='sold';
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(10px)' }}>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:20, width:'100%', maxWidth:440, overflow:'hidden' }} className="pop-in">
        <div style={{ display:'flex', alignItems:'center', gap:18, padding:'24px 28px', background:sold?'linear-gradient(135deg,#f5c842,#e8a020)':'linear-gradient(135deg,#444,#222)' }}>
          <span style={{ fontSize:52 }}>{sold?'🔨':'❌'}</span>
          <div>
            <div style={{ fontFamily:'var(--font-d)', fontSize:44, color:sold?'#0a0a0f':'#fff', letterSpacing:'.04em', lineHeight:1 }}>{sold?'SOLD!':'UNSOLD'}</div>
            <div style={{ fontSize:16, color:sold?'rgba(0,0,0,.7)':'rgba(255,255,255,.6)', fontWeight:600, marginTop:4 }}>{result.item?.name}</div>
          </div>
        </div>
        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:12 }}>
          {sold && (<>
            <ORow label="Winner"      val={result.winner} />
            <ORow label="Final Price" val={fmtL(result.price)} gold />
            <ORow label="Total Bids"  val={`${result.bids} bids`} />
          </>)}
          {!sold && <p style={{ color:'var(--text2)', textAlign:'center', padding:'8px 0' }}>No bids — {result.item?.name} goes unsold</p>}
          {isHost  && <button onClick={onNext} className="btn btn-gold btn-full btn-lg" style={{ marginTop:8 }}>Next Player →</button>}
          {!isHost && <p style={{ textAlign:'center', color:'var(--text3)', fontSize:13 }}>Waiting for host to advance…</p>}
        </div>
      </div>
    </div>
  );
}
function ORow({ label, val, gold }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:13, color:'var(--text2)' }}>{label}</span>
      <span style={{ fontWeight:700, fontSize:16, color:gold?'var(--gold)':'var(--text)' }}>{val}</span>
    </div>
  );
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
function Leaderboard({ leaderboard, state, onStats, onLobby, onSaveForSeason, isSaving, code, isHost }) {
  const medals = ['🥇','🥈','🥉'];
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.88)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(12px)' }}>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:20, width:'100%', maxWidth:540, maxHeight:'90vh', overflowY:'auto' }} className="pop-in">
        <div style={{ padding:'28px 24px 16px', textAlign:'center', background:'linear-gradient(135deg,rgba(245,200,66,.15),transparent)' }}>
          <div style={{ fontSize:64 }}>🏆</div>
          <h2 style={{ fontFamily:'var(--font-d)', fontSize:44, color:'var(--gold)', letterSpacing:'.05em', marginTop:8 }}>AUCTION COMPLETE</h2>
          <p style={{ color:'var(--text2)', marginTop:6 }}>All players have been auctioned!</p>
        </div>
        <div style={{ padding:'0 16px', display:'flex', flexDirection:'column', gap:10 }}>
          {leaderboard.map((e,i) => (
            <div key={e.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px', background:i===0?'rgba(245,200,66,.08)':'var(--bg3)', border:`1px solid ${i===0?'rgba(245,200,66,.35)':'var(--border)'}`, borderRadius:12 }}>
              <span style={{ fontSize:24, width:34, textAlign:'center' }}>{medals[i]||`#${i+1}`}</span>
              <div style={{ width:38, height:38, borderRadius:'50%', background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:16 }}>{e.username[0].toUpperCase()}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:15 }}>{e.username}</div>
                <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>{e.teamCount} players · Spent {fmtL(e.spent)}</div>
                {e.scores && (
                  <div style={{ display:'flex', gap:6, marginTop:4, flexWrap:'wrap' }}>
                    {[['⚔️',e.scores.strength,'#f5c842'],['💎',e.scores.efficiency,'#2ecc71'],['⚖️',e.scores.balance,'#3b82f6'],['⚡',e.scores.clutch,'#e05a2b']].map(([icon,val,col])=>(
                      <span key={icon} style={{ fontSize:11, color:col, fontWeight:600 }}>{icon}{val}</span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                {e.scores ? (
                  <>
                    <div style={{ fontFamily:'var(--font-d)', color:'var(--gold)', fontWeight:700, fontSize:26, lineHeight:1 }}>{e.scores.final}</div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>final score</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontFamily:'var(--font-m)', color:'var(--gold)', fontWeight:700, fontSize:16 }}>{fmtL(e.budget)}</div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>remaining</div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Save for IPL season — host only */}
        {isHost && (
          <div style={{ margin:'0 16px', padding:'16px', background:'rgba(245,200,66,.08)', border:'1px solid rgba(245,200,66,.25)', borderRadius:12 }}>
            <div style={{ fontWeight:700, fontSize:15, color:'var(--gold)', marginBottom:6 }}>🏏 Continue as IPL Fantasy League?</div>
            <p style={{ fontSize:13, color:'var(--text2)', marginBottom:12, lineHeight:1.5 }}>
              Save this room for the whole IPL season. Your squads will automatically earn fantasy points after every match you add!
            </p>
            <button onClick={onSaveForSeason} disabled={isSaving} className="btn btn-gold btn-full">
              {isSaving ? '⏳ Saving…' : '🏆 Yes! Save for IPL Season'}
            </button>
          </div>
        )}

        <div style={{ padding:'16px 16px 24px', display:'flex', flexDirection:'column', gap:10, marginTop:8 }}>
          <button onClick={onStats}  className="btn btn-outline btn-full">📊 View Team Stats & Achievements</button>
          <button onClick={onLobby} className="btn btn-ghost btn-full">🏠 Back to Lobby (don't save)</button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function AuctionPage() {
  const { code } = useParams();
  const { user } = useAuth();
  const nav      = useNavigate();

  const [state,       setState]       = useState(null);
  const [timer,       setTimer]       = useState(0);
  const [timerTotal,  setTimerTotal]  = useState(30);
  const [result,      setResult]      = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [isSaving,    setIsSaving]    = useState(false);
  const [chat,        setChat]        = useState([]);
  const [msg,         setMsg]         = useState('');
  const [bidErr,      setBidErr]      = useState('');
  const [suggestion,  setSuggestion]  = useState(null);
  const [paused,      setPaused]      = useState(false);
  const [joined,      setJoined]      = useState(false);
  const [outbid,      setOutbid]      = useState(false);
  const [bidWar,      setBidWar]      = useState(false);
  const [confetti,    setConfetti]    = useState(false);
  const [isNewItem,   setIsNewItem]   = useState(false);
  const [soundOn,     setSoundOn]     = useState(true);
  const [news,        setNews]        = useState([]);
  const [rightTab,    setRightTab]    = useState('chat');
  const [leftTab,     setLeftTab]     = useState('teams');
  const [bidAnalytics,setBidAnalytics]= useState(null); // hint + clutch from server

  const chatRef     = useRef(null);
  const bidCount    = useRef(0);
  const bidWarTimer = useRef(null);
  const stateRef    = useRef(null);
  stateRef.current  = state;

  const myId   = user?._id;
  const me     = state?.players?.find(p => p.id === myId);
  const isHost = me?.isHost || false;
  const sound  = useCallback(fn => { if (soundOn) try { fn(); } catch {} }, [soundOn]);

  useEffect(() => {
    if (!user) return;
    const s = connectSocket();
    s.emit('room:join', { roomCode:code.toUpperCase(), userId:user._id, username:user.username }, res => {
      if (res?.ok) { setState(res.state); setTimerTotal(res.state?.settings?.timerSeconds||30); setJoined(true); }
    });
    s.on('room:joined',     ({ state:st }) => { setState(st); setTimerTotal(st.settings?.timerSeconds||30); setTimer(st.settings?.timerSeconds||30); setJoined(true); });
    s.on('room:updated',    ({ state:st }) => setState(st));
    s.on('auction:started', ({ state:st }) => {
      setState(st); setResult(null); setPaused(false);
      const secs = st.settings?.timerSeconds||30;
      setTimerTotal(secs);
      setTimer(secs); // ← CRITICAL: set timer display immediately
      setIsNewItem(true); setTimeout(()=>setIsNewItem(false),800);
      sound(()=>SoundEngine.start());
      const item = st.items?.[st.currentIndex||0];
      setNews(n => [...n, makeNews('start', `🏏 Auction started!`, `First up: ${item?.name} (Base: ${fmtL(item?.basePrice)})`)]);
    });
    s.on('bid:new', ({ state:st, timerReset, analytics }) => {
      const prev = stateRef.current?.currentBidderId;
      setState(st); setBidErr(''); setSuggestion(null);
      sound(()=>SoundEngine.bid());
      if (timerReset) setTimer(timerReset);
      if (analytics) setBidAnalytics(analytics);
      if (prev===myId && st.currentBidderId!==myId) { setOutbid(true); sound(()=>SoundEngine.outbid()); setTimeout(()=>setOutbid(false),3000); }
      bidCount.current++;
      clearTimeout(bidWarTimer.current);
      if (bidCount.current >= 3) { setBidWar(true); sound(()=>SoundEngine.bidWar()); bidWarTimer.current=setTimeout(()=>{setBidWar(false);bidCount.current=0;},4000); }
      else { bidWarTimer.current=setTimeout(()=>{bidCount.current=0;},8000); }
      // Add bid news
      const item = st.items?.[st.currentIndex];
      setNews(n => [...n, makeNews('bid', `${st.currentBidderName} bids ${fmtL(st.currentBid)}`, `on ${item?.name}`)]);
    });
    s.on('timer', ({ left }) => { setTimer(left); if ([10,5,3].includes(left)) sound(()=>SoundEngine.tick()); });
    s.on('round:closed', ({ result:r, state:st }) => {
      setState(st); setResult(r); setPaused(false); setBidWar(false); bidCount.current=0;
      if (r.type==='sold') {
        sound(()=>SoundEngine.sold());
        setNews(n => [...n, makeNews('sold',
          `🔨 ${r.item?.name} SOLD to ${r.winner}`,
          `${r.bids} bid${r.bids!==1?'s':''} · Final price: ${fmtL(r.price)}`,
          { price: fmtL(r.price) }
        )]);
        if (r.winner===user?.username) { setConfetti(true); sound(()=>SoundEngine.win()); setTimeout(()=>setConfetti(false),4000); setLeftTab("squad"); }
        // Auto switch to news tab on sold
        setRightTab('news');
      } else {
        sound(()=>SoundEngine.unsold());
        setNews(n => [...n, makeNews('unsold',
          `❌ ${r.item?.name} goes UNSOLD`,
          'No bids were placed for this player'
        )]);
      }
    });
    s.on('item:next', ({ state:st }) => {
      setState(st); setResult(null); setPaused(false);
      setTimer(st.settings?.timerSeconds||30);
      setIsNewItem(true); setTimeout(()=>setIsNewItem(false),800);
      sound(()=>SoundEngine.next());
      const item = st.items?.[st.currentIndex];
      setNews(n => [...n, makeNews('next',
        `➡️ Now bidding: ${item?.name}`,
        `${item?.role} · ${item?.team} · Base: ${fmtL(item?.basePrice)}`
      )]);
    });
    s.on('auction:paused',   ()          => setPaused(true));
    s.on('auction:resumed',  ({state:st})=> { setState(st); setPaused(false); const secs=st.settings?.timerSeconds||30; setTimer(secs); setTimerTotal(secs); });
    s.on('auction:complete', ({leaderboard:lb}) => { setLeaderboard(lb); setResult(null); setConfetti(true); sound(()=>SoundEngine.win()); setTimeout(()=>setConfetti(false),5000); });
    s.on('chat:msg', m => setChat(c=>[...c.slice(-99),m]));

    // Auto re-join on reconnect (handles Render cold starts / network drops)
    s.on('connect', () => {
      s.emit('room:join', { roomCode:code.toUpperCase(), userId:user._id, username:user.username }, res => {
        if (res?.ok) { setState(res.state); setTimerTotal(res.state?.settings?.timerSeconds||30); setJoined(true); }
      });
    });

    return () => ['room:joined','room:updated','auction:started','bid:new','timer','round:closed','item:next','auction:paused','auction:resumed','auction:complete','chat:msg','connect'].forEach(e=>s.off(e));
  }, [code, user]);

  useEffect(() => { chatRef.current?.scrollIntoView({behavior:'smooth'}); }, [chat]);

  const placeBid = useCallback(amount => { setBidErr(''); getSocket().emit('bid:place',{amount},res=>{ if(!res?.ok) setBidErr(res?.error||'Bid failed'); }); }, []);
  const getSugg  = () => getSocket().emit('bid:suggest',{},res=>setSuggestion(res?.suggestion||null));
  const sendChat = e => { e.preventDefault(); if(!msg.trim()) return; getSocket().emit('chat:send',{message:msg.trim()}); setMsg(''); };

  const saveForSeason = useCallback(async () => {
    if (!leaderboard || !state) return;
    setIsSaving(true);
    try {
      // Build squads from leaderboard data
      const squads = leaderboard.map(e => ({
        userId:   e.id,
        username: e.username,
        players:  e.team || [],
      }));
      const API = process.env.REACT_APP_API_URL || 'https://auction-app-m9xw.onrender.com/api';
      await fetch(`${API}/rooms/${code}/save-for-season`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ squads }),
      });
      nav(`/season-room/${code}`);
    } catch(e) { console.error(e); }
    finally { setIsSaving(false); }
  }, [leaderboard, state, code, nav]);
  const hostSold   = () => getSocket().emit('host:sold',{});
  const hostUnsold = () => getSocket().emit('host:unsold',{});
  const hostNext   = () => getSocket().emit('host:next',{});
  const hostPause  = () => getSocket().emit('host:pause',{});
  const hostResume = () => getSocket().emit('host:resume',{});

  if (!joined) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <AnimatedBg phase="waiting" />
      <div className="spin" style={{ width:48,height:48,border:'3px solid var(--border2)',borderTopColor:'var(--gold)',borderRadius:'50%',position:'relative',zIndex:1 }} />
      <p style={{ color:'var(--text2)',position:'relative',zIndex:1 }}>Connecting to auction…</p>
    </div>
  );

  const bidders    = state?.players?.filter(p=>!p.isHost)||[];
  const itemIdx    = state?.currentIndex||0;
  const total      = state?.items?.length||18;
  const currentItem= state?.items?.[itemIdx];
  const lastBid    = state?.bidHistory?.[state.bidHistory.length-1];

  return (
    <div style={as.page}>
      <AnimatedBg phase={state?.phase} />
      <Confetti active={confetti} />

      <header style={as.header}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <span style={{ fontSize:20 }}>🏏</span>
          <span style={{ fontFamily:'var(--font-m)', fontSize:16, color:'var(--gold)', letterSpacing:'.12em' }}>{code}</span>
          <div style={{ width:8,height:8,borderRadius:'50%',background:joined?'var(--green)':'var(--red)',boxShadow:joined?'0 0 8px var(--green)':'none' }} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, flex:1 }}>
          <span style={{ fontSize:12, color:'var(--text2)' }}>Player <strong style={{ color:'var(--gold)' }}>{itemIdx+1}</strong> of {total}</span>
          <div style={{ width:'100%', maxWidth:260, height:4, background:'var(--border2)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', background:'linear-gradient(90deg,var(--gold2),var(--gold))', borderRadius:2, transition:'width .5s', boxShadow:'0 0 8px rgba(245,200,66,.4)', width:`${(itemIdx/Math.max(total,1))*100}%` }} />
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={()=>setSoundOn(v=>!v)} className="btn btn-ghost btn-sm">{soundOn?'🔊':'🔇'}</button>
          <button onClick={() => {
            getSocket().emit('room:join', { roomCode:code.toUpperCase(), userId:user?._id, username:user?.username }, res => {
              if (res?.ok) { setState(res.state); setTimerTotal(res.state?.settings?.timerSeconds||30); }
            });
          }} className="btn btn-ghost btn-sm" title="Re-sync if stuck">🔄</button>
          {isHost && state?.phase==='bidding' && !paused && <button onClick={hostPause} className="btn btn-ghost btn-sm">⏸</button>}
          {isHost && paused && <button onClick={hostResume} className="btn btn-gold btn-sm">▶ Resume</button>}
          <span style={{ fontSize:11,color:'var(--text3)',letterSpacing:'.1em',textTransform:'uppercase' }}>{paused?'⏸ PAUSED':state?.phase?.toUpperCase()}</span>
        </div>
      </header>

      <div style={as.main}>
        {/* Left: Teams + My Squad tabs */}
        <aside style={{ overflow:'hidden', minHeight:0, maxHeight:'100%', display:'flex', flexDirection:'column' }}>
          <div className="card" style={{ flex:1, display:'flex', flexDirection:'column', position:'relative', zIndex:1, overflow:'hidden', minHeight:0 }}>

            {/* Tab switcher */}
            <div style={{ display:'flex', background:'var(--bg3)', borderRadius:8, padding:3, marginBottom:12, gap:3, flexShrink:0 }}>
              {[['teams','👥'],['squad','🏏'],['players','📋']].map(([id,label]) => {
                const pending = state?.items?.filter(i=>i.status==='pending').length || 0;
                return (
                  <button key={id} onClick={() => setLeftTab(id)}
                    style={{ flex:1, padding:'7px 0', border:'none', background:leftTab===id?'var(--surface2)':'transparent', color:leftTab===id?'var(--text)':'var(--text2)', cursor:'pointer', borderRadius:6, fontSize:13, fontWeight:600, fontFamily:'var(--font-b)', transition:'all 150ms', position:'relative' }}
                    title={id==='teams'?'Teams':id==='squad'?'My Squad':'Players List'}>
                    {label}
                    {id==='squad' && me?.team?.length > 0 && (
                      <span style={{ position:'absolute', top:2, right:2, fontSize:9, background:'var(--gold)', color:'#000', borderRadius:100, padding:'0 4px', fontWeight:700 }}>{me.team.length}</span>
                    )}
                    {id==='players' && (
                      <span style={{ position:'absolute', top:2, right:2, fontSize:9, background:'var(--surface2)', color:'var(--text3)', borderRadius:100, padding:'0 4px' }}>{pending}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Teams tab */}
            {leftTab === 'teams' && (
              <div style={{ flex:1, overflowY:'auto', minHeight:0 }}>
                {bidders.map(p => {
                  const pct  = (p.budget/(state?.settings?.startingBudget||1000))*100;
                  const lead = p.id===state?.currentBidderId;
                  const isMe2= p.id===myId;
                  return (
                    <div key={p.id} style={{ display:'flex', gap:10, alignItems:'center', padding:'9px 10px', borderRadius:10, background:lead?'rgba(245,200,66,.05)':'var(--bg3)', border:`1px solid ${lead?'rgba(245,200,66,.4)':isMe2?'rgba(59,130,246,.3)':'var(--border)'}`, marginBottom:8, position:'relative', transition:'all 200ms' }}>
                      {lead && <div className="pulse" style={{ position:'absolute', left:-4, top:'50%', transform:'translateY(-50%)', width:8, height:8, borderRadius:'50%', background:'var(--gold)', boxShadow:'0 0 10px var(--gold)' }} />}
                      <div style={{ width:34,height:34,borderRadius:'50%',background:lead?'var(--gold-dim)':'var(--surface2)',color:lead?'var(--gold)':'var(--text2)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,flexShrink:0,border:lead?'1px solid var(--gold)':'none' }}>{p.username[0].toUpperCase()}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontWeight:600, fontSize:13 }}>{p.username}{isMe2&&<span style={{ fontSize:10,color:'var(--blue)',marginLeft:5,background:'rgba(59,130,246,.2)',padding:'1px 5px',borderRadius:3 }}>you</span>}</span>
                          {lead&&<span style={{ fontSize:10,color:'var(--gold)',fontWeight:700,letterSpacing:'.05em' }}>LEADING</span>}
                        </div>
                        <div style={{ fontSize:11,color:'var(--text2)',marginTop:1 }}>{fmtL(p.budget)} · {p.team?.length||0} 🏏</div>
                        <div style={{ height:3,background:'var(--border2)',borderRadius:2,marginTop:5,overflow:'hidden' }}>
                          <div style={{ height:'100%',borderRadius:2,transition:'width .5s',background:pct>50?'var(--green)':pct>25?'var(--gold)':'var(--red)',width:`${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* My Squad tab */}
            {leftTab === 'squad' && (
              <div style={{ flex:1, overflowY:'auto', minHeight:0 }}>
                {!me?.team?.length ? (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'30px 0', gap:10, color:'var(--text3)' }}>
                    <span style={{ fontSize:36 }}>🏏</span>
                    <p style={{ fontSize:13, textAlign:'center' }}>No players yet.<br/>Win a bid to build your squad!</p>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {/* Budget summary */}
                    <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 10px', background:'var(--bg3)', borderRadius:8, marginBottom:4 }}>
                      <div style={{ fontSize:12, color:'var(--text2)' }}>
                        <span style={{ color:'var(--gold)', fontWeight:700 }}>{me.team.length}</span> players
                      </div>
                      <div style={{ fontSize:12, color:'var(--text2)' }}>
                        Spent <span style={{ color:'var(--red)', fontWeight:700 }}>{fmtL((state?.settings?.startingBudget||1000) - me.budget)}</span>
                      </div>
                      <div style={{ fontSize:12, color:'var(--text2)' }}>
                        Left <span style={{ color:'var(--green)', fontWeight:700 }}>{fmtL(me.budget)}</span>
                      </div>
                    </div>

                    {/* Player cards */}
                    {me.team.map((player, i) => {
                      const rc = roleColor[player.role] || '#9898b0';
                      const isBargin = player.boughtFor <= player.basePrice;
                      return (
                        <div key={i} style={{ padding:'10px 12px', borderRadius:10, background:'var(--bg3)', border:`1px solid ${rc}30`, position:'relative', overflow:'hidden' }}>
                          <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse at 0% 50%, ${rc}10, transparent 60%)`, pointerEvents:'none' }} />
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            {/* Avatar */}
                            <div style={{ width:34, height:34, borderRadius:8, background:`${rc}20`, color:rc, border:`1px solid ${rc}40`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, flexShrink:0 }}>
                              {player.image || player.name?.[0]}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontWeight:700, fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{player.name}</div>
                              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                                <span style={{ fontSize:10, padding:'1px 6px', borderRadius:100, background:`${rc}20`, color:rc, fontWeight:700 }}>{player.role}</span>
                                <span style={{ fontSize:10, color:'var(--text3)' }}>{player.team}</span>
                              </div>
                            </div>
                            <div style={{ textAlign:'right', flexShrink:0 }}>
                              <div style={{ fontFamily:'var(--font-d)', fontSize:16, color:'var(--gold)', lineHeight:1 }}>{fmtL(player.boughtFor)}</div>
                              <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>base {fmtL(player.basePrice)}</div>
                              {isBargin && <div style={{ fontSize:9, color:'var(--green)', fontWeight:700, marginTop:2 }}>💎 BARGAIN</div>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Players tab */}
            {leftTab === 'players' && (
              <div style={{ flex:1, overflowY:'auto', minHeight:0 }}>
                {(() => {
                  const all      = state?.items || [];
                  const idx      = state?.currentIndex || 0;
                  const sold     = all.filter(i => i.status === 'sold');
                  const unsold   = all.filter(i => i.status === 'unsold');
                  const pending  = all.filter(i => i.status === 'pending');
                  const current  = all[idx];

                  // Sort alphabetically by team then name — hides auction order
                  const sorted = [...all].sort((a, b) =>
                    a.team.localeCompare(b.team) || a.name.localeCompare(b.name)
                  );

                  return (
                    <>
                      {/* Summary */}
                      <div style={{ display:'flex', gap:6, marginBottom:10 }}>
                        {[
                          [pending.length,  'Remaining', 'var(--text)'],
                          [sold.length,     'Sold',      'var(--gold)'],
                          [unsold.length,   'Unsold',    'var(--text3)'],
                        ].map(([val, label, color]) => (
                          <div key={label} style={{ flex:1, textAlign:'center', padding:'6px 4px', background:'var(--bg3)', borderRadius:8 }}>
                            <div style={{ fontFamily:'var(--font-d)', fontSize:18, color, lineHeight:1 }}>{val}</div>
                            <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>{label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Current player highlight */}
                      {current && state?.phase === 'bidding' && (
                        <div style={{ padding:'8px 10px', borderRadius:8, background:'rgba(245,200,66,.08)', border:'1px solid rgba(245,200,66,.3)', marginBottom:8 }}>
                          <div style={{ fontSize:10, color:'var(--gold)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>🔴 Now Bidding</div>
                          <div style={{ fontWeight:700, fontSize:13 }}>{current.name}</div>
                          <div style={{ fontSize:11, color:'var(--text2)' }}>{current.role} · {current.team}</div>
                        </div>
                      )}

                      {/* All players sorted by team — auction order hidden */}
                      {sorted.map((item, i) => {
                        const rc        = roleColor[item.role] || '#9898b0';
                        const isCurrent = item.name === current?.name;
                        const isSold    = item.status === 'sold';
                        const isUnsold  = item.status === 'unsold';
                        const isPending = item.status === 'pending' && !isCurrent;
                        return (
                          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:8, marginBottom:5, transition:'all 200ms', background:isCurrent?'rgba(245,200,66,.07)':isSold?'rgba(46,204,113,.04)':'var(--bg3)', border:`1px solid ${isCurrent?'rgba(245,200,66,.4)':isSold?'rgba(46,204,113,.2)':'var(--border)'}`, opacity:isUnsold?0.5:1 }}>
                            <span style={{ fontSize:12, flexShrink:0, width:16 }}>
                              {isCurrent ? '🔴' : isSold ? '✅' : isUnsold ? '❌' : ''}
                            </span>
                            <div style={{ width:26, height:26, borderRadius:6, background:`${rc}20`, color:rc, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:10, flexShrink:0 }}>
                              {item.image||item.name?.[0]}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:12, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', color:isCurrent?'var(--gold)':'var(--text)' }}>{item.name}</div>
                              <div style={{ fontSize:10, color:'var(--text3)' }}>{item.role} · {item.team}</div>
                            </div>
                            <div style={{ textAlign:'right', flexShrink:0 }}>
                              {isSold ? (
                                <>
                                  <div style={{ fontSize:11, fontFamily:'var(--font-m)', color:'var(--green)', fontWeight:700 }}>{fmtL(item.soldFor)}</div>
                                  <div style={{ fontSize:9, color:'var(--text3)', maxWidth:55, overflow:'hidden', textOverflow:'ellipsis' }}>{item.soldTo}</div>
                                </>
                              ) : (
                                <div style={{ fontSize:11, color:'var(--text3)' }}>{fmtL(item.basePrice)}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </aside>

        {/* Center */}
        <main style={{ display:'flex', flexDirection:'column', gap:12, overflow:'auto', position:'relative', zIndex:1, minHeight:0, maxHeight:'100%' }}>
          {paused && <div style={{ padding:'10px 16px', borderRadius:10, background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text2)', textAlign:'center', fontSize:14 }}>⏸ Auction paused by host</div>}
          {state?.phase==='bidding' && !paused && <div style={{ padding:'10px 16px', borderRadius:10, background:'rgba(231,76,60,.08)', border:'1px solid rgba(231,76,60,.25)', color:'#ff7875', fontSize:14, fontWeight:600, textAlign:'center' }}>🔴 LIVE — Everyone can bid! Highest bid wins when timer ends!</div>}
          <OutbidAlert show={outbid} />
          <BidWarBanner show={bidWar} />
          <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
            {state?.phase==='bidding' && !paused && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                <TimerRing left={timer} total={timerTotal} />
                <GavelText left={timer} />
              </div>
            )}
            <div style={{ flex:1 }}><PlayerCard item={currentItem} currentBid={state?.currentBid||0} currentBidder={state?.currentBidderName} isNew={isNewItem} /></div>
          </div>
          {/* Last bid notification */}
          {state?.phase==='bidding' && lastBid && (
            <div key={lastBid.time} className="pop-in" style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', background:'rgba(46,204,113,.08)', border:'1px solid rgba(46,204,113,.2)', borderRadius:8 }}>
              <div style={{ width:28,height:28,borderRadius:'50%',background:'var(--gold-dim)',color:'var(--gold)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:13,flexShrink:0 }}>{lastBid.username?.[0]?.toUpperCase()}</div>
              <span style={{ color:'var(--gold)',fontWeight:700 }}>{lastBid.username}</span>
              <span style={{ color:'var(--text2)',fontSize:13 }}>bid</span>
              <span style={{ color:'var(--green)',fontWeight:700,fontFamily:'var(--font-m)' }}>{fmtL(lastBid.amount)}</span>
            </div>
          )}
          {/* Bid history */}
          {state?.bidHistory?.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', padding:'10px 14px', background:'var(--bg3)', borderRadius:10 }}>
              <span style={{ fontSize:11,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.06em',flexShrink:0 }}>Bids</span>
              {[...state.bidHistory].reverse().slice(0,5).map((b,i)=>(
                <div key={i} style={{ display:'flex',gap:6,padding:'4px 10px',background:b.username===user?.username?'rgba(245,200,66,.1)':'var(--surface)',borderRadius:6,fontSize:13,opacity:1-i*.16 }}>
                  <span style={{ color:'var(--gold)',fontWeight:700 }}>{b.username}</span>
                  <span style={{ color:'var(--text2)',fontFamily:'var(--font-m)',fontSize:12 }}>{fmtL(b.amount)}</span>
                </div>
              ))}
            </div>
          )}
          {bidErr && <div style={{ padding:'8px 14px',background:'rgba(231,76,60,.1)',border:'1px solid rgba(231,76,60,.3)',borderRadius:8,color:'var(--red)',fontSize:13 }}>⚠ {bidErr}</div>}
          {!isHost && state?.phase==='bidding' && !paused && (
            <div className="card" style={{ border:'1px solid var(--border2)' }}>
              <BidPanel state={state} myId={myId} onBid={placeBid} onSuggest={getSugg} suggestion={suggestion} error={bidErr} />
            </div>
          )}
          {/* Live Analytics — shows below bid controls for non-host */}
          {!isHost && state?.phase==='bidding' && !paused && (
            <div className="card" style={{ border:'1px solid rgba(59,130,246,.2)' }}>
              <AnalyticsPanel state={state} myId={myId} bidAnalytics={bidAnalytics} />
            </div>
          )}
          {isHost && state?.phase==='bidding' && !paused && (
            <div className="card" style={{ border:'1px solid rgba(245,200,66,.25)' }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
                <span style={{ background:'var(--gold-dim)',color:'var(--gold)',padding:'4px 10px',borderRadius:6,fontSize:12,fontWeight:700 }}>👑 AUCTIONEER</span>
                <span style={{ color:'var(--text2)',fontSize:13 }}>{state.currentBid>0?`Highest: ${fmtL(state.currentBid)} — ${state.currentBidderName}`:'No bids yet'}</span>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={hostSold} disabled={!state.currentBidderId} className="btn btn-gold" style={{ flex:1,padding:'14px',fontSize:15 }}>🔨 SOLD — {state.currentBid>0?fmtL(state.currentBid):'No bids'}</button>
                <button onClick={hostUnsold} className="btn btn-red" style={{ flex:1,padding:'14px',fontSize:15 }}>❌ UNSOLD</button>
              </div>
              <p style={{ textAlign:'center',fontSize:12,color:'var(--text3)',marginTop:10 }}>Or wait for timer to auto-close the round</p>
            </div>
          )}
          {isHost && (state?.phase==='sold'||state?.phase==='unsold') && (
            <div className="card" style={{ border:'1px solid rgba(245,200,66,.25)' }}>
              <button onClick={hostNext} className="btn btn-gold btn-full btn-lg">Next Player →</button>
            </div>
          )}
          {/* ── Emergency recover — shows when game appears stuck ── */}
          {isHost && (
            <div style={{ display:'flex', gap:8 }}>
              {/* Force close if stuck in bidding with no timer response */}
              {state?.phase==='bidding' && (
                <button onClick={hostUnsold} className="btn btn-ghost btn-sm" style={{ flex:1, fontSize:11, color:'var(--text3)' }}>
                  ⚠️ Force Close Round
                </button>
              )}
              {/* Force next if stuck in sold/unsold */}
              {(state?.phase==='sold'||state?.phase==='unsold') && (
                <button onClick={hostNext} className="btn btn-ghost btn-sm" style={{ flex:1, fontSize:11, color:'var(--text3)' }}>
                  ⚠️ Force Next Player
                </button>
              )}
            </div>
          )}
        </main>

        {/* Right: Chat/News tabs */}
        <aside style={{ overflow:'hidden', minHeight:0, maxHeight:'100%', display:'flex', flexDirection:'column', gap:10 }}>
          {/* Voice Chat */}
          <div className="card" style={{ flexShrink:0, border:'1px solid rgba(46,204,113,.2)' }}>
            <VoiceChat
              roomCode={code?.toUpperCase()}
              userId={user?._id}
              username={user?.username}
            />
          </div>
          {/* Chat + News tabs */}
          <div className="card" style={{ flex:1, display:'flex', flexDirection:'column', position:'relative', zIndex:1, overflow:'hidden', minHeight:0 }}>
            {/* Tab switcher */}
            <div style={{ display:'flex', background:'var(--bg3)', borderRadius:8, padding:3, marginBottom:12, gap:3, flexShrink:0 }}>
              {[['chat','💬 Chat'],['news','📰 News']].map(([id,label]) => (
                <button key={id}
                  onClick={() => setRightTab(id)}
                  style={{ flex:1, padding:'7px 0', border:'none', background:rightTab===id?'var(--surface2)':'transparent', color:rightTab===id?'var(--text)':'var(--text2)', cursor:'pointer', borderRadius:6, fontSize:13, fontWeight:600, fontFamily:'var(--font-b)', transition:'all 150ms', position:'relative' }}>
                  {label}
                  {id==='news' && news.length > 0 && (
                    <span style={{ position:'absolute', top:2, right:6, width:8, height:8, borderRadius:'50%', background:'var(--red)', boxShadow:'0 0 6px var(--red)' }} />
                  )}
                </button>
              ))}
            </div>

            {/* Chat tab — fixed height, internal scroll */}
            {rightTab === 'chat' && (
              <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0, overflow:'hidden' }}>
                <div style={{ flex:1, overflowY:'auto', minHeight:0, paddingRight:4 }}>
                  {chat.filter(m => m.type === 'user').length === 0 && (
                    <p style={{ color:'var(--text3)',fontSize:12,textAlign:'center',padding:'20px 0' }}>Chat is quiet… say something!</p>
                  )}
                  {chat.filter(m => m.type === 'user').map((m,i) => {
                    const isMe2 = m.username === user?.username;
                    return (
                      <div key={i} style={{ display:'flex', flexDirection:isMe2?'row-reverse':'row', gap:6, alignItems:'flex-end', marginBottom:6 }}>
                        {!isMe2 && <div style={{ width:24,height:24,borderRadius:'50%',background:'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0 }}>{m.username?.[0]?.toUpperCase()}</div>}
                        <div style={{ maxWidth:'78%',padding:'8px 12px',borderRadius:10,background:isMe2?'var(--gold-dim)':'var(--surface2)',border:isMe2?'1px solid rgba(245,200,66,.25)':'none' }}>
                          {!isMe2 && <div style={{ fontSize:10,color:'var(--gold)',fontWeight:700,marginBottom:2 }}>{m.username}</div>}
                          <div style={{ fontSize:13, lineHeight:1.4 }}>{m.message}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatRef} />
                </div>
                <form onSubmit={sendChat} style={{ display:'flex',gap:8,paddingTop:10,borderTop:'1px solid var(--border)',flexShrink:0,marginTop:'auto' }}>
                  <input value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Say something…" maxLength={300} className="input" style={{ fontSize:13 }} />
                  <button type="submit" disabled={!msg.trim()} className="btn btn-outline btn-sm">↑</button>
                </form>
              </div>
            )}

            {/* News tab — fixed height, internal scroll */}
            {rightTab === 'news' && (
              <div style={{ flex:1, minHeight:0, overflow:'hidden' }}>
                <NewsPanel news={news} />
              </div>
            )}
          </div>
        </aside>
      </div>

      {result     && <ResultOverlay result={result} isHost={isHost} onNext={hostNext} />}
      {leaderboard && <Leaderboard leaderboard={leaderboard} state={state} isHost={isHost} code={code} isSaving={isSaving} onSaveForSeason={saveForSeason} onStats={()=>nav("/stats",{state:{leaderboard,settings:state?.settings,roomCode:code}})} onLobby={()=>nav("/")} />}
    </div>
  );
}

const as = {
  page:   { minHeight:'100vh', display:'flex', flexDirection:'column', position:'relative', overflow:'hidden' },
  header: { position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 20px', borderBottom:'1px solid var(--border)', background:'rgba(10,10,15,.92)', backdropFilter:'blur(16px)', gap:16, flexShrink:0 },
  main:   { position:'relative', zIndex:1, display:'grid', gridTemplateColumns:'240px 1fr 280px', gridTemplateRows:'1fr', alignItems:'stretch', gap:14, padding:14, height:'calc(100vh - 57px)', maxHeight:'calc(100vh - 57px)', overflow:'hidden' },
};
