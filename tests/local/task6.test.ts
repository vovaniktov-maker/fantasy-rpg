import test from 'node:test';
import assert from 'node:assert/strict';
import { grantXp } from '../../src/domain/progression/leveling.js';
import { canUnlockSkill, unlockSkill, calculateRespecCost, respecSkills } from '../../src/domain/skills/skillTree.js';
import { rogueSkillNodes } from '../../src/content/skills.js';

test('leveling grants one skill point per gained level', () => {
  const next = grantXp({ level: 1, xp: 0, unspentSkillPoints: 0 }, 250);
  assert.ok(next.level >= 2);
  assert.equal(next.unspentSkillPoints, next.level - 1);
});

test('mixed branches are allowed when prerequisites and points permit', () => {
  let tree = { learned: {} as Record<string, number> };
  let points = 3;
  assert.equal(canUnlockSkill(rogueSkillNodes, tree, 'assassin_precision', points), true);
  let r = unlockSkill(rogueSkillNodes, tree, 'assassin_precision', points); tree = r.state; points = r.pointsRemaining;
  assert.equal(canUnlockSkill(rogueSkillNodes, tree, 'poisoner_toxicology', points), true);
  r = unlockSkill(rogueSkillNodes, tree, 'poisoner_toxicology', points); tree = r.state; points = r.pointsRemaining;
  assert.equal(Object.keys(tree.learned).length, 2);
  assert.equal(canUnlockSkill(rogueSkillNodes, tree, 'assassin_executioner', points), false);
});

test('respec costs gold, refunds points and clears learned nodes', () => {
  const tree = { learned: { assassin_precision: 1, poisoner_toxicology: 2 } };
  const cost = calculateRespecCost(tree, 5);
  assert.equal(respecSkills(tree, cost - 1, 5).success, false);
  const result = respecSkills(tree, cost, 5);
  assert.equal(result.success, true);
  assert.equal(result.gold, 0);
  assert.equal(result.refundedPoints, 3);
  assert.deepEqual(result.state.learned, {});
});
