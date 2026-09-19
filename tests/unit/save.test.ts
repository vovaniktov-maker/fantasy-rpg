import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../src/domain/state/GameState';
import { CURRENT_SAVE_VERSION, deserializeGameState, serializeGameState } from '../../src/domain/save/saveSchema';
import { LocalSaveRepository } from '../../src/domain/save/saveRepository';

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string) { return this.map.get(key) ?? null; }
  setItem(key: string, value: string) { this.map.set(key, value); }
  removeItem(key: string) { this.map.delete(key); }
}

describe('saves', () => {
  it('round trips current state', () => {
    const state = createInitialGameState();
    state.economy.gold = 77;
    expect(deserializeGameState(serializeGameState(state), new Set()).state.economy.gold).toBe(77);
  });
  it('migrates version 1', () => {
    const state = createInitialGameState();
    const raw = JSON.stringify({ version: 1, writtenAt: 'x', payload: { ...state, runSeed: undefined, ui: undefined } });
    expect(deserializeGameState(raw, new Set()).version).toBe(CURRENT_SAVE_VERSION);
  });
  it('loads backup when primary is malformed', () => {
    const storage = new MemoryStorage();
    const backup = createInitialGameState(); backup.economy.gold = 9;
    storage.setItem(LocalSaveRepository.PRIMARY_KEY, '{bad');
    storage.setItem(LocalSaveRepository.BACKUP_KEY, serializeGameState(backup));
    const repo = new LocalSaveRepository(storage, createInitialGameState, new Set());
    expect(repo.load().state.economy.gold).toBe(9);
  });
});
