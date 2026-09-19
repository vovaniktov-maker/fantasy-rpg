import Phaser from 'phaser';
import { buildContentRegistry } from '../../domain/content/contentRegistry';
import { validateContent } from '../../domain/content/validateContent';

export function ensureDevelopmentTexture(scene: Phaser.Scene, key: string, size = 32): boolean {
  if (scene.textures.exists(key)) return false;
  const graphics = scene.add.graphics();
  graphics.fillStyle(0x7c3aed, 1);
  graphics.fillRect(0, 0, size, size);
  graphics.lineStyle(2, 0xffffff, 1);
  graphics.strokeRect(1, 1, size - 2, size - 2);
  graphics.generateTexture(key, size, size);
  graphics.destroy();
  console.warn(`[asset-fallback] ${key}`);
  return true;
}

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create(): void {
    const issues = validateContent(buildContentRegistry());
    if (issues.length > 0) throw new Error(`Invalid gameplay content:\n${issues.map((issue) => `- ${issue.message}`).join('\n')}`);
    for (const key of ['rogue-placeholder', 'bandit-placeholder', 'loot-placeholder']) ensureDevelopmentTexture(this, key);
    this.scene.start('OutpostScene');
  }
}
