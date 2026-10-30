import { describe, expect, it } from 'vitest';
import { chunk, mergeFeeds } from './feed';

describe('following feed', () => {
  it('31 uids become 2 queries of at most 30', () => {
    const parts = chunk(Array.from({ length: 31 }, (_, i) => `u${i}`));
    expect(parts.map((p) => p.length)).toEqual([30, 1]);
  });

  it('merges chunks newest first, without duplicates, up to the limit', () => {
    const a = [{ id: '1', updatedAt: '2026-10-03' }, { id: '2', updatedAt: '2026-10-01' }];
    const b = [{ id: '3', updatedAt: '2026-10-02' }, { id: '1', updatedAt: '2026-10-03' }];
    expect(mergeFeeds([a, b], 2).map((r) => r.id)).toEqual(['1', '3']);
  });
});
