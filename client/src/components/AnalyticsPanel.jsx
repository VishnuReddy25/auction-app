import React, { useEffect, useState } from 'react';
import { getSocket } from '../services';

const fmtL = v => { if (!v&&v!==0) return '—'; if (v>=100) return `₹${(v/100).toFixed(1)}Cr`; return `₹${v}L`; };

export default function AnalyticsPanel({ state, myId, bidAnalytics }) {
  const [myAnalytics, setMyAnalytics] = useState(null);

  useEffect(() => {
    if (!myId) return;
    getSocket().emit('analytics:get', {}, res => {
      if (res?.analytics) setMyAnalytics(res.analytics);
    });
  }, [state?.currentIndex, myId]);

  const me = state?.players?.find(p => p.id === myId);
  if (!me || me.isHost) return null;

  const pct        = (me.budget / (state?.settings?.startingBudget || 1000)) * 100;
  const remaining  = state?.items?.filter(i => i.status === 'pending').length || 0;
  const budgetColor= pct > 50 ? '#2ecc71' : pct > 25 ? '#f5c842' : '#e74c3c';

  return (
    <div style={s.wrap}>
      <div style={s.header}>⚡ Live Analytics</div>

      {/* Budget gauge */}
      <div style={s.card}>
        <div style={s.cardTop}>
          <span style={s.cardLabel}>Budget Remaining</span>
          <span style={{ fontFamily:'var(--font-m)', color:budgetColor, fontWeight:700 }}>{fmtL(me.budget)}</span>
        </div>
        <div style={s.track}>
          <div style={{ ...s.fill, width:`${pct}%`, background:budgetColor }} />
        </div>
        <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>
          {remaining} players left · Avg base: {fmtL(Math.round((state?.items?.reduce((s,i)=>s+(i.basePrice||0),0)||0)/Math.max(state?.items?.length||1,1)))}
        </div>
      </div>

      {/* Current bid hint */}
      {bidAnalytics?.hint && (
        <div style={{ ...s.hint, borderColor:`${bidAnalytics.hint.color}40`, background:`${bidAnalytics.hint.color}10` }}>
          <span style={{ color:bidAnalytics.hint.color, fontWeight:700, fontSize:14 }}>{bidAnalytics.hint.label}</span>
        </div>
      )}

      {/* Clutch indicator */}
      {bidAnalytics?.isClutch && (
        <div style={s.clutch} className="pulse">
          ⚡ CLUTCH BID — +10 points if you win!
        </div>
      )}

      {/* Team snapshot */}
      {myAnalytics && (
        <div style={s.card}>
          <div style={s.cardLabel}>Your Team Strength</div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <MiniMeter label="Strength"  val={myAnalytics.strength}   color="#f5c842" />
            <MiniMeter label="Balance"   val={myAnalytics.balance}    color="#3b82f6" />
            <MiniMeter label="Efficiency" val={myAnalytics.efficiency} color="#2ecc71" />
          </div>
          {myAnalytics.missingRoles?.length > 0 && (
            <div style={s.missing}>
              ⚠️ Missing: {myAnalytics.missingRoles.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniMeter({ label, val, color }) {
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
      <div style={{ display:'flex', justifyContent:'space-between' }}>
        <span style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.04em' }}>{label}</span>
        <span style={{ fontSize:11, fontWeight:700, color }}>{val}</span>
      </div>
      <div style={{ height:4, background:'var(--border2)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:2, background:color, width:`${val}%`, transition:'width .5s', boxShadow:`0 0 4px ${color}80` }} />
      </div>
    </div>
  );
}

const s = {
  wrap:     { display:'flex', flexDirection:'column', gap:8 },
  header:   { fontFamily:'var(--font-d)', fontSize:16, letterSpacing:'.03em', color:'var(--text2)' },
  card:     { background:'var(--bg3)', borderRadius:10, padding:'10px 12px' },
  cardTop:  { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 },
  cardLabel:{ fontSize:12, color:'var(--text2)' },
  track:    { height:5, background:'var(--border2)', borderRadius:3, overflow:'hidden' },
  fill:     { height:'100%', borderRadius:3, transition:'width .5s' },
  hint:     { padding:'8px 12px', borderRadius:8, border:'1px solid', textAlign:'center' },
  clutch:   { padding:'8px 12px', background:'rgba(224,90,43,.15)', border:'1px solid rgba(224,90,43,.4)', borderRadius:8, color:'#e05a2b', fontSize:13, fontWeight:700, textAlign:'center' },
  missing:  { fontSize:12, color:'#e05a2b', marginTop:8 },
};
