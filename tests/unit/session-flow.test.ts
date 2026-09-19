import { describe, expect, it } from 'vitest';
import { GameSession } from '../../src/game/GameSession';
import { GameBridge } from '../../src/game/bridge/GameBridge';
import { createInitialGameState } from '../../src/domain/state/GameState';
import { LocalSaveRepository, type StorageLike } from '../../src/domain/save/saveRepository';
import { buildContentRegistry } from '../../src/domain/content/contentRegistry';

class MemoryStorage implements StorageLike {
  readonly map = new Map<string, string>();
  writes = 0;
  getItem(key: string) { return this.map.get(key) ?? null; }
  setItem(key: string, value: string) { this.writes += 1; this.map.set(key, value); }
  removeItem(key: string) { this.map.delete(key); }
}

function makeSession(now = () => 1_000) {
  const storage = new MemoryStorage();
  const registry = buildContentRegistry();
  const repo = new LocalSaveRepository(storage, createInitialGameState, new Set(registry.items.keys()));
  const bridge = new GameBridge();
  return { storage, repo, bridge, session: new GameSession(repo, bridge, { now }) };
}

function potion(instanceId: string, definitionId: 'health_potion' | 'energy_potion', quantity = 2) {
  return { instanceId, definitionId, quantity, itemLevel: 1, rarity: 'common' };
}

describe('GameSession', () => {
  it('starts a new character with one health potion for the first expedition', () => {
    const { session } = makeSession();
    const state = session.startNew();

    expect(state.inventory.slots.some((slot) => slot?.definitionId === 'health_potion' && slot.quantity === 1)).toBe(true);
  });

  it('instantly consumes one health potion and respects shared cooldown', () => {
    let now = 1_000;
    const { session } = makeSession(() => now);
    const state = session.startNew();
    state.player.hp = 35;
    state.inventory.slots[0] = potion('hp-1', 'health_potion', 2);
    session.replaceState(state);

    expect(session.usePotion('health')).toBe(true);
    expect(session.getState().player.hp).toBe(85);
    expect(session.getState().inventory.slots[0]?.quantity).toBe(1);

    expect(session.usePotion('health')).toBe(false);
    expect(session.getState().inventory.slots[0]?.quantity).toBe(1);

    now += 1_000;
    expect(session.usePotion('health')).toBe(true);
    expect(session.getState().player.hp).toBe(100);
    expect(session.getState().inventory.slots[0]).toBeNull();
  });

  it('instantly restores energy and makes no change without a potion', () => {
    const { session } = makeSession();
    const state = session.startNew();
    state.player.energy = 20;
    state.inventory.slots[0] = potion('en-1', 'energy_potion', 1);
    session.replaceState(state);
    expect(session.usePotion('energy')).toBe(true);
    expect(session.getState().player.energy).toBe(80);
    expect(session.getState().inventory.slots[0]).toBeNull();

    const before = structuredClone(session.getState());
    expect(session.usePotion('energy')).toBe(false);
    expect(session.getState()).toEqual(before);
  });

  it('restores the exact checkpoint snapshot after death', () => {
    const { session } = makeSession();
    const state = session.startNew();
    state.progression = { level: 4, xp: 23, unspentSkillPoints: 2 };
    state.skills.learned.assassin_precision = 2;
    state.inventory.slots[0] = potion('hp-1', 'health_potion', 3);
    state.inventory.slots[1] = { instanceId: 'dagger-1', definitionId: 'steel_dagger', quantity: 1, itemLevel: 4, rarity: 'rare' };
    state.equipment.weapon = 'dagger-1';
    state.player.position = { x: 18, y: 22 };
    session.replaceState(state);
    session.onCheckpoint('forest', 18, 22);
    const checkpoint = structuredClone(session.getState());

    const damaged = structuredClone(session.getState());
    damaged.player.hp = 0;
    damaged.player.position = { x: 999, y: 999 };
    damaged.progression.level = 9;
    damaged.inventory.slots[0] = null;
    session.replaceState(damaged);

    expect(session.onDeath()).toEqual(checkpoint);
  });

  it('autosaves major milestones but not ordinary state replacement', () => {
    const { session, storage } = makeSession();
    session.startNew();
    const afterStart = storage.writes;
    const state = structuredClone(session.getState());
    state.economy.gold = 7;
    session.replaceState(state);
    expect(storage.writes).toBe(afterStart);

    session.enterOutpost();
    expect(storage.writes).toBeGreaterThan(afterStart);
    const afterOutpost = storage.writes;
    session.onCheckpoint('forest', 10, 20);
    expect(storage.writes).toBeGreaterThan(afterOutpost);
  });

  it('creates a fresh repeatable hideout seed without changing persistent progression', () => {
    const { session } = makeSession();
    const state = session.startNew();
    state.progression = { level: 6, xp: 77, unspentSkillPoints: 1 };
    state.skills.learned.duelist_footwork = 3;
    session.replaceState(state);

    session.enterHideout();
    const first = structuredClone(session.getState());
    session.enterOutpost();
    session.enterHideout();
    const second = session.getState();

    expect(second.runSeed).not.toBe(first.runSeed);
    expect(second.world.hideoutRunsStarted).toBe(first.world.hideoutRunsStarted + 1);
    expect(second.progression).toEqual(first.progression);
    expect(second.skills).toEqual(first.skills);
  });
});

it('runs the deterministic acceptance flow through the same session transitions', () => {
  const { session, bridge } = makeSession(() => 42);
  session.startNew();
  bridge.dispatch({ type: 'ACCEPT_QUEST', questId: 'bandit_leader_contract' });
  session.enterForest();
  session.completeForestEncounter();
  expect(session.grantLoot('steel_dagger')).toBe(true);
  session.enterHideout();
  session.enterBoss();
  session.markBanditLeaderDefeated();
  session.enterOutpost();
  bridge.dispatch({ type: 'TURN_IN_QUEST', questId: 'bandit_leader_contract' });
  expect(session.getState().quests.bandit_leader_contract).toBe('completed');
  expect(session.getState().economy.gold).toBe(250);
  expect(session.getState().world.forestEncounterDefeated).toBe(true);
});
