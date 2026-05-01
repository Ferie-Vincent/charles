import { useState, useEffect } from 'react';
import { getReports, type ProjectReportMeta } from '../api/get-reports';
import { downloadReport } from '../../../lib/download-report';

function fmtSize(bytes: number): string {
  if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(1) + ' Mo';
  return (bytes / 1_000).toFixed(0) + ' Ko';
}

type Props = { projectId: number };

export default function ReportsWidget({ projectId }: Props) {
  const [reports, setReports] = useState<ProjectReportMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReports(projectId).then(setReports).finally(() => setLoading(false));
  }, [projectId]);

  return (
    <div className="rw-panel">
      <div className="rw-header">
        <div>
          <h3 className="rw-title">Rapports archivés</h3>
          <p className="rw-sub">Générés automatiquement chaque lundi · {reports.length} rapport{reports.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="rw-cron-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          Lundi 07h00
        </div>
      </div>

      {loading ? (
        <p className="rw-empty">Chargement…</p>
      ) : reports.length === 0 ? (
        <p className="rw-empty">Aucun rapport archivé. Le premier sera généré lundi prochain.</p>
      ) : (
        <div className="rw-list">
          {reports.map(r => {
            const weekDate = new Date(r.week_of).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
            return (
              <div key={r.id} className="rw-row">
                <div className="rw-row__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div className="rw-row__info">
                  <span className="rw-row__week">Semaine du {weekDate}</span>
                  <span className="rw-row__meta">
                    <span className={`rw-type rw-type--${r.type}`}>{r.type === 'hebdo' ? 'Auto' : 'Manuel'}</span>
                    {fmtSize(r.size_bytes)}
                  </span>
                </div>
                <button
                  className="rw-dl-btn"
                  title="Télécharger"
                  onClick={() => downloadReport(projectId, r.id, r.filename)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  PDF
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
