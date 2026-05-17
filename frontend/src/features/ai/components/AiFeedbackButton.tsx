import { useState } from 'react';
import { submitAiFeedback, type AiFeedbackPayload } from '../api/ai';

type Props = {
  feature: string;
  projectId?: number;
  aiOutputExcerpt?: Record<string, unknown>;
  modelUsed?: string;
};

export default function AiFeedbackButton({ feature, projectId, aiOutputExcerpt, modelUsed }: Props) {
  const [sent, setSent] = useState<'positive' | 'negative' | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(rating: 'positive' | 'negative') {
    if (sent || loading) return;
    setLoading(true);
    const payload: AiFeedbackPayload = {
      feature,
      rating,
      project_id: projectId,
      ai_output_excerpt: aiOutputExcerpt,
      model_used: modelUsed ?? 'mistral-small-latest',
    };
    try {
      await submitAiFeedback(payload);
      setSent(rating);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-feedback">
      <span className="ai-feedback__label">
        {sent ? (sent === 'positive' ? 'Merci !' : 'Noté, merci.') : 'Utile ?'}
      </span>
      {!sent && (
        <>
          <button
            className="ai-feedback__btn ai-feedback__btn--pos"
            onClick={() => submit('positive')}
            disabled={loading}
            title="Oui, utile"
            aria-label="Retour positif"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z"/>
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
          </button>
          <button
            className="ai-feedback__btn ai-feedback__btn--neg"
            onClick={() => submit('negative')}
            disabled={loading}
            title="Non, pas utile"
            aria-label="Retour négatif"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3z"/>
              <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
