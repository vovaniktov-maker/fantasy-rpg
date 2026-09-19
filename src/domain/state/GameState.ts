export type ScreenId = 'outpost' | 'forest' | 'hideout' | 'boss';

export interface SerializableItemStack {
  instanceId: string;
  definitionId: string;
  quantity: number;
  itemLevel?: number;
  rarity?: string;
  affixIds?: string[];
}

export interface GameState {
  screen: ScreenId;
  player: {
    hp: number;
    maxHp: number;
    energy: number;
    maxEnergy: number;
    position: { x: number; y: number };
  };
  progression: { level: number; xp: number; unspentSkillPoints: number };
  inventory: { capacity: number; slots: Array<SerializableItemStack | null> };
  equipment: Record<string, string | null>;
  skills: { learned: Record<string, number>; equippedActiveSkillIds: Array<string | null> };
  economy: { gold: number };
  quests: Record<string, string>;
  checkpoint: { screen: ScreenId; x: number; y: number };
  runSeed: number;
  world: { hideoutRunsStarted: number; forestEncounterDefeated: boolean };
  ui: { inventoryOpen: boolean; menuOpen: boolean };
}

export function createInitialGameState(): GameState {
  return {
    screen: 'outpost',
    player: { hp: 100, maxHp: 100, energy: 100, maxEnergy: 100, position: { x: 0, y: 0 } },
    progression: { level: 1, xp: 0, unspentSkillPoints: 0 },
    inventory: { capacity: 20, slots: Array.from({ length: 20 }, () => null) },
    equipment: {},
    skills: { learned: {}, equippedActiveSkillIds: [null, null, null, null] },
    economy: { gold: 0 },
    quests: {},
    checkpoint: { screen: 'outpost', x: 0, y: 0 },
    runSeed: 1,
    world: { hideoutRunsStarted: 0, forestEncounterDefeated: false },
    ui: { inventoryOpen: false, menuOpen: false },
  };
}
