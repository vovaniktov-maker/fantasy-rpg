import { createInitialGameState, type GameState } from '../../domain/state/GameState.js';
import type { GameCommand, GameEvent } from './gameMessages.js';

type StateListener = (state: Readonly<GameState>) => void;
type CommandListener = (command: GameCommand) => void;
type EventListener = (event: GameEvent) => void;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export class GameBridge {
  private state: GameState;
  private readonly stateListeners = new Set<StateListener>();
  private readonly commandListeners = new Set<CommandListener>();
  private readonly eventListeners = new Set<EventListener>();

  constructor(initial: GameState = createInitialGameState()) {
    this.state = deepFreeze(structuredClone(initial));
  }

  subscribe(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  publish(patch: Partial<GameState>): void {
    this.state = deepFreeze({ ...this.state, ...structuredClone(patch) } as GameState);
    for (const listener of this.stateListeners) listener(this.getSnapshot());
  }

  dispatch(command: GameCommand): void {
    for (const listener of this.commandListeners) listener(command);
  }

  onCommand(listener: CommandListener): () => void {
    this.commandListeners.add(listener);
    return () => this.commandListeners.delete(listener);
  }

  emit(event: GameEvent): void {
    for (const listener of this.eventListeners) listener(event);
  }

  onEvent(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  getSnapshot(): Readonly<GameState> {
    return this.state;
  }
}

export const gameBridge = new GameBridge();
