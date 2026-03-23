/**
 * ScoreEngine — Role-aware scoring
 * Final Score = 50% Team Strength + 5% Value Efficiency + 40% Team Balance + 5% Clutch Bonus
 *
 * Each role scored on different stats:
 * Batsman      → Average (60%) + Strike Rate (40%)
 * Bowler       → Economy (50%) + Wickets (50%)  [lower economy = better]
 * All-Rounder  → Average (30%) + Strike Rate (20%) + Economy (25%) + Wickets (25%)
 * Wicket-Keeper→ Average (70%) + Strike Rate (30%)
 */
class ScoreEngine {

  // ── Score a single player 0-100 based on role ────────────────────────────
  static scorePlayer(p) {
    const s = p.stats || {};

    switch (p.role) {

      case 'Batsman': {
        // Avg: world class = 60+, good = 40+, average = 30
        // SR:  world class = 160+, good = 130+, average = 110
        const avgScore = Math.min(100, (s.avg || 0) / 60 * 100);
        const srScore  = Math.min(100, Math.max(0, ((s.sr || 100) - 80) / 100 * 100));
        return Math.round(avgScore * 0.60 + srScore * 0.40);
      }

      case 'Bowler': {
        // Economy: world class = 6.0, good = 7.5, average = 9.0
        // Wickets: world class = 250+, good = 150+, average = 80
        const ecoScore  = Math.min(100, Math.max(0, ((12 - (s.eco || 10)) / 6) * 100));
        const wktsScore = Math.min(100, ((s.wkts || 0) / 250) * 100);
        return Math.round(ecoScore * 0.50 + wktsScore * 0.50);
      }

      case 'All-Rounder': {
        // Mix of batting and bowling
        const avgScore  = Math.min(100, (s.avg || 0) / 50 * 100);
        const srScore   = Math.min(100, Math.max(0, ((s.sr || 100) - 80) / 80 * 100));
        const ecoScore  = Math.min(100, Math.max(0, ((12 - (s.eco || 10)) / 6) * 100));
        const wktsScore = Math.min(100, ((s.wkts || 0) / 150) * 100);
        return Math.round(avgScore*0.30 + srScore*0.20 + ecoScore*0.25 + wktsScore*0.25);
      }

      case 'Wicket-Keeper': {
        // Keepers scored on batting — avg more important than SR
        const avgScore = Math.min(100, (s.avg || 0) / 55 * 100);
        const srScore  = Math.min(100, Math.max(0, ((s.sr || 100) - 80) / 90 * 100));
        return Math.round(avgScore * 0.70 + srScore * 0.30);
      }

      default:
        return 50;
    }
  }

  // ── Team Strength (0-100) ─────────────────────────────────────────────────
  static calculateTeamStrength(team) {
    if (!team || team.length === 0) return 0;
    const scores = team.map(p => this.scorePlayer(p));
    return Math.round(scores.reduce((a,b) => a+b, 0) / scores.length);
  }

  // ── Value Efficiency (0-100) ──────────────────────────────────────────────
  // Rewards buying good players cheaply relative to their hidden true value
  static calculateEfficiency(team, hiddenValues={}) {
    if (!team || team.length === 0) return 50;
    const effs = team.map(p => {
      const tv   = hiddenValues[p.name] || p.basePrice;
      const paid = p.boughtFor || p.basePrice;
      const ratio= (tv - paid) / tv; // positive = bargain, negative = overpaid
      return Math.max(0, Math.min(100, 50 + ratio * 50));
    });
    return Math.round(effs.reduce((a,b) => a+b, 0) / effs.length);
  }

  // ── Team Balance (0-100) ──────────────────────────────────────────────────
  // Rewards well-rounded squads
  static calculateBalance(team) {
    if (!team || team.length === 0) return 0;
    const counts = { Batsman:0, Bowler:0, 'All-Rounder':0, 'Wicket-Keeper':0 };
    team.forEach(p => { if (counts[p.role] !== undefined) counts[p.role]++; });
    const total = team.length;
    const ideal = { Batsman:0.35, Bowler:0.30, 'All-Rounder':0.25, 'Wicket-Keeper':0.10 };

    let score = 100;
    if (counts['Wicket-Keeper'] === 0) score -= 25; // heavy penalty for no keeper
    Object.keys(ideal).forEach(role => {
      if (counts[role] === 0) score -= 15; // penalty for missing any role
      const diff = Math.abs((counts[role] / Math.max(total,1)) - ideal[role]);
      score -= diff * 25;
    });
    return Math.max(0, Math.round(score));
  }

  // ── Clutch Bonus (0-100) ──────────────────────────────────────────────────
  static calculateClutchBonus(clutchEvents=[]) {
    if (!clutchEvents.length) return 0;
    let pts = 0;
    clutchEvents.forEach(e => {
      switch(e.type) {
        case 'last_second':   pts += 10; break;
        case 'bargain_win':   pts += 5;  break;
        case 'sniper':        pts += 8;  break;
        case 'contested_win': pts += 6;  break;
        case 'panic_bid':     pts -= 3;  break;
      }
    });
    return Math.max(0, Math.min(100, pts * 4));
  }

  // ── Final Score ───────────────────────────────────────────────────────────
  static calculateFinalScore(team, hiddenValues={}, clutchEvents=[]) {
    const strength   = this.calculateTeamStrength(team);
    const efficiency = this.calculateEfficiency(team, hiddenValues);
    const balance    = this.calculateBalance(team);
    const clutch     = this.calculateClutchBonus(clutchEvents);
    const final      = Math.round(
      strength   * 0.50 +
      efficiency * 0.05 +
      balance    * 0.40 +
      clutch     * 0.05
    );
    return { final, strength, efficiency, balance, clutch };
  }

  // ── Build full leaderboard ────────────────────────────────────────────────
  static buildLeaderboard(players, hiddenValues={}, clutchMap={}) {
    return players
      .filter(p => !p.isHost)
      .map(p => {
        const scores = this.calculateFinalScore(
          p.team || [],
          hiddenValues,
          clutchMap[p.id] || []
        );
        return {
          id:        p.id,
          username:  p.username,
          budget:    p.budget,
          teamCount: (p.team||[]).length,
          spent:     (p.startingBudget||1000) - p.budget,
          team:      p.team || [],
          scores,
        };
      })
      .sort((a,b) => b.scores.final - a.scores.final);
  }
}

module.exports = ScoreEngine;
