import { describe, expect, it } from 'vitest';
import { cleanHandle, isValidHandle, ratingProblems } from './validation';

const ok = { stars: 4.5, tags: ['a'], notes: 'n', experiencedOn: '2026-10-30' };

describe('validation (mirrors the Firestore rules)', () => {
  it('handles: 3–20 of a–z, 0–9, _', () => {
    expect(isValidHandle('ab_1')).toBe(true);
    expect(isValidHandle('ab')).toBe(false);
    expect(isValidHandle('Abc')).toBe(false);
    expect(isValidHandle('a'.repeat(21))).toBe(false);
    expect(cleanHandle('@Erick M.')).toBe('erickm');
  });

  it('ratings: half-star steps, ≤ 6 tags, ≤ 1000 chars, a YYYY-MM-DD date', () => {
    expect(ratingProblems(ok)).toEqual([]);
    expect(ratingProblems({ ...ok, stars: 2.3 })).toEqual(['stars']);
    expect(ratingProblems({ ...ok, stars: 0 })).toEqual(['stars']);
    expect(ratingProblems({ ...ok, tags: ['1', '2', '3', '4', '5', '6', '7'] })).toEqual(['tags']);
    expect(ratingProblems({ ...ok, notes: 'x'.repeat(1001) })).toEqual(['notes']);
    expect(ratingProblems({ ...ok, experiencedOn: 'today' })).toEqual(['experiencedOn']);
  });
});
