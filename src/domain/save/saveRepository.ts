import type { GameState } from '../state/GameState.js';
import { deserializeGameState, serializeGameState, type SaveContentIndex } from './saveSchema.js';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LoadResult {
  state: GameState;
  source: 'primary' | 'backup' | 'fresh';
  recovered: boolean;
}

export class LocalSaveRepository {
  static readonly PRIMARY_KEY = 'fantasy-rpg.save.primary';
  static readonly BACKUP_KEY = 'fantasy-rpg.save.backup';

  constructor(
    private readonly storage: StorageLike,
    private readonly freshState: () => GameState,
    private readonly content: SaveContentIndex | ReadonlySet<string>,
  ) {}

  save(state: GameState): void {
    const current = this.storage.getItem(LocalSaveRepository.PRIMARY_KEY);
    if (current) {
      try {
        deserializeGameState(current, this.content);
        this.storage.setItem(LocalSaveRepository.BACKUP_KEY, current);
      } catch {
        // Invalid primary is never promoted to backup.
      }
    }
    this.storage.setItem(LocalSaveRepository.PRIMARY_KEY, serializeGameState(state));
  }

  load(): LoadResult {
    const primary = this.storage.getItem(LocalSaveRepository.PRIMARY_KEY);
    if (primary) {
      try {
        return { state: deserializeGameState(primary, this.content).state, source: 'primary', recovered: false };
      } catch {
        // fall through to backup
      }
    }
    const backup = this.storage.getItem(LocalSaveRepository.BACKUP_KEY);
    if (backup) {
      try {
        return { state: deserializeGameState(backup, this.content).state, source: 'backup', recovered: true };
      } catch {
        // fall through to a fresh state
      }
    }
    return { state: this.freshState(), source: 'fresh', recovered: true };
  }
}
