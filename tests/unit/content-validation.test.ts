import { describe, expect, it } from 'vitest';
import { buildContentRegistry } from '../../src/domain/content/contentRegistry';
import { validateContent } from '../../src/domain/content/validateContent';

describe('content registry validation', () => {
  it('accepts shipped vertical-slice content', () => {
    const registry = buildContentRegistry();
    expect(validateContent(registry)).toEqual([]);
    expect(registry.affixes.size).toBeGreaterThanOrEqual(20);
    expect(registry.enemies.size).toBe(5);
  });
  it('reports broken references and duplicate IDs', () => {
    const registry = buildContentRegistry({
      items: [{ id: 'dup', name: 'A', kind: 'gear', stackable: false, maxStack: 1, tags: ['weapon'], equipSlot: 'weapon' }, { id: 'dup', name: 'B', kind: 'gear', stackable: false, maxStack: 1, tags: ['weapon'], equipSlot: 'weapon' }],
      affixes: [{ id: 'bad', compatibleItemTags: ['missing-tag'], modifiers: [] }], skills: [], enemies: [],
      lootTables: [{ id: 'bad', entries: [{ id: 'missing', weight: -1 }] }], quests: [{ id: 'q', rewardItemIds: ['missing'], rewardGold: 0, rewardXp: 0 }],
    });
    const messages = validateContent(registry).map((issue) => issue.message).join('\n');
    expect(messages).toMatch(/Duplicate/);
    expect(messages).toMatch(/negative/);
    expect(messages).toMatch(/missing/);
  });
});
