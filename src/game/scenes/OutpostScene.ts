import Phaser from 'phaser';
import { getDefaultGameSession } from '../GameSession';
import { buildOutpostEnvironment } from '../visuals/SceneEnvironment';

export class OutpostScene extends Phaser.Scene {
  constructor() { super('OutpostScene'); }
  create(): void {
    getDefaultGameSession().enterOutpost();
    this.cameras.main.setBackgroundColor('#151311');
    buildOutpostEnvironment(this);
    this.add.image(640, 535, 'rogue').setScale(1.35).setDepth(535);
    this.add.text(32, 24, 'Frontier Outpost', { color: '#e8d8b0', fontSize: '24px' });
    this.add.text(32, 58, 'Last safe light before the Cursed Forest', { color: '#8e8069' });
    const points = ['Merchant', 'Respec', 'Quest Board', 'Stash', 'Save Point'];
    points.forEach((name, index) => {
      const x = 120 + (index % 3) * 390;
      const y = 165 + Math.floor(index / 3) * 255;
      this.add.rectangle(x, y, 180, 54, 0x16120f, 0.72).setStrokeStyle(2, 0x8a6d45, 0.8).setDepth(900);
      this.add.text(x - 72, y - 10, name, { color: '#f1dfbd', fontSize: '16px' }).setDepth(901);
    });
    this.add.rectangle(640, 672, 470, 44, 0x16120f, 0.8).setStrokeStyle(2, 0xb3864a, 0.85).setDepth(900);
    this.add.text(465, 660, 'E — depart for the Cursed Forest', { color: '#f0c27b', fontSize: '18px' }).setDepth(901);
    this.input.keyboard?.once('keydown-E', () => this.scene.start('ForestScene'));
  }
}
