import { describe, expect, it } from 'vitest';
import { createInventory } from '../../src/domain/inventory/inventory';
import { buyItem } from '../../src/domain/economy/economy';
import { advanceQuest, canTurnInQuest, turnInQuest, type QuestState } from '../../src/domain/quests/questState';

describe('quest and economy', () => {
  const potion = { instanceId: 'p', definitionId: 'health_potion', name: 'Potion', kind: 'consumable' as const, quantity: 1, itemLevel: 1, rarity: 'common' as const, stackable: true, maxStack: 10, tags: ['potion'], affixes: [], modifiers: [] };
  it('does not charge gold if purchase cannot fit', () => {
    const merchant = { stock: [{ id: 'p', item: potion, price: 20, quantity: 1 }] };
    const result = buyItem({ gold: 100, inventory: createInventory(0), merchant }, 'p');
    expect(result.success).toBe(false); expect(result.gold).toBe(100); expect(result.merchant.stock[0].quantity).toBe(1);
  });
  it('turns the contract in once after the return milestone', () => {
    let state: QuestState = { status: 'available', rewardClaimed: false };
    state = advanceQuest(state, 'accept'); state = advanceQuest(state, 'leaderDefeated'); state = advanceQuest(state, 'returnToOutpost');
    expect(canTurnInQuest(state)).toBe(true);
    const result = turnInQuest(state); expect(result.success).toBe(true); expect(turnInQuest(result.state).success).toBe(false);
  });
});
