import test from 'node:test';
import assert from 'node:assert/strict';
import { getBossPhase, getBanditLeaderMovePool, stepBanditLeaderBrain, resolveBanditLeaderVictory } from '../../src/domain/ai/bossBrain.js';

test('boss phase thresholds are behavioral at 60 and 25 percent', () => {
  assert.equal(getBossPhase(1), 'phase1');
  assert.equal(getBossPhase(0.6), 'phase1');
  assert.equal(getBossPhase(0.59), 'phase2');
  assert.equal(getBossPhase(0.25), 'phase2');
  assert.equal(getBossPhase(0.24), 'finalPressure');
});

test('every damaging boss move has telegraph and recovery, final pool has punish window', () => {
  for (const phase of ['phase1','phase2','finalPressure'] as const) {
    const pool = getBanditLeaderMovePool(phase);
    for (const move of pool.filter(m => m.damage > 0)) {
      assert.ok(move.telegraphMs > 0); assert.ok(move.recoveryMs > 0);
    }
    if (phase === 'finalPressure') assert.ok(pool.some(m => m.punishWindowMs >= 500));
  }
});

test('brain changes phase without defensive stat inflation', () => {
  const result = stepBanditLeaderBrain({ sequence: 0 }, { hpRatio: 0.2, distance: 90, actionReady: true });
  assert.equal(result.phase, 'finalPressure');
  assert.ok(result.intent.moveId.length > 0);
  assert.equal('armorMultiplier' in result, false);
});

test('boss victory resolves quest and loot once', () => {
  const rng = { next: () => 0, pick: <T>(xs: readonly T[]) => xs[0] };
  const first = resolveBanditLeaderVictory({ status: 'accepted', rewardClaimed: false }, false, rng);
  assert.equal(first.resolved, true); assert.equal(first.quest.status, 'leaderDefeated'); assert.ok(first.lootId); assert.equal(first.exitUnlocked, true);
  const second = resolveBanditLeaderVictory(first.quest, true, rng);
  assert.equal(second.resolved, false); assert.equal(second.lootId, null);
});
