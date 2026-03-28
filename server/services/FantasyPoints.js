/**
 * FantasyPoints — Calculate fantasy points from CricSheet match data
 * Exact points system as specified
 */

class FantasyPoints {

  // ── Main entry: calculate points for all players in a match ──────────────
  static calculate(cricsheetData) {
    const players = {};

    if (!cricsheetData?.innings) return players;

    cricsheetData.innings.forEach(inning => {
      const battingTeam = inning.team;
      const deliveries  = inning.overs?.flatMap(o =>
        o.deliveries.map(d => ({ ...d, over: o.over }))
      ) || [];

      // Track per-player stats
      const batStats  = {};
      const bowlStats = {};
      const fieldStats= {};

      deliveries.forEach(d => {
        const batter  = d.batter;
        const bowler  = d.bowler;
        const runs    = d.runs;
        const extras  = d.extras || {};
        const wicket  = d.wickets?.[0];

        // ── Batting stats ─────────────────────────────────────────────────
        if (!batStats[batter]) batStats[batter] = { runs:0, balls:0, fours:0, sixes:0, dismissed:false };
        const batterRuns = runs.batter || 0;
        batStats[batter].runs   += batterRuns;
        batStats[batter].balls  += 1;
        if (batterRuns === 4) batStats[batter].fours++;
        if (batterRuns === 6) batStats[batter].sixes++;

        // ── Bowling stats ─────────────────────────────────────────────────
        if (!bowlStats[bowler]) bowlStats[bowler] = { balls:0, runs:0, wickets:0, maidens:0, wides:0, noballs:0, overRuns:{} };
        const overKey = d.over;
        if (!bowlStats[bowler].overRuns[overKey]) bowlStats[bowler].overRuns[overKey] = 0;

        const legalBall = !extras.wides && !extras.noballs;
        if (legalBall) bowlStats[bowler].balls++;
        bowlStats[bowler].runs += (runs.total || 0);
        bowlStats[bowler].overRuns[overKey] += (runs.total || 0);
        if (extras.wides)   bowlStats[bowler].wides++;
        if (extras.noballs) bowlStats[bowler].noballs++;

        // ── Wickets ───────────────────────────────────────────────────────
        if (wicket) {
          const kind = wicket.kind;
          if (['caught','bowled','lbw','caught and bowled','stumped','hit wicket'].includes(kind)) {
            if (kind !== 'run out') bowlStats[bowler].wickets++;
          }

          // Fielding points
          const fielders = wicket.fielders || [];
          fielders.forEach(f => {
            const fname = f.name;
            if (!fieldStats[fname]) fieldStats[fname] = { catches:0, runouts:0, stumpings:0 };
            if (kind === 'caught' || kind === 'caught and bowled') fieldStats[fname].catches++;
            if (kind === 'run out')  fieldStats[fname].runouts++;
            if (kind === 'stumped')  fieldStats[fname].stumpings++;
          });

          // Track dismissal for duck
          if (batStats[wicket.player_out]) {
            batStats[wicket.player_out].dismissed = true;
          }
        }
      });

      // Calculate maiden overs
      Object.keys(bowlStats).forEach(bowler => {
        const overRuns = bowlStats[bowler].overRuns;
        bowlStats[bowler].maidens = Object.values(overRuns).filter(r => r === 0).length;
      });

      // ── Convert stats to fantasy points ──────────────────────────────────
      // Batting
      Object.entries(batStats).forEach(([player, s]) => {
        if (!players[player]) players[player] = { points:0, breakdown:{} };
        const p = this.battingPoints(s);
        players[player].points += p.total;
        players[player].breakdown.batting = p;
      });

      // Bowling
      Object.entries(bowlStats).forEach(([player, s]) => {
        if (!players[player]) players[player] = { points:0, breakdown:{} };
        const p = this.bowlingPoints(s);
        players[player].points += p.total;
        players[player].breakdown.bowling = p;
      });

      // Fielding
      Object.entries(fieldStats).forEach(([player, s]) => {
        if (!players[player]) players[player] = { points:0, breakdown:{} };
        const p = this.fieldingPoints(s);
        players[player].points += p.total;
        players[player].breakdown.fielding = p;
      });
    });

    return players;
  }

  // ── Batting points ────────────────────────────────────────────────────────
  static battingPoints(s) {
    let pts = 0;
    const b = {};

    b.runs      = s.runs * 1;                    pts += b.runs;
    b.fours     = s.fours * 1;                   pts += b.fours;
    b.sixes     = s.sixes * 2;                   pts += b.sixes;

    // Milestone bonuses
    b.bonus30   = s.runs >= 30  ? 4 : 0;         pts += b.bonus30;
    b.bonus50   = s.runs >= 50  ? 4 : 0;         pts += b.bonus50;
    b.bonus100  = s.runs >= 100 ? 8 : 0;         pts += b.bonus100;

    // Duck
    b.duck      = (s.dismissed && s.runs === 0) ? -2 : 0; pts += b.duck;

    // Strike rate bonus (min 10 balls)
    if (s.balls >= 10) {
      const sr = (s.runs / s.balls) * 100;
      b.srBonus = this.srBonus(sr);
      pts += b.srBonus;
    } else {
      b.srBonus = 0;
    }

    b.total = pts;
    return b;
  }

  static srBonus(sr) {
    if (sr < 50)          return -6;
    if (sr < 60)          return -4;
    if (sr <= 70)         return -2;
    if (sr <= 130)        return  0;
    if (sr <= 150)        return  2;
    if (sr <= 170)        return  4;
    return 6;
  }

  // ── Bowling points ────────────────────────────────────────────────────────
  static bowlingPoints(s) {
    let pts = 0;
    const b = {};

    b.wickets   = s.wickets * 20;                pts += b.wickets;
    b.maidens   = s.maidens * 12;                pts += b.maidens;
    b.wides     = s.wides   * -2;                pts += b.wides;
    b.noballs   = s.noballs * -2;                pts += b.noballs;

    // Wicket bonuses
    b.bonus3wkt = s.wickets >= 3 ? 4  : 0;      pts += b.bonus3wkt;
    b.bonus4wkt = s.wickets >= 4 ? 8  : 0;      pts += b.bonus4wkt;
    b.bonus5wkt = s.wickets >= 5 ? 16 : 0;      pts += b.bonus5wkt;

    // Economy rate (min 2 overs = 12 balls)
    if (s.balls >= 12) {
      const overs = s.balls / 6;
      const eco   = s.runs / overs;
      b.ecoBonus  = this.ecoBonus(eco);
      pts += b.ecoBonus;
    } else {
      b.ecoBonus = 0;
    }

    b.total = pts;
    return b;
  }

  static ecoBonus(eco) {
    if (eco < 5)           return  6;
    if (eco < 6)           return  4;
    if (eco <= 7)          return  2;
    if (eco <= 10)         return  0;
    if (eco <= 11)         return -2;
    if (eco <= 12)         return -4;
    return -6;
  }

  // ── Fielding points ───────────────────────────────────────────────────────
  static fieldingPoints(s) {
    let pts = 0;
    const b = {};

    b.catches    = s.catches   * 8;              pts += b.catches;
    b.runouts    = s.runouts   * 6;              pts += b.runouts;
    b.stumpings  = s.stumpings * 6;              pts += b.stumpings;
    b.bonus3catch= s.catches >= 3 ? 4 : 0;      pts += b.bonus3catch;

    b.total = pts;
    return b;
  }

  // ── Apply captain/vc multiplier ───────────────────────────────────────────
  static applyMultipliers(playerPoints, captain, viceCaptain) {
    const result = { ...playerPoints };
    if (result[captain])    result[captain]    = { ...result[captain], points: Math.round(result[captain].points * 2),   multiplier: '2x' };
    if (result[viceCaptain])result[viceCaptain]= { ...result[viceCaptain], points: Math.round(result[viceCaptain].points * 1.5), multiplier: '1.5x' };
    return result;
  }

  // ── Calculate total for a squad (top 11 count) ───────────────────────────
  static squadTotal(squad, matchPoints, captain, viceCaptain) {
    const withMult = this.applyMultipliers(matchPoints, captain, viceCaptain);
    const scored   = squad
      .map(p => ({ name: p.name, pts: withMult[p.name]?.points || 0 }))
      .sort((a,b) => b.pts - a.pts);

    const playing11  = scored.slice(0, 11);
    const reserves   = scored.slice(11);
    const totalPoints= playing11.reduce((s, p) => s + p.pts, 0);

    return { totalPoints, playing11, reserves };
  }
}

module.exports = FantasyPoints;
