import { describe, expect, it } from 'vitest';
import { stepEnemyBrain } from '../../src/domain/ai/enemyBrain';
import { enemyDefinitions } from '../../src/content/enemies';

describe('enemy brain', () => {
  const melee = enemyDefinitions.find((enemy) => enemy.id === 'bandit_melee')!;
  it('chases visible distant targets and telegraphs before damage', () => {
    expect(stepEnemyBrain({ state: 'idle', stateElapsedMs: 0 }, { playerVisible: true, distance: 300, attackReady: true, hpRatio: 1 }, melee).state).toBe('chase');
    const near = stepEnemyBrain({ state: 'chase', stateElapsedMs: 0 }, { playerVisible: true, distance: 60, attackReady: true, hpRatio: 1 }, melee);
    expect(near.state).toBe('prepareAttack');
    expect(near.intent.type).toBe('prepareAttack');
  });
  it('requires telegraph and recovery for every damaging attack', () => {
    for (const enemy of enemyDefinitions) for (const attack of enemy.attacks) {
      expect(attack.telegraphMs).toBeGreaterThan(0);
      expect(attack.recoveryMs).toBeGreaterThan(0);
    }
  });
});
