import axios from 'axios';
import { io } from 'socket.io-client';

const BASE = process.env.REACT_APP_API_URL || '/api';
const SOCK = process.env.REACT_APP_SOCKET_URL || '';

// ── Axios ────────────────────────────────────────────────────────────────────
const api = axios.create({ baseURL: BASE });
api.interceptors.request.use(c => {
  const t = localStorage.getItem('token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
api.interceptors.response.use(r => r.data, e => Promise.reject(e.response?.data || e));

export const authRegister = b => api.post('/auth/register', b);
export const authLogin    = b => api.post('/auth/login', b);
export const authMe       = () => api.get('/auth/me');
export const getRooms     = () => api.get('/rooms');
export const createRoom   = b => api.post('/rooms', b);
export const getRoom      = c => api.get(`/rooms/${c}`);
export const getPlayers   = () => api.get('/players');

// ── Socket singleton ─────────────────────────────────────────────────────────
let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCK, {
      autoConnect:  false,
      reconnection: true,
      transports:   ['websocket','polling'],
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  socket?.disconnect();
}
