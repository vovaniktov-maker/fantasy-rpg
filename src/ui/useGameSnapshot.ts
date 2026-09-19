import { useSyncExternalStore } from 'react';
import { gameBridge } from '../game/bridge/GameBridge';
import type { GameState } from '../domain/state/GameState';

export function useGameSnapshot(): Readonly<GameState> {
  return useSyncExternalStore(
    (listener) => gameBridge.subscribe(listener),
    () => gameBridge.getSnapshot(),
    () => gameBridge.getSnapshot(),
  );
}
