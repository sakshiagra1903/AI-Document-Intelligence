'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, clearAuth } from '../lib/api';
import {
  LayoutDashboard, Bot, BookOpen, FileText, ScanText,
  Globe, MessageSquare, Headphones, ThumbsUp, BarChart3,
  Users, Settings, CalendarDays, LogOut, Sparkles,
  Bell, ChevronDown, Menu, X, HelpCircle
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agent', label: 'AI Agent', icon: Bot },
  { href: '/knowledge', label: 'Knowledge', icon: BookOpen },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/document-intelligence', label: 'Document AI', icon: ScanText },
  { href: '/websites', label: 'Websites', icon: Globe },
  { href: '/conversations', label: 'Conversations', icon: MessageSquare },
  { href: '/support', label: 'Human Support', icon: Headphones },
  { href: '/feedback', label: 'Feedback', icon: ThumbsUp },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/bookings', label: 'Bookings', icon: CalendarDays },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface ShellProps { children: React.ReactNode; }

export default function Shell({ children }: ShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    api('/api/me').then(setMe).catch(() => {
      clearAuth();
      router.push('/login');
    });
  }, []);

  function signOut() {
    const rt = localStorage.getItem('refresh_token');
    if (rt) api('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token: rt }) }).catch(() => {});
    clearAuth();
    router.push('/login');
  }

  const initials = me?.user?.name
    ? me.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'A';

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--blue)', display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0 }}>
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>AgentOS</div>
              <div className="muted" style={{ fontSize: 11 }}>{me?.tenant?.name || 'Loading…'}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }} className="scrollable">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${pathname === href ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={16} strokeWidth={1.8} />
              <span className="nav-label">{label}</span>
            </Link>
          ))}
        </nav>

        {/* Bottom user section */}
        <div style={{ padding: '10px 10px 16px', borderTop: '1px solid var(--line)' }}>
          {me && (
            <div style={{ padding: '8px 10px', borderRadius: 10, background: '#f9fafb', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--blue)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.user?.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.role}</div>
                </div>
              </div>
            </div>
          )}
          <button className="nav-item" onClick={signOut} style={{ color: '#b42318' }}>
            <LogOut size={16} strokeWidth={1.8} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main">
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="btn btn-ghost btn-icon"
              style={{ display: 'none' }}
              id="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
                {NAV_ITEMS.find(i => i.href === pathname)?.label || 'Workspace'}
              </div>
              <div className="muted" style={{ fontSize: 11.5 }}>
                {me?.tenant?.name} · Enterprise AI Support
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge badge-green">● Online</span>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--blue)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="animate-fade-in">
          {children}
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          #sidebar-toggle { display: grid !important; }
        }
      `}</style>
    </>
  );
}
