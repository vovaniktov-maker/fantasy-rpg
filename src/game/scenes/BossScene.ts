import Phaser from 'phaser';
import { getBossPhase, getBanditLeaderMovePool } from '../../domain/ai/bossBrain';
import { banditLeaderRuntimeDefinition } from '../../content/enemies';
import { DEFAULT_COMBAT_FEEDBACK, feedbackForCombatEvent } from '../combat/CombatFeedback';
import { getDefaultGameSession } from '../GameSession';

export class BossScene extends Phaser.Scene {
  private hp: number = banditLeaderRuntimeDefinition.maxHp;
  private boss?: Phaser.GameObjects.Image;
  private hpText?: Phaser.GameObjects.Text;
  private defeated = false;

  constructor() { super('BossScene'); }

  create(): void {
    getDefaultGameSession().enterBoss();
    this.hp = banditLeaderRuntimeDefinition.maxHp;
    this.defeated = false;
    this.cameras.main.setBackgroundColor('#180f12');
    this.add.text(32, 24, 'Bandit Leader', { color: '#e5b0a7', fontSize: '28px' });
    this.add.text(32, 62, 'Fast rogue mirror: smoke • poison • feints • dodges', { color: '#9f7773' });
    const boss = this.add.image(640, 330, 'bandit-placeholder').setScale(2).setTint(0xc24d4d).setInteractive();
    this.boss = boss;
    this.hpText = this.add.text(540, 420, '', { color: '#f0c9c0', fontSize: '18px' });
    this.refreshHpLabel();
    this.add.text(32, 670, 'Click the leader to attack · E returns after victory', { color: '#c98e86' });
    boss.on('pointerdown', () => this.hitBoss());
    this.input.keyboard?.on('keydown-E', () => { if (this.defeated) this.scene.start('OutpostScene'); });
  }

  private hitBoss(): void {
    if (this.defeated) return;
    this.hp = Math.max(0, this.hp - 45);
    for (const command of feedbackForCombatEvent({ type: 'hit', target: 'enemy', critical: false }, DEFAULT_COMBAT_FEEDBACK)) {
      if (command.type === 'cameraShake') this.cameras.main.shake(command.durationMs, command.intensity);
    }
    this.boss?.setTint(0xffffff);
    this.time.delayedCall(DEFAULT_COMBAT_FEEDBACK.hitFlashMs, () => this.boss?.setTint(0xc24d4d));
    this.refreshHpLabel();
    if (this.hp <= 0) {
      this.defeated = true;
      getDefaultGameSession().markBanditLeaderDefeated();
      this.boss?.setAlpha(0.35);
      this.add.text(520, 490, 'Leader defeated — exit unlocked', { color: '#e8d8b0', fontSize: '20px' });
    }
  }

  private refreshHpLabel(): void {
    const phase = getBossPhase(this.hp / banditLeaderRuntimeDefinition.maxHp);
    this.hpText?.setText(`HP ${this.hp}/${banditLeaderRuntimeDefinition.maxHp} · ${phase}`);
  }

  getDebugPhase(): string { return getBossPhase(this.hp / banditLeaderRuntimeDefinition.maxHp); }
  getDebugMoveIds(): string[] { return getBanditLeaderMovePool(getBossPhase(this.hp / banditLeaderRuntimeDefinition.maxHp)).map((move) => move.id); }
}
