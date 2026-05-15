import { useState } from 'react';
import { createPortal } from 'react-dom';
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

function parseTableRow(line: string): string[] {
  return line.split('|').slice(1, -1).map(c => c.trim());
}

function isSeparatorRow(line: string): boolean {
  return /^\|[\s\-:|]+\|/.test(line);
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('### ')) {
      nodes.push(<h3 key={i} className="ai-md-h3">{renderInline(line.slice(4))}</h3>);
    } else if (line.startsWith('## ')) {
      nodes.push(<h2 key={i} className="ai-md-h2">{renderInline(line.slice(3))}</h2>);
    } else if (line.startsWith('# ')) {
      nodes.push(<h2 key={i} className="ai-md-h2">{renderInline(line.slice(2))}</h2>);
    } else if (line.startsWith('|')) {
      // collect entire table block
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i]); i++;
      }
      const headerCols = parseTableRow(tableLines[0]);
      const bodyRows = tableLines.slice(2).filter(l => !isSeparatorRow(l));
      nodes.push(
        <div key={`tbl-${i}`} className="ai-md-table-wrap">
          <table className="ai-md-table">
            <thead>
              <tr>{headerCols.map((c, j) => <th key={j}>{renderInline(c)}</th>)}</tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri}>
                  {parseTableRow(row).map((c, j) => <td key={j}>{renderInline(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2)); i++;
      }
      nodes.push(<ul key={`ul-${i}`} className="ai-md-list">{items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}</ul>);
      continue;
    } else if (line.match(/^\d+\. /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(lines[i].replace(/^\d+\. /, '')); i++;
      }
      nodes.push(<ol key={`ol-${i}`} className="ai-md-list">{items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}</ol>);
      continue;
    } else if (line.trim() !== '') {
      nodes.push(<p key={i} className="ai-md-p">{renderInline(line)}</p>);
    }
    i++;
  }
  return nodes;
}

/* ── Action row ───────────────────────────────────────── */
function ActionRow({ action, users, assignedTo, onAssign }: {
  action: AiAction; users: AppUser[];
  assignedTo: number | null; onAssign: (id: number | null) => void;
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
            {action.role_target && <span className="ai-action-chip">{action.role_target}</span>}
            {action.project_code && <span className="ai-action-chip ai-action-chip--code">{action.project_code}</span>}
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
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
    </div>
  );
}

/* ── Modal ────────────────────────────────────────────── */
function AiModal({
  result, onClose, onRefresh, refreshing, assigned, onAssigned,
}: {
  result: PortfolioAnalysis; onClose: () => void;
  onRefresh: () => void; refreshing: boolean;
  assigned: boolean; onAssigned: () => void;
}) {
  const [solvLoading, setSolvLoading] = useState(false);
  const [actions, setActions]         = useState<AiAction[] | null>(null);
  const [solvError, setSolvError]     = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<number, number | null>>({});
  const [assigning, setAssigning]     = useState(false);
  const [assignKey, setAssignKey]     = useState<string | null>(null);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: !!actions,
  });

  async function handleSolutions() {
    setSolvError(null);
    setSolvLoading(true);
    try {
      const data = await generateSolutions(result.analysis);
      setActions(data);
      setAssignments({});
      setAssignKey(crypto.randomUUID());
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
      await assignTasks(
        actions.map((a, i) => ({
          title: a.title, detail: a.detail, priority: a.priority,
          role_target: a.role_target, project_code: a.project_code ?? undefined,
          assigned_to: assignments[i] ?? null, source: 'ai' as const,
        })),
        assignKey ?? undefined,
      );
      onAssigned();
    } finally {
      setAssigning(false);
    }
  }

  return createPortal(
    <div className="mr-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mr-modal mr-modal--wide" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="mr-modal__head">
          <div className="mr-modal__head-left">
            <p className="mr-modal__title">Analyse IA — Portefeuille</p>
            <p className="mr-modal__sub">
              {result.projects_count} chantier{result.projects_count > 1 ? 's' : ''} · Généré le {formatDate(result.generated_at)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="ai-widget__toggle" onClick={onRefresh} disabled={refreshing}>
              {refreshing ? <><span className="mr-spinner" /> Actualisation…</> : '↻ Actualiser'}
            </button>
            <button className="mr-modal__close" onClick={onClose} aria-label="Fermer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="mr-modal__body">
          {/* Analysis text */}
          <div className="ai-md-output" style={{ marginBottom: 24 }}>
            {renderMarkdown(result.analysis)}
          </div>

          {/* Generate actions CTA */}
          <div className="ai-solutions-cta">
            <button className="ai-solutions-btn" onClick={handleSolutions} disabled={solvLoading}>
              {solvLoading ? (
                <><span className="mr-spinner" /> Génération en cours…</>
              ) : actions ? (
                <>↻ Regénérer les actions</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  Générer les actions à soumettre aux acteurs
                </>
              )}
            </button>
            {solvError && <span className="ai-widget__error" style={{ marginTop: 8 }}>{solvError}</span>}
          </div>

          {/* Action plan */}
          {actions && (
            <div className="ai-actions-panel" style={{ marginTop: 16 }}>
              <div className="ai-actions-panel__head">
                <div>
                  <div className="ai-actions-panel__title">Plan d'action — {actions.length} tâches</div>
                  <div className="ai-actions-panel__sub">Assignez chaque tâche à un membre de l'équipe</div>
                </div>
              </div>
              <div className="ai-actions-list">
                {actions.map((action, i) => (
                  <ActionRow
                    key={i} action={action} users={users}
                    assignedTo={assignments[i] ?? null}
                    onAssign={userId => setAssignments(prev => ({ ...prev, [i]: userId }))}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {actions && (
          <div className="mr-modal__footer">
            {assigned ? (
              <div className="ai-assign-success">✓ Tâches créées et assignées</div>
            ) : (
              <button className="ai-assign-btn" onClick={handleAssign} disabled={assigning || assigned}>
                {assigning ? (
                  <><span className="mr-spinner" /> Création en cours…</>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    Assigner les tâches à l'équipe
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ── Sidebar card (trigger) ───────────────────────────── */
export default function AiAnalysisWidget() {
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<PortfolioAnalysis | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [open, setOpen]         = useState(false);
  const [assigned, setAssigned] = useState(false);

  async function handleGenerate() {
    setError(null);
    setLoading(true);
    setAssigned(false);
    try {
      const data = await generatePortfolioAnalysis();
      setResult(data);
      setOpen(true);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Erreur de génération');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
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
              <button className="ai-widget__toggle" onClick={() => setOpen(true)}>
                Ouvrir →
              </button>
            )}
            <button className="ai-widget__btn" onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <><span className="mr-spinner" /> Analyse…</>
              ) : result ? (
                <>↻</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
                  </svg>
                  Analyser
                </>
              )}
            </button>
          </div>
        </div>

        {error && <div className="ai-widget__error">{error}</div>}

        {result && (
          <div className="ai-widget__preview">
            <span>{result.projects_count} chantier{result.projects_count > 1 ? 's' : ''} analysé{result.projects_count > 1 ? 's' : ''}</span>
            <span>{formatDate(result.generated_at)}</span>
          </div>
        )}
      </div>

      {open && result && (
        <AiModal
          result={result}
          onClose={() => setOpen(false)}
          onRefresh={handleGenerate}
          refreshing={loading}
          assigned={assigned}
          onAssigned={() => setAssigned(true)}
        />
      )}
    </>
  );
}
