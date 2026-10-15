'use client';

import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api, formatDate } from '../../lib/api';
import {
  Globe, Play, RefreshCw, ExternalLink, CheckCircle,
  AlertCircle, Layers, Link as LinkIcon, ShieldAlert,
  Search, Trash2, ArrowUpRight
} from 'lucide-react';

interface KnowledgeSource {
  id: string;
  type: string;
  name: string;
  status: string;
  metadata_?: {
    pages?: number;
    url?: string;
  };
  created_at: string;
}

export default function WebsitesPage() {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Crawler Form
  const [targetUrl, setTargetUrl] = useState('');
  const [maxPages, setMaxPages] = useState(15);
  const [maxDepth, setMaxDepth] = useState(2);
  const [crawling, setCrawling] = useState(false);
  const [crawlStatus, setCrawlStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadWebsites();
  }, []);

  async function loadWebsites() {
    setLoading(true);
    try {
      const data = await api<KnowledgeSource[]>('/api/knowledge/sources');
      setSources((data || []).filter(s => s.type === 'website'));
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCrawl(e: React.FormEvent) {
    e.preventDefault();
    if (!targetUrl.trim()) return;

    setCrawling(true);
    setCrawlStatus(null);
    try {
      let formattedUrl = targetUrl.trim();
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
      }

      const res = await api('/api/websites/crawl', {
        method: 'POST',
        body: JSON.stringify({
          url: formattedUrl,
          max_pages: maxPages,
          max_depth: maxDepth
        })
      });

      setCrawlStatus({
        type: 'success',
        message: `Successfully crawled & vectorized ${res.pages || 0} pages from ${formattedUrl}!`
      });
      setTargetUrl('');
      await loadWebsites();
    } catch (err: any) {
      setCrawlStatus({
        type: 'error',
        message: err.message || 'Crawl failed. Ensure the URL is accessible.'
      });
    } finally {
      setCrawling(false);
    }
  }

  return (
    <Shell>
      <div className="content">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 750, margin: '0 0 5px' }}>Website Sources</h1>
          <p className="muted">
            Transform documentation portals, company sites, and help centers into indexed vector context for your AI Agent.
          </p>
        </div>

        {crawlStatus && (
          <div className={`alert ${crawlStatus.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 20 }}>
            {crawlStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {crawlStatus.message}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.4fr', gap: 20, alignItems: 'start' }}>
          {/* Crawler Config Panel */}
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Globe size={18} color="var(--blue)" />
              <b style={{ fontSize: 15 }}>Launch Web Crawler</b>
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 18 }}>
              Enter your public domain or knowledge base URL. The crawler recursively discovers internal links, strips HTML tags, generates embeddings, and saves chunk metadata.
            </p>

            <form onSubmit={handleCrawl} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">Root URL</label>
                <div style={{ position: 'relative' }}>
                  <LinkIcon size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <input
                    className="field"
                    style={{ paddingLeft: 34 }}
                    placeholder="https://docs.yourcompany.com"
                    value={targetUrl}
                    onChange={e => setTargetUrl(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Max Pages to Ingest</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    className="field"
                    value={maxPages}
                    onChange={e => setMaxPages(Number(e.target.value))}
                  />
                  <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Bounds crawl to avoid rate limits</div>
                </div>
                <div>
                  <label className="label">Crawl Depth</label>
                  <select
                    className="field"
                    value={maxDepth}
                    onChange={e => setMaxDepth(Number(e.target.value))}
                  >
                    <option value={1}>Depth 1 (Direct links)</option>
                    <option value={2}>Depth 2 (Standard)</option>
                    <option value={3}>Depth 3 (Deep crawl)</option>
                  </select>
                  <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Levels of link traversal</div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--line)', fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 10, alignItems: 'center' }}>
                <ShieldAlert size={16} color="var(--blue)" style={{ flexShrink: 0 }} />
                <span>Respects robots.txt directives and internal-domain constraints automatically.</span>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={crawling || !targetUrl.trim()}
                style={{ marginTop: 6 }}
              >
                {crawling ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Crawling & Vectorizing...
                  </>
                ) : (
                  <>
                    <Play size={14} fill="currentColor" />
                    Start Ingestion Crawl
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Crawled Websites List */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <b style={{ fontSize: 14 }}>Indexed Website Domains ({sources.length})</b>
                <div className="muted" style={{ fontSize: 12 }}>Active web knowledge in vector memory</div>
              </div>
              <button className="btn btn-light btn-sm" onClick={loadWebsites}>
                <RefreshCw size={13} />
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Domain / URL</th>
                    <th>Pages</th>
                    <th>Status</th>
                    <th>Last Crawled</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Globe size={14} color="var(--blue)" />
                          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{s.name}</span>
                          <a
                            href={s.metadata_?.url || s.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--muted)' }}
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-purple">
                          {s.metadata_?.pages || 0} pages
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${s.status === 'indexed' ? 'badge-green' : 'badge-orange'}`}>
                          {s.status === 'indexed' ? '✓ Indexed' : s.status}
                        </span>
                      </td>
                      <td className="muted" style={{ fontSize: 12 }}>
                        {formatDate(s.created_at)}
                      </td>
                    </tr>
                  ))}
                  {!loading && sources.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        <div className="empty-state">
                          <div className="empty-state-icon"><Globe size={24} /></div>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>No websites crawled yet</div>
                          <p className="muted" style={{ fontSize: 12.5 }}>
                            Enter a URL on the left to crawl your company knowledge base or documentation.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
