import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { niche } from '@/niche/config';

const catalog = JSON.parse(readFileSync(new URL('../../public/catalog.json', import.meta.url), 'utf8')) as { keys: string[]; rows: unknown[][] };

describe('niche config', () => {
  it('every attribute is a column of catalog.json', () => {
    for (const a of niche.attributes) expect(catalog.keys).toContain(a.key);
  });

  it('catalog ids are short, stable-looking and unique', () => {
    const ids = catalog.rows.map((r) => r[0] as string);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]{1,20}$/);
  });

  it('enum values in the catalog are declared in the config', () => {
    for (const a of niche.attributes.filter((x) => x.type === 'enum')) {
      const i = catalog.keys.indexOf(a.key);
      for (const r of catalog.rows) if (r[i]) expect(a.enumValues).toContain(r[i]);
    }
  });

  it('owned quantity cap matches the rules (1 when quantity is off)', () => {
    if (!niche.owned.quantity) expect(niche.owned.maxQuantity).toBe(1);
    expect(niche.owned.maxQuantity).toBeGreaterThanOrEqual(1);
  });
});
