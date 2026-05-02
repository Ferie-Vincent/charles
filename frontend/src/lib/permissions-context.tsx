import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';
import { type RoleGroup } from './roles';

type FeatureMap = Record<string, boolean>;
type PermMatrix = Record<string, { label: string; features: FeatureMap }>;

interface PermissionsCtx {
  loaded: boolean;
  canAccess: (feature: string, group: RoleGroup) => boolean;
  matrix: PermMatrix;
  features: string[];
  reload: () => Promise<void>;
}

const Ctx = createContext<PermissionsCtx>({
  loaded: false,
  canAccess: () => true,
  matrix: {},
  features: [],
  reload: async () => {},
});

const ROLE_GROUPS: Record<string, RoleGroup> = {
  'conducteur-travaux':  'terrain',
  'chef-chantier':       'terrain',
  'metreur-economiste':  'gestion',
  'comptable':           'gestion',
  'lecture-seule':       'lecture',
};

// Map: group → which role names represent it
const GROUP_ROLES: Record<RoleGroup, string[]> = {
  direction: [],
  terrain:   ['conducteur-travaux', 'chef-chantier'],
  gestion:   ['metreur-economiste', 'comptable'],
  lecture:   ['lecture-seule'],
};

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [matrix, setMatrix]   = useState<PermMatrix>({});
  const [features, setFeatures] = useState<string[]>([]);
  const [loaded, setLoaded]   = useState(false);

  async function load() {
    try {
      const res = await api.get('/permissions');
      setMatrix(res.data.matrix);
      setFeatures(res.data.features);
    } catch {
      // non-direction users can't fetch — use empty matrix (will fall back to hardcoded)
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => { load(); }, []);

  function canAccess(feature: string, group: RoleGroup): boolean {
    if (group === 'direction') return true;

    const roleNames = GROUP_ROLES[group];
    // Check if any role in the group has this feature enabled
    return roleNames.some(roleName => {
      const roleData = matrix[roleName];
      return roleData?.features[feature] ?? false;
    });
  }

  return (
    <Ctx.Provider value={{ loaded, canAccess, matrix, features, reload: load }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePermissions() {
  return useContext(Ctx);
}
