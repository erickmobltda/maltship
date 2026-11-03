// The contract between the generic core and a niche (collector-app-blueprint docs/02).
// Labels live in the `niche` i18n namespace: attr.<key>, enum.<key>.<value>, tag.<id>, extra.<key>…
export type AttrType = 'text' | 'enum' | 'number' | 'list';

export interface AttributeDef {
  key: string;
  type: AttrType;
  /** The allowed values of an enum, or of each entry of a list; both are shown translated. */
  enumValues?: string[];
  searchable?: boolean;
  facet?: 'chips' | 'select';
  showInSpecs?: boolean;
  subtitle?: boolean;
  unit?: string;
  /** Show 0 as a label (`zero.<key>`), e.g. an age of 0 shown as "No age statement". */
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
  /** `side`: thumbnail left of the text (portrait/square photos). `top`: full width above it (wide photos, e.g. long product shots). */
  image: { aspect: string; base?: string; layout?: 'side' | 'top' };
}
