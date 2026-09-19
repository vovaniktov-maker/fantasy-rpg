import type { StatModifier } from '../stats/stats.js';

export interface AffixDefinition {
  id: string;
  compatibleItemTags: string[];
  exclusiveGroup?: string;
  modifiers: StatModifier[];
}
