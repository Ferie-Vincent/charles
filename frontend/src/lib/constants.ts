/** Shared cross-feature constants — status labels, colors, badge configs. */

// ── Project ────────────────────────────────────────────────────────────────

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  en_preparation: 'En préparation',
  active:         'Actif',
  completed:      'Terminé',
  archived:       'Archivé',
};

export const PROJECT_STATUS_COLOR: Record<string, string> = {
  en_preparation: '#94a3b8',
  active:         '#10b981',
  completed:      '#3b7ddd',
  archived:       '#64748b',
};

// ── Invoice ────────────────────────────────────────────────────────────────

export type InvoiceStatusKey = 'brouillon' | 'soumise' | 'validee' | 'payee' | 'disputee';

export const INVOICE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  brouillon: { label: 'Brouillon', color: '#64748b', bg: '#f1f5f9' },
  soumise:   { label: 'Soumise',   color: '#f59e0b', bg: '#fef3c7' },
  validee:   { label: 'Validée',   color: '#3b7ddd', bg: '#dbeafe' },
  payee:     { label: 'Payée',     color: '#10b981', bg: '#d1fae5' },
  disputee:  { label: 'Disputée',  color: '#ef4444', bg: '#fee2e2' },
};

export const INVOICE_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(INVOICE_STATUS).map(([k, v]) => [k, v.label])
);

export const INVOICE_STATUS_COLOR: Record<string, string> = Object.fromEntries(
  Object.entries(INVOICE_STATUS).map(([k, v]) => [k, v.color])
);

// ── General expense (frais généraux siège) ────────────────────────────────

export const EXPENSE_STATUS_LABEL: Record<string, string> = {
  en_attente: 'En attente',
  approuvee:  'Approuvée',
  rejetee:    'Rejetée',
};

export const EXPENSE_STATUS_COLOR: Record<string, string> = {
  en_attente: '#f59e0b',
  approuvee:  '#10b981',
  rejetee:    '#ef4444',
};
