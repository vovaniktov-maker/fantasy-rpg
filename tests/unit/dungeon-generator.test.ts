import { describe, expect, it } from 'vitest';
import { generateDungeon } from '../../src/domain/dungeon/dungeonGenerator';
import { dungeonRoomDefinitions } from '../../src/content/dungeonRooms';
import { WorldPickup } from '../../src/game/world/WorldPickup';
import { createInventory } from '../../src/domain/inventory/inventory';

describe('dungeon and world pickups', () => {
  it('is deterministic for the same seed and preserves required room tags', () => {
    const a = generateDungeon(42, dungeonRoomDefinitions); const b = generateDungeon(42, dungeonRoomDefinitions);
    expect(a).toEqual(b);
    expect(a.ok).toBe(true);
    if (a.ok) {
      expect(a.dungeon.rooms.filter((r) => r.tag === 'entrance')).toHaveLength(1);
      expect(a.dungeon.rooms.some((r) => r.tag === 'combat')).toBe(true);
      expect(a.dungeon.rooms.filter((r) => r.tag === 'bossApproach')).toHaveLength(1);
    }
  });
  it('reports typed failure for empty config', () => {
    expect(generateDungeon(1, []).ok).toBe(false);
  });
  it('keeps loot in world when inventory is full', () => {
    let inventory = createInventory(0); let emitted = false;
    const item = { instanceId: 'p', definitionId: 'health_potion', name: 'Potion', kind: 'consumable' as const, quantity: 1, itemLevel: 1, rarity: 'common' as const, stackable: true, maxStack: 10, tags: ['potion'], affixes: [], modifiers: [] };
    const pickup = new WorldPickup(item, () => inventory, (next) => { inventory = next; }, () => { emitted = true; });
    expect(pickup.tryCollect()).toBe(false);
    expect(pickup.collected).toBe(false);
    expect(emitted).toBe(false);
  });
});
