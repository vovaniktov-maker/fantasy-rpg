import type { StatModifier } from '../stats/stats.js';

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'unique';
export type ItemKind = 'gear' | 'consumable' | 'material';
export type EquipmentSlot = 'weapon' | 'offhand' | 'head' | 'body' | 'gloves' | 'boots' | 'amulet' | 'ring1' | 'ring2';

export interface ItemDefinition {
  id: string;
  name: string;
  kind: ItemKind;
  stackable: boolean;
  maxStack: number;
  tags: string[];
  equipSlot?: EquipmentSlot;
  baseModifiers?: StatModifier[];
  uniqueEffect?: string;
}

export interface RolledAffix {
  id: string;
  exclusiveGroup?: string;
  modifiers: StatModifier[];
}

export interface ItemInstance {
  instanceId: string;
  definitionId: string;
  name: string;
  kind: ItemKind;
  quantity: number;
  itemLevel: number;
  rarity: ItemRarity;
  stackable: boolean;
  maxStack: number;
  tags: string[];
  equipSlot?: EquipmentSlot;
  affixes: RolledAffix[];
  modifiers: StatModifier[];
  uniqueEffect?: string;
}
