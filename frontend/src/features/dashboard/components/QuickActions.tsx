import React from 'react';
import { Link } from 'react-router-dom';

export type QuickActionLink = {
  label: string;
  sub: string;
  to: string;
  icon: React.ReactNode;
  color?: string;
};

type Props = { links: QuickActionLink[] };

export default function QuickActions({ links }: Props) {
  return (
    <div className="db-quick-actions">
      {links.map(l => (
        <Link key={l.to} to={l.to} className="db-quick-action-card">
          <div className={`card-icon ${l.color ?? 'card-icon--blue'}`} style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }}>
            {l.icon}
          </div>
          <span className="db-quick-action-card__label">{l.label}</span>
          <span className="db-quick-action-card__sub">{l.sub}</span>
        </Link>
      ))}
    </div>
  );
}
