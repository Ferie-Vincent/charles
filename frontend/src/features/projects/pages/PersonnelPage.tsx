import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProject } from '../api/get-project';
import WorkersPanel from '../components/WorkersPanel';
import PageHeader from '../../../components/ui/PageHeader';
import SkeletonPage from '../../../components/ui/SkeletonPage';
import { useAuth } from '../../auth/stores/auth-store';
import { getRoleGroup } from '../../../lib/roles';

export default function PersonnelPage() {
  const { id } = useParams<{ id: string }>();
  const numId = Number(id);
  const today = new Date().toISOString().slice(0, 10);

  const { user } = useAuth();
  const group = getRoleGroup(user?.role?.name ?? '');
  const readonly = group !== 'terrain' && group !== 'conducteur';

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', numId],
    queryFn: () => getProject(numId),
    enabled: !!id,
    staleTime: 300_000,
  });

  if (isLoading) return <div className="page-content"><SkeletonPage rows={3} /></div>;
  if (!project) return null;

  return (
    <div className="page-content">
      <PageHeader
        breadcrumb={`${project.code} · Personnel`}
        title="Gestion du personnel"
        subtitle={`Équipe affectée — pointage du ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
        action={
          <Link to={`/projects/${numId}`} className="proj-action-bar__btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Retour chantier
          </Link>
        }
      />
      <WorkersPanel projectId={numId} date={today} readonly={readonly} />
    </div>
  );
}
