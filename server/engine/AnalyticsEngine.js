/**
 * AnalyticsEngine — lightweight real-time analytics
 * Calculates warnings, team strength, budget risk
 */
const ScoreEngine = require('./ScoreEngine');

class AnalyticsEngine {

  // Called on every bid — returns analytics to broadcast
  static onBid(state, hiddenValues, playerId, amount) {
    const item    = state.items?.[state.currentIndex];
    const players = state.players || [];

    // Value hint for current item
    const HVE = require('./HiddenValueEngine');
    const hint = item ? HVE.getHint(item.name, amount, hiddenValues) : null;

    // Per-player budget risk
    const warnings = {};
    const remaining = state.items?.filter(i=>i.status==='pending').length || 0;
    const avgBase   = state.items?.reduce((s,i)=>s+(i.basePrice||0),0) / Math.max(state.items?.length||1,1);

    players.filter(p=>!p.isHost).forEach(p => {
      const risk = p.budget < remaining * avgBase * 0.5;
      if (risk) warnings[p.id] = { type:'budget_risk', label:'⚠️ Budget risk!' };
    });

    // Clutch detection: bid in last 3 seconds
    const timeLeft = require('./TimerManager').getLeft(state.roomId);
    const isClutch = timeLeft <= 3 && timeLeft > 0;
    const isSniper = timeLeft <= 5 && state.currentBidderId && state.currentBidderId !== playerId;

    return { hint, warnings, isClutch, isSniper, timeLeft };
  }

  // Full team analytics snapshot for a player
  static teamSnapshot(player, hiddenValues={}) {
    const team     = player.team || [];
    const strength = ScoreEngine.calculateTeamStrength(team);
    const balance  = ScoreEngine.calculateBalance(team);
    const eff      = ScoreEngine.calculateEfficiency(team, hiddenValues);

    const roles = {};
    team.forEach(p => { roles[p.role] = (roles[p.role]||0)+1; });

    const missingRoles = ['Batsman','Bowler','All-Rounder','Wicket-Keeper']
      .filter(r => !roles[r]);

    return { strength, balance, efficiency: eff, roles, missingRoles };
  }
}

module.exports = AnalyticsEngine;
