import type { DungeonRoomDefinition } from '../domain/dungeon/dungeonGenerator.js';

export const dungeonRoomDefinitions: DungeonRoomDefinition[] = [
  { id: 'hideout_entrance_gate', tag: 'entrance', connectors: 2, encounterIds: ['bandit_melee'] },
  { id: 'hideout_barracks', tag: 'combat', connectors: 3, encounterIds: ['bandit_melee', 'bandit_cutthroat'] },
  { id: 'hideout_crossfire', tag: 'combat', connectors: 2, encounterIds: ['bandit_archer', 'bandit_heavy'] },
  { id: 'hideout_storage_ambush', tag: 'combat', connectors: 2, encounterIds: ['bandit_trapper', 'bandit_cutthroat'] },
  { id: 'hideout_tripwire_hall', tag: 'trap', connectors: 2, trapIds: ['tripwire', 'spikes'] },
  { id: 'hideout_powder_room', tag: 'trap', connectors: 2, trapIds: ['explosive_barrel'] },
  { id: 'hideout_treasure_cache', tag: 'treasure', connectors: 1 },
  { id: 'hideout_boss_approach', tag: 'bossApproach', connectors: 1, encounterIds: ['bandit_heavy'] },
];
