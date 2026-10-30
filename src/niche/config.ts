import type { NicheConfig } from '@/lib/niche-types';
import data from './niche.json';

// Everything niche-specific the core reads. The JSON is also read by
// scripts/build_catalog.py and scripts/i18n-check.mjs.
export const niche = data as NicheConfig;
