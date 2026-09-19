import Phaser from 'phaser';
import { buildContentRegistry } from '../../domain/content/contentRegistry.js';
import { rollLoot } from '../../domain/loot/lootTables.js';
import type { SerializableItemStack } from '../../domain/state/GameState.js';
import { deriveCombatStats } from '../../domain/stats/DerivedStatsService.js';
import { getDefaultGameSession } from '../GameSession.js';
import { GameplayActionBuffer } from '../input/GameplayActionBuffer.js';
import { BossRuntime } from '../runtime/BossRuntime.js';
import { CombatRuntime } from '../runtime/CombatRuntime.js';
import { gameplayControlState, type GameplayControlSnapshot } from '../runtime/GameplayControlState.js';
import { LootRuntime } from '../runtime/LootRuntime.js';
import { PlayerRuntime } from '../runtime/PlayerRuntime.js';
import { getRuntimeTuning } from '../runtime/RuntimeTuning.js';
import { SceneRuntimeHost } from '../runtime/SceneRuntimeHost.js';
import { runtimeDiagnostics } from '../runtime/RuntimeDiagnostics.js';

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

function seededRandom(seed: number) {
  let state = seed >>> 0 || 1;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  return { next, pick: <T>(items: readonly T[]) => items[Math.min(items.length - 1, Math.floor(next() * items.length))] };
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
  private readonly lootSprites = new Map<string, Phaser.GameObjects.Image>();
  private keys: Partial<Record<'W'|'A'|'S'|'D'|'SPACE'|'E', Phaser.Input.Keyboard.Key>> = {};
  private skillKeys: Phaser.Input.Keyboard.Key[] = [];
  private readonly actionBuffer = new GameplayActionBuffer();
  private syncElapsed = 0;
  private victoryResolved = false;
  private rng = seededRandom(1);

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
    this.rng = seededRandom(tuning.rngSeed ^ state.runSeed ^ 0xb055);
    runtimeDiagnostics.setEnemies([]);
    this.cameras.main.setBackgroundColor('#180f12');
    this.add.text(32, 24, 'Bandit Leader', { color: '#e5b0a7', fontSize: '28px' });
    this.add.text(32, 62, 'Read the telegraphs · dodge · punish recovery · E collects loot / exits after victory', { color: '#9f7773' });

    this.combat = new CombatRuntime(() => this.rng.next());
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

    this.playerSprite = this.add.image(430, 360, 'rogue-placeholder').setScale(1.25);
    this.bossSprite = this.add.image(720, 360, 'bandit-placeholder').setScale(2).setTint(0xc24d4d);
    this.hpText = this.add.text(560, 445, '', { color: '#f0c9c0', fontSize: '18px' });
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
      SPACE: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      E: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    };
    this.skillKeys = [Phaser.Input.Keyboard.KeyCodes.ONE, Phaser.Input.Keyboard.KeyCodes.TWO, Phaser.Input.Keyboard.KeyCodes.THREE, Phaser.Input.Keyboard.KeyCodes.FOUR]
      .map((code) => keyboard.addKey(code));

    this.host = new SceneRuntimeHost(gameplayControlState);
    const onPointerDown = (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) this.actionBuffer.queueBasicAttack();
    };
    this.input.on('pointerdown', onPointerDown);
    this.host.own(() => this.input.off('pointerdown', onPointerDown));
    this.host.onFrame((dtMs, controls) => this.stepRuntime(dtMs, controls));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.host?.dispose());
  }

  update(_time: number, delta: number): void { this.host?.tick(delta); }

  private stepRuntime(dtMs: number, controls: Readonly<GameplayControlSnapshot>): void {
    if (!this.playerRuntime || !this.bossRuntime || !this.combat || !this.playerSprite || !this.bossSprite || !this.lootRuntime) return;
    this.playerRuntime.setControls(controls);
    if (!controls.inputEnabled) this.actionBuffer.clear();
    const pointer = this.input.activePointer;
    const skillIndex = this.skillKeys.findIndex((key) => Phaser.Input.Keyboard.JustDown(key));
    const playerFrame = this.playerRuntime.update({
      moveX: Number(this.keys.D?.isDown) - Number(this.keys.A?.isDown),
      moveY: Number(this.keys.S?.isDown) - Number(this.keys.W?.isDown),
      aimX: pointer.worldX,
      aimY: pointer.worldY,
      basicAttackPressed: controls.inputEnabled ? this.actionBuffer.consumeBasicAttack() : false,
      dodgePressed: controls.inputEnabled && !!this.keys.SPACE && Phaser.Input.Keyboard.JustDown(this.keys.SPACE),
      skillSlotPressed: controls.inputEnabled && skillIndex >= 0 ? skillIndex : null,
    }, dtMs);

    const player = this.playerRuntime.snapshot;
    this.playerSprite.setPosition(player.position.x, player.position.y).setRotation(player.facingRadians);
    const boss = this.bossRuntime.snapshot;
    const bossX = this.bossSprite.x;
    const bossY = this.bossSprite.y;
    const distance = Math.hypot(player.position.x - bossX, player.position.y - bossY);

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

    const bossFrame = this.bossRuntime.update({ distance }, dtMs);
    if (bossFrame.telegraph) this.bossSprite.setTint(0xe6b84a);
    else if (bossFrame.attackWindowId) this.bossSprite.setTint(0xd33245);
    else if (!this.victoryResolved) this.bossSprite.setTint(0xc24d4d);

    if (bossFrame.attackWindowId && distance <= 230) {
      this.combat.tryHit(bossFrame.attackWindowId, this.playerRuntime.getCombatTarget());
    }

    if (!this.victoryResolved && this.bossRuntime.consumeVictory().resolved) {
      this.victoryResolved = true;
      const session = getDefaultGameSession();
      session.markBanditLeaderDefeated();
      this.bossSprite.setAlpha(0.35).setTint(0x6c6c6c);
      const table = CONTENT.lootTables.get('bandit_leader');
      const definitionId = table ? rollLoot(table.entries, session.getState().progression.level, this.rng) : null;
      if (definitionId) {
        const definition = CONTENT.items.get(definitionId);
        const item: SerializableItemStack = {
          instanceId: `boss-${definitionId}-${statefulId(this.rng.next())}`,
          definitionId,
          quantity: 1,
          itemLevel: session.getState().progression.level,
          rarity: definition?.uniqueEffect ? 'unique' : 'rare',
        };
        const pickup = this.lootRuntime.spawnDrop({ item, position: { x: bossX, y: bossY } });
        this.lootSprites.set(pickup.id, this.add.image(bossX, bossY, 'loot-placeholder').setScale(0.9));
      }
      this.add.text(500, 500, 'Leader defeated — collect the drop, then press E to return', { color: '#e8d8b0', fontSize: '18px' });
    }

    if (controls.inputEnabled && this.keys.E && Phaser.Input.Keyboard.JustDown(this.keys.E)) {
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
