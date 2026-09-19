import { describe, expect, it, vi } from 'vitest';
import { GameBridge } from '../../src/game/bridge/GameBridge';

describe('GameBridge', () => {
  it('publishes snapshots and disposes listeners cleanly', () => {
    const bridge = new GameBridge();
    const listener = vi.fn();
    const unsubscribe = bridge.subscribe(listener);
    bridge.publish({ screen: 'outpost' });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    bridge.publish({ screen: 'forest' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps remaining listeners active without duplicates', () => {
    const bridge = new GameBridge();
    const disposed = vi.fn();
    const active = vi.fn();
    const offDisposed = bridge.subscribe(disposed);
    bridge.subscribe(active);
    offDisposed();
    bridge.publish({ screen: 'forest' });
    bridge.publish({ screen: 'hideout' });
    expect(disposed).not.toHaveBeenCalled();
    expect(active).toHaveBeenCalledTimes(2);
  });
});
