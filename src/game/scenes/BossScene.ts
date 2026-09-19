import Phaser from 'phaser';
import { buildContentRegistry } from '../../domain/content/contentRegistry.js';
import { rollLoot } from '../../domain/loot/lootTables.js';
import type { SerializableItemStack } from '../../domain/state/GameState.js';
import { deriveCombatStats } from '../../domain/stats/DerivedStatsService.js';
import { getDefaultGameSession } from '../GameSession.js';
import { gameBridge } from '../bridge/GameBridge.js';
import { GameplayActionBuffer } from '../input/GameplayActionBuffer.js';
import { BossRuntime } from '../runtime/BossRuntime.js';
import { CombatRuntime } from '../runtime/CombatRuntime.js';
import { gameplayControlState, type GameplayControlSnapshot } from '../runtime/GameplayControlState.js';
import { LootRuntime } from '../runtime/LootRuntime.js';
import { PlayerRuntime } from '../runtime/PlayerRuntime.js';
import { getRuntimeTuning } from '../runtime/RuntimeTuning.js';
import { SceneRuntimeHost } from '../runtime/SceneRuntimeHost.js';
import { runtimeDiagnostics } from '../runtime/RuntimeDiagnostics.js';
import { createRuntimeRandom, deriveRuntimeSeed } from '../runtime/RuntimeRandom.js';
import { getRarityColor, itemTextureKey } from '../visuals/VisualCatalog.js';
import { buildBossEnvironment } from '../visuals/SceneEnvironment.js';
import { clearTelegraph, drawAttackActive, drawAttackTelegraph, playDodgeSmoke, playSlash } from '../visuals/CombatVisuals.js';

const CONTENT = buildContentRegistry();

function learnedActiveIds(learned: Record<string, number>): Set<string> {
  const result = new Set<string>();
  for (const [nodeId, rank] of Object.entries(learned)) {
    if (rank <= 0) continue;
    const node = CONTENT.skills.get(nodeId);
    if (node?.kind === 'active' && node.activeSkillId) result.add(node.activeSkillId);
  }
  return result;
}

export class BossScene extends Phaser.Scene {
  private host?: SceneRuntimeHost;
  private combat?: CombatRuntime;
  private playerRuntime?: PlayerRuntime;
  private bossRuntime?: BossRuntime;
  private lootRuntime?: LootRuntime;
  private playerSprite?: Phaser.GameObjects.Image;
  private bossSprite?: Phaser.GameObjects.Image;
  private hpText?: Phaser.GameObjects.Text;
  private bossTelegraph?: Phaser.GameObjects.Graphics;
  private readonly lootSprites = new Map<string, Phaser.GameObjects.Image>();
  private keys: Partial<Record<'W'|'A'|'S'|'D', Phaser.Input.Keyboard.Key>> = {};
  private readonly actionBuffer = new GameplayActionBuffer();
  private syncElapsed = 0;
  private victoryResolved = false;
  private combatRng = createRuntimeRandom(1);
  private lootRng = createRuntimeRandom(2);

  constructor() { super('BossScene'); }

  create(): void {
    this.lootSprites.clear();
    this.victoryResolved = false;
    this.syncElapsed = 0;
    this.actionBuffer.clear();
    runtimeDiagnostics.setEnemies([]);
    const session = getDefaultGameSession();
    const state = session.enterBoss();
    const tuning = getRuntimeTuning();
    const runtimeSeed = tuning.rngSeed ^ state.runSeed ^ 0xb055;
    this.combatRng = createRuntimeRandom(deriveRuntimeSeed(runtimeSeed, 'combat:boss'));
    this.lootRng = createRuntimeRandom(deriveRuntimeSeed(runtimeSeed, 'loot:boss'));
    runtimeDiagnostics.setEnemies([]);
    this.cameras.main.setBackgroundColor('#180f12');
    buildBossEnvironment(this);
    this.add.text(32, 24, 'Bandit Leader', { color: '#e5b0a7', fontSize: '28px' });
    this.add.text(32, 62, 'Read the telegraphs · dodge · punish recovery · E collects loot / exits after victory', { color: '#9f7773' });

    this.combat = new CombatRuntime(() => this.combatRng.next());
    const stats = deriveCombatStats(state, CONTENT);
    this.playerRuntime = new PlayerRuntime({
      id: 'player',
      position: { x: 430, y: 360 },
      hp: state.player.hp,
      stats,
      learnedSkills: learnedActiveIds(state.skills.learned),
      equippedSkills: state.skills.equippedActiveSkillIds,
      combat: this.combat,
    });
    this.bossRuntime = new BossRuntime({
      combat: this.combat,
      maxHp: Math.max(1, Math.round(600 * tuning.enemyHpMultiplier)),
      timingMultiplier: tuning.timingMultiplier,
    });

    this.playerSprite = this.add.image(430, 360, 'rogue').setScale(1.35).setDepth(360);
    this.bossSprite = this.add.image(720, 360, 'enemy-bandit-leader').setScale(1.35).setDepth(360);
    this.bossTelegraph = this.add.graphics().setDepth(350);
    this.hpText = this.add.text(510, 86, '', { color: '#f0c9c0', fontSize: '20px', backgroundColor: '#1d1115', padding: { x: 12, y: 6 } }).setDepth(2000);
    this.refreshBossLabel();

    this.lootRuntime = new LootRuntime({
      content: CONTENT,
      getInventory: () => session.getState().inventory,
      setInventory: (inventory) => {
        const next = session.getState();
        next.inventory = inventory;
        session.replaceState(next);
      },
    });

    const keyboard = this.input.keyboard!;
    this.keys = {
      W: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.host = new SceneRuntimeHost(gameplayControlState);
    this.host.own(gameBridge.onEvent((event) => {
      if (event.type === 'PLAYER_RESOURCES_SYNCED') {
        this.playerRuntime?.syncResources({ hp: event.hp, energy: event.energy });
      }
    }));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyE') this.actionBuffer.queueInteract();
      if (event.code === 'Space') this.actionBuffer.queueDodge();
      if (event.code.startsWith('Digit')) {
        const slotIndex = Number(event.code.slice(5)) - 1;
        this.actionBuffer.queueSkillSlot(slotIndex);
      }
    };
    this.input.keyboard?.on('keydown', onKeyDown);
    this.host.own(() => this.input.keyboard?.off('keydown', onKeyDown));
    const onPointerDown = (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) this.actionBuffer.queueBasicAttack();
    };
    this.input.on('pointerdown', onPointerDown);
    this.host.own(() => this.input.off('pointerdown', onPointerDown));
    this.host.onFrame((dtMs, controls) => this.stepRuntime(dtMs, controls));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      runtimeDiagnostics.setEnemies([]);
      this.host?.dispose();
    });
  }

  update(_time: number, delta: number): void { this.host?.tick(delta); }

  private stepRuntime(dtMs: number, controls: Readonly<GameplayControlSnapshot>): void {
    if (!this.playerRuntime || !this.bossRuntime || !this.combat || !this.playerSprite || !this.bossSprite || !this.lootRuntime) return;
    this.playerRuntime.setControls(controls);
    if (!controls.inputEnabled) this.actionBuffer.clear();
    const pointer = this.input.activePointer;
    const skillIndex = controls.inputEnabled ? this.actionBuffer.consumeSkillSlot() : null;
    const playerFrame = this.playerRuntime.update({
      moveX: Number(this.keys.D?.isDown) - Number(this.keys.A?.isDown),
      moveY: Number(this.keys.S?.isDown) - Number(this.keys.W?.isDown),
      aimX: pointer.worldX,
      aimY: pointer.worldY,
      basicAttackPressed: controls.inputEnabled ? this.actionBuffer.consumeBasicAttack() : false,
      dodgePressed: controls.inputEnabled ? this.actionBuffer.consumeDodge() : false,
      skillSlotPressed: controls.inputEnabled && skillIndex !== null ? skillIndex : null,
    }, dtMs);

    const player = this.playerRuntime.snapshot;
    this.playerSprite.setPosition(player.position.x, player.position.y).setRotation(player.facingRadians).setDepth(player.position.y);
    if (playerFrame.attackStarted || playerFrame.skillStarted) playSlash(this, player.position.x, player.position.y, player.facingRadians);
    if (playerFrame.dodgeStarted) playDodgeSmoke(this, player.position.x, player.position.y);
    const boss = this.bossRuntime.snapshot;
    const bossX = this.bossSprite.x;
    const bossY = this.bossSprite.y;
    const dxToPlayer = player.position.x - bossX;
    const dyToPlayer = player.position.y - bossY;
    const distance = Math.hypot(dxToPlayer, dyToPlayer);

    for (const attackId of [playerFrame.attackWindowId, playerFrame.skillAttackWindowId].filter((id): id is string => !!id)) {
      if (distance <= 135) {
        const hit = this.combat.tryHit(attackId, this.bossRuntime.getCombatTarget());
        if (hit.applied) {
          this.bossSprite.setTint(0xffffff);
          this.time.delayedCall(70, () => {
            if (!this.victoryResolved) this.bossSprite?.setTint(0xc24d4d);
          });
        }
      }
    }

    const bossFrame = this.bossRuntime.update({
      distance,
      directionToPlayer: { x: dxToPlayer, y: dyToPlayer },
    }, dtMs);
    if (bossFrame.movement) {
      playDodgeSmoke(this, this.bossSprite.x, this.bossSprite.y);
      this.bossSprite.setPosition(
        Phaser.Math.Clamp(this.bossSprite.x + bossFrame.movement.x, 120, 1160),
        Phaser.Math.Clamp(this.bossSprite.y + bossFrame.movement.y, 120, 600),
      );
    }
    this.bossSprite.setDepth(this.bossSprite.y);
    if (bossFrame.telegraph) {
      if (this.bossTelegraph) drawAttackTelegraph(this.bossTelegraph, this.bossSprite.x, this.bossSprite.y, 180, 0xf0b34f);
      this.bossSprite.setTint(0xffcf79);
    } else if (bossFrame.attackWindowId) {
      if (this.bossTelegraph) drawAttackActive(this.bossTelegraph, this.bossSprite.x, this.bossSprite.y, 230);
      this.bossSprite.setTint(0xff7171);
    } else if (!this.victoryResolved) {
      if (this.bossTelegraph) clearTelegraph(this.bossTelegraph);
      this.bossSprite.clearTint();
    }

    const bossAttackDistance = Math.hypot(
      player.position.x - this.bossSprite.x,
      player.position.y - this.bossSprite.y,
    );
    if (bossFrame.attackWindowId && bossAttackDistance <= 230) {
      this.combat.tryHit(bossFrame.attackWindowId, this.playerRuntime.getCombatTarget());
    }

    const liveBoss = this.bossRuntime.snapshot;
    runtimeDiagnostics.setEnemies(liveBoss.hp > 0 ? [{
      id: liveBoss.id,
      x: Math.round(this.bossSprite.x),
      y: Math.round(this.bossSprite.y),
      hp: liveBoss.hp,
    }] : []);

    if (!this.victoryResolved && this.bossRuntime.consumeVictory().resolved) {
      this.victoryResolved = true;
      runtimeDiagnostics.setEnemies([]);
      const session = getDefaultGameSession();
      session.markBanditLeaderDefeated();
      if (this.bossTelegraph) clearTelegraph(this.bossTelegraph);
      this.bossSprite.setAlpha(0.35).setTint(0x6c6c6c);
      const table = CONTENT.lootTables.get('bandit_leader');
      const definitionId = table ? rollLoot(table.entries, session.getState().progression.level, this.lootRng) : null;
      if (definitionId) {
        const definition = CONTENT.items.get(definitionId);
        const item: SerializableItemStack = {
          instanceId: `boss-${definitionId}-${statefulId(this.lootRng.next())}`,
          definitionId,
          quantity: 1,
          itemLevel: session.getState().progression.level,
          rarity: definition?.uniqueEffect ? 'unique' : 'rare',
        };
        const dropX = this.bossSprite.x;
        const dropY = this.bossSprite.y;
        const pickup = this.lootRuntime.spawnDrop({ item, position: { x: dropX, y: dropY } });
        const key = definition ? itemTextureKey(definition) : 'item-generic';
        const lootImage = this.add.image(dropX, dropY, key)
          .setScale(1.2)
          .setTint(getRarityColor(item.rarity))
          .setDepth(dropY + 3);
        this.tweens.add({ targets: lootImage, y: dropY - 8, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.lootSprites.set(pickup.id, lootImage);
      }
      this.add.text(500, 500, 'Leader defeated — collect the drop, then press E to return', { color: '#e8d8b0', fontSize: '18px' });
    }

    if (controls.inputEnabled && this.actionBuffer.consumeInteract()) {
      const interaction = this.lootRuntime.tryInteract(player.position);
      if (interaction.collected && interaction.pickup) {
        this.lootSprites.get(interaction.pickup.id)?.destroy();
        this.lootSprites.delete(interaction.pickup.id);
      } else if (this.victoryResolved) {
        this.scene.start('OutpostScene');
        return;
      }
    }

    this.refreshBossLabel();
    this.syncElapsed += dtMs;
    if (this.syncElapsed >= 100) {
      this.syncElapsed = 0;
      const session = getDefaultGameSession();
      const next = session.getState();
      next.player.hp = player.hp;
      next.player.energy = player.energy;
      next.player.position = { ...player.position };
      session.replaceState(next);
      if (player.hp <= 0) {
        session.onDeath();
        this.scene.start('OutpostScene');
      }
    }
  }

  private refreshBossLabel(): void {
    if (!this.bossRuntime) return;
    const boss = this.bossRuntime.snapshot;
    this.hpText?.setText(`HP ${boss.hp}/${boss.maxHp} · ${boss.phase}`);
  }
}

function statefulId(value: number): string {
  return Math.floor(Math.max(0, Math.min(0.999999999, value)) * 1_000_000_000).toString(36);
}
