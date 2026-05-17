import { useState, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useQuery } from '@tanstack/react-query';
import {
  getDqeVersionOptions,
  generateSituation,
  type SituationResult,
} from '../api/generate-situation';

type Props = { projectId: number; onClose: () => void };

function fmtHT(n: number) {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA';
}

const today = new Date();
const defaultPeriode = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

export default function SituationTravauxModal({ projectId, onClose }: Props) {
  const [periode, setPeriode]     = useState(defaultPeriode);
  const [versionId, setVersionId] = useState<number | undefined>();
  const [avancement, setAvancement] = useState<number | undefined>();
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<SituationResult | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [copied, setCopied]       = useState(false);
  const renderedHtml = useMemo(
    () => result ? DOMPurify.sanitize(marked.parse(result.situation) as string) : '',
    [result],
  );

  const { data: versions = [] } = useQuery({
    queryKey: ['situation-versions', projectId],
    queryFn: () => getDqeVersionOptions(projectId),
  });

  async function handleGenerate() {
    setError(null);
    setLoading(true);
    try {
      const res = await generateSituation(projectId, {
        periode,
        dqe_version_id: versionId,
        avancement,
      });
      setResult(res);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? (e instanceof Error ? e.message : 'Erreur de génération'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.situation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mr-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mr-modal st-modal">
        <div className="mr-modal__head">
          <div>
            <h2 className="mr-modal__title">Situation de Travaux</h2>
            <p className="mr-modal__sub">Génération automatique par IA à partir du DQE</p>
          </div>
          <button className="mr-modal__close" aria-label="Fermer" onClick={onClose}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>

        {!result ? (
          <div className="mr-modal__body">
            <div className="st-form-grid">
              {/* Période */}
              <div className="mr-field">
                <label className="mr-label">Période *</label>
                <input
                  type="month"
                  className="mr-input"
                  value={periode}
                  onChange={e => setPeriode(e.target.value)}
                />
              </div>

              {/* Version DQE */}
              <div className="mr-field">
                <label className="mr-label">Version DQE</label>
                <select
                  className="mr-input"
                  value={versionId ?? ''}
                  onChange={e => setVersionId(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">Dernière version validée</option>
                  {versions.map(v => (
                    <option key={v.id} value={v.id}>
                      v{v.version_number} — {v.name} ({fmtHT(v.total_ht)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Avancement override */}
              <div className="mr-field">
                <label className="mr-label">Avancement réel (%)</label>
                <input
                  type="number"
                  className="mr-input"
                  min={0} max={100} step={1}
                  placeholder="Tiré du journal si vide"
                  value={avancement ?? ''}
                  onChange={e => setAvancement(e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
            </div>

            {/* Info banner */}
            <div className="st-info-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
              </svg>
              L'IA génère automatiquement la situation à partir du DQE validé, de l'avancement journal et des données financières.
            </div>

            {error && <p className="mr-error">{error}</p>}

            <div className="mr-modal__footer">
              <button className="btn-ghost" onClick={onClose}>Annuler</button>
              <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
                {loading ? (
                  <><span className="mr-spinner" /> Génération en cours…</>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                    Générer la situation
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="mr-modal__body">
            <div className="st-result-meta">
              <span className="st-meta-tag">DQE : {result.dqe_version}</span>
              <span className="st-meta-tag">Avancement : {result.avancement}%</span>
              <span className="st-meta-tag">Marché : {fmtHT(result.total_ht)}</span>
            </div>
            <div className="mr-output st-output">
              <div className="mr-markdown-rendered" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
            </div>
            <div className="mr-modal__footer">
              <button className="btn-ghost" onClick={() => setResult(null)}>← Modifier</button>
              <button className="btn-ghost" onClick={handleCopy}>
                {copied ? '✓ Copié !' : 'Copier le Markdown'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
