import { useState } from 'react';
import { generateMeetingReport, type ActionItem } from '../api/generate-meeting-report';

type Props = { projectId: number; onClose: () => void };

const today = new Date().toISOString().slice(0, 10);

export default function MeetingReportModal({ projectId, onClose }: Props) {
  const [date, setDate]           = useState(today);
  const [location, setLocation]   = useState('');
  const [participants, setParticipants] = useState<string[]>(['']);
  const [agenda, setAgenda]       = useState<string[]>(['']);
  const [decisions, setDecisions] = useState<string[]>(['']);
  const [actions, setActions]     = useState<ActionItem[]>([{ task: '', owner: '', due_date: '' }]);
  const [loading, setLoading]     = useState(false);
  const [report, setReport]       = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [copied, setCopied]       = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addRow    = (setter: React.Dispatch<React.SetStateAction<any[]>>, blank: unknown) => setter((a: unknown[]) => [...a, blank]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const removeRow = (setter: React.Dispatch<React.SetStateAction<any[]>>, i: number) =>
    setter((a: unknown[]) => a.filter((_, idx) => idx !== i));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateRow = (setter: React.Dispatch<React.SetStateAction<any[]>>, i: number, val: unknown) =>
    setter((a: unknown[]) => a.map((v, idx) => idx === i ? val : v));

  async function handleGenerate() {
    setError(null);
    setLoading(true);
    try {
      const text = await generateMeetingReport(projectId, {
        date,
        location: location || undefined,
        participants: participants.filter(Boolean),
        agenda_items: agenda.filter(Boolean),
        decisions: decisions.filter(Boolean),
        action_items: actions.filter(a => a.task && a.owner),
      });
      setReport(text);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur de génération');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!report) return;
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mr-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mr-modal">
        <div className="mr-modal__head">
          <div>
            <h2 className="mr-modal__title">Générer un CR de réunion</h2>
            <p className="mr-modal__sub">IA Claude — rédaction automatique en français</p>
          </div>
          <button className="mr-modal__close" aria-label="Fermer" onClick={onClose}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>

        {!report ? (
          <div className="mr-modal__body">
            {/* Date + Lieu */}
            <div className="mr-form-row">
              <div className="mr-field">
                <label className="mr-label">Date de réunion *</label>
                <input type="date" className="mr-input" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="mr-field">
                <label className="mr-label">Lieu</label>
                <input type="text" className="mr-input" placeholder="Bureau de chantier" value={location} onChange={e => setLocation(e.target.value)} />
              </div>
            </div>

            {/* Participants */}
            <div className="mr-section">
              <label className="mr-label">Participants *</label>
              {participants.map((p, i) => (
                <div key={i} className="mr-list-row">
                  <input className="mr-input" placeholder="Prénom Nom — Rôle" value={p}
                    onChange={e => updateRow(setParticipants, i, e.target.value)} />
                  {participants.length > 1 && <button className="mr-remove" onClick={() => removeRow(setParticipants, i)}>−</button>}
                </div>
              ))}
              <button className="mr-add" onClick={() => addRow(setParticipants, '')}>+ Participant</button>
            </div>

            {/* Ordre du jour */}
            <div className="mr-section">
              <label className="mr-label">Ordre du jour *</label>
              {agenda.map((a, i) => (
                <div key={i} className="mr-list-row">
                  <input className="mr-input" placeholder="Point à aborder" value={a}
                    onChange={e => updateRow(setAgenda, i, e.target.value)} />
                  {agenda.length > 1 && <button className="mr-remove" onClick={() => removeRow(setAgenda, i)}>−</button>}
                </div>
              ))}
              <button className="mr-add" onClick={() => addRow(setAgenda, '')}>+ Point</button>
            </div>

            {/* Décisions */}
            <div className="mr-section">
              <label className="mr-label">Décisions prises</label>
              {decisions.map((d, i) => (
                <div key={i} className="mr-list-row">
                  <input className="mr-input" placeholder="Décision formelle" value={d}
                    onChange={e => updateRow(setDecisions, i, e.target.value)} />
                  {decisions.length > 1 && <button className="mr-remove" onClick={() => removeRow(setDecisions, i)}>−</button>}
                </div>
              ))}
              <button className="mr-add" onClick={() => addRow(setDecisions, '')}>+ Décision</button>
            </div>

            {/* Actions */}
            <div className="mr-section">
              <label className="mr-label">Actions à mener</label>
              {actions.map((a, i) => (
                <div key={i} className="mr-action-row">
                  <input className="mr-input" placeholder="Tâche" value={a.task}
                    onChange={e => updateRow(setActions, i, { ...a, task: e.target.value })} />
                  <input className="mr-input mr-input--sm" placeholder="Responsable" value={a.owner}
                    onChange={e => updateRow(setActions, i, { ...a, owner: e.target.value })} />
                  <input type="date" className="mr-input mr-input--sm" value={a.due_date ?? ''}
                    onChange={e => updateRow(setActions, i, { ...a, due_date: e.target.value })} />
                  {actions.length > 1 && <button className="mr-remove" onClick={() => removeRow(setActions, i)}>−</button>}
                </div>
              ))}
              <button className="mr-add" onClick={() => addRow(setActions, { task: '', owner: '', due_date: '' })}>+ Action</button>
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
                      <path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/><path d="M20 2v4h-4"/>
                    </svg>
                    Générer le CR
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="mr-modal__body">
            <div className="mr-output">
              <pre className="mr-markdown">{report}</pre>
            </div>
            <div className="mr-modal__footer">
              <button className="btn-ghost" onClick={() => setReport(null)}>← Modifier</button>
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
