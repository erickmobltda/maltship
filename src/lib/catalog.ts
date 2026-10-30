import { useQuery } from '@tanstack/react-query';
import type { AttributeDef, NicheConfig } from '@/lib/niche-types';
import { niche } from '@/niche/config';

export type AttrValue = string | number | string[] | null;

export interface Item {
  id: string;
  name: string;
  /** Critic scores (empty when the niche has none). */
  scores: number[];
  image: number | null;
  attrs: Record<string, AttrValue>;
  /** Lower-cased, accent-free text used by search. */
  haystack: string;
  bestScore: number | null;
}

export interface CatalogFile {
  keys: string[];
  rows: unknown[][];
}

export interface Filters {
  text: string;
  facets: Record<string, string>;
  minScore: number;
}

export const NO_FILTERS: Filters = { text: '', facets: {}, minScore: 0 };

export function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const asText = (v: AttrValue) => (Array.isArray(v) ? v.join(' ') : v == null ? '' : String(v));

export function decodeCatalog(file: CatalogFile, config: NicheConfig = niche): Item[] {
  const searchable = config.attributes.filter((a) => a.searchable).map((a) => a.key);
  return file.rows.map((row) => {
    const raw = Object.fromEntries(file.keys.map((k, i) => [k, row[i]])) as Record<string, unknown>;
    const attrs = Object.fromEntries(config.attributes.map((a) => [a.key, (raw[a.key] ?? null) as AttrValue]));
    const scores = (raw.scores as number[] | undefined) ?? [];
    const name = String(raw.name);
    return {
      id: String(raw.id),
      name,
      scores,
      image: (raw.image as number | null | undefined) ?? null,
      attrs,
      haystack: fold([name, ...searchable.map((k) => asText(attrs[k]))].join(' ')),
      bestScore: scores.length ? Math.max(...scores) : null,
    };
  });
}

const matchesFacet = (value: AttrValue, wanted: string) => (Array.isArray(value) ? value.includes(wanted) : asText(value) === wanted);

export function search(items: Item[], f: Filters): Item[] {
  const words = fold(f.text).split(/\s+/).filter(Boolean);
  const facets = Object.entries(f.facets).filter(([, v]) => v);
  return items.filter(
    (it) =>
      words.every((w) => it.haystack.includes(w)) &&
      facets.every(([k, v]) => matchesFacet(it.attrs[k], v)) &&
      (!f.minScore || (it.bestScore ?? 0) >= f.minScore),
  );
}

/** Best score first, then items with an image, then by name. */
export function sortResults(items: Item[]): Item[] {
  return [...items].sort(
    (a, b) => (b.bestScore ?? 0) - (a.bestScore ?? 0) || Number(!!b.image) - Number(!!a.image) || a.name.localeCompare(b.name),
  );
}

/** Distinct values of an attribute, most common first; list attributes count each value once per item. */
export function facetValues(items: Item[], key: string, limit = 30): string[] {
  const counts = new Map<string, number>();
  for (const it of items) {
    const v = it.attrs[key];
    for (const x of Array.isArray(v) ? new Set(v) : v == null || v === '' ? [] : [String(v)]) counts.set(x, (counts.get(x) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([v]) => v);
}

export function filtersFromParams(params: URLSearchParams, config: NicheConfig = niche): Filters {
  const facets: Record<string, string> = {};
  for (const a of config.attributes) if (a.facet && params.get(a.key)) facets[a.key] = params.get(a.key)!;
  return { text: params.get('q') ?? '', facets, minScore: Number(params.get('score') ?? 0) };
}

export function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.text) p.set('q', f.text);
  for (const [k, v] of Object.entries(f.facets)) if (v) p.set(k, v);
  if (f.minScore) p.set('score', String(f.minScore));
  return p;
}

/** i18n key + options for one attribute value, or plain text when it isn't translated. */
export function attrDisplay(a: AttributeDef, v: AttrValue): { key: string; opts?: Record<string, unknown> } | { text: string } | null {
  if (v == null || v === '' || (Array.isArray(v) && !v.length)) return null;
  if (a.type === 'enum') return { key: `niche:enum.${a.key}.${v}` };
  if (a.type === 'number' && v === 0 && a.zeroLabel) return { key: `niche:zero.${a.key}` };
  if (a.type === 'number' && a.unit) return { key: `core:unit.${a.unit}`, opts: { value: v } };
  return { text: Array.isArray(v) ? v.join(', ') : String(v) };
}

export function imageUrl(item: Pick<Item, 'image'>): string | null {
  const base = import.meta.env.VITE_IMAGES_BASE || niche.image.base;
  return item.image && base ? `${base}/${item.image}.webp` : null;
}

async function loadCatalog(): Promise<Map<string, Item>> {
  const res = await fetch(`${import.meta.env.BASE_URL}catalog.json`);
  if (!res.ok) throw new Error(`catalog.json ${res.status}`);
  return new Map(decodeCatalog((await res.json()) as CatalogFile).map((it) => [it.id, it]));
}

export function useCatalog() {
  return useQuery({ queryKey: ['catalog'], queryFn: loadCatalog, staleTime: Infinity, gcTime: Infinity });
}
