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

function sanitizeUnknownContent(state: GameState, knownItemIds: ReadonlySet<string>): GameState {
  if (knownItemIds.size === 0) return state;
  const next = structuredClone(state);
  next.inventory.slots = next.inventory.slots.map((slot) => slot && knownItemIds.has(slot.definitionId) ? slot : null);
  const validInstances = new Set(next.inventory.slots.filter(Boolean).map((slot) => slot!.instanceId));
  for (const [slot, instanceId] of Object.entries(next.equipment)) {
    if (instanceId && !validInstances.has(instanceId)) next.equipment[slot] = null;
  }
  return next;
}

export function deserializeGameState(serialized: string, knownItemIds: ReadonlySet<string>): DeserializeResult {
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
    state: sanitizeUnknownContent(migrated.payload, knownItemIds),
  };
}
