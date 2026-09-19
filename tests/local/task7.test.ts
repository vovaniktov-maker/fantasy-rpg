import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialGameState } from '../../src/domain/state/GameState.js';
import { CURRENT_SAVE_VERSION, serializeGameState, deserializeGameState } from '../../src/domain/save/saveSchema.js';
import { LocalSaveRepository } from '../../src/domain/save/saveRepository.js';

class MemoryStorage {
  map = new Map<string,string>();
  getItem(k:string){ return this.map.get(k) ?? null; }
  setItem(k:string,v:string){ this.map.set(k,v); }
  removeItem(k:string){ this.map.delete(k); }
}

test('save round-trips persisted game state', () => {
  const state = createInitialGameState();
  state.progression = { level: 4, xp: 20, unspentSkillPoints: 2 };
  state.economy.gold = 777;
  state.skills.learned = { assassin_precision: 2 };
  state.quests.main_bandit = 'leaderDefeated';
  state.checkpoint = { screen: 'forest', x: 10, y: 20 };
  state.inventory.slots[0] = { instanceId: 'p1', definitionId: 'health_potion', quantity: 3 };
  const encoded = serializeGameState(state);
  const decoded = deserializeGameState(encoded, new Set(['health_potion']));
  assert.equal(decoded.version, CURRENT_SAVE_VERSION);
  assert.deepEqual(decoded.state.progression, state.progression);
  assert.equal(decoded.state.economy.gold, 777);
  assert.equal(decoded.state.inventory.slots[0]?.definitionId, 'health_potion');
});

test('unknown items are removed while rest of save survives', () => {
  const state = createInitialGameState();
  state.economy.gold = 25;
  state.inventory.slots[0] = { instanceId: 'bad', definitionId: 'removed_item', quantity: 1 };
  const decoded = deserializeGameState(serializeGameState(state), new Set(['health_potion']));
  assert.equal(decoded.state.inventory.slots[0], null);
  assert.equal(decoded.state.economy.gold, 25);
});

test('repository falls back to backup then fresh on malformed data', () => {
  const storage = new MemoryStorage();
  const fresh = createInitialGameState(); fresh.economy.gold = 1;
  const backup = createInitialGameState(); backup.economy.gold = 99;
  storage.setItem('fantasy-rpg.save.primary', '{bad');
  storage.setItem('fantasy-rpg.save.backup', serializeGameState(backup));
  const repo = new LocalSaveRepository(storage, () => fresh, new Set());
  assert.equal(repo.load().state.economy.gold, 99);
  storage.setItem('fantasy-rpg.save.backup', '{also bad');
  assert.equal(repo.load().state.economy.gold, 1);
});

test('version 1 envelopes migrate to current version', () => {
  const state = createInitialGameState();
  const v1 = JSON.stringify({ version: 1, writtenAt: '2026-01-01T00:00:00.000Z', payload: { ...state, runSeed: undefined, ui: undefined } });
  const decoded = deserializeGameState(v1, new Set());
  assert.equal(decoded.version, CURRENT_SAVE_VERSION);
  assert.equal(typeof decoded.state.runSeed, 'number');
  assert.equal(decoded.state.ui.inventoryOpen, false);
});
