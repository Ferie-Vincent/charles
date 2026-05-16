import { describe, it, expect } from 'vitest';
import { formatBudget, getDaysRemaining, splitHeroName } from './formatters';

// ── formatBudget ─────────────────────────────────────────────────────────────

describe('formatBudget', () => {
  it('returns — for null', () => {
    expect(formatBudget(null)).toBe('—');
  });

  it('returns — for undefined', () => {
    expect(formatBudget(undefined)).toBe('—');
  });

  it('returns — for empty string', () => {
    expect(formatBudget('')).toBe('—');
  });

  it('returns — for non-numeric string', () => {
    expect(formatBudget('abc')).toBe('—');
  });

  it('returns — for NaN coerced string', () => {
    expect(formatBudget('12abc')).toBe('—');
  });

  it('formats millions correctly', () => {
    const result = formatBudget(85_000_000);
    expect(result).toContain('M FCFA');
    expect(result).toContain('85');
  });

  it('formats milliards correctly', () => {
    const result = formatBudget(2_500_000_000);
    expect(result).toContain('Mds FCFA');
    expect(result).toContain('2');
  });

  it('formats small amount without scale suffix', () => {
    const result = formatBudget(500_000);
    expect(result).toContain('FCFA');
    expect(result).not.toContain('M FCFA');
  });

  it('accepts numeric string', () => {
    expect(formatBudget('1000000')).toContain('M FCFA');
  });
});

// ── splitHeroName ─────────────────────────────────────────────────────────────

describe('splitHeroName', () => {
  it('splits on " – " separator', () => {
    const result = splitHeroName('CH-001 – Villa Angre');
    expect(result.title).toBe('CH-001');
    expect(result.sub).toBe('Villa Angre');
  });

  it('returns full name as title when separator absent', () => {
    const result = splitHeroName('Villa Angre sans code');
    expect(result.title).toBe('Villa Angre sans code');
    expect(result.sub).toBe('');
  });

  it('handles empty string', () => {
    const result = splitHeroName('');
    expect(result.title).toBe('');
    expect(result.sub).toBe('');
  });

  it('does not split on simple hyphen', () => {
    const result = splitHeroName('Projet-Alpha');
    expect(result.title).toBe('Projet-Alpha');
    expect(result.sub).toBe('');
  });

  it('uses only first separator occurrence', () => {
    const result = splitHeroName('CH-001 – Villa – Angre');
    expect(result.title).toBe('CH-001');
    expect(result.sub).toBe('Villa – Angre');
  });
});

// ── getDaysRemaining ─────────────────────────────────────────────────────────

describe('getDaysRemaining', () => {
  it('returns null for null input', () => {
    expect(getDaysRemaining(null)).toBeNull();
  });

  it('returns null for invalid date string', () => {
    expect(getDaysRemaining('not-a-date')).toBeNull();
  });

  it('returns positive number for future date', () => {
    const future = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    const result = getDaysRemaining(future);
    expect(result).toBeGreaterThan(0);
  });

  it('returns negative number for past date', () => {
    const past = new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10);
    const result = getDaysRemaining(past);
    expect(result).toBeLessThan(0);
  });
});
