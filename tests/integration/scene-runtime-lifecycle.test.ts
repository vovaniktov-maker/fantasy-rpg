import { describe, expect, it, vi } from 'vitest';
import { GameplayControlState } from '../../src/game/runtime/GameplayControlState';
import { SceneRuntimeHost } from '../../src/game/runtime/SceneRuntimeHost';

describe('SceneRuntimeHost', () => {
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
