// Fails when a translation key exists in one language but not the other, or when
// something in src/niche/niche.json (attribute, enum value, tag, extra) has no label.
//   npm run i18n:check
import { readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const LANGS = ['en', 'pt-BR'];
const NAMESPACES = ['core', 'niche'];

// Plural forms (_one/_other) count as one key.
const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`.replace(/_(one|other)$/, '')]));

const problems = [];
const keys = {};
for (const ns of NAMESPACES) {
  const sets = LANGS.map((l) => new Set(flatten(read(`src/locales/${l}/${ns}.json`))));
  keys[ns] = sets;
  for (const [i, l] of LANGS.entries()) {
    const other = sets[1 - i];
    for (const k of sets[i]) if (!other.has(k)) problems.push(`${ns}:${k} is in ${l} but missing in ${LANGS[1 - i]}`);
  }
}

const niche = read('src/niche/niche.json');
const required = [
  ...niche.attributes.map((a) => `attr.${a.key}`),
  ...niche.attributes.flatMap((a) => (a.enumValues ?? []).map((v) => `enum.${a.key}.${v}`)),
  ...niche.attributes.filter((a) => a.zeroLabel).map((a) => `zero.${a.key}`),
  ...niche.ratingTags.map((t) => `tag.${t}`),
  ...(niche.owned.extras ?? []).flatMap((x) => [`extra.${x.key}.label`, ...(x.values ?? []).map((v) => `extra.${x.key}.${v}`)]),
];
const units = niche.attributes.filter((a) => a.unit).map((a) => `unit.${a.unit}`);
for (const [i, l] of LANGS.entries()) {
  for (const k of required) if (!keys.niche[i].has(k)) problems.push(`niche:${k} is missing in ${l}`);
  for (const k of units) if (!keys.core[i].has(k)) problems.push(`core:${k} is missing in ${l}`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`i18n ok: ${LANGS.join(', ')} · ${NAMESPACES.map((ns) => `${ns} ${keys[ns][0].size} keys`).join(', ')}`);
