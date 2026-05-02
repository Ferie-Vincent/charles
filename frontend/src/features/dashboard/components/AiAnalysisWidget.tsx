import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  generatePortfolioAnalysis,
  generateSolutions,
  assignTasks,
  type PortfolioAnalysis,
  type AiAction,
} from '../api/get-portfolio-analysis';
import { getUsers, type AppUser } from '../../users/api/users';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const PRIORITY_LABEL: Record<string, string> = {
  urgent: 'Urgent',
  high:   'Élevée',
  normal: 'Normale',
};

const PRIORITY_CLASS: Record<string, string> = {
  urgent: 'ai-action-priority--urgent',
  high:   'ai-action-priority--high',
  normal: 'ai-action-priority--normal',
};

/* ── Inline markdown renderer ─────────────────────────── */
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('## ')) {
      nodes.push(<h2 key={i} className="ai-md-h2">{renderInline(line.slice(3))}</h2>);
    } else if (line.startsWith('### ')) {
      nodes.push(<h3 key={i} className="ai-md-h3">{renderInline(line.slice(4))}</h3>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="ai-md-list">
          {items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
        </ul>
      );
      continue;
    } else if (line.match(/^\d+\. /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(lines[i].replace(/^\d+\. /, ''));
        i++;
      }
      nodes.push(
        <ol key={`ol-${i}`} className="ai-md-list">
          {items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
        </ol>
      );
      continue;
    } else if (line.trim() === '') {
      // skip
    } else {
      nodes.push(<p key={i} className="ai-md-p">{renderInline(line)}</p>);
    }

    i++;
  }

  return nodes;
}

/* ── Task assign row ──────────────────────────────────── */
function ActionRow({
  action,
  users,
  assignedTo,
  onAssign,
}: {
  action: AiAction;
  users: AppUser[];
  assignedTo: number | null;
  onAssign: (userId: number | null) => void;
}) {
  return (
    <div className="ai-action-row">
      <div className="ai-action-row__left">
        <span className={`ai-action-priority ${PRIORITY_CLASS[action.priority]}`}>
          {PRIORITY_LABEL[action.priority]}
        </span>
        <div className="ai-action-row__content">
          <div className="ai-action-row__title">{action.title}</div>
          {action.detail && <div className="ai-action-row__detail">{action.detail}</div>}
          <div className="ai-action-row__meta">
            {action.role_target && (
              <span className="ai-action-chip">{action.role_target}</span>
            )}
            {action.project_code && (
              <span className="ai-action-chip ai-action-chip--code">{action.project_code}</span>
            )}
          </div>
        </div>
      </div>
      <div className="ai-action-row__assign">
        <select
          className="ai-action-select"
          value={assignedTo ?? ''}
          onChange={e => onAssign(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">— Non assigné</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

/* ── Main widget ──────────────────────────────────────── */
export default function AiAnalysisWidget() {
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState<PortfolioAnalysis | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [expanded, setExpanded]         = useState(true);

  const [solvLoading, setSolvLoading]   = useState(false);
  const [actions, setActions]           = useState<AiAction[] | null>(null);
  const [solvError, setSolvError]       = useState<string | null>(null);
  const [showActions, setShowActions]   = useState(true);

  const [assignments, setAssignments]   = useState<Record<number, number | null>>({});
  const [assigning, setAssigning]       = useState(false);
  const [assigned, setAssigned]         = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: !!actions,
  });

  async function handleGenerate() {
    setError(null);
    setLoading(true);
    setActions(null);
    setAssigned(false);
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

  async function handleSolutions() {
    if (!result) return;
    setSolvError(null);
    setSolvLoading(true);
    setAssigned(false);
    try {
      const data = await generateSolutions(result.analysis);
      setActions(data);
      setAssignments({});
      setShowActions(true);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setSolvError(msg ?? 'Erreur de génération du plan');
    } finally {
      setSolvLoading(false);
    }
  }

  async function handleAssign() {
    if (!actions) return;
    setAssigning(true);
    try {
      await assignTasks(actions.map((a, i) => ({
        title:        a.title,
        detail:       a.detail,
        priority:     a.priority,
        role_target:  a.role_target,
        project_code: a.project_code ?? undefined,
        assigned_to:  assignments[i] ?? null,
        source:       'ai' as const,
      })));
      setAssigned(true);
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="ai-widget">
      {/* Header */}
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
            <button className="ai-widget__toggle" onClick={() => setExpanded(v => !v)}>
              {expanded ? '▲ Réduire' : '▼ Afficher'}
            </button>
          )}
          <button className="ai-widget__btn" onClick={handleGenerate} disabled={loading}>
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

      {error && <div className="ai-widget__error">{error}</div>}

      {/* Diagnostic */}
      {result && expanded && (
        <div className="ai-widget__body">
          <div className="ai-widget__meta">
            <span>{result.projects_count} chantier{result.projects_count > 1 ? 's' : ''} analysé{result.projects_count > 1 ? 's' : ''}</span>
            <span>Généré le {formatDate(result.generated_at)}</span>
          </div>
          <div className="ai-md-output">{renderMarkdown(result.analysis)}</div>

          {/* Solutions CTA */}
          <div className="ai-solutions-cta">
            <button
              className="ai-solutions-btn"
              onClick={handleSolutions}
              disabled={solvLoading}
            >
              {solvLoading ? (
                <><span className="mr-spinner" /> Génération du plan…</>
              ) : actions ? (
                <>↻ Regénérer le plan d'action</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                  </svg>
                  Générer le plan d'action
                </>
              )}
            </button>
            {solvError && <span className="ai-widget__error" style={{ marginTop: 8 }}>{solvError}</span>}
          </div>
        </div>
      )}

      {/* Action plan */}
      {actions && showActions && (
        <div className="ai-actions-panel">
          <div className="ai-actions-panel__head">
            <div>
              <div className="ai-actions-panel__title">Plan d'action — {actions.length} tâches</div>
              <div className="ai-actions-panel__sub">Assignez chaque tâche à un membre de l'équipe</div>
            </div>
            <button className="ai-widget__toggle" onClick={() => setShowActions(v => !v)}>▲ Réduire</button>
          </div>

          <div className="ai-actions-list">
            {actions.map((action, i) => (
              <ActionRow
                key={i}
                action={action}
                users={users}
                assignedTo={assignments[i] ?? null}
                onAssign={userId => setAssignments(prev => ({ ...prev, [i]: userId }))}
              />
            ))}
          </div>

          <div className="ai-actions-panel__footer">
            {assigned ? (
              <div className="ai-assign-success">
                ✓ Tâches créées et assignées
              </div>
            ) : (
              <button
                className="ai-assign-btn"
                onClick={handleAssign}
                disabled={assigning}
              >
                {assigning ? (
                  <><span className="mr-spinner" /> Création en cours…</>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    Assigner les tâches à l'équipe
                  </>
                )}
              </button>
            )}
          </div>
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
