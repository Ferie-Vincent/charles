import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getOperations } from '../api/get-operations';
import { approvePurchaseOrder } from '../../achats/api/purchase-orders';
import PageHeader from '../../../components/ui/PageHeader';

function fmtAmount(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);
}

function HealthBadge({ score }: { score: number }) {
  const cls = score >= 75 ? 'ops-badge--green' : score >= 50 ? 'ops-badge--orange' : 'ops-badge--red';
  return <span className={`ops-badge ${cls}`}>{score}/100</span>;
}

export default function OperationsDashboardPage() {
  const qc = useQueryClient();
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['portfolio-operations'],
    queryFn: getOperations,
    refetchInterval: 60_000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => approvePurchaseOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio-operations'] }),
    onSettled: () => setApprovingId(null),
  });

  function handleApprove(id: number) {
    if (!confirm('Approuver ce bon de commande ?')) return;
    setApprovingId(id);
    approveMutation.mutate(id);
  }

  if (isLoading) return <div className="ops-loading">Chargement…</div>;
  if (error || !data) return <div className="ops-error">Erreur de chargement.</div>;

  const { health_summary, budget_summary, bdc_pending, stock_alerts, critical_projects } = data;

  return (
    <div className="ops-page">
      <PageHeader
        breadcrumb="DIRECTION · 2026"
        title="Dashboard Opérationnel"
        subtitle="Pilotage DT/DG — alertes actionnables en temps réel."
      />

      {/* BLOC 1 — KPIs */}
      <section className="ops-kpis">
        <div className="ops-kpi">
          <span className="ops-kpi__label">Score santé portefeuille</span>
          <span className="ops-kpi__value">{health_summary.avg_score}<small>/100</small></span>
          <span className="ops-kpi__sub">{health_summary.total_active} chantiers actifs · {health_summary.critical_count} critiques</span>
        </div>
        <div className="ops-kpi">
          <span className="ops-kpi__label">Budget engagé / prévisionnel</span>
          <span className="ops-kpi__value">{budget_summary.tauxEngage}<small>%</small></span>
          <span className="ops-kpi__sub">{fmtAmount(budget_summary.engage)} / {fmtAmount(budget_summary.previsionnel)}</span>
        </div>
        <div className="ops-kpi ops-kpi--alert">
          <span className="ops-kpi__label">BDC en attente d'approbation</span>
          <span className="ops-kpi__value">{bdc_pending.length}</span>
          <span className="ops-kpi__sub">Bons soumis non traités</span>
        </div>
        <div className="ops-kpi ops-kpi--alert">
          <span className="ops-kpi__label">Stocks en alerte</span>
          <span className="ops-kpi__value">{stock_alerts.length}</span>
          <span className="ops-kpi__sub">Sous le seuil minimum</span>
        </div>
      </section>

      {/* BLOC 2 — Listes actionnables */}
      <div className="ops-lists">
        <section className="ops-card">
          <div className="ops-card__head">
            <span className="ops-card__title">BDC en attente</span>
            <Link to="/achats" className="ops-card__link">Voir tous →</Link>
          </div>
          {bdc_pending.length === 0
            ? <p className="ops-empty">Aucun BDC en attente.</p>
            : (
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Réf.</th><th>Fournisseur</th><th>Chantier</th>
                    <th>Montant</th><th>Âge</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {bdc_pending.map(bdc => (
                    <tr key={bdc.id} className={bdc.age_days >= 2 ? 'ops-row--urgent' : ''}>
                      <td><code>{bdc.reference}</code></td>
                      <td>{bdc.supplier}</td>
                      <td>{bdc.project
                        ? <Link to={`/projects/${bdc.project.id}`}>{bdc.project.code}</Link>
                        : '—'}
                      </td>
                      <td>{fmtAmount(bdc.total_amount)}</td>
                      <td>
                        <span className={`ops-age ${bdc.age_days >= 2 ? 'ops-age--urgent' : ''}`}>
                          {bdc.age_days}j
                        </span>
                      </td>
                      <td>
                        <button
                          className="ops-btn ops-btn--approve"
                          disabled={approvingId === bdc.id}
                          onClick={() => handleApprove(bdc.id)}
                        >
                          {approvingId === bdc.id ? '…' : 'Approuver'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </section>

        <section className="ops-card">
          <div className="ops-card__head">
            <span className="ops-card__title">Stocks en alerte</span>
            <Link to="/stocks" className="ops-card__link">Voir tous →</Link>
          </div>
          {stock_alerts.length === 0
            ? <p className="ops-empty">Aucun stock en alerte.</p>
            : (
              <table className="ops-table">
                <thead>
                  <tr><th>Article</th><th>Qté actuelle</th><th>Seuil</th><th>Déficit</th></tr>
                </thead>
                <tbody>
                  {stock_alerts.map(s => (
                    <tr key={s.id} className="ops-row--urgent">
                      <td>{s.name}</td>
                      <td>{s.quantity} {s.unit}</td>
                      <td>{s.threshold} {s.unit}</td>
                      <td><span className="ops-deficit">−{s.deficit} {s.unit}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </section>
      </div>

      {/* BLOC 3 — Chantiers critiques */}
      <section className="ops-card ops-card--full">
        <div className="ops-card__head">
          <span className="ops-card__title">Chantiers score santé &lt; 50</span>
        </div>
        {critical_projects.length === 0
          ? <p className="ops-empty">Aucun chantier en situation critique.</p>
          : (
            <div className="ops-critical-grid">
              {critical_projects.map(p => (
                <Link key={p.id} to={`/projects/${p.id}`} className="ops-critical-card">
                  <span className="ops-critical-card__code">{p.code}</span>
                  <span className="ops-critical-card__name">{p.name}</span>
                  <HealthBadge score={p.health_score} />
                </Link>
              ))}
            </div>
          )
        }
      </section>
    </div>
  );
}
