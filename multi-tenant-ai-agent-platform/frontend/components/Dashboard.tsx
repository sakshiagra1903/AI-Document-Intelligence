'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, formatRelative } from '../lib/api';
import {
  MessageSquare, TrendingUp, ThumbsUp, AlertTriangle,
  ArrowUpRight, Bot, FileText, CalendarDays, RefreshCw,
  Users, Zap, Globe
} from 'lucide-react';

function StatCard({ label, value, delta, icon: Icon, color = '#2563eb', bg = '#eaf1ff', href }: any) {
  const card = (
    <div className="card stat" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="stat-label">{label}</div>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'grid', placeItems: 'center', color, flexShrink: 0 }}>
          <Icon size={17} />
        </div>
      </div>
      <div className="stat-value">{value ?? <span className="skeleton" style={{ height: 30, width: 60, display: 'block' }} />}</div>
      {delta !== undefined && (
        <div className="stat-delta up">{delta}</div>
      )}
      {href && (
        <div style={{ marginTop: 12, fontSize: 12.5, color }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
            View all <ArrowUpRight size={12} />
          </span>
        </div>
      )}
      <div style={{ position: 'absolute', right: -10, bottom: -10, opacity: 0.06, color }}>
        <Icon size={70} />
      </div>
    </div>
  );

  if (href) return <Link href={href} style={{ textDecoration: 'none' }}>{card}</Link>;
  return card;
}

function HealthItem({ label, value, ok = true }: { label: string; value: string; ok?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid #f2f4f7', fontSize: 13 }}>
      <span>{label}</span>
      <span style={{ color: ok ? '#067647' : '#b42318', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
        {ok ? '✓' : '✗'} {value}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const [me, setMe] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [conv, setConv] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const [m, s, c, ag] = await Promise.all([
        api('/api/me'),
        api('/api/analytics?days=30'),
        api('/api/conversations'),
        api('/api/agents'),
      ]);
      setMe(m);
      setStats(s);
      setConv(c);
      setAgents(ag);
    } catch {
      location.href = '/login';
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  function refresh() {
    setRefreshing(true);
    load();
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const statCards = [
    {
      label: 'Conversations',
      value: stats?.total_conversations ?? '—',
      icon: MessageSquare,
      color: '#2563eb',
      bg: '#eaf1ff',
      href: '/conversations',
    },
    {
      label: 'Messages sent',
      value: stats?.events?.message ?? '—',
      icon: Zap,
      color: '#7c3aed',
      bg: '#f5f3ff',
    },
    {
      label: 'Positive feedback',
      value: stats?.events?.positive_feedback ?? '—',
      icon: ThumbsUp,
      color: '#067647',
      bg: '#ecfdf3',
      href: '/feedback',
    },
    {
      label: 'Open knowledge gaps',
      value: stats?.knowledge_gaps ?? '—',
      icon: AlertTriangle,
      color: '#b54708',
      bg: '#fff4e5',
      href: '/feedback',
    },
  ];

  return (
    <div className="content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 750, margin: '0 0 5px', color: 'var(--ink)' }}>
            {greeting}{me?.user?.name ? `, ${me.user.name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            Here's what's happening across your AI support operation today.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-light btn-sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          {agents[0] && (
            <Link href={`/chat/${agents[0].id}`} className="btn btn-primary btn-sm">
              <MessageSquare size={13} />
              Test chat widget
            </Link>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }} className="grid-cols-4">
        {statCards.map(card => <StatCard key={card.label} {...card} />)}
      </div>

      {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.85fr', gap: 18 }}>

        {/* Recent conversations */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)' }}>
            <div>
              <b style={{ fontSize: 14 }}>Recent conversations</b>
              <div className="muted" style={{ fontSize: 12 }}>Live tenant activity</div>
            </div>
            <Link href="/conversations" className="btn btn-ghost btn-sm">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Agent</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {conv.slice(0, 8).map(x => (
                  <tr key={x.id} style={{ cursor: 'pointer' }} onClick={() => location.href = `/conversations?id=${x.id}`}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{x.customer_id}</div>
                    </td>
                    <td>
                      <span className={`badge ${x.status === 'human' ? 'badge-orange' : x.status === 'escalated' ? 'badge-red' : x.status === 'ai' ? 'badge-blue' : 'badge-gray'}`}>
                        {x.status === 'ai' ? '🤖 AI' : x.status === 'human' ? '👤 Human' : x.status === 'escalated' ? '⚠ Escalated' : x.status}
                      </span>
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>Support Agent</td>
                    <td className="muted" style={{ fontSize: 12 }}>{formatRelative(x.updated_at || x.created_at)}</td>
                  </tr>
                ))}
                {!conv.length && !loading && (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty-state">
                        <div className="empty-state-icon"><MessageSquare size={24} /></div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>No conversations yet</div>
                        <p className="muted" style={{ fontSize: 12.5 }}>When customers start chatting, they'll appear here.</p>
                      </div>
                    </td>
                  </tr>
                )}
                {loading && [1, 2, 3, 4].map(i => (
                  <tr key={i}>
                    <td><div className="skeleton" style={{ height: 14, width: '70%' }} /></td>
                    <td><div className="skeleton" style={{ height: 20, width: 60, borderRadius: 999 }} /></td>
                    <td><div className="skeleton" style={{ height: 14, width: 80 }} /></td>
                    <td><div className="skeleton" style={{ height: 14, width: 60 }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Platform health */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <b style={{ fontSize: 14 }}>Platform health</b>
            <div style={{ marginTop: 12 }}>
              <HealthItem label="Database" value="Connected" />
              <HealthItem label="RAG retrieval" value="Ready" />
              <HealthItem label="Embeddings" value="Online" />
              <HealthItem label="LLM (Groq)" value={stats ? 'Active' : 'Checking…'} />
              <HealthItem label="Tenant isolation" value="Enforced" />
            </div>
          </div>

          {/* Quick actions */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <b style={{ fontSize: 14 }}>Quick actions</b>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href="/documents" className="btn btn-light" style={{ justifyContent: 'flex-start' }}>
                <FileText size={15} /> Upload documents
              </Link>
              <Link href="/agent" className="btn btn-light" style={{ justifyContent: 'flex-start' }}>
                <Bot size={15} /> Configure agent
              </Link>
              <Link href="/websites" className="btn btn-light" style={{ justifyContent: 'flex-start' }}>
                <Globe size={15} /> Crawl website
              </Link>
              <Link href="/bookings" className="btn btn-light" style={{ justifyContent: 'flex-start' }}>
                <CalendarDays size={15} /> Manage bookings
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics summary row */}
      {stats && (
        <div style={{ marginTop: 20 }}>
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <b style={{ fontSize: 14 }}>Activity overview — last {stats.period_days} days</b>
              <Link href="/analytics" className="btn btn-ghost btn-sm">Full analytics <ArrowUpRight size={12} /></Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              {[
                ['Conversations', stats.total_conversations],
                ['Messages', stats.events?.message || 0],
                ['👍 Positive', stats.events?.positive_feedback || 0],
                ['👎 Negative', stats.events?.negative_feedback || 0],
                ['Open gaps', stats.knowledge_gaps],
              ].map(([k, v]) => (
                <div key={k as string} style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 10, background: '#fafbfc', border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 22, fontWeight: 750, color: 'var(--ink)' }}>{v}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>{k}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
