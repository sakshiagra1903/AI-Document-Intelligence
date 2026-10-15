'use client';

import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api, formatDate } from '../../lib/api';
import {
  ThumbsUp, ThumbsDown, AlertTriangle, CheckCircle,
  HelpCircle, Sparkles, Send, RefreshCw, MessageSquare,
  ShieldCheck, Filter
} from 'lucide-react';

interface FeedbackItem {
  id: string;
  message_id: string;
  rating: number;
  text?: string;
  created_at: string;
}

interface KnowledgeGap {
  id: string;
  query: string;
  reason: string;
  status: string;
  correction?: string;
  created_at: string;
}

export default function FeedbackAndGapsPage() {
  const [tab, setTab] = useState<'gaps' | 'feedback'>('gaps');
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolving Gap State
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [correctionText, setCorrectionText] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [fbData, gapData] = await Promise.all([
        api<FeedbackItem[]>('/api/feedback').catch(() => []),
        api<KnowledgeGap[]>('/api/knowledge-gaps').catch(() => [])
      ]);
      setFeedbacks(fbData || []);
      setGaps(gapData || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleResolveGap(e: React.FormEvent, gapId: string) {
    e.preventDefault();
    if (!correctionText.trim()) return;
    setSubmittingCorrection(true);
    setAlertMsg(null);
    try {
      await api(`/api/knowledge-gaps/${gapId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ correction: correctionText.trim() })
      });

      setAlertMsg({
        type: 'success',
        text: 'Knowledge gap resolved! An authoritative FAQ was generated and embedded into the vector store.'
      });
      setCorrectionText('');
      setResolvingId(null);
      await loadData();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'Failed to resolve knowledge gap' });
    } finally {
      setSubmittingCorrection(false);
    }
  }

  const positiveFb = feedbacks.filter(f => f.rating > 0).length;
  const negativeFb = feedbacks.filter(f => f.rating < 0).length;
  const openGaps = gaps.filter(g => g.status === 'open');
  const resolvedGaps = gaps.filter(g => g.status === 'resolved');

  const csatScore = feedbacks.length > 0
    ? Math.round((positiveFb / feedbacks.length) * 100)
    : 100;

  return (
    <Shell>
      <div className="content">
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 750, margin: '0 0 5px' }}>Feedback & Knowledge Gaps</h1>
            <p className="muted">
              Turn customer feedback and unanswered questions into continuous AI training signals.
            </p>
          </div>
          <button className="btn btn-light" onClick={loadData}>
            <RefreshCw size={14} /> Refresh Signals
          </button>
        </div>

        {alertMsg && (
          <div className={`alert ${alertMsg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 18 }}>
            {alertMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            {alertMsg.text}
          </div>
        )}

        {/* CSAT and Gap Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }} className="grid-cols-4">
          <div className="card stat">
            <div className="stat-label">Customer CSAT</div>
            <div className="stat-value" style={{ color: csatScore >= 70 ? 'var(--success)' : 'var(--warning)' }}>
              {csatScore}%
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {positiveFb} positive / {negativeFb} negative
            </div>
          </div>
          <div className="card stat">
            <div className="stat-label">Open Knowledge Gaps</div>
            <div className="stat-value" style={{ color: openGaps.length > 0 ? 'var(--warning)' : 'var(--ink)' }}>
              {openGaps.length}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Unanswered customer queries</div>
          </div>
          <div className="card stat">
            <div className="stat-label">Resolved Gaps</div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>
              {resolvedGaps.length}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Retrained as vector FAQs</div>
          </div>
          <div className="card stat">
            <div className="stat-label">Total Feedback Events</div>
            <div className="stat-value">{feedbacks.length}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Customer rating submissions</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="tabs" style={{ marginBottom: 20 }}>
          <button
            className={`tab ${tab === 'gaps' ? 'active' : ''}`}
            onClick={() => setTab('gaps')}
          >
            <AlertTriangle size={14} style={{ display: 'inline', marginRight: 6 }} />
            Open Knowledge Gaps ({openGaps.length})
          </button>
          <button
            className={`tab ${tab === 'feedback' ? 'active' : ''}`}
            onClick={() => setTab('feedback')}
          >
            <ThumbsUp size={14} style={{ display: 'inline', marginRight: 6 }} />
            User Feedback Submissions ({feedbacks.length})
          </button>
        </div>

        {tab === 'gaps' ? (
          /* Knowledge Gaps View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {openGaps.map(gap => (
              <div key={gap.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-orange">
                      <AlertTriangle size={12} /> {gap.reason}
                    </span>
                    <span className="muted" style={{ fontSize: 12 }}>
                      Flagged {formatDate(gap.created_at)}
                    </span>
                  </div>
                  {resolvingId !== gap.id && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => { setResolvingId(gap.id); setCorrectionText(''); }}
                    >
                      <Sparkles size={13} /> Supply Authoritative Answer
                    </button>
                  )}
                </div>

                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
                  Query: "{gap.query}"
                </div>

                {resolvingId === gap.id ? (
                  <form onSubmit={e => handleResolveGap(e, gap.id)} style={{ marginTop: 14, background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid var(--line)' }}>
                    <label className="label">
                      Authoritative Correction (Will automatically be converted into a high-priority vector FAQ):
                    </label>
                    <textarea
                      className="field"
                      rows={3}
                      placeholder="Write the accurate factual answer the AI agent should supply for this query..."
                      value={correctionText}
                      onChange={e => setCorrectionText(e.target.value)}
                      required
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                      <button type="button" className="btn btn-light btn-sm" onClick={() => setResolvingId(null)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={submittingCorrection}>
                        {submittingCorrection ? 'Vectorizing...' : 'Resolve & Add to Knowledge Base'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                    The AI either had low retrieval confidence or the customer expressed negative feedback on this response.
                  </p>
                )}
              </div>
            ))}

            {openGaps.length === 0 && (
              <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                <div className="empty-state">
                  <div className="empty-state-icon" style={{ color: 'var(--success)', background: 'var(--success-bg)' }}>
                    <ShieldCheck size={28} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Zero Open Knowledge Gaps!</div>
                  <p className="muted" style={{ fontSize: 13 }}>
                    Your AI agent is answering customer queries with high confidence and verified citations.
                  </p>
                </div>
              </div>
            )}

            {/* Resolved History */}
            {resolvedGaps.length > 0 && (
              <div className="card" style={{ marginTop: 16, padding: 20 }}>
                <b style={{ fontSize: 14, marginBottom: 12, display: 'block' }}>
                  Recently Resolved Gaps ({resolvedGaps.length})
                </b>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {resolvedGaps.map(g => (
                    <div key={g.id} style={{ padding: '10px 14px', borderRadius: 10, background: '#fafbfc', border: '1px solid var(--line)', fontSize: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <b>"{g.query}"</b>
                        <span className="badge badge-green">✓ Resolved</span>
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        Correction: {g.correction}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* User Feedback Stream */
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Rating</th>
                  <th>Customer Commentary</th>
                  <th>Message ID</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.map(f => (
                  <tr key={f.id}>
                    <td>
                      {f.rating > 0 ? (
                        <span className="badge badge-green">
                          <ThumbsUp size={12} /> Positive
                        </span>
                      ) : (
                        <span className="badge badge-red">
                          <ThumbsDown size={12} /> Negative
                        </span>
                      )}
                    </td>
                    <td>
                      {f.text ? (
                        <span style={{ fontWeight: 500 }}>"{f.text}"</span>
                      ) : (
                        <span className="muted" style={{ fontStyle: 'italic' }}>No comment provided</span>
                      )}
                    </td>
                    <td className="muted" style={{ fontSize: 12, fontFamily: 'monospace' }}>
                      {f.message_id.slice(0, 16)}...
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {formatDate(f.created_at)}
                    </td>
                  </tr>
                ))}
                {!loading && feedbacks.length === 0 && (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty-state">
                        <div className="empty-state-icon"><ThumbsUp size={24} /></div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>No feedback recorded yet</div>
                        <p className="muted" style={{ fontSize: 12.5 }}>
                          Customer thumbs up/down ratings from chat sessions will appear here in real time.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
