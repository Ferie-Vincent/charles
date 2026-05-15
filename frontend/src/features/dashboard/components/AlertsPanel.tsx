import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import TakeChargeModal from '../../meetings/components/TakeChargeModal';
import type { ProjectAlert } from '../api/get-dashboard';

const TYPE_ICON: Record<ProjectAlert['type'], string> = {
  overdue:        '⏰',
  no_journal:     '📋',
  planning_lag:   '📉',
  open_incident:  '⚠️',
  health_critical:'🔴',
};

const ACTION_LABEL: Record<ProjectAlert['type'], string> = {
  overdue:        'Planifier une réunion de rattrapage',
  no_journal:     'Reprendre la saisie journal',
  planning_lag:   'Réévaluer le planning',
  open_incident:  'Vérifier la clôture incident',
  health_critical:'Définir un plan correctif',
};

const VISIBLE_LIMIT = 6;

type Props = { alerts: ProjectAlert[] };

export default function AlertsPanel({ alerts }: Props) {
  const queryClient                       = useQueryClient();
  const [optimisticDismissed, setOpt]     = useState<Set<string>>(new Set());
  const [taken, setTaken]                 = useState<Set<string>>(new Set());
  const [expanded, setExpanded]           = useState(false);
  const [modalAlert, setModalAlert]       = useState<ProjectAlert | null>(null);

  const dismiss = useCallback(async (id: string) => {
    setOpt(prev => new Set([...prev, id]));
    try {
      await api.post('/dashboard/alerts/dismiss', { alert_key: id });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch {
      // Optimistic dismiss stands; backend re-shows after 24h
    }
  }, [queryClient]);

  const handleModalSuccess = useCallback((alertId: string) => {
    setTaken(prev => new Set([...prev, alertId]));
    setModalAlert(null);
    dismiss(alertId);
  }, [dismiss]);

  const visible   = alerts.filter(a => !optimisticDismissed.has(a.id));
  const displayed = expanded ? visible : visible.slice(0, VISIBLE_LIMIT);
  const extra     = visible.length - VISIBLE_LIMIT;

  const total    = visible.length;
  const critical = visible.filter(a => a.severity === 'critical').length;

  const criticalIds = new Set(visible.filter(a => a.severity === 'critical').map(a => a.id));

  return (
    <>
      <div className="alerts-panel card">
        <div className="alerts-panel__head">
          <span className="alerts-panel__title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Alertes importantes
          </span>
          <span className={`alerts-panel__badge ${critical > 0 ? 'alerts-panel__badge--critical' : 'alerts-panel__badge--warning'}`}>
            {total}
          </span>
        </div>

        {total === 0 ? (
          <p className="alerts-panel__empty">Aucune alerte active</p>
        ) : (
          <ul className="alerts-panel__list">
            {displayed.map(alert => {
              const isDecision = criticalIds.has(alert.id);
              const isTaken    = taken.has(alert.id);
              return (
                <li key={alert.id} className={`ap-item ap-item--${alert.severity}${isDecision ? ' ap-item--decision' : ''}`}>
                  <div className="ap-item__main">
                    <span className="ap-item__type-icon">{TYPE_ICON[alert.type] ?? '•'}</span>
                    <div className="ap-item__body">
                      <span className="ap-item__code">{alert.project_code}</span>
                      <span className="ap-item__msg">{alert.message}</span>
                    </div>
                    <Link to={alert.action_url} className="ap-item__link">→</Link>
                    <button
                      type="button"
                      className="ap-item__close"
                      onClick={() => dismiss(alert.id)}
                      aria-label="Masquer"
                    >×</button>
                  </div>
                  {isDecision && (
                    <div className="ap-item__action-row">
                      <span className="ap-item__action-label">→ {ACTION_LABEL[alert.type]}</span>
                      <button
                        type="button"
                        className={`ap-item__take-charge${isTaken ? ' ap-item__take-charge--done' : ''}`}
                        onClick={() => !isTaken && setModalAlert(alert)}
                        disabled={isTaken}
                      >
                        {isTaken ? '✓ Réunion planifiée' : 'Prendre en charge'}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {total > 0 && (
          <button
            type="button"
            className="alerts-panel__clear"
            onClick={() => extra > 0 && !expanded ? setExpanded(true) : setExpanded(false)}
          >
            {extra > 0 && !expanded ? `${extra} de plus ↓` : expanded ? 'Réduire ↑' : null}
          </button>
        )}
      </div>

      {modalAlert && (
        <TakeChargeModal
          alert={modalAlert}
          onClose={() => setModalAlert(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  );
}
