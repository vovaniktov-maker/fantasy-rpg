import { describe, expect, it } from 'vitest';
import { getBanditLeaderMovePool, getBossPhase, resolveBanditLeaderVictory, stepBanditLeaderBrain } from '../../src/domain/ai/bossBrain';

describe('Bandit Leader brain', () => {
  it('changes behavior phases at ~60% and ~25%', () => {
    expect(getBossPhase(1)).toBe('phase1');
    expect(getBossPhase(0.59)).toBe('phase2');
    expect(getBossPhase(0.24)).toBe('finalPressure');
  });
  it('keeps telegraphs/recoveries and a punish window in all phases', () => {
    for (const phase of ['phase1','phase2','finalPressure'] as const) {
      const pool = getBanditLeaderMovePool(phase);
      pool.filter((move) => move.damage > 0).forEach((move) => { expect(move.telegraphMs).toBeGreaterThan(0); expect(move.recoveryMs).toBeGreaterThan(0); });
      if (phase === 'finalPressure') expect(pool.some((move) => move.punishWindowMs >= 500)).toBe(true);
    }
  });
  it('selects phase moves without defensive inflation fields', () => {
    const result = stepBanditLeaderBrain({ sequence: 0 }, { hpRatio: 0.2, distance: 80, actionReady: true });
    expect(result.phase).toBe('finalPressure');
    expect(result).not.toHaveProperty('armorMultiplier');
  });
  it('resolves victory once', () => {
    const rng = { next: () => 0, pick: <T>(items: readonly T[]) => items[0] };
    const result = resolveBanditLeaderVictory({ status: 'accepted', rewardClaimed: false }, false, rng);
    expect(result.quest.status).toBe('leaderDefeated'); expect(result.lootId).toBeTruthy();
    expect(resolveBanditLeaderVictory(result.quest, true, rng).resolved).toBe(false);
  });
});
