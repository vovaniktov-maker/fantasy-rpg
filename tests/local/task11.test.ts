import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDungeon } from '../../src/domain/dungeon/dungeonGenerator.js';
import { dungeonRoomDefinitions } from '../../src/content/dungeonRooms.js';
import { WorldPickup } from '../../src/game/world/WorldPickup.js';
import { createInventory } from '../../src/domain/inventory/inventory.js';

const potion = { instanceId: 'p', definitionId: 'health_potion', name: 'Potion', kind: 'consumable' as const, quantity: 1, itemLevel: 1, rarity: 'common' as const, stackable: true, maxStack: 10, tags: ['potion'], affixes: [], modifiers: [] };

test('dungeon is deterministic and includes required structure', () => {
  const a = generateDungeon(12345, dungeonRoomDefinitions);
  const b = generateDungeon(12345, dungeonRoomDefinitions);
  assert.equal(a.ok, true); assert.equal(b.ok, true);
  if (!a.ok || !b.ok) return;
  assert.deepEqual(a.dungeon, b.dungeon);
  const tags = a.dungeon.rooms.map(r => r.tag);
  assert.equal(tags.filter(t => t === 'entrance').length, 1);
  assert.ok(tags.includes('combat'));
  assert.equal(tags.filter(t => t === 'bossApproach').length, 1);
});

test('empty or impossible room config fails with room ids', () => {
  const empty = generateDungeon(1, []);
  assert.equal(empty.ok, false);
  const impossible = generateDungeon(1, [{ id: 'entrance_bad', tag: 'entrance' as const, connectors: 0 }, { id: 'combat', tag: 'combat' as const, connectors: 2 }, { id: 'boss', tag: 'bossApproach' as const, connectors: 0 }]);
  assert.equal(impossible.ok, false);
  if (!impossible.ok) assert.ok(impossible.error.roomIds.length >= 1);
});

test('full inventory leaves manual world pickup active and emits nothing', () => {
  let inventory = createInventory(0);
  let events = 0;
  const pickup = new WorldPickup(potion, () => inventory, (next) => { inventory = next; }, () => { events += 1; });
  assert.equal(pickup.tryCollect(), false);
  assert.equal(pickup.collected, false);
  assert.equal(events, 0);
});
