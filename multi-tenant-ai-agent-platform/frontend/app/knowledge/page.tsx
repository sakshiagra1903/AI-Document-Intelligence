'use client';

import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api, formatDate } from '../../lib/api';
import {
  BookOpen, Plus, Search, HelpCircle, Globe, FileText,
  Trash2, ExternalLink, Sparkles, Filter, CheckCircle2,
  Layers, ArrowRight, RefreshCw, AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface KnowledgeSource {
  id: string;
  type: string;
  name: string;
  status: string;
  metadata_?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  active: boolean;
  created_at: string;
}

export default function KnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState<'all' | 'sources' | 'faqs' | 'test'>('all');
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  
  // FAQ Form State
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqCategory, setFaqCategory] = useState('General');
  const [faqTags, setFaqTags] = useState('');
  const [submittingFaq, setSubmittingFaq] = useState(false);
  const [faqMessage, setFaqMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Semantic Search Test State
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(false);
    try {
      const [srcData, faqData] = await Promise.all([
        api<KnowledgeSource[]>('/api/knowledge/sources').catch(() => []),
        api<FAQ[]>('/api/faqs').catch(() => [])
      ]);
      setSources(srcData || []);
      setFaqs(faqData || []);
    } catch (err: any) {
      console.error('Failed to load knowledge data:', err);
    }
  }

  async function handleAddFaq(e: React.FormEvent) {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) return;
    setSubmittingFaq(true);
    setFaqMessage(null);
    try {
      const tagsArray = faqTags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const newFaq = await api<FAQ>('/api/faqs', {
        method: 'POST',
        body: JSON.stringify({
          question: faqQuestion.trim(),
          answer: faqAnswer.trim(),
          category: faqCategory.trim() || 'General',
          tags: tagsArray
        })
      });

      setFaqs(prev => [newFaq, ...prev]);
      setFaqMessage({ type: 'success', text: 'FAQ added and embedded into vector knowledge!' });
      setFaqQuestion('');
      setFaqAnswer('');
      setFaqTags('');
      setShowFaqModal(false);
    } catch (err: any) {
      setFaqMessage({ type: 'error', text: err.message || 'Failed to create FAQ' });
    } finally {
      setSubmittingFaq(false);
    }
  }

  async function runSemanticSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!testQuery.trim()) return;
    setSearching(true);
    setTestResults(null);
    try {
      const res = await api<{ query: string; results: any[] }>(
        `/api/knowledge/search?q=${encodeURIComponent(testQuery.trim())}`
      );
      setTestResults(res.results || []);
    } catch (err: any) {
      alert(err.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  }

  const filteredSources = sources.filter(s =>
    s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    s.type.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredFaqs = faqs.filter(f =>
    f.question.toLowerCase().includes(searchFilter.toLowerCase()) ||
    f.answer.toLowerCase().includes(searchFilter.toLowerCase()) ||
    f.category.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <Shell>
      <div className="content">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 750, margin: '0 0 5px' }}>Knowledge Base</h1>
            <p className="muted">
              Centralized repository of documents, crawled websites, and curated FAQs embedded into vector memory.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setShowFaqModal(true)}
              className="btn btn-primary"
            >
              <Plus size={15} /> Add FAQ
            </button>
            <Link href="/documents" className="btn btn-light">
              <FileText size={15} /> Upload Document
            </Link>
            <Link href="/websites" className="btn btn-light">
              <Globe size={15} /> Crawl Website
            </Link>
          </div>
        </div>

        {faqMessage && (
          <div className={`alert ${faqMessage.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 18 }}>
            {faqMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {faqMessage.text}
          </div>
        )}

        {/* Knowledge Overview Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }} className="grid-cols-4">
          <div className="card stat">
            <div className="stat-label">Total Knowledge Sources</div>
            <div className="stat-value">{sources.length}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Documents & Crawled domains</div>
          </div>
          <div className="card stat">
            <div className="stat-label">Curated FAQs</div>
            <div className="stat-value">{faqs.length}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Vector indexed Q&A pairs</div>
          </div>
          <div className="card stat">
            <div className="stat-label">Vector Dimension</div>
            <div className="stat-value">384</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>all-MiniLM-L6-v2 embeddings</div>
          </div>
          <div className="card stat">
            <div className="stat-label">Indexing Engine</div>
            <div className="stat-value" style={{ fontSize: 20, color: 'var(--blue)', marginTop: 12 }}>pgvector</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Strict multi-tenant isolation</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="tabs" style={{ marginBottom: 20 }}>
          <button
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Knowledge ({sources.length + faqs.length})
          </button>
          <button
            className={`tab ${activeTab === 'sources' ? 'active' : ''}`}
            onClick={() => setActiveTab('sources')}
          >
            Sources ({sources.length})
          </button>
          <button
            className={`tab ${activeTab === 'faqs' ? 'active' : ''}`}
            onClick={() => setActiveTab('faqs')}
          >
            FAQs ({faqs.length})
          </button>
          <button
            className={`tab ${activeTab === 'test' ? 'active' : ''}`}
            onClick={() => setActiveTab('test')}
          >
            <Sparkles size={14} style={{ display: 'inline', marginRight: 5 }} />
            Test RAG Retrieval
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'test' ? (
          /* Semantic Retrieval Simulator */
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 17, marginBottom: 6 }}>Semantic Retrieval Simulator</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
              Test how the AI assistant finds context chunks from your uploaded documents, websites, and FAQs based on cosine similarity.
            </p>

            <form onSubmit={runSemanticSearch} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <input
                className="field"
                placeholder="Ask any question, e.g., 'What is your refund policy?' or 'What are your support hours?'"
                value={testQuery}
                onChange={e => setTestQuery(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" type="submit" disabled={searching || !testQuery.trim()}>
                {searching ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
                Search Vector DB
              </button>
            </form>

            {searching && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div className="spinner" style={{ margin: '0 auto 12px' }} />
                <div className="muted">Computing embeddings and querying vector similarity...</div>
              </div>
            )}

            {testResults && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <b>Retrieved Chunks ({testResults.length})</b>
                  <span className="muted" style={{ fontSize: 12 }}>Sorted by highest cosine similarity</span>
                </div>

                {testResults.length === 0 ? (
                  <div className="empty-state">
                    <p className="muted">No relevant chunks matched above the threshold. Try adding more documents or adjusting keywords.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {testResults.map((chunk, idx) => (
                      <div key={idx} style={{ padding: 16, border: '1px solid var(--line)', borderRadius: 12, background: '#fafbfc' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                          <span style={{ fontWeight: 600, color: 'var(--blue)' }}>
                            Source: {chunk.metadata?.source || 'Knowledge'} {chunk.metadata?.page ? `(Page ${chunk.metadata.page})` : ''}
                          </span>
                          <span className="badge badge-green">
                            Similarity: {(chunk.similarity * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div style={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>
                          {chunk.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* General Content Table */
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Search size={14} className="muted" />
                <input
                  className="field"
                  placeholder="Filter knowledge..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  style={{ width: 260, padding: '6px 12px', fontSize: 13 }}
                />
              </div>
              <button className="btn btn-light btn-sm" onClick={loadData}>
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Title / Question</th>
                    <th>Detail / Category</th>
                    <th>Status</th>
                    <th>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Sources rows */}
                  {(activeTab === 'all' || activeTab === 'sources') &&
                    filteredSources.map(s => (
                      <tr key={s.id}>
                        <td>
                          <span className={`badge ${s.type === 'document' ? 'badge-blue' : 'badge-purple'}`}>
                            {s.type === 'document' ? <FileText size={12} /> : <Globe size={12} />}
                            {s.type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td className="muted" style={{ fontSize: 12.5 }}>
                          {s.metadata_?.pages ? `${s.metadata_.pages} crawled pages` : s.metadata_?.ocr_used ? 'OCR parsed' : 'Indexed Document'}
                        </td>
                        <td>
                          <span className={`badge ${s.status === 'indexed' ? 'badge-green' : 'badge-orange'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="muted" style={{ fontSize: 12 }}>{formatDate(s.created_at)}</td>
                      </tr>
                    ))}

                  {/* FAQ rows */}
                  {(activeTab === 'all' || activeTab === 'faqs') &&
                    filteredFaqs.map(f => (
                      <tr key={f.id}>
                        <td>
                          <span className="badge badge-gray">
                            <HelpCircle size={12} /> FAQ
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{f.question}</div>
                          <div className="muted" style={{ fontSize: 12, marginTop: 4, maxHeight: 40, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {f.answer}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-blue" style={{ fontSize: 11 }}>{f.category}</span>
                        </td>
                        <td>
                          <span className={`badge ${f.active ? 'badge-green' : 'badge-gray'}`}>
                            {f.active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="muted" style={{ fontSize: 12 }}>{formatDate(f.created_at)}</td>
                      </tr>
                    ))}

                  {!loading && filteredSources.length === 0 && filteredFaqs.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-state">
                          <div className="empty-state-icon"><BookOpen size={24} /></div>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>No knowledge found</div>
                          <p className="muted" style={{ fontSize: 12.5 }}>
                            Upload documents, crawl a website, or create custom FAQs to populate your AI's context.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Add FAQ */}
        {showFaqModal && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 580 }}>
              <div className="modal-header">
                <b style={{ fontSize: 16 }}>Create Knowledge FAQ</b>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowFaqModal(false)}>✕</button>
              </div>
              <form onSubmit={handleAddFaq}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label className="label">Question / Query</label>
                    <input
                      className="field"
                      placeholder="e.g., What is your return and refund policy?"
                      value={faqQuestion}
                      onChange={e => setFaqQuestion(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Authoritative Answer</label>
                    <textarea
                      className="field"
                      rows={4}
                      placeholder="Provide the exact answer the AI agent should use when answering customer queries."
                      value={faqAnswer}
                      onChange={e => setFaqAnswer(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="label">Category</label>
                      <input
                        className="field"
                        placeholder="e.g., Billing, Support, General"
                        value={faqCategory}
                        onChange={e => setFaqCategory(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Tags (comma-separated)</label>
                      <input
                        className="field"
                        placeholder="e.g., returns, policy, refund"
                        value={faqTags}
                        onChange={e => setFaqTags(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowFaqModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submittingFaq}>
                    {submittingFaq ? 'Saving & Embedding...' : 'Save & Vectorize'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
