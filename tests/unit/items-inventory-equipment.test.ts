import { describe, expect, it } from 'vitest';
import { createInventory, addItem, addSerializedItem } from '../../src/domain/inventory/inventory';
import { generateItem } from '../../src/domain/items/itemGenerator';
import { equipItem } from '../../src/domain/equipment/equipment';
import { rollLoot } from '../../src/domain/loot/lootTables';
import { buildContentRegistry } from '../../src/domain/content/contentRegistry';

describe('items, inventory, equipment and loot', () => {
  const potion = (qty: number) => ({ instanceId: `p-${qty}`, definitionId: 'health_potion', name: 'Health Potion', kind: 'consumable' as const, quantity: qty, itemLevel: 1, rarity: 'common' as const, stackable: true, maxStack: 5, tags: ['potion'], affixes: [], modifiers: [] });
  it('blocks a new item when fixed slots are full without mutating state', () => {
    let inv = createInventory(1);
    inv = addItem(inv, potion(5)).state;
    const before = structuredClone(inv);
    const result = addItem(inv, { ...potion(1), instanceId: 'other', definitionId: 'energy_potion' });
    expect(result.added).toBe(false);
    expect(result.state).toEqual(before);
  });
  it('keeps common gear unaffixed', () => {
    const rng = { next: () => 0.1, pick: <T>(xs: readonly T[]) => xs[0] };
    const item = generateItem({ definition: { id: 'd', name: 'D', kind: 'gear', stackable: false, maxStack: 1, tags: ['weapon'], equipSlot: 'weapon', baseModifiers: [] }, rarity: 'common', itemLevel: 2, affixPool: [] }, rng);
    expect(item.affixes).toHaveLength(0);
  });
  it('rejects incompatible equipment slots', () => {
    const item = { instanceId: 'h', definitionId: 'h', name: 'Helm', kind: 'gear' as const, quantity: 1, itemLevel: 1, rarity: 'rare' as const, stackable: false, maxStack: 1, tags: ['head'], equipSlot: 'head' as const, affixes: [], modifiers: [] };
    expect(equipItem({}, item, 'weapon').success).toBe(false);
  });
  it('returns null for empty loot tables', () => {
    const rng = { next: () => 0, pick: <T>(xs: readonly T[]) => xs[0] };
    expect(rollLoot([], 1, rng)).toBeNull();
  });
  it('does not partially consume a serialized pickup when capacity is insufficient', () => {
    const content = buildContentRegistry();
    const inventory = {
      capacity: 1,
      slots: [{ instanceId: 'hp', definitionId: 'health_potion', quantity: 9, rarity: 'common', itemLevel: 1 }],
    };
    const item = { instanceId: 'drop', definitionId: 'health_potion', quantity: 2, rarity: 'common', itemLevel: 1 };
    const result = addSerializedItem(inventory, item, content.items);
    expect(result.added).toBe(false);
    expect(result.state).toEqual(inventory);
    expect(result.remainder?.quantity).toBe(2);
  });

  it('fills an existing serialized stack when the entire pickup fits', () => {
    const content = buildContentRegistry();
    const inventory = {
      capacity: 1,
      slots: [{ instanceId: 'hp', definitionId: 'health_potion', quantity: 8, rarity: 'common', itemLevel: 1 }],
    };
    const item = { instanceId: 'drop', definitionId: 'health_potion', quantity: 2, rarity: 'common', itemLevel: 1 };
    const result = addSerializedItem(inventory, item, content.items);
    expect(result.added).toBe(true);
    expect(result.state.slots[0]?.quantity).toBe(10);
  });
});
