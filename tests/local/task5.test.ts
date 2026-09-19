import test from 'node:test';
import assert from 'node:assert/strict';
import { createInventory, addItem } from '../../src/domain/inventory/inventory.js';
import { generateItem } from '../../src/domain/items/itemGenerator.js';
import { equipItem, aggregateEquipmentModifiers } from '../../src/domain/equipment/equipment.js';
import { rollLoot } from '../../src/domain/loot/lootTables.js';

const potion = (qty: number) => ({ instanceId: `p-${qty}`, definitionId: 'health_potion', name: 'Health Potion', kind: 'consumable' as const, quantity: qty, itemLevel: 1, rarity: 'common' as const, stackable: true, maxStack: 5, tags: ['potion'], affixes: [], modifiers: [] });
const gear = (id: string, slot: 'weapon'|'head' = 'weapon') => ({ instanceId: id, definitionId: id, name: id, kind: 'gear' as const, quantity: 1, itemLevel: 1, rarity: 'rare' as const, stackable: false, maxStack: 1, tags: [slot], equipSlot: slot, affixes: [], modifiers: [{ stat: 'attackPower' as const, mode: 'flat' as const, value: 5 }] });

test('fixed inventory does not mutate when full and merges stacks', () => {
  let inv = createInventory(2);
  const a = addItem(inv, potion(3)); inv = a.state;
  const b = addItem(inv, potion(2)); inv = b.state;
  assert.equal(inv.slots.filter(Boolean).length, 1);
  assert.equal(inv.slots[0]?.quantity, 5);
  const c = addItem(inv, gear('s1')); inv = c.state;
  assert.equal(c.added, true);
  const before = structuredClone(inv);
  const d = addItem(inv, gear('d1'));
  assert.equal(d.added, false);
  assert.deepEqual(d.state, before);
});

test('item generation respects rarity affix count, compatibility and exclusivity', () => {
  const def = { id: 'dagger', name: 'Dagger', kind: 'gear' as const, stackable: false, maxStack: 1, tags: ['weapon','dagger'], equipSlot: 'weapon' as const, baseModifiers: [] };
  const affixes = [
    { id: 'sharp', compatibleItemTags: ['weapon'], exclusiveGroup: 'prefix', modifiers: [{ stat: 'attackPower' as const, mode: 'flat' as const, value: 2 }] },
    { id: 'keen', compatibleItemTags: ['weapon'], exclusiveGroup: 'prefix', modifiers: [{ stat: 'critChance' as const, mode: 'addPercent' as const, value: 0.05 }] },
    { id: 'swift', compatibleItemTags: ['dagger'], exclusiveGroup: 'suffix', modifiers: [{ stat: 'attackSpeed' as const, mode: 'addPercent' as const, value: 0.1 }] },
  ];
  const rng = { next: () => 0.1, pick: <T>(items: readonly T[]) => items[0] };
  assert.equal(generateItem({ definition: def, rarity: 'common', itemLevel: 7, affixPool: affixes }, rng).affixes.length, 0);
  const rare = generateItem({ definition: def, rarity: 'rare', itemLevel: 7, affixPool: affixes }, rng);
  assert.equal(rare.itemLevel, 7);
  assert.equal(new Set(rare.affixes.map(a => a.exclusiveGroup).filter(Boolean)).size, rare.affixes.filter(a => a.exclusiveGroup).length);
});

test('equipment validates slot and returns displaced item', () => {
  const sword = gear('sword', 'weapon');
  const helm = gear('helm', 'head');
  const first = equipItem({}, sword, 'weapon');
  assert.equal(first.success, true);
  assert.equal(aggregateEquipmentModifiers(first.equipment).length, 1);
  const invalid = equipItem(first.equipment, helm, 'weapon');
  assert.equal(invalid.success, false);
  const replacement = equipItem(first.equipment, gear('dagger','weapon'), 'weapon');
  assert.equal(replacement.displaced?.instanceId, 'sword');
});

test('weighted loot returns null for empty/zero tables and respects level gates', () => {
  const rng = { next: () => 0, pick: <T>(items: readonly T[]) => items[0] };
  assert.equal(rollLoot([], 1, rng), null);
  assert.equal(rollLoot([{ id: 'x', weight: 0 }], 1, rng), null);
  assert.equal(rollLoot([{ id: 'high', weight: 10, minLevel: 5 }, { id: 'ok', weight: 1 }], 1, rng), 'ok');
});
