import { describe, expect, it } from 'vitest';
import type { AttributeDef } from '@/lib/niche-types';
import { activitySeries, averageRating, countUnits, defaultBucket, defaultPeriod, earliestDay, lastMonths, toDay, topTraits } from './collectionStats';

describe('countUnits', () => {
  it('adds the quantities', () => {
    expect(countUnits([{ quantity: 3 }, { quantity: 1 }])).toBe(4);
    expect(countUnits([])).toBe(0);
  });
});

describe('activity', () => {
  // Local times, so these hold in any time zone.
  const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString();
  const now = new Date(2026, 2, 15, 12);
  const rows = (series: ReturnType<typeof activitySeries>) => series.map((b) => [b.start, b.end, b.added, b.removed]);

  it('picks month ranges up to today, crossing the year', () => {
    expect(lastMonths(12, now)).toEqual({ from: '2025-04-01', to: '2026-03-15' });
    expect(lastMonths(4, now)).toEqual({ from: '2025-12-01', to: '2026-03-15' });
    expect(lastMonths(1, now)).toEqual({ from: '2026-03-01', to: '2026-03-15' });
  });
  it('picks a grouping that suits the range', () => {
    expect(defaultBucket(lastMonths(12, now))).toBe('month');
    expect(defaultBucket(lastMonths(6, now))).toBe('month');
    expect(defaultBucket(lastMonths(3, now))).toBe('week');
    expect(defaultBucket(lastMonths(1, now))).toBe('day');
  });
  it('opens on the shortest period with activity', () => {
    const periods = [12, 6, 3, 1] as const;
    const added = (m: number, d = 10) => [{ addedAt: at(2026, m, d) }];
    expect(defaultPeriod(periods, [], [], now)).toBe(1);
    expect(defaultPeriod(periods, added(3), [], now)).toBe(1);
    expect(defaultPeriod(periods, added(2, 28), [], now)).toBe(3);
    expect(defaultPeriod(periods, [{ addedAt: at(2025, 11, 10) }], [], now)).toBe(6);
    expect(defaultPeriod(periods, [{ addedAt: at(2025, 5, 10) }], [], now)).toBe(12);
    expect(defaultPeriod(periods, [], [{ addedAt: at(2020, 1, 1), removedAt: at(2026, 3, 2) }], now)).toBe(1);
    expect(defaultPeriod(periods, [{ addedAt: at(2020, 1, 1) }], [], now)).toBe(1);
  });
  it('counts each item in its month and ignores older ones', () => {
    const owned = [{ addedAt: at(2026, 3, 1) }, { addedAt: at(2026, 3, 14, 23) }, { addedAt: at(2026, 1, 10) }, { addedAt: at(2020, 1, 10) }];
    expect(rows(activitySeries(owned, [], lastMonths(3, now), 'month'))).toEqual([
      ['2026-01-01', '2026-01-31', 1, 0],
      ['2026-02-01', '2026-02-28', 0, 0],
      ['2026-03-01', '2026-03-15', 2, 0],
    ]);
  });
  it('counts a removed item when it left and when it arrived', () => {
    const removed = [
      { addedAt: at(2026, 1, 10), removedAt: at(2026, 3, 2) },
      { addedAt: at(2020, 1, 10), removedAt: at(2026, 2, 2) },
      { addedAt: at(2020, 1, 10), removedAt: at(2020, 2, 2) },
    ];
    expect(rows(activitySeries([], removed, lastMonths(3, now), 'month'))).toEqual([
      ['2026-01-01', '2026-01-31', 1, 0],
      ['2026-02-01', '2026-02-28', 0, 1],
      ['2026-03-01', '2026-03-15', 0, 1],
    ]);
  });
  it('groups by Monday-to-Sunday weeks, cutting the first and last to the range', () => {
    // 2026-03-04 is a Wednesday, 2026-03-17 a Tuesday.
    const owned = [{ addedAt: at(2026, 3, 4) }, { addedAt: at(2026, 3, 8) }, { addedAt: at(2026, 3, 9) }, { addedAt: at(2026, 3, 17) }, { addedAt: at(2026, 3, 18) }];
    expect(rows(activitySeries(owned, [], { from: '2026-03-04', to: '2026-03-17' }, 'week'))).toEqual([
      ['2026-03-04', '2026-03-08', 2, 0],
      ['2026-03-09', '2026-03-15', 1, 0],
      ['2026-03-16', '2026-03-17', 1, 0],
    ]);
  });
  it('has one row per day, keeping late-night items on their own day', () => {
    const owned = [{ addedAt: at(2026, 3, 2, 23) }];
    expect(rows(activitySeries(owned, [], { from: '2026-03-02', to: '2026-03-03' }, 'day'))).toEqual([
      ['2026-03-02', '2026-03-02', 1, 0],
      ['2026-03-03', '2026-03-03', 0, 0],
    ]);
    expect(toDay(at(2026, 3, 2, 23))).toBe('2026-03-02');
  });
  it('allows a range of one day, grouped any way', () => {
    expect(rows(activitySeries([], [], { from: '2026-03-02', to: '2026-03-02' }, 'month'))).toEqual([['2026-03-02', '2026-03-02', 0, 0]]);
  });
  it('finds the oldest day with activity, or today', () => {
    expect(earliestDay([], [], now)).toBe('2026-03-15');
    expect(earliestDay([{ addedAt: at(2026, 2, 1) }], [{ addedAt: at(2025, 5, 1), removedAt: at(2026, 1, 1) }], now)).toBe('2025-05-01');
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
