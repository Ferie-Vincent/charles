import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listProjects } from '../api/list-projects';
import type { Project } from '../types';
import ProjectTable from '../components/ProjectTable';
import PageHeader from '../../../components/ui/PageHeader';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Chantiers"
        action={<Link to="/projects/new" className="btn-primary">+ Nouveau chantier</Link>}
      />
      {loading ? <p>Chargement…</p> : <ProjectTable projects={projects} />}
    </div>
  );
}
