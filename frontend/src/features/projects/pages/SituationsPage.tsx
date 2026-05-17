import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchSituations, createSituation, submitSituation,
  validateSituation, paySituation,
  type Situation, type SituationStatut,
} from '../api/get-situations';
import PageHeader from '../../../components/ui/PageHeader';

const STATUT_LABELS: Record<SituationStatut, string> = {
  brouillon:    'Brouillon',
  soumise:      'Soumise',
  validee_moe:  'Validée MOE',
  payee:        'Payée',
};
const STATUT_COLORS: Record<SituationStatut, string> = {
  brouillon:    '#6b7280',
  soumise:      '#f59e0b',
  validee_moe:  '#3b82f6',
  payee:        '#22c55e',
};

function fmt(n: number) {
  return new Intl.NumberFormat('fr-CI', { maximumFractionDigits: 0 }).format(n) + ' XOF';
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function SituationsPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const qc = useQueryClient();

  const { data: situations = [], isLoading } = useQuery({
    queryKey: ['situations', projectId],
    queryFn: () => fetchSituations(projectId),
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['situations', projectId] });

  const createMut   = useMutation({ mutationFn: (d: Parameters<typeof createSituation>[1]) => createSituation(projectId, d), onSuccess: invalidate });
  const submitMut   = useMutation({ mutationFn: (sid: number) => submitSituation(projectId, sid), onSuccess: invalidate });
  const validateMut = useMutation({ mutationFn: (sid: number) => validateSituation(projectId, sid), onSuccess: invalidate });
  const payMut      = useMutation({ mutationFn: ({ sid, date }: { sid: number; date: string }) => paySituation(projectId, sid, date), onSuccess: invalidate });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ periode: currentMonth(), avancement_pct: 0, montant_brut_ht: 0, notes: '' });
  const [payDate, setPayDate] = useState<Record<number, string>>({});

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMut.mutate({ ...form }, { onSuccess: () => setShowForm(false) });
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Situations de travaux"
        subtitle="Suivi du décompte périodique par période"
        action={
          <button className="btn btn--primary btn--sm" onClick={() => setShowForm(s => !s)}>
            + Nouvelle situation
          </button>
        }
      />

      {showForm && (
        <form className="card card--form" onSubmit={handleCreate}>
          <h3 className="card__title">Créer une situation de travaux</h3>
          <div className="form-grid form-grid--2">
            <div className="form-group">
              <label className="form-label">Période *</label>
              <input
                type="month"
                className="form-control"
                value={form.periode}
                onChange={e => setForm(f => ({ ...f, periode: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Avancement global (%)</label>
              <input
                type="number"
                className="form-control"
                min={0} max={100} step={1}
                value={form.avancement_pct}
                onChange={e => setForm(f => ({ ...f, avancement_pct: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Montant brut HT (XOF) *</label>
              <input
                type="number"
                className="form-control"
                min={0} step={1}
                value={form.montant_brut_ht}
                onChange={e => setForm(f => ({ ...f, montant_brut_ht: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>
            <div className="form-group">
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
              {createMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setShowForm(false)}>Annuler</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="page-loading">Chargement…</p>
      ) : situations.length === 0 ? (
        <p className="page-empty">Aucune situation enregistrée. Créez la première via le bouton ci-dessus.</p>
      ) : (
        <div className="card card--table">
          <table className="data-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Période</th>
                <th>Avancement</th>
                <th>Brut HT</th>
                <th>Retenue</th>
                <th>Net à payer</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {situations.map((s: Situation) => (
                <tr key={s.id}>
                  <td><strong>{s.numero}</strong></td>
                  <td>{s.periode}</td>
                  <td>{s.avancement_pct}%</td>
                  <td>{fmt(s.montant_brut_ht)}</td>
                  <td>{fmt(s.retenue_garantie_amount)}</td>
                  <td><strong>{fmt(s.net_a_payer)}</strong></td>
                  <td>
                    <span
                      className="btp-statut-badge"
                      style={{ background: STATUT_COLORS[s.status] + '22', color: STATUT_COLORS[s.status] }}
                    >
                      {STATUT_LABELS[s.status]}
                    </span>
                  </td>
                  <td>
                    <div className="btp-actions">
                      {s.status === 'brouillon' && (
                        <button
                          className="btn btn--sm btn--secondary"
                          onClick={() => submitMut.mutate(s.id)}
                          disabled={submitMut.isPending}
                        >
                          Soumettre
                        </button>
                      )}
                      {s.status === 'soumise' && (
                        <button
                          className="btn btn--sm btn--primary"
                          onClick={() => validateMut.mutate(s.id)}
                          disabled={validateMut.isPending}
                        >
                          Valider MOE
                        </button>
                      )}
                      {s.status === 'validee_moe' && (
                        <div className="btp-pay-row">
                          <input
                            type="date"
                            className="form-control form-control--sm"
                            value={payDate[s.id] ?? ''}
                            onChange={e => setPayDate(d => ({ ...d, [s.id]: e.target.value }))}
                          />
                          <button
                            className="btn btn--sm btn--success"
                            onClick={() => payDate[s.id] && payMut.mutate({ sid: s.id, date: payDate[s.id] })}
                            disabled={!payDate[s.id] || payMut.isPending}
                          >
                            Payer
                          </button>
                        </div>
                      )}
                    </div>
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
