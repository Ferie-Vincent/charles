export type RoleGroup = 'direction' | 'terrain' | 'gestion' | 'logistique' | 'lecture';

const ROLE_MAP: Record<string, RoleGroup> = {
  'direction':           'direction',
  'directeur-technique': 'direction',
  'conducteur-travaux':  'terrain',
  'chef-chantier':       'terrain',
  'metreur-economiste':  'gestion',
  'comptable':           'gestion',
  'moyens-generaux':     'logistique',
  'lecture-seule':       'lecture',
};

export function getRoleGroup(slug: string): RoleGroup {
  return ROLE_MAP[slug] ?? 'lecture';
}

export const ROLE_ACCESS: Record<string, RoleGroup[]> = {
  '/':          ['direction', 'terrain', 'gestion', 'lecture'],
  '/projects':  ['direction', 'terrain', 'gestion', 'lecture'],
  '/map':       ['direction', 'terrain', 'lecture'],
  '/timeline':  ['direction', 'terrain'],
  '/dqe':       ['direction', 'gestion'],
  '/execution': ['direction', 'gestion'],
  '/costs':       ['direction', 'gestion'],
  '/accounting':  ['direction', 'gestion'],
  '/suppliers':   ['direction', 'gestion', 'logistique'],
  '/achats':      ['direction', 'gestion', 'logistique'],
  '/stocks':      ['direction', 'gestion', 'logistique'],
  '/qse':         ['direction', 'terrain'],
  '/reporting': ['direction', 'gestion'],
  '/users':     ['direction'],
};

export function canAccess(path: string, group: RoleGroup): boolean {
  const allowed = ROLE_ACCESS[path];
  if (!allowed) return group === 'direction';
  return allowed.includes(group);
}
