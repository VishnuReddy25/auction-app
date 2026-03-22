import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export default function AuthPage() {
  const [mode, setMode]   = useState('login');
  const [form, setForm]   = useState({ username:'', email:'', password:'' });
  const [err,  setErr]    = useState('');
  const [busy, setBusy]   = useState(false);
  const { login, register } = useAuth();
  const nav = useNavigate();

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.username, form.email, form.password);
      nav('/');
    } catch(e) { setErr(e.error || e.message || 'Something went wrong'); }
    finally { setBusy(false); }
  };

  return (
    <div style={s.page}>
      <div style={s.bg} />
      <div style={s.card} className="fade-in">
        <div style={s.logo}><span style={{ fontSize:38 }}>🏏</span><h1 style={s.title}>BidWar</h1></div>
        <p style={s.sub}>Real-time Cricket Auction</p>

        <div style={s.tabs}>
          {[['login','Sign In'],['register','Register']].map(([m,l]) => (
            <button key={m} style={{ ...s.tab, ...(mode===m?s.tabA:{}) }} onClick={() => { setMode(m); setErr(''); }}>{l}</button>
          ))}
        </div>

        <form onSubmit={submit} style={s.form}>
          {mode === 'register' && (
            <label style={s.field}>
              <span style={s.label}>Username</span>
              <input name="username" value={form.username} onChange={handle} placeholder="your_name" required minLength={3} className="input" />
            </label>
          )}
          <label style={s.field}>
            <span style={s.label}>Email</span>
            <input name="email" type="email" value={form.email} onChange={handle} placeholder="you@example.com" required className="input" />
          </label>
          <label style={s.field}>
            <span style={s.label}>Password</span>
            <input name="password" type="password" value={form.password} onChange={handle} placeholder="••••••••" required minLength={6} className="input" />
          </label>
          {err && <p style={s.err}>{err}</p>}
          <button type="submit" disabled={busy} className="btn btn-gold btn-full btn-lg" style={{ marginTop:4 }}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p style={s.sw}>
          {mode === 'login' ? "No account? " : "Already registered? "}
          <button style={s.swBtn} onClick={() => { setMode(mode==='login'?'register':'login'); setErr(''); }}>
            {mode === 'login' ? 'Register' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24, position:'relative' },
  bg:   { position:'fixed', inset:0, background:'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(245,200,66,0.12), transparent 60%), var(--bg)' },
  card: { position:'relative', zIndex:1, width:'100%', maxWidth:420, background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:20, padding:'40px 36px' },
  logo: { display:'flex', alignItems:'center', gap:12, marginBottom:6 },
  title:{ fontFamily:'var(--font-d)', fontSize:44, color:'var(--gold)', letterSpacing:'.04em' },
  sub:  { color:'var(--text2)', fontSize:14, marginBottom:32 },
  tabs: { display:'flex', background:'var(--bg3)', borderRadius:8, padding:3, marginBottom:28, gap:3 },
  tab:  { flex:1, padding:'8px 0', border:'none', background:'transparent', color:'var(--text2)', cursor:'pointer', borderRadius:6, fontSize:14, fontWeight:600, fontFamily:'var(--font-b)', transition:'all 150ms' },
  tabA: { background:'var(--surface2)', color:'var(--text)' },
  form: { display:'flex', flexDirection:'column', gap:14 },
  field:{ display:'flex', flexDirection:'column', gap:5 },
  label:{ fontSize:13, color:'var(--text2)', fontWeight:500 },
  err:  { color:'var(--red)', fontSize:13, padding:'8px 12px', background:'rgba(231,76,60,.1)', borderRadius:6 },
  sw:   { textAlign:'center', marginTop:20, color:'var(--text2)', fontSize:14 },
  swBtn:{ background:'none', border:'none', color:'var(--gold)', cursor:'pointer', fontSize:14, fontWeight:600 },
};
