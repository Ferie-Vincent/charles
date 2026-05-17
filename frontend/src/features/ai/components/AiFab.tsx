import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/stores/auth-store';
import { getRoleGroup } from '../../../lib/roles';
import AiMorningBriefing from './AiMorningBriefing';
import AiQueryPanel from './AiQueryPanel';

type Modal = 'briefing' | 'assistant' | null;

const DIAL_ITEMS = [
  {
    id: 'briefing' as Modal,
    label: 'Briefing',
    color: '#6366f1',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="17" height="17">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    id: 'assistant' as Modal,
    label: 'Assistant',
    color: '#0ea5e9',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="17" height="17">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
] as const;

export default function AiFab() {
  const { user } = useAuth();
  const roleGroup = getRoleGroup(user?.role?.name ?? '');
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<Modal>(null);

  if (!['direction', 'dt'].includes(roleGroup)) return null;

  function openModal(m: Modal) {
    setModal(m);
    setOpen(false);
  }

  function closeModal() { setModal(null); }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { closeModal(); setOpen(false); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {/* Backdrop (closes dial) */}
      {open && <div className="ai-fab-backdrop" onClick={() => setOpen(false)} />}

      <div className="ai-fab-root">
        {/* Speed dial items */}
        {DIAL_ITEMS.map((item, i) => (
          <div
            key={item.id}
            className="ai-fab-dial__item"
            style={{
              opacity: open ? 1 : 0,
              transform: open ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.85)',
              transitionDelay: open ? `${i * 55}ms` : `${(DIAL_ITEMS.length - 1 - i) * 40}ms`,
              pointerEvents: open ? 'auto' : 'none',
            }}
            onClick={() => openModal(item.id)}
          >
            <span className="ai-fab-dial__label">{item.label}</span>
            <span className="ai-fab-dial__icon" style={{ background: item.color }}>
              {item.icon}
            </span>
          </div>
        ))}

        {/* Main FAB */}
        <button
          className={`ai-fab-btn${open ? ' ai-fab-btn--open' : ''}`}
          onClick={() => setOpen(o => !o)}
          aria-label="Assistant IA"
        >
          {/* Spark ring */}
          <span className="ai-fab-btn__ring" />
          {/* Mascot — visible when closed */}
          <img
            src="/assets/ai-mascot.png"
            alt="IA"
            className="ai-fab-btn__mascot"
            style={{
              opacity: open ? 0 : 1,
              transform: `translate(-50%, -50%) scale(${open ? 0.7 : 1})`,
            }}
          />
          {/* X — visible when open */}
          <span
            className="ai-fab-btn__icon ai-fab-btn__close"
            style={{ opacity: open ? 1 : 0, transform: open ? 'rotate(0deg) scale(1)' : 'rotate(-45deg) scale(0.7)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </span>
        </button>
      </div>

      {/* Modals */}
      {(modal === 'briefing' || modal === 'assistant') && (
        <div className="ai-fab-modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="ai-fab-modal-box">
            <div className="ai-fab-modal-header">
              <span className="ai-fab-modal-header__badge">IA</span>
              <span className="ai-fab-modal-header__title">
                {modal === 'briefing' ? 'Briefing matinal' : 'Assistant chantier'}
              </span>
              <button className="ai-fab-modal-close" onClick={closeModal} aria-label="Fermer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="13" height="13">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="ai-fab-modal-body">
              {modal === 'briefing' ? <AiMorningBriefing alwaysExpanded /> : <AiQueryPanel />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
