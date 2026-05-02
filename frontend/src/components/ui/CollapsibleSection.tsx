import { useState, useEffect } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  id?: string;
  extra?: React.ReactNode;
  className?: string;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return mobile;
}

export default function CollapsibleSection({
  title, subtitle, icon, defaultOpen = false, children, id, extra, className = '',
}: Props) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(!isMobile || defaultOpen);

  useEffect(() => {
    if (!isMobile) setOpen(true);
  }, [isMobile]);

  return (
    <div className={`collapsible-section${open ? ' collapsible-section--open' : ''}${className ? ' ' + className : ''}`} id={id}>
      <button
        type="button"
        className="collapsible-section__header"
        onClick={() => isMobile && setOpen(o => !o)}
        aria-expanded={open}
      >
        <div className="card-head" style={{ flex: 1, margin: 0, padding: 0 }}>
          {icon}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="card-title" style={{ margin: 0 }}>{title}</div>
            {subtitle && <p className="card-subtitle" style={{ margin: 0 }}>{subtitle}</p>}
          </div>
          {extra && <div onClick={e => e.stopPropagation()}>{extra}</div>}
        </div>
        <svg
          className="collapsible-section__chevron"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          width="16"
          height="16"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div className="collapsible-section__body">
        {children}
      </div>
    </div>
  );
}
