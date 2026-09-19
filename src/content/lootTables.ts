import type { LootTableEntry } from '../domain/loot/lootTables.js';

export interface LootTableDefinition { id: string; entries: LootTableEntry[]; }

export const lootTableDefinitions: LootTableDefinition[] = [
  { id: 'forest_common', entries: [
    { id: 'health_potion', weight: 24 }, { id: 'energy_potion', weight: 18 }, { id: 'worn_dagger', weight: 10 },
    { id: 'shadow_cowl', weight: 7 }, { id: 'trail_boots', weight: 7 }, { id: 'bandit_token', weight: 30 },
  ] },
  { id: 'bandit_hideout', entries: [
    { id: 'steel_dagger', weight: 12 }, { id: 'hooked_blade', weight: 10 }, { id: 'leather_jerkin', weight: 10 },
    { id: 'cutpurse_gloves', weight: 10 }, { id: 'black_amber_amulet', weight: 6 }, { id: 'bandit_signet', weight: 5 },
    { id: 'health_potion', weight: 15 }, { id: 'energy_potion', weight: 12 },
  ] },
  { id: 'bandit_leader', entries: [
    { id: 'unique_shadow_fang', weight: 4 }, { id: 'unique_smokeweaver_cowl', weight: 4 }, { id: 'unique_vipers_loop', weight: 4 },
    { id: 'unique_wayfarer_boots', weight: 4 }, { id: 'steel_dagger', weight: 20 }, { id: 'black_amber_amulet', weight: 12 },
  ] },
];
