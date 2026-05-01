import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProject } from '../api/get-project';
import type { Project } from '../types';
import PageHeader from '../../../components/ui/PageHeader';
import DailyLogForm from '../../daily-logs/components/DailyLogForm';

export default function JournalPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (id) getProject(Number(id)).then(setProject);
  }, [id]);

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div>
      <PageHeader
        breadcrumb={project?.name ?? '…'}
        title="Journal du jour"
        subtitle={today}
        action={<Link to={`/projects/${id}`} className="btn-secondary">← Retour au chantier</Link>}
      />

      <div style={{ maxWidth: 640 }}>
        <div className="card">
          {project ? (
            <DailyLogForm
              projectId={project.id}
              onSuccess={() => navigate(`/projects/${id}`)}
            />
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chargement…</p>
          )}
        </div>
      </div>
    </div>
  );
}
