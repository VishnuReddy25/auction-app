// Achievement definitions and calculator

export const ACHIEVEMENTS = [
  {
    id:    'bargain_hunter',
    icon:  '💎',
    title: 'Bargain Hunter',
    desc:  'Won a player at base price or below',
    check: (entry) => entry.team?.some(p => p.boughtFor <= p.basePrice),
  },
  {
    id:    'big_spender',
    icon:  '💸',
    title: 'Big Spender',
    desc:  'Spent over 80% of your budget',
    check: (entry, settings) => entry.spent > (settings?.startingBudget || 1000) * 0.8,
  },
  {
    id:    'frugal',
    icon:  '🏦',
    title: 'Frugal Manager',
    desc:  'Finished with over 50% budget remaining',
    check: (entry, settings) => entry.budget > (settings?.startingBudget || 1000) * 0.5,
  },
  {
    id:    'all_rounder_fan',
    icon:  '🌟',
    title: 'All-Rounder Fan',
    desc:  'Bought 2 or more All-Rounders',
    check: (entry) => (entry.team?.filter(p => p.role === 'All-Rounder').length || 0) >= 2,
  },
  {
    id:    'pace_attack',
    icon:  '🎯',
    title: 'Pace Attack',
    desc:  'Bought 3 or more Bowlers',
    check: (entry) => (entry.team?.filter(p => p.role === 'Bowler').length || 0) >= 3,
  },
  {
    id:    'batting_lineup',
    icon:  '🏏',
    title: 'Batting Lineup',
    desc:  'Bought 3 or more Batsmen',
    check: (entry) => (entry.team?.filter(p => p.role === 'Batsman').length || 0) >= 3,
  },
  {
    id:    'collector',
    icon:  '🎖',
    title: 'Collector',
    desc:  'Won 5 or more players',
    check: (entry) => (entry.teamCount || 0) >= 5,
  },
  {
    id:    'star_buyer',
    icon:  '⭐',
    title: 'Star Buyer',
    desc:  'Bought a player for ₹200L or more',
    check: (entry) => entry.team?.some(p => p.boughtFor >= 200),
  },
  {
    id:    'balanced_squad',
    icon:  '⚖️',
    title: 'Balanced Squad',
    desc:  'Have at least 1 of each role',
    check: (entry) => {
      const roles = new Set(entry.team?.map(p => p.role) || []);
      return ['Batsman','Bowler','All-Rounder'].every(r => roles.has(r));
    },
  },
  {
    id:    'champion',
    icon:  '🏆',
    title: 'Champion',
    desc:  'Finished 1st place',
    check: (entry, settings, rank) => rank === 0,
  },
];

export function getAchievements(entry, settings, rank) {
  return ACHIEVEMENTS.filter(a => {
    try { return a.check(entry, settings, rank); } catch { return false; }
  });
}
