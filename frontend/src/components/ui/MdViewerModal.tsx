import { useState, useEffect, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

type Props = {
  url: string;
  title?: string;
  onClose: () => void;
};

const IFRAME_STYLES = `
  body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; font-size: 13px;
         line-height: 1.75; color: #111828; margin: 0; padding: 8px 12px; }
  h1, h2, h3 { font-weight: 700; margin: 16px 0 6px; }
  h1 { font-size: 18px; } h2 { font-size: 15px; } h3 { font-size: 13px; }
  p { margin: 6px 0; } ul, ol { padding-left: 20px; margin: 6px 0; }
  li { margin: 3px 0; } strong { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 10px 0; }
  th, td { border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; }
  th { background: #f4f6fa; font-weight: 600; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 12px 0; }
`;

export default function MdViewerModal({ url, title = 'Rapport', onClose }: Props) {
  const [rawMd, setRawMd]      = useState<string | null>(null);
  const [loading, setLoading]  = useState(true);
  const [fetchErr, setFetchErr] = useState(false);

  useEffect(() => {
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(); return r.text(); })
      .then(text => { setRawMd(text); setLoading(false); })
      .catch(() => { setFetchErr(true); setLoading(false); });
  }, [url]);

  const srcDoc = useMemo(() => {
    if (!rawMd) return '';
    const body = DOMPurify.sanitize(marked.parse(rawMd) as string);
    return `<!DOCTYPE html><html><head><style>${IFRAME_STYLES}</style></head><body>${body}</body></html>`;
  }, [rawMd]);

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="modal-box"
        style={{ maxWidth: 760, width: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="modal-title" style={{ margin: 0 }}>{title}</h3>
          <button className="btn btn--ghost btn--sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          {loading && <p style={{ color: 'var(--text-subtle)', textAlign: 'center', paddingTop: 20 }}>Chargement…</p>}
          {fetchErr && (
            <p style={{ color: '#ef4444', textAlign: 'center', paddingTop: 20 }}>
              Rapport introuvable — générez-le d'abord via le module Situation IA.
            </p>
          )}
          {srcDoc && (
            <iframe
              srcDoc={srcDoc}
              title="Rapport situation de travaux"
              style={{ width: '100%', height: '100%', border: 'none', minHeight: 400 }}
              sandbox="allow-same-origin"
            />
          )}
        </div>
      </div>
    </div>
  );
}
