import test from 'node:test';
import assert from 'node:assert/strict';
import { spendEnergy, tickEnergy } from '../../src/domain/combat/energy.js';
import { beginDodge, tickDodge } from '../../src/domain/combat/dodge.js';
import { advanceCombo } from '../../src/domain/combat/combo.js';
import { applyStatus, tickStatuses } from '../../src/domain/combat/statusEffects.js';

test('energy waits for delay then regenerates', () => {
  const spent = spendEnergy({ current: 100, max: 100, regenPerSecond: 40, regenDelayMs: 500, msSinceSpend: 999 }, 30);
  assert.equal(spent.current, 70);
  assert.equal(spent.msSinceSpend, 0);
  assert.equal(tickEnergy(spent, 250).current, 70);
  assert.equal(tickEnergy(spent, 750).current, 80);
});

test('dodge cannot start twice and invulnerability expires', () => {
  const first = beginDodge({ active: false, remainingMs: 0, invulnerableRemainingMs: 0 }, 120, 80);
  assert.equal(first.started, true);
  assert.equal(beginDodge(first.state, 120, 80).started, false);
  const ended = tickDodge(first.state, 121);
  assert.equal(ended.active, false);
  assert.equal(ended.invulnerableRemainingMs, 0);
});

test('combo advances to three and resets after timeout', () => {
  let state = { step: 0, timeSinceAdvanceMs: 0, chainLength: 3, resetAfterMs: 600 };
  state = advanceCombo(state, 0);
  assert.equal(state.step, 1);
  state = advanceCombo(state, 200);
  assert.equal(state.step, 2);
  state = advanceCombo(state, 200);
  assert.equal(state.step, 3);
  state = advanceCombo(state, 200);
  assert.equal(state.step, 3);
  state = advanceCombo(state, 700);
  assert.equal(state.step, 1);
});

test('status stacking caps, refreshes, ticks and expires', () => {
  const def = { id: 'poison', kind: 'poison' as const, durationMs: 1000, maxStacks: 3, tickIntervalMs: 250, damagePerStackPerTick: 2 };
  let statuses = applyStatus([], def);
  statuses = applyStatus(statuses, def);
  statuses = applyStatus(statuses, def);
  statuses = applyStatus(statuses, def);
  assert.equal(statuses[0].stacks, 3);
  assert.equal(statuses[0].remainingMs, 1000);
  const ticked = tickStatuses(statuses, 500);
  assert.equal(ticked.damage, 12);
  const expired = tickStatuses(ticked.statuses, 600);
  assert.equal(expired.statuses.length, 0);
});
