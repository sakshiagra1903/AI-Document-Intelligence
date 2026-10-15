'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Shell from '../../components/Shell';
import { api, API } from '../../lib/api';
import {
  Bot,
  MessageSquare,
  Code2,
  Copy,
  Check,
  ExternalLink,
  Save,
  Loader2,
  Settings2,
  Brain,
  Layers,
  User,
  AlertCircle,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Agent {
  id: string;
  name: string;
  description?: string;
  personality?: string;
  tone?: string;
  language?: string;
  brand_color?: string;
  welcome_message?: string;
  fallback_message?: string;
  system_instructions?: string;
  escalation_rules?: string;
  support_hours?: string;
  human_handoff?: boolean;
  is_active?: boolean;
  temperature?: number;
  top_k?: number;
  similarity_threshold?: number;
  max_context_tokens?: number;
}

type Tab = 'identity' | 'behavior' | 'rag' | 'widget';

// ─── Toggle Switch ─────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
      onClick={() => onChange(!checked)}
    >
      {checked ? (
        <ToggleRight size={32} color="var(--blue)" />
      ) : (
        <ToggleLeft size={32} color="var(--muted)" />
      )}
      <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{label}</span>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function FieldSkeleton() {
  return (
    <div className="field">
      <div className="skeleton" style={{ height: 12, width: 100, borderRadius: 6, marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 38, width: '100%', borderRadius: 8 }} />
    </div>
  );
}

function PageSkeleton() {
  return (
    <div style={{ padding: '24px 28px', maxWidth: 840 }}>
      <div className="skeleton" style={{ height: 28, width: 220, borderRadius: 8, marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 14, width: 340, borderRadius: 6, marginBottom: 28 }} />
      <div className="skeleton" style={{ height: 40, width: '100%', borderRadius: 10, marginBottom: 24 }} />
      <div className="card" style={{ padding: 24 }}>
        {[1, 2, 3, 4].map((i) => (
          <FieldSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgentPage() {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [form, setForm] = useState<Agent>({} as Agent);
  const [activeTab, setActiveTab] = useState<Tab>('identity');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Load agent on mount
  useEffect(() => {
    api<any>('/api/agents')
      .then((data) => {
        const list: Agent[] = Array.isArray(data) ? data : data.agents ?? [];
        if (list.length === 0) throw new Error('No agents found');
        const a = list[0];
        setAgent(a);
        setForm({
          id: a.id,
          name: a.name ?? '',
          description: a.description ?? '',
          personality: a.personality ?? '',
          tone: a.tone ?? 'professional',
          language: a.language ?? 'en',
          brand_color: a.brand_color ?? '#2563eb',
          welcome_message: a.welcome_message ?? '',
          fallback_message: a.fallback_message ?? '',
          system_instructions: a.system_instructions ?? '',
          escalation_rules: a.escalation_rules ?? '',
          support_hours: a.support_hours ?? '',
          human_handoff: a.human_handoff ?? false,
          is_active: a.is_active ?? true,
          temperature: a.temperature ?? 0.3,
          top_k: a.top_k ?? 5,
          similarity_threshold: a.similarity_threshold ?? 0.75,
          max_context_tokens: a.max_context_tokens ?? 2048,
        });
      })
      .catch((err) => {
        if (err.message === 'Session expired') router.push('/login');
        setAlert({ type: 'error', msg: err.message || 'Failed to load agent' });
      })
      .finally(() => setLoading(false));
  }, []);

  // Auto-dismiss alert after 4 seconds
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(t);
  }, [alert]);

  const set = useCallback(
    <K extends keyof Agent>(key: K, val: Agent[K]) =>
      setForm((prev) => ({ ...prev, [key]: val })),
    []
  );

  async function handleSave() {
    if (!agent?.id) return;
    setSaving(true);
    try {
      const updated = await api<Agent>(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      setAgent(updated);
      setAlert({ type: 'success', msg: 'Agent configuration saved successfully!' });
    } catch (err: any) {
      setAlert({ type: 'error', msg: err.message || 'Failed to save agent' });
    } finally {
      setSaving(false);
    }
  }

  function copyEmbed() {
    const code = embedCode(agent?.id ?? '');
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) return <Shell><PageSkeleton /></Shell>;

  if (!agent) {
    return (
      <Shell>
        <div style={{ padding: '40px 28px' }}>
          <div className="empty-state">
            <div className="empty-state-icon"><Bot size={32} /></div>
            <p>No agent found. Please contact support to provision one.</p>
          </div>
        </div>
      </Shell>
    );
  }

  const publicChatUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/chat/${agent.id}`;

  return (
    <Shell>
      <div style={{ padding: '24px 28px', maxWidth: 900 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: 22, color: 'var(--ink)', margin: 0 }}>
              AI Agent Configuration
            </h1>
            <p className="muted" style={{ marginTop: 4, fontSize: 13.5 }}>
              Customize your agent's identity, behavior, RAG settings, and embedding.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href={`/chat/${agent.id}`} className="btn btn-light btn-sm" target="_blank">
              <MessageSquare size={14} />
              Test Chat
            </Link>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Alert */}
        {alert && (
          <div className={`alert ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            {alert.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {alert.msg}
          </div>
        )}

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 24 }}>
          {(
            [
              { key: 'identity', label: 'Identity', icon: User },
              { key: 'behavior', label: 'Behavior', icon: Settings2 },
              { key: 'rag', label: 'RAG Settings', icon: Brain },
              { key: 'widget', label: 'Widget', icon: Layers },
            ] as { key: Tab; label: string; icon: any }[]
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`tab ${activeTab === key ? 'active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* ── IDENTITY TAB ── */}
        {activeTab === 'identity' && (
          <div className="card animate-fade-in" style={{ padding: 28 }}>
            <h2 style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)', marginBottom: 20 }}>
              Agent Identity
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Agent Name */}
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Agent Name</label>
                <input
                  className="content"
                  style={inputStyle}
                  value={form.name ?? ''}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Aria"
                />
              </div>

              {/* Description */}
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Description</label>
                <textarea
                  style={{ ...inputStyle, height: 80, resize: 'vertical' }}
                  value={form.description ?? ''}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Short description of what this agent does"
                />
              </div>

              {/* Personality */}
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Personality</label>
                <textarea
                  style={{ ...inputStyle, height: 80, resize: 'vertical' }}
                  value={form.personality ?? ''}
                  onChange={(e) => set('personality', e.target.value)}
                  placeholder="Describe the agent's personality traits…"
                />
              </div>

              {/* Tone */}
              <div className="field">
                <label className="label">Tone</label>
                <select
                  style={inputStyle}
                  value={form.tone ?? 'professional'}
                  onChange={(e) => set('tone', e.target.value)}
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="casual">Casual</option>
                  <option value="formal">Formal</option>
                  <option value="empathetic">Empathetic</option>
                </select>
              </div>

              {/* Language */}
              <div className="field">
                <label className="label">Language</label>
                <select
                  style={inputStyle}
                  value={form.language ?? 'en'}
                  onChange={(e) => set('language', e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="ar">Arabic</option>
                  <option value="zh">Chinese</option>
                </select>
              </div>

              {/* Brand Color */}
              <div className="field">
                <label className="label">Brand Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="color"
                    value={form.brand_color ?? '#2563eb'}
                    onChange={(e) => set('brand_color', e.target.value)}
                    style={{
                      width: 48,
                      height: 40,
                      padding: 2,
                      border: '1px solid var(--line)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: 'white',
                    }}
                  />
                  <input
                    style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }}
                    value={form.brand_color ?? '#2563eb'}
                    onChange={(e) => set('brand_color', e.target.value)}
                    placeholder="#2563eb"
                    maxLength={7}
                  />
                </div>
              </div>

              {/* Welcome Message */}
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Welcome Message</label>
                <textarea
                  style={{ ...inputStyle, height: 72, resize: 'vertical' }}
                  value={form.welcome_message ?? ''}
                  onChange={(e) => set('welcome_message', e.target.value)}
                  placeholder="Hi! I'm your assistant. How can I help you today?"
                />
              </div>

              {/* Fallback Message */}
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Fallback Message</label>
                <textarea
                  style={{ ...inputStyle, height: 72, resize: 'vertical' }}
                  value={form.fallback_message ?? ''}
                  onChange={(e) => set('fallback_message', e.target.value)}
                  placeholder="I'm sorry, I couldn't understand that. Let me connect you with a human agent."
                />
              </div>
            </div>
          </div>
        )}

        {/* ── BEHAVIOR TAB ── */}
        {activeTab === 'behavior' && (
          <div className="card animate-fade-in" style={{ padding: 28 }}>
            <h2 style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)', marginBottom: 20 }}>
              Agent Behavior
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* System Instructions */}
              <div className="field">
                <label className="label">System Instructions</label>
                <p className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>
                  Core prompt that governs how the agent responds. Be specific about what it should and shouldn't do.
                </p>
                <textarea
                  style={{ ...inputStyle, height: 160, resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }}
                  value={form.system_instructions ?? ''}
                  onChange={(e) => set('system_instructions', e.target.value)}
                  placeholder="You are a helpful AI assistant for {company}. Always respond in a professional tone. Do not discuss competitors. If you don't know an answer, say so honestly..."
                />
              </div>

              {/* Escalation Rules */}
              <div className="field">
                <label className="label">Escalation Rules</label>
                <p className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>
                  Define when the agent should escalate to a human. Use one rule per line.
                </p>
                <textarea
                  style={{ ...inputStyle, height: 100, resize: 'vertical' }}
                  value={form.escalation_rules ?? ''}
                  onChange={(e) => set('escalation_rules', e.target.value)}
                  placeholder={"User asks for a refund\nUser expresses anger or frustration\nQuery repeats 3+ times unanswered"}
                />
              </div>

              {/* Support Hours */}
              <div className="field">
                <label className="label">Support Hours</label>
                <input
                  style={inputStyle}
                  value={form.support_hours ?? ''}
                  onChange={(e) => set('support_hours', e.target.value)}
                  placeholder="Mon–Fri, 9 AM – 6 PM IST"
                />
              </div>

              {/* Toggles */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  padding: '18px 20px',
                  background: 'var(--surface)',
                  borderRadius: 10,
                  border: '1px solid var(--line)',
                }}
              >
                <Toggle
                  checked={form.human_handoff ?? false}
                  onChange={(v) => set('human_handoff', v)}
                  label="Enable Human Handoff — Allow the agent to transfer conversations to a live agent"
                />
                <div style={{ borderTop: '1px solid var(--line)' }} />
                <Toggle
                  checked={form.is_active ?? true}
                  onChange={(v) => set('is_active', v)}
                  label="Agent Active — When disabled, the agent will stop responding to new conversations"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── RAG SETTINGS TAB ── */}
        {activeTab === 'rag' && (
          <div className="card animate-fade-in" style={{ padding: 28 }}>
            <h2 style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)', marginBottom: 4 }}>
              RAG &amp; Model Settings
            </h2>
            <p className="muted" style={{ fontSize: 13, marginBottom: 24 }}>
              Control how the agent retrieves context and generates responses.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Temperature */}
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Temperature</span>
                  <span
                    style={{
                      fontVariantNumeric: 'tabular-nums',
                      background: 'var(--blue)',
                      color: '#fff',
                      borderRadius: 20,
                      padding: '1px 8px',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {(form.temperature ?? 0.3).toFixed(2)}
                  </span>
                </label>
                <p className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
                  Lower = more deterministic (0.0); Higher = more creative (1.0).
                </p>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={form.temperature ?? 0.3}
                  onChange={(e) => set('temperature', parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--blue)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  <span>0 — Precise</span>
                  <span>1 — Creative</span>
                </div>
              </div>

              {/* Top-K */}
              <div className="field">
                <label className="label">Top-K Documents</label>
                <p className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
                  Number of relevant chunks to retrieve (1–20).
                </p>
                <input
                  type="number"
                  style={inputStyle}
                  min={1}
                  max={20}
                  value={form.top_k ?? 5}
                  onChange={(e) => set('top_k', parseInt(e.target.value))}
                />
              </div>

              {/* Max Context Tokens */}
              <div className="field">
                <label className="label">Max Context Tokens</label>
                <p className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
                  Maximum tokens to include in LLM context window.
                </p>
                <input
                  type="number"
                  style={inputStyle}
                  min={256}
                  max={16384}
                  step={256}
                  value={form.max_context_tokens ?? 2048}
                  onChange={(e) => set('max_context_tokens', parseInt(e.target.value))}
                />
              </div>

              {/* Similarity Threshold */}
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Similarity Threshold</span>
                  <span
                    style={{
                      fontVariantNumeric: 'tabular-nums',
                      background: 'var(--blue)',
                      color: '#fff',
                      borderRadius: 20,
                      padding: '1px 8px',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {(form.similarity_threshold ?? 0.75).toFixed(2)}
                  </span>
                </label>
                <p className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
                  Minimum cosine similarity score for a document chunk to be included as context.
                </p>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={form.similarity_threshold ?? 0.75}
                  onChange={(e) => set('similarity_threshold', parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--blue)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  <span>0 — Include all</span>
                  <span>1 — Exact only</span>
                </div>
              </div>
            </div>

            {/* Info panel */}
            <div
              className="alert alert-info"
              style={{ marginTop: 24, display: 'flex', gap: 10, alignItems: 'flex-start' }}
            >
              <Brain size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13 }}>
                Changes to RAG settings affect all future conversations. Lowering the similarity threshold
                may include less relevant context; raising it may cause the agent to rely less on your
                knowledge base.
              </span>
            </div>
          </div>
        )}

        {/* ── WIDGET TAB ── */}
        {activeTab === 'widget' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Agent ID */}
            <div className="card" style={{ padding: 24 }}>
              <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 16 }}>
                Agent Details
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <div className="label" style={{ marginBottom: 4 }}>Agent ID</div>
                  <code
                    style={{
                      display: 'block',
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: 12.5,
                      fontFamily: 'monospace',
                      color: 'var(--ink)',
                      wordBreak: 'break-all',
                    }}
                  >
                    {agent.id}
                  </code>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 4 }}>Status</div>
                  <div style={{ paddingTop: 8 }}>
                    {form.is_active ? (
                      <span className="badge badge-green">● Active</span>
                    ) : (
                      <span className="badge badge-gray">● Inactive</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Embed Code */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', margin: 0 }}>
                    Embed Code
                  </h2>
                  <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                    Paste this snippet into your website's <code>&lt;body&gt;</code> tag to embed the chat widget.
                  </p>
                </div>
                <button className="btn btn-light btn-sm" onClick={copyEmbed}>
                  {copied ? <Check size={14} color="var(--green)" /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <pre
                style={{
                  background: '#0f172a',
                  color: '#e2e8f0',
                  borderRadius: 10,
                  padding: '16px 18px',
                  fontSize: 12.5,
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  margin: 0,
                  lineHeight: 1.7,
                }}
              >
                {embedCode(agent.id)}
              </pre>
            </div>

            {/* Public Chat URL */}
            <div className="card" style={{ padding: 24 }}>
              <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 14 }}>
                Public Chat URL
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', fontSize: 13, color: 'var(--muted)' }}
                  readOnly
                  value={publicChatUrl}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  className="btn btn-light btn-sm"
                  onClick={() => navigator.clipboard.writeText(publicChatUrl)}
                >
                  <Copy size={14} />
                </button>
                <Link
                  href={`/chat/${agent.id}`}
                  className="btn btn-primary btn-sm"
                  target="_blank"
                >
                  <ExternalLink size={14} />
                  Preview
                </Link>
              </div>
              <p className="muted" style={{ marginTop: 10, fontSize: 12.5 }}>
                Share this link directly with users or use it to test the chat experience.
              </p>
            </div>

            {/* Quick test */}
            <div
              className="card"
              style={{
                padding: 24,
                background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
                border: '1px solid #bfdbfe',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'var(--blue)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  <MessageSquare size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ink)' }}>
                    Test Your Agent
                  </div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                    Open the chat interface to verify how your agent responds to real queries.
                  </div>
                </div>
                <Link href={`/chat/${agent.id}`} className="btn btn-primary btn-sm" target="_blank">
                  <ExternalLink size={14} />
                  Open Chat
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Save row at bottom */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid var(--line)',
          }}
        >
          <button
            className="btn btn-light"
            onClick={() => {
              if (!agent) return;
              setForm({
                id: agent.id,
                name: agent.name ?? '',
                description: agent.description ?? '',
                personality: agent.personality ?? '',
                tone: agent.tone ?? 'professional',
                language: agent.language ?? 'en',
                brand_color: agent.brand_color ?? '#2563eb',
                welcome_message: agent.welcome_message ?? '',
                fallback_message: agent.fallback_message ?? '',
                system_instructions: agent.system_instructions ?? '',
                escalation_rules: agent.escalation_rules ?? '',
                support_hours: agent.support_hours ?? '',
                human_handoff: agent.human_handoff ?? false,
                is_active: agent.is_active ?? true,
                temperature: agent.temperature ?? 0.3,
                top_k: agent.top_k ?? 5,
                similarity_threshold: agent.similarity_threshold ?? 0.75,
                max_context_tokens: agent.max_context_tokens ?? 2048,
              });
              setAlert({ type: 'success', msg: 'Form reset to last saved values.' });
            }}
          >
            Discard Changes
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Shell>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid var(--line)',
  borderRadius: 8,
  fontSize: 14,
  color: 'var(--ink)',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
};

function embedCode(agentId: string): string {
  return `<!-- AgentOS Chat Widget -->
<script>
  window.AgentOSConfig = {
    agentId: "${agentId}",
    position: "bottom-right",
    primaryColor: "#2563eb"
  };
</script>
<script
  src="${API}/static/widget.js"
  async
  defer
></script>`;
}
