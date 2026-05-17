import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAiBriefing } from '../api/ai';
import { useAiEnabled } from '../hooks/useAiEnabled';
import AiFeedbackButton from './AiFeedbackButton';
import AiMarkdown from './AiMarkdown';

export default function AiMorningBriefing({ alwaysExpanded = false }: { alwaysExpanded?: boolean }) {
  const { enabled } = useAiEnabled();
  const [expanded, setExpanded] = useState(true);

  if (!enabled) return null;

  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-briefing'],
    queryFn: getAiBriefing,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="ai-briefing ai-briefing--loading">
        <div className="ai-briefing__header">
          <span className="ai-briefing__badge">IA</span>
          <span className="ai-briefing__title">Briefing matinal</span>
          <div className="ai-briefing__skeleton" />
        </div>
      </div>
    );
  }

  if (error || !data) return null;

  if (!data.sufficient) {
    return (
      <div className="ai-briefing ai-briefing--empty">
        <div className="ai-briefing__header">
          <span className="ai-briefing__badge">IA</span>
          <span className="ai-briefing__title">Briefing matinal</span>
        </div>
        <p className="ai-briefing__empty-msg">{data.message}</p>
      </div>
    );
  }

  return (
    <div className="ai-briefing">
      <div
        className="ai-briefing__header"
        onClick={() => !alwaysExpanded && setExpanded(e => !e)}
        style={{ cursor: alwaysExpanded ? 'default' : 'pointer' }}
      >
        <span className="ai-briefing__badge">IA</span>
        <span className="ai-briefing__title">Briefing matinal</span>
        {data.data_date && (
          <span className="ai-briefing__date">
            Données du {new Date(data.data_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </span>
        )}
        {!alwaysExpanded && (
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            style={{ marginLeft: 'auto', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </div>

      {(expanded || alwaysExpanded) && (
        <>
          <AiMarkdown text={data.text ?? ''} />

          <div className="ai-briefing__footer">
            <span className="ai-briefing__model">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" />
              </svg>
              Mistral AI
            </span>
            <AiFeedbackButton
              feature="briefing"
              aiOutputExcerpt={{ text: data.text?.substring(0, 200) }}
              modelUsed={data.model ?? undefined}
            />
          </div>
        </>
      )}
    </div>
  );
}
