import type { ItemDefinition } from '../items/itemTypes.js';
import type { SkillNodeDefinition } from '../skills/skillTree.js';
import { createInitialGameState, type GameState } from '../state/GameState.js';

export const CURRENT_SAVE_VERSION = 2;

export interface SaveEnvelope<T> {
  version: number;
  writtenAt: string;
  payload: T;
}

export interface DeserializeResult {
  version: number;
  state: GameState;
  migrated: boolean;
}

export interface SaveContentIndex {
  itemIds: ReadonlySet<string>;
  skillNodes: ReadonlyMap<string, SkillNodeDefinition>;
  items?: ReadonlyMap<string, ItemDefinition>;
}

type SaveContentInput = SaveContentIndex | ReadonlySet<string>;

export function serializeGameState(state: GameState, writtenAt = new Date().toISOString()): string {
  const envelope: SaveEnvelope<GameState> = {
    version: CURRENT_SAVE_VERSION,
    writtenAt,
    payload: structuredClone(state),
  };
  return JSON.stringify(envelope);
}

function coerceState(payload: Partial<GameState>): GameState {
  const fresh = createInitialGameState();
  return {
    ...fresh,
    ...payload,
    player: { ...fresh.player, ...(payload.player ?? {}) },
    progression: { ...fresh.progression, ...(payload.progression ?? {}) },
    inventory: payload.inventory ? { capacity: payload.inventory.capacity, slots: [...payload.inventory.slots] } : fresh.inventory,
    equipment: { ...fresh.equipment, ...(payload.equipment ?? {}) },
    skills: { ...fresh.skills, ...(payload.skills ?? {}), learned: { ...fresh.skills.learned, ...(payload.skills?.learned ?? {}) } },
    economy: { ...fresh.economy, ...(payload.economy ?? {}) },
    quests: { ...fresh.quests, ...(payload.quests ?? {}) },
    checkpoint: { ...fresh.checkpoint, ...(payload.checkpoint ?? {}) },
    ui: { ...fresh.ui, ...(payload.ui ?? {}) },
    runSeed: typeof payload.runSeed === 'number' ? payload.runSeed : fresh.runSeed,
    world: { ...fresh.world, ...(payload.world ?? {}) },
  };
}

export function migrateSave(envelope: SaveEnvelope<unknown>): SaveEnvelope<GameState> {
  if (!Number.isInteger(envelope.version) || envelope.version < 1 || envelope.version > CURRENT_SAVE_VERSION) {
    throw new Error(`Unsupported save version: ${String(envelope.version)}`);
  }
  if (!envelope.payload || typeof envelope.payload !== 'object') throw new Error('Save payload must be an object');
  const state = coerceState(envelope.payload as Partial<GameState>);
  return { version: CURRENT_SAVE_VERSION, writtenAt: String(envelope.writtenAt || new Date(0).toISOString()), payload: state };
}

function normalizeContent(content: SaveContentInput): SaveContentIndex {
  if (content instanceof Set) {
    return { itemIds: content, skillNodes: new Map() };
  }
  return content;
}

export function sanitizeGameState(state: GameState, input: SaveContentInput): GameState {
  const content = normalizeContent(input);
  const next = structuredClone(state);

  if (content.itemIds.size > 0) {
    next.inventory.slots = next.inventory.slots.map((slot) =>
      slot && content.itemIds.has(slot.definitionId) ? slot : null,
    );
  }

  if (content.skillNodes.size > 0) {
    const learned: Record<string, number> = {};
    for (const [skillId, rawRank] of Object.entries(next.skills.learned)) {
      const definition = content.skillNodes.get(skillId);
      if (!definition) continue;
      const rank = Math.max(0, Math.min(definition.maxRank, Math.floor(rawRank)));
      if (rank > 0) learned[skillId] = rank;
    }
    next.skills.learned = learned;

    const learnedActiveIds = new Set<string>();
    for (const [nodeId, rank] of Object.entries(learned)) {
      if (rank <= 0) continue;
      const definition = content.skillNodes.get(nodeId);
      if (definition?.kind === 'active' && definition.activeSkillId) learnedActiveIds.add(definition.activeSkillId);
    }
    next.skills.equippedActiveSkillIds = next.skills.equippedActiveSkillIds
      .slice(0, 4)
      .map((skillId) => skillId && learnedActiveIds.has(skillId) ? skillId : null);
    while (next.skills.equippedActiveSkillIds.length < 4) next.skills.equippedActiveSkillIds.push(null);
  }

  const inventoryByInstance = new Map(
    next.inventory.slots
      .filter((slot): slot is NonNullable<typeof slot> => slot !== null)
      .map((slot) => [slot.instanceId, slot]),
  );
  for (const [slotName, instanceId] of Object.entries(next.equipment)) {
    if (!instanceId) continue;
    const item = inventoryByInstance.get(instanceId);
    if (!item) {
      next.equipment[slotName] = null;
      continue;
    }
    const definition = content.items?.get(item.definitionId);
    if (definition && definition.equipSlot !== slotName) next.equipment[slotName] = null;
  }

  return next;
}

export function deserializeGameState(serialized: string, content: SaveContentInput): DeserializeResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error('Malformed save JSON');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid save envelope');
  const raw = parsed as Partial<SaveEnvelope<unknown>>;
  if (typeof raw.version !== 'number') throw new Error('Missing save version');
  const migrated = migrateSave({ version: raw.version, writtenAt: String(raw.writtenAt ?? ''), payload: raw.payload });
  return {
    version: migrated.version,
    migrated: raw.version !== CURRENT_SAVE_VERSION,
    state: sanitizeGameState(migrated.payload, content),
  };
}
