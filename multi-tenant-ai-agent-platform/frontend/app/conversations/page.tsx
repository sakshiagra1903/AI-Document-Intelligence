'use client';

import { useEffect, useState, useRef } from 'react';
import Shell from '../../components/Shell';
import { api, formatDate, formatRelative } from '../../lib/api';
import { MessageSquare, User, Bot, AlertTriangle, Search, RefreshCw, ChevronRight, Send, UserCheck, UserX } from 'lucide-react';

interface Conversation { id: string; customer_id: string; status: string; created_at: string; updated_at: string; agent_id: string; resolved: boolean; }
interface Message { id: string; role: string; content: string; created_at: string; sources?: any[]; }

export default function ConversationsPage() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'ai' | 'human' | 'escalated'>('all');
  const [humanMsg, setHumanMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [takeoverNote, setTakeoverNote] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (messages.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  async function loadConversations() {
    setLoading(true);
    try {
      const data = await api('/api/conversations');
      setConvs(data);
    } catch (e: any) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function selectConv(conv: Conversation) {
    setSelected(conv);
    setMsgLoading(true);
    try {
      const data = await api(`/api/conversations/${conv.id}`);
      setMessages(data.messages || []);
    } catch (e: any) {
      setMessages([]);
    } finally {
      setMsgLoading(false);
    }
  }

  async function takeover() {
    if (!selected) return;
    try {
      await api(`/api/conversations/${selected.id}/takeover`, {
        method: 'POST',
        body: JSON.stringify({ note: takeoverNote || undefined }),
      });
      setSelected({ ...selected, status: 'human' });
      setConvs(c => c.map(x => x.id === selected.id ? { ...x, status: 'human' } : x));
      setTakeoverNote('');
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function release() {
    if (!selected) return;
    try {
      await api(`/api/conversations/${selected.id}/release`, { method: 'POST' });
      setSelected({ ...selected, status: 'ai' });
      setConvs(c => c.map(x => x.id === selected.id ? { ...x, status: 'ai' } : x));
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function sendHumanMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!humanMsg.trim() || !selected || selected.status !== 'human') return;
    setSending(true);
    try {
      const msg = await api(`/api/conversations/${selected.id}/message`, {
        method: 'POST',
        body: JSON.stringify({ content: humanMsg }),
      });
      setMessages(m => [...m, msg]);
      setHumanMsg('');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSending(false);
    }
  }

  const filtered = convs.filter(c => {
    const matchSearch = !search || c.customer_id.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || c.status === filter;
    return matchSearch && matchFilter;
  });

  function statusBadge(status: string) {
    if (status === 'ai') return <span className="badge badge-blue">🤖 AI</span>;
    if (status === 'human') return <span className="badge badge-orange">👤 Human</span>;
    if (status === 'escalated') return <span className="badge badge-red">⚠ Escalated</span>;
    return <span className="badge badge-gray">{status}</span>;
  }

  return (
    <Shell>
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', height: 'calc(100vh - 65px)', overflow: 'hidden' }}>
        {/* Left: conversation list */}
        <div style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
          {/* Search + filter */}
          <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Conversations</div>
            <div className="input-group" style={{ position: 'relative', marginBottom: 10 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input
                className="field"
                placeholder="Search customer…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 32, fontSize: 13 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['all', 'ai', 'human', 'escalated'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-light'}`}
                  style={{ fontSize: 11.5, padding: '4px 8px' }}
                >
                  {f === 'all' ? 'All' : f === 'ai' ? '🤖 AI' : f === 'human' ? '👤 Human' : '⚠ Escalated'}
                </button>
              ))}
              <button className="btn btn-ghost btn-sm btn-icon" onClick={loadConversations} style={{ marginLeft: 'auto' }}>
                <RefreshCw size={12} />
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflow: 'auto' }} className="scrollable">
            {loading && [1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ padding: '14px 16px', borderBottom: '1px solid #f2f4f7' }}>
                <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 12, width: '40%' }} />
              </div>
            ))}
            {!loading && filtered.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon"><MessageSquare size={22} /></div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>No conversations</div>
                <p className="muted" style={{ fontSize: 12 }}>Try changing your filter.</p>
              </div>
            )}
            {!loading && filtered.map(conv => (
              <div
                key={conv.id}
                onClick={() => selectConv(conv)}
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid #f2f4f7',
                  cursor: 'pointer',
                  background: selected?.id === conv.id ? 'var(--blue-light)' : 'transparent',
                  borderLeft: selected?.id === conv.id ? '3px solid var(--blue)' : '3px solid transparent',
                  transition: 'all 0.1s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{conv.customer_id}</span>
                  {statusBadge(conv.status)}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                  {formatRelative(conv.updated_at || conv.created_at)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: conversation detail */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#f6f8fb', overflow: 'hidden' }}>
          {!selected ? (
            <div className="empty-state" style={{ margin: 'auto', padding: 60 }}>
              <div className="empty-state-icon" style={{ width: 64, height: 64 }}><MessageSquare size={28} /></div>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Select a conversation</div>
              <p className="muted">Choose a conversation from the list to view messages.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: '14px 20px', background: '#fff', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{selected.customer_id}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Started {formatDate(selected.created_at)} · {statusBadge(selected.status)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {selected.status !== 'human' ? (
                    <button className="btn btn-sm btn-primary" onClick={takeover}>
                      <UserCheck size={13} /> Take over
                    </button>
                  ) : (
                    <button className="btn btn-sm btn-light" onClick={release}>
                      <UserX size={13} /> Release to AI
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflow: 'auto', padding: '20px' }} className="scrollable">
                {msgLoading && (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <div className="spinner" style={{ margin: '0 auto' }} />
                  </div>
                )}
                {!msgLoading && messages.map((msg, i) => (
                  <div key={msg.id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, maxWidth: '75%' }}>
                      {msg.role !== 'user' && (
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: msg.role === 'human' ? '#fff4e5' : '#eaf1ff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                          {msg.role === 'assistant' ? <Bot size={14} color="var(--blue)" /> : <User size={14} color="var(--warning)" />}
                        </div>
                      )}
                      <div>
                        <div className={`chat-bubble ${msg.role}`}>{msg.content}</div>
                        {msg.sources && msg.sources.length > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, paddingLeft: 4 }}>
                            📎 Sources: {msg.sources.map((s: any) => `${s.document}${s.page ? ` p.${s.page}` : ''}`).join(', ')}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                          {formatRelative(msg.created_at)}
                        </div>
                      </div>
                      {msg.role === 'user' && (
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e5e7eb', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                          <User size={14} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {!msgLoading && messages.length === 0 && (
                  <div className="empty-state">
                    <p className="muted">No messages in this conversation yet.</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Human message input (only when status=human) */}
              {selected.status === 'human' && (
                <form onSubmit={sendHumanMessage} style={{ padding: '14px 20px', background: '#fff', borderTop: '1px solid var(--line)', display: 'flex', gap: 10 }}>
                  <input
                    className="field"
                    placeholder="Type your response as a human agent…"
                    value={humanMsg}
                    onChange={e => setHumanMsg(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-primary" type="submit" disabled={sending || !humanMsg.trim()}>
                    {sending ? <span className="spinner-sm spinner" /> : <Send size={14} />}
                    Send
                  </button>
                </form>
              )}
              {selected.status !== 'human' && (
                <div style={{ padding: '10px 20px', background: '#f9fafb', borderTop: '1px solid var(--line)', fontSize: 12.5, color: 'var(--muted)', textAlign: 'center' }}>
                  This conversation is being handled by the AI. Click <b>Take over</b> to respond manually.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
