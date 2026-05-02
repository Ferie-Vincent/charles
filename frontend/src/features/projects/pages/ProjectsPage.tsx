import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listProjects } from '../api/list-projects';
import type { Project } from '../types';
import ProjectTable from '../components/ProjectTable';
import PageHeader from '../../../components/ui/PageHeader';
import SkeletonPage from '../../../components/ui/SkeletonPage';
import { useAuth } from '../../auth/stores/auth-store';
import { getRoleGroup } from '../../../lib/roles';

export default function ProjectsPage() {
  const { user } = useAuth();
  const canCreate = getRoleGroup(user?.role?.name ?? '') === 'direction';
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: listProjects,
    staleTime: 60_000,
  });

  return (
    <div>
      <PageHeader
        title="Chantiers"
        action={canCreate ? <Link to="/projects/new" className="btn-primary">+ Nouveau chantier</Link> : undefined}
      />
      {isLoading ? <SkeletonPage rows={2} /> : <ProjectTable projects={projects} />}
    </div>
  );
}
