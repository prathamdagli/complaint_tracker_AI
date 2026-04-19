import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      // Only hard-logout on explicit "Token required"/"Invalid or expired token"
      const msg = err.response?.data?.error || '';
      if (msg.toLowerCase().includes('token')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.endsWith('/login')) window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
