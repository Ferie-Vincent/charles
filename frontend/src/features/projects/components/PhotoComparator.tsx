import { useState, useRef, useCallback, useEffect } from 'react';
import type { ProjectPhoto } from '../api/get-photos';

type Props = {
  before: ProjectPhoto;
  after: ProjectPhoto;
  onClose: () => void;
};

export default function PhotoComparator({ before, after, onClose }: Props) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const updatePos = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100));
    setPos(pct);
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging.current) updatePos(e.clientX);
  }, [updatePos]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragging.current) updatePos(e.touches[0].clientX);
  }, [updatePos]);

  function fmtDate(d: string | null) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  return (
    <div className="pc-overlay" onClick={onClose}>
      <div className="pc-modal" onClick={e => e.stopPropagation()}>

        <div className="pc-header">
          <div className="pc-header__labels">
            <span className="pc-label pc-label--before">← Avant · {fmtDate(before.taken_at)}</span>
            <span className="pc-label pc-label--after">Après · {fmtDate(after.taken_at)} →</span>
          </div>
          <button className="pc-close" onClick={onClose}>×</button>
        </div>

        <div
          ref={containerRef}
          className="pc-stage"
          onMouseMove={onMouseMove}
          onMouseUp={() => { dragging.current = false; }}
          onMouseLeave={() => { dragging.current = false; }}
          onTouchMove={onTouchMove}
          onTouchEnd={() => { dragging.current = false; }}
        >
          {/* Before — base layer */}
          <img src={before.url} alt="avant" className="pc-img pc-img--before" draggable={false} />

          {/* After — clipped to reveal from right of slider */}
          <img
            src={after.url}
            alt="après"
            className="pc-img pc-img--after"
            style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
            draggable={false}
          />

          {/* Slider handle */}
          <div
            className="pc-handle"
            style={{ left: `${pos}%` }}
            onMouseDown={e => { e.preventDefault(); dragging.current = true; }}
            onTouchStart={e => { e.preventDefault(); dragging.current = true; }}
          >
            <div className="pc-handle__line" />
            <div className="pc-handle__knob">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </div>

          {/* % indicator */}
          <div className="pc-pct" style={{ left: `${pos}%` }}>{Math.round(pos)}%</div>
        </div>

        <div className="pc-footer">
          <div className="pc-footer__item">
            {before.tag && <span className="pg-tag">{before.tag}</span>}
            <span>{before.caption ?? 'Avant'}</span>
            <span className="pc-footer__by">{before.uploaded_by}</span>
          </div>
          <div className="pc-footer__divider" />
          <div className="pc-footer__item">
            {after.tag && <span className="pg-tag">{after.tag}</span>}
            <span>{after.caption ?? 'Après'}</span>
            <span className="pc-footer__by">{after.uploaded_by}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
