import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
  getDocumentUrl,
  formatSize,
  GED_TYPE_COLOR,
  GED_TYPES,
  type GedDocument,
} from '../api/ged';

const INITIATION_TYPES = ['ao', 'os', 'marche', 'contrat', 'plan'] as const;
const ALL_PROJECT_TYPES = ['ao', 'os', 'marche', 'contrat', 'plan', 'pv', 'rapport', 'facture', 'photo', 'autre'] as const;

function DocTypeBadge({ type }: { type: string }) {
  const colors = GED_TYPE_COLOR[type] ?? { bg: '#f1f5f9', color: '#475569' };
  return (
    <span className="pdoc-badge" style={{ background: colors.bg, color: colors.color }}>
      {GED_TYPES[type] ?? type}
    </span>
  );
}

function EmptyState({ onUploadClick }: { onUploadClick: () => void }) {
  return (
    <div className="pdoc-empty">
      <div className="pdoc-empty__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="36" height="36">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
      </div>
      <p className="pdoc-empty__title">Aucun document d'initialisation</p>
      <p className="pdoc-empty__sub">
        Ajoutez l'appel d'offres, l'ordre de service, le marché ou le contrat ayant permis de lancer ce chantier.
      </p>
      <div className="pdoc-empty__chips">
        {INITIATION_TYPES.map(t => (
          <span key={t} className="pdoc-empty__chip" style={{ background: GED_TYPE_COLOR[t].bg, color: GED_TYPE_COLOR[t].color }}>
            {GED_TYPES[t]}
          </span>
        ))}
      </div>
      <button className="btn-primary pdoc-empty__cta" onClick={onUploadClick}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        Ajouter un document
      </button>
    </div>
  );
}

interface UploadFormProps {
  projectId: number;
  onDone: () => void;
}

function UploadForm({ projectId, onDone }: UploadFormProps) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<string>('ao');
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const { mutate, isPending, error } = useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-docs', projectId] });
      onDone();
    },
  });

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    fd.append('project_id', String(projectId));
    if (name.trim()) fd.append('name', name.trim());
    mutate(fd);
  }

  return (
    <form className="pdoc-upload-form" onSubmit={handleSubmit}>
      <div
        className={`pdoc-drop-zone${dragOver ? ' pdoc-drop-zone--over' : ''}${file ? ' pdoc-drop-zone--filled' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        {file ? (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span className="pdoc-drop-zone__name">{file.name}</span>
            <span className="pdoc-drop-zone__size">{formatSize(file.size)}</span>
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span>Glisser-déposer ou <strong>cliquer</strong></span>
            <span className="pdoc-drop-zone__hint">PDF, Word, image — max 50 Mo</span>
          </>
        )}
      </div>
      <input ref={fileRef} type="file" hidden onChange={e => setFile(e.target.files?.[0] ?? null)} />

      <div className="pdoc-upload-form__row">
        <div className="pdoc-upload-form__field">
          <label className="form-label">Type de document</label>
          <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
            {ALL_PROJECT_TYPES.map(t => (
              <option key={t} value={t}>{GED_TYPES[t]}</option>
            ))}
          </select>
        </div>
        <div className="pdoc-upload-form__field pdoc-upload-form__field--grow">
          <label className="form-label">Nom (optionnel)</label>
          <input
            className="form-input"
            placeholder="Nom du fichier (laissé vide = nom original)"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="form-error">{(error as Error).message}</p>}

      <div className="pdoc-upload-form__actions">
        <button type="button" className="btn-secondary" onClick={onDone}>Annuler</button>
        <button type="submit" className="btn-primary" disabled={!file || isPending}>
          {isPending ? 'Envoi…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}

interface Props {
  projectId: number;
}

export default function ProjectDocumentsPanel({ projectId }: Props) {
  const qc = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: docs = [], isLoading } = useQuery<GedDocument[]>({
    queryKey: ['project-docs', projectId],
    queryFn: () => getDocuments({ project_id: projectId }),
    staleTime: 60_000,
  });

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => deleteDocument(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-docs', projectId] });
      setDeletingId(null);
    },
  });

  async function handleOpen(doc: GedDocument) {
    const url = await getDocumentUrl(doc.id);
    window.open(url, '_blank', 'noreferrer');
  }

  if (isLoading) return <div className="skeleton" style={{ height: 80, borderRadius: 8 }} />;

  return (
    <div className="pdoc-panel">
      <div className="pdoc-panel__header">
        <span className="pdoc-panel__count">
          {docs.length > 0 ? `${docs.length} document${docs.length > 1 ? 's' : ''}` : 'Aucun document'}
        </span>
        {!showUpload && (
          <button className="btn-primary pdoc-panel__add-btn" onClick={() => setShowUpload(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Ajouter
          </button>
        )}
      </div>

      {showUpload && (
        <UploadForm projectId={projectId} onDone={() => setShowUpload(false)} />
      )}

      {!showUpload && docs.length === 0 && (
        <EmptyState onUploadClick={() => setShowUpload(true)} />
      )}

      {docs.length > 0 && (
        <div className="pdoc-list">
          {docs.map(doc => (
            <div key={doc.id} className="pdoc-item">
              <div className="pdoc-item__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div className="pdoc-item__body">
                <button
                  className="pdoc-item__name"
                  onClick={() => handleOpen(doc)}
                  title="Ouvrir le document"
                >
                  {doc.name}
                </button>
                <div className="pdoc-item__meta">
                  <DocTypeBadge type={doc.type} />
                  <span className="pdoc-item__size">{formatSize(doc.size_bytes)}</span>
                  {doc.uploader && <span className="pdoc-item__uploader">· {doc.uploader.name}</span>}
                  <span className="pdoc-item__date">
                    · {new Date(doc.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <div className="pdoc-item__actions">
                <button
                  className="pdoc-item__dl-btn"
                  onClick={() => handleOpen(doc)}
                  aria-label="Ouvrir"
                  title="Ouvrir"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </button>
                {deletingId === doc.id ? (
                  <div className="pdoc-item__confirm-del">
                    <span>Supprimer ?</span>
                    <button className="pdoc-item__del-confirm-yes" onClick={() => del(doc.id)}>Oui</button>
                    <button className="pdoc-item__del-confirm-no" onClick={() => setDeletingId(null)}>Non</button>
                  </div>
                ) : (
                  <button
                    className="pdoc-item__del-btn"
                    onClick={() => setDeletingId(doc.id)}
                    aria-label="Supprimer"
                    title="Supprimer"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6"/><path d="M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
