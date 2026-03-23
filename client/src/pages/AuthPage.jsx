import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

// ── Animated cricket balls background ────────────────────────────────────────
function CricketBg() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const balls = Array.from({ length: 12 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 28 + 10,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      rot: Math.random() * 360,
      vrot: (Math.random() - 0.5) * 1.2,
      alpha: Math.random() * 0.08 + 0.03,
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      balls.forEach(b => {
        b.x += b.vx; b.y += b.vy; b.rot += b.vrot;
        if (b.x < -50) b.x = canvas.width + 50;
        if (b.x > canvas.width + 50) b.x = -50;
        if (b.y < -50) b.y = canvas.height + 50;
        if (b.y > canvas.height + 50) b.y = -50;

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate((b.rot * Math.PI) / 180);
        ctx.globalAlpha = b.alpha;

        // Ball
        const grad = ctx.createRadialGradient(-b.r*0.3, -b.r*0.3, 0, 0, 0, b.r);
        grad.addColorStop(0, '#e74c3c');
        grad.addColorStop(1, '#922b21');
        ctx.beginPath();
        ctx.arc(0, 0, b.r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Seam lines
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = b.r * 0.1;
        ctx.beginPath();
        ctx.arc(0, 0, b.r * 0.65, -0.4, 0.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, b.r * 0.65, Math.PI - 0.4, Math.PI + 0.4);
        ctx.stroke();

        ctx.restore();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }} />;
}

// ── Feature badge ─────────────────────────────────────────────────────────────
function Feature({ icon, text }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(255,255,255,.04)', borderRadius:10, border:'1px solid rgba(255,255,255,.07)' }}>
      <span style={{ fontSize:20 }}>{icon}</span>
      <span style={{ fontSize:13, color:'rgba(255,255,255,.65)', fontWeight:500 }}>{text}</span>
    </div>
  );
}

// ── Input field ───────────────────────────────────────────────────────────────
function Field({ label, icon, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <label style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'.08em' }}>{label}</label>
      <div style={{ position:'relative' }}>
        <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16, opacity:.5 }}>{icon}</span>
        <input
          {...props}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width:'100%', padding:'13px 14px 13px 42px',
            background:'rgba(255,255,255,.06)',
            border:`1.5px solid ${focused ? 'rgba(245,200,66,.7)' : 'rgba(255,255,255,.1)'}`,
            borderRadius:10, color:'#fff', fontSize:14,
            outline:'none', transition:'border-color .2s, box-shadow .2s',
            boxSizing:'border-box',
            boxShadow: focused ? '0 0 0 3px rgba(245,200,66,.12)' : 'none',
          }}
        />
      </div>
    </div>
  );
}

// ── Main AuthPage ─────────────────────────────────────────────────────────────
export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username:'', email:'', password:'' });
  const [err,  setErr]  = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const { login, register } = useAuth();
  const nav = useNavigate();

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.username, form.email, form.password);
      setDone(true);
      setTimeout(() => nav('/'), 600);
    } catch(e) { setErr(e.error || e.message || 'Something went wrong'); }
    finally { setBusy(false); }
  };

  const switchMode = () => { setMode(m => m==='login'?'register':'login'); setErr(''); };

  return (
    <div style={s.page}>
      <CricketBg />

      {/* Left panel — branding */}
      <div style={s.left}>
        <div style={s.brand}>
          <div style={s.logoWrap}>
            <span style={{ fontSize:52 }}>🏏</span>
            <div>
              <h1 style={s.logoTitle}>BidWar</h1>
              <p style={s.logoSub}>Cricket Auction Platform</p>
            </div>
          </div>

          <h2 style={s.tagline}>
            Build your dream team.<br />
            <span style={{ color:'var(--gold)' }}>Outsmart</span> the competition.
          </h2>
          <p style={s.tagDesc}>
            Real-time multiplayer cricket auctions with live bidding, voice chat, and detailed team analytics.
          </p>

          <div style={s.features}>
            <Feature icon="⚡" text="Real-time open bidding" />
            <Feature icon="🎙" text="Built-in voice chat" />
            <Feature icon="📊" text="Live analytics & scoring" />
            <Feature icon="🏆" text="Achievements & leaderboards" />
          </div>
        </div>

        {/* Stats bar */}
        <div style={s.statsBar}>
          {[['100','Players'],['10','Achievements'],['∞','Auctions']].map(([val,label]) => (
            <div key={label} style={s.stat}>
              <div style={s.statVal}>{val}</div>
              <div style={s.statLabel}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={s.right}>
        <div style={{ ...s.card, ...(done ? s.cardDone : {}) }}>
          {done ? (
            <div style={s.successWrap}>
              <div style={s.successIcon}>✅</div>
              <h2 style={{ fontFamily:'var(--font-d)', fontSize:28, color:'var(--gold)' }}>Welcome!</h2>
              <p style={{ color:'rgba(255,255,255,.6)', fontSize:14 }}>Taking you to the lobby…</p>
            </div>
          ) : (
            <>
              {/* Mode switcher */}
              <div style={s.modeSwitcher}>
                {[['login','Sign In'],['register','Register']].map(([m,l]) => (
                  <button key={m} onClick={() => { setMode(m); setErr(''); }}
                    style={{ ...s.modeBtn, ...(mode===m ? s.modeBtnA : {}) }}>
                    {l}
                    {mode===m && <div style={s.modeUnderline} />}
                  </button>
                ))}
              </div>

              <div style={s.cardTitle}>
                {mode === 'login' ? 'Welcome back 👋' : 'Join the auction 🏏'}
              </div>
              <p style={s.cardSub}>
                {mode === 'login'
                  ? 'Sign in to continue to your auction room'
                  : 'Create an account and start bidding'}
              </p>

              <form onSubmit={submit} style={s.form}>
                {mode === 'register' && (
                  <Field label="Username" icon="👤" name="username" value={form.username} onChange={handle}
                    placeholder="your_username" required minLength={3} autoComplete="username" />
                )}
                <Field label="Email" icon="✉️" name="email" type="email" value={form.email} onChange={handle}
                  placeholder="you@example.com" required autoComplete="email" />
                <Field label="Password" icon="🔒" name="password" type="password" value={form.password} onChange={handle}
                  placeholder="••••••••" required minLength={6} autoComplete={mode==='login'?'current-password':'new-password'} />

                {err && (
                  <div style={s.errBox}>
                    <span style={{ fontSize:16 }}>⚠️</span>
                    <span>{err}</span>
                  </div>
                )}

                <button type="submit" disabled={busy} style={{ ...s.submitBtn, ...(busy ? s.submitBusy : {}) }}>
                  {busy
                    ? <><span style={s.spinner} />Please wait…</>
                    : mode === 'login' ? '🚀 Sign In' : '🏏 Create Account'
                  }
                </button>
              </form>

              <div style={s.divider}>
                <div style={s.divLine} />
                <span style={s.divText}>or</span>
                <div style={s.divLine} />
              </div>

              <p style={s.switchRow}>
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                <button onClick={switchMode} style={s.switchBtn}>
                  {mode === 'login' ? 'Register here' : 'Sign in here'}
                </button>
              </p>
            </>
          )}
        </div>

        {/* Bottom note */}
        <p style={s.bottomNote}>
          🔒 Your data is secure. No spam, ever.
        </p>
      </div>
    </div>
  );
}

const s = {
  page:        { minHeight:'100vh', display:'flex', background:'#080b12', position:'relative', overflow:'hidden' },

  // Left
  left:        { flex:1, display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'60px 56px', position:'relative', zIndex:1, '@media(max-width:900px)':{ display:'none' } },
  brand:       { display:'flex', flexDirection:'column', gap:32 },
  logoWrap:    { display:'flex', alignItems:'center', gap:16 },
  logoTitle:   { fontFamily:'var(--font-d)', fontSize:52, color:'#f5c842', letterSpacing:'.04em', lineHeight:1 },
  logoSub:     { fontSize:14, color:'rgba(255,255,255,.4)', marginTop:4, letterSpacing:'.06em' },
  tagline:     { fontFamily:'var(--font-d)', fontSize:38, color:'#fff', lineHeight:1.2, letterSpacing:'.02em' },
  tagDesc:     { fontSize:15, color:'rgba(255,255,255,.5)', lineHeight:1.7, maxWidth:440 },
  features:    { display:'flex', flexDirection:'column', gap:10, maxWidth:380 },
  statsBar:    { display:'flex', gap:32, padding:'20px 0', borderTop:'1px solid rgba(255,255,255,.08)' },
  stat:        { display:'flex', flexDirection:'column', gap:4 },
  statVal:     { fontFamily:'var(--font-d)', fontSize:36, color:'#f5c842', lineHeight:1 },
  statLabel:   { fontSize:12, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'.08em' },

  // Right
  right:       { width:480, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 32px', position:'relative', zIndex:1, background:'rgba(255,255,255,.02)', borderLeft:'1px solid rgba(255,255,255,.06)', backdropFilter:'blur(20px)' },
  card:        { width:'100%', maxWidth:400, display:'flex', flexDirection:'column', gap:20, transition:'all .4s' },
  cardDone:    { transform:'scale(1.02)' },

  // Mode switcher
  modeSwitcher:{ display:'flex', gap:0, marginBottom:4, borderBottom:'1px solid rgba(255,255,255,.08)', paddingBottom:0 },
  modeBtn:     { flex:1, padding:'12px 0', background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', fontSize:15, fontWeight:600, fontFamily:'var(--font-b)', transition:'color .2s', position:'relative', paddingBottom:14 },
  modeBtnA:    { color:'#fff' },
  modeUnderline:{ position:'absolute', bottom:-1, left:0, right:0, height:2, background:'#f5c842', borderRadius:2 },

  // Card content
  cardTitle:   { fontFamily:'var(--font-d)', fontSize:28, color:'#fff', letterSpacing:'.02em', marginTop:8 },
  cardSub:     { fontSize:13, color:'rgba(255,255,255,.45)', marginTop:-12, lineHeight:1.5 },
  form:        { display:'flex', flexDirection:'column', gap:16 },
  errBox:      { display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(231,76,60,.15)', border:'1px solid rgba(231,76,60,.3)', borderRadius:10, color:'#ff7875', fontSize:13 },

  // Submit button
  submitBtn:   { width:'100%', padding:'15px', background:'linear-gradient(135deg,#f5c842,#e8a020)', border:'none', borderRadius:12, color:'#0a0a0f', fontSize:15, fontWeight:800, cursor:'pointer', transition:'all .2s', display:'flex', alignItems:'center', justifyContent:'center', gap:8, letterSpacing:'.02em', boxShadow:'0 4px 20px rgba(245,200,66,.3)', fontFamily:'var(--font-b)' },
  submitBusy:  { opacity:.7, cursor:'not-allowed', transform:'none' },
  spinner:     { width:16, height:16, border:'2px solid rgba(0,0,0,.2)', borderTopColor:'#0a0a0f', borderRadius:'50%', display:'inline-block', animation:'spin 0.8s linear infinite' },

  // Divider
  divider:     { display:'flex', alignItems:'center', gap:12 },
  divLine:     { flex:1, height:1, background:'rgba(255,255,255,.08)' },
  divText:     { fontSize:12, color:'rgba(255,255,255,.3)' },

  // Switch
  switchRow:   { textAlign:'center', fontSize:13, color:'rgba(255,255,255,.4)', display:'flex', alignItems:'center', justifyContent:'center', gap:8 },
  switchBtn:   { background:'none', border:'none', color:'#f5c842', cursor:'pointer', fontSize:13, fontWeight:700 },

  // Success
  successWrap: { display:'flex', flexDirection:'column', alignItems:'center', gap:16, padding:'40px 0', textAlign:'center' },
  successIcon: { fontSize:64 },

  // Bottom
  bottomNote:  { marginTop:24, fontSize:12, color:'rgba(255,255,255,.25)', textAlign:'center' },
};
