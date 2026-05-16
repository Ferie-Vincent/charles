/** Shared formatting utilities — always fr-FR locale, XOF/FCFA currency. */

/** Compact FCFA: 1 500 000 → "1.5 M FCFA", 1 500 000 000 → "1.50 Mds FCFA" */
export function fmtFCFA(n: number): string {
  if (n >= 1_000_000_000)
    return (n / 1_000_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' Mds FCFA';
  if (n >= 1_000_000)
    return (n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' M FCFA';
  return n.toLocaleString('fr-FR') + ' FCFA';
}

/** Compact without currency suffix: 1 500 000 → "1.5 M", 50 000 → "50 k" */
export function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)} k`;
  return `${n.toFixed(0)}`;
}

/** Full FCFA with fr-FR thousands: 1 500 000 → "1 500 000 FCFA" */
export function fmtFCFAFull(n: number): string {
  return Number(n).toLocaleString('fr-FR') + ' FCFA';
}

/** Compact no-suffix for KPI bar values: 6_300_000_000 → "6,3 Mds" */
export function fmtKpi(n: number): string {
  if (n >= 1_000_000_000)
    return (n / 1_000_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' Mds';
  if (n >= 1_000_000)
    return (n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' M';
  return n.toLocaleString('fr-FR');
}

/** fr-FR thousands, no currency: 1 500 000 → "1 500 000" */
export function fmtNum(n: number): string {
  return Number(n).toLocaleString('fr-FR');
}

/** fr-FR number, rounded to whole units (for DQE HT amounts) */
export function fmtHT(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
}

/** Short date: "15 mai 2026" */
export function fmtDate(d: string | null | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Long date with time: "15 mai 2026 à 14:30" */
export function fmtDateLong(d: string | null | undefined): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Long date without time: "15 mai 2026" (month written out) */
export function fmtDateFull(d: string | null | undefined): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** File size: "1,5 Mo" for ≥ 1MB, "512 Ko" otherwise */
export function fmtBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1).replace('.', ',')} Mo`;
  return `${Math.round(bytes / 1_000)} Ko`;
}
