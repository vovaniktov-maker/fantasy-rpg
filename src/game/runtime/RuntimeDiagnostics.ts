export interface RuntimeEnemyDiagnostic {
  id: string;
  x: number;
  y: number;
  hp: number;
}

export interface RuntimeDiagnosticsSnapshot {
  enemies: readonly RuntimeEnemyDiagnostic[];
  hideoutCleared: boolean;
}

type Listener = () => void;

export class RuntimeDiagnostics {
  private snapshot: RuntimeDiagnosticsSnapshot = Object.freeze({
    enemies: Object.freeze([]),
    hideoutCleared: false,
  });
  private readonly listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): RuntimeDiagnosticsSnapshot {
    return this.snapshot;
  }

  setEnemies(enemies: readonly RuntimeEnemyDiagnostic[]): void {
    const frozenEnemies = Object.freeze(enemies.map((enemy) => Object.freeze({ ...enemy })));
    const same = this.snapshot.enemies.length === frozenEnemies.length
      && this.snapshot.enemies.every((enemy, index) => {
        const candidate = frozenEnemies[index];
        return candidate && enemy.id === candidate.id && enemy.x === candidate.x && enemy.y === candidate.y && enemy.hp === candidate.hp;
      });
    if (same) return;
    this.snapshot = Object.freeze({
      ...this.snapshot,
      enemies: frozenEnemies,
    });
    this.notify();
  }

  setHideoutCleared(hideoutCleared: boolean): void {
    if (this.snapshot.hideoutCleared === hideoutCleared) return;
    this.snapshot = Object.freeze({
      ...this.snapshot,
      hideoutCleared,
    });
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

export const runtimeDiagnostics = new RuntimeDiagnostics();
