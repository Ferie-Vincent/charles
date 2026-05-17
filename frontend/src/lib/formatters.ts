/** Shared formatting utilities — always fr-FR locale, XOF/FCFA currency. */

type Numeric = number | string | null | undefined;
const toNum = (n: Numeric): number => { const v = Number(n); return isFinite(v) ? v : 0; };

/** Compact FCFA: 1 500 000 → "1.5 M FCFA", 1 500 000 000 → "1.50 Mds FCFA" */
export function fmtFCFA(n: Numeric): string {
  const v = toNum(n);
  if (v >= 1_000_000_000)
    return (v / 1_000_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' Mds FCFA';
  if (v >= 1_000_000)
    return (v / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' M FCFA';
  return v.toLocaleString('fr-FR') + ' FCFA';
}

/** Compact without currency suffix: 1 500 000 → "1.5 M", 50 000 → "50 k" */
export function fmtCompact(n: Numeric): string {
  const v = toNum(n);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)} k`;
  return `${v.toFixed(0)}`;
}

/** Full FCFA with fr-FR thousands: 1 500 000 → "1 500 000 FCFA" */
export function fmtFCFAFull(n: Numeric): string {
  return toNum(n).toLocaleString('fr-FR') + ' FCFA';
}

/** Compact no-suffix for KPI bar values: 6_300_000_000 → "6,3 Mds" */
export function fmtKpi(n: Numeric): string {
  const v = toNum(n);
  if (v >= 1_000_000_000)
    return (v / 1_000_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' Mds';
  if (v >= 1_000_000)
    return (v / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' M';
  return v.toLocaleString('fr-FR');
}

/** fr-FR thousands, no currency: 1 500 000 → "1 500 000" */
export function fmtNum(n: Numeric): string {
  return toNum(n).toLocaleString('fr-FR');
}

/** fr-FR number, rounded to whole units (for DQE HT amounts) */
export function fmtHT(n: Numeric): string {
  return toNum(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
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
export function fmtBytes(bytes: Numeric): string {
  const v = toNum(bytes);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')} Mo`;
  return `${Math.round(v / 1_000)} Ko`;
}
