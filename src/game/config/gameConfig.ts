import type { Types } from 'phaser';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export function makeGameConfig(parent: string | HTMLElement): Types.Core.GameConfig {
  return {
    type: 0,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#111318',
    pixelArt: true,
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: [],
  };
}
