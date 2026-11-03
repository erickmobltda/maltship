import type { Item } from '@/lib/catalog';
import type { AttributeDef } from '@/lib/niche-types';
import type { OwnedItem, Rating, RemovedItem } from '@/lib/types';

export const countUnits = (owned: Pick<OwnedItem, 'quantity'>[]) => owned.reduce((sum, o) => sum + o.quantity, 0);

export type Bucket = 'month' | 'week' | 'day';
/** Days as YYYY-MM-DD, which also sort in order. */
export interface DayRange {
  from: string;
  to: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const makeDay = (y: number, m: number, d: number) => {
  const date = new Date(y, m, d);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const parts = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return [y, m - 1, d] as const;
};
const dayCount = ({ from, to }: DayRange) => {
  const [a, b] = [from, to].map((day) => Date.UTC(...parts(day)));
  return Math.round((b - a) / 86_400_000) + 1;
};

/** The day on the user's calendar: an item added at night must not land on the next day. */
export const toDay = (when: Date | string) => {
  const date = new Date(when);
  return makeDay(date.getFullYear(), date.getMonth(), date.getDate());
};

/** The current month and the ones before it, up to today. */
export function lastMonths(months: number, now = new Date()): DayRange {
  return { from: makeDay(now.getFullYear(), now.getMonth() - months + 1, 1), to: toDay(now) };
}

/** A grouping that stays readable for the length of the range. */
export function defaultBucket(range: DayRange): Bucket {
  const days = dayCount(range);
  return days <= 31 ? 'day' : days <= 120 ? 'week' : 'month';
}

/** First and last day of the bucket holding `day`. Weeks run Monday to Sunday. */
function bucketBounds(day: string, bucket: Bucket) {
  const [y, m, d] = parts(day);
  if (bucket === 'day') return { start: day, end: day };
  if (bucket === 'month') return { start: makeDay(y, m, 1), end: makeDay(y, m + 1, 0) };
  const monday = d - ((new Date(y, m, d).getDay() + 6) % 7);
  return { start: makeDay(y, m, monday), end: makeDay(y, m, monday + 6) };
}

/**
 * Items added and removed per bucket, oldest first. Buckets with none count 0; the first and last are cut to the range.
 * A removed item still counts as added in its own bucket.
 */
export function activitySeries(owned: Pick<OwnedItem, 'addedAt'>[], removed: Pick<RemovedItem, 'addedAt' | 'removedAt'>[], range: DayRange, bucket: Bucket) {
  const { from, to } = range;
  const counts = new Map<string, { start: string; end: string; added: number; removed: number }>();
  for (let start = from; start <= to; ) {
    const { end } = bucketBounds(start, bucket);
    counts.set(start, { start, end: end < to ? end : to, added: 0, removed: 0 });
    const [y, m, d] = parts(end);
    start = makeDay(y, m, d + 1);
  }
  const entryOf = (when: string) => {
    const day = toDay(when);
    if (day < from || day > to) return undefined;
    const { start } = bucketBounds(day, bucket);
    return counts.get(start < from ? from : start);
  };
  for (const o of [...owned, ...removed]) {
    const entry = entryOf(o.addedAt);
    if (entry) entry.added++;
  }
  for (const r of removed) {
    const entry = entryOf(r.removedAt);
    if (entry) entry.removed++;
  }
  return [...counts.values()];
}

/** The oldest day with any activity, to keep a custom range from covering empty decades. */
export function earliestDay(owned: Pick<OwnedItem, 'addedAt'>[], removed: Pick<RemovedItem, 'addedAt' | 'removedAt'>[], now = new Date()) {
  const days = [...owned, ...removed].map((o) => toDay(o.addedAt)).concat(removed.map((r) => toDay(r.removedAt)), toDay(now));
  return days.reduce((a, b) => (b < a ? b : a));
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
