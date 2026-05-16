import { Link } from 'react-router-dom';
import type { Project } from '../types';
import { PROJECT_STATUS_LABEL as STATUS_LABELS } from '../../../lib/constants';

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
            <td><Link to={`/projects/${p.id}`}><code>{p.code}</code></Link></td>
            <td><Link to={`/projects/${p.id}`} className="row-link">{p.name}</Link></td>
            <td><span className={`badge badge-${p.status}`}>{STATUS_LABELS[p.status] ?? p.status}</span></td>
            <td>{p.location ?? '—'}</td>
            <td>{Number(p.budget_amount).toLocaleString('fr-FR')} FCFA</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
