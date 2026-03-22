/**
 * ScoreEngine — Pure scoring calculations (no side effects)
 * Final Score = 50% Team Strength + 25% Value Efficiency + 15% Team Balance + 10% Clutch Bonus
 */
class ScoreEngine {

  static calculateTeamStrength(team) {
    if (!team || team.length === 0) return 0;
    const scores = team.map(p => {
      const s = p.stats || {};
      switch (p.role) {
        case 'Batsman':
          return Math.min(100, (s.avg||0)*0.8 + (s.sr||0)*0.15 + 5);
        case 'Bowler':
          return Math.min(100, (s.wkts||0)*0.4 + Math.max(0, 20-(s.eco||10))*2 + 20);
        case 'All-Rounder':
          return Math.min(100, (s.avg||0)*0.5 + (s.sr||0)*0.1 + (s.wkts||0)*0.3 + 10);
        case 'Wicket-Keeper':
          return Math.min(100, (s.avg||0)*0.9 + (s.sr||0)*0.1 + 15);
        default:
          return Math.min(100, (s.avg||0)*0.7 + 10);
      }
    });
    return Math.round(scores.reduce((a,b)=>a+b,0) / scores.length);
  }

  static calculateEfficiency(team, hiddenValues={}) {
    if (!team || team.length === 0) return 50;
    const effs = team.map(p => {
      const tv   = hiddenValues[p.name] || p.basePrice;
      const paid = p.boughtFor || p.basePrice;
      const ratio= (tv - paid) / tv;
      return Math.max(0, Math.min(100, 50 + ratio * 50));
    });
    return Math.round(effs.reduce((a,b)=>a+b,0) / effs.length);
  }

  static calculateBalance(team) {
    if (!team || team.length === 0) return 0;
    const counts = { Batsman:0, Bowler:0, 'All-Rounder':0, 'Wicket-Keeper':0 };
    team.forEach(p => { if (counts[p.role]!==undefined) counts[p.role]++; });
    const total = team.length;
    const ideal = { Batsman:0.35, Bowler:0.30, 'All-Rounder':0.25, 'Wicket-Keeper':0.10 };
    let score = 100;
    if (counts['Wicket-Keeper'] === 0) score -= 20;
    Object.keys(ideal).forEach(role => {
      if (counts[role] === 0) score -= 15;
      const diff = Math.abs((counts[role]/Math.max(total,1)) - ideal[role]);
      score -= diff * 30;
    });
    return Math.max(0, Math.round(score));
  }

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

  static calculateFinalScore(team, hiddenValues={}, clutchEvents=[]) {
    const strength   = this.calculateTeamStrength(team);
    const efficiency = this.calculateEfficiency(team, hiddenValues);
    const balance    = this.calculateBalance(team);
    const clutch     = this.calculateClutchBonus(clutchEvents);
    const final      = Math.round(strength*0.50 + efficiency*0.25 + balance*0.15 + clutch*0.10);
    return { final, strength, efficiency, balance, clutch };
  }

  static buildLeaderboard(players, hiddenValues={}, clutchMap={}) {
    return players
      .filter(p => !p.isHost)
      .map(p => {
        const scores = this.calculateFinalScore(p.team||[], hiddenValues, clutchMap[p.id]||[]);
        return { id:p.id, username:p.username, budget:p.budget, teamCount:(p.team||[]).length, spent:(p.startingBudget||1000)-p.budget, team:p.team||[], scores };
      })
      .sort((a,b) => b.scores.final - a.scores.final);
  }
}
module.exports = ScoreEngine;
