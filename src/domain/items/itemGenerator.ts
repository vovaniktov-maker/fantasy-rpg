import type { AffixDefinition } from './affixes.js';
import type { ItemDefinition, ItemInstance, ItemRarity, RolledAffix } from './itemTypes.js';

export interface RandomSource {
  next(): number;
  pick<T>(items: readonly T[]): T;
}

export interface GenerateItemContext {
  definition: ItemDefinition;
  rarity: ItemRarity;
  itemLevel: number;
  affixPool: readonly AffixDefinition[];
}

const AFFIX_COUNTS: Record<ItemRarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  unique: 0,
};

function compatible(definition: ItemDefinition, affix: AffixDefinition): boolean {
  return affix.compatibleItemTags.length === 0 || affix.compatibleItemTags.some((tag) => definition.tags.includes(tag));
}

export function generateItem(ctx: GenerateItemContext, rng: RandomSource): ItemInstance {
  const candidates = ctx.affixPool.filter((affix) => compatible(ctx.definition, affix));
  const chosen: RolledAffix[] = [];
  const usedGroups = new Set<string>();
  const target = Math.min(AFFIX_COUNTS[ctx.rarity], candidates.length);
  const remaining = [...candidates];

  while (chosen.length < target && remaining.length > 0) {
    const candidate = rng.pick(remaining);
    const index = remaining.indexOf(candidate);
    if (index >= 0) remaining.splice(index, 1);
    if (candidate.exclusiveGroup && usedGroups.has(candidate.exclusiveGroup)) continue;
    if (candidate.exclusiveGroup) usedGroups.add(candidate.exclusiveGroup);
    chosen.push({ id: candidate.id, exclusiveGroup: candidate.exclusiveGroup, modifiers: candidate.modifiers.map((m) => ({ ...m })) });
  }

  const modifiers = [
    ...(ctx.definition.baseModifiers ?? []).map((m) => ({ ...m })),
    ...chosen.flatMap((affix) => affix.modifiers.map((m) => ({ ...m }))),
  ];

  const suffix = Math.floor(Math.max(0, Math.min(0.999999999, rng.next())) * 1_000_000_000).toString(36);
  return {
    instanceId: `${ctx.definition.id}-${ctx.itemLevel}-${suffix}`,
    definitionId: ctx.definition.id,
    name: ctx.definition.name,
    kind: ctx.definition.kind,
    quantity: 1,
    itemLevel: ctx.itemLevel,
    rarity: ctx.rarity,
    stackable: ctx.definition.stackable,
    maxStack: ctx.definition.maxStack,
    tags: [...ctx.definition.tags],
    equipSlot: ctx.definition.equipSlot,
    affixes: chosen,
    modifiers,
    uniqueEffect: ctx.definition.uniqueEffect,
  };
}
