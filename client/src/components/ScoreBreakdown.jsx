import React from 'react';

function ScoreBar({ label, value, weight, color }) {
  return (
    <div style={s.row}>
      <div style={s.labelRow}>
        <span style={s.label}>{label}</span>
        <span style={s.weight}>{weight}</span>
        <span style={{ ...s.value, color }}>{value}/100</span>
      </div>
      <div style={s.track}>
        <div style={{ ...s.fill, width:`${value}%`, background:color, boxShadow:`0 0 8px ${color}60` }} />
      </div>
    </div>
  );
}

export default function ScoreBreakdown({ scores, username }) {
  if (!scores) return null;

  const { final, strength, efficiency, balance, clutch } = scores;

  const grade = final >= 80 ? 'S' : final >= 65 ? 'A' : final >= 50 ? 'B' : final >= 35 ? 'C' : 'D';
  const gradeColor = { S:'#f5c842', A:'#2ecc71', B:'#3b82f6', C:'#e05a2b', D:'#e74c3c' }[grade];

  return (
    <div style={s.wrap}>
      {/* Final score hero */}
      <div style={s.hero}>
        <div style={s.heroLeft}>
          <div style={s.heroLabel}>FINAL SCORE</div>
          <div style={{ ...s.heroScore, color: gradeColor }}>{final}</div>
          <div style={{ fontSize:12, color:'var(--text2)' }}>out of 100</div>
        </div>
        <div style={{ ...s.grade, background:`${gradeColor}20`, border:`2px solid ${gradeColor}`, color:gradeColor }}>
          {grade}
        </div>
      </div>

      <div style={s.divider} />

      {/* Breakdown */}
      <ScoreBar label="⚔️ Team Strength"    weight="×50%" value={strength}   color="#f5c842" />
      <ScoreBar label="💎 Value Efficiency" weight="×25%" value={efficiency} color="#2ecc71" />
      <ScoreBar label="⚖️ Team Balance"     weight="×15%" value={balance}    color="#3b82f6" />
      <ScoreBar label="⚡ Clutch Bonus"     weight="×10%" value={clutch}     color="#e05a2b" />

      <div style={s.divider} />

      {/* Contribution breakdown */}
      <div style={s.contrib}>
        <ContribPill label="Strength"   val={Math.round(strength*0.50)}  color="#f5c842" />
        <span style={{ color:'var(--text3)' }}>+</span>
        <ContribPill label="Efficiency" val={Math.round(efficiency*0.25)} color="#2ecc71" />
        <span style={{ color:'var(--text3)' }}>+</span>
        <ContribPill label="Balance"    val={Math.round(balance*0.15)}   color="#3b82f6" />
        <span style={{ color:'var(--text3)' }}>+</span>
        <ContribPill label="Clutch"     val={Math.round(clutch*0.10)}    color="#e05a2b" />
        <span style={{ color:'var(--text3)', fontWeight:700 }}>=</span>
        <ContribPill label="Total"      val={final}                       color={gradeColor} bold />
      </div>
    </div>
  );
}

function ContribPill({ label, val, color, bold }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
      <span style={{ fontFamily:'var(--font-m)', fontSize:bold?18:14, fontWeight:bold?700:600, color }}>{val}</span>
      <span style={{ fontSize:9, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.04em' }}>{label}</span>
    </div>
  );
}

const s = {
  wrap:      { display:'flex', flexDirection:'column', gap:10 },
  hero:      { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px', background:'var(--bg3)', borderRadius:12 },
  heroLeft:  { display:'flex', flexDirection:'column', gap:2 },
  heroLabel: { fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.1em' },
  heroScore: { fontFamily:'var(--font-d)', fontSize:52, lineHeight:1, letterSpacing:'.02em' },
  grade:     { width:60, height:60, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-d)', fontSize:36 },
  divider:   { height:1, background:'var(--border)' },
  row:       { display:'flex', flexDirection:'column', gap:5 },
  labelRow:  { display:'flex', alignItems:'center', gap:8 },
  label:     { fontSize:13, color:'var(--text)', flex:1 },
  weight:    { fontSize:11, color:'var(--text3)' },
  value:     { fontFamily:'var(--font-m)', fontSize:13, fontWeight:600 },
  track:     { height:6, background:'var(--border2)', borderRadius:3, overflow:'hidden' },
  fill:      { height:'100%', borderRadius:3, transition:'width .6s ease' },
  contrib:   { display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', padding:'10px 12px', background:'var(--bg3)', borderRadius:10 },
};
