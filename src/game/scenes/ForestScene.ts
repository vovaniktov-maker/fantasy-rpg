import Phaser from 'phaser';
import { getDefaultGameSession } from '../GameSession';

export class ForestScene extends Phaser.Scene {
  private player?: Phaser.GameObjects.Image;
  private keys?: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  constructor() { super('ForestScene'); }
  create(): void {
    getDefaultGameSession().enterForest();
    this.cameras.main.setBackgroundColor('#0c1710');
    this.add.text(32, 24, 'Cursed Forest', { color: '#b8d0a8', fontSize: '24px' });
    this.add.text(32, 64, 'Bandit patrols • hidden loot • hideout entrance', { color: '#71836b' });
    this.player = this.add.image(640, 360, 'rogue-placeholder').setScale(1.25);
    this.keys = this.input.keyboard?.addKeys('W,A,S,D') as Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key> | undefined;
    for (let index = 0; index < 5; index += 1) this.add.image(330 + index * 135, 250 + (index % 2) * 220, 'bandit-placeholder').setTint(0x7a3f32);
    this.add.text(32, 670, 'WASD move · mouse aim · E enter Bandit Hideout', { color: '#9bb58c' });
    this.input.keyboard?.once('keydown-E', () => this.scene.start('HideoutScene'));
  }

  update(_time: number, delta: number): void {
    if (!this.player || !this.keys) return;
    const x = Number(this.keys.D.isDown) - Number(this.keys.A.isDown);
    const y = Number(this.keys.S.isDown) - Number(this.keys.W.isDown);
    const length = Math.hypot(x, y) || 1;
    const speed = 220 * (delta / 1000);
    this.player.x += (x / length) * speed;
    this.player.y += (y / length) * speed;
    const pointer = this.input.activePointer;
    this.player.rotation = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY);
  }
}
