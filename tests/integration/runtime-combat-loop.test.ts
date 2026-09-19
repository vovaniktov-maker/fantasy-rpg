import { describe, expect, it } from 'vitest';
import { enemyDefinitions } from '../../src/content/enemies';
import type { CoreStats } from '../../src/domain/stats/stats';
import { CombatRuntime } from '../../src/game/runtime/CombatRuntime';
import { EnemyRuntime } from '../../src/game/runtime/EnemyRuntime';
import { PlayerRuntime } from '../../src/game/runtime/PlayerRuntime';

const stats: CoreStats = {
  hp: 100,
  energy: 100,
  attackPower: 25,
  critChance: 0,
  critDamage: 1.5,
  armor: 0,
  moveSpeed: 180,
  attackSpeed: 1,
  cooldownReduction: 0,
  dodgeDistance: 120,
};

function idleInput() {
  return {
    moveX: 0,
    moveY: 0,
    aimX: 100,
    aimY: 0,
    basicAttackPressed: false,
    dodgePressed: false,
    skillSlotPressed: null,
  };
}

describe('runtime combat loop', () => {
  it('connects player and enemy attack windows without duplicate damage', () => {
    const combat = new CombatRuntime(() => 0.5);
    const player = new PlayerRuntime({
      id: 'player',
      position: { x: 0, y: 0 },
      hp: 100,
      stats,
      learnedSkills: new Set(),
      equippedSkills: [],
      combat,
    });
    const enemy = new EnemyRuntime({
      id: 'enemy',
      definition: enemyDefinitions.find((value) => value.id === 'bandit_melee')!,
      hp: 100,
      position: { x: 40, y: 0 },
      combat,
    });

    const attack = player.update({ ...idleInput(), basicAttackPressed: true }, 16);
    expect(attack.attackWindowId).toBeDefined();
    const first = combat.tryHit(attack.attackWindowId!, enemy.getCombatTarget());
    const duplicate = combat.tryHit(attack.attackWindowId!, enemy.getCombatTarget());
    expect(first.applied).toBe(true);
    expect(duplicate.applied).toBe(false);
    expect(enemy.snapshot.hp).toBeLessThan(100);
  });

  it('telegraphs before damage and respects player dodge invulnerability', () => {
    const combat = new CombatRuntime(() => 0.5);
    const player = new PlayerRuntime({
      id: 'player',
      position: { x: 0, y: 0 },
      hp: 100,
      stats,
      learnedSkills: new Set(),
      equippedSkills: [],
      combat,
    });
    const enemy = new EnemyRuntime({
      id: 'enemy',
      definition: enemyDefinitions.find((value) => value.id === 'bandit_melee')!,
      hp: 100,
      position: { x: 40, y: 0 },
      combat,
    });
    const observation = { playerVisible: true, distance: 40, attackReady: true, hpRatio: 1 };

    const telegraph = enemy.update(observation, 16);
    expect(telegraph.telegraph).toBeDefined();
    expect(telegraph.attackWindowId).toBeUndefined();

    enemy.update(observation, 300);
    const active = enemy.update(observation, 1);
    expect(active.attackWindowId).toBeDefined();

    player.update({ ...idleInput(), dodgePressed: true, moveX: 1 }, 16);
    const before = player.snapshot.hp;
    const hit = combat.tryHit(active.attackWindowId!, player.getCombatTarget());
    expect(hit.applied).toBe(false);
    expect(player.snapshot.hp).toBe(before);
  });
});
