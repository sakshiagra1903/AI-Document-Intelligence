'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { api, API } from '../../../lib/api';
import { Send, Bot, User, ArrowLeft, Paperclip, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: { document: string; page?: number; similarity: number }[];
  booking?: {
    appointment_id: string;
    status: string;
    requires_payment: boolean;
    payment_url?: string;
    amount?: number;
    currency?: string;
  };
}

export default function ChatPage() {
  const params = useParams();
  const agentId = params.agentId as string;
  const [agent, setAgent] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [customerId] = useState(`customer-${Math.random().toString(36).slice(2, 8)}`);
  const [agentLoading, setAgentLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadAgent() {
      try {
        const agents = await api('/api/agents');
        const found = agents.find((a: any) => a.id === agentId) || agents[0];
        setAgent(found);
      } catch {
        // Try without auth
        setAgent({ name: 'AI Support Agent', welcome_message: 'Hi! How can I help you today?' });
      } finally {
        setAgentLoading(false);
      }
    }
    loadAgent();
  }, [agentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !agent || loading) return;

    setInput('');
    setMessages(m => [...m, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const body: any = {
        agent_id: agent.id,
        message: text,
        customer_id: customerId,
      };
      if (convId) body.conversation_id = convId;

      const res = await fetch(`${API}/api/public/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error');

      if (data.conversation_id) setConvId(data.conversation_id);

      setMessages(m => [...m, {
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        booking: data.booking,
      }]);
    } catch (e: any) {
      setMessages(m => [...m, { role: 'assistant', content: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function reset() {
    setMessages([]);
    setConvId(null);
  }

  const SUGGESTIONS = [
    'What services do you offer?',
    'I\'d like to book an appointment',
    'What are your business hours?',
    'How can I contact support?',
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4ff 0%, #f6f8fb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 700, display: 'flex', flexDirection: 'column', height: 'min(88vh, 720px)' }}>

        {/* Header */}
        <div style={{ background: agent?.brand_color || 'var(--blue)', borderRadius: '18px 18px 0 0', padding: '16px 20px', color: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <Bot size={20} />
          </div>
          <div style={{ flex: 1 }}>
            {agentLoading ? (
              <div className="skeleton" style={{ height: 16, width: 120, background: 'rgba(255,255,255,0.3)' }} />
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{agent?.name || 'AI Support'}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>Powered by AgentOS</div>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={reset} className="btn btn-icon" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8 }} title="New conversation">
              <RefreshCw size={14} />
            </button>
            <Link href="/dashboard" className="btn btn-icon" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, textDecoration: 'none' }} title="Back to dashboard">
              <ArrowLeft size={14} />
            </Link>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px', background: '#fff', borderLeft: '1px solid var(--line)', borderRight: '1px solid var(--line)' }} className="scrollable">

          {/* Welcome state */}
          {messages.length === 0 && !agentLoading && (
            <div style={{ textAlign: 'center', padding: '30px 20px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--blue-light)', display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: 'var(--blue)' }}>
                <Bot size={26} />
              </div>
              <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{agent?.welcome_message || 'Hi! How can I help you today?'}</p>
              <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>Ask me anything about our products, services, or book an appointment.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="btn btn-light btn-sm"
                    style={{ fontSize: 12.5 }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, maxWidth: '80%' }}>
                {msg.role !== 'user' && (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--blue-light)', display: 'grid', placeItems: 'center', flexShrink: 0, color: 'var(--blue)' }}>
                    <Bot size={14} />
                  </div>
                )}
                <div>
                  <div className={`chat-bubble ${msg.role}`}>{msg.content}</div>
                  {msg.booking && (
                    <div style={{ marginTop: 8, padding: '10px 14px', background: '#f9fafb', borderRadius: 10, border: '1px solid var(--line)', fontSize: 13 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>📅 Appointment {msg.booking.status === 'confirmed' ? 'Confirmed' : 'Reserved'}</div>
                      {msg.booking.requires_payment && msg.booking.payment_url && (
                        <a href={msg.booking.payment_url} className="btn btn-primary btn-sm" style={{ textDecoration: 'none', marginTop: 6, display: 'inline-flex' }}>
                          💳 Pay {msg.booking.currency} {msg.booking.amount} to confirm
                        </a>
                      )}
                    </div>
                  )}
                  {msg.sources && msg.sources.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, paddingLeft: 2 }}>
                      📎 {msg.sources.map(s => `${s.document}${s.page ? ` p.${s.page}` : ''}`).join(' · ')}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--blue)', display: 'grid', placeItems: 'center', flexShrink: 0, color: '#fff' }}>
                    <User size={14} />
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--blue-light)', display: 'grid', placeItems: 'center', color: 'var(--blue)' }}>
                <Bot size={14} />
              </div>
              <div className="chat-bubble assistant" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--muted)', animation: `pulse 1.4s ease ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={send} style={{ background: '#fff', borderRadius: '0 0 18px 18px', border: '1px solid var(--line)', borderTop: 'none', padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <input
            ref={inputRef}
            className="field"
            style={{ flex: 1, borderRadius: 12 }}
            placeholder="Type a message…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }}
            disabled={loading || agentLoading}
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || agentLoading}
            style={{ width: 42, height: 42, borderRadius: 12, border: 'none', background: 'var(--blue)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
          >
            {loading ? <span className="spinner-sm spinner" style={{ borderTopColor: '#fff' }} /> : <Send size={16} />}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11.5, color: 'var(--muted)' }}>
          Powered by AgentOS · Enterprise AI Support
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
