// The contract between the generic core and a niche (collector-app-blueprint docs/02).
// Labels live in the `niche` i18n namespace: attr.<key>, enum.<key>.<value>, tag.<id>, extra.<key>…
export type AttrType = 'text' | 'enum' | 'number' | 'list';

export interface AttributeDef {
  key: string;
  type: AttrType;
  enumValues?: string[];
  searchable?: boolean;
  facet?: 'chips' | 'select';
  showInSpecs?: boolean;
  subtitle?: boolean;
  unit?: string;
  /** Show 0 as a label (`zero.<key>`), e.g. whisky age 0 = "No age statement". */
  zeroLabel?: boolean;
}

export interface OwnedExtraDef {
  key: string;
  type: 'enum' | 'boolean';
  values?: string[];
}

export interface NicheConfig {
  niche: string;
  app: string;
  /** Catalog ids are <idPrefix><n> (scripts/build_catalog.py). */
  idPrefix: string;
  attributes: AttributeDef[];
  scores?: { min: number; max: number; filterSteps: number[] };
  ratingTags: string[];
  owned: { quantity: boolean; maxQuantity: number; extras?: OwnedExtraDef[] };
  ageGate: boolean;
  image: { aspect: string; base?: string };
}
