import { describe, expect, it } from 'vitest';
import { GameplayControlState, canProcessGameplayInput } from '../../src/game/runtime/GameplayControlState';

describe('gameplay runtime input gate', () => {
  it('prevents a runtime input callback while paused', () => {
    const controls = new GameplayControlState();
    controls.setPaused(true);
    expect(canProcessGameplayInput(controls.getSnapshot())).toBe(false);
    controls.setPaused(false);
    expect(canProcessGameplayInput(controls.getSnapshot())).toBe(true);
  });
});
