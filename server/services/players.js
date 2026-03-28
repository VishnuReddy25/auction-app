// All prices in LAKHS. 100L = ₹1 Crore
const PLAYERS = [
{ name:'Virat Kohli', role:'Batsman', team:'India', basePrice:200, image:'VK', stats:{ avg:58.7, sr:138.1, runs:13000, wkts:4, eco:0, form:'WWWLW' } },
{ name:'Rohit Sharma', role:'Batsman', team:'India', basePrice:180, image:'RS', stats:{ avg:49.0, sr:140.5, runs:10000, wkts:8, eco:8.5, form:'WWLWW' } },
{ name:'Shubman Gill', role:'Batsman', team:'India', basePrice:150, image:'SG', stats:{ avg:47.5, sr:138.0, runs:3200, wkts:0, eco:0, form:'WWWLW' } },
{ name:'Suryakumar Yadav', role:'Batsman', team:'India', basePrice:160, image:'SKY', stats:{ avg:44.0, sr:155.0, runs:2500, wkts:0, eco:0, form:'WWWWW' } },
{ name:'Shreyas Iyer', role:'Batsman', team:'India', basePrice:140, image:'SI', stats:{ avg:46.2, sr:130.0, runs:3000, wkts:0, eco:0, form:'WLWWL' } },
{ name:'Ruturaj Gaikwad', role:'Batsman', team:'India', basePrice:130, image:'RG', stats:{ avg:43.0, sr:135.0, runs:1800, wkts:0, eco:0, form:'WWLWW' } },
{ name:'Yashasvi Jaiswal', role:'Batsman', team:'India', basePrice:140, image:'YJ', stats:{ avg:46.0, sr:148.0, runs:1600, wkts:0, eco:0, form:'WWWLW' } },
{ name:'Tilak Varma', role:'Batsman', team:'India', basePrice:125, image:'TV', stats:{ avg:40.0, sr:140.0, runs:1200, wkts:0, eco:0, form:'WLWWW' } },
{ name:'Devdutt Padikkal', role:'Batsman', team:'India', basePrice:120, image:'DP', stats:{ avg:38.0, sr:132.0, runs:1400, wkts:0, eco:0, form:'LWWWL' } },
{ name:'Rahul Tripathi', role:'Batsman', team:'India', basePrice:120, image:'RT', stats:{ avg:36.5, sr:140.0, runs:1500, wkts:0, eco:0, form:'WWLWL' } },

{ name:'Joe Root', role:'Batsman', team:'England', basePrice:175, image:'JR', stats:{ avg:50.2, sr:126.5, runs:6200, wkts:30, eco:7.4, form:'WLWWL' } },
{ name:'Harry Brook', role:'Batsman', team:'England', basePrice:150, image:'HB', stats:{ avg:45.0, sr:145.0, runs:1800, wkts:0, eco:0, form:'WWLWW' } },
{ name:'Dawid Malan', role:'Batsman', team:'England', basePrice:140, image:'DM', stats:{ avg:48.0, sr:135.0, runs:2000, wkts:0, eco:0, form:'WLWWW' } },
{ name:'Jason Roy', role:'Batsman', team:'England', basePrice:130, image:'JRy', stats:{ avg:41.0, sr:139.0, runs:4200, wkts:0, eco:0, form:'LWWLW' } },
{ name:'Alex Hales', role:'Batsman', team:'England', basePrice:130, image:'AH', stats:{ avg:38.0, sr:147.0, runs:3000, wkts:0, eco:0, form:'WWLWW' } },
{ name:'Ben Duckett', role:'Batsman', team:'England', basePrice:120, image:'BD', stats:{ avg:39.0, sr:136.0, runs:1500, wkts:0, eco:0, form:'WLWWL' } },
{ name:'Zak Crawley', role:'Batsman', team:'England', basePrice:115, image:'ZC', stats:{ avg:35.0, sr:128.0, runs:1300, wkts:0, eco:0, form:'LWLWW' } },
{ name:'Phil Salt', role:'Batsman', team:'England', basePrice:125, image:'PS', stats:{ avg:42.0, sr:150.0, runs:1600, wkts:0, eco:0, form:'WWWLW' } },
{ name:'James Vince', role:'Batsman', team:'England', basePrice:120, image:'JV', stats:{ avg:38.5, sr:132.0, runs:1800, wkts:0, eco:0, form:'WWLWL' } },
{ name:'Sam Hain', role:'Batsman', team:'England', basePrice:110, image:'SH', stats:{ avg:40.0, sr:130.0, runs:1100, wkts:0, eco:0, form:'WLWWW' } },

{ name:'Steve Smith', role:'Batsman', team:'Australia', basePrice:180, image:'SS', stats:{ avg:48.9, sr:128.4, runs:5400, wkts:28, eco:7.2, form:'WLWLW' } },
{ name:'David Warner', role:'Batsman', team:'Australia', basePrice:155, image:'DW', stats:{ avg:45.3, sr:142.3, runs:7000, wkts:1, eco:9.5, form:'LWWWL' } },
{ name:'Marnus Labuschagne', role:'Batsman', team:'Australia', basePrice:150, image:'ML', stats:{ avg:46.0, sr:130.0, runs:3500, wkts:10, eco:7.0, form:'WLWWL' } },
{ name:'Travis Head', role:'Batsman', team:'Australia', basePrice:145, image:'TH', stats:{ avg:44.0, sr:140.0, runs:3000, wkts:5, eco:7.5, form:'WWLWW' } },
{ name:'Aaron Finch', role:'Batsman', team:'Australia', basePrice:135, image:'AF', stats:{ avg:42.0, sr:145.0, runs:5500, wkts:0, eco:0, form:'LWLWW' } },
{ name:'Usman Khawaja', role:'Batsman', team:'Australia', basePrice:140, image:'UK', stats:{ avg:45.0, sr:125.0, runs:3500, wkts:0, eco:0, form:'WWLWL' } },
{ name:'Tim David', role:'Batsman', team:'Australia', basePrice:135, image:'TD', stats:{ avg:35.0, sr:160.0, runs:1200, wkts:0, eco:0, form:'WWWLW' } },
{ name:'Matthew Wade', role:'Batsman', team:'Australia', basePrice:125, image:'MW', stats:{ avg:37.0, sr:138.0, runs:1800, wkts:0, eco:0, form:'WLWWL' } },
{ name:'Josh Inglis', role:'Batsman', team:'Australia', basePrice:120, image:'JI', stats:{ avg:39.0, sr:145.0, runs:1400, wkts:0, eco:0, form:'WWLWW' } },
{ name:'Cameron Bancroft', role:'Batsman', team:'Australia', basePrice:110, image:'CB', stats:{ avg:34.0, sr:120.0, runs:1300, wkts:0, eco:0, form:'LWWLW' } },

{ name:'Quinton de Kock', role:'Batsman', team:'South Africa', basePrice:145, image:'QK', stats:{ avg:44.2, sr:138.5, runs:3885, wkts:0, eco:0, form:'WWLWW' } },
{ name:'Temba Bavuma', role:'Batsman', team:'South Africa', basePrice:130, image:'TB', stats:{ avg:42.0, sr:125.0, runs:2500, wkts:0, eco:0, form:'WLWWL' } },
{ name:'Rassie van der Dussen', role:'Batsman', team:'South Africa', basePrice:140, image:'RVD', stats:{ avg:48.0, sr:130.0, runs:2800, wkts:0, eco:0, form:'WWLWW' } },
{ name:'Aiden Markram', role:'Batsman', team:'South Africa', basePrice:145, image:'AM', stats:{ avg:45.0, sr:135.0, runs:2600, wkts:20, eco:7.5, form:'WLWWW' } },
{ name:'David Miller', role:'Batsman', team:'South Africa', basePrice:150, image:'DM', stats:{ avg:41.5, sr:139.8, runs:4200, wkts:0, eco:0, form:'WWLWW' } },
{ name:'Heinrich Klaasen', role:'Batsman', team:'South Africa', basePrice:145, image:'HK', stats:{ avg:43.0, sr:150.0, runs:2200, wkts:0, eco:0, form:'WWWLW' } },
{ name:'Reeza Hendricks', role:'Batsman', team:'South Africa', basePrice:130, image:'RH', stats:{ avg:40.0, sr:130.0, runs:2000, wkts:0, eco:0, form:'WLWWL' } },
{ name:'Ryan Rickelton', role:'Batsman', team:'South Africa', basePrice:120, image:'RR', stats:{ avg:38.0, sr:135.0, runs:1500, wkts:0, eco:0, form:'LWWLW' } },
{ name:'Kyle Verreynne', role:'Batsman', team:'South Africa', basePrice:125, image:'KV', stats:{ avg:37.0, sr:132.0, runs:1400, wkts:0, eco:0, form:'WWLWL' } },
{ name:'Dewald Brevis', role:'Batsman', team:'South Africa', basePrice:135, image:'DB', stats:{ avg:39.0, sr:155.0, runs:1300, wkts:0, eco:0, form:'WWWLW' } },

{ name:'Jasprit Bumrah', role:'Bowler', team:'India', basePrice:160, image:'JB', stats:{ avg:6.5, sr:72, runs:60, wkts:150, eco:6.3, form:'WWLWL' } },
{ name:'Mohammed Shami', role:'Bowler', team:'India', basePrice:150, image:'MS', stats:{ avg:18.5, sr:95, runs:200, wkts:180, eco:7.2, form:'WLWWL' } },
{ name:'Mohammed Siraj', role:'Bowler', team:'India', basePrice:145, image:'MSI', stats:{ avg:20.0, sr:90, runs:180, wkts:140, eco:6.8, form:'WWLWW' } },
{ name:'Bhuvneshwar Kumar', role:'Bowler', team:'India', basePrice:135, image:'BK', stats:{ avg:23.0, sr:105, runs:250, wkts:160, eco:7.0, form:'WLWLW' } },
{ name:'Yuzvendra Chahal', role:'Bowler', team:'India', basePrice:140, image:'YC', stats:{ avg:22.5, sr:85, runs:210, wkts:180, eco:7.6, form:'WWLWL' } },
{ name:'Kuldeep Yadav', role:'Bowler', team:'India', basePrice:140, image:'KY', stats:{ avg:21.0, sr:80, runs:190, wkts:160, eco:7.3, form:'WLWWW' } },
{ name:'Arshdeep Singh', role:'Bowler', team:'India', basePrice:130, image:'AS', stats:{ avg:24.0, sr:95, runs:170, wkts:110, eco:8.1, form:'WWLWW' } },
{ name:'Prasidh Krishna', role:'Bowler', team:'India', basePrice:125, image:'PK', stats:{ avg:25.0, sr:100, runs:160, wkts:100, eco:7.9, form:'WLWWL' } },
{ name:'Deepak Chahar', role:'Bowler', team:'India', basePrice:130, image:'DC', stats:{ avg:23.0, sr:92, runs:150, wkts:95, eco:7.8, form:'LWWLW' } },
{ name:'Shardul Thakur', role:'Bowler', team:'India', basePrice:135, image:'ST', stats:{ avg:26.0, sr:98, runs:180, wkts:120, eco:8.5, form:'WWLWL' } },

/* ================= ENGLAND (10) ================= */
{ name:'Jofra Archer', role:'Bowler', team:'England', basePrice:155, image:'JA', stats:{ avg:20.0, sr:90, runs:150, wkts:130, eco:7.5, form:'WLWLW' } },
{ name:'Mark Wood', role:'Bowler', team:'England', basePrice:145, image:'MW', stats:{ avg:21.5, sr:88, runs:140, wkts:120, eco:7.4, form:'WWLWW' } },
{ name:'Chris Woakes', role:'Bowler', team:'England', basePrice:140, image:'CW', stats:{ avg:24.0, sr:100, runs:220, wkts:150, eco:7.2, form:'WLWWL' } },
{ name:'Adil Rashid', role:'Bowler', team:'England', basePrice:135, image:'AR', stats:{ avg:23.0, sr:85, runs:200, wkts:180, eco:7.5, form:'WWLWL' } },
{ name:'Reece Topley', role:'Bowler', team:'England', basePrice:130, image:'RT', stats:{ avg:22.0, sr:92, runs:150, wkts:110, eco:7.6, form:'WLWWL' } },
{ name:'David Willey', role:'Bowler', team:'England', basePrice:130, image:'DW', stats:{ avg:25.0, sr:105, runs:210, wkts:130, eco:7.8, form:'LWWLW' } },
{ name:'Brydon Carse', role:'Bowler', team:'England', basePrice:120, image:'BC', stats:{ avg:26.0, sr:102, runs:170, wkts:100, eco:8.0, form:'WWLWL' } },
{ name:'Olly Stone', role:'Bowler', team:'England', basePrice:120, image:'OS', stats:{ avg:24.5, sr:95, runs:140, wkts:90, eco:7.9, form:'WLWLW' } },
{ name:'Luke Wood', role:'Bowler', team:'England', basePrice:115, image:'LW', stats:{ avg:25.5, sr:100, runs:150, wkts:95, eco:8.2, form:'LWWLW' } },
{ name:'Sam Curran', role:'Bowler', team:'England', basePrice:150, image:'SC', stats:{ avg:27.0, sr:98, runs:200, wkts:140, eco:8.4, form:'WWLWW' } },

/* ================= AUSTRALIA (10) ================= */
{ name:'Pat Cummins', role:'Bowler', team:'Australia', basePrice:165, image:'PC', stats:{ avg:17.0, sr:100, runs:400, wkts:230, eco:7.3, form:'WLWWL' } },
{ name:'Mitchell Starc', role:'Bowler', team:'Australia', basePrice:150, image:'MS', stats:{ avg:18.0, sr:95, runs:350, wkts:200, eco:7.5, form:'WWLWL' } },
{ name:'Josh Hazlewood', role:'Bowler', team:'Australia', basePrice:150, image:'JH', stats:{ avg:19.0, sr:92, runs:300, wkts:180, eco:6.9, form:'WLWWL' } },
{ name:'Adam Zampa', role:'Bowler', team:'Australia', basePrice:140, image:'AZ', stats:{ avg:22.0, sr:85, runs:250, wkts:170, eco:7.4, form:'WWLWL' } },
{ name:'Nathan Lyon', role:'Bowler', team:'Australia', basePrice:145, image:'NL', stats:{ avg:24.0, sr:110, runs:280, wkts:190, eco:7.2, form:'WLWLW' } },
{ name:'Sean Abbott', role:'Bowler', team:'Australia', basePrice:130, image:'SA', stats:{ avg:26.0, sr:105, runs:220, wkts:130, eco:8.0, form:'WWLWW' } },
{ name:'Jhye Richardson', role:'Bowler', team:'Australia', basePrice:135, image:'JR', stats:{ avg:23.0, sr:95, runs:180, wkts:120, eco:7.6, form:'WLWWL' } },
{ name:'Kane Richardson', role:'Bowler', team:'Australia', basePrice:130, image:'KR', stats:{ avg:25.0, sr:100, runs:200, wkts:140, eco:8.1, form:'LWWLW' } },
{ name:'Ashton Agar', role:'Bowler', team:'Australia', basePrice:135, image:'AA', stats:{ avg:27.0, sr:105, runs:210, wkts:110, eco:7.9, form:'WLWLW' } },
{ name:'Scott Boland', role:'Bowler', team:'Australia', basePrice:125, image:'SB', stats:{ avg:20.0, sr:88, runs:160, wkts:100, eco:6.8, form:'WWLWW' } },

/* ================= SOUTH AFRICA (10) ================= */
{ name:'Kagiso Rabada', role:'Bowler', team:'South Africa', basePrice:155, image:'KR', stats:{ avg:17.5, sr:90, runs:300, wkts:250, eco:7.1, form:'WLWWW' } },
{ name:'Anrich Nortje', role:'Bowler', team:'South Africa', basePrice:150, image:'AN', stats:{ avg:19.0, sr:88, runs:250, wkts:180, eco:7.4, form:'WWLWL' } },
{ name:'Lungi Ngidi', role:'Bowler', team:'South Africa', basePrice:140, image:'LN', stats:{ avg:22.0, sr:95, runs:200, wkts:140, eco:7.6, form:'WLWWL' } },
{ name:'Tabraiz Shamsi', role:'Bowler', team:'South Africa', basePrice:135, image:'TS', stats:{ avg:23.0, sr:85, runs:180, wkts:150, eco:7.3, form:'WWLWL' } },
{ name:'Keshav Maharaj', role:'Bowler', team:'South Africa', basePrice:140, image:'KM', stats:{ avg:24.0, sr:100, runs:220, wkts:160, eco:7.2, form:'WLWLW' } },
{ name:'Gerald Coetzee', role:'Bowler', team:'South Africa', basePrice:135, image:'GC', stats:{ avg:21.0, sr:90, runs:170, wkts:110, eco:7.8, form:'WWLWW' } },
{ name:'Marco Jansen', role:'Bowler', team:'South Africa', basePrice:145, image:'MJ', stats:{ avg:23.0, sr:95, runs:200, wkts:120, eco:7.7, form:'WLWWL' } },
{ name:'Sisanda Magala', role:'Bowler', team:'South Africa', basePrice:130, image:'SM', stats:{ avg:25.0, sr:100, runs:210, wkts:110, eco:8.2, form:'LWWLW' } },
{ name:'Beuran Hendricks', role:'Bowler', team:'South Africa', basePrice:125, image:'BH', stats:{ avg:24.0, sr:98, runs:190, wkts:120, eco:7.9, form:'WLWLW' } },
{ name:'Wayne Parnell', role:'Bowler', team:'South Africa', basePrice:130, image:'WP', stats:{ avg:26.0, sr:105, runs:230, wkts:130, eco:8.3, form:'WWLWL' } },
{ name:'MS Dhoni', role:'Wicket-Keeper', team:'India', basePrice:220, image:'MSD', stats:{ avg:50.6, sr:135.2, runs:10773, wkts:1, eco:9.0, form:'WWWWL' } },
{ name:'KL Rahul', role:'Wicket-Keeper', team:'India', basePrice:140, image:'KL', stats:{ avg:45.5, sr:136.8, runs:2300, wkts:0, eco:0, form:'LWWWL' } },
{ name:'Rishabh Pant', role:'Wicket-Keeper', team:'India', basePrice:160, image:'RP', stats:{ avg:43.0, sr:145.0, runs:2800, wkts:0, eco:0, form:'WWLWW' } },

{ name:'Jos Buttler', role:'Wicket-Keeper', team:'England', basePrice:170, image:'JB', stats:{ avg:41.2, sr:147.5, runs:4800, wkts:0, eco:0, form:'WWLWW' } },
{ name:'Jonny Bairstow', role:'Wicket-Keeper', team:'England', basePrice:150, image:'JBs', stats:{ avg:42.5, sr:142.0, runs:4500, wkts:0, eco:0, form:'WLWWW' } },

{ name:'Alex Carey', role:'Wicket-Keeper', team:'Australia', basePrice:135, image:'AC', stats:{ avg:39.0, sr:130.0, runs:2000, wkts:0, eco:0, form:'WWLWL' } },

{ name:'Heinrich Klaasen', role:'Wicket-Keeper', team:'South Africa', basePrice:145, image:'HK', stats:{ avg:43.0, sr:150.0, runs:2200, wkts:0, eco:0, form:'WWWLW' } },
{ name:'Kyle Verreynne', role:'Wicket-Keeper', team:'South Africa', basePrice:125, image:'KV', stats:{ avg:37.0, sr:132.0, runs:1400, wkts:0, eco:0, form:'WWLWL' } },

/* ================= ALL ROUNDERS (12) ================= */
{ name:'Hardik Pandya', role:'All-Rounder', team:'India', basePrice:155, image:'HP', stats:{ avg:33.5, sr:145.2, runs:1800, wkts:80, eco:8.7, form:'WWLWW' } },
{ name:'Ravindra Jadeja', role:'All-Rounder', team:'India', basePrice:150, image:'RJ', stats:{ avg:26.5, sr:127.4, runs:2600, wkts:140, eco:7.5, form:'WLWWW' } },
{ name:'Axar Patel', role:'All-Rounder', team:'India', basePrice:140, image:'AP', stats:{ avg:28.0, sr:135.0, runs:1500, wkts:110, eco:7.4, form:'WWLWL' } },

{ name:'Ben Stokes', role:'All-Rounder', team:'England', basePrice:190, image:'BS', stats:{ avg:36.8, sr:131.0, runs:3000, wkts:200, eco:8.8, form:'WLWWW' } },
{ name:'Moeen Ali', role:'All-Rounder', team:'England', basePrice:150, image:'MA', stats:{ avg:29.0, sr:142.0, runs:2500, wkts:180, eco:7.8, form:'WWLWW' } },
{ name:'Liam Livingstone', role:'All-Rounder', team:'England', basePrice:155, image:'LL', stats:{ avg:32.0, sr:150.0, runs:2000, wkts:70, eco:8.5, form:'WWWLW' } },

{ name:'Mitchell Marsh', role:'All-Rounder', team:'Australia', basePrice:155, image:'MM', stats:{ avg:35.0, sr:140.0, runs:2800, wkts:90, eco:8.2, form:'WWLWW' } },
{ name:'Marcus Stoinis', role:'All-Rounder', team:'Australia', basePrice:150, image:'MS', stats:{ avg:31.0, sr:145.0, runs:2500, wkts:85, eco:8.6, form:'WLWWW' } },
{ name:'Glenn Maxwell', role:'All-Rounder', team:'Australia', basePrice:170, image:'GM', stats:{ avg:34.2, sr:150.0, runs:3600, wkts:60, eco:8.3, form:'WLWWW' } },

{ name:'Marco Jansen', role:'All-Rounder', team:'South Africa', basePrice:150, image:'MJ', stats:{ avg:28.0, sr:135.0, runs:1200, wkts:90, eco:7.8, form:'WWLWL' } },
{ name:'Andile Phehlukwayo', role:'All-Rounder', team:'South Africa', basePrice:140, image:'APh', stats:{ avg:30.0, sr:130.0, runs:1600, wkts:120, eco:8.1, form:'WLWWL' } },
{ name:'Wiaan Mulder', role:'All-Rounder', team:'South Africa', basePrice:135, image:'WM', stats:{ avg:29.0, sr:128.0, runs:1400, wkts:100, eco:7.9, form:'WWLWL' } }
];

module.exports = PLAYERS;
