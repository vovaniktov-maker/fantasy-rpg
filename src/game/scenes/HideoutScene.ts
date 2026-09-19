import Phaser from 'phaser';
import { dungeonRoomDefinitions } from '../../content/dungeonRooms.js';
import { type EnemyDefinition } from '../../content/enemies.js';
import { buildContentRegistry } from '../../domain/content/contentRegistry.js';
import { generateDungeon } from '../../domain/dungeon/dungeonGenerator.js';
import { deriveCombatStats } from '../../domain/stats/DerivedStatsService.js';
import { getDefaultGameSession } from '../GameSession.js';
import { GameplayActionBuffer } from '../input/GameplayActionBuffer.js';
import { gameplayControlState, type GameplayControlSnapshot } from '../runtime/GameplayControlState.js';
import { CombatRuntime } from '../runtime/CombatRuntime.js';
import { EnemyRuntime } from '../runtime/EnemyRuntime.js';
import { LootRuntime, createEnemyDrop } from '../runtime/LootRuntime.js';
import { PlayerRuntime } from '../runtime/PlayerRuntime.js';
import { getRuntimeTuning } from '../runtime/RuntimeTuning.js';
import { SceneRuntimeHost } from '../runtime/SceneRuntimeHost.js';
import { DungeonAssembler } from '../world/DungeonAssembler.js';

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
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    return state / 4294967296;
  };
  return { next, pick: <T>(items: readonly T[]) => items[Math.min(items.length - 1, Math.floor(next() * items.length))] };
}

export class HideoutScene extends Phaser.Scene {
  private host?: SceneRuntimeHost;
  private playerRuntime?: PlayerRuntime;
  private playerSprite?: Phaser.GameObjects.Image;
  private combat?: CombatRuntime;
  private lootRuntime?: LootRuntime;
  private readonly enemies: Array<{ runtime: EnemyRuntime; image: Phaser.GameObjects.Image; definition: EnemyDefinition }> = [];
  private readonly lootSprites = new Map<string, Phaser.GameObjects.Image>();
  private keys: Partial<Record<'W'|'A'|'S'|'D'|'SPACE'|'E', Phaser.Input.Keyboard.Key>> = {};
  private skillKeys: Phaser.Input.Keyboard.Key[] = [];
  private readonly actionBuffer = new GameplayActionBuffer();
  private syncElapsed = 0;
  private cleared = false;
  private rng = seededRandom(1);

  constructor() { super('HideoutScene'); }

  create(data?: { seed?: number }): void {
    const session = getDefaultGameSession();
    const state = session.enterHideout();
    const tuning = getRuntimeTuning();
    this.rng = seededRandom(tuning.rngSeed ^ state.runSeed);
    const generated = generateDungeon(data?.seed ?? state.runSeed, dungeonRoomDefinitions);
    if (!generated.ok) throw new Error(generated.error.message);
    const rooms = new DungeonAssembler(dungeonRoomDefinitions).assemble(generated.dungeon);

    this.cameras.main.setBackgroundColor('#17120f');
    this.add.text(32, 24, 'Bandit Hideout', { color: '#d5c0a0', fontSize: '24px' });
    this.add.text(32, 58, `Run seed ${state.runSeed} · clear the route · E opens the boss door`, { color: '#9b8a74' });

    this.combat = new CombatRuntime(() => this.rng.next());
    const stats = deriveCombatStats(state, CONTENT);
    this.playerRuntime = new PlayerRuntime({
      id: 'player',
      position: { x: 120, y: 360 },
      hp: state.player.hp,
      stats,
      learnedSkills: learnedActiveIds(state.skills.learned),
      equippedSkills: state.skills.equippedActiveSkillIds,
      combat: this.combat,
    });
    this.playerSprite = this.add.image(120, 360, 'rogue-placeholder').setScale(1.25);

    this.lootRuntime = new LootRuntime({
      content: CONTENT,
      getInventory: () => session.getState().inventory,
      setInventory: (inventory) => {
        const next = session.getState();
        next.inventory = inventory;
        session.replaceState(next);
      },
    });

    let enemyIndex = 0;
    for (const room of rooms) {
      this.add.text(40 + room.x * 0.04, 105 + (enemyIndex % 3) * 20, room.definitionId, { color: '#6f6255', fontSize: '12px' });
      for (const enemyId of room.encounterIds) {
        const definition = CONTENT.enemies.get(enemyId);
        if (!definition) continue;
        const x = 300 + (enemyIndex % 5) * 180;
        const y = 230 + (enemyIndex % 2) * 260;
        const baseHp = definition.archetype === 'heavy' ? 160 : 85;
        const runtime = new EnemyRuntime({
          id: `hideout-${enemyId}-${enemyIndex}`,
          definition,
          hp: Math.max(1, Math.round(baseHp * tuning.enemyHpMultiplier)),
          position: { x, y },
          combat: this.combat,
        });
        const image = this.add.image(x, y, 'bandit-placeholder').setTint(0x6e4334);
        this.enemies.push({ runtime, image, definition });
        enemyIndex += 1;
      }
    }

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
    if (!this.playerRuntime || !this.playerSprite || !this.combat || !this.lootRuntime) return;
    this.playerRuntime.setControls(controls);
    if (!controls.inputEnabled) this.actionBuffer.clear();
    const pointer = this.input.activePointer;
    const skillIndex = this.skillKeys.findIndex((key) => Phaser.Input.Keyboard.JustDown(key));
    const frame = this.playerRuntime.update({
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

    const attackIds = [frame.attackWindowId, frame.skillAttackWindowId].filter((id): id is string => !!id);
    for (const entry of this.enemies) {
      const current = entry.runtime.snapshot;
      if (!current.alive) continue;
      const dx = player.position.x - current.x;
      const dy = player.position.y - current.y;
      const distance = Math.hypot(dx, dy);
      const enemyFrame = entry.runtime.update({
        playerVisible: true,
        distance,
        attackReady: true,
        hpRatio: current.hp / Math.max(1, current.maxHp),
        directionToPlayer: { x: dx, y: dy },
      }, dtMs);
      const next = entry.runtime.snapshot;
      entry.image.setPosition(next.x, next.y);
      entry.image.setTint(enemyFrame.telegraph ? 0xe6b84a : enemyFrame.attackWindowId ? 0xc83a3a : 0x6e4334);
      if (enemyFrame.attackWindowId) {
        const maxRange = Math.max(...entry.definition.attacks.map((attack) => attack.range));
        if (distance <= maxRange) this.combat.tryHit(enemyFrame.attackWindowId, this.playerRuntime.getCombatTarget());
      }
      for (const id of attackIds) if (distance <= 105) this.combat.tryHit(id, entry.runtime.getCombatTarget());

      if (entry.runtime.consumeDeathEvent()) {
        entry.image.setVisible(false);
        const drop = createEnemyDrop(entry.definition.id, getDefaultGameSession().getState().progression.level, this.rng, CONTENT);
        if (drop) {
          const pickup = this.lootRuntime.spawnDrop({ item: drop, position: { x: next.x, y: next.y } });
          this.lootSprites.set(pickup.id, this.add.image(next.x, next.y, 'loot-placeholder').setScale(0.8));
        }
      }
    }

    if (!this.cleared && this.enemies.every((entry) => entry.runtime.isDead())) {
      this.cleared = true;
      this.add.text(470, 100, 'Hideout route cleared — press E for the leader', { color: '#e0c99d' });
    }

    if (controls.inputEnabled && this.keys.E && Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      const interaction = this.lootRuntime.tryInteract(player.position);
      if (interaction.collected && interaction.pickup) {
        this.lootSprites.get(interaction.pickup.id)?.destroy();
        this.lootSprites.delete(interaction.pickup.id);
      } else if (this.cleared) {
        this.scene.start('BossScene');
        return;
      }
    }

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
}
