import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContentRegistry } from '../../src/domain/content/contentRegistry.js';
import { validateContent } from '../../src/domain/content/validateContent.js';
import { rogueSkillNodes } from '../../src/content/skills.js';

test('vertical-slice registry validates cleanly', () => {
  const registry = buildContentRegistry();
  assert.deepEqual(validateContent(registry), []);
  assert.ok(registry.items.size >= 14);
  assert.ok(registry.affixes.size >= 20);
  assert.equal(registry.enemies.size, 5);
});

test('validation reports duplicate and broken cross references', () => {
  const badSkill = { ...rogueSkillNodes[0], id: 'bad_skill', prerequisites: ['missing_skill'] };
  const registry = buildContentRegistry({
    items: [
      { id: 'dup', name: 'A', kind: 'gear', stackable: false, maxStack: 1, tags: ['weapon'], equipSlot: 'weapon' },
      { id: 'dup', name: 'B', kind: 'gear', stackable: false, maxStack: 1, tags: ['weapon'], equipSlot: 'weapon' },
    ],
    affixes: [{ id: 'bad_affix', compatibleItemTags: ['nonexistent_tag'], modifiers: [] }],
    skills: [badSkill],
    enemies: [],
    lootTables: [{ id: 'bad_loot', entries: [{ id: 'missing_item', weight: -1 }] }],
    quests: [{ id: 'bad_quest', rewardItemIds: ['missing_reward'], rewardGold: 0, rewardXp: 0 }],
  });
  const messages = validateContent(registry).map(i => i.message).join('\n');
  assert.match(messages, /duplicate/i);
  assert.match(messages, /missing_skill/);
  assert.match(messages, /missing_item/);
  assert.match(messages, /nonexistent_tag/);
  assert.match(messages, /negative/i);
  assert.match(messages, /missing_reward/);
});
