'use client';

import { useEffect, useState, useCallback } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import {
  BarChart2,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  CalendarCheck,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnalyticsEvent {
  event_type: string;
  count: number;
  last_seen?: string;
}

interface AnalyticsSummary {
  conversations?: number;
  messages?: number;
  positive_feedback?: number;
  negative_feedback?: number;
  knowledge_gaps?: number;
  bookings_created?: number;
  events?: AnalyticsEvent[];
  [key: string]: unknown;
}

interface BookingMonthly {
  month: string;   // e.g. "2024-01" or "Jan"
  count: number;
}

interface BookingTimeWise {
  hour?: number;
  slot?: string;
  label?: string;
  count: number;
}

interface BookingCategory {
  category: string;
  count: number;
}

type DayFilter = 7 | 30 | 90 | 365;

// ─── Bar Chart Component ──────────────────────────────────────────────────────

interface BarItem {
  label: string;
  value: number;
}

function BarChart({
  data,
  color = 'var(--blue)',
  height = 140,
  emptyMessage = 'No data available',
}: {
  data: BarItem[];
  color?: string;
  height?: number;
  emptyMessage?: string;
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  if (!data.length) {
    return (
      <div
        style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        className="muted"
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 6,
        height,
        padding: '8px 0 0 0',
        overflowX: 'auto',
      }}
    >
      {data.map((item) => (
        <div
          key={item.label}
          style={{
            flex: 1,
            minWidth: 32,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            height: '100%',
            justifyContent: 'flex-end',
          }}
        >
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>
            {item.value > 0 ? item.value : ''}
          </div>
          <div
            style={{
              width: '100%',
              borderRadius: '4px 4px 0 0',
              background: color,
              height: `${(item.value / maxValue) * 100}%`,
              minHeight: item.value > 0 ? 4 : 0,
              transition: 'height 0.5s ease',
              opacity: 0.85,
            }}
          />
          <div
            style={{
              fontSize: 10,
              color: 'var(--muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 56,
              textAlign: 'center',
            }}
          >
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  loading: boolean;
}) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: '#fff',
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
          {label}
        </div>
        {loading ? (
          <div className="skeleton" style={{ height: 24, width: 60 }} />
        ) : (
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{value}</div>
        )}
      </div>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
  loading,
}: {
  title: string;
  children: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>{title}</div>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ flex: 1, height: `${30 + Math.random() * 70}%`, borderRadius: 4 }}
            />
          ))}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [days, setDays] = useState<DayFilter>(30);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [monthly, setMonthly] = useState<BookingMonthly[]>([]);
  const [timeWise, setTimeWise] = useState<BookingTimeWise[]>([]);
  const [category, setCategory] = useState<BookingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const DAY_OPTIONS: DayFilter[] = [7, 30, 90, 365];

  // ── Fetch summary (depends on days filter) ─────────────────────────────────
  const fetchSummary = useCallback(async (d: DayFilter) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<AnalyticsSummary>(`/api/analytics?days=${d}`);
      setSummary(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch charts (static — not affected by days filter) ───────────────────
  const fetchCharts = useCallback(async () => {
    setChartsLoading(true);
    try {
      const [m, t, c] = await Promise.allSettled([
        api<BookingMonthly[] | { data: BookingMonthly[] }>('/api/analytics/bookings/monthly'),
        api<BookingTimeWise[] | { data: BookingTimeWise[] }>('/api/analytics/bookings/time-wise'),
        api<BookingCategory[] | { data: BookingCategory[] }>('/api/analytics/bookings/category'),
      ]);

      const unwrap = <T,>(result: PromiseSettledResult<T[] | { data: T[] }>): T[] => {
        if (result.status === 'rejected') return [];
        const val = result.value;
        if (Array.isArray(val)) return val;
        if (val && 'data' in val && Array.isArray((val as { data: T[] }).data))
          return (val as { data: T[] }).data;
        return [];
      };

      setMonthly(unwrap<BookingMonthly>(m));
      setTimeWise(unwrap<BookingTimeWise>(t));
      setCategory(unwrap<BookingCategory>(c));
    } catch {
      // silently fail charts — summary error is more important
    } finally {
      setChartsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary(days);
  }, [days, fetchSummary]);

  useEffect(() => {
    fetchCharts();
  }, [fetchCharts]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const pos = summary?.positive_feedback ?? 0;
  const neg = summary?.negative_feedback ?? 0;
  const satisfactionScore =
    pos + neg > 0 ? Math.round((pos / (pos + neg)) * 100) : null;

  const monthlyBars: BarItem[] = monthly.map((m) => ({
    label: m.month,
    value: m.count,
  }));

  const timeWiseBars: BarItem[] = timeWise.map((t) => ({
    label: t.label ?? t.slot ?? (t.hour != null ? `${t.hour}:00` : '?'),
    value: t.count,
  }));

  const categoryBars: BarItem[] = category.map((c) => ({
    label: c.category,
    value: c.count,
  }));

  // ── Event table rows ───────────────────────────────────────────────────────
  const events: AnalyticsEvent[] = Array.isArray(summary?.events) ? summary!.events! : [];

  // Build event rows from all summary top-level numeric fields + events array
  const builtInKeys = [
    'conversations',
    'messages',
    'positive_feedback',
    'negative_feedback',
    'knowledge_gaps',
    'bookings_created',
    'events',
  ];

  const extraEvents: AnalyticsEvent[] = summary
    ? Object.entries(summary)
        .filter(([k, v]) => !builtInKeys.includes(k) && typeof v === 'number')
        .map(([k, v]) => ({ event_type: k, count: v as number }))
    : [];

  const allEvents: AnalyticsEvent[] = [...events, ...extraEvents];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Shell>
      <div className="content" style={{ maxWidth: 1200 }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Analytics</h1>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              Platform usage metrics and booking insights
            </p>
          </div>

          {/* Days filter */}
          <div style={{ display: 'flex', gap: 6 }}>
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={days === d ? 'btn btn-primary btn-sm' : 'btn btn-light btn-sm'}
              >
                {d === 365 ? '1y' : `${d}d`}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* ── Stat Cards ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <StatCard
            icon={<MessageSquare size={22} />}
            label="Conversations"
            value={summary?.conversations ?? 0}
            color="var(--blue)"
            loading={loading}
          />
          <StatCard
            icon={<BarChart2 size={22} />}
            label="Messages"
            value={summary?.messages ?? 0}
            color="#6366f1"
            loading={loading}
          />
          <StatCard
            icon={<ThumbsUp size={22} />}
            label="Positive Feedback"
            value={summary?.positive_feedback ?? 0}
            color="#22c55e"
            loading={loading}
          />
          <StatCard
            icon={<ThumbsDown size={22} />}
            label="Negative Feedback"
            value={summary?.negative_feedback ?? 0}
            color="#ef4444"
            loading={loading}
          />
          <StatCard
            icon={<Lightbulb size={22} />}
            label="Knowledge Gaps"
            value={summary?.knowledge_gaps ?? 0}
            color="#f59e0b"
            loading={loading}
          />
          <StatCard
            icon={<CalendarCheck size={22} />}
            label="Bookings Created"
            value={summary?.bookings_created ?? 0}
            color="#0ea5e9"
            loading={loading}
          />
        </div>

        {/* ── Satisfaction Score ── */}
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <TrendingUp size={20} style={{ color: 'var(--blue)' }} />
            <span style={{ fontWeight: 600 }}>Satisfaction Score</span>
            {loading ? (
              <div className="skeleton" style={{ height: 20, width: 80 }} />
            ) : satisfactionScore !== null ? (
              <>
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: satisfactionScore >= 70 ? '#22c55e' : satisfactionScore >= 40 ? '#f59e0b' : '#ef4444',
                  }}
                >
                  {satisfactionScore}%
                </span>
                <span className="muted" style={{ fontSize: 13 }}>
                  based on {pos + neg} feedback responses ({pos} positive, {neg} negative)
                </span>
                {/* Progress bar */}
                <div style={{ flex: 1, minWidth: 160, background: 'var(--border)', borderRadius: 9999, height: 8 }}>
                  <div
                    style={{
                      width: `${satisfactionScore}%`,
                      height: '100%',
                      borderRadius: 9999,
                      background:
                        satisfactionScore >= 70
                          ? '#22c55e'
                          : satisfactionScore >= 40
                          ? '#f59e0b'
                          : '#ef4444',
                      transition: 'width 0.6s ease',
                    }}
                  />
                </div>
              </>
            ) : (
              <span className="muted" style={{ fontSize: 14 }}>
                No feedback data available for this period
              </span>
            )}
          </div>
        </div>

        {/* ── Bar Charts Row ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 20,
            marginBottom: 24,
          }}
        >
          {/* Monthly Bookings */}
          <SectionCard title="Monthly Bookings" loading={chartsLoading}>
            <BarChart
              data={monthlyBars}
              color="var(--blue)"
              height={140}
              emptyMessage="No monthly booking data"
            />
          </SectionCard>

          {/* Time-wise Bookings */}
          <SectionCard title="Bookings by Time of Day" loading={chartsLoading}>
            <BarChart
              data={timeWiseBars}
              color="#6366f1"
              height={140}
              emptyMessage="No time-wise booking data"
            />
          </SectionCard>

          {/* Category Bookings */}
          <SectionCard title="Bookings by Category" loading={chartsLoading}>
            <BarChart
              data={categoryBars}
              color="#0ea5e9"
              height={140}
              emptyMessage="No category booking data"
            />
          </SectionCard>
        </div>

        {/* ── Event Breakdown Table ── */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>
            Event Breakdown
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 36, borderRadius: 8 }} />
              ))}
            </div>
          ) : allEvents.length === 0 && !summary ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <BarChart2 size={32} />
              </div>
              <p>No events recorded in this period.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Event Type</th>
                    <th style={{ textAlign: 'right' }}>Count</th>
                    <th style={{ textAlign: 'right' }}>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Built-in summary rows */}
                  {[
                    {
                      label: 'Conversations',
                      value: summary?.conversations ?? 0,
                      badge: 'badge-blue',
                    },
                    {
                      label: 'Messages',
                      value: summary?.messages ?? 0,
                      badge: 'badge-purple',
                    },
                    {
                      label: 'Positive Feedback',
                      value: summary?.positive_feedback ?? 0,
                      badge: 'badge-green',
                    },
                    {
                      label: 'Negative Feedback',
                      value: summary?.negative_feedback ?? 0,
                      badge: 'badge-red',
                    },
                    {
                      label: 'Knowledge Gaps',
                      value: summary?.knowledge_gaps ?? 0,
                      badge: 'badge-orange',
                    },
                    {
                      label: 'Bookings Created',
                      value: summary?.bookings_created ?? 0,
                      badge: 'badge-blue',
                    },
                  ].map((row) => {
                    const total =
                      (summary?.conversations ?? 0) +
                      (summary?.messages ?? 0) +
                      (summary?.positive_feedback ?? 0) +
                      (summary?.negative_feedback ?? 0) +
                      (summary?.knowledge_gaps ?? 0) +
                      (summary?.bookings_created ?? 0);
                    const share = total > 0 ? ((row.value / total) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={row.label}>
                        <td>
                          <span className={`badge ${row.badge}`}>{row.label}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {row.value.toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                            <div
                              style={{
                                width: 60,
                                background: 'var(--border)',
                                borderRadius: 9999,
                                height: 6,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${share}%`,
                                  height: '100%',
                                  background: 'var(--blue)',
                                  borderRadius: 9999,
                                }}
                              />
                            </div>
                            <span className="muted" style={{ fontSize: 12, minWidth: 36 }}>
                              {share}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Extra dynamic events from events array / other keys */}
                  {allEvents.map((ev, idx) => {
                    const total = allEvents.reduce((s, e) => s + e.count, 0);
                    const share = total > 0 ? ((ev.count / total) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={`${ev.event_type}-${idx}`}>
                        <td>
                          <span className="badge badge-gray">
                            {ev.event_type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {ev.count.toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                            <div
                              style={{
                                width: 60,
                                background: 'var(--border)',
                                borderRadius: 9999,
                                height: 6,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${share}%`,
                                  height: '100%',
                                  background: 'var(--blue)',
                                  borderRadius: 9999,
                                }}
                              />
                            </div>
                            <span className="muted" style={{ fontSize: 12, minWidth: 36 }}>
                              {share}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* If no events and summary exists */}
                  {allEvents.length === 0 && summary && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: 24 }}>
                        <span className="muted">No additional event data recorded.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
