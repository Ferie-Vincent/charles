import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/stores/auth-store';
import { getRoleGroup } from '../../../lib/roles';
import AiMorningBriefing from './AiMorningBriefing';
import AiQueryPanel from './AiQueryPanel';

type Modal = 'briefing' | 'assistant' | null;

export default function AiFab() {
  const { user } = useAuth();
  const roleGroup = getRoleGroup(user?.role?.name ?? '');
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<Modal>(null);

  // Only for direction and dt
  if (!['direction', 'dt'].includes(roleGroup)) return null;

  function openModal(m: Modal) {
    setModal(m);
    setOpen(false);
  }

  function closeModal() {
    setModal(null);
  }

  // Escape key closes everything
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { closeModal(); setOpen(false); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {/* Speed dial */}
      <div className="ai-fab-root">
        {open && (
          <div className="ai-fab-dial">
            <button
              className="ai-fab-dial__item"
              onClick={() => openModal('briefing')}
              title="Briefing matinal"
            >
              <span className="ai-fab-dial__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </span>
              <span className="ai-fab-dial__label">Briefing</span>
            </button>
            <button
              className="ai-fab-dial__item"
              onClick={() => openModal('assistant')}
              title="Assistant chantier"
            >
              <span className="ai-fab-dial__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </span>
              <span className="ai-fab-dial__label">Assistant</span>
            </button>
          </div>
        )}

        {/* Main FAB button */}
        <button
          className={`ai-fab-btn${open ? ' ai-fab-btn--open' : ''}`}
          onClick={() => setOpen(o => !o)}
          aria-label="Assistant IA"
          title="Assistant IA"
        >
          {open ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <span className="ai-fab-btn__label">IA</span>
          )}
        </button>
      </div>

      {/* Backdrop to close dial */}
      {open && (
        <div className="ai-fab-backdrop" onClick={() => setOpen(false)} />
      )}

      {/* Briefing modal */}
      {modal === 'briefing' && (
        <div className="ai-fab-modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="ai-fab-modal-box">
            <div className="ai-fab-modal-close-row">
              <button className="ai-fab-modal-close" onClick={closeModal} aria-label="Fermer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <AiMorningBriefing />
          </div>
        </div>
      )}

      {/* Assistant modal */}
      {modal === 'assistant' && (
        <div className="ai-fab-modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="ai-fab-modal-box">
            <div className="ai-fab-modal-close-row">
              <button className="ai-fab-modal-close" onClick={closeModal} aria-label="Fermer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <AiQueryPanel />
          </div>
        </div>
      )}
    </>
  );
}
