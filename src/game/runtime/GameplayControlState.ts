export interface GameplayControlSnapshot {
  inputEnabled: boolean;
  paused: boolean;
}

type GameplayControlListener = () => void;

function sameSnapshot(a: GameplayControlSnapshot, b: GameplayControlSnapshot): boolean {
  return a.inputEnabled === b.inputEnabled && a.paused === b.paused;
}

export function canProcessGameplayInput(snapshot: Readonly<GameplayControlSnapshot>): boolean {
  return snapshot.inputEnabled && !snapshot.paused;
}

export class GameplayControlState {
  private readonly captures = new Set<string>();
  private paused = false;
  private snapshot: GameplayControlSnapshot = Object.freeze({ inputEnabled: true, paused: false });
  private readonly listeners = new Set<GameplayControlListener>();

  subscribe(listener: GameplayControlListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setUiCapture(source: string, active: boolean): void {
    if (active) this.captures.add(source);
    else this.captures.delete(source);
    this.refresh();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.refresh();
  }

  getSnapshot(): Readonly<GameplayControlSnapshot> {
    return this.snapshot;
  }

  private refresh(): void {
    const next: GameplayControlSnapshot = Object.freeze({
      inputEnabled: !this.paused && this.captures.size === 0,
      paused: this.paused,
    });
    if (sameSnapshot(this.snapshot, next)) return;
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }
}

export const gameplayControlState = new GameplayControlState();
