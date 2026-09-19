# Fantasy Action RPG Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished desktop-browser vertical slice of a single-player top-down fantasy action RPG featuring the Rogue class, responsive mouse-aimed combat, loot/build progression, the Cursed Forest, a replayable Bandit Hideout, and the Bandit Leader boss.

**Architecture:** Phaser 4 owns the rendered world and real-time simulation; React owns complex UI. Pure TypeScript domain modules hold deterministic combat, progression, items, quests, economy, save data, and AI decision logic. Phaser and React communicate only through a typed bridge and serializable domain snapshots/commands, keeping rendering concerns out of game rules and UI concerns out of combat logic.

**Tech Stack:** Phaser 4, TypeScript, Vite, React, Vitest, Testing Library, Playwright, local browser storage.

**Spec:** `docs/superpowers/specs/2026-09-19-fantasy-action-rpg-vertical-slice-design.md`

## Global Constraints

- Primary platform: desktop browser.
- Primary input: keyboard and mouse only for the first vertical slice.
- Phaser 4 owns world rendering, entities, collision, combat simulation, enemy AI, maps, particles, camera, and effects.
- React owns inventory, equipment, character stats, skill tree, merchant UI, quest log, settings, and menus.
- The vertical slice has no required backend, authentication system, or remote database.
- Saves are local and versioned from the beginning.
- Content definitions are data-driven.
- One fully implemented class in the slice: Rogue.
- Active skills are unlocked only through the skill tree.
- Inventory is fixed-slot; when full, new loot cannot be picked up.
- World loot is picked up manually using the interaction input.
- Death follows a classic RPG model with no permanent loss of core character progression/equipment.
- The first slice ships with one tuned baseline difficulty and no universal one-to-one level scaling.
- Explicit non-goals include multiplayer, mobile controls, gamepad support, backend services, accounts, cloud saves, multiple fully playable classes, large open world, PvP, and whole-world procedural generation.

## Review Focus

1. **Full inventory during manual pickup:** pickup must fail without deleting or duplicating the world item; covered in Task 5 inventory tests and Task 11 world-pickup integration.
2. **Old/corrupt save or unknown content IDs:** load must recover from backup or apply migration/fallback without crashing; covered in Task 7 save tests.
3. **Rapid overlapping attack/dodge inputs:** energy may not double-spend and invulnerability may not become permanent; covered in Task 4 state-machine tests and Task 9 runtime integration.
4. **Scene transitions and React subscriptions:** stale listeners must be disposed so UI/actions do not duplicate after repeated room/scene changes; covered in Task 2 bridge tests and Task 16 Playwright flow.
5. **Empty/invalid loot or dungeon configuration:** deterministic generators must fail safely with useful validation rather than crash mid-run; covered in Task 8 content validation and Task 11 dungeon generation tests.

---

## Planned File Map

```text
src/
  app/
    App.tsx
  game/
    createGame.ts
    GameCanvas.tsx
    config/gameConfig.ts
    bridge/GameBridge.ts
    bridge/gameMessages.ts
    input/InputBindings.ts
    player/PlayerController.ts
    player/PlayerCombatController.ts
    enemies/EnemyActor.ts
    enemies/EnemyController.ts
    scenes/BootScene.ts
    scenes/OutpostScene.ts
    scenes/ForestScene.ts
    scenes/HideoutScene.ts
    scenes/BossScene.ts
    world/WorldPickup.ts
    world/DungeonAssembler.ts
    combat/HitboxSystem.ts
    combat/CombatFeedback.ts
  domain/
    state/GameState.ts
    stats/stats.ts
    combat/damage.ts
    combat/energy.ts
    combat/combo.ts
    combat/dodge.ts
    combat/statusEffects.ts
    items/itemTypes.ts
    items/itemGenerator.ts
    items/affixes.ts
    inventory/inventory.ts
    equipment/equipment.ts
    loot/lootTables.ts
    progression/leveling.ts
    skills/skillTree.ts
    economy/economy.ts
    quests/questState.ts
    ai/enemyBrain.ts
    dungeon/dungeonGenerator.ts
    save/saveSchema.ts
    save/saveRepository.ts
    content/contentRegistry.ts
    content/validateContent.ts
  content/
    items.ts
    affixes.ts
    skills.ts
    enemies.ts
    lootTables.ts
    quests.ts
    dungeonRooms.ts
  ui/
    hud/Hud.tsx
    inventory/InventoryPanel.tsx
    inventory/ItemTooltip.tsx
    equipment/EquipmentPanel.tsx
    skills/SkillTreePanel.tsx
    merchant/MerchantPanel.tsx
    quests/QuestPanel.tsx
    menus/PauseMenu.tsx
  styles/
    game-ui.css

tests/
  unit/
    bridge.test.ts
    stats.test.ts
    combat.test.ts
    energy-combo-dodge.test.ts
    items-inventory-equipment.test.ts
    progression-skills.test.ts
    save.test.ts
    content-validation.test.ts
    enemy-brain.test.ts
    dungeon-generator.test.ts
    quest-economy.test.ts
    boss-brain.test.ts
  integration/
    player-runtime.test.ts
  e2e/
    vertical-slice.spec.ts
```

---

### Task 1: Scaffold the React + Phaser Application and Test Harness

**Files:**
- Create/modify: `package.json`
- Create/modify: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/game/GameCanvas.tsx`
- Create: `src/game/createGame.ts`
- Create: `src/game/config/gameConfig.ts`
- Test: `tests/unit/game-config.test.ts`

**Interfaces:**
- Produces: `GAME_WIDTH`, `GAME_HEIGHT`, `createGame(parent: HTMLElement): Phaser.Game`, `GameCanvas`.
- Consumes: none.

- [ ] **Step 1: Scaffold the project and install runtime/test dependencies**

Run:

```bash
npm create vite@latest . -- --template react-ts
npm install phaser
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @playwright/test
npx playwright install chromium
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "typecheck": "tsc -b --pretty false",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "verify": "npm run typecheck && npm run test && npm run build"
  }
}
```

- [ ] **Step 2: Write the failing game-config test**

```ts
import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, GAME_WIDTH, makeGameConfig } from '../../src/game/config/gameConfig';

describe('game config', () => {
  it('targets a deterministic 16:9 internal viewport and provided parent', () => {
    const config = makeGameConfig('game-root');
    expect(GAME_WIDTH / GAME_HEIGHT).toBeCloseTo(16 / 9, 5);
    expect(config.parent).toBe('game-root');
    expect(config.width).toBe(GAME_WIDTH);
    expect(config.height).toBe(GAME_HEIGHT);
  });
});
```

- [ ] **Step 3: Run the test and verify it fails**

Run:

```bash
npm test -- game-config.test.ts
```

Expected: FAIL because `gameConfig` does not exist.

- [ ] **Step 4: Implement the minimal game shell**

`src/game/config/gameConfig.ts`:

```ts
import Phaser from 'phaser';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export function makeGameConfig(parent: string | HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#111318',
    pixelArt: true,
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: []
  };
}
```

`src/game/createGame.ts`:

```ts
import Phaser from 'phaser';
import { makeGameConfig } from './config/gameConfig';

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game(makeGameConfig(parent));
}
```

`src/game/GameCanvas.tsx` mounts one `Phaser.Game` in `useEffect` and calls `game.destroy(true)` on cleanup.

- [ ] **Step 5: Run verification**

Run:

```bash
npm run typecheck
npm test -- game-config.test.ts
npm run build
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.ts vitest.config.ts playwright.config.ts src tests/unit/game-config.test.ts
git commit -m "chore: scaffold Phaser React game shell"
```

---

### Task 2: Define the Typed Phaser ↔ React Bridge and Root Domain Snapshot

**Files:**
- Create: `src/domain/state/GameState.ts`
- Create: `src/game/bridge/gameMessages.ts`
- Create: `src/game/bridge/GameBridge.ts`
- Test: `tests/unit/bridge.test.ts`

**Interfaces:**
- Produces: `GameState`, `GameCommand`, `GameEvent`, `GameBridge`, `gameBridge` singleton.
- Consumes: none.

- [ ] **Step 1: Write failing subscription/cleanup tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import { GameBridge } from '../../src/game/bridge/GameBridge';

it('publishes snapshots and disposes listeners cleanly', () => {
  const bridge = new GameBridge();
  const listener = vi.fn();
  const unsubscribe = bridge.subscribe(listener);
  bridge.publish({ screen: 'outpost' });
  expect(listener).toHaveBeenCalledTimes(1);
  unsubscribe();
  bridge.publish({ screen: 'forest' });
  expect(listener).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
npm test -- bridge.test.ts
```

Expected: FAIL because bridge types/classes do not exist.

- [ ] **Step 3: Implement typed messages and bridge**

```ts
export type GameCommand =
  | { type: 'USE_POTION'; kind: 'health' | 'energy' }
  | { type: 'EQUIP_ITEM'; itemId: string; slot: string }
  | { type: 'UNLOCK_SKILL'; skillId: string }
  | { type: 'RESPEC_SKILLS' }
  | { type: 'BUY_ITEM'; itemId: string }
  | { type: 'SAVE_GAME' };

export type GameEvent =
  | { type: 'PLAYER_DAMAGED'; amount: number }
  | { type: 'LOOT_PICKED_UP'; itemId: string }
  | { type: 'QUEST_UPDATED'; questId: string }
  | { type: 'PLAYER_DIED' };
```

`GameBridge` must expose:

```ts
subscribe(listener: (state: Readonly<GameState>) => void): () => void;
publish(patch: Partial<GameState>): void;
dispatch(command: GameCommand): void;
onCommand(listener: (command: GameCommand) => void): () => void;
getSnapshot(): Readonly<GameState>;
```

Use `Set` collections for listeners and return explicit unsubscribe functions.

- [ ] **Step 4: Add a duplicate-listener regression test**

Create two listeners, unsubscribe one, publish twice, and assert the remaining listener receives exactly two updates while the disposed listener receives none after disposal.

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- bridge.test.ts
git add src/domain/state src/game/bridge tests/unit/bridge.test.ts
git commit -m "feat: add typed game bridge"
```

---

### Task 3: Implement Character Stats and Deterministic Damage Resolution

**Files:**
- Create: `src/domain/stats/stats.ts`
- Create: `src/domain/combat/damage.ts`
- Test: `tests/unit/stats.test.ts`
- Test: `tests/unit/combat.test.ts`

**Interfaces:**
- Produces: `CoreStats`, `StatModifier`, `aggregateStats(base, modifiers)`, `DamageInput`, `DamageResult`, `resolveDamage(input, roll)`.
- Consumes: none.

- [ ] **Step 1: Write failing stat aggregation tests**

```ts
const base = { hp: 100, energy: 100, attackPower: 10, critChance: 0.1, critDamage: 1.5, armor: 5, moveSpeed: 180, attackSpeed: 1, cooldownReduction: 0, dodgeDistance: 120 };
expect(aggregateStats(base, [{ stat: 'attackPower', mode: 'flat', value: 5 }]).attackPower).toBe(15);
expect(aggregateStats(base, [{ stat: 'critChance', mode: 'addPercent', value: 0.2 }]).critChance).toBeCloseTo(0.3);
```

- [ ] **Step 2: Implement a closed stat-key model**

Use a `CoreStats` interface with exactly the ten stats named by the spec. `aggregateStats` applies flat modifiers first, then percentage modifiers, and clamps `critChance` to `[0, 1]` and `cooldownReduction` to `[0, 0.75]`.

- [ ] **Step 3: Write failing deterministic damage tests**

```ts
it('applies crit and armor deterministically', () => {
  const result = resolveDamage({ rawDamage: 100, critChance: 1, critDamage: 2, targetArmor: 20 }, () => 0);
  expect(result.critical).toBe(true);
  expect(result.finalDamage).toBeGreaterThan(0);
  expect(result.finalDamage).toBeLessThan(200);
});
```

- [ ] **Step 4: Implement damage resolution**

Use:

```ts
const mitigated = raw * (100 / (100 + Math.max(0, armor)));
const critical = roll() < critChance;
const finalDamage = Math.max(1, Math.round(mitigated * (critical ? critDamage : 1)));
```

Return `{ finalDamage, critical }` and never call `Math.random()` inside domain logic; RNG is injected.

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- stats.test.ts combat.test.ts
git add src/domain/stats src/domain/combat/damage.ts tests/unit/stats.test.ts tests/unit/combat.test.ts
git commit -m "feat: add deterministic stat and damage rules"
```

---

### Task 4: Implement Energy, Dodge, Combo, Cooldown, and Status-Effect State Machines

**Files:**
- Create: `src/domain/combat/energy.ts`
- Create: `src/domain/combat/dodge.ts`
- Create: `src/domain/combat/combo.ts`
- Create: `src/domain/combat/statusEffects.ts`
- Test: `tests/unit/energy-combo-dodge.test.ts`

**Interfaces:**
- Produces: `EnergyState`, `spendEnergy`, `tickEnergy`, `DodgeState`, `beginDodge`, `tickDodge`, `ComboState`, `advanceCombo`, `resetCombo`, `StatusInstance`, `applyStatus`, `tickStatuses`.
- Consumes: stat values from Task 3.

- [ ] **Step 1: Write failing energy-delay tests**

```ts
const spent = spendEnergy({ current: 100, max: 100, regenPerSecond: 40, regenDelayMs: 500, msSinceSpend: 999 }, 30);
expect(spent.current).toBe(70);
expect(spent.msSinceSpend).toBe(0);
expect(tickEnergy(spent, 250).current).toBe(70);
expect(tickEnergy(spent, 750).current).toBeGreaterThan(70);
```

- [ ] **Step 2: Write failing dodge anti-double-spend tests**

```ts
const first = beginDodge({ active: false, remainingMs: 0, invulnerableRemainingMs: 0 }, 120, 80);
expect(first.started).toBe(true);
const second = beginDodge(first.state, 120, 80);
expect(second.started).toBe(false);
```

- [ ] **Step 3: Write failing combo-window tests**

Test that the chain advances `1 -> 2 -> 3`, resets after timeout, and never advances beyond the configured chain length.

- [ ] **Step 4: Implement immutable state transitions**

All functions return new plain objects. Use milliseconds for runtime timing and keep renderer/animation names outside the domain layer.

- [ ] **Step 5: Add poison/bleed stacking tests**

Required behavior:
- stack count never exceeds `maxStacks`;
- reapplication refreshes duration according to definition;
- expiry removes status cleanly;
- damage ticks are deterministic based on elapsed time.

- [ ] **Step 6: Run tests and commit**

```bash
npm test -- energy-combo-dodge.test.ts
git add src/domain/combat tests/unit/energy-combo-dodge.test.ts
git commit -m "feat: add Rogue combat state machines"
```

---

### Task 5: Implement Items, Affixes, Inventory, Equipment, and Loot Rolls

**Files:**
- Create: `src/domain/items/itemTypes.ts`
- Create: `src/domain/items/affixes.ts`
- Create: `src/domain/items/itemGenerator.ts`
- Create: `src/domain/inventory/inventory.ts`
- Create: `src/domain/equipment/equipment.ts`
- Create: `src/domain/loot/lootTables.ts`
- Test: `tests/unit/items-inventory-equipment.test.ts`

**Interfaces:**
- Produces: `ItemInstance`, `ItemDefinition`, `AffixDefinition`, `generateItem`, `InventoryState`, `addItem`, `removeItem`, `equipItem`, `aggregateEquipmentModifiers`, `rollLoot`.
- Consumes: `StatModifier` from Task 3 and injected RNG.

- [ ] **Step 1: Write failing fixed-slot inventory tests**

```ts
const inventory = createInventory(2);
const a = addItem(inventory, potion('health', 1));
const b = addItem(a.state, sword('s1'));
const c = addItem(b.state, dagger('d1'));
expect(c.added).toBe(false);
expect(c.state.slots.filter(Boolean)).toHaveLength(2);
```

Also test that stackable consumables merge only up to their stack limit.

- [ ] **Step 2: Implement inventory operations**

Rules:
- non-stackable gear occupies one slot per item;
- stackable items merge into compatible stacks before consuming an empty slot;
- a failed add returns `{ added: false, state: originalState }` without mutation.

- [ ] **Step 3: Write failing item-generation constraint tests**

Test that:
- Common gear gets zero random affixes;
- Rare/Epic gear gets a configured number from compatible pools;
- duplicate exclusive affixes cannot appear together;
- item level is preserved on the generated instance.

- [ ] **Step 4: Implement item generation using injected RNG**

```ts
export function generateItem(ctx: GenerateItemContext, rng: RandomSource): ItemInstance;
```

`RandomSource` exposes `next(): number` and `pick<T>(items: readonly T[]): T` so tests can supply deterministic sequences.

- [ ] **Step 5: Write and implement equipment aggregation tests**

Attempting to equip an item in an incompatible slot must fail without modifying equipment. Valid equipment returns the displaced item to the caller so the UI/domain orchestration can place it back into inventory.

- [ ] **Step 6: Implement weighted loot-table rolls**

```ts
export interface LootTableEntry { id: string; weight: number; minLevel?: number; maxLevel?: number; }
export function rollLoot(table: LootTableEntry[], level: number, rng: RandomSource): string | null;
```

Empty/zero-weight valid tables return `null`; invalid negative weights are rejected by content validation in Task 8.

- [ ] **Step 7: Run tests and commit**

```bash
npm test -- items-inventory-equipment.test.ts
git add src/domain/items src/domain/inventory src/domain/equipment src/domain/loot tests/unit/items-inventory-equipment.test.ts
git commit -m "feat: add loot inventory and equipment domain"
```

---

### Task 6: Implement Leveling, Rogue Skill Tree, and Gold-Based Respec

**Files:**
- Create: `src/domain/progression/leveling.ts`
- Create: `src/domain/skills/skillTree.ts`
- Create: `src/content/skills.ts`
- Test: `tests/unit/progression-skills.test.ts`

**Interfaces:**
- Produces: `ProgressionState`, `grantXp`, `SkillNodeDefinition`, `SkillTreeState`, `canUnlockSkill`, `unlockSkill`, `calculateRespecCost`, `respecSkills`.
- Consumes: item/stat concepts from Tasks 3–5 only through stat modifiers and IDs.

- [ ] **Step 1: Write failing leveling tests**

```ts
const next = grantXp({ level: 1, xp: 0, unspentSkillPoints: 0 }, 250);
expect(next.level).toBeGreaterThanOrEqual(2);
expect(next.unspentSkillPoints).toBe(next.level - 1);
```

Use an explicit XP curve function in one module so tuning is centralized.

- [ ] **Step 2: Write failing prerequisite/mixed-branch tests**

Verify a player can unlock Assassin then Poisoner nodes if prerequisites are satisfied, with no branch lock. Verify a node cannot be unlocked without its prerequisite or available point.

- [ ] **Step 3: Implement the tree model**

```ts
export interface SkillNodeDefinition {
  id: string;
  branch: 'assassin' | 'duelist' | 'poisoner';
  kind: 'passive' | 'active' | 'keystone';
  prerequisites: string[];
  maxRank: number;
  modifiers?: StatModifier[];
  activeSkillId?: string;
}
```

Create 18–24 initial node definitions with 5–7 meaningful nodes per branch and one keystone per branch. Active skills are referenced only by skill-tree nodes.

- [ ] **Step 4: Write failing respec-cost tests**

Test that respec fails when gold is insufficient, succeeds when enough gold exists, refunds spent skill points, clears learned nodes, and deducts exactly the calculated gold amount.

- [ ] **Step 5: Implement respec**

Use a transparent formula such as:

```ts
cost = 100 + spentPoints * 50 + Math.max(0, level - 1) * 25;
```

Keep the formula in `calculateRespecCost` so it can be rebalanced later.

- [ ] **Step 6: Run tests and commit**

```bash
npm test -- progression-skills.test.ts
git add src/domain/progression src/domain/skills src/content/skills.ts tests/unit/progression-skills.test.ts
git commit -m "feat: add Rogue progression and skill tree"
```

---

### Task 7: Implement Versioned Local Saves with Backup and Migration

**Files:**
- Create: `src/domain/save/saveSchema.ts`
- Create: `src/domain/save/saveRepository.ts`
- Test: `tests/unit/save.test.ts`

**Interfaces:**
- Produces: `CURRENT_SAVE_VERSION`, `SaveEnvelope`, `serializeGameState`, `deserializeGameState`, `migrateSave`, `LocalSaveRepository`.
- Consumes: serializable `GameState` from Task 2.

- [ ] **Step 1: Write failing round-trip tests**

Save a state containing inventory, equipped item IDs, learned skills, quest state, gold, level, and current checkpoint; load it and assert deep equality for persisted fields.

- [ ] **Step 2: Write failing migration/fallback tests**

Cover:
- a version-1 save migrated to current version;
- an unknown item ID replaced/removed according to a deterministic fallback policy while preserving the rest of the save;
- malformed primary save loads the valid backup;
- both malformed returns a fresh-game result instead of throwing.

- [ ] **Step 3: Implement the save envelope**

```ts
export interface SaveEnvelope<T> {
  version: number;
  writtenAt: string;
  payload: T;
}
```

Never serialize Phaser objects, DOM nodes, functions, or event listeners.

- [ ] **Step 4: Implement recoverable two-key writes**

`LocalSaveRepository.save` writes the previous valid primary to `fantasy-rpg.save.backup`, then writes the new JSON to `fantasy-rpg.save.primary`. `load` validates/migrates primary first, then backup.

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- save.test.ts
git add src/domain/save tests/unit/save.test.ts
git commit -m "feat: add versioned recoverable local saves"
```

---

### Task 8: Create the Data-Driven Content Registry and Startup Validation

**Files:**
- Create: `src/domain/content/contentRegistry.ts`
- Create: `src/domain/content/validateContent.ts`
- Create: `src/content/items.ts`
- Create: `src/content/affixes.ts`
- Create: `src/content/enemies.ts`
- Create: `src/content/lootTables.ts`
- Create: `src/content/quests.ts`
- Test: `tests/unit/content-validation.test.ts`

**Interfaces:**
- Produces: `ContentRegistry`, `buildContentRegistry()`, `validateContent(registry): ValidationIssue[]`.
- Consumes: domain definitions from Tasks 3–7.

- [ ] **Step 1: Write failing validation tests**

Validate that startup reports explicit issues for:
- duplicate IDs;
- skill prerequisite referencing a missing node;
- loot table referencing a missing item;
- incompatible affix/item tags;
- negative loot weights;
- quest referencing a missing reward item.

- [ ] **Step 2: Implement registry maps by stable string ID**

```ts
export interface ContentRegistry {
  items: ReadonlyMap<string, ItemDefinition>;
  affixes: ReadonlyMap<string, AffixDefinition>;
  skills: ReadonlyMap<string, SkillNodeDefinition>;
  enemies: ReadonlyMap<string, EnemyDefinition>;
  lootTables: ReadonlyMap<string, LootTableDefinition>;
  quests: ReadonlyMap<string, QuestDefinition>;
}
```

- [ ] **Step 3: Seed vertical-slice content**

Add:
- 8–12 base equipment definitions;
- 20–30 affixes split across offense/defense/mobility/resource/build-specialization families;
- 3–5 unique items;
- health and energy potions;
- five enemy archetypes;
- baseline forest/bandit loot tables;
- the bandit-leader quest definition.

Do not hard-code balance data in Phaser scenes.

- [ ] **Step 4: Make invalid content fail development startup clearly**

`createGame` or BootScene calls `validateContent` and throws one aggregated development error containing all validation messages. Production mode logs and falls back only for non-critical missing assets, not broken gameplay definitions.

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- content-validation.test.ts
git add src/domain/content src/content tests/unit/content-validation.test.ts
git commit -m "feat: add validated data driven content registry"
```

---

### Task 9: Build the Phaser Player Runtime: Movement, Aim, Combo, Dodge, Skills, and Hitboxes

**Files:**
- Create: `src/game/input/InputBindings.ts`
- Create: `src/game/player/PlayerController.ts`
- Create: `src/game/player/PlayerCombatController.ts`
- Create: `src/game/combat/HitboxSystem.ts`
- Create: `src/game/scenes/BootScene.ts`
- Modify: `src/game/config/gameConfig.ts`
- Test: `tests/integration/player-runtime.test.ts`

**Interfaces:**
- Produces: runtime adapters `PlayerController`, `PlayerCombatController`, `HitboxSystem`.
- Consumes: Task 2 bridge, Tasks 3–4 combat state, Task 8 content registry.

- [ ] **Step 1: Write a failing runtime integration test around pure controller stepping**

Keep the controller core injectable so the test can provide a fake input snapshot:

```ts
const next = controller.step({ dtMs: 16, moveX: 1, moveY: 0, aimX: 100, aimY: 0, dodgePressed: true });
expect(next.velocity.x).toBeGreaterThan(0);
expect(next.facingRadians).toBeCloseTo(0);
expect(next.requestedDodge).toBe(true);
```

- [ ] **Step 2: Implement keyboard/mouse input mapping**

Map exactly:
- WASD movement;
- pointer position to world-space aim;
- LMB basic attack;
- RMB secondary action;
- `1–4` active skills;
- `Space` dodge;
- `E` interaction for the initial implementation.

Keep key names in `InputBindings.ts` so remapping can be added later without changing combat code.

- [ ] **Step 3: Implement responsive movement and independent facing**

Normalize diagonal movement and compute facing from player world position to pointer world position. Movement must not rotate toward velocity automatically.

- [ ] **Step 4: Implement the three-hit basic combo and cancel windows**

Use Task 4 combo state as authority. Runtime animations may request hitbox activation only during explicit active frames. Dodge may cancel only during configured cancel windows, not at arbitrary moments that would erase all commitment.

- [ ] **Step 5: Implement dodge and i-frame synchronization**

On successful `beginDodge`, spend energy once, move over configured distance/time, and let `HitboxSystem` query the domain invulnerability state before applying incoming damage.

- [ ] **Step 6: Implement four active-skill slots through learned skill IDs**

The controller asks the domain state whether a skill is learned/equipped before executing it. Do not let Phaser grant skills directly.

- [ ] **Step 7: Run tests and manual dev smoke test**

```bash
npm test -- player-runtime.test.ts
npm run dev
```

Manual check: WASD + mouse aim work simultaneously; repeated Space cannot double-spend energy; LMB combo resets after timeout.

- [ ] **Step 8: Commit**

```bash
git add src/game tests/integration/player-runtime.test.ts
git commit -m "feat: add responsive Rogue runtime combat"
```

---

### Task 10: Implement Enemy AI State Logic and Five Archetypes

**Files:**
- Create: `src/domain/ai/enemyBrain.ts`
- Create: `src/game/enemies/EnemyActor.ts`
- Create: `src/game/enemies/EnemyController.ts`
- Modify: `src/content/enemies.ts`
- Test: `tests/unit/enemy-brain.test.ts`

**Interfaces:**
- Produces: `EnemyObservation`, `EnemyIntent`, `EnemyBrainState`, `stepEnemyBrain`, runtime `EnemyController`.
- Consumes: content registry and combat adapter interfaces.

- [ ] **Step 1: Write failing deterministic state-transition tests**

```ts
expect(stepEnemyBrain(idle, { playerVisible: true, distance: 300, attackReady: true }, meleeConfig).state).toBe('chase');
expect(stepEnemyBrain(chase, { playerVisible: true, distance: 60, attackReady: true }, meleeConfig).intent.type).toBe('prepareAttack');
```

- [ ] **Step 2: Implement reusable state vocabulary**

Use:

```ts
type EnemyBrainState = 'idle' | 'suspicious' | 'chase' | 'position' | 'prepareAttack' | 'attack' | 'recover' | 'retreat' | 'disabled' | 'dead';
```

`stepEnemyBrain` is pure and returns `{ state, intent }`.

- [ ] **Step 3: Configure five archetypes rather than subclassing five bespoke brains**

Content config controls preferred range, flank bias, attack cooldowns, retreat thresholds, armor, speed, and available attack definitions for:
- melee bandit;
- fast cutthroat;
- archer;
- heavy bandit;
- scout/trapper.

- [ ] **Step 4: Add fairness/telegraph contract**

Every damaging attack definition includes `telegraphMs`, `activeMs`, `recoveryMs`, and a cue key. `EnemyController` must transition through prepare/recovery rather than dealing immediate invisible damage.

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- enemy-brain.test.ts
git add src/domain/ai src/game/enemies src/content/enemies.ts tests/unit/enemy-brain.test.ts
git commit -m "feat: add configurable enemy AI archetypes"
```

---

### Task 11: Build Outpost, Cursed Forest, Manual Pickups, and Semi-Procedural Bandit Hideout

**Files:**
- Create: `src/domain/dungeon/dungeonGenerator.ts`
- Create: `src/content/dungeonRooms.ts`
- Create: `src/game/world/DungeonAssembler.ts`
- Create: `src/game/world/WorldPickup.ts`
- Create: `src/game/scenes/OutpostScene.ts`
- Create: `src/game/scenes/ForestScene.ts`
- Create: `src/game/scenes/HideoutScene.ts`
- Modify: `src/game/config/gameConfig.ts`
- Test: `tests/unit/dungeon-generator.test.ts`

**Interfaces:**
- Produces: `DungeonRoomDefinition`, `GeneratedDungeon`, `generateDungeon(seed, definitions)`, world pickup interaction.
- Consumes: inventory add operation, loot/item generation, bridge, enemy spawning.

- [ ] **Step 1: Write failing deterministic dungeon tests**

Given the same seed and room definitions, generated room order must be identical. The generator must include exactly one entrance, at least one combat room, and exactly one boss exit/arena connection.

- [ ] **Step 2: Write invalid/empty configuration tests**

Empty room definitions return a typed generation failure before scene creation; impossible connectivity reports the offending room IDs rather than recursing forever.

- [ ] **Step 3: Implement a constrained room-graph generator**

The generator selects from hand-authored room definitions by tags (`entrance`, `combat`, `trap`, `treasure`, `bossApproach`) and outputs only IDs plus connectors/spawn variants. Phaser assembles room visuals from authored templates.

- [ ] **Step 4: Implement the three world scenes**

`OutpostScene`: safe zone, five functional interaction points.

`ForestScene`: authored route with side branches, mixed encounters, hidden loot path, hideout entrance.

`HideoutScene`: assembled authored rooms, traps, treasure room chance, boss transition.

- [ ] **Step 5: Implement manual pickup semantics**

`WorldPickup.tryCollect()` calls domain `addItem`. If `added === false`, the pickup remains active and visible. Only successful add destroys/removes the world entity and emits `LOOT_PICKED_UP`.

- [ ] **Step 6: Add the full-inventory regression test**

Unit-test `tryCollect` with a fake full inventory service and assert the world pickup is not marked collected and no duplicate item is emitted.

- [ ] **Step 7: Run tests and commit**

```bash
npm test -- dungeon-generator.test.ts
npm run typecheck
git add src/domain/dungeon src/content/dungeonRooms.ts src/game/world src/game/scenes tests/unit/dungeon-generator.test.ts
git commit -m "feat: add vertical slice world and dungeon assembly"
```

---

### Task 12: Build React HUD, Inventory, Equipment, and Item Comparison UI

**Files:**
- Create: `src/ui/hud/Hud.tsx`
- Create: `src/ui/inventory/InventoryPanel.tsx`
- Create: `src/ui/inventory/ItemTooltip.tsx`
- Create: `src/ui/equipment/EquipmentPanel.tsx`
- Modify: `src/app/App.tsx`
- Create: `src/styles/game-ui.css`
- Test: `tests/unit/ui-inventory.test.tsx`

**Interfaces:**
- Produces: UI components subscribing to `GameBridge` and dispatching `GameCommand`s.
- Consumes: bridge, inventory/equipment state, derived stat comparison.

- [ ] **Step 1: Write failing UI tests with a fake bridge state**

Assert that:
- HUD renders HP and Energy values;
- inventory renders occupied and empty slots;
- hovering/selecting gear shows equipped comparison deltas;
- clicking Equip dispatches exactly one `EQUIP_ITEM` command.

- [ ] **Step 2: Implement a reusable React hook for bridge snapshots**

```ts
export function useGameSnapshot(): Readonly<GameState>;
```

Use `useSyncExternalStore` so React subscribes/unsubscribes correctly and avoids ad-hoc event listener leaks.

- [ ] **Step 3: Implement HUD and panel layout**

Keep Phaser canvas as the background/full game surface and React UI in an overlay layer. Inventory/equipment panels pause or suppress gameplay input while open, but do not destroy the Phaser scene.

- [ ] **Step 4: Implement item comparison**

Compute deltas from `aggregateStats` using current equipment vs hypothetical equipment. Do not duplicate stat formulas in React.

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- ui-inventory.test.tsx
git add src/ui src/app/App.tsx src/styles tests/unit/ui-inventory.test.tsx
git commit -m "feat: add HUD inventory and equipment UI"
```

---

### Task 13: Implement Quest, Merchant, Economy, Respec Service, and Their UI

**Files:**
- Create: `src/domain/economy/economy.ts`
- Create: `src/domain/quests/questState.ts`
- Create: `src/ui/merchant/MerchantPanel.tsx`
- Create: `src/ui/quests/QuestPanel.tsx`
- Create: `src/ui/skills/SkillTreePanel.tsx`
- Modify: `src/content/quests.ts`
- Test: `tests/unit/quest-economy.test.ts`

**Interfaces:**
- Produces: `buyItem`, `sellItem` if used, `advanceQuest`, `canTurnInQuest`, merchant stock model, quest state model.
- Consumes: inventory, gold, skill tree/respec, bridge.

- [ ] **Step 1: Write failing merchant atomicity tests**

If the player lacks gold or inventory capacity, purchase fails with no gold deduction and no stock mutation. Successful purchase deducts gold and adds exactly one item/stack.

- [ ] **Step 2: Write failing quest transition tests**

Quest flow:

```text
available -> accepted -> leaderDefeated -> returnToOutpost -> completed
```

Turning in before `leaderDefeated` must fail. Turning in after completion cannot grant the reward twice.

- [ ] **Step 3: Implement economy and quest domain functions**

All state changes are atomic pure transitions. Quest completion reward includes gold/XP and optional authored item IDs from content.

- [ ] **Step 4: Implement merchant, quest, and skill-tree React panels**

The respec interaction displays calculated gold cost before confirmation and dispatches `RESPEC_SKILLS` only when the player can afford it.

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- quest-economy.test.ts progression-skills.test.ts
git add src/domain/economy src/domain/quests src/ui/merchant src/ui/quests src/ui/skills src/content/quests.ts tests/unit/quest-economy.test.ts
git commit -m "feat: add quest merchant and respec loop"
```

---

### Task 14: Implement the Bandit Leader Boss State Machine and Boss Scene

**Files:**
- Create: `src/domain/ai/bossBrain.ts`
- Create: `src/game/scenes/BossScene.ts`
- Modify: `src/content/enemies.ts`
- Test: `tests/unit/boss-brain.test.ts`

**Interfaces:**
- Produces: `BossPhase`, `BossIntent`, `stepBanditLeaderBrain`.
- Consumes: combat timings, enemy runtime adapter, content registry.

- [ ] **Step 1: Write failing phase-threshold tests**

```ts
expect(getBossPhase(1.0)).toBe('phase1');
expect(getBossPhase(0.59)).toBe('phase2');
expect(getBossPhase(0.24)).toBe('finalPressure');
```

- [ ] **Step 2: Write attack-selection fairness tests**

At every phase, selected damaging moves must define non-zero telegraph and recovery windows. Final-pressure moves may shorten selected recovery but must keep at least one readable punish window in the attack pool.

- [ ] **Step 3: Implement behavior changes rather than hidden defensive inflation**

Phase 1 pool: fast combo, thrown knives, poison strike, smoke, defensive side dodge.

Phase 2 adds: feint, dash-behind reposition, longer strings, stronger poison pressure.

Final pressure increases cadence/smoke/mobility and exposes explicit vulnerability windows after selected long strings.

Do not modify max HP/armor upward during phase changes.

- [ ] **Step 4: Integrate boss victory into quest and loot**

On one authoritative death event:
- mark quest objective `leaderDefeated`;
- roll boss loot table once;
- guarantee the configured boss reward policy;
- unlock exit/return path.

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- boss-brain.test.ts quest-economy.test.ts
git add src/domain/ai/bossBrain.ts src/game/scenes/BossScene.ts src/content/enemies.ts tests/unit/boss-brain.test.ts
git commit -m "feat: add Bandit Leader boss encounter"
```

---

### Task 15: Integrate Saving, Death/Checkpoint Reload, Potions, and Repeatable Run State

**Files:**
- Modify: `src/domain/state/GameState.ts`
- Modify: `src/game/scenes/OutpostScene.ts`
- Modify: `src/game/scenes/ForestScene.ts`
- Modify: `src/game/scenes/HideoutScene.ts`
- Modify: `src/game/scenes/BossScene.ts`
- Create: `src/game/GameSession.ts`
- Test: `tests/unit/session-flow.test.ts`

**Interfaces:**
- Produces: `GameSession.startNew`, `GameSession.load`, `GameSession.save`, `GameSession.onCheckpoint`, `GameSession.onDeath`.
- Consumes: save repository, bridge, inventory consumables, world/quest state.

- [ ] **Step 1: Write failing potion-consumption tests**

Health potion instantly increases HP up to max and consumes one inventory quantity. Energy potion does the same for energy. Using a potion on cooldown or with no item must make no state change.

- [ ] **Step 2: Write failing checkpoint/death tests**

After checkpoint save, mutate position/HP and trigger death. Reloaded state must restore checkpoint position/progression while preserving the checkpoint's equipment, level, learned skills, and inventory exactly.

- [ ] **Step 3: Implement autosave triggers**

Trigger save when:
- entering outpost;
- completing major quest milestones;
- activating progression checkpoints;
- explicitly saving in safe zones.

Avoid save writes every frame or on every minor pickup.

- [ ] **Step 4: Implement repeatable dungeon-run state**

After first completion, subsequent hideout entry gets a new run seed and may vary room order/encounter/trap/reward selections while persistent character progression remains unchanged.

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- session-flow.test.ts save.test.ts
git add src/domain/state src/game/GameSession.ts src/game/scenes tests/unit/session-flow.test.ts
git commit -m "feat: integrate saves death and repeatable runs"
```

---

### Task 16: Add Combat Feedback, Asset Fallbacks, End-to-End Acceptance Flow, and Final Verification

**Files:**
- Create: `src/game/combat/CombatFeedback.ts`
- Create/modify: `src/game/scenes/BootScene.ts`
- Create: `src/ui/menus/PauseMenu.tsx`
- Create: `tests/e2e/vertical-slice.spec.ts`
- Modify: `playwright.config.ts`
- Modify: `README.md`

**Interfaces:**
- Produces: final playable slice and regression acceptance suite.
- Consumes: all prior tasks.

- [ ] **Step 1: Add asset-fallback behavior**

Missing development sprite/icon keys render a visible placeholder texture/icon and log the stable missing asset ID. Missing visual assets must not crash inventory or basic gameplay during development.

- [ ] **Step 2: Add restrained combat feedback**

Implement configuration-driven hit flash, attack trail hooks, particle hooks, camera shake, boss cues, and optional lighting effects. Keep feedback triggered by combat events so damage rules remain independent from visuals.

- [ ] **Step 3: Write the Playwright acceptance test**

Use a deterministic test content mode/seed and verify the user can:

```text
launch -> outpost -> accept contract -> enter forest -> defeat encounter -> pick up loot ->
open inventory -> equip item -> enter hideout -> reach boss -> defeat boss -> return -> turn in -> save -> reload
```

The E2E test may use test-only shortcuts to reduce encounter duration, but it must exercise the same state transitions and UI commands as production.

- [ ] **Step 4: Add stale-subscription regression to E2E**

Transition outpost/forest/hideout/outpost multiple times, perform one inventory action, and assert only one corresponding state change occurs. This catches duplicate Phaser/React listeners after scene changes.

- [ ] **Step 5: Run the complete verification suite**

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Expected: all commands PASS with no uncaught browser errors.

- [ ] **Step 6: Manual vertical-slice playtest checklist**

Verify manually:
- movement feels responsive at medium camera distance;
- mouse aim is independent of movement;
- combo/dodge inputs feel readable and do not lock the player unfairly;
- enemy telegraphs are readable without relying solely on red circles;
- mixed groups are meaningfully harder than identical groups;
- full inventory visibly blocks pickup without deleting loot;
- health/energy potions are instant but constrained by inventory/cooldown;
- item comparison is understandable;
- skill tree supports mixed branches and paid respec;
- boss phases change behavior at ~60% and ~25% HP without hidden defense inflation;
- death returns to checkpoint without permanent progression loss;
- second hideout run varies appropriately;
- save/reload retains progression.

- [ ] **Step 7: Document controls and developer verification**

`README.md` must include:
- `npm install`;
- `npm run dev`;
- `npm run verify`;
- `npm run test:e2e`;
- controls: WASD, mouse, LMB, RMB, 1–4, Space, E;
- architecture summary: Phaser runtime + React UI + pure domain modules;
- explicit statement that backend/cloud save/gamepad/mobile are not part of this slice.

- [ ] **Step 8: Final commit**

```bash
git add .
git commit -m "feat: complete fantasy action RPG vertical slice"
```

---

## Self-Review Results

### Spec coverage

Every required vertical-slice area maps to at least one task:
- architecture/bridge: Tasks 1–2;
- stats/combat/energy/dodge/combo/status: Tasks 3–4 and 9;
- itemization/inventory/equipment/loot: Task 5 and UI in Task 12;
- progression/skill tree/respec: Task 6 and UI in Task 13;
- save/death/versioning: Tasks 7 and 15;
- data-driven content/validation: Task 8;
- enemy AI/telegraphs: Task 10;
- outpost/forest/hideout/replayability: Task 11;
- quest/economy/merchant: Task 13;
- Bandit Leader: Task 14;
- visual feedback and final acceptance: Task 16.

### Placeholder scan

No `TBD`, `TODO`, "implement later", unspecified generic error handling, or undefined neighboring interface names remain in the plan.

### Type/interface consistency

The plan consistently uses injected RNG for domain randomness, stable string IDs for content references, immutable domain transitions, `GameBridge` for Phaser/React communication, and versioned serializable `GameState` for persistence.

### Review-focus coverage

All five Review Focus cases have explicit tests or acceptance checks in their owning tasks.

## Recommended Execution Method

**Recommended: Native execution.** The 16 tasks have significant interface dependencies (bridge → domain → runtime → UI → world → boss → final integration). Implementing them sequentially in one session preserves those contracts efficiently; a final independent review can then inspect the whole branch. Subagent-driven execution is also viable if maximum review isolation is preferred over speed/cost.
