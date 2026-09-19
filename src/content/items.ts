import type { ItemDefinition } from '../domain/items/itemTypes.js';

const gear = (id: string, name: string, equipSlot: ItemDefinition['equipSlot'], tags: string[], baseModifiers: ItemDefinition['baseModifiers'] = []): ItemDefinition => ({
  id, name, kind: 'gear', stackable: false, maxStack: 1, equipSlot, tags: ['gear', ...(equipSlot ? [equipSlot] : []), ...tags], baseModifiers,
});

export const itemDefinitions: ItemDefinition[] = [
  gear('worn_dagger', 'Worn Dagger', 'weapon', ['weapon', 'dagger'], [{ stat: 'attackPower', mode: 'flat', value: 2 }]),
  gear('steel_dagger', 'Steel Dagger', 'weapon', ['weapon', 'dagger'], [{ stat: 'attackPower', mode: 'flat', value: 5 }]),
  gear('hooked_blade', 'Hooked Blade', 'offhand', ['weapon', 'dagger', 'offhand'], [{ stat: 'critChance', mode: 'addPercent', value: 0.02 }]),
  gear('shadow_cowl', 'Shadow Cowl', 'head', ['armor', 'light-armor'], [{ stat: 'armor', mode: 'flat', value: 3 }]),
  gear('leather_jerkin', 'Leather Jerkin', 'body', ['armor', 'light-armor'], [{ stat: 'armor', mode: 'flat', value: 7 }]),
  gear('cutpurse_gloves', 'Cutpurse Gloves', 'gloves', ['armor', 'light-armor'], [{ stat: 'attackSpeed', mode: 'addPercent', value: 0.03 }]),
  gear('trail_boots', 'Trail Boots', 'boots', ['armor', 'light-armor'], [{ stat: 'moveSpeed', mode: 'addPercent', value: 0.03 }]),
  gear('black_amber_amulet', 'Black Amber Amulet', 'amulet', ['accessory'], [{ stat: 'energy', mode: 'flat', value: 5 }]),
  gear('bandit_signet', 'Bandit Signet', 'ring1', ['accessory', 'ring'], [{ stat: 'critDamage', mode: 'addPercent', value: 0.04 }]),
  gear('iron_coil_ring', 'Iron Coil Ring', 'ring2', ['accessory', 'ring'], [{ stat: 'hp', mode: 'flat', value: 8 }]),

  { ...gear('unique_shadow_fang', 'Shadow Fang', 'weapon', ['weapon', 'dagger', 'unique'], [{ stat: 'attackPower', mode: 'flat', value: 10 }, { stat: 'critChance', mode: 'addPercent', value: 0.05 }]), uniqueEffect: 'After a dodge, the next basic hit deals increased damage and applies poison.' },
  { ...gear('unique_smokeweaver_cowl', 'Smokeweaver Cowl', 'head', ['armor', 'light-armor', 'unique'], [{ stat: 'cooldownReduction', mode: 'addPercent', value: 0.05 }]), uniqueEffect: 'Smoke Bomb lingers longer and grants brief move speed.' },
  { ...gear('unique_vipers_loop', "Viper's Loop", 'ring1', ['accessory', 'ring', 'unique'], [{ stat: 'critChance', mode: 'addPercent', value: 0.04 }]), uniqueEffect: 'Critical hits refresh one poison stack duration.' },
  { ...gear('unique_wayfarer_boots', 'Wayfarer Boots', 'boots', ['armor', 'light-armor', 'unique'], [{ stat: 'dodgeDistance', mode: 'addPercent', value: 0.15 }]), uniqueEffect: 'Dodges travel farther but cost slightly more energy.' },

  { id: 'health_potion', name: 'Health Potion', kind: 'consumable', stackable: true, maxStack: 10, tags: ['potion', 'health'] },
  { id: 'energy_potion', name: 'Energy Potion', kind: 'consumable', stackable: true, maxStack: 10, tags: ['potion', 'energy'] },
  { id: 'bandit_token', name: 'Bandit Token', kind: 'material', stackable: true, maxStack: 50, tags: ['material'] },
];
