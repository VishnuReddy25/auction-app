/**
 * IPL 2026 Player Database — All 10 teams with real roles and base prices
 * Roles: BAT, BOWL, AR (All-Rounder), WK (Wicket-Keeper)
 */
const IPL_PLAYERS = [
  // ── Mumbai Indians ────────────────────────────────────────────────────────
  { name:'Rohit Sharma',      team:'MI', role:'BAT', basePrice:200, image:'RS' },
  { name:'Jasprit Bumrah',    team:'MI', role:'BOWL',basePrice:200, image:'JB' },
  { name:'Hardik Pandya',     team:'MI', role:'AR',  basePrice:175, image:'HP' },
  { name:'Suryakumar Yadav',  team:'MI', role:'BAT', basePrice:175, image:'SKY'},
  { name:'Tilak Varma',       team:'MI', role:'BAT', basePrice:140, image:'TV' },
  { name:'Ishan Kishan',      team:'MI', role:'WK',  basePrice:130, image:'IK' },
  { name:'Trent Boult',       team:'MI', role:'BOWL',basePrice:130, image:'TB' },
  { name:'Tim David',         team:'MI', role:'BAT', basePrice:120, image:'TD' },
  { name:'Romario Shepherd',  team:'MI', role:'AR',  basePrice:100, image:'RSH'},
  { name:'Nuwan Thushara',    team:'MI', role:'BOWL',basePrice:90,  image:'NT' },
  { name:'Naman Dhir',        team:'MI', role:'AR',  basePrice:80,  image:'ND' },

  // ── Chennai Super Kings ───────────────────────────────────────────────────
  { name:'MS Dhoni',          team:'CSK',role:'WK',  basePrice:200, image:'MSD'},
  { name:'Ruturaj Gaikwad',   team:'CSK',role:'BAT', basePrice:160, image:'RG' },
  { name:'Ravindra Jadeja',   team:'CSK',role:'AR',  basePrice:160, image:'RJ' },
  { name:'Deepak Chahar',     team:'CSK',role:'BOWL',basePrice:130, image:'DC' },
  { name:'Shivam Dube',       team:'CSK',role:'AR',  basePrice:120, image:'SD' },
  { name:'Rachin Ravindra',   team:'CSK',role:'AR',  basePrice:120, image:'RR' },
  { name:'Matheesha Pathirana',team:'CSK',role:'BOWL',basePrice:120,image:'MP' },
  { name:'Devon Conway',      team:'CSK',role:'WK',  basePrice:110, image:'DCo'},
  { name:'Shardul Thakur',    team:'CSK',role:'AR',  basePrice:100, image:'ST' },
  { name:'Sameer Rizvi',      team:'CSK',role:'BAT', basePrice:90,  image:'SR' },
  { name:'Mukesh Choudhary',  team:'CSK',role:'BOWL',basePrice:80,  image:'MC' },

  // ── Royal Challengers Bengaluru ───────────────────────────────────────────
  { name:'Virat Kohli',       team:'RCB',role:'BAT', basePrice:200, image:'VK' },
  { name:'Faf du Plessis',    team:'RCB',role:'BAT', basePrice:140, image:'FDP'},
  { name:'Glenn Maxwell',     team:'RCB',role:'AR',  basePrice:150, image:'GM' },
  { name:'Mohammed Siraj',    team:'RCB',role:'BOWL',basePrice:140, image:'MSi'},
  { name:'Dinesh Karthik',    team:'RCB',role:'WK',  basePrice:120, image:'DK' },
  { name:'Yash Dayal',        team:'RCB',role:'BOWL',basePrice:100, image:'YD' },
  { name:'Cameron Green',     team:'RCB',role:'AR',  basePrice:130, image:'CG' },
  { name:'Rajat Patidar',     team:'RCB',role:'BAT', basePrice:110, image:'RP' },
  { name:'Swapnil Singh',     team:'RCB',role:'AR',  basePrice:80,  image:'SS' },
  { name:'Akash Deep',        team:'RCB',role:'BOWL',basePrice:90,  image:'AD' },
  { name:'Lockie Ferguson',   team:'RCB',role:'BOWL',basePrice:110, image:'LF' },

  // ── Kolkata Knight Riders ─────────────────────────────────────────────────
  { name:'Shreyas Iyer',      team:'KKR',role:'BAT', basePrice:160, image:'SI' },
  { name:'Andre Russell',     team:'KKR',role:'AR',  basePrice:170, image:'AR' },
  { name:'Sunil Narine',      team:'KKR',role:'AR',  basePrice:160, image:'SN' },
  { name:'Phil Salt',         team:'KKR',role:'WK',  basePrice:140, image:'PS' },
  { name:'Varun Chakravarthy',team:'KKR',role:'BOWL',basePrice:130, image:'VC' },
  { name:'Rinku Singh',       team:'KKR',role:'BAT', basePrice:130, image:'RS2'},
  { name:'Mitchell Starc',    team:'KKR',role:'BOWL',basePrice:140, image:'MSt'},
  { name:'Venkatesh Iyer',    team:'KKR',role:'AR',  basePrice:120, image:'VI' },
  { name:'Harshit Rana',      team:'KKR',role:'BOWL',basePrice:100, image:'HR' },
  { name:'Angkrish Raghuvanshi',team:'KKR',role:'BAT',basePrice:80, image:'AGR'},
  { name:'Ramandeep Singh',   team:'KKR',role:'AR',  basePrice:80,  image:'RaS'},

  // ── Delhi Capitals ────────────────────────────────────────────────────────
  { name:'David Warner',      team:'DC', role:'BAT', basePrice:150, image:'DW' },
  { name:'Rishabh Pant',      team:'DC', role:'WK',  basePrice:170, image:'RPa'},
  { name:'Axar Patel',        team:'DC', role:'AR',  basePrice:140, image:'AP' },
  { name:'Anrich Nortje',     team:'DC', role:'BOWL',basePrice:140, image:'AN' },
  { name:'Mitchell Marsh',    team:'DC', role:'AR',  basePrice:150, image:'MM' },
  { name:'Jake Fraser-McGurk',team:'DC', role:'BAT', basePrice:120, image:'JFM'},
  { name:'Kuldeep Yadav',     team:'DC', role:'BOWL',basePrice:130, image:'KY' },
  { name:'Tristan Stubbs',    team:'DC', role:'BAT', basePrice:100, image:'TS' },
  { name:'Mukesh Kumar',      team:'DC', role:'BOWL',basePrice:90,  image:'MK' },
  { name:'Abishek Porel',     team:'DC', role:'WK',  basePrice:80,  image:'AbP'},
  { name:'Khaleel Ahmed',     team:'DC', role:'BOWL',basePrice:90,  image:'KA' },

  // ── Rajasthan Royals ──────────────────────────────────────────────────────
  { name:'Sanju Samson',      team:'RR', role:'WK',  basePrice:160, image:'SS2'},
  { name:'Jos Buttler',       team:'RR', role:'WK',  basePrice:170, image:'JBu'},
  { name:'Yashasvi Jaiswal',  team:'RR', role:'BAT', basePrice:160, image:'YJ' },
  { name:'Ravichandran Ashwin',team:'RR',role:'AR',  basePrice:130, image:'RA' },
  { name:'Trent Boult',       team:'RR', role:'BOWL',basePrice:130, image:'TBo'},
  { name:'Yuzvendra Chahal',  team:'RR', role:'BOWL',basePrice:120, image:'YC' },
  { name:'Shimron Hetmyer',   team:'RR', role:'BAT', basePrice:120, image:'SH' },
  { name:'Dhruv Jurel',       team:'RR', role:'WK',  basePrice:100, image:'DJ' },
  { name:'Sandeep Sharma',    team:'RR', role:'BOWL',basePrice:90,  image:'SaS'},
  { name:'Riyan Parag',       team:'RR', role:'AR',  basePrice:110, image:'RPar'},
  { name:'Navdeep Saini',     team:'RR', role:'BOWL',basePrice:80,  image:'NS' },

  // ── Punjab Kings ─────────────────────────────────────────────────────────
  { name:'Shikhar Dhawan',    team:'PBKS',role:'BAT',basePrice:130, image:'ShD'},
  { name:'Sam Curran',        team:'PBKS',role:'AR', basePrice:150, image:'SC' },
  { name:'Arshdeep Singh',    team:'PBKS',role:'BOWL',basePrice:140,image:'AS' },
  { name:'Liam Livingstone',  team:'PBKS',role:'AR', basePrice:140, image:'LL' },
  { name:'Kagiso Rabada',     team:'PBKS',role:'BOWL',basePrice:150,image:'KR' },
  { name:'Prabhsimran Singh', team:'PBKS',role:'WK', basePrice:100, image:'PrS'},
  { name:'Jonny Bairstow',    team:'PBKS',role:'WK', basePrice:130, image:'JBa'},
  { name:'Jitesh Sharma',     team:'PBKS',role:'WK', basePrice:90,  image:'JS' },
  { name:'Rahul Chahar',      team:'PBKS',role:'BOWL',basePrice:90, image:'RC' },
  { name:'Harpreet Brar',     team:'PBKS',role:'AR', basePrice:80,  image:'HB' },
  { name:'Nathan Ellis',      team:'PBKS',role:'BOWL',basePrice:90, image:'NE' },

  // ── Sunrisers Hyderabad ───────────────────────────────────────────────────
  { name:'Pat Cummins',       team:'SRH',role:'AR',  basePrice:175, image:'PC' },
  { name:'Heinrich Klaasen',  team:'SRH',role:'WK',  basePrice:150, image:'HK' },
  { name:'Travis Head',       team:'SRH',role:'BAT', basePrice:160, image:'TH' },
  { name:'Abhishek Sharma',   team:'SRH',role:'AR',  basePrice:130, image:'AbS'},
  { name:'Mayank Agarwal',    team:'SRH',role:'BAT', basePrice:120, image:'MA' },
  { name:'Bhuvneshwar Kumar', team:'SRH',role:'BOWL',basePrice:130, image:'BK' },
  { name:'T Natarajan',       team:'SRH',role:'BOWL',basePrice:100, image:'TN' },
  { name:'Aiden Markram',     team:'SRH',role:'BAT', basePrice:130, image:'AM' },
  { name:'Washington Sundar', team:'SRH',role:'AR',  basePrice:110, image:'WS' },
  { name:'Marco Jansen',      team:'SRH',role:'AR',  basePrice:120, image:'MJ' },
  { name:'Jaydev Unadkat',    team:'SRH',role:'BOWL',basePrice:80,  image:'JU' },

  // ── Gujarat Titans ────────────────────────────────────────────────────────
  { name:'Shubman Gill',      team:'GT', role:'BAT', basePrice:170, image:'SG' },
  { name:'Hardik Pandya',     team:'GT', role:'AR',  basePrice:175, image:'HP2'},
  { name:'Mohammed Shami',    team:'GT', role:'BOWL',basePrice:160, image:'MSh'},
  { name:'Rashid Khan',       team:'GT', role:'BOWL',basePrice:170, image:'RK' },
  { name:'David Miller',      team:'GT', role:'BAT', basePrice:140, image:'DM' },
  { name:'Wriddhiman Saha',   team:'GT', role:'WK',  basePrice:100, image:'WrS'},
  { name:'Vijay Shankar',     team:'GT', role:'AR',  basePrice:90,  image:'VS' },
  { name:'Noor Ahmad',        team:'GT', role:'BOWL',basePrice:100, image:'NA' },
  { name:'Azmatullah Omarzai',team:'GT', role:'AR',  basePrice:90,  image:'AO' },
  { name:'Sai Sudharsan',     team:'GT', role:'BAT', basePrice:110, image:'SaS2'},
  { name:'Spencer Johnson',   team:'GT', role:'BOWL',basePrice:100, image:'SpJ'},

  // ── Lucknow Super Giants ──────────────────────────────────────────────────
  { name:'KL Rahul',          team:'LSG',role:'WK',  basePrice:170, image:'KL' },
  { name:'Nicholas Pooran',   team:'LSG',role:'WK',  basePrice:150, image:'NP' },
  { name:'Marcus Stoinis',    team:'LSG',role:'AR',  basePrice:140, image:'MaS'},
  { name:'Ravi Bishnoi',      team:'LSG',role:'BOWL',basePrice:120, image:'RB' },
  { name:'Mark Wood',         team:'LSG',role:'BOWL',basePrice:130, image:'MkW'},
  { name:'Deepak Hooda',      team:'LSG',role:'AR',  basePrice:100, image:'DH' },
  { name:'Quinton de Kock',   team:'LSG',role:'WK',  basePrice:140, image:'QK' },
  { name:'Krunal Pandya',     team:'LSG',role:'AR',  basePrice:110, image:'KP' },
  { name:'Mohsin Khan',       team:'LSG',role:'BOWL',basePrice:90,  image:'MoK'},
  { name:'Ayush Badoni',      team:'LSG',role:'BAT', basePrice:90,  image:'AyB'},
  { name:'Yash Thakur',       team:'LSG',role:'BOWL',basePrice:80,  image:'YT' },
];

module.exports = IPL_PLAYERS;
