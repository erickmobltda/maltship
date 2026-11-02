import type { Item } from '@/lib/catalog';
import type { AttributeDef } from '@/lib/niche-types';
import type { OwnedItem, Rating } from '@/lib/types';

export const countUnits = (owned: Pick<OwnedItem, 'quantity'>[]) => owned.reduce((sum, o) => sum + o.quantity, 0);

/** Items added per month, oldest first, ending in the current month. Months with none count 0. */
export function monthlyAdded(owned: Pick<OwnedItem, 'addedAt'>[], now = new Date(), months = 12) {
  const counts = new Map<string, number>();
  for (let i = months - 1; i >= 0; i--) {
    counts.set(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7), 0);
  }
  for (const o of owned) {
    const month = o.addedAt.slice(0, 7);
    const count = counts.get(month);
    if (count !== undefined) counts.set(month, count + 1);
  }
  return [...counts.entries()].map(([month, count]) => ({ month, count }));
}

/** The attribute values most items share. A value on a single item is not "in common". */
export function topTraits(items: Pick<Item, 'attrs'>[], attributes: AttributeDef[], limit = 3) {
  const traits: { attr: AttributeDef; value: string; count: number }[] = [];
  for (const attr of attributes) {
    if (attr.type === 'number' || !(attr.facet || attr.searchable)) continue;
    const counts = new Map<string, number>();
    for (const it of items) {
      const v = it.attrs[attr.key];
      for (const x of Array.isArray(v) ? new Set(v) : v == null || v === '' ? [] : [String(v)]) counts.set(x, (counts.get(x) ?? 0) + 1);
    }
    for (const [value, count] of counts) if (count >= 2) traits.push({ attr, value, count });
  }
  return traits.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)).slice(0, limit);
}

/** Average of my stars on the items I hold. `average` is null when none of them is rated. */
export function averageRating(owned: Pick<OwnedItem, 'itemId'>[], ratings: Pick<Rating, 'itemId' | 'stars'>[]) {
  const ids = new Set(owned.map((o) => o.itemId));
  const stars = ratings.filter((r) => ids.has(r.itemId)).map((r) => r.stars);
  return { average: stars.length ? stars.reduce((sum, s) => sum + s, 0) / stars.length : null, rated: stars.length };
}
