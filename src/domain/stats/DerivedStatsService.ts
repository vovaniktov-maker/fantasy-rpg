import type { ContentRegistry } from '../content/contentRegistry.js';
import type { EquipmentSlot } from '../items/itemTypes.js';
import type { GameState } from '../state/GameState.js';
import { aggregateStats, type CoreStats, type StatModifier } from './stats.js';

export const ROGUE_BASE_STATS: CoreStats = {
  hp: 100,
  energy: 100,
  attackPower: 10,
  critChance: 0.10,
  critDamage: 1.5,
  armor: 5,
  moveSpeed: 180,
  attackSpeed: 1,
  cooldownReduction: 0,
  dodgeDistance: 120,
};

export interface ResolvedEquippedItem {
  instanceId: string;
  definitionId: string;
  modifiers: StatModifier[];
}

export interface DerivedCombatStats extends CoreStats {
  base: CoreStats;
  equippedInstanceIds: Partial<Record<EquipmentSlot, string>>;
}

const EQUIPMENT_SLOTS: readonly EquipmentSlot[] = [
  'weapon', 'offhand', 'head', 'body', 'gloves', 'boots', 'amulet', 'ring1', 'ring2',
];

function isEquipmentSlot(value: string): value is EquipmentSlot {
  return (EQUIPMENT_SLOTS as readonly string[]).includes(value);
}

export function resolveEquippedItems(
  state: Readonly<GameState>,
  content: ContentRegistry,
): Partial<Record<EquipmentSlot, ResolvedEquippedItem>> {
  const resolved: Partial<Record<EquipmentSlot, ResolvedEquippedItem>> = {};

  for (const [slotName, instanceId] of Object.entries(state.equipment)) {
    if (!instanceId || !isEquipmentSlot(slotName)) continue;
    const serialized = state.inventory.slots.find((item) => item?.instanceId === instanceId);
    if (!serialized) continue;
    const definition = content.items.get(serialized.definitionId);
    if (!definition || definition.equipSlot !== slotName) continue;

    const modifiers: StatModifier[] = [
      ...(definition.baseModifiers ?? []).map((modifier) => ({ ...modifier })),
    ];
    for (const affixId of serialized.affixIds ?? []) {
      const affix = content.affixes.get(affixId);
      if (affix) modifiers.push(...affix.modifiers.map((modifier) => ({ ...modifier })));
    }

    resolved[slotName] = {
      instanceId,
      definitionId: serialized.definitionId,
      modifiers,
    };
  }

  return resolved;
}

export function deriveCombatStats(state: Readonly<GameState>, content: ContentRegistry): DerivedCombatStats {
  const equipment = resolveEquippedItems(state, content);
  const modifiers: StatModifier[] = Object.values(equipment)
    .flatMap((item) => item?.modifiers.map((modifier) => ({ ...modifier })) ?? []);

  for (const [nodeId, rawRank] of Object.entries(state.skills.learned)) {
    const node = content.skills.get(nodeId);
    if (!node || node.kind === 'active') continue;
    const rank = Math.max(0, Math.min(node.maxRank, Math.floor(rawRank)));
    if (rank <= 0) continue;
    for (const modifier of node.modifiers ?? []) {
      modifiers.push({ ...modifier, value: modifier.value * rank });
    }
  }

  const base = { ...ROGUE_BASE_STATS };
  const aggregated = aggregateStats(base, modifiers);
  return {
    ...aggregated,
    base,
    equippedInstanceIds: Object.fromEntries(
      Object.entries(equipment).map(([slot, item]) => [slot, item?.instanceId]),
    ) as Partial<Record<EquipmentSlot, string>>,
  };
}
