import { useState } from 'react';
import { generatePortfolioAnalysis, type PortfolioAnalysis } from '../api/get-portfolio-analysis';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AiAnalysisWidget() {
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<PortfolioAnalysis | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  async function handleGenerate() {
    setError(null);
    setLoading(true);
    try {
      const data = await generatePortfolioAnalysis();
      setResult(data);
      setExpanded(true);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Erreur de génération');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-widget">
      <div className="ai-widget__head">
        <div className="ai-widget__title-row">
          <div className="ai-widget__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10" /><path d="m9 12 2 2 4-4" />
              <path d="M16 2v4" /><path d="M22 2h-4" />
            </svg>
          </div>
          <div>
            <div className="ai-widget__title">Analyse IA — Portefeuille</div>
            <div className="ai-widget__sub">Synthèse exécutive générée par Groq</div>
          </div>
        </div>
        <div className="ai-widget__actions">
          {result && (
            <button
              className="ai-widget__toggle"
              onClick={() => setExpanded(v => !v)}
            >
              {expanded ? '▲ Réduire' : '▼ Afficher'}
            </button>
          )}
          <button
            className="ai-widget__btn"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <><span className="mr-spinner" /> Analyse en cours…</>
            ) : result ? (
              <>↻ Actualiser</>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
                </svg>
                Analyser le portefeuille
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="ai-widget__error">{error}</div>
      )}

      {result && expanded && (
        <div className="ai-widget__body">
          <div className="ai-widget__meta">
            <span>{result.projects_count} chantier{result.projects_count > 1 ? 's' : ''} analysé{result.projects_count > 1 ? 's' : ''}</span>
            <span>Généré le {formatDate(result.generated_at)}</span>
          </div>
          <pre className="ai-widget__output">{result.analysis}</pre>
        </div>
      )}

      {!result && !loading && !error && (
        <div className="ai-widget__empty">
          Cliquez sur "Analyser le portefeuille" pour obtenir une synthèse IA de tous vos chantiers actifs.
        </div>
      )}
    </div>
  );
}
