'use client';

export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
}

export function getRefreshToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
}

export function clearAuth() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
}

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

async function doRefresh(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    const r = await fetch(`${API}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!r.ok) { clearAuth(); return null; }
    const data = await r.json();
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    return data.access_token;
  } catch {
    clearAuth();
    return null;
  }
}

export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers = new Headers(opts.headers as HeadersInit);
  if (!(opts.body instanceof FormData)) headers.set('Content-Type', 'application/json');

  const t = getToken();
  if (t) headers.set('Authorization', `Bearer ${t}`);

  const r = await fetch(`${API}${path}`, { ...opts, headers });

  if (r.status === 401 && t) {
    // Try refresh
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await doRefresh();
      isRefreshing = false;
      refreshQueue.forEach(fn => fn(newToken || ''));
      refreshQueue = [];

      if (!newToken) {
        if (typeof window !== 'undefined') window.location.href = '/login';
        throw new Error('Session expired');
      }

      // Retry with new token
      const headers2 = new Headers(opts.headers as HeadersInit);
      if (!(opts.body instanceof FormData)) headers2.set('Content-Type', 'application/json');
      headers2.set('Authorization', `Bearer ${newToken}`);
      const r2 = await fetch(`${API}${path}`, { ...opts, headers: headers2 });
      if (!r2.ok) {
        const data2 = await r2.json().catch(() => ({ detail: r2.statusText }));
        throw new Error(data2.detail || 'Request failed');
      }
      return r2.json();
    } else {
      // Wait in queue
      return new Promise((resolve, reject) => {
        refreshQueue.push((newToken: string) => {
          if (!newToken) { reject(new Error('Session expired')); return; }
          const headers2 = new Headers(opts.headers as HeadersInit);
          if (!(opts.body instanceof FormData)) headers2.set('Content-Type', 'application/json');
          headers2.set('Authorization', `Bearer ${newToken}`);
          fetch(`${API}${path}`, { ...opts, headers: headers2 })
            .then(async r2 => {
              if (!r2.ok) {
                const d = await r2.json().catch(() => ({ detail: r2.statusText }));
                reject(new Error(d.detail || 'Request failed'));
              } else {
                resolve(r2.json());
              }
            })
            .catch(reject);
        });
      });
    }
  }

  if (!r.ok) {
    const data = await r.json().catch(() => ({ detail: r.statusText }));
    throw new Error(data.detail || 'Request failed');
  }

  return r.json();
}

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(new Date(d));
}

export function formatRelative(d: string | Date | null | undefined) {
  if (!d) return '—';
  const now = Date.now();
  const then = new Date(d).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

export function formatCurrency(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}
