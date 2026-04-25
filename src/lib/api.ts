// src/lib/api.ts
// If deployed to Vercel, VITE_API_URL should be set to the Render backend URL (e.g. https://nova-backend.onrender.com)
// If running locally, it defaults to empty string, which allows Vite's proxy to handle requests to '/api'
export const API_BASE = import.meta.env.VITE_API_URL || '';
