import test from 'node:test';
import assert from 'node:assert/strict';
import { stepEnemyBrain } from '../../src/domain/ai/enemyBrain.js';
import { enemyDefinitions } from '../../src/content/enemies.js';

const melee = enemyDefinitions.find(e => e.id === 'bandit_melee')!;

test('enemy brain chases visible distant player then prepares attack in range', () => {
  const first = stepEnemyBrain({ state: 'idle', stateElapsedMs: 0 }, { playerVisible: true, distance: 300, attackReady: true, hpRatio: 1 }, melee);
  assert.equal(first.state, 'chase');
  const second = stepEnemyBrain({ state: 'chase', stateElapsedMs: 100 }, { playerVisible: true, distance: 60, attackReady: true, hpRatio: 1 }, melee);
  assert.equal(second.intent.type, 'prepareAttack');
  assert.equal(second.state, 'prepareAttack');
});

test('all archetype attacks have telegraph and recovery windows', () => {
  for (const enemy of enemyDefinitions) {
    assert.ok(enemy.attacks.length > 0);
    for (const attack of enemy.attacks) {
      assert.ok(attack.telegraphMs > 0);
      assert.ok(attack.activeMs > 0);
      assert.ok(attack.recoveryMs > 0);
      assert.ok(attack.cueKey.length > 0);
    }
  }
});

test('low health ranged/trapper archetypes can retreat', () => {
  const trapper = enemyDefinitions.find(e => e.id === 'bandit_trapper')!;
  const result = stepEnemyBrain({ state: 'position', stateElapsedMs: 0 }, { playerVisible: true, distance: 80, attackReady: true, hpRatio: 0.2 }, trapper);
  assert.equal(result.state, 'retreat');
  assert.equal(result.intent.type, 'moveAway');
});
