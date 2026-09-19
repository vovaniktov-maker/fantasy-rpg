import Phaser from 'phaser';
import { getDefaultGameSession } from '../GameSession';

export class OutpostScene extends Phaser.Scene {
  constructor() { super('OutpostScene'); }
  create(): void {
    getDefaultGameSession().enterOutpost();
    this.cameras.main.setBackgroundColor('#151311');
    this.add.text(32, 24, 'Frontier Outpost', { color: '#e8d8b0', fontSize: '24px' });
    this.add.text(32, 58, 'Last safe light before the Cursed Forest', { color: '#8e8069' });
    const points = ['Merchant', 'Respec', 'Quest Board', 'Stash', 'Save Point'];
    points.forEach((name, index) => this.add.text(80 + (index % 3) * 220, 160 + Math.floor(index / 3) * 160, name, { color: '#c6bda8' }));
    this.add.text(32, 670, 'E — depart for the Cursed Forest', { color: '#cda76c' });
    this.input.keyboard?.once('keydown-E', () => this.scene.start('ForestScene'));
  }
}
