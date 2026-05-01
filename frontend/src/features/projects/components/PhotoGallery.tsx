import { useState, useRef, useEffect } from 'react';
import { getPhotos, uploadPhoto, deletePhoto, type ProjectPhoto } from '../api/get-photos';
import PhotoComparator from './PhotoComparator';

const TAGS = [
  { value: '',           label: 'Toutes' },
  { value: 'fondation',  label: 'Fondation' },
  { value: 'gros-oeuvre',label: 'Gros œuvre' },
  { value: 'charpente',  label: 'Charpente' },
  { value: 'finition',   label: 'Finition' },
  { value: 'installation', label: 'Installation' },
  { value: 'incident',   label: 'Incident' },
  { value: 'autre',      label: 'Autre' },
];

type LightboxProps = { photo: ProjectPhoto; onClose: () => void; onDelete: () => void };

function Lightbox({ photo, onClose, onDelete }: LightboxProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="pg-lightbox" onClick={onClose}>
      <div className="pg-lightbox__inner" onClick={e => e.stopPropagation()}>
        <button className="pg-lightbox__close" onClick={onClose}>×</button>
        <img src={photo.url} alt={photo.caption ?? ''} className="pg-lightbox__img" />
        <div className="pg-lightbox__meta">
          {photo.tag && <span className="pg-tag">{photo.tag}</span>}
          {photo.caption && <p className="pg-lightbox__caption">{photo.caption}</p>}
          <div className="pg-lightbox__info">
            {photo.taken_at && <span>📅 {new Date(photo.taken_at).toLocaleDateString('fr-FR')}</span>}
            {photo.uploaded_by && <span>👤 {photo.uploaded_by}</span>}
          </div>
          <button className="pg-lightbox__delete" onClick={onDelete}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

type Props = { projectId: number };

export default function PhotoGallery({ projectId }: Props) {
  const [photos, setPhotos]       = useState<ProjectPhoto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTag, setActiveTag] = useState('');
  const [lightbox, setLightbox]   = useState<ProjectPhoto | null>(null);
  const [dragOver, setDragOver]   = useState(false);
  const [caption, setCaption]     = useState('');
  const [tag, setTag]             = useState('');
  const [takenAt, setTakenAt]     = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [compareMode, setCompareMode]   = useState(false);
  const [selected, setSelected]         = useState<ProjectPhoto[]>([]);
  const [comparator, setComparator]     = useState<{ before: ProjectPhoto; after: ProjectPhoto } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getPhotos(projectId).then(setPhotos).finally(() => setLoading(false));
  }, [projectId]);

  const filtered = activeTag ? photos.filter(p => p.tag === activeTag) : photos;

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setPendingFile(files[0]);
    setTakenAt(new Date().toISOString().split('T')[0]);
  }

  async function handleUpload() {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const photo = await uploadPhoto(projectId, pendingFile, { caption: caption || undefined, tag: tag || undefined, taken_at: takenAt || undefined });
      setPhotos(prev => [photo, ...prev]);
      setPendingFile(null);
      setCaption(''); setTag(''); setTakenAt('');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(photo: ProjectPhoto) {
    if (!confirm(`Supprimer cette photo ?`)) return;
    await deletePhoto(projectId, photo.id);
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
    setLightbox(null);
  }

  return (
    <div className="pg-wrap">
      {/* Upload zone */}
      <div
        className={`pg-upload ${dragOver ? 'pg-upload--drag' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => !pendingFile && fileRef.current?.click()}
      >
        <input
          ref={fileRef} type="file" accept="image/*" className="pg-upload__input"
          onChange={e => handleFiles(e.target.files)}
        />
        {!pendingFile ? (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="28" height="28" style={{ color: 'var(--text-muted)' }}>
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            <span className="pg-upload__label">Glisser une photo ou <u>parcourir</u></span>
            <span className="pg-upload__hint">JPG, PNG, WEBP — max 10 Mo</span>
          </>
        ) : (
          <div className="pg-upload__preview" onClick={e => e.stopPropagation()}>
            <img src={URL.createObjectURL(pendingFile)} alt="" className="pg-upload__thumb" />
            <div className="pg-upload__form">
              <input
                className="pg-input" placeholder="Légende (optionnel)"
                value={caption} onChange={e => setCaption(e.target.value)}
              />
              <select className="pg-input" value={tag} onChange={e => setTag(e.target.value)}>
                <option value="">— Phase / tag —</option>
                {TAGS.slice(1).map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input
                className="pg-input" type="date"
                value={takenAt} onChange={e => setTakenAt(e.target.value)}
              />
              <div className="pg-upload__btns">
                <button className="pg-btn pg-btn--primary" onClick={handleUpload} disabled={uploading}>
                  {uploading ? 'Envoi…' : 'Enregistrer'}
                </button>
                <button className="pg-btn" onClick={() => { setPendingFile(null); setCaption(''); setTag(''); }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tag filter + compare toggle */}
      {photos.length > 0 && (
        <div className="pg-toolbar">
          <div className="pg-filter">
            {TAGS.map(t => (
              <button
                key={t.value}
                className={`pg-filter-btn ${activeTag === t.value ? 'pg-filter-btn--active' : ''}`}
                onClick={() => { setActiveTag(t.value); if (compareMode) { setSelected([]); } }}
              >
                {t.label}
                {t.value === '' && <span className="pg-filter-count">{photos.length}</span>}
                {t.value !== '' && <span className="pg-filter-count">{photos.filter(p => p.tag === t.value).length}</span>}
              </button>
            ))}
          </div>
          {photos.length >= 2 && (
            <button
              className={`pg-btn pg-btn--compare ${compareMode ? 'pg-btn--compare-active' : ''}`}
              onClick={() => { setCompareMode(v => !v); setSelected([]); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
              </svg>
              {compareMode ? 'Annuler' : 'Comparer'}
            </button>
          )}
        </div>
      )}

      {/* Compare instructions */}
      {compareMode && (
        <div className="pg-compare-hint">
          {selected.length === 0 && 'Sélectionnez la photo Avant…'}
          {selected.length === 1 && 'Maintenant sélectionnez la photo Après…'}
          {selected.length === 2 && (
            <button
              className="pg-btn pg-btn--primary"
              onClick={() => setComparator({ before: selected[0], after: selected[1] })}
            >
              Lancer la comparaison →
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <p className="pg-empty">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="pg-empty">{photos.length === 0 ? 'Aucune photo — ajoutez la première.' : 'Aucune photo pour ce tag.'}</p>
      ) : (
        <div className="pg-grid">
          {filtered.map(photo => {
            const selIdx = selected.findIndex(p => p.id === photo.id);
            const isSel = selIdx !== -1;
            return (
              <div
                key={photo.id}
                className={`pg-card ${compareMode ? 'pg-card--selectable' : ''} ${isSel ? 'pg-card--selected' : ''}`}
                onClick={() => {
                  if (!compareMode) { setLightbox(photo); return; }
                  if (isSel) { setSelected(prev => prev.filter(p => p.id !== photo.id)); return; }
                  if (selected.length < 2) setSelected(prev => [...prev, photo]);
                }}
              >
                <img src={photo.url} alt={photo.caption ?? ''} className="pg-card__img" loading="lazy" />
                {compareMode && isSel && (
                  <div className="pg-card__sel-badge">{selIdx === 0 ? 'AVANT' : 'APRÈS'}</div>
                )}
                <div className="pg-card__overlay">
                  {photo.tag && <span className="pg-tag">{photo.tag}</span>}
                  {photo.caption && <span className="pg-card__caption">{photo.caption}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lightbox && !compareMode && (
        <Lightbox
          photo={lightbox}
          onClose={() => setLightbox(null)}
          onDelete={() => handleDelete(lightbox)}
        />
      )}

      {comparator && (
        <PhotoComparator
          before={comparator.before}
          after={comparator.after}
          onClose={() => { setComparator(null); setCompareMode(false); setSelected([]); }}
        />
      )}
    </div>
  );
}
