import { buildContentRegistry } from '../domain/content/contentRegistry.js';
import { addSerializedItem } from '../domain/inventory/inventory.js';
import { grantXp } from '../domain/progression/leveling.js';
import { advanceQuest, turnInQuest, type BanditQuestStatus, type QuestState } from '../domain/quests/questState.js';
import { LocalSaveRepository, type StorageLike } from '../domain/save/saveRepository.js';
import { createInitialGameState, type GameState, type ScreenId, type SerializableItemStack } from '../domain/state/GameState.js';
import { assignActiveSkill, respecSkills, unlockSkill } from '../domain/skills/skillTree.js';
import { rogueSkillNodes } from '../content/skills.js';
import { questDefinitions } from '../content/quests.js';
import { gameBridge, GameBridge } from './bridge/GameBridge.js';
import type { GameCommand } from './bridge/gameMessages.js';

export type PotionKind = 'health' | 'energy';

export interface GameSessionOptions {
  now?: () => number;
  potionCooldownMs?: number;
  healthPotionRestore?: number;
  energyPotionRestore?: number;
}

const BANDIT_QUEST_ID = 'bandit_leader_contract';
const CONTENT = buildContentRegistry();

function nextRunSeed(seed: number): number {
  return (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0 || 1;
}

function cloneState(state: Readonly<GameState>): GameState {
  return structuredClone(state) as GameState;
}

function questStateFromGame(state: GameState): QuestState {
  return {
    status: (state.quests[BANDIT_QUEST_ID] as BanditQuestStatus | undefined) ?? 'available',
    rewardClaimed: state.quests[`${BANDIT_QUEST_ID}:rewardClaimed`] === 'true',
  };
}

function applyQuestState(state: GameState, quest: QuestState): void {
  state.quests[BANDIT_QUEST_ID] = quest.status;
  state.quests[`${BANDIT_QUEST_ID}:rewardClaimed`] = String(quest.rewardClaimed);
}

function consumeSerializedItem(state: GameState, definitionId: string): boolean {
  const index = state.inventory.slots.findIndex((slot) => slot?.definitionId === definitionId && slot.quantity > 0);
  if (index < 0) return false;
  const slot = state.inventory.slots[index]!;
  if (slot.quantity <= 1) state.inventory.slots[index] = null;
  else state.inventory.slots[index] = { ...slot, quantity: slot.quantity - 1 };
  return true;
}

export class GameSession {
  private state: GameState = createInitialGameState();
  private potionCooldownUntilMs = 0;
  private readonly now: () => number;
  private readonly potionCooldownMs: number;
  private readonly healthPotionRestore: number;
  private readonly energyPotionRestore: number;
  private readonly unsubscribeCommand: () => void;

  constructor(
    private readonly repository: LocalSaveRepository,
    private readonly bridge: GameBridge,
    options: GameSessionOptions = {},
  ) {
    this.now = options.now ?? (() => Date.now());
    this.potionCooldownMs = options.potionCooldownMs ?? 1_000;
    this.healthPotionRestore = options.healthPotionRestore ?? 50;
    this.energyPotionRestore = options.energyPotionRestore ?? 60;
    this.unsubscribeCommand = this.bridge.onCommand((command) => this.handleCommand(command));
  }

  dispose(): void {
    this.unsubscribeCommand();
  }

  getState(): GameState {
    return cloneState(this.state);
  }

  replaceState(state: GameState): GameState {
    this.state = cloneState(state);
    this.publish();
    return this.getState();
  }

  startNew(): GameState {
    this.potionCooldownUntilMs = 0;
    this.state = createInitialGameState();
    this.publish();
    return this.getState();
  }

  load(): GameState {
    this.state = this.repository.load().state;
    this.publish();
    return this.getState();
  }

  save(): void {
    this.repository.save(this.state);
  }

  onCheckpoint(screen: ScreenId, x: number, y: number): GameState {
    const next = cloneState(this.state);
    next.screen = screen;
    next.player.position = { x, y };
    next.checkpoint = { screen, x, y };
    this.state = next;
    this.publish();
    this.save();
    return this.getState();
  }

  onDeath(): GameState {
    this.state = this.repository.load().state;
    this.potionCooldownUntilMs = 0;
    this.publish();
    return this.getState();
  }

  usePotion(kind: PotionKind): boolean {
    const now = this.now();
    if (now < this.potionCooldownUntilMs) return false;
    const definitionId = kind === 'health' ? 'health_potion' : 'energy_potion';
    const current = kind === 'health' ? this.state.player.hp : this.state.player.energy;
    const max = kind === 'health' ? this.state.player.maxHp : this.state.player.maxEnergy;
    if (current >= max) return false;
    const next = cloneState(this.state);
    if (!consumeSerializedItem(next, definitionId)) return false;
    if (kind === 'health') next.player.hp = Math.min(next.player.maxHp, next.player.hp + this.healthPotionRestore);
    else next.player.energy = Math.min(next.player.maxEnergy, next.player.energy + this.energyPotionRestore);
    this.state = next;
    this.potionCooldownUntilMs = now + this.potionCooldownMs;
    this.publish();
    this.bridge.emit({
      type: 'PLAYER_RESOURCES_SYNCED',
      hp: next.player.hp,
      energy: next.player.energy,
    });
    return true;
  }

  enterOutpost(): GameState {
    const next = cloneState(this.state);
    next.screen = 'outpost';
    const quest = questStateFromGame(next);
    if (quest.status === 'leaderDefeated') applyQuestState(next, advanceQuest(quest, 'returnToOutpost'));
    this.state = next;
    this.publish();
    this.save();
    return this.getState();
  }

  enterForest(): GameState {
    const next = cloneState(this.state);
    next.screen = 'forest';
    this.state = next;
    this.publish();
    return this.getState();
  }

  completeForestEncounter(): GameState {
    const next = cloneState(this.state);
    next.world.forestEncounterDefeated = true;
    this.state = next;
    this.publish();
    return this.getState();
  }

  grantLoot(definitionId: string, rarity = 'rare'): boolean {
    const definition = CONTENT.items.get(definitionId);
    if (!definition) return false;
    const next = cloneState(this.state);
    const item: SerializableItemStack = {
      instanceId: `loot-${definitionId}-${this.now()}-${next.world.hideoutRunsStarted}`,
      definitionId,
      quantity: 1,
      itemLevel: next.progression.level,
      rarity: definition.uniqueEffect ? 'unique' : rarity,
    };
    const added = addSerializedItem(next.inventory, item, CONTENT.items);
    if (!added.added) return false;
    next.inventory = added.state;
    this.state = next;
    this.publish();
    return true;
  }

  enterHideout(): GameState {
    const next = cloneState(this.state);
    next.screen = 'hideout';
    next.runSeed = nextRunSeed(next.runSeed);
    next.world.hideoutRunsStarted += 1;
    this.state = next;
    this.publish();
    return this.getState();
  }

  enterBoss(): GameState {
    const next = cloneState(this.state);
    next.screen = 'boss';
    this.state = next;
    this.publish();
    return this.getState();
  }

  markBanditLeaderDefeated(): GameState {
    const next = cloneState(this.state);
    applyQuestState(next, advanceQuest(questStateFromGame(next), 'leaderDefeated'));
    this.state = next;
    this.publish();
    this.save();
    return this.getState();
  }

  private acceptQuest(questId: string): void {
    if (questId !== BANDIT_QUEST_ID) return;
    const next = cloneState(this.state);
    const advanced = advanceQuest(questStateFromGame(next), 'accept');
    if (advanced.status === questStateFromGame(next).status) return;
    applyQuestState(next, advanced);
    this.state = next;
    this.publish();
    this.save();
  }

  private turnIn(questId: string): void {
    if (questId !== BANDIT_QUEST_ID) return;
    const currentQuest = questStateFromGame(this.state);
    const result = turnInQuest(currentQuest);
    if (!result.success) return;
    const definition = questDefinitions.find((quest) => quest.id === questId);
    if (!definition) return;
    const next = cloneState(this.state);
    for (const rewardItemId of definition.rewardItemIds) {
      const reward: SerializableItemStack = { instanceId: `quest-${rewardItemId}-${this.now()}`, definitionId: rewardItemId, quantity: 1, itemLevel: next.progression.level, rarity: 'rare' };
      const added = addSerializedItem(next.inventory, reward, CONTENT.items);
      if (!added.added) return;
      next.inventory = added.state;
    }
    next.economy.gold += definition.rewardGold;
    next.progression = grantXp(next.progression, definition.rewardXp);
    applyQuestState(next, result.state);
    this.state = next;
    this.publish();
    this.save();
  }

  private unlock(skillId: string): void {
    const next = cloneState(this.state);
    const result = unlockSkill(rogueSkillNodes, { learned: next.skills.learned }, skillId, next.progression.unspentSkillPoints);
    if (!result.unlocked) return;
    next.skills.learned = result.state.learned;
    next.progression.unspentSkillPoints = result.pointsRemaining;
    this.state = next;
    this.publish();
  }

  private assignActive(activeSkillId: string, slotIndex: number): void {
    const next = cloneState(this.state);
    const result = assignActiveSkill(
      rogueSkillNodes,
      { learned: next.skills.learned },
      next.skills.equippedActiveSkillIds,
      activeSkillId,
      slotIndex,
    );
    if (!result.assigned) return;
    next.skills.equippedActiveSkillIds = result.slots;
    this.state = next;
    this.publish();
  }

  private respec(): void {
    const next = cloneState(this.state);
    const result = respecSkills({ learned: next.skills.learned }, next.economy.gold, next.progression.level);
    if (!result.success) return;
    next.skills.learned = result.state.learned;
    next.skills.equippedActiveSkillIds = [null, null, null, null];
    next.economy.gold = result.gold;
    next.progression.unspentSkillPoints += result.refundedPoints;
    this.state = next;
    this.publish();
    this.save();
  }

  private buy(definitionId: string): void {
    const prices: Record<string, number> = { health_potion: 25, energy_potion: 20, steel_dagger: 80 };
    const price = prices[definitionId];
    if (price === undefined || this.state.economy.gold < price || !CONTENT.items.has(definitionId)) return;
    const next = cloneState(this.state);
    const item: SerializableItemStack = { instanceId: `merchant-${definitionId}-${this.now()}`, definitionId, quantity: 1, itemLevel: next.progression.level, rarity: 'common' };
    const added = addSerializedItem(next.inventory, item, CONTENT.items);
    if (!added.added) return;
    next.inventory = added.state;
    next.economy.gold -= price;
    this.state = next;
    this.publish();
  }

  private equip(itemId: string, requestedSlot: string): void {
    const next = cloneState(this.state);
    const item = next.inventory.slots.find((slot) => slot?.instanceId === itemId);
    if (!item) return;
    const definition = CONTENT.items.get(item.definitionId);
    if (!definition?.equipSlot || definition.equipSlot !== requestedSlot) return;
    next.equipment[definition.equipSlot] = item.instanceId;
    this.state = next;
    this.publish();
  }

  private handleCommand(command: GameCommand): void {
    switch (command.type) {
      case 'USE_POTION': this.usePotion(command.kind); break;
      case 'SAVE_GAME': this.save(); break;
      case 'UNLOCK_SKILL': this.unlock(command.skillId); break;
      case 'ASSIGN_ACTIVE_SKILL': this.assignActive(command.activeSkillId, command.slotIndex); break;
      case 'RESPEC_SKILLS': this.respec(); break;
      case 'ACCEPT_QUEST': this.acceptQuest(command.questId); break;
      case 'TURN_IN_QUEST': this.turnIn(command.questId); break;
      case 'EQUIP_ITEM': this.equip(command.itemId, command.slot); break;
      case 'BUY_ITEM': this.buy(command.itemId); break;
    }
  }

  private publish(): void {
    this.bridge.publish(cloneState(this.state));
  }
}

class MemoryStorage implements StorageLike {
  private readonly data = new Map<string, string>();
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void { this.data.set(key, value); }
  removeItem(key: string): void { this.data.delete(key); }
}

let defaultSession: GameSession | null = null;

export function getDefaultGameSession(): GameSession {
  if (defaultSession) return defaultSession;
  const storage: StorageLike = typeof window !== 'undefined' && window.localStorage ? window.localStorage : new MemoryStorage();
  const repository = new LocalSaveRepository(storage, createInitialGameState, {
    itemIds: new Set(CONTENT.items.keys()),
    skillNodes: CONTENT.skills,
    items: CONTENT.items,
  });
  defaultSession = new GameSession(repository, gameBridge);
  defaultSession.load();
  return defaultSession;
}
