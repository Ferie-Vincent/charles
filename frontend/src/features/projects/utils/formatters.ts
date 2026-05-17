/** Fonctions de formatage pures pour les vues de détail de projet. */

export function formatBudget(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!isFinite(n) || isNaN(n)) return '—';
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' Mds FCFA';
  if (n >= 1_000_000)     return (n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' M FCFA';
  return n.toLocaleString('fr-FR') + ' FCFA';
}

export function getDaysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  const ms = new Date(endDate).getTime() - Date.now();
  return isNaN(ms) ? null : Math.ceil(ms / 86_400_000);
}

// Retourne { title: name, sub: '' } quand le séparateur ' – ' est absent.
export function splitHeroName(name: string): { title: string; sub: string } {
  const idx = name.indexOf(' – ');
  if (idx > -1) return { title: name.slice(0, idx), sub: name.slice(idx + 3) };
  return { title: name, sub: '' };
}
