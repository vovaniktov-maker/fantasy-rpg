import { describe, expect, it } from 'vitest';
import { spendEnergy, tickEnergy } from '../../src/domain/combat/energy';
import { beginDodge, tickDodge } from '../../src/domain/combat/dodge';
import { advanceCombo } from '../../src/domain/combat/combo';
import { applyStatus, tickStatuses } from '../../src/domain/combat/statusEffects';

describe('Rogue combat state machines', () => {
  it('regenerates only after the configured delay', () => {
    const spent = spendEnergy({ current: 100, max: 100, regenPerSecond: 40, regenDelayMs: 500, msSinceSpend: 999 }, 30);
    expect(tickEnergy(spent, 250).current).toBe(70);
    expect(tickEnergy(spent, 750).current).toBe(80);
  });
  it('prevents overlapping dodge and expires invulnerability', () => {
    const first = beginDodge({ active: false, remainingMs: 0, invulnerableRemainingMs: 0 }, 120, 80);
    expect(beginDodge(first.state, 120, 80).started).toBe(false);
    expect(tickDodge(first.state, 121).invulnerableRemainingMs).toBe(0);
  });
  it('advances combo to max and resets after timeout', () => {
    let state = { step: 0, timeSinceAdvanceMs: 0, chainLength: 3, resetAfterMs: 600 };
    state = advanceCombo(state, 0); state = advanceCombo(state, 200); state = advanceCombo(state, 200);
    expect(state.step).toBe(3);
    expect(advanceCombo(state, 700).step).toBe(1);
  });
  it('caps and ticks status stacks deterministically', () => {
    const def = { id: 'poison', kind: 'poison' as const, durationMs: 1000, maxStacks: 3, tickIntervalMs: 250, damagePerStackPerTick: 2 };
    let statuses = applyStatus([], def); statuses = applyStatus(statuses, def); statuses = applyStatus(statuses, def); statuses = applyStatus(statuses, def);
    expect(statuses[0].stacks).toBe(3);
    expect(tickStatuses(statuses, 500).damage).toBe(12);
  });
});
