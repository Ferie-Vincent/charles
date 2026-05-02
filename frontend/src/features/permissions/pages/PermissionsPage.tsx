import { useState, useEffect } from 'react';
import PageHeader from '../../../components/ui/PageHeader';
import { usePermissions } from '../../../lib/permissions-context';
import { api } from '../../../lib/api';

const FEATURE_LABELS: Record<string, { label: string; desc: string }> = {
  map:       { label: 'Carte',       desc: 'Visualisation géographique des chantiers' },
  timeline:  { label: 'Calendrier',  desc: 'Vue chronologique contractuelle' },
  dqe:       { label: 'DQE',         desc: 'Devis Quantitatif Estimatif' },
  execution: { label: 'Évaluation',  desc: 'Indicateurs d\'exécution et courbe S' },
  costs:     { label: 'Coûts',       desc: 'Trésorerie prévisionnelle et budgets' },
  qse:       { label: 'QHSE',        desc: 'Qualité, Hygiène, Sécurité, Environnement' },
  reporting: { label: 'Reporting',   desc: 'Rapports PDF et exports' },
};

const ROLE_COLOR: Record<string, string> = {
  'conducteur-travaux':  '#0ea5e9',
  'chef-chantier':       '#10b981',
  'metreur-economiste':  '#f59e0b',
  'comptable':           '#f97316',
  'lecture-seule':       '#94a3b8',
};

export default function PermissionsPage() {
  const { matrix, features, reload } = usePermissions();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  // Local state for editing
  const [local, setLocal] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    if (Object.keys(matrix).length === 0) return;
    const init: Record<string, Record<string, boolean>> = {};
    Object.entries(matrix).forEach(([roleName, roleData]) => {
      init[roleName] = { ...roleData.features };
    });
    setLocal(init);
  }, [matrix]);

  function toggle(roleName: string, feature: string) {
    setLocal(prev => ({
      ...prev,
      [roleName]: {
        ...prev[roleName],
        [feature]: !prev[roleName]?.[feature],
      },
    }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const permissions: { role_name: string; feature: string; enabled: boolean }[] = [];
    Object.entries(local).forEach(([roleName, featureMap]) => {
      Object.entries(featureMap).forEach(([feature, enabled]) => {
        permissions.push({ role_name: roleName, feature, enabled });
      });
    });

    try {
      await api.put('/permissions', { permissions });
      await reload();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const roleNames = Object.keys(matrix);

  return (
    <div>
      <PageHeader
        breadcrumb="ADMINISTRATION · 2026"
        title="Permissions par rôle"
        subtitle="Définissez quelles sections sont accessibles pour chaque profil."
      />

      <div className="page-content">
        <div className="card card--full" style={{ marginTop: 0 }}>
          <div className="card-head" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="card-icon card-icon--purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div>
                <h3 className="card-title" style={{ margin: 0 }}>Matrice des accès</h3>
                <p className="card-subtitle" style={{ margin: 0 }}>Direction = accès total (non configurable)</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {saved && <span style={{ fontSize: 13, color: '#10b981', fontWeight: 500 }}>✓ Sauvegardé</span>}
              <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table perm-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 200 }}>Section</th>
                  {roleNames.map(roleName => (
                    <th key={roleName} style={{ textAlign: 'center', minWidth: 140 }}>
                      <span
                        className="badge"
                        style={{
                          background: (ROLE_COLOR[roleName] ?? '#94a3b8') + '22',
                          color: ROLE_COLOR[roleName] ?? '#94a3b8',
                          border: `1px solid ${ROLE_COLOR[roleName] ?? '#94a3b8'}44`,
                        }}
                      >
                        {matrix[roleName].label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map(feature => {
                  const meta = FEATURE_LABELS[feature];
                  return (
                    <tr key={feature}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--color-text-primary)' }}>
                          {meta?.label ?? feature}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                          {meta?.desc}
                        </div>
                      </td>
                      {roleNames.map(roleName => {
                        const enabled = local[roleName]?.[feature] ?? false;
                        return (
                          <td key={roleName} style={{ textAlign: 'center' }}>
                            <button
                              className={`perm-toggle ${enabled ? 'perm-toggle--on' : ''}`}
                              onClick={() => toggle(roleName, feature)}
                              title={enabled ? 'Désactiver' : 'Activer'}
                            >
                              <span className="perm-toggle__thumb" />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
