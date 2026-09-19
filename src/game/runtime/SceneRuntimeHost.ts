import type { GameplayControlSnapshot } from './GameplayControlState.js';
import { GameplayControlState } from './GameplayControlState.js';

type FrameListener = (dtMs: number, controls: Readonly<GameplayControlSnapshot>) => void;

export class SceneRuntimeHost {
  private readonly frameListeners = new Set<FrameListener>();
  private readonly disposers = new Set<() => void>();
  private disposed = false;

  constructor(private readonly controls: GameplayControlState) {
    const unsubscribe = controls.subscribe(() => {
      if (this.disposed) return;
    });
    this.disposers.add(unsubscribe);
  }

  onFrame(listener: FrameListener): () => void {
    if (this.disposed) return () => {};
    this.frameListeners.add(listener);
    const off = () => this.frameListeners.delete(listener);
    this.disposers.add(off);
    return () => {
      off();
      this.disposers.delete(off);
    };
  }

  own(disposer: () => void): void {
    if (this.disposed) {
      disposer();
      return;
    }
    this.disposers.add(disposer);
  }

  tick(dtMs: number): void {
    if (this.disposed) return;
    const snapshot = this.controls.getSnapshot();
    if (snapshot.paused) return;
    for (const listener of this.frameListeners) listener(Math.max(0, dtMs), snapshot);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const disposer of [...this.disposers]) disposer();
    this.disposers.clear();
    this.frameListeners.clear();
  }
}
