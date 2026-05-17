import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDgd, initializeDgd, signDgd } from '../api/get-dgd';
import PageHeader from '../../../components/ui/PageHeader';
import { useAuth } from '../../auth/stores/auth-store';
import { getRoleGroup } from '../../../lib/roles';

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);

const today = () => new Date().toISOString().slice(0, 10);

const STATUS_LABELS: Record<string, string> = {
  brouillon:        'Brouillon',
  signe_entreprise: 'Signé entreprise',
  signe_moa:        'Signé MOA — Clôturé',
};
const STATUS_COLORS: Record<string, string> = {
  brouillon:        '#6b7280',
  signe_entreprise: '#f59e0b',
  signe_moa:        '#22c55e',
};

export default function DgdPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { user } = useAuth();
  const group = getRoleGroup(user?.role?.name ?? '');
  const canManage = group === 'direction' || group === 'dt';
  const qc = useQueryClient();

  const [signDate, setSignDate] = useState(today());

  const { data: dgd, isLoading } = useQuery({
    queryKey: ['dgd', projectId],
    queryFn: () => fetchDgd(projectId),
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['dgd', projectId] });

  const initMut = useMutation({
    mutationFn: () => initializeDgd(projectId),
    onSuccess: invalidate,
  });

  const signEntrepriseMut = useMutation({
    mutationFn: () => signDgd(projectId, 'entreprise', signDate),
    onSuccess: invalidate,
  });

  const signMoaMut = useMutation({
    mutationFn: () => signDgd(projectId, 'moa', signDate),
    onSuccess: invalidate,
  });

  if (isLoading) return <div className="page-loading">Chargement…</div>;

  return (
    <div className="page-container">
      <PageHeader title="Décompte Général Définitif" subtitle="Clôture financière du marché" />

      {!dgd ? (
        canManage ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Aucun DGD initialisé. Le DGD agrège toutes les situations payées, les pénalités de retard et la retenue de garantie.
            </p>
            <button
              className="btn btn--primary"
              onClick={() => initMut.mutate()}
              disabled={initMut.isPending}
            >
              {initMut.isPending ? 'Initialisation…' : 'Initialiser le DGD'}
            </button>
            {initMut.error && (
              <p style={{ color: '#ef4444', marginTop: '0.5rem', fontSize: '13px' }}>
                {(initMut.error as any)?.response?.data?.message ?? 'Erreur'}
              </p>
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Aucun DGD disponible pour ce chantier.
          </div>
        )
      ) : (
        <>
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Récapitulatif financier</h2>
              <span style={{
                padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                background: `${STATUS_COLORS[dgd.status]}22`,
                color: STATUS_COLORS[dgd.status],
                border: `1px solid ${STATUS_COLORS[dgd.status]}44`,
              }}>
                {STATUS_LABELS[dgd.status] ?? dgd.status}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
              {[
                { label: 'Marché initial', value: dgd.montant_marche_initial },
                { label: 'Avenants signés', value: dgd.montant_avenants },
                { label: 'Marché final (net)', value: dgd.montant_marche_final, highlight: true },
                { label: 'Total situations certifiées', value: dgd.total_situations_ht },
                { label: 'Pénalités de retard', value: -dgd.penalites_retard, warn: dgd.penalites_retard > 0 },
                { label: 'Retenue de garantie libérée', value: dgd.retenue_garantie_liberee },
                { label: 'Solde final', value: dgd.solde_final, highlight: true },
              ].map(({ label, value, highlight, warn }) => (
                <div key={label} style={{
                  background: highlight ? 'var(--color-primary-10, #1e40af11)' : warn ? '#ef444411' : 'var(--color-surface-2)',
                  borderRadius: '8px', padding: '1rem',
                  border: highlight ? '1px solid #1e40af44' : warn ? '1px solid #ef444444' : '1px solid var(--color-border)',
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: warn ? '#ef4444' : highlight ? 'var(--color-primary)' : 'inherit' }}>
                    {fmt(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {dgd.status !== 'signe_moa' && canManage && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h2 style={{ margin: '0 0 1rem', fontSize: '16px', fontWeight: 600 }}>Signatures</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Date de signature</label>
                  <input
                    type="date"
                    className="form-control"
                    value={signDate}
                    onChange={e => setSignDate(e.target.value)}
                    style={{ width: '180px' }}
                  />
                </div>

                {dgd.status === 'brouillon' && (
                  <button
                    className="btn btn--primary"
                    onClick={() => signEntrepriseMut.mutate()}
                    disabled={signEntrepriseMut.isPending}
                    style={{ alignSelf: 'flex-end' }}
                  >
                    {signEntrepriseMut.isPending ? 'Signature…' : 'Signer (Entreprise)'}
                  </button>
                )}

                {dgd.status === 'signe_entreprise' && (
                  <>
                    <div style={{ color: '#22c55e', fontSize: '13px', alignSelf: 'flex-end', paddingBottom: '6px' }}>
                      Signé entreprise le {dgd.date_signature_entreprise}
                    </div>
                    <button
                      className="btn btn--primary"
                      onClick={() => signMoaMut.mutate()}
                      disabled={signMoaMut.isPending}
                      style={{ alignSelf: 'flex-end' }}
                    >
                      {signMoaMut.isPending ? 'Signature MOA…' : 'Signer (MOA) — Clôturer'}
                    </button>
                  </>
                )}
              </div>
              {(signEntrepriseMut.error || signMoaMut.error) && (
                <p style={{ color: '#ef4444', marginTop: '0.75rem', fontSize: '13px' }}>
                  {((signEntrepriseMut.error || signMoaMut.error) as any)?.response?.data?.message ?? 'Erreur'}
                </p>
              )}
            </div>
          )}

          {dgd.status === 'signe_moa' && (
            <div className="card" style={{ padding: '1.5rem', background: '#22c55e11', border: '1px solid #22c55e44' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" width="20" height="20"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                <div>
                  <strong style={{ color: '#22c55e' }}>DGD signé — Chantier clôturé</strong>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    Entreprise : {dgd.date_signature_entreprise} · MOA : {dgd.date_signature_moa}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
