import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAvenants, createAvenant, updateAvenant,
  type Avenant, type AvenantType, type AvenantStatut,
} from '../api/get-avenants';
import PageHeader from '../../../components/ui/PageHeader';

const TYPE_LABELS: Record<AvenantType, string> = {
  montant:          'Montant',
  delai:            'Délai',
  montant_et_delai: 'Montant + Délai',
};
const STATUT_LABELS: Record<AvenantStatut, string> = {
  brouillon: 'Brouillon',
  soumis:    'Soumis',
  signe:     'Signé',
  refuse:    'Refusé',
};
const STATUT_COLORS: Record<AvenantStatut, string> = {
  brouillon: '#6b7280',
  soumis:    '#f59e0b',
  signe:     '#22c55e',
  refuse:    '#ef4444',
};

function fmt(n: number) {
  return new Intl.NumberFormat('fr-CI', { maximumFractionDigits: 0 }).format(n) + ' XOF';
}

const BLANK_FORM = { objet: '', type: 'montant' as AvenantType, montant_ht: 0, delai_supplementaire_jours: 0, notes: '' };

export default function AvenantsPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['avenants', projectId],
    queryFn: () => fetchAvenants(projectId),
    staleTime: 30_000,
  });
  const avenants = data?.avenants ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['avenants', projectId] });

  const createMut = useMutation({ mutationFn: (d: Parameters<typeof createAvenant>[1]) => createAvenant(projectId, d), onSuccess: invalidate });
  const signMut   = useMutation({
    mutationFn: ({ id, date }: { id: number; date: string }) =>
      updateAvenant(projectId, id, { status: 'signe', date_signature: date }),
    onSuccess: (result) => {
      invalidate();
      setWarning(result.situations_actives_warning);
    },
  });
  const refuseMut = useMutation({
    mutationFn: (id: number) => updateAvenant(projectId, id, { status: 'refuse' }),
    onSuccess: invalidate,
  });

  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(BLANK_FORM);
  const [signDate, setSignDate]   = useState<Record<number, string>>({});
  const [signWarning, setWarning] = useState<string | null>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMut.mutate(
      {
        ...form,
        montant_ht:                form.type !== 'delai' ? form.montant_ht : undefined,
        delai_supplementaire_jours: form.type !== 'montant' ? form.delai_supplementaire_jours : undefined,
      },
      { onSuccess: () => { setShowForm(false); setForm(BLANK_FORM); } },
    );
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Avenants"
        subtitle={
          data
            ? `${data.total_avenants} avenant(s) — Montant final marché : ${fmt(data.montant_final)}`
            : 'Modifications contractuelles du marché'
        }
        action={
          <button className="btn btn--primary btn--sm" onClick={() => setShowForm(s => !s)}>
            + Nouvel avenant
          </button>
        }
      />

      {signWarning && (
        <div className="card" style={{ background: '#f59e0b11', border: '1px solid #f59e0b55', marginBottom: '1rem' }}>
          <p style={{ color: '#b45309', margin: 0, padding: '0.75rem 1rem' }}>
            ⚠️ {signWarning}
            <button
              className="btn btn--ghost btn--sm"
              style={{ marginLeft: '1rem' }}
              onClick={() => setWarning(null)}
            >
              ×
            </button>
          </p>
        </div>
      )}

      {showForm && (
        <form className="card card--form" onSubmit={handleCreate}>
          <h3 className="card__title">Créer un avenant</h3>
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
                onChange={e => setForm(f => ({ ...f, type: e.target.value as AvenantType }))}
              >
                {(Object.keys(TYPE_LABELS) as AvenantType[]).map(t => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            {form.type !== 'delai' && (
              <div className="form-group">
                <label className="form-label">Montant HT (XOF)</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.montant_ht}
                  onChange={e => setForm(f => ({ ...f, montant_ht: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            )}
            {form.type !== 'montant' && (
              <div className="form-group">
                <label className="form-label">Délai supplémentaire (jours)</label>
                <input
                  type="number"
                  className="form-control"
                  min={1}
                  value={form.delai_supplementaire_jours}
                  onChange={e => setForm(f => ({ ...f, delai_supplementaire_jours: parseInt(e.target.value) || 0 }))}
                />
              </div>
            )}
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
              {createMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setShowForm(false)}>Annuler</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="page-loading">Chargement…</p>
      ) : avenants.length === 0 ? (
        <p className="page-empty">Aucun avenant. Créez le premier via le bouton ci-dessus.</p>
      ) : (
        <div className="card card--table">
          <table className="data-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Objet</th>
                <th>Type</th>
                <th>Montant HT</th>
                <th>Délai sup.</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {avenants.map((a: Avenant) => (
                <tr key={a.id}>
                  <td><strong>{a.numero}</strong></td>
                  <td>{a.objet}</td>
                  <td>{TYPE_LABELS[a.type]}</td>
                  <td>{a.montant_ht !== null ? fmt(a.montant_ht) : '—'}</td>
                  <td>{a.delai_supplementaire_jours ? `${a.delai_supplementaire_jours} j` : '—'}</td>
                  <td>
                    <span
                      className="btp-statut-badge"
                      style={{ background: STATUT_COLORS[a.status] + '22', color: STATUT_COLORS[a.status] }}
                    >
                      {STATUT_LABELS[a.status]}
                    </span>
                  </td>
                  <td>
                    <div className="btp-actions">
                      {(a.status === 'brouillon' || a.status === 'soumis') && (
                        <>
                          <input
                            type="date"
                            className="form-control form-control--sm"
                            value={signDate[a.id] ?? ''}
                            onChange={e => setSignDate(d => ({ ...d, [a.id]: e.target.value }))}
                          />
                          <button
                            className="btn btn--sm btn--success"
                            onClick={() => signDate[a.id] && signMut.mutate({ id: a.id, date: signDate[a.id] })}
                            disabled={!signDate[a.id] || signMut.isPending}
                          >
                            Signer
                          </button>
                          <button
                            className="btn btn--sm btn--danger"
                            onClick={() => refuseMut.mutate(a.id)}
                            disabled={refuseMut.isPending}
                          >
                            Refuser
                          </button>
                        </>
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
