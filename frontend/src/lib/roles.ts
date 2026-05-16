export type RoleGroup = 'direction' | 'dt' | 'terrain' | 'metreur' | 'comptable' | 'logistique' | 'lecture';

const ROLE_MAP: Record<string, RoleGroup> = {
  'direction':           'direction',
  'directeur-technique': 'dt',
  'conducteur-travaux':  'terrain',
  'chef-chantier':       'terrain',
  'metreur-economiste':  'metreur',
  'comptable':           'comptable',
  'moyens-generaux':     'logistique',
  'lecture-seule':       'lecture',
};

export function getRoleGroup(slug: string): RoleGroup {
  return ROLE_MAP[slug] ?? 'lecture';
}

export const ROLE_ACCESS: Record<string, RoleGroup[]> = {
  '/':           ['direction', 'dt', 'terrain', 'metreur', 'comptable', 'logistique', 'lecture'],
  '/projects':   ['direction', 'dt', 'terrain', 'metreur', 'comptable', 'logistique', 'lecture'],
  '/map':        ['direction', 'dt', 'terrain', 'lecture'],
  '/timeline':   ['direction', 'dt', 'terrain'],
  '/dqe':        ['direction', 'dt', 'terrain', 'metreur'],
  '/execution':  ['direction', 'dt', 'terrain', 'metreur'],
  '/costs':      ['direction', 'dt', 'terrain', 'metreur', 'comptable'],
  '/accounting': ['direction', 'dt', 'comptable'],
  '/suppliers':  ['direction', 'dt', 'terrain', 'metreur', 'comptable', 'logistique'],
  '/achats':     ['direction', 'dt', 'terrain', 'metreur', 'logistique'],
  '/stocks':     ['direction', 'dt', 'terrain', 'logistique'],
  '/ged':        ['direction', 'dt', 'terrain', 'metreur', 'comptable', 'logistique', 'lecture'],
  '/qse':        ['direction', 'dt', 'terrain'],
  '/reporting':  ['direction', 'dt', 'metreur'],
  '/besoins':    ['direction', 'dt', 'terrain', 'metreur', 'logistique'],
  '/users':      ['direction'],
  '/operations': ['direction', 'dt'],
  '/tasks':      ['direction', 'dt', 'terrain', 'metreur', 'comptable', 'logistique'],
};

export function canAccess(path: string, group: RoleGroup): boolean {
  const allowed = ROLE_ACCESS[path];
  if (!allowed) return group === 'direction';
  return allowed.includes(group);
}

/** Activity types surfaced in the dashboard feed per role. Undefined = show all. */
export const ACTIVITY_FEED_FILTER: Partial<Record<RoleGroup, string[]>> = {
  logistique: ['document', 'site_visit', 'note', 'status_change'],
};

/** KPI items hidden per role group. */
export const KPI_HIDDEN_FOR: Partial<Record<string, RoleGroup[]>> = {
  'Budget engagé':        ['terrain', 'logistique'],
  "Taux d'engagement":    ['terrain', 'logistique'],
  'Budget prévisionnel':  ['terrain', 'logistique'],
};
