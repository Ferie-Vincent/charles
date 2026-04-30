import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProject } from '../api/get-project';
import type { Project } from '../types';
import PageHeader from '../../../components/ui/PageHeader';
import ActivityTimeline from '../components/ActivityTimeline';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  active: 'Actif',
  completed: 'Terminé',
  archived: 'Archivé',
};

const ROLE_LABELS: Record<string, string> = {
  'direction': 'Direction',
  'directeur-technique': 'Directeur Technique',
  'conducteur-travaux': 'Conducteur de Travaux',
  'chef-chantier': 'Chef de Chantier',
  'metreur-economiste': 'Métreur Économiste',
  'comptable': 'Comptable',
  'lecture-seule': 'Lecture seule',
};

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatBudget(amount: string) {
  return Number(amount).toLocaleString('fr-FR') + ' FCFA';
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getProject(Number(id))
      .then(setProject)
      .catch(() => setError('Chantier introuvable.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-content"><p>Chargement…</p></div>;
  if (error || !project) return <div className="page-content"><p className="form-error">{error ?? 'Erreur.'}</p></div>;

  return (
    <div>
      <PageHeader
        title={project.name}
        action={
          <Link to="/projects" className="btn-secondary">← Retour</Link>
        }
      />

      <div className="detail-grid">

        {/* ── Informations générales ── */}
        <div className="card card--third">
          <h3 className="card-title">Informations générales</h3>
          <InfoRow label="Code" value={<code>{project.code}</code>} />
          <InfoRow
            label="Statut"
            value={<span className={`badge badge-${project.status}`}>{STATUS_LABELS[project.status] ?? project.status}</span>}
          />
          <InfoRow label="Localisation" value={project.location ?? '—'} />
          <InfoRow label="Début" value={formatDate(project.start_date)} />
          <InfoRow label="Fin prévue" value={formatDate(project.end_date)} />
        </div>

        {/* ── Budget ── */}
        <div className="card card--third">
          <h3 className="card-title">Budget</h3>
          <div className="kpi-solo">
            <p className="kpi-label">Budget prévisionnel</p>
            <p className="kpi-value kpi-value--lg">{formatBudget(project.budget_amount)}</p>
          </div>
          <InfoRow label="Dépenses réelles" value="— (à venir)" />
          <InfoRow label="Taux consommation" value="— (à venir)" />
          <InfoRow label="Écart budget" value="— (à venir)" />
        </div>

        {/* ── Avancement ── */}
        <div className="card card--third">
          <h3 className="card-title">Avancement</h3>
          <div className="kpi-solo">
            <p className="kpi-label">Avancement réel</p>
            <p className="kpi-value kpi-value--lg">— %</p>
          </div>
          <InfoRow label="Avancement cible" value="— % (à venir)" />
          <InfoRow label="Jours suivis" value="— (à venir)" />
          <InfoRow label="Incidents ouverts" value="— (à venir)" />
        </div>

        {/* ── Historique ── */}
        <div className="card card--half">
          <h3 className="card-title">Historique des actions</h3>
          <ActivityTimeline activities={project.activities ?? []} />
        </div>

        {/* ── Équipe ── */}
        <div className="card card--half">
          <h3 className="card-title">Équipe du chantier</h3>
          {!project.members || project.members.length === 0 ? (
            <p className="empty-state">Aucun membre assigné.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Rôle système</th>
                  <th>Rôle sur le chantier</th>
                </tr>
              </thead>
              <tbody>
                {project.members.map(m => (
                  <tr key={m.id}>
                    <td>{m.user.name}</td>
                    <td>{m.user.email}</td>
                    <td>{m.user.role?.label ?? '—'}</td>
                    <td>{ROLE_LABELS[m.assignment_role] ?? m.assignment_role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
