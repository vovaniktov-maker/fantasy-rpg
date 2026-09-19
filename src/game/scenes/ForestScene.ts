import Phaser from 'phaser';
import { enemyDefinitions, type EnemyDefinition } from '../../content/enemies.js';
import { buildContentRegistry } from '../../domain/content/contentRegistry.js';
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
import { runtimeDiagnostics } from '../runtime/RuntimeDiagnostics.js';
import { createRuntimeRandom, deriveRuntimeSeed } from '../runtime/RuntimeRandom.js';

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

function hpFor(definition: EnemyDefinition): number {
  switch (definition.archetype) {
    case 'heavy': return 150;
    case 'cutthroat': return 75;
    case 'archer': return 70;
    case 'trapper': return 80;
    default: return 95;
  }
}

export class ForestScene extends Phaser.Scene {
  private host?: SceneRuntimeHost;
  private playerRuntime?: PlayerRuntime;
  private playerSprite?: Phaser.GameObjects.Image;
  private readonly enemies: Array<{ runtime: EnemyRuntime; image: Phaser.GameObjects.Image; definition: EnemyDefinition }> = [];
  private lootRuntime?: LootRuntime;
  private readonly lootSprites = new Map<string, Phaser.GameObjects.Image>();
  private combat?: CombatRuntime;
  private keyW?: Phaser.Input.Keyboard.Key;
  private keyA?: Phaser.Input.Keyboard.Key;
  private keyS?: Phaser.Input.Keyboard.Key;
  private keyD?: Phaser.Input.Keyboard.Key;
  private readonly actionBuffer = new GameplayActionBuffer();
  private syncElapsed = 0;
  private encounterResolved = false;
  private combatRng = createRuntimeRandom(1);
  private lootSeedBase = 1;

  constructor() { super('ForestScene'); }

  create(): void {
    this.enemies.length = 0;
    this.lootSprites.clear();
    this.encounterResolved = false;
    this.syncElapsed = 0;
    this.actionBuffer.clear();
    runtimeDiagnostics.setEnemies([]);
    const session = getDefaultGameSession();
    const state = session.enterForest();
    const tuning = getRuntimeTuning();
    const runtimeSeed = tuning.rngSeed ^ state.runSeed;
    this.combatRng = createRuntimeRandom(deriveRuntimeSeed(runtimeSeed, 'combat:forest'));
    this.lootSeedBase = runtimeSeed;
    this.cameras.main.setBackgroundColor('#0c1710');
    this.add.text(32, 24, 'Cursed Forest', { color: '#b8d0a8', fontSize: '24px' });
    this.add.text(32, 64, 'Defeat the patrol · E picks up loot · E enters the hideout after the patrol falls', { color: '#71836b' });

    this.combat = new CombatRuntime(() => this.combatRng.next());
    const stats = deriveCombatStats(state, CONTENT);
    this.playerRuntime = new PlayerRuntime({
      id: 'player',
      position: { x: 640, y: 360 },
      hp: state.player.hp,
      stats,
      learnedSkills: learnedActiveIds(state.skills.learned),
      equippedSkills: state.skills.equippedActiveSkillIds,
      combat: this.combat,
    });
    this.playerSprite = this.add.image(640, 360, 'rogue-placeholder').setScale(1.25);

    this.lootRuntime = new LootRuntime({
      content: CONTENT,
      getInventory: () => session.getState().inventory,
      setInventory: (inventory) => {
        const next = session.getState();
        next.inventory = inventory;
        session.replaceState(next);
      },
    });

    const positions = [
      { x: 760, y: 360 },
      { x: 420, y: 250 },
      { x: 900, y: 220 },
      { x: 360, y: 500 },
      { x: 930, y: 520 },
    ];
    enemyDefinitions.forEach((definition, index) => {
      const hp = Math.max(1, Math.round(hpFor(definition) * tuning.enemyHpMultiplier));
      const runtime = new EnemyRuntime({
        id: `forest-${definition.id}-${index}`,
        definition,
        hp,
        position: positions[index],
        combat: this.combat!,
      });
      const image = this.add.image(positions[index].x, positions[index].y, 'bandit-placeholder').setTint(0x7a3f32);
      this.enemies.push({ runtime, image, definition });
    });

    const keyboard = this.input.keyboard;
    this.keyW = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    this.host = new SceneRuntimeHost(gameplayControlState);
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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { runtimeDiagnostics.setEnemies([]); this.host?.dispose(); });
  }

  update(_time: number, delta: number): void {
    this.host?.tick(delta);
  }

  private stepRuntime(dtMs: number, controls: Readonly<GameplayControlSnapshot>): void {
    if (!this.playerRuntime || !this.playerSprite || !this.combat || !this.lootRuntime) return;
    this.playerRuntime.setControls(controls);
    if (!controls.inputEnabled) this.actionBuffer.clear();
    const pointer = this.input.activePointer;
    const skillIndex = controls.inputEnabled ? this.actionBuffer.consumeSkillSlot() : null;
    const frame = this.playerRuntime.update({
      moveX: Number(this.keyD?.isDown) - Number(this.keyA?.isDown),
      moveY: Number(this.keyS?.isDown) - Number(this.keyW?.isDown),
      aimX: pointer.worldX,
      aimY: pointer.worldY,
      basicAttackPressed: controls.inputEnabled ? this.actionBuffer.consumeBasicAttack() : false,
      dodgePressed: controls.inputEnabled ? this.actionBuffer.consumeDodge() : false,
      skillSlotPressed: controls.inputEnabled && skillIndex !== null ? skillIndex : null,
    }, dtMs);

    const player = this.playerRuntime.snapshot;
    this.playerSprite.setPosition(player.position.x, player.position.y).setRotation(player.facingRadians);

    const playerAttackIds = [frame.attackWindowId, frame.skillAttackWindowId].filter((id): id is string => !!id);
    for (const entry of this.enemies) {
      const snapshot = entry.runtime.snapshot;
      if (!snapshot.alive) continue;
      const dx = player.position.x - snapshot.x;
      const dy = player.position.y - snapshot.y;
      const distance = Math.hypot(dx, dy);
      const enemyFrame = entry.runtime.update({
        playerVisible: distance <= Math.max(180, entry.definition.preferredRange * 1.2),
        distance,
        attackReady: true,
        hpRatio: snapshot.hp / Math.max(1, snapshot.maxHp),
        directionToPlayer: { x: dx, y: dy },
      }, dtMs);
      const next = entry.runtime.snapshot;
      entry.image.setPosition(next.x, next.y);
      if (enemyFrame.telegraph) entry.image.setTint(0xe6b84a);
      else if (enemyFrame.attackWindowId) entry.image.setTint(0xd33f3f);
      else entry.image.setTint(0x7a3f32);

      if (enemyFrame.attackWindowId) {
        const maxRange = Math.max(...entry.definition.attacks.map((attack) => attack.range));
        if (distance <= maxRange) this.combat.tryHit(enemyFrame.attackWindowId, this.playerRuntime.getCombatTarget());
      }
      for (const attackId of playerAttackIds) {
        if (distance <= 105) this.combat.tryHit(attackId, entry.runtime.getCombatTarget());
      }

      if (entry.runtime.consumeDeathEvent()) {
        entry.image.setVisible(false);
        const lootRng = createRuntimeRandom(deriveRuntimeSeed(this.lootSeedBase, `loot:${entry.runtime.snapshot.id}`));
        const drop = createEnemyDrop(entry.definition.id, getDefaultGameSession().getState().progression.level, lootRng, CONTENT);
        if (drop) {
          const pickup = this.lootRuntime.spawnDrop({ item: drop, position: { x: next.x, y: next.y } });
          this.lootSprites.set(pickup.id, this.add.image(next.x, next.y, 'loot-placeholder').setScale(0.8));
        }
      }
    }

    runtimeDiagnostics.setEnemies(this.enemies
      .map((entry) => entry.runtime.snapshot)
      .filter((enemy) => enemy.alive)
      .map((enemy) => ({ id: enemy.id, x: Math.round(enemy.x), y: Math.round(enemy.y), hp: enemy.hp })));

    if (!this.encounterResolved && this.enemies.every((entry) => entry.runtime.isDead())) {
      this.encounterResolved = true;
      getDefaultGameSession().completeForestEncounter();
      this.add.text(470, 105, 'Patrol defeated — collect loot, then press E', { color: '#cde5b8' });
    }

    if (controls.inputEnabled && this.actionBuffer.consumeInteract()) {
      const interaction = this.lootRuntime.tryInteract(player.position);
      if (interaction.collected && interaction.pickup) {
        this.lootSprites.get(interaction.pickup.id)?.destroy();
        this.lootSprites.delete(interaction.pickup.id);
      } else if (this.encounterResolved) {
        this.scene.start('HideoutScene');
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
