import { describe, expect, it } from 'vitest';
import { banditLeaderRuntimeDefinition } from '../../src/content/enemies';
import { CombatRuntime } from '../../src/game/runtime/CombatRuntime';
import { BossRuntime } from '../../src/game/runtime/BossRuntime';

describe('BossRuntime', () => {
  it('changes phase behavior without changing max hp or armor', () => {
    const boss = new BossRuntime({ combat: new CombatRuntime(() => 0.5) });
    const initial = boss.snapshot;

    boss.setHp(Math.floor(initial.maxHp * 0.59));
    expect(boss.snapshot.phase).toBe('phase2');
    expect(boss.snapshot.maxHp).toBe(initial.maxHp);
    expect(boss.snapshot.armor).toBe(initial.armor);

    boss.setHp(Math.floor(initial.maxHp * 0.24));
    expect(boss.snapshot.phase).toBe('finalPressure');
    expect(boss.snapshot.maxHp).toBe(initial.maxHp);
    expect(boss.snapshot.armor).toBe(initial.armor);
    expect(initial.maxHp).toBe(banditLeaderRuntimeDefinition.maxHp);
  });

  it('telegraphs before opening a damaging move window and recovers afterward', () => {
    const boss = new BossRuntime({ combat: new CombatRuntime(() => 0.5), timingMultiplier: 1 });
    const first = boss.update({ distance: 60 }, 1);
    expect(first.telegraph).toBeDefined();
    expect(first.attackWindowId).toBeUndefined();

    boss.update({ distance: 60 }, 260);
    const active = boss.update({ distance: 60 }, 1);
    expect(active.attackWindowId).toBeDefined();

    boss.update({ distance: 60 }, 320);
    const recovery = boss.update({ distance: 60 }, 1);
    expect(recovery.recovering).toBe(true);
  });

  it('resolves victory only once', () => {
    const boss = new BossRuntime({ combat: new CombatRuntime(() => 0.5) });
    boss.setHp(0);
    expect(boss.consumeVictory().resolved).toBe(true);
    expect(boss.consumeVictory().resolved).toBe(false);
  });
});


  it('scales outgoing damage without changing authored phase stats', () => {
    const combat = new CombatRuntime(() => 0.5);
    const boss = new BossRuntime({ combat, damageMultiplier: 0.1 });
    const initial = boss.snapshot;
    let targetHp = 100;
    const target = {
      id: 'player',
      getHp: () => targetHp,
      getArmor: () => 0,
      isInvulnerable: () => false,
      applyDamage: (amount: number) => { targetHp -= amount; },
    };

    boss.update({ distance: 60 }, 1);
    boss.update({ distance: 60 }, 260);
    const active = boss.update({ distance: 60 }, 1);
    expect(active.attackWindowId).toBeDefined();
    combat.tryHit(active.attackWindowId!, target);

    expect(targetHp).toBe(98);
    expect(boss.snapshot.maxHp).toBe(initial.maxHp);
    expect(boss.snapshot.armor).toBe(initial.armor);
  });
