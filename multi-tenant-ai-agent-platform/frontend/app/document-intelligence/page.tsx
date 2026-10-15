'use client';

import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api, formatDate } from '../../lib/api';
import { ScanText, CheckCircle, XCircle, Clock, Download, ChevronRight, ChevronDown, FileText, Search } from 'lucide-react';

interface Document {
  id: string;
  filename: string;
  file_type: string;
  status: string;
  classification?: string;
  classification_confidence?: number;
  ocr_used: boolean;
  verification_status: string;
  verification_notes?: string;
  extracted_data?: Record<string, any>;
  chunks: number;
  created_at: string;
}

export default function DocumentIntelligencePage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Document | null>(null);
  const [note, setNote] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tab, setTab] = useState<'overview' | 'extracted' | 'classification'>('overview');

  useEffect(() => { loadDocs(); }, []);

  async function loadDocs() {
    setLoading(true);
    try {
      const data = await api('/api/documents');
      setDocs(data);
    } finally {
      setLoading(false);
    }
  }

  async function verify(status: string) {
    if (!selected) return;
    setVerifying(true);
    try {
      const updated = await api(`/api/documents/${selected.id}/verify`, {
        method: 'PUT',
        body: JSON.stringify({ status, notes: note || undefined }),
      });
      const updatedDoc = { ...selected, verification_status: updated.verification_status, verification_notes: note };
      setDocs(d => d.map(x => x.id === selected.id ? updatedDoc : x));
      setSelected(updatedDoc);
      setNote('');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setVerifying(false);
    }
  }

  async function exportDoc(doc: Document) {
    try {
      const data = await api(`/api/documents/${doc.id}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.filename.replace(/\.[^.]+$/, '')}_intelligence.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message);
    }
  }

  const filtered = docs.filter(d => {
    const matchSearch = !search || d.filename.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || d.verification_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: docs.length,
    indexed: docs.filter(d => d.status === 'indexed').length,
    verified: docs.filter(d => d.verification_status === 'verified').length,
    pending: docs.filter(d => d.verification_status === 'pending').length,
    ocr: docs.filter(d => d.ocr_used).length,
  };

  function ConfidenceBar({ value }: { value: number }) {
    const pct = Math.round(value * 100);
    const color = pct >= 80 ? '#067647' : pct >= 60 ? '#b54708' : '#b42318';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.5s' }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 36 }}>{pct}%</span>
      </div>
    );
  }

  return (
    <Shell>
      <div className="content">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 750, margin: '0 0 5px' }}>Document Intelligence</h1>
          <p className="muted">AI-powered document processing: OCR, text extraction, ML classification, key-field extraction, and human verification workflow.</p>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 22 }}>
          {[
            { label: 'Total', value: stats.total, color: 'var(--ink)' },
            { label: 'Indexed', value: stats.indexed, color: '#067647' },
            { label: 'Verified', value: stats.verified, color: '#067647' },
            { label: 'Pending review', value: stats.pending, color: '#b54708' },
            { label: 'OCR processed', value: stats.ocr, color: '#7c3aed' },
          ].map(s => (
            <div key={s.label} className="card stat" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 750, color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 18 }}>
          {/* Left: document list */}
          <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '75vh' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>Documents</div>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input className="field" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30, fontSize: 13 }} />
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['all', 'pending', 'verified', 'rejected'] as const).map(f => (
                  <button key={f} onClick={() => setStatusFilter(f)} className={`btn btn-sm ${statusFilter === f ? 'btn-primary' : 'btn-light'}`} style={{ fontSize: 11, padding: '3px 8px' }}>
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }} className="scrollable">
              {loading && [1, 2, 3].map(i => (
                <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid #f2f4f7' }}>
                  <div className="skeleton" style={{ height: 13, width: '70%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 11, width: '45%' }} />
                </div>
              ))}
              {!loading && filtered.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => setSelected(selected?.id === doc.id ? null : doc)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f2f4f7',
                    cursor: 'pointer',
                    background: selected?.id === doc.id ? 'var(--blue-light)' : 'transparent',
                    borderLeft: selected?.id === doc.id ? '3px solid var(--blue)' : '3px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</span>
                    {doc.verification_status === 'verified' ? <CheckCircle size={14} color="#067647" /> : doc.verification_status === 'rejected' ? <XCircle size={14} color="#b42318" /> : <Clock size={14} color="#b54708" />}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {doc.classification && <span className="badge badge-purple" style={{ fontSize: 10.5 }}>{doc.classification}</span>}
                    {doc.ocr_used && <span className="badge badge-blue" style={{ fontSize: 10.5 }}>OCR</span>}
                    <span className="muted" style={{ fontSize: 11 }}>{doc.chunks} chunks</span>
                  </div>
                </div>
              ))}
              {!loading && filtered.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon"><ScanText size={22} /></div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>No documents</div>
                  <p className="muted" style={{ fontSize: 12 }}>Upload documents in the Documents section.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: detail view */}
          {selected ? (
            <div className="card" style={{ overflow: 'hidden' }}>
              {/* Doc header */}
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line)', background: '#fafbfc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{selected.filename}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {selected.status === 'indexed' ? <span className="badge badge-green">✓ Indexed</span> : <span className="badge badge-orange">Processing</span>}
                      {selected.ocr_used && <span className="badge badge-purple">OCR Used</span>}
                      {selected.verification_status === 'verified' && <span className="badge badge-green">✓ Verified</span>}
                      {selected.verification_status === 'rejected' && <span className="badge badge-red">✗ Rejected</span>}
                      {selected.verification_status === 'pending' && <span className="badge badge-orange">⏳ Pending review</span>}
                    </div>
                  </div>
                  <button className="btn btn-light btn-sm" onClick={() => exportDoc(selected)}>
                    <Download size={13} /> Export JSON
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ padding: '0 22px', borderBottom: '1px solid var(--line)', background: '#fff' }}>
                <div className="tabs">
                  {(['overview', 'extracted', 'classification'] as const).map(t => (
                    <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                      {t === 'overview' ? 'Overview' : t === 'extracted' ? 'Extracted Data' : 'Classification'}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ padding: '20px 22px', overflow: 'auto' }} className="scrollable">
                {tab === 'overview' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Info */}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Document Info</div>
                      {[
                        ['File type', selected.file_type.toUpperCase()],
                        ['Status', selected.status],
                        ['Chunks indexed', selected.chunks],
                        ['OCR used', selected.ocr_used ? 'Yes' : 'No'],
                        ['Uploaded', formatDate(selected.created_at)],
                      ].map(([k, v]) => (
                        <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f2f4f7', fontSize: 13 }}>
                          <span className="muted">{k}</span>
                          <span style={{ fontWeight: 500 }}>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                    {/* Verification */}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Human Verification</div>
                      <div className="card-flat" style={{ padding: 16 }}>
                        <div style={{ fontSize: 13, marginBottom: 4 }}>Current status: </div>
                        <div style={{ marginBottom: 14 }}>
                          {selected.verification_status === 'verified' ? <span className="badge badge-green">✓ Verified</span> : selected.verification_status === 'rejected' ? <span className="badge badge-red">✗ Rejected</span> : <span className="badge badge-orange">⏳ Pending</span>}
                        </div>
                        {selected.verification_notes && (
                          <div className="alert alert-info" style={{ marginBottom: 14, fontSize: 12 }}>
                            <b>Previous notes:</b> {selected.verification_notes}
                          </div>
                        )}
                        <label className="label">Reviewer notes</label>
                        <textarea className="field" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Add verification notes…" style={{ marginBottom: 12 }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-success btn-sm" onClick={() => verify('verified')} disabled={verifying}>
                            <CheckCircle size={13} /> Mark Verified
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => verify('rejected')} disabled={verifying}>
                            <XCircle size={13} /> Reject
                          </button>
                          <button className="btn btn-light btn-sm" onClick={() => verify('pending')} disabled={verifying}>
                            <Clock size={13} /> Reset Pending
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {tab === 'extracted' && (
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Extracted Key Fields</div>
                    {selected.extracted_data && Object.keys(selected.extracted_data).length > 0 ? (
                      <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                        {Object.entries(selected.extracted_data).map(([k, v], i) => (
                          <div key={k} style={{ display: 'flex', padding: '12px 16px', borderBottom: i < Object.keys(selected.extracted_data!).length - 1 ? '1px solid #f2f4f7' : 'none', fontSize: 13 }}>
                            <span style={{ color: 'var(--muted)', width: 160, flexShrink: 0, fontWeight: 600 }}>{k}</span>
                            <span style={{ flex: 1 }}>{String(v) || <span className="muted">—</span>}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <div className="empty-state-icon"><FileText size={22} /></div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>No fields extracted</div>
                        <p className="muted" style={{ fontSize: 12 }}>The document may not have recognized fields or was image-only.</p>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'classification' && (
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>ML Classification Results</div>
                    {selected.classification ? (
                      <div>
                        <div className="card-flat" style={{ padding: 20, marginBottom: 16 }}>
                          <div style={{ fontSize: 22, fontWeight: 750, marginBottom: 4 }}>{selected.classification}</div>
                          <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>Document category predicted by ML classifier</div>
                          {selected.classification_confidence !== undefined && (
                            <div>
                              <div style={{ fontSize: 13, marginBottom: 6, fontWeight: 600 }}>Confidence Score</div>
                              <ConfidenceBar value={selected.classification_confidence} />
                            </div>
                          )}
                        </div>
                        <div className="alert alert-info">
                          <div>
                            <b>About Document Intelligence:</b> Documents are automatically classified using a machine learning model trained on common business document types (invoices, contracts, reports, etc.). The confidence score reflects model certainty. Use human verification to confirm or correct classifications.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="empty-state">
                        <div className="empty-state-icon"><ScanText size={22} /></div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>Not classified</div>
                        <p className="muted" style={{ fontSize: 12 }}>Re-index the document to run classification.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="empty-state">
                <div className="empty-state-icon"><ScanText size={28} /></div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Select a document</div>
                <p className="muted" style={{ fontSize: 13 }}>Choose a document from the list to view AI processing results, extracted data, and run human verification.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
