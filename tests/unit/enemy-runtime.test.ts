import { describe, expect, it } from 'vitest';
import { enemyDefinitions } from '../../src/content/enemies';
import { CombatRuntime } from '../../src/game/runtime/CombatRuntime';
import { EnemyRuntime } from '../../src/game/runtime/EnemyRuntime';

describe('EnemyRuntime', () => {
  const melee = enemyDefinitions.find((enemy) => enemy.id === 'bandit_melee')!;

  it('telegraphs before opening a damaging window and recovers afterward', () => {
    const combat = new CombatRuntime(() => 0.5);
    const enemy = new EnemyRuntime({
      id: 'enemy-1',
      definition: melee,
      hp: 100,
      position: { x: 0, y: 0 },
      combat,
    });
    const close = { playerVisible: true, distance: 40, attackReady: true, hpRatio: 1 };

    const prepare = enemy.update(close, 16);
    expect(prepare.telegraph?.attackId).toBe('slash');
    expect(prepare.attackWindowId).toBeUndefined();

    enemy.update(close, 300);
    const attack = enemy.update(close, 1);
    expect(attack.attackWindowId).toBeDefined();

    enemy.update(close, 120);
    const recovery = enemy.update(close, 1);
    expect(recovery.recovering).toBe(true);
  });

  it('maps archetype movement intent to distinct velocities', () => {
    const combat = new CombatRuntime(() => 0.5);
    const archer = new EnemyRuntime({
      id: 'archer-1',
      definition: enemyDefinitions.find((enemy) => enemy.id === 'bandit_archer')!,
      hp: 80,
      position: { x: 0, y: 0 },
      combat,
    });
    const heavy = new EnemyRuntime({
      id: 'heavy-1',
      definition: enemyDefinitions.find((enemy) => enemy.id === 'bandit_heavy')!,
      hp: 160,
      position: { x: 0, y: 0 },
      combat,
    });

    const archerFrame = archer.update({ playerVisible: true, distance: 500, attackReady: false, hpRatio: 1 }, 16);
    const heavyFrame = heavy.update({ playerVisible: true, distance: 500, attackReady: false, hpRatio: 1 }, 16);

    expect(Math.hypot(archerFrame.velocity.x, archerFrame.velocity.y)).toBeGreaterThan(
      Math.hypot(heavyFrame.velocity.x, heavyFrame.velocity.y),
    );
  });
});
