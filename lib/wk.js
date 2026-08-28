'use client';
import { useEffect, useRef, useState } from 'react';

export const api = {
  async get(path) {
    const headers = {};
    const t = typeof window !== 'undefined' ? localStorage.getItem('wk_admin_token') : null;
    if (t) headers['x-admin-token'] = t;
    const r = await fetch(`/api/${path}`, { cache: 'no-store', headers });
    return r.json();
  },
  async post(path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const t = typeof window !== 'undefined' ? localStorage.getItem('wk_admin_token') : null;
    if (t) headers['x-admin-token'] = t;
    const r = await fetch(`/api/${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body || {}),
    });
    return r.json();
  },
};

export function fmt(ms) {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function fmtTimeMs(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

export function useServerClock(serverTime) {
  const [now, setNow] = useState(Date.now());
  const offsetRef = useRef(0);
  useEffect(() => { if (serverTime) offsetRef.current = serverTime - Date.now(); }, [serverTime]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offsetRef.current), 100);
    return () => clearInterval(t);
  }, []);
  return now;
}
