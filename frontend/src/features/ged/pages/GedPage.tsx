import SkeletonPage from '../../../components/ui/SkeletonPage';
import MdViewerModal from '../../../components/ui/MdViewerModal';
import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getDocuments, uploadDocument, deleteDocument, getDocumentUrl,
  GED_TYPES, GED_TYPE_ICON, formatSize,
  type GedDocument,
} from '../api/ged';
import { listProjects } from '../../projects/api/list-projects';
import { useAuth } from '../../auth/stores/auth-store';
import PageHeader from '../../../components/ui/PageHeader';

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

const DOC_TYPES = Object.keys(GED_TYPES) as GedDocument['type'][];

export default function GedPage() {
  const { user } = useAuth();
  const isDirection = ['direction', 'directeur-technique'].includes(user?.role?.name ?? '');

  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter]   = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [search, setSearch]     = useState('');
  const [modal, setModal]       = useState(false);
  const [mdViewer, setMdViewer] = useState<{ docId: number; name: string } | null>(null);
  const [saving, setSaving]     = useState(false);
  const [uploadForm, setUploadForm] = useState<{
    file: File | null; type: GedDocument['type']; project_id: string; name: string; description: string;
  }>({ file: null, type: 'autre', project_id: '', name: '', description: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: docs = [], isLoading: loading } = useQuery({
    queryKey: ['ged-documents', typeFilter, projectFilter, search],
    queryFn: () => {
      const params: Record<string, string | number> = {};
      if (typeFilter)    params.type = typeFilter;
      if (projectFilter) params.project_id = Number(projectFilter);
      if (search.trim()) params.search = search.trim();
      return getDocuments(params);
    },
    staleTime: 30_000,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
    staleTime: 120_000,
  });

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
      queryClient.invalidateQueries({ queryKey: ['ged-documents'] });
    } finally { setSaving(false); }
  };

  const handleOpen = async (doc: GedDocument) => {
    if (doc.mime_type === 'text/markdown' || doc.original_name.endsWith('.md')) {
      setMdViewer({ docId: doc.id, name: doc.name });
    } else {
      const url = await getDocumentUrl(doc.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDelete = async (doc: GedDocument) => {
    await deleteDocument(doc.id);
    queryClient.invalidateQueries({ queryKey: ['ged-documents'] });
  };

  const canDelete = (doc: GedDocument) =>
    isDirection || doc.uploader?.id === user?.id;

  // KPIs — computed from full unfiltered docs list
  const totalSize = docs.reduce((s, d) => s + d.size_bytes, 0);
  const coveredProjects = new Set(docs.map(d => d.project_id).filter(Boolean)).size;
  const thisMonth = new Date();
  const addedThisMonth = docs.filter(d => {
    const c = new Date(d.created_at);
    return c.getMonth() === thisMonth.getMonth() && c.getFullYear() === thisMonth.getFullYear();
  }).length;

  // Comptage par type pour les onglets de filtre
  const typeCounts = DOC_TYPES.reduce<Record<string, number>>((acc, t) => {
    acc[t] = docs.filter(d => d.type === t).length;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Documents GED"
        subtitle="Plans · Contrats · PV · Rapports · Factures · Photos"
        action={
          <button className="btn-primary" onClick={() => setModal(true)}>
            + Ajouter un document
          </button>
        }
      />

      {/* Bandeau KPI */}
      <div className="proj-kpi-row">
        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--blue">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">{docs.length}</div>
            <div className="proj-kpi__label">Documents total</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--teal">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value" style={{ fontSize: 15 }}>{formatSize(totalSize)}</div>
            <div className="proj-kpi__label">Volume stocké</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--green">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">{coveredProjects}</div>
            <div className="proj-kpi__label">Chantiers couverts</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--orange">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">{addedThisMonth}</div>
            <div className="proj-kpi__label">Ajoutés ce mois</div>
          </div>
        </div>
      </div>

      {/* Panneau tableau */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>

        {/* Ligne de barre d'outils */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>

          {/* Recherche */}
          <div className="acct-search-wrap" style={{ flex: 1, minWidth: 200, maxWidth: 320 }}>
            <svg className="acct-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              className="acct-search-input"
              placeholder="Rechercher un document…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="acct-search-clear" onClick={() => setSearch('')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          {/* Filtre projet */}
          <select
            className="form-select"
            style={{ fontSize: '0.84rem', maxWidth: 220 }}
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
          >
            <option value="">Tous les chantiers</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>

          {/* Onglets de filtre par type */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              className={`bud-tab${!typeFilter ? ' bud-tab--active' : ''}`}
              onClick={() => setTypeFilter('')}
            >
              Tous <span className="dqe-filter-count">{docs.length}</span>
            </button>
            {DOC_TYPES.filter(t => typeCounts[t] > 0).map(t => (
              <button
                key={t}
                className={`bud-tab${typeFilter === t ? ' bud-tab--active' : ''}`}
                onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
              >
                {GED_TYPE_ICON[t]} {GED_TYPES[t]} <span className="dqe-filter-count">{typeCounts[t]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tableau */}
        {loading ? (
          <SkeletonPage rows={2} />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Type</th>
                <th>Chantier</th>
                <th>Taille</th>
                <th>Ajouté par</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {docs.length === 0 && (
                <tr>
                  <td colSpan={7} className="acct-empty" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Aucun document {typeFilter ? `de type « ${GED_TYPES[typeFilter]} »` : ''}
                  </td>
                </tr>
              )}
              {docs.map(doc => {
                const tc = TYPE_COLORS[doc.type] ?? '#94a3b8';
                return (
                  <tr key={doc.id}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-body)' }}>
                        {getMimeIcon(doc.mime_type)} {doc.name}
                      </span>
                      {doc.description && (
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{doc.description}</p>
                      )}
                    </td>
                    <td>
                      <span className="badge" style={{ background: `${tc}12`, color: tc, borderColor: `${tc}35` }}>
                        {GED_TYPE_ICON[doc.type]} {GED_TYPES[doc.type]}
                      </span>
                    </td>
                    <td>
                      {doc.project
                        ? <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{doc.project.code}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>
                      }
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{formatSize(doc.size_bytes)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{doc.uploader?.name ?? '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{fmtDate(doc.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modale d'upload */}
      {modal && (
        <div className="mr-modal-overlay" onClick={() => setModal(false)}>
          <div className="mr-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head">
              <h2 className="mr-modal__title">Ajouter un document</h2>
              <button className="mr-modal__close" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="mr-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

              {/* Zone de dépôt de fichier */}
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

      {mdViewer && (
        <MdViewerModal
          docId={mdViewer.docId}
          title={mdViewer.name}
          onClose={() => setMdViewer(null)}
        />
      )}
    </div>
  );
}
