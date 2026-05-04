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

const GROUP_ROLES: Record<RoleGroup, string[]> = {
  direction:  [],
  dt:         ['directeur-technique'],
  terrain:    ['conducteur-travaux', 'chef-chantier'],
  metreur:    ['metreur-economiste'],
  comptable:  ['comptable'],
  logistique: ['moyens-generaux'],
  lecture:    ['lecture-seule'],
};

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [matrix, setMatrix]         = useState<PermMatrix>({});
  const [features, setFeatures]     = useState<string[]>([]);
  const [myFeatures, setMyFeatures] = useState<FeatureMap>({});
  const [loaded, setLoaded]         = useState(false);

  async function load() {
    const [myRes, matrixRes] = await Promise.allSettled([
      api.get('/my-permissions'),
      api.get('/permissions'),
    ]);

    if (myRes.status === 'fulfilled') setMyFeatures(myRes.value.data.features ?? {});
    if (matrixRes.status === 'fulfilled') {
      setMatrix(matrixRes.value.data.matrix);
      setFeatures(matrixRes.value.data.features);
    }

    setLoaded(true);
  }

  useEffect(() => { load(); }, []);

  function canAccess(feature: string, group: RoleGroup): boolean {
    // direction and dt are LOCKED roles — all features enabled at backend level
    if (group === 'direction' || group === 'dt') return true;
    // Use own features map (loaded via /my-permissions for all roles)
    if (Object.keys(myFeatures).length > 0) {
      return myFeatures[feature] ?? false;
    }
    // Fallback: check matrix (direction admin view)
    const roleNames = GROUP_ROLES[group];
    return roleNames.some(roleName => matrix[roleName]?.features[feature] ?? false);
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
