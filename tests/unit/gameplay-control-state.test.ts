import { describe, expect, it } from 'vitest';
import { GameplayControlState } from '../../src/game/runtime/GameplayControlState';

describe('GameplayControlState', () => {
  it('suppresses input while any UI owner captures controls', () => {
    const controls = new GameplayControlState();
    controls.setUiCapture('inventory', true);
    expect(controls.getSnapshot().inputEnabled).toBe(false);
    controls.setUiCapture('skills', true);
    controls.setUiCapture('inventory', false);
    expect(controls.getSnapshot().inputEnabled).toBe(false);
    controls.setUiCapture('skills', false);
    expect(controls.getSnapshot().inputEnabled).toBe(true);
  });

  it('pause disables input and marks simulation paused', () => {
    const controls = new GameplayControlState();
    controls.setPaused(true);
    expect(controls.getSnapshot()).toEqual({ inputEnabled: false, paused: true });
  });
});
