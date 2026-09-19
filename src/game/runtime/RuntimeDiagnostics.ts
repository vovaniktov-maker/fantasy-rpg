export interface RuntimeEnemyDiagnostic {
  id: string;
  x: number;
  y: number;
  hp: number;
}

export interface RuntimeDiagnosticsSnapshot {
  enemies: readonly RuntimeEnemyDiagnostic[];
}

type Listener = () => void;

export class RuntimeDiagnostics {
  private snapshot: RuntimeDiagnosticsSnapshot = Object.freeze({ enemies: Object.freeze([]) });
  private readonly listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): RuntimeDiagnosticsSnapshot {
    return this.snapshot;
  }

  setEnemies(enemies: readonly RuntimeEnemyDiagnostic[]): void {
    const next = Object.freeze({
      enemies: Object.freeze(enemies.map((enemy) => Object.freeze({ ...enemy }))),
    });
    const same = this.snapshot.enemies.length === next.enemies.length
      && this.snapshot.enemies.every((enemy, index) => {
        const candidate = next.enemies[index];
        return candidate && enemy.id === candidate.id && enemy.x === candidate.x && enemy.y === candidate.y && enemy.hp === candidate.hp;
      });
    if (same) return;
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }
}

export const runtimeDiagnostics = new RuntimeDiagnostics();
