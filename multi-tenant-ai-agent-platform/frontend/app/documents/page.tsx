'use client';

import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api, formatDate, formatCurrency } from '../../lib/api';
import { Upload, FileText, Trash2, RefreshCw, CheckCircle, XCircle, Clock, Eye, Download, ChevronDown, ChevronRight, Search } from 'lucide-react';

interface Document {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: string;
  chunks: number;
  error?: string;
  classification?: string;
  classification_confidence?: number;
  ocr_used: boolean;
  verification_status: string;
  extracted_data?: Record<string, any>;
  created_at: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'indexed') return <span className="badge badge-green">✓ Indexed</span>;
  if (status === 'processing') return <span className="badge badge-blue">⏳ Processing</span>;
  if (status === 'error') return <span className="badge badge-red">✗ Error</span>;
  return <span className="badge badge-gray">{status}</span>;
}

function VerifyBadge({ status }: { status: string }) {
  if (status === 'verified') return <span className="badge badge-green">✓ Verified</span>;
  if (status === 'rejected') return <span className="badge badge-red">✗ Rejected</span>;
  return <span className="badge badge-orange">⏳ Pending</span>;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [selected, setSelected] = useState<Document | null>(null);
  const [chunks, setChunks] = useState<any[]>([]);
  const [chunksLoading, setChunksLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [reindexing, setReindexing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [verifyNote, setVerifyNote] = useState('');

  useEffect(() => { loadDocs(); }, []);

  async function loadDocs() {
    setLoading(true);
    try {
      const data = await api('/api/documents');
      setDocs(data);
    } catch (e: any) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadMsg('');
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const doc = await api('/api/documents/upload', { method: 'POST', body: fd });
      setUploadMsg(`✓ "${doc.filename}" indexed — ${doc.chunks} chunks`);
      setFile(null);
      (document.getElementById('file-input') as HTMLInputElement).value = '';
      await loadDocs();
    } catch (e: any) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function reindex(id: string) {
    setReindexing(id);
    try {
      await api(`/api/documents/${id}/reindex`, { method: 'POST' });
      await loadDocs();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setReindexing(null);
    }
  }

  async function deleteDoc(id: string) {
    if (!confirm('Delete this document? This will remove all indexed chunks.')) return;
    setDeleting(id);
    try {
      await api(`/api/documents/${id}`, { method: 'DELETE' });
      setDocs(d => d.filter(x => x.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeleting(null);
    }
  }

  async function viewDoc(doc: Document) {
    if (selected?.id === doc.id) { setSelected(null); return; }
    setSelected(doc);
    setChunksLoading(true);
    setChunks([]);
    try {
      const data = await api(`/api/documents/${doc.id}/chunks`);
      setChunks(data);
    } catch {
      setChunks([]);
    } finally {
      setChunksLoading(false);
    }
  }

  async function verify(docId: string, status: string) {
    try {
      const updated = await api(`/api/documents/${docId}/verify`, {
        method: 'PUT',
        body: JSON.stringify({ status, notes: verifyNote || undefined }),
      });
      setDocs(d => d.map(x => x.id === docId ? { ...x, verification_status: updated.verification_status } : x));
      if (selected?.id === docId) setSelected(s => s ? { ...s, verification_status: updated.verification_status } : null);
      setVerifyNote('');
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function exportDoc(docId: string, filename: string) {
    try {
      const data = await api(`/api/documents/${docId}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `${filename.replace(/\.[^.]+$/, '')}_export.json`;
      a.click(); URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message);
    }
  }

  const filtered = docs.filter(d => !search || d.filename.toLowerCase().includes(search.toLowerCase()));

  return (
    <Shell>
      <div className="content">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 750, margin: '0 0 5px' }}>Documents</h1>
          <p className="muted">Upload and manage your knowledge base documents. Supports PDF, DOCX, TXT, Markdown, CSV, JSON, HTML, and images (OCR).</p>
        </div>

        {/* Upload card */}
        <div className="card" style={{ padding: 22, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={16} color="var(--blue)" /> Upload document
          </div>
          <form onSubmit={upload} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <label htmlFor="file-input" style={{ display: 'block', border: '2px dashed #d7dce5', borderRadius: 12, padding: '18px 20px', cursor: 'pointer', transition: 'border-color 0.15s', textAlign: 'center', background: file ? 'var(--blue-light)' : '#fafbfc' }}>
                <div style={{ color: file ? 'var(--blue)' : 'var(--muted)', fontSize: 13, fontWeight: 600 }}>
                  {file ? `📄 ${file.name} (${formatBytes(file.size)})` : '📂 Click or drag file here'}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>
                  PDF, DOCX, TXT, MD, CSV, JSON, HTML, PNG, JPG, TIFF, BMP, WEBP
                </div>
              </label>
              <input id="file-input" type="file" style={{ display: 'none' }} accept=".pdf,.docx,.txt,.md,.csv,.json,.html,.png,.jpg,.jpeg,.tiff,.bmp,.webp" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={!file || uploading} style={{ alignSelf: 'center' }}>
              {uploading ? <><span className="spinner-sm spinner" /> Processing…</> : <><Upload size={14} /> Upload & Index</>}
            </button>
          </form>
          {uploadMsg && <div className="alert alert-success" style={{ marginTop: 12 }}>{uploadMsg}</div>}
          {uploadError && <div className="alert alert-error" style={{ marginTop: 12 }}>{uploadError}</div>}
        </div>

        {/* Documents list */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              Documents ({filtered.length})
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input className="field" style={{ paddingLeft: 30, fontSize: 13, width: 200 }} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <button className="btn btn-light btn-sm" onClick={loadDocs}><RefreshCw size={13} /></button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Verification</th>
                  <th>Classification</th>
                  <th>Chunks</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && [1, 2, 3].map(i => (
                  <tr key={i}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(j => (
                      <td key={j}><div className="skeleton" style={{ height: 14, width: j === 1 ? '80%' : '60%' }} /></td>
                    ))}
                  </tr>
                ))}
                {!loading && filtered.map(doc => (
                  <>
                    <tr key={doc.id} style={{ cursor: 'pointer' }}>
                      <td onClick={() => viewDoc(doc)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FileText size={14} color="var(--blue)" />
                          <span style={{ fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</span>
                          {selected?.id === doc.id ? <ChevronDown size={12} color="var(--muted)" /> : <ChevronRight size={12} color="var(--muted)" />}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginLeft: 22, marginTop: 2 }}>{formatBytes(doc.file_size)}</div>
                      </td>
                      <td><span className="badge badge-gray" style={{ textTransform: 'uppercase', fontSize: 10.5 }}>{doc.file_type.replace('.', '')}</span></td>
                      <td>
                        <StatusBadge status={doc.status} />
                        {doc.ocr_used && <span className="badge badge-purple" style={{ marginLeft: 4, fontSize: 10.5 }}>OCR</span>}
                        {doc.status === 'error' && doc.error && (
                          <div style={{ fontSize: 11, color: 'var(--error)', marginTop: 2 }}>{doc.error.slice(0, 60)}…</div>
                        )}
                      </td>
                      <td><VerifyBadge status={doc.verification_status} /></td>
                      <td>
                        {doc.classification ? (
                          <div>
                            <span style={{ fontSize: 12.5, fontWeight: 500 }}>{doc.classification}</span>
                            {doc.classification_confidence ? (
                              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{(doc.classification_confidence * 100).toFixed(0)}% confidence</div>
                            ) : null}
                          </div>
                        ) : <span className="muted">—</span>}
                      </td>
                      <td><span style={{ fontWeight: 600 }}>{doc.chunks}</span></td>
                      <td className="muted" style={{ fontSize: 12 }}>{formatDate(doc.created_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => exportDoc(doc.id, doc.filename)} title="Export">
                            <Download size={13} />
                          </button>
                          <button className="btn btn-light btn-icon btn-sm" onClick={() => reindex(doc.id)} disabled={reindexing === doc.id} title="Re-index">
                            {reindexing === doc.id ? <span className="spinner-sm spinner" /> : <RefreshCw size={13} />}
                          </button>
                          <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteDoc(doc.id)} disabled={deleting === doc.id} title="Delete">
                            {deleting === doc.id ? <span className="spinner-sm spinner" /> : <Trash2 size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded row */}
                    {selected?.id === doc.id && (
                      <tr>
                        <td colSpan={8} style={{ padding: 0, background: '#f9fafb' }}>
                          <div style={{ padding: '18px 20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                              {/* Extracted data */}
                              {doc.extracted_data && Object.keys(doc.extracted_data).length > 0 && (
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Extracted Fields</div>
                                  <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                                    {Object.entries(doc.extracted_data).map(([k, v]) => (
                                      <div key={k} style={{ display: 'flex', padding: '8px 14px', borderBottom: '1px solid #f2f4f7', fontSize: 12.5 }}>
                                        <span style={{ color: 'var(--muted)', width: 130, flexShrink: 0, fontWeight: 600 }}>{k}</span>
                                        <span>{String(v)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {/* Verification */}
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Human Verification</div>
                                <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 10, padding: '14px' }}>
                                  <div style={{ marginBottom: 10 }}>
                                    <label className="label">Notes (optional)</label>
                                    <textarea className="field" rows={2} value={verifyNote} onChange={e => setVerifyNote(e.target.value)} placeholder="Add notes about this document…" />
                                  </div>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-success btn-sm" onClick={() => verify(doc.id, 'verified')}>
                                      <CheckCircle size={13} /> Verify
                                    </button>
                                    <button className="btn btn-danger btn-sm" onClick={() => verify(doc.id, 'rejected')}>
                                      <XCircle size={13} /> Reject
                                    </button>
                                    <button className="btn btn-light btn-sm" onClick={() => verify(doc.id, 'pending')}>
                                      <Clock size={13} /> Pending
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                            {/* Chunks preview */}
                            <div style={{ marginTop: 16 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
                                Indexed Chunks ({chunksLoading ? '…' : chunks.length})
                              </div>
                              {chunksLoading && <div className="spinner" style={{ margin: '10px 0' }} />}
                              {!chunksLoading && chunks.slice(0, 3).map((c, i) => (
                                <div key={c.id || i} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 14px', marginBottom: 8, fontSize: 12.5 }}>
                                  <div style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 4, fontWeight: 600 }}>CHUNK {i + 1}</div>
                                  {c.content.slice(0, 250)}{c.content.length > 250 ? '…' : ''}
                                </div>
                              ))}
                              {!chunksLoading && chunks.length > 3 && (
                                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>+ {chunks.length - 3} more chunks</div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <div className="empty-state-icon"><FileText size={24} /></div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>No documents yet</div>
                        <p className="muted" style={{ fontSize: 12.5 }}>Upload your first document using the form above.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  );
}
