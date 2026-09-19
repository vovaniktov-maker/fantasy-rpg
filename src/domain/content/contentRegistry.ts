import type { ItemDefinition } from '../items/itemTypes.js';
import type { AffixDefinition } from '../items/affixes.js';
import type { SkillNodeDefinition } from '../skills/skillTree.js';
import type { EnemyDefinition } from '../../content/enemies.js';
import type { LootTableDefinition } from '../../content/lootTables.js';
import type { QuestDefinition } from '../../content/quests.js';
import { itemDefinitions } from '../../content/items.js';
import { affixDefinitions } from '../../content/affixes.js';
import { rogueSkillNodes } from '../../content/skills.js';
import { enemyDefinitions } from '../../content/enemies.js';
import { lootTableDefinitions } from '../../content/lootTables.js';
import { questDefinitions } from '../../content/quests.js';

export interface ContentRegistry {
  items: ReadonlyMap<string, ItemDefinition>;
  affixes: ReadonlyMap<string, AffixDefinition>;
  skills: ReadonlyMap<string, SkillNodeDefinition>;
  enemies: ReadonlyMap<string, EnemyDefinition>;
  lootTables: ReadonlyMap<string, LootTableDefinition>;
  quests: ReadonlyMap<string, QuestDefinition>;
  duplicates: ReadonlyArray<{ category: string; id: string }>;
}

export interface ContentSource {
  items: ItemDefinition[];
  affixes: AffixDefinition[];
  skills: SkillNodeDefinition[];
  enemies: EnemyDefinition[];
  lootTables: LootTableDefinition[];
  quests: QuestDefinition[];
}

function mapById<T extends { id: string }>(category: string, values: readonly T[], duplicates: Array<{ category: string; id: string }>): Map<string, T> {
  const map = new Map<string, T>();
  for (const value of values) {
    if (map.has(value.id)) duplicates.push({ category, id: value.id });
    else map.set(value.id, value);
  }
  return map;
}

export function buildContentRegistry(overrides: Partial<ContentSource> = {}): ContentRegistry {
  const source: ContentSource = {
    items: overrides.items ?? itemDefinitions,
    affixes: overrides.affixes ?? affixDefinitions,
    skills: overrides.skills ?? rogueSkillNodes,
    enemies: overrides.enemies ?? enemyDefinitions,
    lootTables: overrides.lootTables ?? lootTableDefinitions,
    quests: overrides.quests ?? questDefinitions,
  };
  const duplicates: Array<{ category: string; id: string }> = [];
  return {
    items: mapById('items', source.items, duplicates),
    affixes: mapById('affixes', source.affixes, duplicates),
    skills: mapById('skills', source.skills, duplicates),
    enemies: mapById('enemies', source.enemies, duplicates),
    lootTables: mapById('lootTables', source.lootTables, duplicates),
    quests: mapById('quests', source.quests, duplicates),
    duplicates,
  };
}
