import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProject } from '../api/get-project';
import WorkersPanel from '../components/WorkersPanel';
import PageHeader from '../../../components/ui/PageHeader';
import SkeletonPage from '../../../components/ui/SkeletonPage';
import { useAuth } from '../../auth/stores/auth-store';
import { getRoleGroup } from '../../../lib/roles';
import { exportAttendancePdf } from '../api/workers';

export default function PersonnelPage() {
  const { id } = useParams<{ id: string }>();
  const numId = Number(id);
  const today = new Date().toISOString().slice(0, 10);

  const { user } = useAuth();
  const group = getRoleGroup(user?.role?.name ?? '');
  const readonly = group !== 'terrain' && group !== 'conducteur';

  const firstOfMonth = today.slice(0, 8) + '01';
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo]     = useState(today);
  const [exporting, setExporting] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', numId],
    queryFn: () => getProject(numId),
    enabled: !!id,
    staleTime: 300_000,
  });

  async function handleExport() {
    setExporting(true);
    try {
      await exportAttendancePdf(numId, dateFrom, dateTo);
    } finally {
      setExporting(false);
      setShowExport(false);
    }
  }

  if (isLoading) return <div className="page-content"><SkeletonPage rows={3} /></div>;
  if (!project) return null;

  return (
    <div className="page-content">
      <PageHeader
        breadcrumb={`${project.code} · Personnel`}
        title="Gestion du personnel"
        subtitle={`Équipe affectée — pointage du ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
        action={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="proj-action-bar__btn"
              onClick={() => setShowExport(s => !s)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Feuille présence CNPS
            </button>
            <Link to={`/projects/${numId}`} className="proj-action-bar__btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Retour chantier
            </Link>
          </div>
        }
      />

      {showExport && (
        <div className="personnel-export-bar">
          <span className="personnel-export-bar__label">Période :</span>
          <input
            type="date"
            className="personnel-export-bar__input"
            value={dateFrom}
            max={dateTo}
            onChange={e => setDateFrom(e.target.value)}
          />
          <span className="personnel-export-bar__sep">au</span>
          <input
            type="date"
            className="personnel-export-bar__input"
            value={dateTo}
            min={dateFrom}
            max={today}
            onChange={e => setDateTo(e.target.value)}
          />
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={handleExport}
            disabled={exporting || !dateFrom || !dateTo}
          >
            {exporting ? 'Génération…' : 'Télécharger PDF'}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setShowExport(false)}
          >
            Annuler
          </button>
        </div>
      )}

      <WorkersPanel projectId={numId} date={today} readonly={readonly} />
    </div>
  );
}
