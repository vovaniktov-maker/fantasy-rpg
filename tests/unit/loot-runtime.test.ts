import { describe, expect, it } from 'vitest';
import { buildContentRegistry } from '../../src/domain/content/contentRegistry';
import type { SerializableInventoryState } from '../../src/domain/inventory/inventory';
import { LootRuntime } from '../../src/game/runtime/LootRuntime';

function dagger(id = 'drop-1') {
  return {
    instanceId: id,
    definitionId: 'steel_dagger',
    quantity: 1,
    itemLevel: 1,
    rarity: 'rare',
  };
}

describe('LootRuntime', () => {
  it('keeps the pickup alive when inventory cannot accept it', () => {
    const content = buildContentRegistry();
    let inventory: SerializableInventoryState = {
      capacity: 1,
      slots: [{ instanceId: 'occupied', definitionId: 'steel_dagger', quantity: 1, itemLevel: 1, rarity: 'rare' }],
    };
    const runtime = new LootRuntime({
      content,
      getInventory: () => inventory,
      setInventory: (next) => { inventory = next; },
    });
    const pickup = runtime.spawnDrop({ item: dagger(), position: { x: 10, y: 10 } });

    const result = runtime.tryInteract({ x: 10, y: 10 });

    expect(result.collected).toBe(false);
    expect(pickup.collected).toBe(false);
    expect(runtime.activePickups()).toHaveLength(1);
  });

  it('requires manual interaction within range', () => {
    const content = buildContentRegistry();
    let inventory: SerializableInventoryState = { capacity: 20, slots: Array.from({ length: 20 }, () => null) };
    const runtime = new LootRuntime({
      content,
      getInventory: () => inventory,
      setInventory: (next) => { inventory = next; },
      interactionRadius: 80,
    });
    runtime.spawnDrop({ item: dagger(), position: { x: 500, y: 500 } });

    expect(runtime.tryInteract({ x: 0, y: 0 }).collected).toBe(false);
    expect(inventory.slots.every((slot) => slot === null)).toBe(true);
  });

  it('collects once when in range and removes the world pickup', () => {
    const content = buildContentRegistry();
    let inventory: SerializableInventoryState = { capacity: 20, slots: Array.from({ length: 20 }, () => null) };
    const runtime = new LootRuntime({
      content,
      getInventory: () => inventory,
      setInventory: (next) => { inventory = next; },
    });
    runtime.spawnDrop({ item: dagger(), position: { x: 10, y: 10 } });

    expect(runtime.tryInteract({ x: 10, y: 10 }).collected).toBe(true);
    expect(runtime.activePickups()).toHaveLength(0);
    expect(inventory.slots.some((slot) => slot?.definitionId === 'steel_dagger')).toBe(true);
  });
});
