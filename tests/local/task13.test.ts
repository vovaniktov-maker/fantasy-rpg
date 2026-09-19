import test from 'node:test';
import assert from 'node:assert/strict';
import { createInventory } from '../../src/domain/inventory/inventory.js';
import { buyItem } from '../../src/domain/economy/economy.js';
import { advanceQuest, canTurnInQuest, turnInQuest, type QuestState } from '../../src/domain/quests/questState.js';

const potion = { instanceId: 'merchant-potion', definitionId: 'health_potion', name: 'Health Potion', kind: 'consumable' as const, quantity: 1, itemLevel: 1, rarity: 'common' as const, stackable: true, maxStack: 10, tags: ['potion'], affixes: [], modifiers: [] };

test('merchant purchase is atomic on insufficient gold or capacity', () => {
  const merchant = { stock: [{ id: 'potion-offer', item: potion, price: 20, quantity: 1 }] };
  const poor = buyItem({ gold: 10, inventory: createInventory(2), merchant }, 'potion-offer');
  assert.equal(poor.success, false); assert.equal(poor.gold, 10); assert.equal(poor.merchant.stock[0].quantity, 1);
  const full = createInventory(0);
  const blocked = buyItem({ gold: 100, inventory: full, merchant }, 'potion-offer');
  assert.equal(blocked.success, false); assert.equal(blocked.gold, 100); assert.equal(blocked.merchant.stock[0].quantity, 1);
  const ok = buyItem({ gold: 100, inventory: createInventory(2), merchant }, 'potion-offer');
  assert.equal(ok.success, true); assert.equal(ok.gold, 80); assert.equal(ok.merchant.stock[0].quantity, 0);
  assert.equal(ok.inventory.slots[0]?.definitionId, 'health_potion');
});

test('quest requires leader defeat and cannot reward twice', () => {
  let q: QuestState = { status: 'available', rewardClaimed: false };
  q = advanceQuest(q, 'accept');
  assert.equal(canTurnInQuest(q), false);
  q = advanceQuest(q, 'leaderDefeated');
  assert.equal(canTurnInQuest(q), false);
  q = advanceQuest(q, 'returnToOutpost');
  assert.equal(canTurnInQuest(q), true);
  const first = turnInQuest(q);
  assert.equal(first.success, true);
  const second = turnInQuest(first.state);
  assert.equal(second.success, false);
});
