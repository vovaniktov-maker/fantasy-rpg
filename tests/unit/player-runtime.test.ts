import { describe, expect, it } from 'vitest';
import { ROGUE_BASE_STATS } from '../../src/domain/stats/DerivedStatsService';
import { CombatRuntime } from '../../src/game/runtime/CombatRuntime';
import { PlayerRuntime, type PlayerRuntimeInput } from '../../src/game/runtime/PlayerRuntime';

function makeInput(patch: Partial<PlayerRuntimeInput> = {}): PlayerRuntimeInput {
  return {
    moveX: 0,
    moveY: 0,
    aimX: 100,
    aimY: 0,
    basicAttackPressed: false,
    dodgePressed: false,
    skillSlotPressed: null,
    ...patch,
  };
}

function makeRuntime(options: { learned?: string[]; equipped?: Array<string | null> } = {}) {
  return new PlayerRuntime({
    id: 'player',
    position: { x: 0, y: 0 },
    hp: ROGUE_BASE_STATS.hp,
    stats: ROGUE_BASE_STATS,
    learnedSkills: new Set(options.learned ?? []),
    equippedSkills: options.equipped ?? [null, null, null, null],
    combat: new CombatRuntime(() => 0.5),
  });
}

describe('PlayerRuntime', () => {
  it('ignores movement and attack while gameplay input is disabled', () => {
    const runtime = makeRuntime();
    runtime.setControls({ inputEnabled: false, paused: false });
    const frame = runtime.update(makeInput({ moveX: 1, basicAttackPressed: true }), 16);
    expect(frame.velocity).toEqual({ x: 0, y: 0 });
    expect(frame.attackStarted).toBe(false);
  });

  it('spends dodge energy once while the dodge is already active', () => {
    const runtime = makeRuntime();
    const first = runtime.update(makeInput({ moveX: 1, dodgePressed: true }), 16);
    const second = runtime.update(makeInput({ moveX: 1, dodgePressed: true }), 16);
    expect(first.dodgeStarted).toBe(true);
    expect(second.dodgeStarted).toBe(false);
    expect(runtime.snapshot.energy).toBe(70);
    expect(first.velocity.x).toBeGreaterThan(ROGUE_BASE_STATS.moveSpeed);
  });

  it('gives an accepted dodge priority over a basic attack on the same frame', () => {
    const runtime = makeRuntime();
    const frame = runtime.update(makeInput({ moveX: 1, dodgePressed: true, basicAttackPressed: true }), 16);
    expect(frame.dodgeStarted).toBe(true);
    expect(frame.attackStarted).toBe(false);
  });

  it('starts an assigned learned active skill and pays its energy cost', () => {
    const runtime = makeRuntime({ learned: ['shadow_dash'], equipped: ['shadow_dash', null, null, null] });
    const frame = runtime.update(makeInput({ skillSlotPressed: 0 }), 16);
    expect(frame.skillStarted).toBe(true);
    expect(frame.skillId).toBe('shadow_dash');
    expect(runtime.snapshot.energy).toBe(65);
  });
});
