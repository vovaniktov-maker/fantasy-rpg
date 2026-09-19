import { describe, expect, it } from 'vitest';
import { CombatRuntime } from '../../src/game/runtime/CombatRuntime';
import type { RuntimeCombatTarget } from '../../src/game/runtime/runtimeTypes';

function makeTarget(id: string, hp: number, armor: number, invulnerable = false): RuntimeCombatTarget & { hp: number } {
  return {
    id,
    hp,
    getHp() { return this.hp; },
    getArmor() { return armor; },
    isInvulnerable() { return invulnerable; },
    applyDamage(amount: number) { this.hp = Math.max(0, this.hp - amount); },
  };
}

describe('CombatRuntime', () => {
  it('damages a target only once per active attack window', () => {
    const combat = new CombatRuntime(() => 0.5);
    const target = makeTarget('enemy-1', 100, 0);
    const attackId = combat.beginAttack({
      ownerId: 'player',
      rawDamage: 20,
      critChance: 0,
      critDamage: 1.5,
    });

    expect(combat.tryHit(attackId, target).applied).toBe(true);
    expect(combat.tryHit(attackId, target).applied).toBe(false);
    expect(target.hp).toBe(80);
  });

  it('does not damage an invulnerable target', () => {
    const combat = new CombatRuntime(() => 0);
    const target = makeTarget('player', 100, 0, true);
    const id = combat.beginAttack({ ownerId: 'enemy', rawDamage: 50, critChance: 0, critDamage: 1 });
    expect(combat.tryHit(id, target).applied).toBe(false);
    expect(target.hp).toBe(100);
  });
});
