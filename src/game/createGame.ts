import Phaser from 'phaser';
import { makeGameConfig } from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { OutpostScene } from './scenes/OutpostScene';
import { ForestScene } from './scenes/ForestScene';
import { HideoutScene } from './scenes/HideoutScene';
import { BossScene } from './scenes/BossScene';

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    ...makeGameConfig(parent),
    type: Phaser.AUTO,
    scene: [BootScene, OutpostScene, ForestScene, HideoutScene, BossScene],
  });
}
