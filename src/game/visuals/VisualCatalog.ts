import type { ItemDefinition, ItemRarity } from '../../domain/items/itemTypes.js';

const enemyKeys: Record<string, string> = {
  bandit_melee: 'enemy-bandit-guard',
  bandit_cutthroat: 'enemy-bandit-cutthroat',
  bandit_archer: 'enemy-bandit-archer',
  bandit_heavy: 'enemy-bandit-heavy',
  bandit_trapper: 'enemy-bandit-trapper',
  bandit_leader: 'enemy-bandit-leader',
};

export function enemyTextureKey(enemyId: string): string {
  return enemyKeys[enemyId] ?? 'enemy-bandit-guard';
}

export function itemTextureKey(item: Pick<ItemDefinition, 'id' | 'kind' | 'equipSlot' | 'tags'>): string {
  if (item.id === 'health_potion') return 'item-health-potion';
  if (item.id === 'energy_potion') return 'item-energy-potion';
  if (item.id === 'bandit_token') return 'item-bandit-token';
  if (item.equipSlot === 'weapon') return 'item-weapon';
  if (item.equipSlot === 'offhand') return 'item-offhand';
  if (item.equipSlot === 'head') return 'item-head';
  if (item.equipSlot === 'body') return 'item-body';
  if (item.equipSlot === 'gloves') return 'item-gloves';
  if (item.equipSlot === 'boots') return 'item-boots';
  if (item.equipSlot === 'amulet') return 'item-amulet';
  if (item.equipSlot === 'ring1' || item.equipSlot === 'ring2') return 'item-ring';
  return item.kind === 'material' ? 'item-material' : 'item-generic';
}

export function getRarityColor(rarity?: ItemRarity): number {
  switch (rarity) {
    case 'uncommon': return 0x63c174;
    case 'rare': return 0x5aa2ff;
    case 'epic': return 0xae69ff;
    case 'legendary': return 0xf0a43b;
    case 'unique': return 0xe65f5c;
    default: return 0xd8d4ca;
  }
}
