# Runtime Integration Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Wire the existing deterministic RPG domain systems into the real Phaser runtime so PR #1 becomes a genuinely playable Rogue combat/loot/boss vertical slice whose primary Playwright flow uses normal game inputs rather than direct session shortcuts.

**Architecture:** Phaser scenes remain thin composition roots. New runtime adapters (\`DerivedStatsService\`, \`GameplayControlState\`, \`CombatRuntime\`, \`PlayerRuntime\`, \`EnemyRuntime\`, \`LootRuntime\`, \`BossRuntime\`) translate between Phaser objects/input and pure TypeScript domain rules. \`GameSession\` remains the persistent serializable state owner, but inventory/equipment/skill rules are delegated to canonical domain functions.

**Tech Stack:** TypeScript, Phaser 4.2.1, React 19, Vite 7, Vitest 3, Testing Library, Playwright, browser localStorage, GitHub Actions.

**Spec:** \`docs/superpowers/specs/2026-09-19-runtime-integration-design.md\`

## Global Constraints

- Primary platform remains desktop browser with keyboard and mouse.
- Phaser scenes must not contain damage formulas, inventory insertion rules, skill validation, or boss move-selection logic.
- Active skills are unlocked only through the skill tree and assigned to slots 1–4 explicitly.
- World loot is collected manually with the interaction key and remains in-world when inventory cannot accept the full item.
- Equipment and passive skills must change real runtime combat stats through one canonical derived-stat path.
- Pause/menu ownership must suppress gameplay input; the pause menu must also pause gameplay simulation.
- Save loading must sanitize stale item, skill, active-skill, and equipment references rather than crash or create phantom progression.
- Boss phases change behavior/move cadence only; they must not inflate max HP or armor.
- Test mode may set deterministic RNG/seeds, shorten timings, and reduce enemy HP, but may not directly grant loot, complete encounters, kill the boss, or mutate quest milestones.
- Existing backend/mobile/gamepad/multiplayer non-goals remain unchanged.

## Review Focus

1. **Runtime bypass in E2E:** the acceptance test must fail if Phaser combat/loot integration is disconnected; Task 11 removes progression shortcut buttons and drives normal input.
2. **Double damage from repeated overlap callbacks:** one attack window may damage one target only once; Task 4 adds an attack-window hit registry test.
3. **Pause/modal input leakage:** movement/attack/dodge/skills must remain inactive while UI owns input; Tasks 3, 5, and 10 pin this behavior.
4. **Stale save references after content changes:** unknown skills/equipment references must be sanitized without phantom spent points or stats; Task 1 covers this explicitly.
5. **Full inventory during world pickup:** failed pickup leaves the world entity uncollected and unchanged; Task 7 covers this through runtime integration.

---

## Planned File Map

\`\`\`text
src/
  domain/
    inventory/inventory.ts
    save/saveSchema.ts
    skills/skillTree.ts
    state/GameState.ts
    stats/DerivedStatsService.ts             # new
  game/
    GameSession.ts
    bridge/gameMessages.ts
    runtime/
      GameplayControlState.ts                # new
      CombatRuntime.ts                       # new
      PlayerRuntime.ts                       # new
      EnemyRuntime.ts                        # new
      LootRuntime.ts                         # new
      BossRuntime.ts                         # new
      runtimeTypes.ts                        # new shared lightweight contracts
    scenes/
      ForestScene.ts
      HideoutScene.ts
      BossScene.ts
    world/DungeonAssembler.ts
  ui/
    inventory/InventoryPanel.tsx
    skills/SkillTreePanel.tsx
    menus/PauseMenu.tsx
    useGameplayControls.ts                   # new
  test/TestFlowPanel.tsx                     # delete or reduce to non-progressing diagnostics

tests/
  unit/
    save.test.ts
    derived-stats.test.ts
    skill-assignment.test.ts
    gameplay-control-state.test.ts
    combat-runtime.test.ts
    player-runtime.test.ts
    enemy-runtime.test.ts
    loot-runtime.test.ts
    boss-runtime.test.ts
    ui-inventory.test.tsx
  integration/
    runtime-combat-loop.test.ts
    dungeon-runtime.test.ts
    pause-runtime.test.ts
  e2e/
    vertical-slice.spec.ts
\`\`\`

---

### Task 1: Canonical Inventory Mutation and Save Sanitation

**Files:**
- Modify: \`src/domain/inventory/inventory.ts\`
- Modify: \`src/domain/save/saveSchema.ts\`
- Modify: \`src/domain/state/GameState.ts\`
- Modify: \`src/game/GameSession.ts\`
- Test: \`tests/unit/save.test.ts\`
- Test: \`tests/unit/items-inventory-equipment.test.ts\`
- Test: \`tests/unit/session-flow.test.ts\`

**Interfaces:**
- Consumes: current \`GameState\`, \`SerializableItemStack\`, item/skill content definitions.
- Produces:
  - \`addSerializedItem(state: SerializableInventoryState, item: SerializableItemStack, definitions: ReadonlyMap<string, ItemDefinition>): SerializedAddResult\`
  - \`sanitizeGameState(state: GameState, content: SaveContentIndex): GameState\`
  - \`SaveContentIndex { itemIds, skillNodes, equipmentByInstance }\`
- Later tasks rely on one canonical serialized inventory insertion function and sanitized state.

- [ ] **Step 1: Add failing serialized-inventory tests**

Add to \`tests/unit/items-inventory-equipment.test.ts\`:

\`\`\`ts
import { addSerializedItem } from '../../src/domain/inventory/inventory';
import { buildContentRegistry } from '../../src/domain/content/contentRegistry';

it('does not partially consume a serialized pickup when capacity is insufficient', () => {
  const content = buildContentRegistry();
  const inventory = {
    capacity: 1,
    slots: [{ instanceId: 'hp', definitionId: 'health_potion', quantity: 9, rarity: 'common', itemLevel: 1 }],
  };
  const item = { instanceId: 'drop', definitionId: 'health_potion', quantity: 2, rarity: 'common', itemLevel: 1 };
  const result = addSerializedItem(inventory, item, content.items);
  expect(result.added).toBe(false);
  expect(result.state).toEqual(inventory);
  expect(result.remainder?.quantity).toBe(2);
});

it('fills an existing serialized stack when the entire pickup fits', () => {
  const content = buildContentRegistry();
  const inventory = {
    capacity: 1,
    slots: [{ instanceId: 'hp', definitionId: 'health_potion', quantity: 8, rarity: 'common', itemLevel: 1 }],
  };
  const item = { instanceId: 'drop', definitionId: 'health_potion', quantity: 2, rarity: 'common', itemLevel: 1 };
  const result = addSerializedItem(inventory, item, content.items);
  expect(result.added).toBe(true);
  expect(result.state.slots[0]?.quantity).toBe(10);
});
\`\`\`

- [ ] **Step 2: Run the inventory tests and verify RED**

Run:

\`\`\`bash
npm test -- items-inventory-equipment.test.ts
\`\`\`

Expected: FAIL because \`addSerializedItem\` is not exported from the domain inventory module.

- [ ] **Step 3: Implement atomic serialized insertion in the domain**

In \`src/domain/inventory/inventory.ts\`, add serializable inventory types and implement insertion transactionally: clone, attempt all transfers, and return the original state when the whole item cannot fit.

Core signature:

\`\`\`ts
export interface SerializableInventoryState {
  capacity: number;
  slots: Array<SerializableItemStack | null>;
}

export interface SerializedAddResult {
  added: boolean;
  state: SerializableInventoryState;
  remainder?: SerializableItemStack;
}

export function addSerializedItem(
  state: SerializableInventoryState,
  item: SerializableItemStack,
  definitions: ReadonlyMap<string, ItemDefinition>,
): SerializedAddResult;
\`\`\`

Use the item definition's \`stackable\` and \`maxStack\`; do not duplicate those rules in \`GameSession\`.

- [ ] **Step 4: Add failing save-sanitation tests**

Add to \`tests/unit/save.test.ts\`:

\`\`\`ts
it('removes unknown skills, invalid active slots, and stale equipment references', () => {
  const content = buildContentRegistry();
  const state = createInitialGameState();
  state.skills.learned = { assassin_precision: 99, removed_skill: 3 };
  state.skills.equippedActiveSkillIds = ['removed_active', 'shadow_dash', null, null];
  state.inventory.slots[0] = {
    instanceId: 'dagger-1',
    definitionId: 'steel_dagger',
    quantity: 1,
    itemLevel: 1,
    rarity: 'rare',
  };
  state.equipment.weapon = 'missing-instance';

  const raw = serializeGameState(state);
  const restored = deserializeGameState(raw, {
    itemIds: new Set(content.items.keys()),
    skillNodes: content.skills,
  }).state;

  expect(restored.skills.learned.removed_skill).toBeUndefined();
  expect(restored.skills.learned.assassin_precision).toBe(3);
  expect(restored.skills.equippedActiveSkillIds[0]).toBeNull();
  expect(restored.skills.equippedActiveSkillIds[1]).toBe('shadow_dash');
  expect(restored.equipment.weapon).toBeNull();
});
\`\`\`

- [ ] **Step 5: Run save tests and verify RED**

Run:

\`\`\`bash
npm test -- save.test.ts
\`\`\`

Expected: FAIL because deserialize currently accepts only \`knownItemIds\` and leaves stale skill/equipment references intact.

- [ ] **Step 6: Implement \`SaveContentIndex\` sanitation**

In \`saveSchema.ts\` define:

\`\`\`ts
export interface SaveContentIndex {
  itemIds: ReadonlySet<string>;
  skillNodes: ReadonlyMap<string, SkillNodeDefinition>;
}
\`\`\`

Sanitation rules:
- remove unknown inventory item definitions;
- remove unknown learned skill IDs;
- clamp known skill ranks to \`[0, maxRank]\`;
- derive the set of learned active IDs from learned active nodes;
- clear active slots not present in that learned-active set;
- clear equipment instance IDs not present in sanitized inventory or whose item's defined slot does not match the equipment key.

Update \`LocalSaveRepository\` constructor to receive \`SaveContentIndex\`.

- [ ] **Step 7: Replace GameSession's private insertion helper**

Delete the private \`addSerializedItem\` in \`GameSession.ts\`. Import the domain function and use it in \`grantLoot\`, \`turnIn\`, and \`buy\`. Every failed full-item insertion must leave state/gold/quest reward state unchanged.

- [ ] **Step 8: Verify Task 1**

Run:

\`\`\`bash
npm test -- items-inventory-equipment.test.ts save.test.ts session-flow.test.ts
npm test
\`\`\`

Expected: all PASS.

- [ ] **Step 9: Commit**

\`\`\`bash
git add src/domain/inventory/inventory.ts src/domain/save/saveSchema.ts src/domain/save/saveRepository.ts src/domain/state/GameState.ts src/game/GameSession.ts tests/unit/items-inventory-equipment.test.ts tests/unit/save.test.ts tests/unit/session-flow.test.ts
git commit -m "fix: unify inventory rules and sanitize saves"
\`\`\`

---

### Task 2: Derived Combat Stats, Equipment Resolution, and Active Skill Assignment

**Files:**
- Create: \`src/domain/stats/DerivedStatsService.ts\`
- Modify: \`src/domain/skills/skillTree.ts\`
- Modify: \`src/game/bridge/gameMessages.ts\`
- Modify: \`src/game/GameSession.ts\`
- Test: \`tests/unit/derived-stats.test.ts\`
- Test: \`tests/unit/skill-assignment.test.ts\`

**Interfaces:**
- Consumes: sanitized \`GameState\`, item registry, Rogue skill nodes.
- Produces:
  - \`deriveCombatStats(state, content): DerivedCombatStats\`
  - \`resolveEquippedItems(state, content): Partial<Record<EquipmentSlot, ItemInstanceLike>>\`
  - \`assignActiveSkill(definitions, skillState, slots, activeSkillId, slotIndex): ActiveSkillAssignmentResult\`
  - new command \`ASSIGN_ACTIVE_SKILL\`.

- [ ] **Step 1: Write failing derived-stat tests**

\`\`\`ts
it('combines equipped item and learned passive modifiers', () => {
  const state = createInitialGameState();
  state.inventory.slots[0] = {
    instanceId: 'steel-1',
    definitionId: 'steel_dagger',
    quantity: 1,
    itemLevel: 1,
    rarity: 'rare',
  };
  state.equipment.weapon = 'steel-1';
  state.skills.learned.assassin_precision = 1;

  const stats = deriveCombatStats(state, buildContentRegistry());
  expect(stats.attackPower).toBeGreaterThan(stats.base.attackPower);
  expect(stats.critChance).toBeCloseTo(stats.base.critChance + 0.03);
});

it('ignores stale equipped instance ids', () => {
  const state = createInitialGameState();
  state.equipment.weapon = 'missing';
  expect(() => deriveCombatStats(state, buildContentRegistry())).not.toThrow();
});
\`\`\`

- [ ] **Step 2: Verify RED**

Run:

\`\`\`bash
npm test -- derived-stats.test.ts
\`\`\`

Expected: FAIL because \`DerivedStatsService\` does not exist.

- [ ] **Step 3: Implement the derived-stat service**

Define a single base Rogue stat constant inside \`DerivedStatsService.ts\`:

\`\`\`ts
export const ROGUE_BASE_STATS: CoreStats = {
  hp: 100,
  energy: 100,
  attackPower: 10,
  critChance: 0.10,
  critDamage: 1.5,
  armor: 5,
  moveSpeed: 180,
  attackSpeed: 1,
  cooldownReduction: 0,
  dodgeDistance: 120,
};
\`\`\`

Resolve equipment by instance ID against inventory entries and their item definitions. For current serialized items, rebuild base item modifiers from the definition plus affix IDs found in content. Apply learned passive/keystone modifiers once per learned rank. Return:

\`\`\`ts
export interface DerivedCombatStats extends CoreStats {
  base: CoreStats;
  equippedInstanceIds: Partial<Record<EquipmentSlot, string>>;
}
\`\`\`

- [ ] **Step 4: Write failing active-skill assignment tests**

\`\`\`ts
it('assigns only a learned active skill to slots 0 through 3', () => {
  const state = { learned: { assassin_shadow_dash: 1 } };
  const result = assignActiveSkill(rogueSkillNodes, state, [null, null, null, null], 'shadow_dash', 0);
  expect(result.assigned).toBe(true);
  expect(result.slots[0]).toBe('shadow_dash');
});

it('rejects passive ids, unknown ids, duplicates, and invalid slot indexes', () => {
  const state = { learned: { assassin_precision: 1, assassin_shadow_dash: 1 } };
  expect(assignActiveSkill(rogueSkillNodes, state, [null, null, null, null], 'assassin_precision', 0).assigned).toBe(false);
  expect(assignActiveSkill(rogueSkillNodes, state, ['shadow_dash', null, null, null], 'shadow_dash', 1).assigned).toBe(false);
  expect(assignActiveSkill(rogueSkillNodes, state, [null, null, null, null], 'shadow_dash', 9).assigned).toBe(false);
});
\`\`\`

- [ ] **Step 5: Verify RED and implement assignment**

Run:

\`\`\`bash
npm test -- skill-assignment.test.ts
\`\`\`

Expected: FAIL because \`assignActiveSkill\` does not exist.

Implement:

\`\`\`ts
export function assignActiveSkill(
  definitions: readonly SkillNodeDefinition[],
  state: SkillTreeState,
  currentSlots: readonly (string | null)[],
  activeSkillId: string,
  slotIndex: number,
): ActiveSkillAssignmentResult;
\`\`\`

It must find an active node whose \`activeSkillId\` matches and whose node is learned.

- [ ] **Step 6: Add bridge/session command**

Extend \`GameCommand\`:

\`\`\`ts
| { type: 'ASSIGN_ACTIVE_SKILL'; activeSkillId: string; slotIndex: number }
\`\`\`

Handle it in \`GameSession\` by calling the domain function and publishing only on success.

- [ ] **Step 7: Verify Task 2**

\`\`\`bash
npm test -- derived-stats.test.ts skill-assignment.test.ts progression-skills.test.ts session-flow.test.ts
npm test
\`\`\`

Expected: all PASS.

- [ ] **Step 8: Commit**

\`\`\`bash
git add src/domain/stats/DerivedStatsService.ts src/domain/skills/skillTree.ts src/game/bridge/gameMessages.ts src/game/GameSession.ts tests/unit/derived-stats.test.ts tests/unit/skill-assignment.test.ts
git commit -m "feat: derive runtime stats and assign active skills"
\`\`\`

---

### Task 3: Shared Gameplay Control and Pause State

**Files:**
- Create: \`src/game/runtime/GameplayControlState.ts\`
- Create: \`src/ui/useGameplayControls.ts\`
- Modify: \`src/app/App.tsx\`
- Modify: \`src/ui/menus/PauseMenu.tsx\`
- Test: \`tests/unit/gameplay-control-state.test.ts\`
- Test: \`tests/integration/pause-runtime.test.ts\`

**Interfaces:**
- Produces:
  - \`gameplayControlState.setUiCapture(source, active)\`
  - \`gameplayControlState.setPaused(paused)\`
  - \`gameplayControlState.getSnapshot(): { inputEnabled: boolean; paused: boolean }\`
  - subscribe/unsubscribe API compatible with React and runtime code.
- Consumes: React modal states.
- Later Player/Enemy runtimes query the same control state.

- [ ] **Step 1: Write failing control-state tests**

\`\`\`ts
it('suppresses input while any UI owner captures controls', () => {
  const controls = new GameplayControlState();
  controls.setUiCapture('inventory', true);
  expect(controls.getSnapshot().inputEnabled).toBe(false);
  controls.setUiCapture('skills', true);
  controls.setUiCapture('inventory', false);
  expect(controls.getSnapshot().inputEnabled).toBe(false);
  controls.setUiCapture('skills', false);
  expect(controls.getSnapshot().inputEnabled).toBe(true);
});

it('pause disables input and marks simulation paused', () => {
  const controls = new GameplayControlState();
  controls.setPaused(true);
  expect(controls.getSnapshot()).toEqual({ inputEnabled: false, paused: true });
});
\`\`\`

- [ ] **Step 2: Verify RED**

\`\`\`bash
npm test -- gameplay-control-state.test.ts
\`\`\`

Expected: FAIL because the class does not exist.

- [ ] **Step 3: Implement reference-counted UI capture**

Use a \`Set<string>\` of capture sources and stable immutable snapshots. No DOM attribute is the source of truth.

- [ ] **Step 4: Wire React modals**

In \`App.tsx\`, update capture state with effects for inventory, skills, merchant, and pause. Pause must call \`setPaused(true/false)\`; inventory/skills/merchant capture input without globally pausing simulation.

- [ ] **Step 5: Add integration test for runtime input gate**

\`\`\`ts
it('prevents a runtime input callback while paused', () => {
  const controls = new GameplayControlState();
  controls.setPaused(true);
  expect(canProcessGameplayInput(controls.getSnapshot())).toBe(false);
  controls.setPaused(false);
  expect(canProcessGameplayInput(controls.getSnapshot())).toBe(true);
});
\`\`\`

Expose the tiny pure helper from \`GameplayControlState.ts\`.

- [ ] **Step 6: Verify and commit**

\`\`\`bash
npm test -- gameplay-control-state.test.ts pause-runtime.test.ts
npm test
git add src/game/runtime/GameplayControlState.ts src/ui/useGameplayControls.ts src/app/App.tsx src/ui/menus/PauseMenu.tsx tests/unit/gameplay-control-state.test.ts tests/integration/pause-runtime.test.ts
git commit -m "feat: synchronize UI capture with gameplay pause state"
\`\`\`

---

### Task 4: CombatRuntime with One-Hit Attack Windows

**Files:**
- Create: \`src/game/runtime/runtimeTypes.ts\`
- Create: \`src/game/runtime/CombatRuntime.ts\`
- Test: \`tests/unit/combat-runtime.test.ts\`

**Interfaces:**
- Consumes: \`resolveDamage\`, \`HitboxSystem\`, injected RNG.
- Produces:
  - \`CombatRuntime.beginAttack(window: AttackWindowDefinition): string\`
  - \`CombatRuntime.tryHit(attackId, target): CombatHitResult\`
  - \`CombatRuntime.endAttack(attackId): void\`
  - \`RuntimeCombatTarget\` contract.

- [ ] **Step 1: Write the failing one-hit test**

\`\`\`ts
it('damages a target only once per active attack window', () => {
  const combat = new CombatRuntime(() => 0.5);
  const target = makeTarget('enemy-1', 100, 0);
  const attackId = combat.beginAttack({
    ownerId: 'player',
    rawDamage: 20,
    critChance: 0,
    critDamage: 1.5,
  });

  expect(combat.tryHit(attackId, target).applied).toBe(true);
  expect(combat.tryHit(attackId, target).applied).toBe(false);
  expect(target.hp).toBe(80);
});
\`\`\`

- [ ] **Step 2: Add i-frame test**

\`\`\`ts
it('does not damage an invulnerable target', () => {
  const combat = new CombatRuntime(() => 0);
  const target = makeTarget('player', 100, 0, true);
  const id = combat.beginAttack({ ownerId: 'enemy', rawDamage: 50, critChance: 0, critDamage: 1 });
  expect(combat.tryHit(id, target).applied).toBe(false);
  expect(target.hp).toBe(100);
});
\`\`\`

- [ ] **Step 3: Verify RED**

\`\`\`bash
npm test -- combat-runtime.test.ts
\`\`\`

Expected: FAIL because \`CombatRuntime\` does not exist.

- [ ] **Step 4: Implement minimal runtime**

Define:

\`\`\`ts
export interface RuntimeCombatTarget {
  id: string;
  getHp(): number;
  getArmor(): number;
  isInvulnerable(): boolean;
  applyDamage(amount: number): void;
}

export interface AttackWindowDefinition {
  ownerId: string;
  rawDamage: number;
  critChance: number;
  critDamage: number;
}
\`\`\`

Internally store \`Map<attackId, { definition, hitTargetIds: Set<string> }>\`. Add the target ID only after a successful non-invulnerable hit.

- [ ] **Step 5: Emit feedback events without owning visuals**

Return \`critical\` and \`finalDamage\` from \`tryHit\`; scenes/runtimes translate that result into \`CombatFeedback\` commands.

- [ ] **Step 6: Verify and commit**

\`\`\`bash
npm test -- combat-runtime.test.ts combat.test.ts combat-feedback.test.ts
npm test
git add src/game/runtime/runtimeTypes.ts src/game/runtime/CombatRuntime.ts tests/unit/combat-runtime.test.ts
git commit -m "feat: add deterministic runtime combat windows"
\`\`\`

---

### Task 5: PlayerRuntime — Real Movement, Combo, Dodge, Energy, and Skill Input

**Files:**
- Create: \`src/game/runtime/PlayerRuntime.ts\`
- Modify: \`src/game/player/PlayerCombatController.ts\`
- Modify: \`src/game/input/InputBindings.ts\`
- Test: \`tests/unit/player-runtime.test.ts\`
- Modify/Test: \`tests/integration/player-runtime.test.ts\`

**Interfaces:**
- Consumes: \`PlayerController\`, \`PlayerCombatController\`, \`CombatRuntime\`, \`GameplayControlState\`, \`DerivedCombatStats\`.
- Produces:
  - \`PlayerRuntime.update(input, dtMs): PlayerRuntimeFrame\`
  - \`PlayerRuntime.getCombatTarget(): RuntimeCombatTarget\`
  - \`PlayerRuntime.applyDerivedStats(stats): void\`
  - attack/skill events that scenes can render.

- [ ] **Step 1: Write failing input-gate and dodge tests**

\`\`\`ts
it('ignores movement and attack while gameplay input is disabled', () => {
  const runtime = makePlayerRuntime();
  runtime.setControls({ inputEnabled: false, paused: false });
  const frame = runtime.update(makeInput({ moveX: 1, basicAttackPressed: true }), 16);
  expect(frame.velocity).toEqual({ x: 0, y: 0 });
  expect(frame.attackStarted).toBe(false);
});

it('spends energy once and moves along the dodge direction', () => {
  const runtime = makePlayerRuntime();
  const first = runtime.update(makeInput({ moveX: 1, dodgePressed: true }), 16);
  const second = runtime.update(makeInput({ moveX: 1, dodgePressed: true }), 16);
  expect(first.dodgeStarted).toBe(true);
  expect(second.dodgeStarted).toBe(false);
  expect(runtime.snapshot.energy).toBe(70);
});
\`\`\`

- [ ] **Step 2: Verify RED**

\`\`\`bash
npm test -- player-runtime.test.ts
\`\`\`

Expected: FAIL because \`PlayerRuntime\` does not exist.

- [ ] **Step 3: Extend PlayerCombatController with explicit attack windows**

Add a minimal attack state:

\`\`\`ts
export interface BasicAttackRequest {
  accepted: boolean;
  comboStep: number;
  activeMs: number;
  recoveryMs: number;
  damageMultiplier: number;
}
\`\`\`

Use combo steps 1/2/3 with configurable multipliers \`1.0 / 1.0 / 1.35\`. Attack speed scales timing, not damage.

- [ ] **Step 4: Implement PlayerRuntime**

The runtime:
- zeroes movement/action requests when input is disabled;
- updates facing every enabled frame;
- asks \`PlayerCombatController\` for dodge/combo/skills;
- translates accepted attacks into \`CombatRuntime.beginAttack()\`;
- exposes active attack IDs and directional geometry for the Phaser adapter;
- syncs live HP/energy changes through callbacks supplied by scene/session integration;
- reads assigned skills from \`GameState.skills.equippedActiveSkillIds\`.

- [ ] **Step 5: Implement active skill runtime definitions for the slice**

Create a small table inside \`PlayerRuntime.ts\` or \`runtimeTypes.ts\` for current active IDs:
- \`shadow_dash\`: dash + attack window, energy 35;
- \`blade_fan\`: short ranged fan, energy 30;
- \`riposte\`: brief defensive/counter window, energy 25;
- \`flurry\`: multi-hit attack sequence, energy 40;
- \`poison_strike\`: melee hit with poison hook, energy 25;
- \`venom_trap\`: placed area hook, energy 35;
- \`smoke_bomb\`: utility hook, energy 30.

For this pass, visual sophistication may remain placeholder-level; the runtime action, cost, cooldown, and damage/status hook must be real.

- [ ] **Step 6: Verify PlayerRuntime integration**

Run:

\`\`\`bash
npm test -- player-runtime.test.ts tests/integration/player-runtime.test.ts energy-combo-dodge.test.ts
npm test
\`\`\`

Expected: all PASS.

- [ ] **Step 7: Commit**

\`\`\`bash
git add src/game/runtime/PlayerRuntime.ts src/game/player/PlayerCombatController.ts src/game/input/InputBindings.ts tests/unit/player-runtime.test.ts tests/integration/player-runtime.test.ts
git commit -m "feat: wire rogue controls into player runtime"
\`\`\`

---

### Task 6: EnemyRuntime — AI, Telegraphs, Movement, and Damage

**Files:**
- Create: \`src/game/runtime/EnemyRuntime.ts\`
- Modify: \`src/game/enemies/EnemyActor.ts\`
- Modify: \`src/game/enemies/EnemyController.ts\`
- Test: \`tests/unit/enemy-runtime.test.ts\`
- Modify/Test: \`tests/unit/enemy-brain.test.ts\`
- Test: \`tests/integration/runtime-combat-loop.test.ts\`

**Interfaces:**
- Consumes: \`EnemyDefinition\`, \`EnemyController\`, \`EnemyActor\`, \`CombatRuntime\`.
- Produces:
  - \`EnemyRuntime.update(observation, dtMs): EnemyRuntimeFrame\`
  - \`EnemyRuntime.getCombatTarget()\`
  - \`EnemyRuntime.isDead()\`
  - \`EnemyRuntime.consumeDeathEvent()\`.

- [ ] **Step 1: Write telegraph → attack → recovery runtime test**

\`\`\`ts
it('does not create a damaging window before telegraph completes', () => {
  const enemy = makeEnemyRuntime('bandit_melee');
  const close = { playerVisible: true, distance: 40, attackReady: true, hpRatio: 1 };

  const prepare = enemy.update(close, 16);
  expect(prepare.telegraph?.attackId).toBe('slash');
  expect(prepare.attackWindowId).toBeUndefined();

  enemy.update(close, 300);
  const attack = enemy.update(close, 1);
  expect(attack.attackWindowId).toBeDefined();

  enemy.update(close, 120);
  const recovery = enemy.update(close, 1);
  expect(recovery.recovering).toBe(true);
});
\`\`\`

- [ ] **Step 2: Verify RED**

\`\`\`bash
npm test -- enemy-runtime.test.ts
\`\`\`

Expected: FAIL because \`EnemyRuntime\` does not exist.

- [ ] **Step 3: Implement intent execution**

Map intents:
- \`moveToward\` -> velocity toward player;
- \`moveAway\` -> velocity away;
- \`strafe\` -> perpendicular velocity with deterministic sign;
- \`prepareAttack\` -> telegraph frame, no damage;
- \`attack\` -> create/maintain one combat window for selected attack;
- \`recover\` -> no damage window and no immediate new attack.

Use \`definition.moveSpeed\` and existing attack damage/range values.

- [ ] **Step 4: Add distinct-archtype assertions**

Test that archer preferred range exceeds melee, heavy speed is lower, cutthroat flank intent is non-zero, and trapper can retreat according to its definition. These assertions protect content/runtime mapping rather than re-testing the domain AI itself.

- [ ] **Step 5: Add player-vs-enemy integration test**

In \`runtime-combat-loop.test.ts\`, construct a PlayerRuntime + EnemyRuntime + shared CombatRuntime and prove:
- player attack reduces enemy HP;
- duplicate overlap callback does not double damage;
- enemy telegraph does not damage;
- enemy active window damages player once;
- active dodge i-frame rejects enemy damage.

- [ ] **Step 6: Verify and commit**

\`\`\`bash
npm test -- enemy-runtime.test.ts enemy-brain.test.ts tests/integration/runtime-combat-loop.test.ts
npm test
git add src/game/runtime/EnemyRuntime.ts src/game/enemies/EnemyActor.ts src/game/enemies/EnemyController.ts tests/unit/enemy-runtime.test.ts tests/unit/enemy-brain.test.ts tests/integration/runtime-combat-loop.test.ts
git commit -m "feat: execute enemy AI in live combat runtime"
\`\`\`

---

### Task 7: LootRuntime and Enemy Death Drops

**Files:**
- Create: \`src/game/runtime/LootRuntime.ts\`
- Modify: \`src/game/world/WorldPickup.ts\`
- Modify: \`src/game/GameSession.ts\`
- Test: \`tests/unit/loot-runtime.test.ts\`
- Modify/Test: \`tests/unit/items-inventory-equipment.test.ts\`

**Interfaces:**
- Consumes: loot tables, deterministic RNG, canonical serialized inventory insertion.
- Produces:
  - \`LootRuntime.spawnDrop(drop): RuntimeWorldPickup\`
  - \`LootRuntime.tryInteract(playerPosition): LootInteractionResult\`
  - pickup remains until complete transfer.

- [ ] **Step 1: Write full-inventory runtime test**

\`\`\`ts
it('keeps the pickup alive when inventory cannot accept it', () => {
  const runtime = makeLootRuntime({ capacity: 1, filled: true });
  const pickup = runtime.spawnDrop(makeSteelDaggerDrop({ x: 10, y: 10 }));
  const result = runtime.tryInteract({ x: 10, y: 10 });
  expect(result.collected).toBe(false);
  expect(pickup.collected).toBe(false);
  expect(runtime.activePickups()).toHaveLength(1);
});
\`\`\`

- [ ] **Step 2: Write range/manual-interact test**

\`\`\`ts
it('does not collect without interaction range', () => {
  const runtime = makeLootRuntime({ capacity: 20, filled: false });
  runtime.spawnDrop(makeSteelDaggerDrop({ x: 500, y: 500 }));
  expect(runtime.tryInteract({ x: 0, y: 0 }).collected).toBe(false);
});
\`\`\`

- [ ] **Step 3: Verify RED and implement**

Run:

\`\`\`bash
npm test -- loot-runtime.test.ts
\`\`\`

Expected: FAIL because \`LootRuntime\` does not exist.

Implement an injected \`getInventory/setInventory\` boundary and an interaction radius. \`WorldPickup.tryCollect()\` must call the canonical insertion path or receive a canonical insertion callback; it must not maintain a second rule set.

- [ ] **Step 4: Connect enemy death to loot-table selection**

Add a pure helper:

\`\`\`ts
export function createEnemyDrop(
  enemyDefinitionId: string,
  level: number,
  rng: RandomSource,
  content: ContentRegistry,
): SerializableItemStack | null;
\`\`\`

Map enemy IDs to existing loot tables. Generate stable runtime instance IDs from injected ID source, never \`Math.random()\`.

- [ ] **Step 5: Verify and commit**

\`\`\`bash
npm test -- loot-runtime.test.ts items-inventory-equipment.test.ts
npm test
git add src/game/runtime/LootRuntime.ts src/game/world/WorldPickup.ts src/game/GameSession.ts tests/unit/loot-runtime.test.ts tests/unit/items-inventory-equipment.test.ts
git commit -m "feat: drop and collect world loot through runtime"
\`\`\`

---

### Task 8: Integrate Real Runtime into Forest and Hideout Scenes

**Files:**
- Modify: \`src/game/scenes/ForestScene.ts\`
- Modify: \`src/game/scenes/HideoutScene.ts\`
- Modify: \`src/game/world/DungeonAssembler.ts\`
- Create: \`src/game/runtime/SceneRuntimeHost.ts\`
- Test: \`tests/integration/dungeon-runtime.test.ts\`
- Test: \`tests/integration/scene-runtime-lifecycle.test.ts\`

**Interfaces:**
- Consumes: PlayerRuntime, EnemyRuntime, LootRuntime, CombatRuntime, GameplayControlState, DungeonAssembler.
- Produces: \`SceneRuntimeHost\` that owns subscriptions/runtime objects and disposes all listeners on scene shutdown.

- [ ] **Step 1: Write listener lifecycle test**

\`\`\`ts
it('disposes runtime listeners exactly once across repeated scene mounts', () => {
  const controls = new GameplayControlState();
  const first = new SceneRuntimeHost(controls);
  const firstSpy = vi.fn();
  first.onFrame(firstSpy);
  first.dispose();

  const second = new SceneRuntimeHost(controls);
  const secondSpy = vi.fn();
  second.onFrame(secondSpy);
  second.tick(16);

  expect(firstSpy).not.toHaveBeenCalled();
  expect(secondSpy).toHaveBeenCalledTimes(1);
  second.dispose();
});
\`\`\`

- [ ] **Step 2: Verify RED and implement SceneRuntimeHost**

It must own:
- player runtime;
- enemy runtimes;
- loot runtime;
- combat runtime;
- unsubscribe callbacks;
- scene-shutdown cleanup.

No singleton Phaser runtime objects.

- [ ] **Step 3: Upgrade DungeonAssembler output**

Add encounter placement metadata:

\`\`\`ts
export interface AssembledRoomPlacement {
  definitionId: string;
  x: number;
  y: number;
  variant: number;
  encounterIds: string[];
  trapIds: string[];
}
\`\`\`

Resolve metadata from \`dungeonRoomDefinitions\` by definition ID.

- [ ] **Step 4: Add deterministic dungeon runtime test**

\`\`\`ts
it('assembles identical encounter placements for the same generated dungeon', () => {
  const generatedA = generateDungeon(1234, dungeonRoomDefinitions);
  const generatedB = generateDungeon(1234, dungeonRoomDefinitions);
  expect(generatedA).toEqual(generatedB);
  if (!generatedA.ok || !generatedB.ok) throw new Error('generation failed');
  expect(new DungeonAssembler(dungeonRoomDefinitions).assemble(generatedA.dungeon))
    .toEqual(new DungeonAssembler(dungeonRoomDefinitions).assemble(generatedB.dungeon));
});
\`\`\`

- [ ] **Step 5: Replace ForestScene placeholder movement**

ForestScene must:
- create PlayerRuntime from current derived stats;
- create runtime enemies from the existing five definitions;
- update runtime with actual Phaser keyboard/pointer input;
- create visual telegraphs from runtime frames;
- perform overlap/contact queries and call \`CombatRuntime.tryHit\`;
- spawn loot on enemy death;
- process E interaction through LootRuntime;
- update Phaser positions from runtime state;
- allow hideout transition only through normal interaction gate.

- [ ] **Step 6: Replace HideoutScene text-only room list**

HideoutScene must:
- assemble generated rooms;
- place room representations and encounter spawn points;
- run the same Player/Enemy/Loot runtime stack;
- unlock boss transition when required encounters in the path are cleared.

- [ ] **Step 7: Verify scene integration and commit**

\`\`\`bash
npm test -- tests/integration/dungeon-runtime.test.ts tests/integration/scene-runtime-lifecycle.test.ts tests/integration/runtime-combat-loop.test.ts
npm test
npm run typecheck
git add src/game/scenes/ForestScene.ts src/game/scenes/HideoutScene.ts src/game/world/DungeonAssembler.ts src/game/runtime/SceneRuntimeHost.ts tests/integration/dungeon-runtime.test.ts tests/integration/scene-runtime-lifecycle.test.ts
git commit -m "feat: run real combat and loot in forest and hideout"
\`\`\`

---

### Task 9: BossRuntime and Real Bandit Leader Fight

**Files:**
- Create: \`src/game/runtime/BossRuntime.ts\`
- Modify: \`src/game/scenes/BossScene.ts\`
- Modify: \`src/domain/ai/bossBrain.ts\` only if a missing state-transition primitive is required.
- Test: \`tests/unit/boss-runtime.test.ts\`
- Modify/Test: \`tests/unit/boss-brain.test.ts\`

**Interfaces:**
- Consumes: boss brain move selection, CombatRuntime, PlayerRuntime target contract, fixed leader definition.
- Produces:
  - \`BossRuntime.update(playerObservation, dtMs): BossRuntimeFrame\`
  - explicit telegraph/active/recovery phases;
  - one-time victory result.

- [ ] **Step 1: Write phase-integrity test**

\`\`\`ts
it('changes phase behavior without changing max hp or armor', () => {
  const boss = makeBossRuntime();
  const initial = boss.snapshot;
  boss.setHp(Math.floor(initial.maxHp * 0.59));
  expect(boss.snapshot.phase).toBe('phase2');
  expect(boss.snapshot.maxHp).toBe(initial.maxHp);
  expect(boss.snapshot.armor).toBe(initial.armor);

  boss.setHp(Math.floor(initial.maxHp * 0.24));
  expect(boss.snapshot.phase).toBe('finalPressure');
  expect(boss.snapshot.maxHp).toBe(initial.maxHp);
  expect(boss.snapshot.armor).toBe(initial.armor);
});
\`\`\`

- [ ] **Step 2: Write boss action-state test**

\`\`\`ts
it('telegraphs before opening a damaging move window and recovers afterward', () => {
  const boss = makeBossRuntime();
  const first = boss.update({ distance: 60 }, 16);
  expect(first.telegraph).toBeDefined();
  expect(first.attackWindowId).toBeUndefined();

  advanceUntilAttack(boss);
  expect(boss.frame.attackWindowId).toBeDefined();

  advanceUntilRecovery(boss);
  expect(boss.frame.recovering).toBe(true);
});
\`\`\`

- [ ] **Step 3: Verify RED and implement BossRuntime**

Use \`stepBanditLeaderBrain\` for move selection, then runtime-local timing for \`telegraphMs/activeMs/recoveryMs\` from the chosen move definition. Damage windows go through CombatRuntime.

- [ ] **Step 4: Add one-time victory test**

\`\`\`ts
it('resolves victory only once', () => {
  const boss = makeBossRuntime();
  boss.setHp(0);
  expect(boss.consumeVictory().resolved).toBe(true);
  expect(boss.consumeVictory().resolved).toBe(false);
});
\`\`\`

On first resolution, the scene/session integration must:
- update quest;
- spawn boss loot;
- autosave;
- unlock exit.

- [ ] **Step 5: Replace click-to-damage BossScene**

Delete \`boss.on('pointerdown', () => this.hitBoss())\` and the hard-coded 45-damage path. BossScene must use the same PlayerRuntime controls as the other combat scenes and drive BossRuntime in \`update()\`.

- [ ] **Step 6: Verify and commit**

\`\`\`bash
npm test -- boss-runtime.test.ts boss-brain.test.ts tests/integration/runtime-combat-loop.test.ts
npm test
npm run typecheck
git add src/game/runtime/BossRuntime.ts src/game/scenes/BossScene.ts src/domain/ai/bossBrain.ts tests/unit/boss-runtime.test.ts tests/unit/boss-brain.test.ts
git commit -m "feat: replace click boss with runtime boss combat"
\`\`\`

---

### Task 10: Correct Equipment and Skill UI Wiring

**Files:**
- Modify: \`src/ui/inventory/InventoryPanel.tsx\`
- Modify: \`src/ui/equipment/EquipmentPanel.tsx\`
- Modify: \`src/ui/skills/SkillTreePanel.tsx\`
- Modify: \`src/ui/inventory/ItemTooltip.tsx\`
- Test: \`tests/unit/ui-inventory.test.tsx\`
- Create/Test: \`tests/unit/ui-skills.test.tsx\`

**Interfaces:**
- Consumes: item definitions, assigned skill slots, bridge commands.
- Produces no new domain rules; UI dispatches validated intent only.

- [ ] **Step 1: Add failing equipment-slot UI test**

\`\`\`tsx
it('dispatches the item declared equipment slot instead of hardcoding weapon', () => {
  seedInventoryWith('shadow_cowl', 'cowl-1');
  const spy = vi.fn();
  const off = gameBridge.onCommand(spy);

  render(<InventoryPanel open onClose={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /shadow_cowl/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Equip' }));

  expect(spy).toHaveBeenCalledWith({
    type: 'EQUIP_ITEM',
    itemId: 'cowl-1',
    slot: 'head',
  });
  off();
});
\`\`\`

- [ ] **Step 2: Verify RED and fix InventoryPanel**

Resolve the selected item's definition from the content registry and only render Equip for gear with an \`equipSlot\`. Dispatch that exact slot.

- [ ] **Step 3: Add failing active-slot UI test**

\`\`\`tsx
it('assigns a learned active skill to a selected hotbar slot', () => {
  seedLearnedSkill('assassin_shadow_dash');
  const spy = vi.fn();
  const off = gameBridge.onCommand(spy);

  render(<SkillTreePanel open />);
  fireEvent.click(screen.getByRole('button', { name: /shadow_dash/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Slot 1' }));

  expect(spy).toHaveBeenCalledWith({
    type: 'ASSIGN_ACTIVE_SKILL',
    activeSkillId: 'shadow_dash',
    slotIndex: 0,
  });
  off();
});
\`\`\`

- [ ] **Step 4: Implement four active-slot controls**

Show current \`equippedActiveSkillIds\` and allow assignment only for learned active nodes. Keep domain validation authoritative.

- [ ] **Step 5: Verify pause UI state**

Add Testing Library coverage that PauseMenu toggling calls the shared gameplay control state through App integration; no direct Phaser dependency is needed in this test.

- [ ] **Step 6: Verify and commit**

\`\`\`bash
npm test -- ui-inventory.test.tsx ui-skills.test.tsx gameplay-control-state.test.ts
npm test
git add src/ui/inventory/InventoryPanel.tsx src/ui/equipment/EquipmentPanel.tsx src/ui/skills/SkillTreePanel.tsx src/ui/inventory/ItemTooltip.tsx tests/unit/ui-inventory.test.tsx tests/unit/ui-skills.test.tsx
git commit -m "fix: wire equipment slots and active skill hotbar"
\`\`\`

---

### Task 11: Replace Shortcut E2E with Real Runtime Acceptance Flow

**Files:**
- Modify: \`tests/e2e/vertical-slice.spec.ts\`
- Modify: \`src/ui/test/TestFlowPanel.tsx\`
- Modify: \`src/app/App.tsx\`
- Modify: \`playwright.config.ts\`
- Modify: runtime test-mode configuration files created in Tasks 5–9.
- Test: \`tests/e2e/vertical-slice.spec.ts\`

**Interfaces:**
- Consumes: actual Phaser canvas input, React quest/inventory/skill UI, deterministic test-mode timing/RNG.
- Produces: acceptance proof that the integrated runtime is playable.

- [ ] **Step 1: Remove progression shortcuts**

Delete or reduce TestFlowPanel so it cannot call:
- \`completeForestEncounter()\`;
- \`grantLoot()\`;
- \`markBanditLeaderDefeated()\`;
- direct quest milestones;
- direct boss kill.

If a diagnostics panel remains, it may display seed/screen/runtime state only.

- [ ] **Step 2: Add deterministic test-mode configuration**

Expose a read-only config:

\`\`\`ts
export interface RuntimeTuning {
  rngSeed: number;
  enemyHpMultiplier: number;
  timingMultiplier: number;
}

export const TEST_RUNTIME_TUNING: RuntimeTuning = {
  rngSeed: 424242,
  enemyHpMultiplier: 0.25,
  timingMultiplier: 0.35,
};
\`\`\`

Production defaults remain \`1.0\` multipliers. Test mode must not skip gameplay transitions.

- [ ] **Step 3: Rewrite the primary Playwright test**

The test must use normal controls. Its structure:

\`\`\`ts
test('vertical slice completes through real runtime input and persists', async ({ page }) => {
  await page.goto('/?testMode=1');

  await page.getByRole('button', { name: 'Accept' }).click();

  await page.keyboard.press('KeyE'); // leave outpost through scene interaction

  await page.keyboard.down('KeyD');
  await page.waitForTimeout(350);
  await page.keyboard.up('KeyD');

  // Fight a real enemy using actual attack input.
  for (let i = 0; i < 6; i += 1) {
    await page.mouse.click(640, 360);
    await page.waitForTimeout(120);
  }

  // Exercise dodge through real input.
  await page.keyboard.press('Space');

  // Move to/interact with a real dropped world pickup.
  await page.keyboard.press('KeyE');

  await page.keyboard.press('KeyI');
  await page.getByRole('button', { name: /steel_dagger/i }).click();
  await page.getByRole('button', { name: 'Equip' }).click();
  await page.getByRole('button', { name: 'Close' }).click();

  // Continue through real hideout/boss interaction gates.
  await reachHideoutThroughInput(page);
  await defeatBossThroughCombatInput(page);
  await returnToOutpostThroughInput(page);

  await page.getByRole('button', { name: 'Turn in' }).click();
  await page.getByRole('button', { name: 'Save game' }).click();
  await page.reload();

  await expect(page.getByText('Status: completed')).toBeVisible();
  await expect(page.getByText(/steel_dagger/i)).toBeVisible();
});
\`\`\`

Implement \`reachHideoutThroughInput\`, \`defeatBossThroughCombatInput\`, and \`returnToOutpostThroughInput\` as test helpers that use keyboard/mouse only; they must not evaluate page-side session methods.

- [ ] **Step 4: Add an anti-bypass assertion**

Before gameplay, assert the page has no buttons named:
- \`Defeat encounter\`;
- \`Pick up test loot\`;
- \`Defeat boss\`.

\`\`\`ts
await expect(page.getByRole('button', { name: 'Defeat boss' })).toHaveCount(0);
\`\`\`

- [ ] **Step 5: Preserve repeated-transition/listener coverage**

Rewrite the second E2E to traverse scene gates normally and assert one inventory item/one quest update rather than calling TestFlowPanel transitions.

- [ ] **Step 6: Run E2E and full verification**

\`\`\`bash
npm run typecheck
npm test
npm run build
npm run test:e2e
\`\`\`

Expected: all PASS.

- [ ] **Step 7: Commit**

\`\`\`bash
git add tests/e2e/vertical-slice.spec.ts src/ui/test/TestFlowPanel.tsx src/app/App.tsx playwright.config.ts src/game/runtime
git commit -m "test: validate vertical slice through real gameplay"
\`\`\`

---

### Task 12: Final Integration Gate, Review-Focus Regressions, and PR Cleanup

**Files:**
- Modify tests only where a missing review-focus regression is discovered.
- Modify: \`README.md\`
- Modify: \`docs/superpowers/specs/2026-09-19-runtime-integration-design.md\` only if implementation revealed a spec correction that must be recorded before merge.
- No feature expansion.

**Interfaces:**
- Consumes: completed Tasks 1–11.
- Produces: merge-ready PR head with all review blockers demonstrably addressed.

- [ ] **Step 1: Add explicit regression for overlapping attack+dodge input**

If not already covered by Task 5, add:

\`\`\`ts
it('does not start an attack on the same frame an accepted dodge begins', () => {
  const runtime = makePlayerRuntime();
  const frame = runtime.update(makeInput({ dodgePressed: true, basicAttackPressed: true }), 16);
  expect(frame.dodgeStarted).toBe(true);
  expect(frame.attackStarted).toBe(false);
});
\`\`\`

- [ ] **Step 2: Add explicit stale-reference derived-stat regression**

\`\`\`ts
it('stale equipment and unknown skills never contribute derived stats', () => {
  const state = createInitialGameState();
  state.equipment.weapon = 'gone';
  state.skills.learned.removed_skill = 99;
  const stats = deriveCombatStats(state, buildContentRegistry());
  expect(stats.attackPower).toBe(ROGUE_BASE_STATS.attackPower);
});
\`\`\`

- [ ] **Step 3: Add boss no-inflation regression**

\`\`\`ts
it('all boss phases retain the authored hp and armor values', () => {
  const boss = makeBossRuntime();
  const authored = { maxHp: boss.snapshot.maxHp, armor: boss.snapshot.armor };
  for (const ratio of [1, 0.59, 0.24]) {
    boss.setHp(Math.floor(authored.maxHp * ratio));
    expect({ maxHp: boss.snapshot.maxHp, armor: boss.snapshot.armor }).toEqual(authored);
  }
});
\`\`\`

- [ ] **Step 4: Run all four completion gates fresh**

\`\`\`bash
npm run typecheck
npm test
npm run build
npm run test:e2e
\`\`\`

Expected: all commands exit 0.

- [ ] **Step 5: Update README to describe real controls and test-mode limits**

Document:
- actual combat controls;
- skill assignment;
- manual loot interaction;
- test mode is deterministic/accelerated but contains no direct progression shortcuts;
- verification commands.

- [ ] **Step 6: Commit final integration verification**

\`\`\`bash
git add README.md tests src
git commit -m "chore: close runtime integration review blockers"
\`\`\`

- [ ] **Step 7: Push the updated \`vertical-slice\` branch and wait for GitHub Actions**

Expected GitHub Actions steps:
- Install dependencies;
- Install Playwright Chromium;
- Typecheck;
- Unit tests;
- Production build;
- End-to-end tests.

Do not merge while any step is red.

- [ ] **Step 8: Perform final PR code review against the original blockers**

The reviewer must explicitly answer:
- Does Playwright traverse real runtime rather than direct session mutations?
- Do Forest/Hideout/Boss scenes actually use player/enemy/combat/loot runtimes?
- Do equipment and passive skills affect derived runtime stats?
- Can active skills be assigned and invoked via 1–4?
- Does pause suppress input/simulation?
- Are stale skill/equipment save references sanitized?
- Can one overlap callback damage a target more than once per attack window?
- Does boss phase change avoid HP/armor inflation?

Any Critical or Important finding blocks merge.
