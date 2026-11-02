import { describe, expect, it } from 'vitest';
import type { AttributeDef } from '@/lib/niche-types';
import { averageRating, countUnits, monthlyActivity, topTraits } from './collectionStats';

describe('countUnits', () => {
  it('adds the quantities', () => {
    expect(countUnits([{ quantity: 3 }, { quantity: 1 }])).toBe(4);
    expect(countUnits([])).toBe(0);
  });
});

describe('monthlyActivity', () => {
  const now = new Date('2026-03-15T12:00:00Z');
  it('covers the months up to the current one, crossing the year', () => {
    expect(monthlyActivity([], [], now, 4).map((m) => m.month)).toEqual(['2025-12', '2026-01', '2026-02', '2026-03']);
  });
  it('counts each item in its month and ignores older ones', () => {
    const owned = [{ addedAt: '2026-03-01T00:00:00Z' }, { addedAt: '2026-03-31T23:00:00Z' }, { addedAt: '2026-01-10T00:00:00Z' }, { addedAt: '2020-01-10T00:00:00Z' }];
    expect(monthlyActivity(owned, [], now, 3)).toEqual([
      { month: '2026-01', added: 1, removed: 0 },
      { month: '2026-02', added: 0, removed: 0 },
      { month: '2026-03', added: 2, removed: 0 },
    ]);
  });
  it('counts a removed item when it left and when it arrived', () => {
    const removed = [
      { addedAt: '2026-01-10T00:00:00Z', removedAt: '2026-03-02T00:00:00Z' },
      { addedAt: '2020-01-10T00:00:00Z', removedAt: '2026-02-02T00:00:00Z' },
      { addedAt: '2020-01-10T00:00:00Z', removedAt: '2020-02-02T00:00:00Z' },
    ];
    expect(monthlyActivity([], removed, now, 3)).toEqual([
      { month: '2026-01', added: 1, removed: 0 },
      { month: '2026-02', added: 0, removed: 1 },
      { month: '2026-03', added: 0, removed: 1 },
    ]);
  });
});

describe('topTraits', () => {
  const attributes: AttributeDef[] = [
    { key: 'origin', type: 'text', facet: 'select' },
    { key: 'maker', type: 'text', searchable: true },
    { key: 'notes', type: 'list', facet: 'select' },
    { key: 'hidden', type: 'text' },
    { key: 'weight', type: 'number', facet: 'chips' },
  ];
  const item = (attrs: Record<string, string | number | string[] | null>) => ({ attrs });

  it('ranks shared values and keeps the three biggest', () => {
    const items = [
      item({ origin: 'A', maker: 'X', notes: ['p', 'q'] }),
      item({ origin: 'A', maker: 'X', notes: ['p', 'q'] }),
      item({ origin: 'A', maker: 'Y', notes: ['p'] }),
      item({ origin: 'B', maker: 'Y', notes: [] }),
    ];
    expect(topTraits(items, attributes).map((x) => [x.attr.key, x.value, x.count])).toEqual([
      ['origin', 'A', 3],
      ['notes', 'p', 3],
      ['notes', 'q', 2],
    ]);
  });
  it('skips single items, empty values, numbers and non-filter attributes', () => {
    const items = [item({ origin: 'A', maker: '', hidden: 'H', weight: 5 }), item({ origin: 'B', maker: null, hidden: 'H', weight: 5 })];
    expect(topTraits(items, attributes)).toEqual([]);
  });
  it('counts a repeated list value once per item', () => {
    expect(topTraits([item({ notes: ['p', 'p'] })], attributes)).toEqual([]);
  });
});

describe('averageRating', () => {
  const owned = [{ itemId: 'a' }, { itemId: 'b' }, { itemId: 'c' }];
  it('averages only the items held', () => {
    expect(averageRating(owned, [{ itemId: 'a', stars: 4 }, { itemId: 'b', stars: 5 }, { itemId: 'z', stars: 1 }])).toEqual({ average: 4.5, rated: 2 });
  });
  it('is null when nothing held is rated', () => {
    expect(averageRating(owned, [{ itemId: 'z', stars: 1 }])).toEqual({ average: null, rated: 0 });
  });
});
