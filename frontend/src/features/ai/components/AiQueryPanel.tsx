import { useState, useRef } from 'react';
import { api } from '../../../lib/api';
import { useAiEnabled } from '../hooks/useAiEnabled';
import AiFeedbackButton from './AiFeedbackButton';
import AiMarkdown from './AiMarkdown';

type QueryResult = {
  answer: string | null;
  sources: { label: string; data: string }[];
  model: string | null;
  sufficient: boolean;
  message?: string;
};

type Props = {
  projectId?: number;
  placeholder?: string;
};

export default function AiQueryPanel({ projectId, placeholder = 'Ex : Quel est l\'avancement global ? Y a-t-il des retards critiques ?' }: Props) {
  const { enabled } = useAiEnabled();
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!enabled) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.post('/ai/query', {
        question: question.trim(),
        ...(projectId ? { project_id: projectId } : {}),
      });
      setResult(res.data);
    } catch {
      setError('Erreur lors de la requête IA.');
    } finally {
      setLoading(false);
    }
  }

  const suggestions = [
    'Quels chantiers ont du retard ?',
    'Quel est le budget consommé ?',
    'Y a-t-il des incidents critiques ?',
  ];

  return (
    <div className="ai-query-panel">
      <div className="ai-query-panel__header">
        <span className="ai-briefing__badge">IA</span>
        <span className="ai-query-panel__title">Assistant chantier</span>
        <span className="ai-query-panel__subtitle">Questions sur vos données</span>
      </div>

      <form className="ai-query-panel__form" onSubmit={submit}>
        <input
          ref={inputRef}
          className="ai-query-panel__input"
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder={placeholder}
          maxLength={500}
          disabled={loading}
        />
        <button
          type="submit"
          className="ai-query-panel__btn"
          disabled={!question.trim() || loading}
        >
          {loading ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          )}
        </button>
      </form>

      {!result && !loading && (
        <div className="ai-query-panel__suggestions">
          {suggestions.map(s => (
            <button
              key={s}
              className="ai-query-panel__suggestion"
              onClick={() => { setQuestion(s); inputRef.current?.focus(); }}
              type="button"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <p className="ai-query-panel__error">{error}</p>}

      {result && (
        <div className="ai-query-panel__result">
          {!result.sufficient ? (
            <p className="ai-query-panel__insufficient">{result.message}</p>
          ) : (
            <>
              <AiMarkdown text={result.answer ?? ''} />

              {result.sources.length > 0 && (
                <div className="ai-briefing__sources" style={{ marginTop: 10 }}>
                  <span className="ai-briefing__sources-label">Sources :</span>
                  {result.sources.map((s, i) => (
                    <span key={i} className="ai-briefing__source" title={s.data}>{s.label}</span>
                  ))}
                </div>
              )}

              <div className="ai-briefing__footer" style={{ marginTop: 10, paddingTop: 8 }}>
                <span className="ai-briefing__model">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
                  Mistral AI
                </span>
                <AiFeedbackButton
                  feature="rag_query"
                  projectId={projectId}
                  aiOutputExcerpt={{ question, answer: result.answer?.substring(0, 200) }}
                  modelUsed={result.model ?? undefined}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
