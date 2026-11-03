import { describe, expect, it } from 'vitest';
import type { AttributeDef, NicheConfig } from './niche-types';
import { attrDisplay, avgStars, decodeCatalog, decodeItemStats, facetValues, filtersFromParams, filtersToParams, search, sortResults, NO_FILTERS } from './catalog';

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

  it('reads the image background colour, which older catalogs do not have', () => {
    expect(items[1].imageBg).toBeNull();
    const withBg = decodeCatalog({ keys: ['id', 'name', 'image', 'imageBg'], rows: [['x1', 'A', 7, '#fefefe'], ['x2', 'B', 8, null]] }, config);
    expect(withBg.map((i) => i.imageBg)).toEqual(['#fefefe', null]);
  });

  it('reads the photo credit, which older catalogs do not have', () => {
    expect(items[0].imageCredit).toBeNull();
    const withCredit = decodeCatalog(
      { keys: ['id', 'name', 'image', 'imageCredit'], rows: [['x1', 'A', 7, ['Ann', 'CC BY-SA 3.0', 'https://e.org/a']], ['x2', 'B', 8, null]] },
      config,
    );
    expect(withCredit.map((i) => i.imageCredit)).toEqual([{ author: 'Ann', license: 'CC BY-SA 3.0', url: 'https://e.org/a' }, null]);
  });

  it('translates every value of a list with fixed values, and leaves free lists as text', () => {
    const fixed: AttributeDef = { key: 'notes', type: 'list', enumValues: ['oak', 'fruit'] };
    const key = (v: string) => `niche:enum.notes.${v}`;
    expect(attrDisplay(fixed, ['oak', 'fruit'])).toEqual({ keys: [key('oak'), key('fruit')] });
    expect(attrDisplay(fixed, 'oak')).toEqual({ key: key('oak') });
    expect(attrDisplay({ key: 'notes', type: 'list' }, ['oak', 'fruit'])).toEqual({ text: 'oak, fruit' });
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

  it('sorts by popularity, keeping featured order for items without the number', () => {
    const stats = decodeItemStats({ items: { x2: { owned: 5, ratings: 2, starsSum: 8 }, x3: { owned: 9, ratings: 4, starsSum: 16 } } });
    expect(sortResults(items, 'owned', stats).map((i) => i.id)).toEqual(['x3', 'x2', 'x1']);
    expect(sortResults(items, 'stars', stats).map((i) => i.id)).toEqual(['x3', 'x2', 'x1']);
    expect(sortResults(items, 'wished', stats).map((i) => i.id)).toEqual(['x1', 'x3', 'x2']);
  });

  it('falls back to featured order when a popularity sort has no stats', () => {
    expect(sortResults(items, 'owned', null).map((i) => i.id)).toEqual(['x1', 'x3', 'x2']);
  });

  it('reads the stats document, treating anything missing or odd as no data', () => {
    const stats = decodeItemStats({ items: { a: { owned: 3, wished: 0, ratings: 'many' }, b: null } });
    expect(stats.get('a')).toEqual({ owned: 3 });
    expect(stats.get('b')).toEqual({});
    expect(decodeItemStats({}).size).toBe(0);
    expect(decodeItemStats(undefined).size).toBe(0);
  });

  it('averages stars only when both numbers exist', () => {
    expect(avgStars({ ratings: 4, starsSum: 18 })).toBe(4.5);
    expect(avgStars({ starsSum: 18 })).toBeNull();
    expect(avgStars({ ratings: 4 })).toBeNull();
    expect(avgStars(undefined)).toBeNull();
  });

  it('sorts by name ignoring accents and case, with numbers in order', () => {
    const named = ['b', 'Éa', 'Ea 10', 'Ea 9', 'a'].map((name) => ({ ...items[0], name }));
    expect(sortResults(named, 'name').map((i) => i.name)).toEqual(['a', 'b', 'Éa', 'Ea 9', 'Ea 10']);
  });

  it('facet values: most common first, list values counted once per item', () => {
    expect(facetValues(items, 'maker')).toEqual(['Maison', 'Other']);
    expect(facetValues(items, 'notes')).toEqual(['oak', 'fruit']);
  });

  it('filters round-trip through the URL', () => {
    const f = { text: 'oak', facets: { kind: 'a', maker: 'Maison' }, minScore: 90, sort: 'name' as const };
    expect(filtersFromParams(filtersToParams(f), config)).toEqual(f);
    expect(filtersFromParams(new URLSearchParams('?unknown=1&sort=nope'), config)).toEqual(NO_FILTERS);
    expect(filtersToParams(NO_FILTERS).toString()).toBe('');
  });
});
