// All prices in LAKHS. 100L = ₹1 Crore
const PLAYERS = [
  { name:'Virat Kohli',     role:'Batsman',       team:'India',       basePrice:200, image:'VK', stats:{ avg:59.1, sr:138.2, runs:12898, wkts:4,  eco:0,   form:'WWWLW' } },
  { name:'Rohit Sharma',    role:'Batsman',       team:'India',       basePrice:180, image:'RO', stats:{ avg:48.6, sr:140.9, runs:9825,  wkts:8,  eco:8.6, form:'WWLWW' } },
  { name:'MS Dhoni',        role:'Wicket-Keeper', team:'India',       basePrice:220, image:'MSD',stats:{ avg:50.6, sr:135.2, runs:10773, wkts:1,  eco:9.0, form:'WWWWL' } },
  { name:'Jasprit Bumrah',  role:'Bowler',        team:'India',       basePrice:160, image:'JB', stats:{ avg:6.2,  sr:72,    runs:59,    wkts:145,eco:6.4, form:'WWLWL' } },
  { name:'Hardik Pandya',   role:'All-Rounder',   team:'India',       basePrice:155, image:'HP', stats:{ avg:32.1, sr:147.8, runs:1476,  wkts:75, eco:8.9, form:'WWLWW' } },
  { name:'Ravindra Jadeja', role:'All-Rounder',   team:'India',       basePrice:150, image:'RJ', stats:{ avg:26.5, sr:127.4, runs:2502,  wkts:135,eco:7.6, form:'WLWWW' } },
  { name:'KL Rahul',        role:'Batsman',       team:'India',       basePrice:140, image:'KL', stats:{ avg:45.5, sr:136.8, runs:2265,  wkts:0,  eco:0,   form:'LWWWL' } },
  { name:'Ben Stokes',      role:'All-Rounder',   team:'England',     basePrice:190, image:'BS', stats:{ avg:37.2, sr:130.5, runs:2924,  wkts:195,eco:8.8, form:'WLWWW' } },
  { name:'Joe Root',        role:'Batsman',       team:'England',     basePrice:175, image:'JR', stats:{ avg:53.9, sr:127.6, runs:3549,  wkts:42, eco:7.5, form:'WLWWL' } },
  { name:'Pat Cummins',     role:'Bowler',        team:'Australia',   basePrice:165, image:'PC', stats:{ avg:16.5, sr:110.2, runs:422,   wkts:230,eco:7.3, form:'WLWWL' } },
  { name:'David Warner',    role:'Batsman',       team:'Australia',   basePrice:155, image:'DW', stats:{ avg:45.3, sr:142.3, runs:6932,  wkts:1,  eco:9.5, form:'LWWWL' } },
  { name:'Mitchell Starc',  role:'Bowler',        team:'Australia',   basePrice:150, image:'MS', stats:{ avg:12.2, sr:95.4,  runs:334,   wkts:196,eco:7.5, form:'WWLWL' } },
  { name:'Babar Azam',      role:'Batsman',       team:'Pakistan',    basePrice:160, image:'BA', stats:{ avg:56.1, sr:129.3, runs:3858,  wkts:0,  eco:0,   form:'WWWWW' } },
  { name:'Shaheen Afridi',  role:'Bowler',        team:'Pakistan',    basePrice:145, image:'SA', stats:{ avg:10.4, sr:88.2,  runs:187,   wkts:116,eco:7.2, form:'WLWWL' } },
  { name:'Rashid Khan',     role:'Bowler',        team:'Afghanistan', basePrice:140, image:'RK', stats:{ avg:18.2, sr:152.4, runs:674,   wkts:182,eco:6.2, form:'WLWWW' } },
  { name:'Kane Williamson', role:'Batsman',       team:'New Zealand', basePrice:170, image:'KW', stats:{ avg:47.5, sr:120.8, runs:3227,  wkts:37, eco:7.1, form:'LWWLW' } },
  { name:'Trent Boult',     role:'Bowler',        team:'New Zealand', basePrice:135, image:'TB', stats:{ avg:11.8, sr:90.3,  runs:232,   wkts:169,eco:8.0, form:'WLWWL' } },
  { name:'Quinton de Kock', role:'Wicket-Keeper', team:'South Africa',basePrice:145, image:'QK', stats:{ avg:44.2, sr:138.5, runs:3885,  wkts:0,  eco:0,   form:'WWLWW' } },
];

module.exports = PLAYERS;
