import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { logout } from '../../features/auth/api/login';
import { useAuth } from '../../features/auth/stores/auth-store';
import { getRoleGroup } from '../../lib/roles';
import { api } from '../../lib/api';

async function getOps() {
  const res = await api.get('/portfolio/operations');
  return res.data;
}

const fmtAmount = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);

export default function Topbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, setUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [validatingId, setValidatingId] = useState<number | null>(null);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef  = useRef<HTMLDivElement>(null);

  const roleGroup = getRoleGroup(user?.role?.name ?? '');
  const canCreateProject = roleGroup === 'direction';
  const canSeeOps = roleGroup !== 'terrain';

  const { data: ops } = useQuery({
    queryKey: ['portfolio-operations'],
    queryFn: getOps,
    staleTime: 60_000,
    enabled: canSeeOps,
  });

  const bdcPending      = ops?.bdc_pending      ?? [];
  const stockAlerts     = ops?.stock_alerts     ?? [];
  const criticalProj    = ops?.critical_projects ?? [];
  const isManagement    = roleGroup === 'direction' || roleGroup === 'dt';
  const invoicesPending = isManagement ? (ops?.invoices_pending ?? []) : [];
  const dqePending      = isManagement ? (ops?.dqe_pending      ?? []) : [];
  const notifCount      = bdcPending.length + stockAlerts.length + criticalProj.length + invoicesPending.length + dqePending.length;

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current  && !userRef.current.contains(e.target as Node))  setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  async function handleLogout() {
    await logout();
    setUser(null);
    navigate('/login');
  }

  async function handleInlineValidate(e: React.MouseEvent, projectId: number, invoiceId: number) {
    e.stopPropagation();
    setValidatingId(invoiceId);
    try {
      await api.patch(`/projects/${projectId}/invoices/${invoiceId}/transition`, { status: 'validee' });
      queryClient.invalidateQueries({ queryKey: ['portfolio-operations'] });
    } finally {
      setValidatingId(null);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/projects?q=${encodeURIComponent(q)}`);
      setSearchQuery('');
    }
  }

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button type="button" className="topbar-hamburger" aria-label="Menu" onClick={onMenuToggle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <form className="topbar-search" onSubmit={handleSearch} role="search">
          <svg className="topbar-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            aria-label="Rechercher"
            placeholder="Rechercher un chantier, DQE, intervenant…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="submit" className="topbar-search__submit" aria-label="Lancer la recherche">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          )}
        </form>
      </div>

      <div className="topbar-actions">
        {canSeeOps && (
          <div className="topbar-notif-wrap" ref={notifRef}>
            <button
              type="button"
              className={`topbar-bell ${notifOpen ? 'topbar-bell--active' : ''}`}
              aria-label={`Notifications${notifCount > 0 ? ` (${notifCount})` : ''}`}
              onClick={() => { setNotifOpen(v => !v); setUserMenuOpen(false); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {notifCount > 0 && (
                <span className="topbar-notif-badge" aria-hidden="true">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="topbar-notif-panel" role="dialog" aria-label="Notifications">
                <div className="topbar-notif-panel__head">
                  <span>Notifications</span>
                  {notifCount > 0 && <span className="topbar-notif-panel__count">{notifCount}</span>}
                </div>

                {notifCount === 0 ? (
                  <div className="topbar-notif-empty">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    Aucune alerte active
                  </div>
                ) : (
                  <div className="topbar-notif-list">
                    {bdcPending.map((bdc: any) => (
                      <button
                        key={`bdc-${bdc.id}`}
                        type="button"
                        className="topbar-notif-item topbar-notif-item--warning"
                        onClick={() => { navigate('/achats'); setNotifOpen(false); }}
                      >
                        <span className="topbar-notif-item__dot topbar-notif-item__dot--warning" />
                        <div className="topbar-notif-item__body">
                          <div className="topbar-notif-item__title">BDC en attente - {bdc.reference}</div>
                          <div className="topbar-notif-item__sub">
                            {bdc.supplier}
                            {bdc.total_amount ? ` - ${fmtAmount(bdc.total_amount)}` : ''}
                            {` - ${bdc.age_days}j`}
                          </div>
                        </div>
                      </button>
                    ))}

                    {stockAlerts.map((s: any) => (
                      <button
                        key={`stock-${s.id}`}
                        type="button"
                        className="topbar-notif-item topbar-notif-item--danger"
                        onClick={() => { navigate('/stocks'); setNotifOpen(false); }}
                      >
                        <span className="topbar-notif-item__dot topbar-notif-item__dot--danger" />
                        <div className="topbar-notif-item__body">
                          <div className="topbar-notif-item__title">Stock bas - {s.name}</div>
                          <div className="topbar-notif-item__sub">
                            {s.quantity} {s.unit} restant - min {s.threshold} {s.unit}
                          </div>
                        </div>
                      </button>
                    ))}

                    {criticalProj.map((p: any) => (
                      <button
                        key={`proj-${p.id}`}
                        type="button"
                        className="topbar-notif-item topbar-notif-item--critical"
                        onClick={() => { navigate(`/projects/${p.id}`); setNotifOpen(false); }}
                      >
                        <span className="topbar-notif-item__dot topbar-notif-item__dot--critical" />
                        <div className="topbar-notif-item__body">
                          <div className="topbar-notif-item__title">Chantier critique - {p.code}</div>
                          <div className="topbar-notif-item__sub">{p.name} - Score {p.health_score}/100</div>
                        </div>
                      </button>
                    ))}

                    {dqePending.map((dqe: any) => (
                      <button
                        key={`dqe-${dqe.id}`}
                        type="button"
                        className="topbar-notif-item topbar-notif-item--warning"
                        onClick={() => { navigate(`/projects/${dqe.project_id}/dqe/${dqe.id}`); setNotifOpen(false); }}
                      >
                        <span className="topbar-notif-item__dot topbar-notif-item__dot--warning" />
                        <div className="topbar-notif-item__body">
                          <div className="topbar-notif-item__title">DQE à valider — v{dqe.version_number} {dqe.name}</div>
                          <div className="topbar-notif-item__sub">
                            {dqe.project_code} · {dqe.total_ht ? `${fmtAmount(dqe.total_ht)} HT` : '—'}{` · ${dqe.age_days}j`}
                          </div>
                        </div>
                      </button>
                    ))}

                    {invoicesPending.map((inv: any) => (
                      <div
                        key={`inv-${inv.id}`}
                        className="topbar-notif-item topbar-notif-item--warning"
                        role="button"
                        tabIndex={0}
                        onClick={() => { navigate(`/projects/${inv.project_id}/accounting`); setNotifOpen(false); }}
                        onKeyDown={e => { if (e.key === 'Enter') { navigate(`/projects/${inv.project_id}/accounting`); setNotifOpen(false); } }}
                      >
                        <span className="topbar-notif-item__dot topbar-notif-item__dot--warning" />
                        <div className="topbar-notif-item__body">
                          <div className="topbar-notif-item__title">Facture à valider — {inv.reference}</div>
                          <div className="topbar-notif-item__sub">
                            {inv.project_code} · {inv.supplier}{inv.amount_ht ? ` · ${fmtAmount(inv.amount_ht)}` : ''}{` · ${inv.age_days}j`}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="topbar-notif-item__action"
                          disabled={validatingId === inv.id}
                          onClick={e => handleInlineValidate(e, inv.project_id, inv.id)}
                          title="Valider cette facture"
                        >
                          {validatingId === inv.id ? '…' : 'Valider'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {notifCount > 0 && (
                  <div className="topbar-notif-panel__footer">
                    <button
                      type="button"
                      onClick={() => { navigate('/operations'); setNotifOpen(false); }}
                    >
                      Voir le tableau de bord operationnel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="topbar-divider" />

        <div className="topbar-user-wrap" ref={userRef}>
          <button
            type="button"
            className={`topbar-user ${userMenuOpen ? 'topbar-user--active' : ''}`}
            onClick={() => { setUserMenuOpen(v => !v); setNotifOpen(false); }}
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
          >
            <div className="topbar-avatar">{initials}</div>
            <div className="topbar-user__info">
              <div className="topbar-username">{user?.company?.name ?? user?.name ?? ''}</div>
              <div className="topbar-role">{user?.role?.label ?? ''}</div>
            </div>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`topbar-chevron ${userMenuOpen ? 'topbar-chevron--up' : ''}`}
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {userMenuOpen && (
            <div className="topbar-user-menu" role="menu">
              <div className="topbar-user-menu__head">
                <div className="topbar-avatar topbar-avatar--lg">{initials}</div>
                <div>
                  <div className="topbar-user-menu__name">{user?.name}</div>
                  <div className="topbar-user-menu__role">{user?.role?.label}</div>
                </div>
              </div>
              <div className="topbar-user-menu__divider" />
              <Link
                to="/settings"
                className="topbar-user-menu__item"
                role="menuitem"
                onClick={() => setUserMenuOpen(false)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                Parametres
              </Link>
              <div className="topbar-user-menu__divider" />
              <button
                type="button"
                className="topbar-user-menu__item topbar-user-menu__item--danger"
                role="menuitem"
                onClick={handleLogout}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Deconnexion
              </button>
            </div>
          )}
        </div>

        {canCreateProject && (
          <Link to="/projects/new" className="btn-primary topbar-cta">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nouveau chantier
          </Link>
        )}
      </div>
    </header>
  );
}
