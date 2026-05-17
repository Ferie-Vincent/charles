/**
 * RBAC — deux couches :
 *
 * 1. ROLE_MAP : slug DB (ex: "conducteur-travaux") → groupe frontend court (ex: "conducteur")
 *    Les slugs DB sont définis une fois dans RoleSeeder et ne changent jamais.
 *    Les groupes frontend sont utilisés dans le code React — plus courts et stables.
 *
 * 2. ROLE_ACCESS : route → groupes autorisés
 *    Contrôle l'affichage du sidebar ET la navigation (ProtectedRoute).
 *    Ne remplace pas les Policies Laravel côté backend — les deux doivent être cohérents.
 */

export type RoleGroup = 'direction' | 'dt' | 'conducteur' | 'terrain' | 'metreur' | 'comptable' | 'logistique' | 'lecture';

const ROLE_MAP: Record<string, RoleGroup> = {
  'direction':           'direction',
  'directeur-technique': 'dt',
  'conducteur-travaux':  'conducteur',
  'chef-chantier':       'terrain',
  'metreur-economiste':  'metreur',
  'comptable':           'comptable',
  'moyens-generaux':     'logistique',
  'lecture-seule':       'lecture',
};

/** Convertit le slug de rôle DB en groupe court utilisé dans le frontend. */
export function getRoleGroup(slug: string): RoleGroup {
  // Slug inconnu → lecture par sécurité (principe du moindre privilège)
  return ROLE_MAP[slug] ?? 'lecture';
}

/**
 * Routes accessibles par groupe de rôle.
 * Toute route non listée ici est accessible uniquement à "direction".
 * Ce tableau est la source de vérité pour le sidebar et les ProtectedRoute.
 */
export const ROLE_ACCESS: Record<string, RoleGroup[]> = {
  '/':           ['direction', 'dt', 'conducteur', 'terrain', 'metreur', 'comptable', 'logistique', 'lecture'],
  '/projects':   ['direction', 'dt', 'conducteur', 'terrain', 'metreur', 'comptable', 'logistique', 'lecture'],
  '/map':        ['direction', 'dt', 'conducteur', 'terrain', 'lecture'],
  '/timeline':   ['direction', 'dt', 'conducteur'],
  '/dqe':        ['direction', 'dt', 'conducteur', 'metreur'],
  '/execution':  ['direction', 'dt', 'conducteur', 'terrain', 'metreur'],
  '/costs':      ['direction', 'dt', 'conducteur', 'metreur', 'comptable'],
  '/accounting': ['direction', 'dt', 'comptable'],
  '/suppliers':  ['direction', 'dt', 'conducteur', 'metreur', 'comptable', 'logistique'],
  '/achats':     ['direction', 'dt', 'conducteur', 'terrain', 'metreur', 'logistique'],
  '/stocks':     ['direction', 'dt', 'conducteur', 'terrain', 'logistique'],
  '/ged':        ['direction', 'dt', 'conducteur', 'terrain', 'metreur', 'comptable', 'logistique', 'lecture'],
  '/qse':        ['direction', 'dt', 'conducteur'],
  '/reporting':  ['direction', 'dt', 'conducteur', 'metreur'],
  '/besoins':    ['direction', 'dt', 'conducteur', 'terrain', 'metreur', 'logistique'],
  '/users':      ['direction'],
  '/operations': ['direction', 'dt'],
  '/tasks':      ['direction', 'dt', 'conducteur', 'terrain', 'metreur', 'comptable', 'logistique'],
};

/** Vérifie si un groupe a accès à un chemin. Inconnu → direction only. */
export function canAccess(path: string, group: RoleGroup): boolean {
  const allowed = ROLE_ACCESS[path];
  if (!allowed) return group === 'direction';
  return allowed.includes(group);
}

/** Types d'activité visibles dans le fil dashboard selon le rôle. Undefined = tout afficher. */
export const ACTIVITY_FEED_FILTER: Partial<Record<RoleGroup, string[]>> = {
  logistique: ['document', 'site_visit', 'note', 'status_change'],
};

/** KPIs masqués selon le groupe — évite d'exposer les données financières au terrain. */
export const KPI_HIDDEN_FOR: Partial<Record<string, RoleGroup[]>> = {
  'Budget engagé':        ['terrain', 'logistique'],
  "Taux d'engagement":    ['terrain', 'logistique'],
  'Budget prévisionnel':  ['terrain', 'logistique'],
};
