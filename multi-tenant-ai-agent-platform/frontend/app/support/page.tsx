'use client';

import { useEffect, useState, useRef } from 'react';
import Shell from '../../components/Shell';
import { api, formatDate, formatRelative } from '../../lib/api';
import {
  Headphones, UserCheck, UserX, Send, RefreshCw,
  Search, AlertCircle, Bot, User, Clock, ShieldAlert,
  ChevronRight, CheckCircle2
} from 'lucide-react';

interface Conversation {
  id: string;
  customer_id: string;
  status: string;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
  sources?: any[];
}

export default function HumanSupportConsole() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<'escalated' | 'human' | 'all'>('escalated');
  const [search, setSearch] = useState('');

  // Human Response Form
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [takeoverNote, setTakeoverNote] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv.id);
    }
  }, [selectedConv?.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadConversations() {
    setLoading(true);
    try {
      const data = await api<Conversation[]>('/api/conversations');
      setConversations(data || []);
      if (!selectedConv && data && data.length > 0) {
        // default select first escalated or first item
        const escalated = data.find(c => c.status === 'escalated' || c.status === 'human');
        setSelectedConv(escalated || data[0]);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(convId: string) {
    setMsgLoading(true);
    try {
      const res = await api<{ conversation: Conversation; messages: Message[] }>(`/api/conversations/${convId}`);
      setMessages(res.messages || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setMsgLoading(false);
    }
  }

  async function handleTakeover() {
    if (!selectedConv) return;
    try {
      await api(`/api/conversations/${selectedConv.id}/takeover`, {
        method: 'POST',
        body: JSON.stringify({ note: takeoverNote.trim() || undefined })
      });
      setSelectedConv(prev => prev ? { ...prev, status: 'human' } : null);
      setConversations(prev => prev.map(c => c.id === selectedConv.id ? { ...c, status: 'human' } : c));
      setShowNoteModal(false);
      setTakeoverNote('');
    } catch (err: any) {
      alert(err.message || 'Takeover failed');
    }
  }

  async function handleRelease() {
    if (!selectedConv) return;
    try {
      await api(`/api/conversations/${selectedConv.id}/release`, {
        method: 'POST'
      });
      setSelectedConv(prev => prev ? { ...prev, status: 'ai' } : null);
      setConversations(prev => prev.map(c => c.id === selectedConv.id ? { ...c, status: 'ai' } : c));
    } catch (err: any) {
      alert(err.message || 'Release failed');
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || !selectedConv || selectedConv.status !== 'human') return;

    setSending(true);
    try {
      const newMsg = await api<Message>(`/api/conversations/${selectedConv.id}/message`, {
        method: 'POST',
        body: JSON.stringify({ content: replyText.trim() })
      });
      setMessages(prev => [...prev, newMsg]);
      setReplyText('');
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  const filteredConversations = conversations.filter(c => {
    const matchSearch = c.customer_id.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === 'all') return matchSearch;
    return matchSearch && c.status === statusFilter;
  });

  const escalatedCount = conversations.filter(c => c.status === 'escalated').length;
  const humanActiveCount = conversations.filter(c => c.status === 'human').length;

  return (
    <Shell>
      <div className="content" style={{ paddingBottom: 10 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 750, margin: '0 0 5px' }}>Human Support Console</h1>
            <p className="muted">
              Live human-in-the-loop takeover for escalated or low-confidence customer tickets.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span className="badge badge-red" style={{ padding: '6px 12px', fontSize: 13 }}>
              {escalatedCount} Pending Escalations
            </span>
            <span className="badge badge-orange" style={{ padding: '6px 12px', fontSize: 13 }}>
              {humanActiveCount} Under Human Care
            </span>
          </div>
        </div>

        {/* 2-Column Console Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 18, height: 'calc(100vh - 175px)', minHeight: 600 }}>
          {/* Conversation Queue Panel */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <button
                  className={`btn btn-sm ${statusFilter === 'escalated' ? 'btn-danger' : 'btn-light'}`}
                  style={{ flex: 1, fontSize: 12 }}
                  onClick={() => setStatusFilter('escalated')}
                >
                  Escalated ({escalatedCount})
                </button>
                <button
                  className={`btn btn-sm ${statusFilter === 'human' ? 'btn-primary' : 'btn-light'}`}
                  style={{ flex: 1, fontSize: 12 }}
                  onClick={() => setStatusFilter('human')}
                >
                  Active ({humanActiveCount})
                </button>
                <button
                  className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-light'}`}
                  style={{ fontSize: 12 }}
                  onClick={() => setStatusFilter('all')}
                >
                  All
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                  className="field"
                  placeholder="Search customer ID..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: 30, fontSize: 12.5 }}
                />
              </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto' }} className="scrollable">
              {filteredConversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid #f2f4f7',
                    cursor: 'pointer',
                    background: selectedConv?.id === conv.id ? 'var(--blue-light)' : 'transparent',
                    borderLeft: selectedConv?.id === conv.id ? '3px solid var(--blue)' : '3px solid transparent',
                    transition: 'all 0.1s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>
                      {conv.customer_id}
                    </span>
                    <span className={`badge ${conv.status === 'escalated' ? 'badge-red' : conv.status === 'human' ? 'badge-orange' : 'badge-blue'}`}>
                      {conv.status === 'escalated' ? 'Needs Agent' : conv.status === 'human' ? 'Human Care' : 'AI Handled'}
                    </span>
                  </div>
                  <div className="muted" style={{ fontSize: 11.5 }}>
                    Updated {formatRelative(conv.updated_at || conv.created_at)}
                  </div>
                </div>
              ))}

              {!loading && filteredConversations.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon"><Headphones size={22} /></div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Queue is clear!</div>
                  <p className="muted" style={{ fontSize: 12 }}>No tickets match your filter criteria.</p>
                </div>
              )}
            </div>
          </div>

          {/* Active Chat Viewer & Takeover Console */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {selectedConv ? (
              <>
                {/* Chat Header Bar */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <b style={{ fontSize: 15 }}>{selectedConv.customer_id}</b>
                      <span className={`badge ${selectedConv.status === 'escalated' ? 'badge-red' : selectedConv.status === 'human' ? 'badge-orange' : 'badge-blue'}`}>
                        {selectedConv.status === 'escalated' ? 'Escalated' : selectedConv.status === 'human' ? 'Human Active' : 'AI Active'}
                      </span>
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Conversation ID: {selectedConv.id}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    {selectedConv.status !== 'human' ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowNoteModal(true)}
                      >
                        <UserCheck size={14} /> Take Over Conversation
                      </button>
                    ) : (
                      <button
                        className="btn btn-light btn-sm"
                        onClick={handleRelease}
                      >
                        <UserX size={14} /> Release Back to AI
                      </button>
                    )}
                  </div>
                </div>

                {/* Message Stream */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#f8fafc' }} className="scrollable">
                  {msgLoading && (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                      <div className="spinner" style={{ margin: '0 auto 10px' }} />
                      <div className="muted" style={{ fontSize: 12 }}>Loading conversation transcript...</div>
                    </div>
                  )}

                  {!msgLoading && messages.map(msg => (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        marginBottom: 16
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, maxWidth: '75%' }}>
                        {msg.role !== 'user' && (
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: msg.role === 'human' ? '#fff4e5' : '#eaf1ff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                            {msg.role === 'human' ? <User size={14} color="#b54708" /> : <Bot size={14} color="var(--blue)" />}
                          </div>
                        )}
                        <div>
                          <div className={`chat-bubble ${msg.role}`}>
                            {msg.content}
                          </div>
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="muted" style={{ fontSize: 11, marginTop: 4, paddingLeft: 4 }}>
                              📎 RAG Sources: {msg.sources.map((s: any) => s.document).join(', ')}
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                            {msg.role === 'human' ? 'Human Agent' : msg.role === 'assistant' ? 'AI Support' : 'Customer'} · {formatRelative(msg.created_at)}
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
                  <div ref={scrollRef} />
                </div>

                {/* Bottom Human Response Box */}
                {selectedConv.status === 'human' ? (
                  <form onSubmit={handleSendReply} style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', background: '#fff', display: 'flex', gap: 10 }}>
                    <input
                      className="field"
                      placeholder="Type your official response to the customer..."
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      disabled={sending}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={sending || !replyText.trim()}
                    >
                      {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                      Reply as Human
                    </button>
                  </form>
                ) : (
                  <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', background: '#fff', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                    Conversation is currently handled by AI. Click <b>"Take Over Conversation"</b> to send human responses.
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state" style={{ margin: 'auto' }}>
                <div className="empty-state-icon"><Headphones size={28} /></div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Select a Conversation</div>
                <p className="muted" style={{ fontSize: 13 }}>
                  Pick an escalated ticket from the queue on the left to review messages and intervene.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal: Takeover Note */}
        {showNoteModal && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 460 }}>
              <div className="modal-header">
                <b>Take Over Customer Ticket</b>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowNoteModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
                  The AI agent will pause automated generation for this customer session. You can optionally log an internal audit note.
                </p>
                <label className="label">Internal Audit Note (Optional)</label>
                <textarea
                  className="field"
                  rows={3}
                  placeholder="e.g., Customer requested manager escalation for payment clarification."
                  value={takeoverNote}
                  onChange={e => setTakeoverNote(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button className="btn btn-light" onClick={() => setShowNoteModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleTakeover}>Confirm Takeover</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
