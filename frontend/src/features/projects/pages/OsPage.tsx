import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchOrdresDeService, createOs, accuserOs,
  type OrdreDeService, type OsType,
} from '../api/get-os';
import PageHeader from '../../../components/ui/PageHeader';

const TYPE_LABELS: Record<OsType, string> = {
  demarrage:              'Démarrage',
  travaux_supplementaires: 'Travaux supplémentaires',
  arret:                  'Arrêt',
  reprise:                'Reprise',
  autre:                  'Autre',
};
const TYPE_COLORS: Record<OsType, string> = {
  demarrage:              '#22c55e',
  travaux_supplementaires: '#f59e0b',
  arret:                  '#ef4444',
  reprise:                '#3b82f6',
  autre:                  '#6b7280',
};

const today = () => new Date().toISOString().slice(0, 10);
const BLANK  = { objet: '', type: 'demarrage' as OsType, date_emission: today(), date_execution: '', notes: '' };

export default function OsPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const qc = useQueryClient();

  const { data: ordres = [], isLoading } = useQuery({
    queryKey: ['os', projectId],
    queryFn: () => fetchOrdresDeService(projectId),
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['os', projectId] });

  const createMut = useMutation({
    mutationFn: (d: Parameters<typeof createOs>[1]) => createOs(projectId, d),
    onSuccess:  invalidate,
  });
  const accuserMut = useMutation({
    mutationFn: (osId: number) => accuserOs(projectId, osId),
    onSuccess:  invalidate,
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(BLANK);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMut.mutate(
      { ...form, date_execution: form.date_execution || undefined },
      { onSuccess: () => { setShowForm(false); setForm(BLANK); } },
    );
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Ordres de Service"
        subtitle="Instructions contractuelles émises au chantier"
        action={
          <button className="btn btn--primary btn--sm" onClick={() => setShowForm(s => !s)}>
            + Nouvel OS
          </button>
        }
      />

      {showForm && (
        <form className="card card--form" onSubmit={handleCreate}>
          <h3 className="card__title">Émettre un ordre de service</h3>
          <div className="form-grid form-grid--2">
            <div className="form-group form-group--full">
              <label className="form-label">Objet *</label>
              <input
                type="text"
                className="form-control"
                value={form.objet}
                onChange={e => setForm(f => ({ ...f, objet: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Type *</label>
              <select
                className="form-control"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as OsType }))}
              >
                {(Object.keys(TYPE_LABELS) as OsType[]).map(t => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date d'émission *</label>
              <input
                type="date"
                className="form-control"
                value={form.date_emission}
                onChange={e => setForm(f => ({ ...f, date_emission: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date d'exécution prévue</label>
              <input
                type="date"
                className="form-control"
                value={form.date_execution}
                onChange={e => setForm(f => ({ ...f, date_execution: e.target.value }))}
              />
            </div>
            <div className="form-group form-group--full">
              <label className="form-label">Notes</label>
              <input
                type="text"
                className="form-control"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn--primary" disabled={createMut.isPending}>
              {createMut.isPending ? 'Enregistrement…' : 'Émettre'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setShowForm(false)}>Annuler</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="page-loading">Chargement…</p>
      ) : ordres.length === 0 ? (
        <p className="page-empty">Aucun ordre de service. Émettez le premier via le bouton ci-dessus.</p>
      ) : (
        <div className="card card--table">
          <table className="data-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Objet</th>
                <th>Type</th>
                <th>Date émission</th>
                <th>Date exécution</th>
                <th>Accusé réception</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ordres.map((os: OrdreDeService) => (
                <tr key={os.id}>
                  <td><strong>{os.numero}</strong></td>
                  <td>{os.objet}</td>
                  <td>
                    <span
                      className="btp-statut-badge"
                      style={{ background: TYPE_COLORS[os.type] + '22', color: TYPE_COLORS[os.type] }}
                    >
                      {TYPE_LABELS[os.type]}
                    </span>
                  </td>
                  <td>{os.date_emission}</td>
                  <td>{os.date_execution ?? '—'}</td>
                  <td>
                    {os.accuse_reception
                      ? <span className="btp-statut-badge" style={{ background: '#22c55e22', color: '#22c55e' }}>✓ {os.date_accuse}</span>
                      : <span className="btp-statut-badge" style={{ background: '#f59e0b22', color: '#f59e0b' }}>En attente</span>
                    }
                  </td>
                  <td>
                    {!os.accuse_reception && (
                      <button
                        className="btn btn--sm btn--primary"
                        onClick={() => accuserMut.mutate(os.id)}
                        disabled={accuserMut.isPending}
                      >
                        Accuser réception
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
