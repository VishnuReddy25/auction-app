/**
 * HiddenValueEngine — assigns secret true values per player
 * Never sent to clients. Used only for efficiency scoring at auction end.
 */
class HiddenValueEngine {

  static generateTrueValue(player) {
    const s = player.stats || {};
    const base = player.basePrice || 100;

    // Stat multiplier based on role
    let statMult = 1.0;
    switch (player.role) {
      case 'Batsman':
        statMult = 0.7 + ((s.avg||0)/60)*0.4 + ((s.sr||0)/200)*0.3;
        break;
      case 'Bowler':
        statMult = 0.7 + ((s.wkts||0)/250)*0.4 + (Math.max(0, 12-(s.eco||8))/12)*0.3;
        break;
      case 'All-Rounder':
        statMult = 0.8 + ((s.avg||0)/50)*0.25 + ((s.wkts||0)/150)*0.25;
        break;
      case 'Wicket-Keeper':
        statMult = 0.8 + ((s.avg||0)/55)*0.35 + 0.1;
        break;
      default:
        statMult = 1.0;
    }

    // Form multiplier from W/L string
    const form = s.form || s.recentForm || 'WWW';
    const wins = (form.match(/W/g)||[]).length;
    const formMult = 0.9 + (wins / form.length) * 0.2;

    // Random factor ±10%
    const randFactor = 0.9 + Math.random() * 0.2;

    const trueValue = Math.round(base * statMult * formMult * randFactor);
    return Math.max(base * 0.5, trueValue); // floor at 50% of base
  }

  // Generate hidden values for all players in a room
  static generateForRoom(items) {
    const map = {};
    items.forEach(item => {
      map[item.name] = this.generateTrueValue(item);
    });
    return map;
  }

  // Get analytics hint (without revealing true value)
  static getHint(playerName, currentBid, hiddenValues) {
    const tv = hiddenValues[playerName];
    if (!tv) return null;
    const ratio = currentBid / tv;
    if (ratio < 0.85) return { type: 'great_deal',  label: '💎 Great deal!',    color: '#2ecc71' };
    if (ratio < 1.00) return { type: 'good_value',  label: '✅ Good value',     color: '#27ae60' };
    if (ratio < 1.20) return { type: 'fair',        label: '⚖️ Fair price',     color: '#f5c842' };
    if (ratio < 1.50) return { type: 'overpaying',  label: '⚠️ Overpaying',    color: '#e05a2b' };
    return               { type: 'way_over',     label: '🔥 Way overpaid!', color: '#e74c3c' };
  }
}

module.exports = HiddenValueEngine;
