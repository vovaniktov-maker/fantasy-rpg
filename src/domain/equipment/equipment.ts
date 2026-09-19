import type { StatModifier } from '../stats/stats.js';
import type { EquipmentSlot, ItemInstance } from '../items/itemTypes.js';

export type EquipmentState = Partial<Record<EquipmentSlot, ItemInstance | null>>;

export interface EquipResult {
  success: boolean;
  equipment: EquipmentState;
  displaced?: ItemInstance;
}

export function equipItem(equipment: EquipmentState, item: ItemInstance, slot: EquipmentSlot): EquipResult {
  if (item.kind !== 'gear' || item.equipSlot !== slot) return { success: false, equipment };
  const next: EquipmentState = { ...equipment };
  const displaced = next[slot] ?? undefined;
  next[slot] = structuredClone(item);
  return { success: true, equipment: next, displaced: displaced ? structuredClone(displaced) : undefined };
}

export function aggregateEquipmentModifiers(equipment: EquipmentState): StatModifier[] {
  return Object.values(equipment).flatMap((item) => item?.modifiers?.map((modifier) => ({ ...modifier })) ?? []);
}
