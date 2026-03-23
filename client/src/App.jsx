import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { authLogin, authRegister, authMe } from './services';
import AuthPage       from './pages/AuthPage';
import LobbyPage      from './pages/LobbyPage';
import RoomPage       from './pages/RoomPage';
import AuctionPage    from './pages/AuctionPage';
import TeamStatsPage  from './pages/TeamStatsPage';
import ReplayPage     from './pages/ReplayPage';

// ── Auth Context ─────────────────────────────────────────────────────────────
const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    authMe().then(({ user: u }) => setUser(u)).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user: u } = await authLogin({ email, password });
    localStorage.setItem('token', token);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const { token, user: u } = await authRegister({ username, email, password });
    localStorage.setItem('token', token);
    setUser(u);
    return u;
  }, []);

  const loginWithToken = useCallback((token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
  }, []);

  const logout = useCallback(() => { localStorage.removeItem('token'); setUser(null); }, []);

  return <AuthCtx.Provider value={{ user, loading, login, register, logout, loginWithToken }}>{children}</AuthCtx.Provider>;
}

// ── Google OAuth callback handler ─────────────────────────────────────────────
function OAuthCallback() {
  const { loginWithToken } = useAuth();
  const nav      = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params   = new URLSearchParams(location.search);
    const token    = params.get('token');
    const username = params.get('username');
    const id       = params.get('id');
    const error    = params.get('error');

    if (error || !token) {
      nav('/auth?error=google_failed');
      return;
    }

    loginWithToken(token, { _id: id, username, email: '' });
    nav('/');
  }, []);

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, background:'#080b12' }}>
      <div className="spin" style={{ width:44, height:44, border:'3px solid #252538', borderTopColor:'#f5c842', borderRadius:'50%' }} />
      <p style={{ color:'rgba(255,255,255,.5)', fontSize:14 }}>Signing you in with Google…</p>
    </div>
  );
}

function Guard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="spin" style={{ width:40, height:40, border:'3px solid #252538', borderTopColor:'#f5c842', borderRadius:'50%' }} />
    </div>
  );
  return user ? children : <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/auth"            element={<AuthPage />} />
          <Route path="/auth/callback"   element={<OAuthCallback />} />
          <Route path="/"                element={<Guard><LobbyPage /></Guard>} />
          <Route path="/room/:code"      element={<Guard><RoomPage /></Guard>} />
          <Route path="/auction/:code"   element={<Guard><AuctionPage /></Guard>} />
          <Route path="/stats"           element={<Guard><TeamStatsPage /></Guard>} />
          <Route path="/replay/:code"    element={<Guard><ReplayPage /></Guard>} />
          <Route path="*"                element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}