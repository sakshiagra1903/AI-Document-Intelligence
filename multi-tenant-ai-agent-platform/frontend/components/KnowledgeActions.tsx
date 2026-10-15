'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import { Upload, Globe, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export function DocumentUpload({ onComplete }: { onComplete?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setMessage(null);
    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await api('/api/documents/upload', {
        method: 'POST',
        body: fd
      });
      setMessage({
        type: 'success',
        text: `Successfully ingested "${res.filename}" (${res.chunks} vector chunks indexed).`
      });
      setFile(null);
      if (onComplete) onComplete();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Upload failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ padding: 22, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Upload size={17} color="var(--blue)" />
        <b style={{ fontSize: 15 }}>Upload Business Knowledge Document</b>
      </div>
      <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
        Supported formats: PDF, Scanned Images (PNG, JPG, TIFF via OCR), Word (DOCX), Text, Markdown, CSV, JSON, and HTML.
      </p>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 14 }}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleUpload} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="file"
          className="field"
          style={{ maxWidth: 360, padding: '7px 10px' }}
          accept=".pdf,.docx,.txt,.md,.csv,.json,.html,.png,.jpg,.jpeg,.tiff,.bmp,.webp"
          onChange={e => setFile(e.target.files?.[0] || null)}
        />
        <button className="btn btn-primary" type="submit" disabled={!file || loading}>
          {loading ? (
            <>
              <RefreshCw size={14} className="animate-spin" /> Ingesting & Embedding...
            </>
          ) : (
            <>
              <Upload size={14} /> Upload & Vectorize
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export function WebsiteCrawl({ onComplete }: { onComplete?: () => void }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleCrawl(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      let fullUrl = url.trim();
      if (!/^https?:\/\//i.test(fullUrl)) fullUrl = 'https://' + fullUrl;

      const res = await api('/api/websites/crawl', {
        method: 'POST',
        body: JSON.stringify({ url: fullUrl, max_pages: 15, max_depth: 2 })
      });
      setMessage({
        type: 'success',
        text: `Crawled ${res.pages || 0} pages from ${fullUrl}.`
      });
      setUrl('');
      if (onComplete) onComplete();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Crawl failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ padding: 22, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Globe size={17} color="var(--blue)" />
        <b style={{ fontSize: 15 }}>Crawl Knowledge from Website</b>
      </div>
      <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
        Internal links are automatically traversed, HTML cleaned, and page contents partitioned into semantic vectors.
      </p>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 14 }}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleCrawl} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          className="field"
          style={{ maxWidth: 360 }}
          placeholder="https://docs.yourcompany.com"
          value={url}
          onChange={e => setUrl(e.target.value)}
          required
        />
        <button className="btn btn-primary" type="submit" disabled={!url.trim() || loading}>
          {loading ? (
            <>
              <RefreshCw size={14} className="animate-spin" /> Crawling Pages...
            </>
          ) : (
            <>
              <Globe size={14} /> Crawl & Vectorize
            </>
          )}
        </button>
      </form>
    </div>
  );
}
