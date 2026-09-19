import { useEffect, useSyncExternalStore } from 'react';
import {
  gameplayControlState,
  type GameplayControlSnapshot,
} from '../game/runtime/GameplayControlState';

export interface GameplayControlOwners {
  inventoryOpen: boolean;
  skillsOpen: boolean;
  merchantOpen: boolean;
  paused: boolean;
}

export function useGameplayControls(owners: GameplayControlOwners): Readonly<GameplayControlSnapshot> {
  useEffect(() => {
    gameplayControlState.setUiCapture('inventory', owners.inventoryOpen);
    return () => gameplayControlState.setUiCapture('inventory', false);
  }, [owners.inventoryOpen]);

  useEffect(() => {
    gameplayControlState.setUiCapture('skills', owners.skillsOpen);
    return () => gameplayControlState.setUiCapture('skills', false);
  }, [owners.skillsOpen]);

  useEffect(() => {
    gameplayControlState.setUiCapture('merchant', owners.merchantOpen);
    return () => gameplayControlState.setUiCapture('merchant', false);
  }, [owners.merchantOpen]);

  useEffect(() => {
    gameplayControlState.setPaused(owners.paused);
    return () => gameplayControlState.setPaused(false);
  }, [owners.paused]);

  return useSyncExternalStore(
    (listener) => gameplayControlState.subscribe(listener),
    () => gameplayControlState.getSnapshot(),
    () => gameplayControlState.getSnapshot(),
  );
}
