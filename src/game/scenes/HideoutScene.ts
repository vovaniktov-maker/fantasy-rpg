import Phaser from 'phaser';
import { dungeonRoomDefinitions } from '../../content/dungeonRooms';
import { generateDungeon } from '../../domain/dungeon/dungeonGenerator';
import { getDefaultGameSession } from '../GameSession';

export class HideoutScene extends Phaser.Scene {
  constructor() { super('HideoutScene'); }
  create(data?: { seed?: number }): void {
    this.cameras.main.setBackgroundColor('#17120f');
    const sessionState = getDefaultGameSession().enterHideout();
    const result = generateDungeon(data?.seed ?? sessionState.runSeed, dungeonRoomDefinitions);
    if (!result.ok) throw new Error(result.error.message);
    this.add.text(32, 24, 'Bandit Hideout', { color: '#d5c0a0', fontSize: '24px' });
    result.dungeon.rooms.forEach((room, index) => this.add.text(48, 80 + index * 26, `${index + 1}. ${room.definitionId}`, { color: '#9b8a74' }));
    this.add.text(32, 670, `Run seed ${sessionState.runSeed} · E confront the leader`, { color: '#caa278' });
    this.input.keyboard?.once('keydown-E', () => this.scene.start('BossScene'));
  }
}
