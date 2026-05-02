import { useEffect, useRef, useState } from 'react';
import {
  getDocuments, uploadDocument, deleteDocument, getDocumentUrl,
  GED_TYPES, GED_TYPE_ICON, formatSize,
  type GedDocument,
} from '../api/ged';
import { listProjects } from '../../projects/api/list-projects';
import type { Project } from '../../projects/types';
import { useAuth } from '../../auth/stores/auth-store';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

const TYPE_COLORS: Record<string, string> = {
  plan:    '#3b7ddd',
  contrat: '#8b5cf6',
  pv:      '#10b981',
  rapport: '#f59e0b',
  facture: '#ef4444',
  photo:   '#06b6d4',
  autre:   '#94a3b8',
};

function getMimeIcon(mime: string): string {
  if (mime.includes('pdf'))   return '📕';
  if (mime.includes('image')) return '🖼️';
  if (mime.includes('word') || mime.includes('document')) return '📝';
  if (mime.includes('sheet') || mime.includes('excel'))   return '📊';
  if (mime.includes('zip') || mime.includes('rar'))       return '🗜️';
  return '📄';
}

export default function GedPage() {
  const { user } = useAuth();
  const isDirection = ['direction', 'directeur-technique'].includes(user?.role?.name ?? '');

  const [docs, setDocs]         = useState<GedDocument[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [typeFilter, setTypeFilter]   = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [search, setSearch]     = useState('');
  const [modal, setModal]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [uploadForm, setUploadForm] = useState<{
    file: File | null; type: GedDocument['type']; project_id: string; name: string; description: string;
  }>({ file: null, type: 'autre', project_id: '', name: '', description: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    const params: Record<string, string | number> = {};
    if (typeFilter)    params.type = typeFilter;
    if (projectFilter) params.project_id = Number(projectFilter);
    if (search.trim()) params.search = search.trim();

    Promise.all([getDocuments(params), listProjects()])
      .then(([d, p]) => { setDocs(d); setProjects(p); })
      .finally(() => setLoading(false));
  };

  useEffect(load, [typeFilter, projectFilter, search]);

  const handleUpload = async () => {
    if (!uploadForm.file) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('file', uploadForm.file);
      fd.append('type', uploadForm.type);
      if (uploadForm.project_id) fd.append('project_id', uploadForm.project_id);
      if (uploadForm.name.trim()) fd.append('name', uploadForm.name.trim());
      if (uploadForm.description.trim()) fd.append('description', uploadForm.description.trim());
      await uploadDocument(fd);
      setModal(false);
      setUploadForm({ file: null, type: 'autre', project_id: '', name: '', description: '' });
      load();
    } finally { setSaving(false); }
  };

  const handleOpen = async (doc: GedDocument) => {
    const url = await getDocumentUrl(doc.id);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = async (doc: GedDocument) => {
    await deleteDocument(doc.id);
    load();
  };

  const canDelete = (doc: GedDocument) =>
    isDirection || doc.uploader?.id === user?.id;

  // KPIs
  const totalSize = docs.reduce((s, d) => s + d.size_bytes, 0);
  const byType = Object.entries(GED_TYPES).map(([k]) => ({ type: k, count: docs.filter(d => d.type === k).length })).filter(x => x.count > 0);

  return (
    <div className="ged-page">

      <div className="ged-header">
        <div>
          <p className="ged-header__label">GESTION DOCUMENTAIRE</p>
          <h1 className="ged-header__title">Documents Chantier</h1>
          <p className="ged-header__sub">Plans · Contrats · PV · Rapports · Factures</p>
        </div>
        <button className="btn btn--primary" onClick={() => setModal(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Ajouter un document
        </button>
      </div>

      {/* KPI row */}
      <div className="ged-kpi-row">
        <div className="ged-kpi">
          <span className="ged-kpi__val">{docs.length}</span>
          <span className="ged-kpi__lbl">Documents total</span>
        </div>
        <div className="ged-kpi">
          <span className="ged-kpi__val">{formatSize(totalSize)}</span>
          <span className="ged-kpi__lbl">Volume stocké</span>
        </div>
        <div className="ged-kpi">
          <span className="ged-kpi__val">{new Set(docs.map(d => d.project_id).filter(Boolean)).size}</span>
          <span className="ged-kpi__lbl">Chantiers couverts</span>
        </div>
        <div className="ged-kpi">
          <span className="ged-kpi__val">{docs.filter(d => { const t = new Date(); const c = new Date(d.created_at); return c.getMonth() === t.getMonth() && c.getFullYear() === t.getFullYear(); }).length}</span>
          <span className="ged-kpi__lbl">Ajoutés ce mois</span>
        </div>
      </div>

      {/* Filters */}
      <div className="ged-filters">
        <input className="form-input" style={{ maxWidth: 260, fontSize: '0.84rem' }} placeholder="Rechercher un document…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-select" style={{ maxWidth: 200, fontSize: '0.84rem' }} value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
          <option value="">Tous les chantiers</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
        </select>
        <div className="ged-type-filters">
          <button className={`dqe-filter-btn ${!typeFilter ? 'dqe-filter-btn--active' : ''}`} onClick={() => setTypeFilter('')}>
            Tous <span className="dqe-filter-count">{docs.length}</span>
          </button>
          {byType.map(({ type, count }) => (
            <button key={type} className={`dqe-filter-btn ${typeFilter === type ? 'dqe-filter-btn--active' : ''}`} onClick={() => setTypeFilter(type)}>
              {GED_TYPE_ICON[type]} {GED_TYPES[type]} <span className="dqe-filter-count">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Documents grid */}
      {loading ? (
        <p style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</p>
      ) : docs.length === 0 ? (
        <div className="ged-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="48" height="48"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <p>Aucun document {typeFilter ? `de type « ${GED_TYPES[typeFilter]} »` : ''}</p>
          <button className="btn btn--secondary btn--sm" onClick={() => setModal(true)}>Ajouter le premier</button>
        </div>
      ) : (
        <div className="ged-grid">
          {docs.map(doc => {
            const tc = TYPE_COLORS[doc.type] ?? '#94a3b8';
            return (
              <div key={doc.id} className="ged-card">
                <div className="ged-card__top">
                  <div className="ged-card__icon" style={{ background: `${tc}15`, color: tc }}>
                    {getMimeIcon(doc.mime_type)}
                  </div>
                  <span className="ged-card__type-badge" style={{ background: `${tc}15`, color: tc }}>
                    {GED_TYPES[doc.type]}
                  </span>
                </div>
                <div className="ged-card__body">
                  <p className="ged-card__name" title={doc.name}>{doc.name}</p>
                  {doc.description && <p className="ged-card__desc">{doc.description}</p>}
                  <div className="ged-card__meta">
                    {doc.project && <span className="ged-card__project">{doc.project.code}</span>}
                    <span>{formatSize(doc.size_bytes)}</span>
                    <span>{fmtDate(doc.created_at)}</span>
                  </div>
                  <p className="ged-card__uploader">par {doc.uploader?.name ?? '—'}</p>
                </div>
                <div className="ged-card__actions">
                  <button className="btn btn--sm btn--secondary" onClick={() => handleOpen(doc)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    Ouvrir
                  </button>
                  <a
                    href={`${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}/api/ged/${doc.id}/download`}
                    download={doc.original_name}
                    className="btn btn--sm btn--secondary"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    DL
                  </a>
                  {canDelete(doc) && (
                    <button className="btn-icon btn-icon--delete" onClick={() => handleDelete(doc)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload modal */}
      {modal && (
        <div className="mr-modal-overlay" onClick={() => setModal(false)}>
          <div className="mr-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head">
              <h2 className="mr-modal__title">Ajouter un document</h2>
              <button className="mr-modal__close" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="mr-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

              {/* File drop zone */}
              <div className="form-field">
                <label className="form-label">Fichier *</label>
                <div className="bdc-file-drop" onClick={() => fileInputRef.current?.click()}>
                  {uploadForm.file ? (
                    <div className="bdc-file-chip">
                      <span>{getMimeIcon(uploadForm.file.type)}</span>
                      <span>{uploadForm.file.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({formatSize(uploadForm.file.size)})</span>
                      <button type="button" onClick={e => { e.stopPropagation(); setUploadForm(f => ({ ...f, file: null })); }}>✕</button>
                    </div>
                  ) : (
                    <span className="bdc-file-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      Cliquer pour sélectionner (PDF, images, Word, Excel — max 50 Mo)
                    </span>
                  )}
                </div>
                <input ref={fileInputRef} type="file" style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.zip,.rar"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setUploadForm(u => ({
                        ...u,
                        file: f,
                        name: u.name || f.name.replace(/\.[^/.]+$/, ''),
                      }));
                    }
                    e.target.value = '';
                  }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-field">
                  <label className="form-label">Type *</label>
                  <select className="form-select" value={uploadForm.type} onChange={e => setUploadForm(f => ({ ...f, type: e.target.value as GedDocument['type'] }))}>
                    {Object.entries(GED_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{GED_TYPE_ICON[k]} {v}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Chantier</label>
                  <select className="form-select" value={uploadForm.project_id} onChange={e => setUploadForm(f => ({ ...f, project_id: e.target.value }))}>
                    <option value="">— Global —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Nom du document</label>
                <input className="form-input" value={uploadForm.name} onChange={e => setUploadForm(f => ({ ...f, name: e.target.value }))} placeholder="Laisser vide = nom du fichier" />
              </div>

              <div className="form-field">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" rows={2} value={uploadForm.description} onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))} placeholder="Contexte, version, date de validité…" />
              </div>
            </div>
            <div className="mr-modal__actions">
              <button className="btn btn--secondary" onClick={() => setModal(false)}>Annuler</button>
              <button className="btn btn--primary" onClick={handleUpload} disabled={saving || !uploadForm.file}>
                {saving ? 'Upload…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
