'use client';

import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api, formatDate } from '../../lib/api';
import {
  Settings, CreditCard, Clock, Globe, Shield,
  Cpu, CheckCircle2, AlertCircle, Copy, Check,
  Save, RefreshCw
} from 'lucide-react';

interface BookingSettings {
  booking_mode: string;
  payment_provider: string;
  currency: string;
  slot_duration_minutes: number;
  business_timezone: string;
  opening_hour: number;
  closing_hour: number;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'booking' | 'workspace' | 'integrations' | 'ai'>('booking');
  const [me, setMe] = useState<any>(null);
  const [booking, setBooking] = useState<BookingSettings>({
    booking_mode: 'free',
    payment_provider: 'demo',
    currency: 'INR',
    slot_duration_minutes: 30,
    business_timezone: 'Asia/Kolkata',
    opening_hour: 9,
    closing_hour: 18
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const [meData, bData] = await Promise.all([
        api('/api/me').catch(() => null),
        api<BookingSettings>('/api/tenant/settings/booking').catch(() => null)
      ]);
      if (meData) setMe(meData);
      if (bData) setBooking(bData);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveBooking(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAlertMsg(null);
    try {
      const updated = await api<BookingSettings>('/api/tenant/settings/booking', {
        method: 'PUT',
        body: JSON.stringify(booking)
      });
      setBooking(updated);
      setAlertMsg({ type: 'success', text: 'Scheduling and payment settings saved successfully!' });
      setTimeout(() => setAlertMsg(null), 4000);
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  }

  const widgetSnippet = `<script
  src="https://cdn.agentos.ai/widget.js"
  data-tenant-id="${me?.tenant?.id || 'your-tenant-id'}"
  data-theme="light"
  async>
</script>`;

  function copyCode() {
    navigator.clipboard.writeText(widgetSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2500);
  }

  return (
    <Shell>
      <div className="content">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 750, margin: '0 0 5px' }}>Platform & Workspace Settings</h1>
          <p className="muted">
            Configure conversational scheduling policies, payment gateways, embed snippets, and AI parameters.
          </p>
        </div>

        {alertMsg && (
          <div className={`alert ${alertMsg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 18 }}>
            {alertMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {alertMsg.text}
          </div>
        )}

        {/* Tab navigation */}
        <div className="tabs" style={{ marginBottom: 20 }}>
          <button className={`tab ${activeTab === 'booking' ? 'active' : ''}`} onClick={() => setActiveTab('booking')}>
            <CreditCard size={14} style={{ display: 'inline', marginRight: 6 }} />
            Scheduling & Payments
          </button>
          <button className={`tab ${activeTab === 'workspace' ? 'active' : ''}`} onClick={() => setActiveTab('workspace')}>
            <Globe size={14} style={{ display: 'inline', marginRight: 6 }} />
            Workspace Profile
          </button>
          <button className={`tab ${activeTab === 'integrations' ? 'active' : ''}`} onClick={() => setActiveTab('integrations')}>
            <Shield size={14} style={{ display: 'inline', marginRight: 6 }} />
            Web Widget Embed
          </button>
          <button className={`tab ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>
            <Cpu size={14} style={{ display: 'inline', marginRight: 6 }} />
            AI & Vector Infrastructure
          </button>
        </div>

        {/* Tab: Booking & Payments */}
        {activeTab === 'booking' && (
          <form onSubmit={handleSaveBooking} className="card" style={{ padding: 24, maxWidth: 840 }}>
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>Appointment Scheduling & Payment Gateway</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
              Control whether appointments require up-front payment confirmation or remain open.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="label">Booking Policy Mode</label>
                <select
                  className="field"
                  value={booking.booking_mode}
                  onChange={e => setBooking({ ...booking, booking_mode: e.target.value })}
                >
                  <option value="free">Free Booking (Instant Confirmation)</option>
                  <option value="paid">Paid Booking (Requires Checkout)</option>
                </select>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                  In paid mode, an interactive checkout link is automatically rendered in chat.
                </div>
              </div>

              <div>
                <label className="label">Payment Provider</label>
                <select
                  className="field"
                  value={booking.payment_provider}
                  onChange={e => setBooking({ ...booking, payment_provider: e.target.value })}
                >
                  <option value="demo">Demo Checkout (Simulated Instant Sandbox)</option>
                  <option value="stripe">Stripe Checkout (Production Webhook)</option>
                </select>
              </div>

              <div>
                <label className="label">Default Currency</label>
                <select
                  className="field"
                  value={booking.currency}
                  onChange={e => setBooking({ ...booking, currency: e.target.value })}
                >
                  <option value="INR">INR (₹ - Indian Rupee)</option>
                  <option value="USD">USD ($ - US Dollar)</option>
                  <option value="EUR">EUR (€ - Euro)</option>
                  <option value="GBP">GBP (£ - British Pound)</option>
                </select>
              </div>

              <div>
                <label className="label">Standard Slot Duration</label>
                <select
                  className="field"
                  value={booking.slot_duration_minutes}
                  onChange={e => setBooking({ ...booking, slot_duration_minutes: Number(e.target.value) })}
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes (1 Hour)</option>
                </select>
              </div>

              <div>
                <label className="label">Business Timezone</label>
                <input
                  className="field"
                  value={booking.business_timezone}
                  onChange={e => setBooking({ ...booking, business_timezone: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="label">Opening Hour</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    className="field"
                    value={booking.opening_hour}
                    onChange={e => setBooking({ ...booking, opening_hour: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">Closing Hour</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    className="field"
                    value={booking.closing_hour}
                    onChange={e => setBooking({ ...booking, closing_hour: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={15} />
                {saving ? 'Saving...' : 'Save Scheduling Policy'}
              </button>
            </div>
          </form>
        )}

        {/* Tab: Workspace Profile */}
        {activeTab === 'workspace' && (
          <div className="card" style={{ padding: 24, maxWidth: 840 }}>
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>Tenant Organization Identity</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
              Identifiers and domain records for multi-tenant isolation.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="label">Business / Tenant Name</label>
                <input className="field" value={me?.tenant?.name || ''} disabled />
              </div>
              <div>
                <label className="label">Tenant ID (UUID)</label>
                <input className="field" value={me?.tenant?.id || ''} disabled style={{ fontFamily: 'monospace' }} />
              </div>
              <div>
                <label className="label">Official Website</label>
                <input className="field" value={me?.tenant?.website || 'https://yourcompany.com'} disabled />
              </div>
              <div>
                <label className="label">Industry Vertical</label>
                <input className="field" value={me?.tenant?.industry || 'Technology'} disabled />
              </div>
            </div>

            <div style={{ marginTop: 20, padding: 14, background: '#f8fafc', borderRadius: 10, border: '1px solid var(--line)', fontSize: 12.5 }}>
              🛡️ <b>Multi-Tenant Isolation Notice:</b> All stored document embeddings, conversational transcripts, and customer appointments are bound strictly to this tenant UUID.
            </div>
          </div>
        )}

        {/* Tab: Widget Embed */}
        {activeTab === 'integrations' && (
          <div className="card" style={{ padding: 24, maxWidth: 840 }}>
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>Embeddable Website Chatbot Widget</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 18 }}>
              Copy and paste this script tag right before the closing <code>&lt;/body&gt;</code> tag on your website to mount the conversational support drawer.
            </p>

            <div style={{ position: 'relative' }}>
              <pre style={{ background: '#1e293b', color: '#f8fafc', padding: '16px 20px', borderRadius: 12, fontSize: 13, overflowX: 'auto', fontFamily: 'monospace' }}>
                {widgetSnippet}
              </pre>
              <button
                className="btn btn-sm btn-light"
                onClick={copyCode}
                style={{ position: 'absolute', right: 12, top: 12 }}
              >
                {copiedSnippet ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
                {copiedSnippet ? 'Copied!' : 'Copy Snippet'}
              </button>
            </div>

            <div style={{ marginTop: 20 }}>
              <b style={{ fontSize: 14 }}>Direct Chat Link for Customer Sharing:</b>
              <div style={{ marginTop: 8, display: 'flex', gap: 10 }}>
                <input
                  className="field"
                  value={typeof window !== 'undefined' ? `${window.location.origin}/chat/demo` : '/chat/demo'}
                  readOnly
                  style={{ fontFamily: 'monospace', fontSize: 13 }}
                />
                <a href="/chat/demo" target="_blank" className="btn btn-primary" style={{ flexShrink: 0 }}>
                  Open Chat
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Tab: AI Infrastructure */}
        {activeTab === 'ai' && (
          <div className="card" style={{ padding: 24, maxWidth: 840 }}>
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>AI Engine & Vector Configuration</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
              Verified architectural components powering your retrieval-augmented generation.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Language Model (LLM)', 'Groq (Llama-3.3-70b-versatile) with fallback resilience', 'Ultra low latency 300+ tok/sec'],
                ['Embedding Architecture', 'sentence-transformers (all-MiniLM-L6-v2)', '384-dimensional dense semantic vectors'],
                ['Vector Database', 'PostgreSQL 16 + pgvector extension', 'Cosine distance vector indexing (<=>)'],
                ['Context Assembly Budget', '3,500 maximum tokens context window', 'Multi-turn conversation history included'],
                ['Document Classifier', 'TF-IDF + Multinomial Logistic Regression', 'Automatic invoice/contract/statement tagging'],
                ['OCR Engine', 'PyMuPDF + Tesseract OCR Fallback', 'High precision image and scanned PDF text extraction']
              ].map(([title, val, sub]) => (
                <div key={title} style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid var(--line)', background: '#fafbfc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{title}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{val}</div>
                  </div>
                  <span className="badge badge-green" style={{ fontSize: 11 }}>{sub}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}