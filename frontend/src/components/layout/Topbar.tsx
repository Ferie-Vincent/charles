import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { logout } from '../../features/auth/api/login';
import { useAuth } from '../../features/auth/stores/auth-store';
import { getRoleGroup } from '../../lib/roles';
import { api } from '../../lib/api';
import { getUserNotifications, markNotificationRead, respondToMeeting } from '../../features/meetings/api/meetings-api';
import type { UserNotification } from '../../features/meetings/api/meetings-api';

const DISMISSED_KEY = 'topbar_dismissed_notifs';

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(s: Set<string>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...s]));
}

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
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());
  const [rsvpToast, setRsvpToast] = useState<{ notifId: string; meetingId: number; status: 'accepted' | 'declined' } | null>(null);
  const rsvpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback((key: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(key);
      saveDismissed(next);
      return next;
    });
  }, []);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef  = useRef<HTMLDivElement>(null);

  const roleGroup = getRoleGroup(user?.role?.name ?? '');
  const canCreateProject = roleGroup === 'direction';
  const canSeeOps = roleGroup !== 'terrain';
  const isTerrain = roleGroup === 'terrain';

  const { data: ops } = useQuery({
    queryKey: ['portfolio-operations'],
    queryFn: getOps,
    staleTime: 60_000,
    enabled: canSeeOps,
  });

  const { data: userNotifs } = useQuery({
    queryKey: ['user-notifications'],
    queryFn: getUserNotifications,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const meetingNotifs: UserNotification[] = (userNotifs?.notifications ?? []).filter(
    (n: UserNotification) => n.type === 'meeting_invitation' && !n.read
  );

  const bdcDbNotifs: UserNotification[] = (userNotifs?.notifications ?? []).filter(
    (n: UserNotification) => n.type === 'bdc_status_changed' && !n.read
  );

  const incidentNotifs: UserNotification[] = (userNotifs?.notifications ?? []).filter(
    (n: UserNotification) => n.type === 'incident_severe' && !n.read
  );

  const situationValidatedNotifs: UserNotification[] = (userNotifs?.notifications ?? []).filter(
    (n: UserNotification) => n.type === 'situation_validated' && !n.read
  );

  const avenantNotifs: UserNotification[] = (userNotifs?.notifications ?? []).filter(
    (n: UserNotification) => n.type === 'avenant_signe' && !n.read
  );

  const situationPaidNotifs: UserNotification[] = (userNotifs?.notifications ?? []).filter(
    (n: UserNotification) => n.type === 'situation_paid' && !n.read
  );

  const situationPendingDtNotifs: UserNotification[] = (userNotifs?.notifications ?? []).filter(
    (n: UserNotification) => n.type === 'situation_pending_dt_review' && !n.read
  );

  const situationRejectedDtNotifs: UserNotification[] = (userNotifs?.notifications ?? []).filter(
    (n: UserNotification) => n.type === 'situation_rejected_by_dt' && !n.read
  );

  const situationContestedNotifs: UserNotification[] = (userNotifs?.notifications ?? []).filter(
    (n: UserNotification) => n.type === 'situation_contested' && !n.read
  );

  const isManagement = roleGroup === 'direction' || roleGroup === 'dt';

  const dismissAll = useCallback(() => {
    setDismissed(prev => {
      const next = new Set(prev);
      [...(ops?.bdc_pending ?? [])].forEach((b: any) => next.add(`bdc-${b.id}`));
      [...(ops?.stock_alerts ?? [])].forEach((s: any) => next.add(`stock-${s.id}`));
      [...(ops?.critical_projects ?? [])].forEach((p: any) => next.add(`proj-${p.id}`));
      [...(ops?.dqe_pending ?? [])].forEach((d: any) => next.add(`dqe-${d.id}`));
      [...(ops?.invoices_pending ?? [])].forEach((i: any) => next.add(`inv-${i.id}`));
      saveDismissed(next);
      return next;
    });
  }, [ops]);

  // Auto-prune dismissed keys that no longer exist in the API (item resolved)
  useEffect(() => {
    if (!ops) return;
    const validKeys = new Set<string>([
      ...(ops.bdc_pending      ?? []).map((b: any) => `bdc-${b.id}`),
      ...(ops.stock_alerts     ?? []).map((s: any) => `stock-${s.id}`),
      ...(ops.critical_projects ?? []).map((p: any) => `proj-${p.id}`),
      ...(ops.dqe_pending      ?? []).map((d: any) => `dqe-${d.id}`),
      ...(ops.invoices_pending ?? []).map((i: any) => `inv-${i.id}`),
    ]);
    setDismissed(prev => {
      const next = new Set([...prev].filter(k => validKeys.has(k)));
      saveDismissed(next);
      return next;
    });
  }, [ops]);

  const bdcPending      = (ops?.bdc_pending      ?? []).filter((b: any) => !dismissed.has(`bdc-${b.id}`));
  const stockAlerts     = (ops?.stock_alerts     ?? []).filter((s: any) => !dismissed.has(`stock-${s.id}`));
  const criticalProj    = (ops?.critical_projects ?? []).filter((p: any) => !dismissed.has(`proj-${p.id}`));
  const invoicesPending = isManagement ? (ops?.invoices_pending ?? []).filter((i: any) => !dismissed.has(`inv-${i.id}`)) : [];
  const dqePending      = isManagement ? (ops?.dqe_pending      ?? []).filter((d: any) => !dismissed.has(`dqe-${d.id}`)) : [];
  const notifCount      = bdcPending.length + stockAlerts.length + criticalProj.length + invoicesPending.length + dqePending.length + meetingNotifs.length + bdcDbNotifs.length + incidentNotifs.length + situationValidatedNotifs.length + avenantNotifs.length + situationPaidNotifs.length + situationPendingDtNotifs.length + situationRejectedDtNotifs.length + situationContestedNotifs.length;

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current  && !userRef.current.contains(e.target as Node))  setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleRsvp = useCallback((notifId: string, meetingId: number, status: 'accepted' | 'declined') => {
    if (rsvpTimerRef.current) clearTimeout(rsvpTimerRef.current);
    setRsvpToast({ notifId, meetingId, status });
    rsvpTimerRef.current = setTimeout(async () => {
      await respondToMeeting(meetingId, status);
      await markNotificationRead(notifId);
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      setRsvpToast(null);
    }, 5000);
  }, [queryClient]);

  const cancelRsvp = useCallback(() => {
    if (rsvpTimerRef.current) clearTimeout(rsvpTimerRef.current);
    setRsvpToast(null);
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
        {(canSeeOps || isTerrain) && (
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {notifCount > 0 && <span className="topbar-notif-panel__count">{notifCount}</span>}
                    {notifCount > 0 && (
                      <button
                        type="button"
                        style={{ fontSize: '11px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0' }}
                        onClick={dismissAll}
                        title="Tout marquer comme lu"
                      >
                        Tout lire
                      </button>
                    )}
                  </div>
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
                    {meetingNotifs.map((notif: UserNotification) => {
                      const d = notif.data as any;
                      const when = d.scheduled_at
                        ? new Date(d.scheduled_at).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : '';
                      const contextLine = d.alert_message
                        ? d.alert_message
                        : d.project_name;
                      return (
                        <div
                          key={notif.id}
                          className="topbar-notif-item topbar-notif-item--meeting"
                        >
                          <span className="topbar-notif-item__dot topbar-notif-item__dot--meeting" />
                          <div className="topbar-notif-item__body">
                            <div className="topbar-notif-item__title">📅 {d.title}</div>
                            <div className="topbar-notif-item__sub">
                              {contextLine} · {when}
                              {d.organizer_name ? ` · ${d.organizer_name}` : ''}
                            </div>
                            {/* RSVP inline avec undo 5s */}
                            {d.meeting_id && (
                              <div className="topbar-rsvp">
                                <button
                                  type="button"
                                  className="topbar-rsvp__btn topbar-rsvp__btn--accept"
                                  onClick={() => handleRsvp(notif.id, d.meeting_id, 'accepted')}
                                >✓ Confirmer</button>
                                <button
                                  type="button"
                                  className="topbar-rsvp__btn topbar-rsvp__btn--decline"
                                  onClick={() => handleRsvp(notif.id, d.meeting_id, 'declined')}
                                >✗ Décliner</button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {bdcDbNotifs.map((notif: UserNotification) => {
                      const d = notif.data as any;
                      const isApproved = d.bdc_status === 'approuve';
                      return (
                        <button
                          key={notif.id}
                          type="button"
                          className={`topbar-notif-item ${isApproved ? 'topbar-notif-item--success' : 'topbar-notif-item--danger'}`}
                          onClick={async () => {
                            await markNotificationRead(notif.id);
                            queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
                            if (d.project_id) navigate(`/achats`);
                            setNotifOpen(false);
                          }}
                        >
                          <span className={`topbar-notif-item__dot ${isApproved ? 'topbar-notif-item__dot--success' : 'topbar-notif-item__dot--danger'}`} />
                          <div className="topbar-notif-item__body">
                            <div className="topbar-notif-item__title">
                              BDC {isApproved ? '✓ Approuvé' : '✗ Rejeté'} — {d.reference}
                            </div>
                            <div className="topbar-notif-item__sub">
                              {d.project_name ?? ''}{d.actor_name ? ` · par ${d.actor_name}` : ''}
                              {!isApproved && d.reason ? ` · ${d.reason}` : ''}
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {incidentNotifs.map((notif: UserNotification) => {
                      const d = notif.data as any;
                      const isCritique = d.severity === 'critique';
                      return (
                        <button
                          key={notif.id}
                          type="button"
                          className="topbar-notif-item topbar-notif-item--critical"
                          onClick={async () => {
                            await markNotificationRead(notif.id);
                            queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
                            if (d.project_id) navigate(`/projects/${d.project_id}`);
                            setNotifOpen(false);
                          }}
                        >
                          <span className="topbar-notif-item__dot topbar-notif-item__dot--critical" />
                          <div className="topbar-notif-item__body">
                            <div className="topbar-notif-item__title">
                              {isCritique ? '🚨' : '⚠️'} Incident {d.severity} — {d.project_code}
                            </div>
                            <div className="topbar-notif-item__sub">
                              {d.incident_type}{d.location ? ` · ${d.location}` : ''}{d.reporter_name ? ` · ${d.reporter_name}` : ''}
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {situationValidatedNotifs.map((notif: UserNotification) => {
                      const d = notif.data as any;
                      return (
                        <button
                          key={notif.id}
                          type="button"
                          className="topbar-notif-item topbar-notif-item--success"
                          onClick={async () => {
                            await markNotificationRead(notif.id);
                            queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
                            if (d.project_id) navigate(`/projects/${d.project_id}/situations`);
                            setNotifOpen(false);
                          }}
                        >
                          <span className="topbar-notif-item__dot topbar-notif-item__dot--success" />
                          <div className="topbar-notif-item__body">
                            <div className="topbar-notif-item__title">✓ Situation validée — {d.numero}</div>
                            <div className="topbar-notif-item__sub">
                              {d.project_code} · {d.periode}{d.validator ? ` · par ${d.validator}` : ''}
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {avenantNotifs.map((notif: UserNotification) => {
                      const d = notif.data as any;
                      return (
                        <button
                          key={notif.id}
                          type="button"
                          className="topbar-notif-item topbar-notif-item--warning"
                          onClick={async () => {
                            await markNotificationRead(notif.id);
                            queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
                            if (d.project_id) navigate(`/projects/${d.project_id}/avenants`);
                            setNotifOpen(false);
                          }}
                        >
                          <span className="topbar-notif-item__dot topbar-notif-item__dot--warning" />
                          <div className="topbar-notif-item__body">
                            <div className="topbar-notif-item__title">Avenant signé — {d.numero}</div>
                            <div className="topbar-notif-item__sub">
                              {d.project_code} · {d.objet}
                              {d.montant_ht ? ` · ${fmtAmount(d.montant_ht)}` : ''}
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {situationPaidNotifs.map((notif: UserNotification) => {
                      const d = notif.data as any;
                      return (
                        <button
                          key={notif.id}
                          type="button"
                          className="topbar-notif-item topbar-notif-item--success"
                          onClick={async () => {
                            await markNotificationRead(notif.id);
                            queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
                            if (d.project_id) navigate(`/projects/${d.project_id}/situations`);
                            setNotifOpen(false);
                          }}
                        >
                          <span className="topbar-notif-item__dot topbar-notif-item__dot--success" />
                          <div className="topbar-notif-item__body">
                            <div className="topbar-notif-item__title">💰 Situation payée — {d.numero}</div>
                            <div className="topbar-notif-item__sub">
                              {d.project_code} · {d.periode}
                              {d.net_a_payer ? ` · ${fmtAmount(d.net_a_payer)}` : ''}
                              {d.paid_by ? ` · ${d.paid_by}` : ''}
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {situationPendingDtNotifs.map((notif: UserNotification) => {
                      const d = notif.data as any;
                      return (
                        <button
                          key={notif.id}
                          type="button"
                          className="topbar-notif-item topbar-notif-item--warning"
                          onClick={async () => {
                            await markNotificationRead(notif.id);
                            queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
                            if (d.project_id) navigate(`/projects/${d.project_id}/situations`);
                            setNotifOpen(false);
                          }}
                        >
                          <span className="topbar-notif-item__dot topbar-notif-item__dot--warning" />
                          <div className="topbar-notif-item__body">
                            <div className="topbar-notif-item__title">🔍 Situation à réviser — {d.situation_num}</div>
                            <div className="topbar-notif-item__sub">
                              {d.project_name} · {d.periode}{d.submitted_by ? ` · par ${d.submitted_by}` : ''}
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {situationRejectedDtNotifs.map((notif: UserNotification) => {
                      const d = notif.data as any;
                      return (
                        <button
                          key={notif.id}
                          type="button"
                          className="topbar-notif-item topbar-notif-item--danger"
                          onClick={async () => {
                            await markNotificationRead(notif.id);
                            queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
                            if (d.project_id) navigate(`/projects/${d.project_id}/situations`);
                            setNotifOpen(false);
                          }}
                        >
                          <span className="topbar-notif-item__dot topbar-notif-item__dot--danger" />
                          <div className="topbar-notif-item__body">
                            <div className="topbar-notif-item__title">✗ Situation rejetée DT — {d.situation_num}</div>
                            <div className="topbar-notif-item__sub">
                              {d.project_name} · {d.periode}{d.rejected_by ? ` · par ${d.rejected_by}` : ''}
                              {d.comment ? ` · ${String(d.comment).slice(0, 50)}` : ''}
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {situationContestedNotifs.map((notif: UserNotification) => {
                      const d = notif.data as any;
                      return (
                        <button
                          key={notif.id}
                          type="button"
                          className="topbar-notif-item topbar-notif-item--critical"
                          onClick={async () => {
                            await markNotificationRead(notif.id);
                            queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
                            if (d.project_id) navigate(`/projects/${d.project_id}/situations`);
                            setNotifOpen(false);
                          }}
                        >
                          <span className="topbar-notif-item__dot topbar-notif-item__dot--critical" />
                          <div className="topbar-notif-item__body">
                            <div className="topbar-notif-item__title">⚠️ Situation contestée — {d.situation_num}</div>
                            <div className="topbar-notif-item__sub">
                              {d.project_name} · {d.periode}{d.contested_by ? ` · par ${d.contested_by}` : ''}
                              {d.reason ? ` · ${String(d.reason).slice(0, 50)}` : ''}
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {bdcPending.map((bdc: any) => (
                      <button
                        key={`bdc-${bdc.id}`}
                        type="button"
                        className="topbar-notif-item topbar-notif-item--warning"
                        onClick={() => { dismiss(`bdc-${bdc.id}`); navigate('/achats'); setNotifOpen(false); }}
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
                        onClick={() => { dismiss(`stock-${s.id}`); navigate('/stocks'); setNotifOpen(false); }}
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
                        onClick={() => { dismiss(`proj-${p.id}`); navigate(`/projects/${p.id}`); setNotifOpen(false); }}
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
                        onClick={() => { dismiss(`dqe-${dqe.id}`); navigate(`/projects/${dqe.project_id}/dqe/${dqe.id}`); setNotifOpen(false); }}
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
                        onClick={() => { dismiss(`inv-${inv.id}`); navigate(`/projects/${inv.project_id}/accounting`); setNotifOpen(false); }}
                        onKeyDown={e => { if (e.key === 'Enter') { dismiss(`inv-${inv.id}`); navigate(`/projects/${inv.project_id}/accounting`); setNotifOpen(false); } }}
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

      {/* Toast undo RSVP */}
      {rsvpToast && (
        <div className="rsvp-toast" role="status" aria-live="polite">
          <span>
            {rsvpToast.status === 'accepted' ? '✓ Présence confirmée' : '✗ Absence notifiée'} — envoi dans 5s
          </span>
          <button type="button" className="rsvp-toast__undo" onClick={cancelRsvp}>
            Annuler
          </button>
        </div>
      )}
    </header>
  );
}
