/**
 * CricSheetService — Fetch and parse match data from cricsheet.org
 * Free, no API key needed
 */
const https = require('https');

const CricSheetService = {

  // Fetch list of recent IPL matches
  async getRecentMatches() {
    try {
      const data = await this._fetch('https://cricsheet.org/matches/ipl_male_json.zip');
      return data;
    } catch(err) {
      console.error('CricSheet fetch error:', err.message);
      return null;
    }
  },

  // Fetch match data by cricsheet match ID
  async getMatchData(matchId) {
    try {
      const url  = `https://cricsheet.org/dl/json/${matchId}.json`;
      const data = await this._fetchJSON(url);
      return data;
    } catch(err) {
      console.error('CricSheet match fetch error:', err.message);
      return null;
    }
  },

  // Search for a match by teams and date
  async findMatch(team1, team2, dateStr) {
    try {
      // CricSheet people page for IPL
      const url  = 'https://cricsheet.org/matches/ipl_male.csv';
      const csv  = await this._fetchText(url);
      const rows = csv.split('\n').slice(1); // skip header

      const t1 = team1.toLowerCase();
      const t2 = team2.toLowerCase();
      const dt = dateStr; // YYYY-MM-DD

      for (const row of rows) {
        const cols = row.split(',');
        if (!cols[0]) continue;
        const [matchDate, , , teams] = cols;
        if (!teams) continue;
        const teamsLower = teams.toLowerCase();
        if (
          matchDate?.startsWith(dt) &&
          teamsLower.includes(t1) &&
          teamsLower.includes(t2)
        ) {
          return cols[0]; // return match ID
        }
      }
      return null;
    } catch(err) {
      console.error('CricSheet find match error:', err.message);
      return null;
    }
  },

  _fetchJSON(url) {
    return new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'BidWar/1.0' } }, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return resolve(this._fetchJSON(res.headers.location));
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch(e) { reject(e); }
        });
      }).on('error', reject);
    });
  },

  _fetchText(url) {
    return new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'BidWar/1.0' } }, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  },
};

module.exports = CricSheetService;
