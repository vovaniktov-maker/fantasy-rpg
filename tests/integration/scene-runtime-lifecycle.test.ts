import { describe, expect, it, vi } from 'vitest';
import { GameplayControlState } from '../../src/game/runtime/GameplayControlState';
import { SceneRuntimeHost } from '../../src/game/runtime/SceneRuntimeHost';

describe('SceneRuntimeHost', () => {
  it('does not advance scene simulation while paused', () => {
    const controls = new GameplayControlState();
    const host = new SceneRuntimeHost(controls);
    const frame = vi.fn();
    host.onFrame(frame);

    controls.setPaused(true);
    host.tick(250);
    expect(frame).not.toHaveBeenCalled();

    controls.setPaused(false);
    host.tick(16);
    expect(frame).toHaveBeenCalledTimes(1);
    host.dispose();
  });

  it('disposes frame listeners across repeated scene mounts', () => {
    const controls = new GameplayControlState();
    const first = new SceneRuntimeHost(controls);
    const firstSpy = vi.fn();
    first.onFrame(firstSpy);
    first.dispose();

    const second = new SceneRuntimeHost(controls);
    const secondSpy = vi.fn();
    second.onFrame(secondSpy);
    second.tick(16);

    expect(firstSpy).not.toHaveBeenCalled();
    expect(secondSpy).toHaveBeenCalledTimes(1);
    second.dispose();
  });
});
