// src/lib/api.ts
// VITE_API_URL should be set to the Render backend URL in Vercel env settings
// Falls back to Render URL in production, or uses Vite proxy (empty string) locally

const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE = import.meta.env.VITE_API_URL || 
  (isLocal ? '' : 'https://nova-yz5t.onrender.com');
