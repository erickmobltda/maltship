import { describe, expect, it } from 'vitest';
import type { NicheConfig } from './niche-types';
import { decodeCatalog, facetValues, filtersFromParams, filtersToParams, search, sortResults, NO_FILTERS } from './catalog';

const config: NicheConfig = {
  niche: 'test',
  app: 'test',
  idPrefix: 'x',
  attributes: [
    { key: 'maker', type: 'text', searchable: true, facet: 'select' },
    { key: 'kind', type: 'enum', enumValues: ['a', 'b'], facet: 'chips' },
    { key: 'notes', type: 'list', facet: 'select' },
    { key: 'secret', type: 'text' },
  ],
  ratingTags: [],
  owned: { quantity: true, maxQuantity: 9 },
  ageGate: false,
  image: { aspect: '1 / 1' },
};

const file = {
  keys: ['id', 'name', 'maker', 'kind', 'notes', 'secret', 'scores', 'image'],
  rows: [
    ['x1', 'Château Ème', 'Maison', 'a', ['oak', 'fruit'], 'hidden', [90, 94], null],
    ['x2', 'Plain One', 'Other', 'b', ['oak'], '', [], 7],
    ['x3', 'Zed', 'Maison', 'b', [], '', [88], null],
  ],
};
const items = decodeCatalog(file, config);

describe('catalog', () => {
  it('decodes the compact format into items with best score', () => {
    expect(items.map((i) => i.id)).toEqual(['x1', 'x2', 'x3']);
    expect(items[0].attrs.maker).toBe('Maison');
    expect(items[0].bestScore).toBe(94);
    expect(items[1].bestScore).toBeNull();
    expect(items[1].image).toBe(7);
  });

  it('search ignores accents and case and needs every word', () => {
    expect(search(items, { ...NO_FILTERS, text: 'chateau eme' }).map((i) => i.id)).toEqual(['x1']);
    expect(search(items, { ...NO_FILTERS, text: 'MAISON' }).map((i) => i.id)).toEqual(['x1', 'x3']);
    expect(search(items, { ...NO_FILTERS, text: 'maison plain' })).toEqual([]);
  });

  it('only searchable attributes are searched', () => {
    expect(search(items, { ...NO_FILTERS, text: 'hidden' })).toEqual([]);
  });

  it('facet filters narrow results, list attributes match by contained value', () => {
    expect(search(items, { ...NO_FILTERS, facets: { kind: 'b' } }).map((i) => i.id)).toEqual(['x2', 'x3']);
    expect(search(items, { ...NO_FILTERS, facets: { notes: 'oak' } }).map((i) => i.id)).toEqual(['x1', 'x2']);
    expect(search(items, { ...NO_FILTERS, facets: { kind: 'b', maker: 'Maison' } }).map((i) => i.id)).toEqual(['x3']);
  });

  it('min score filter', () => {
    expect(search(items, { ...NO_FILTERS, minScore: 90 }).map((i) => i.id)).toEqual(['x1']);
  });

  it('sorts by best score, then image, then name', () => {
    expect(sortResults(items).map((i) => i.id)).toEqual(['x1', 'x3', 'x2']);
  });

  it('facet values: most common first, list values counted once per item', () => {
    expect(facetValues(items, 'maker')).toEqual(['Maison', 'Other']);
    expect(facetValues(items, 'notes')).toEqual(['oak', 'fruit']);
  });

  it('filters round-trip through the URL', () => {
    const f = { text: 'oak', facets: { kind: 'a', maker: 'Maison' }, minScore: 90 };
    expect(filtersFromParams(filtersToParams(f), config)).toEqual(f);
    expect(filtersFromParams(new URLSearchParams('?unknown=1'), config)).toEqual(NO_FILTERS);
  });
});
