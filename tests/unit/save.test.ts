import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../src/domain/state/GameState';
import { CURRENT_SAVE_VERSION, deserializeGameState, serializeGameState } from '../../src/domain/save/saveSchema';
import { LocalSaveRepository } from '../../src/domain/save/saveRepository';
import { buildContentRegistry } from '../../src/domain/content/contentRegistry';

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
  it('removes unknown skills, invalid active slots, and stale equipment references', () => {
    const content = buildContentRegistry();
    const state = createInitialGameState();
    state.skills.learned = { assassin_precision: 99, removed_skill: 3 };
    state.skills.equippedActiveSkillIds = ['removed_active', 'shadow_dash', null, null];
    state.inventory.slots[0] = {
      instanceId: 'dagger-1',
      definitionId: 'steel_dagger',
      quantity: 1,
      itemLevel: 1,
      rarity: 'rare',
    };
    state.equipment.weapon = 'missing-instance';

    const raw = serializeGameState(state);
    const restored = deserializeGameState(raw, {
      itemIds: new Set(content.items.keys()),
      skillNodes: content.skills,
    }).state;

    expect(restored.skills.learned.removed_skill).toBeUndefined();
    expect(restored.skills.learned.assassin_precision).toBe(3);
    expect(restored.skills.equippedActiveSkillIds[0]).toBeNull();
    expect(restored.skills.equippedActiveSkillIds[1]).toBe('shadow_dash');
    expect(restored.equipment.weapon).toBeNull();
  });
});
