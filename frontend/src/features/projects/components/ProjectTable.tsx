import { Link } from 'react-router-dom';
import type { Project } from '../types';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  active: 'Actif',
  completed: 'Terminé',
  archived: 'Archivé',
};

type ProjectTableProps = {
  projects: Project[];
};

export default function ProjectTable({ projects }: ProjectTableProps) {
  if (projects.length === 0) {
    return <p className="empty-state">Aucun chantier. <Link to="/projects/new">Créer le premier.</Link></p>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Code</th>
          <th>Nom</th>
          <th>Statut</th>
          <th>Localisation</th>
          <th>Budget</th>
        </tr>
      </thead>
      <tbody>
        {projects.map((p) => (
          <tr key={p.id}>
            <td><code>{p.code}</code></td>
            <td>{p.name}</td>
            <td><span className={`badge badge-${p.status}`}>{STATUS_LABELS[p.status] ?? p.status}</span></td>
            <td>{p.location ?? '—'}</td>
            <td>{Number(p.budget_amount).toLocaleString('fr-FR')} FCFA</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
