import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAchievements } from '../services/achievements';
import ScoreBreakdown from '../components/ScoreBreakdown';

const fmtL = v => {
  if (!v && v !== 0) return '—';
  if (v >= 100) return `₹${(v / 100).toFixed(1)}Cr`;
  return `₹${v}L`;
};

const roleColor = {
  Batsman:        '#f5c842',
  Bowler:         '#3b82f6',
  'All-Rounder':  '#2ecc71',
  'Wicket-Keeper':'#e05a2b',
};

const roleBg = {
  Batsman:        'rgba(245,200,66,.12)',
  Bowler:         'rgba(59,130,246,.12)',
  'All-Rounder':  'rgba(46,204,113,.12)',
  'Wicket-Keeper':'rgba(224,90,43,.12)',
};

export default function TeamStatsPage() {
  const { state }  = useLocation();
  const nav        = useNavigate();
  const leaderboard = state?.leaderboard || [];
  const settings    = state?.settings   || {};
  const [selected,  setSelected] = useState(leaderboard[0] || null);

  if (!leaderboard.length) {
    return (
      <div style={s.center}>
        <p style={{ color:'var(--text2)' }}>No auction data found.</p>
        <button onClick={() => nav('/')} className="btn btn-gold" style={{ marginTop:16 }}>← Back to Lobby</button>
      </div>
    );
  }

  const startingBudget = settings?.startingBudget || 1000;
  const medals = ['🥇','🥈','🥉'];

  // Role breakdown for selected player
  const roleCounts = {};
  selected?.team?.forEach(p => {
    roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
  });

  // Most expensive buy
  const mostExpensive = selected?.team?.length
    ? [...selected.team].sort((a, b) => b.boughtFor - a.boughtFor)[0]
    : null;

  // Best value (lowest price relative to base)
  const bestValue = selected?.team?.length
    ? [...selected.team].sort((a, b) => (a.boughtFor / a.basePrice) - (b.boughtFor / b.basePrice))[0]
    : null;

  return (
    <div style={s.page}>
      <div style={s.bg} />

      {/* Header */}
      <header style={s.header}>
        <button onClick={() => nav('/')} className="btn btn-ghost btn-sm">← Lobby</button>
        <h1 style={s.headerTitle}>🏏 Auction Results</h1>
        <div style={{ width: 80 }} />
      </header>

      <main style={s.main}>
        <div style={s.grid}>

          {/* ── Left: Leaderboard ── */}
          <div style={s.left}>
            <h2 style={s.sectionTitle}>Final Standings</h2>
            {leaderboard.map((entry, i) => (
              <div
                key={entry.id}
                onClick={() => setSelected(entry)}
                style={{
                  ...s.leaderRow,
                  ...(selected?.id === entry.id ? s.leaderRowActive : {}),
                  ...(i === 0 ? s.leaderRowFirst : {}),
                }}
              >
                <span style={s.medal}>{medals[i] || `#${i + 1}`}</span>
                <div style={s.leaderAvatar}>{entry.username[0].toUpperCase()}</div>
                <div style={s.leaderInfo}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{entry.username}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                    {entry.teamCount} player{entry.teamCount !== 1 ? 's' : ''} · Spent {fmtL(entry.spent)}
                  </div>
                  {/* Budget bar */}
                  <div style={s.budgetBar}>
                    <div style={{
                      ...s.budgetFill,
                      width: `${(entry.budget / startingBudget) * 100}%`,
                      background: entry.budget / startingBudget > 0.5 ? 'var(--green)' : entry.budget / startingBudget > 0.25 ? 'var(--gold)' : 'var(--red)',
                    }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {entry.scores ? (
                    <>
                      <div style={{ fontFamily:'var(--font-d)', color:'var(--gold)', fontWeight:700, fontSize:28, lineHeight:1 }}>{entry.scores.final}</div>
                      <div style={{ fontSize:11, color:'var(--text3)' }}>final score</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontFamily: 'var(--font-m)', color: 'var(--gold)', fontWeight: 700 }}>{fmtL(entry.budget)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>remaining</div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Right: Selected player's team ── */}
          {selected && (
            <div style={s.right}>
              {/* Profile header */}
              <div style={s.profileHeader}>
                <div style={s.profileAvatar}>{selected.username[0].toUpperCase()}</div>
                <div>
                  <h2 style={s.profileName}>{selected.username}'s Team</h2>
                  <div style={s.profileStats}>
                    <Stat label="Players" val={selected.teamCount} />
                    <Stat label="Spent"   val={fmtL(selected.spent)} gold />
                    <Stat label="Remaining" val={fmtL(selected.budget)} />
                  </div>
                </div>
              </div>

              {/* Score breakdown */}
              {selected.scores && (
                <>
                  <h3 style={s.sectionTitle}>🏆 Score Breakdown</h3>
                  <ScoreBreakdown scores={selected.scores} username={selected.username} />
                </>
              )}

              {/* Achievements */}
              {(() => {
                const rank = leaderboard.findIndex(e => e.id === selected.id);
                const earned = getAchievements(selected, settings, rank);
                if (!earned.length) return null;
                return (
                  <>
                    <h3 style={s.sectionTitle}>🏅 Achievements ({earned.length})</h3>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:8 }}>
                      {earned.map(a => (
                        <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(245,200,66,.08)', border:'1px solid rgba(245,200,66,.25)', borderRadius:12 }}>
                          <span style={{ fontSize:24 }}>{a.icon}</span>
                          <div>
                            <div style={{ fontWeight:700, fontSize:14, color:'var(--gold)' }}>{a.title}</div>
                            <div style={{ fontSize:12, color:'var(--text2)' }}>{a.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}

              {/* Quick insights */}
              {selected.team?.length > 0 && (
                <div style={s.insights}>
                  {mostExpensive && (
                    <div style={s.insightCard}>
                      <div style={s.insightIcon}>💸</div>
                      <div>
                        <div style={s.insightLabel}>Most Expensive</div>
                        <div style={s.insightVal}>{mostExpensive.name}</div>
                        <div style={s.insightSub}>{fmtL(mostExpensive.boughtFor)}</div>
                      </div>
                    </div>
                  )}
                  {bestValue && bestValue.name !== mostExpensive?.name && (
                    <div style={s.insightCard}>
                      <div style={s.insightIcon}>🎯</div>
                      <div>
                        <div style={s.insightLabel}>Best Value</div>
                        <div style={s.insightVal}>{bestValue.name}</div>
                        <div style={s.insightSub}>{fmtL(bestValue.boughtFor)} (base {fmtL(bestValue.basePrice)})</div>
                      </div>
                    </div>
                  )}
                  {/* Role breakdown */}
                  <div style={s.insightCard}>
                    <div style={s.insightIcon}>📊</div>
                    <div>
                      <div style={s.insightLabel}>Team Composition</div>
                      {Object.entries(roleCounts).map(([role, count]) => (
                        <div key={role} style={{ fontSize: 12, color: roleColor[role] || 'var(--text2)', marginTop: 2 }}>
                          {role}: {count}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Player list */}
              <h3 style={s.sectionTitle}>Squad ({selected.teamCount} players)</h3>

              {selected.team?.length === 0 && (
                <div style={s.emptyTeam}>
                  <span style={{ fontSize: 48 }}>😔</span>
                  <p style={{ color: 'var(--text2)', marginTop: 8 }}>No players won</p>
                </div>
              )}

              <div style={s.playerGrid}>
                {selected.team?.map((player, i) => {
                  const rc  = roleColor[player.role] || '#9898b0';
                  const rb  = roleBg[player.role]    || 'rgba(150,150,150,.1)';
                  const overpaid = player.boughtFor > player.basePrice * 1.5;
                  const bargain  = player.boughtFor <= player.basePrice;
                  return (
                    <div key={i} style={{ ...s.playerCard, border: `1px solid ${rc}30` }}>
                      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${rc}10, transparent 60%)`, borderRadius: 12, pointerEvents: 'none' }} />

                      {/* Badge */}
                      {bargain  && <div style={s.dealBadge}>💎 BARGAIN</div>}
                      {overpaid && <div style={{ ...s.dealBadge, background: 'rgba(231,76,60,.2)', color: 'var(--red)', borderColor: 'rgba(231,76,60,.3)' }}>🔥 OVERPAID</div>}

                      {/* Avatar */}
                      <div style={{ ...s.pAvatar, background: rb, color: rc, border: `1px solid ${rc}40` }}>
                        {player.image || player.name?.[0]}
                      </div>

                      <div style={s.pName}>{player.name}</div>
                      <span style={{ ...s.pRole, background: rb, color: rc }}>{player.role}</span>
                      <div style={s.pTeam}>🏳️ {player.team}</div>

                      <div style={s.pDivider} />

                      {/* Price */}
                      <div style={s.priceRow}>
                        <div>
                          <div style={s.priceLabel}>PAID</div>
                          <div style={{ fontFamily: 'var(--font-d)', fontSize: 24, color: 'var(--gold)', lineHeight: 1 }}>{fmtL(player.boughtFor)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={s.priceLabel}>BASE</div>
                          <div style={{ fontFamily: 'var(--font-m)', fontSize: 14, color: 'var(--text2)' }}>{fmtL(player.basePrice)}</div>
                        </div>
                      </div>

                      {/* Stats */}
                      {player.stats && (
                        <div style={s.miniStats}>
                          {player.stats.avg  > 0 && <MiniStat label="Avg"  val={player.stats.avg} />}
                          {player.stats.sr   > 0 && <MiniStat label="SR"   val={player.stats.sr} />}
                          {player.stats.wkts > 0 && <MiniStat label="Wkts" val={player.stats.wkts} />}
                          {player.stats.eco  > 0 && <MiniStat label="Eco"  val={player.stats.eco} />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Back button */}
              <button onClick={() => nav('/')} className="btn btn-gold btn-full btn-lg" style={{ marginTop: 16 }}>
                🏠 Back to Lobby
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, val, gold }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-m)', fontSize: 16, fontWeight: 700, color: gold ? 'var(--gold)' : 'var(--text)' }}>{val}</div>
      <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
    </div>
  );
}

function MiniStat({ label, val }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg3)', borderRadius: 6, padding: '4px 8px', gap: 1 }}>
      <span style={{ fontFamily: 'var(--font-m)', fontSize: 12, fontWeight: 600 }}>{val}</span>
      <span style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
    </div>
  );
}

const s = {
  page:         { minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' },
  bg:           { position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,200,66,.08), transparent 60%), var(--bg)', zIndex: 0 },
  center:       { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  header:       { position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px', borderBottom: '1px solid var(--border)', background: 'rgba(10,10,15,.9)', backdropFilter: 'blur(12px)' },
  headerTitle:  { fontFamily: 'var(--font-d)', fontSize: 24, color: 'var(--gold)', letterSpacing: '.04em' },
  main:         { position: 'relative', zIndex: 1, flex: 1, padding: '24px', overflow: 'auto' },
  grid:         { display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, maxWidth: 1200, margin: '0 auto' },
  left:         { display: 'flex', flexDirection: 'column', gap: 10 },
  right:        { display: 'flex', flexDirection: 'column', gap: 16 },
  sectionTitle: { fontFamily: 'var(--font-d)', fontSize: 22, letterSpacing: '.03em', marginBottom: 12 },

  // Leaderboard
  leaderRow:       { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer', transition: 'all 150ms' },
  leaderRowActive: { border: '1px solid rgba(245,200,66,.4)', background: 'rgba(245,200,66,.06)' },
  leaderRowFirst:  { },
  medal:           { fontSize: 22, width: 30, textAlign: 'center', flexShrink: 0 },
  leaderAvatar:    { width: 38, height: 38, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 },
  leaderInfo:      { flex: 1, minWidth: 0 },
  budgetBar:       { height: 3, background: 'var(--border2)', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  budgetFill:      { height: '100%', borderRadius: 2, transition: 'width .5s' },

  // Profile
  profileHeader: { display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 16 },
  profileAvatar: { width: 64, height: 64, borderRadius: '50%', background: 'var(--gold-dim)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-d)', fontSize: 32, flexShrink: 0 },
  profileName:   { fontFamily: 'var(--font-d)', fontSize: 28, letterSpacing: '.02em', marginBottom: 10 },
  profileStats:  { display: 'flex', gap: 24 },

  // Insights
  insights:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 },
  insightCard:  { display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 },
  insightIcon:  { fontSize: 24, flexShrink: 0 },
  insightLabel: { fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 },
  insightVal:   { fontWeight: 700, fontSize: 14 },
  insightSub:   { fontSize: 12, color: 'var(--gold)', marginTop: 2 },

  // Player grid
  emptyTeam:  { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' },
  playerGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 },
  playerCard: { background: 'var(--surface)', borderRadius: 12, padding: 16, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 6 },
  dealBadge:  { position: 'absolute', top: 8, right: 8, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100, background: 'rgba(46,204,113,.2)', color: 'var(--green)', border: '1px solid rgba(46,204,113,.3)', letterSpacing: '.04em' },
  pAvatar:    { width: 52, height: 52, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-d)', fontSize: 20, marginBottom: 4 },
  pName:      { fontWeight: 700, fontSize: 15, lineHeight: 1.2 },
  pRole:      { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, letterSpacing: '.05em', textTransform: 'uppercase', alignSelf: 'flex-start' },
  pTeam:      { fontSize: 12, color: 'var(--text2)' },
  pDivider:   { height: 1, background: 'var(--border)', margin: '6px 0' },
  priceRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
  priceLabel: { fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 },
  miniStats:  { display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 },
};
