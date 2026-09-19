# Runtime Integration Pass Design

**Date:** 2026-09-19  
**Repository:** `vovaniktov-maker/fantasy-rpg`  
**Branch:** `vertical-slice`  
**Parent spec:** `docs/superpowers/specs/2026-09-19-fantasy-action-rpg-vertical-slice-design.md`  
**Target PR:** #1 — `vertical-slice -> main`

## 1. Purpose

Convert the current technical vertical slice into a genuinely playable action-RPG slice by wiring the existing deterministic domain systems into the actual Phaser runtime.

The existing code already contains useful domain logic for combat state, inventory, equipment, progression, saves, AI, loot, dungeon generation, quests, economy, and boss phases. The problem identified in final review is integration: the real Phaser scenes currently bypass or omit many of those systems, while the Playwright acceptance test completes the game through test-only session shortcuts.

This pass must make the real runtime the source of truth for gameplay validation.

## 2. Success Criteria

The pass is complete when a player can use normal keyboard and mouse controls to:

1. move the Rogue with WASD and aim independently with the mouse;
2. execute a real basic combo;
3. dodge using energy and temporary invulnerability;
4. use learned active skills from slots 1–4;
5. fight enemies driven by the existing AI state machine;
6. take and deal damage through hitbox/hurtbox rules;
7. kill enemies and receive world loot;
8. manually pick up loot with the interaction key;
9. fail pickup without losing the item when inventory is full;
10. equip gear into its actual equipment slot;
11. have equipment and passive skills affect derived combat stats;
12. enter and clear the Bandit Hideout using real runtime encounters;
13. fight the Bandit Leader through its real boss behavior and phases;
14. pause gameplay so simulation/input actually stop;
15. save, reload, and preserve valid progression/equipment;
16. complete the Playwright acceptance flow through normal game input/UI rather than direct `GameSession` test buttons.

## 3. Non-Goals

This pass does not add:

- new playable classes;
- multiplayer;
- mobile/touch controls;
- gamepad support;
- backend services or cloud saves;
- a full ECS rewrite;
- final art production;
- large-scale content expansion;
- complex pathfinding/navmesh;
- new narrative systems beyond the current contract quest.

The pass is an integration and correctness milestone, not a content expansion milestone.

## 4. Architectural Direction

Use a dedicated runtime adapter layer between Phaser scenes and pure domain logic.

Phaser scenes remain responsible for:

- map/world setup;
- scene transitions;
- spawning runtime entities;
- camera;
- input capture;
- visual effects;
- animation;
- collision primitives;
- rendering.

Pure TypeScript domain modules remain responsible for:

- damage math;
- energy;
- combo state;
- dodge/i-frames;
- status effects;
- item generation;
- inventory rules;
- equipment compatibility;
- progression;
- skills;
- economy;
- quests;
- saves;
- AI decisions;
- dungeon generation;
- boss phase/move selection.

Runtime adapters translate between the two.

### 4.1 Runtime Layer

Add focused runtime units:

- `PlayerRuntime`
- `EnemyRuntime`
- `CombatRuntime`
- `LootRuntime`
- `DerivedStatsService`
- `GameplayPauseController`

These units must be small, isolated, and independently testable.

### 4.2 Scene Responsibilities

`ForestScene`, `HideoutScene`, and `BossScene` must not contain combat math.

They may:

- create runtime objects;
- feed input/observations into runtimes;
- update visual positions;
- subscribe to runtime events;
- perform scene transitions.

They must not directly implement damage formulas, energy spending, inventory insertion, skill validation, or boss move selection.

## 5. Player Runtime

`PlayerRuntime` owns the live Rogue actor for a scene.

It consumes:

- Phaser input state;
- pointer world coordinates;
- current derived stats;
- learned/equipped skills;
- frame delta.

It delegates to:

- `PlayerController` for movement and facing;
- `PlayerCombatController` for combo, dodge, energy, and skill gating;
- `CombatRuntime` for attack windows and outgoing hit events.

### 5.1 Controls

- WASD — movement;
- mouse — aim/facing;
- LMB — basic attack combo;
- RMB — secondary action;
- 1–4 — active skill slots;
- Space — dodge;
- E — interaction/manual loot pickup.

### 5.2 Dodge

Dodge must:

- spend energy once;
- reject overlapping dodge requests;
- grant only the configured i-frame window;
- expire invulnerability deterministically;
- never allow permanent invulnerability from overlapping input;
- move the player using runtime movement rather than teleporting state.

### 5.3 Basic Combo

The three-hit combo must:

- use the existing combo state machine;
- reset after timeout;
- reject attacks while dodge is active;
- expose attack-window timing to `CombatRuntime`;
- apply the final hit's stronger impact/stagger rule from configured combat data.

## 6. Derived Combat Stats

Introduce one canonical derived-stat calculation path.

```
base class stats
+ equipped item modifiers
+ learned passive skill modifiers
+ keystone transformations
= derived combat stats
```

No Phaser scene may calculate stats independently.

`DerivedStatsService` consumes the serializable `GameState` plus content registry and returns a typed derived combat snapshot.

At minimum, runtime must use:

- HP/max HP;
- Energy/max Energy;
- Attack Power;
- Critical Chance;
- Critical Damage;
- Armor;
- Move Speed;
- Attack Speed;
- Cooldown Reduction;
- Dodge Distance.

Equipment and passive skills must therefore produce observable differences in real runtime behavior.

## 7. Equipment Integration

The current equipment model stores equipped instance IDs. This remains acceptable for the slice only if references are validated and resolved through a single service.

Requirements:

- UI equips an item into its declared slot, never hardcoded `weapon`;
- equipping incompatible items must fail without mutation;
- replacing an equipped item must produce a valid displaced-item outcome;
- stale equipment references must be removed during save sanitation;
- derived stats resolve equipped instance IDs against known serialized item data;
- no equipment effect is applied if the referenced instance cannot be resolved safely.

The UI must support:

- weapon;
- offhand;
- head;
- body;
- gloves;
- boots;
- amulet;
- ring1;
- ring2.

## 8. Active Skills

Active skills are still unlocked only through the skill tree.

Add explicit assignment commands for slots 1–4.

Requirements:

- only learned active skills can be assigned;
- passive/keystone nodes cannot be placed in active slots;
- assigning one skill does not duplicate it into multiple slots unless explicitly allowed by content rules; for this slice, duplicates are rejected;
- respec clears active assignments that are no longer valid;
- `PlayerCombatController.requestSkill(slotIndex)` is driven by the current assigned slots from game state;
- scene input 1–4 calls the real runtime action, not a UI-only state transition.

## 9. Combat Runtime

`CombatRuntime` owns live attack windows and contact resolution.

Responsibilities:

- spawn/activate hit regions for melee attacks;
- resolve target contact once per attack window;
- call deterministic damage resolution;
- respect player dodge i-frames;
- emit combat events for hit flash, shake, particles, trails, and sound hooks;
- apply death transitions;
- keep visual feedback separate from damage math.

No combat event may apply damage twice because of multiple overlap callbacks in the same attack window.

## 10. Enemy Runtime

`EnemyRuntime` combines:

- `EnemyActor`;
- `EnemyController`;
- Phaser position/visual state;
- attack telegraph visuals;
- `CombatRuntime`.

Each enemy repeatedly:

1. observes player visibility, distance, readiness, and HP ratio;
2. passes observation into `EnemyController`;
3. executes the resulting intent;
4. advances elapsed AI state time;
5. telegraphs before every damaging attack;
6. enters recovery before choosing another damaging action.

The five existing enemy archetypes must become behaviorally distinct in live play:

- guard/melee;
- cutthroat;
- archer;
- heavy;
- trapper.

No enemy may deal unavoidable immediate damage on first contact without a valid telegraph.

## 11. Loot Runtime

Enemy death may produce loot based on the existing data-driven loot tables.

`LootRuntime` creates a world pickup entity that:

- remains visible until successfully collected or scene context is intentionally discarded;
- requires the player to be within interaction range;
- requires the interaction key;
- delegates insertion to the canonical inventory domain function;
- stays in the world when inventory cannot accept the entire item;
- emits one pickup event only after a complete successful transfer.

Remove duplicate item-insertion rules from `GameSession`; all inventory insertion must go through one canonical domain path.

## 12. Dungeon Runtime

The semi-procedural Bandit Hideout continues to use deterministic room generation.

`DungeonAssembler` becomes responsible for turning generated room definitions into real runtime room placements and encounter spawn metadata.

Requirements:

- same seed yields the same generated layout/encounter configuration;
- a new repeat run receives a new seed;
- persistent character progression is unchanged by generating a new dungeon seed;
- invalid generation must fail before entering an unusable runtime state;
- runtime room transitions must not duplicate scene/input listeners.

## 13. Boss Runtime

The Bandit Leader must stop using click-to-damage gameplay.

Add `BossRuntime` or specialize `EnemyRuntime` so the boss uses:

- `getBossPhase()`;
- `getBanditLeaderMovePool()`;
- `stepBanditLeaderBrain()`;
- attack telegraphs;
- action/recovery windows;
- real hitboxes;
- player damage;
- real player attacks.

Phase thresholds remain:

- Phase 1: HP >= 60%;
- Phase 2: 25% <= HP < 60%;
- Final pressure: HP < 25%.

Phase changes alter move pool/cadence/behavior only.

They must not secretly inflate max HP or armor.

Boss victory must:

- resolve only once;
- update the quest;
- generate boss loot;
- unlock return/exit flow;
- autosave the major milestone.

## 14. Pause and UI Input Ownership

React modal state must control the actual gameplay runtime.

When inventory, skills, merchant, or pause menu owns input:

- movement input is suppressed;
- attack/dodge/skill input is suppressed;
- pause menu additionally pauses gameplay simulation;
- closing the modal restores input cleanly;
- repeated open/close cycles must not duplicate listeners.

A DOM attribute alone is not sufficient. The Phaser/runtime input system must consume a real shared input-enabled/pause state.

## 15. Save Sanitation and Migration

Extend save loading sanitation.

Unknown/stale references must be handled without crashing:

- unknown inventory item IDs -> remove/fallback according to existing item sanitation;
- unknown learned skill IDs -> remove;
- learned ranks above current max rank -> clamp;
- invalid active skill slot IDs -> clear;
- stale equipment instance references -> clear;
- impossible equipment slot/reference combinations -> clear;
- unsupported future save versions -> reject primary and try backup;
- malformed primary -> try backup;
- malformed backup -> fresh state.

Sanitation must not create phantom spent skill points, respec costs, or derived stats.

## 16. Testing Strategy

### 16.1 Unit Tests

Add or extend tests for:

- derived stat calculation;
- equipment reference resolution;
- correct equipment slot dispatch;
- active skill assignment;
- duplicate active skill rejection;
- stale skill/equipment sanitation;
- canonical inventory insertion;
- one-hit-per-attack-window behavior;
- pause/input suppression state;
- enemy runtime telegraph/attack/recovery sequencing;
- boss phase runtime sequencing.

### 16.2 Integration Tests

Add integration tests covering:

- PlayerRuntime + PlayerCombatController + CombatRuntime;
- EnemyRuntime receiving observations and producing damage windows;
- enemy death -> LootRuntime -> inventory;
- equipment/passives changing live derived stats;
- pause state preventing runtime actions;
- repeated scene/runtime mount/unmount without duplicate listeners.

### 16.3 Playwright Acceptance

Remove direct progression shortcuts as the primary acceptance path.

The main Playwright acceptance test must complete the slice using normal inputs/UI:

1. accept the quest via UI;
2. enter the forest through normal interaction;
3. move using WASD;
4. fight at least one real enemy;
5. dodge at least one telegraphed attack;
6. collect dropped loot with E;
7. open inventory and equip the loot;
8. enter the hideout;
9. reach and defeat the real boss;
10. return to outpost;
11. turn in the quest;
12. save;
13. reload;
14. verify quest/progression/equipment persistence.

Test mode may provide only:

- deterministic seeds;
- shorter cooldowns/animation timings;
- deterministic RNG;
- reduced enemy HP where needed for test duration.

Test mode may not provide:

- “defeat encounter” buttons;
- direct boss-kill commands;
- direct loot grant commands;
- direct quest milestone mutation.

## 17. Error Handling

Runtime systems must fail safely:

- invalid content at boot -> explicit validation failure;
- missing item/skill definition during runtime -> reject action and log a targeted error;
- full inventory -> pickup remains in world;
- invalid equip request -> no mutation;
- invalid skill assignment -> no mutation;
- missing dungeon room config -> block dungeon entry with explicit error;
- stale save reference -> sanitize rather than crash.

Production gameplay should never continue with silently corrupted core state.

## 18. Review-Focus Conditions

The implementation plan must explicitly test these high-risk conditions:

1. full inventory during manual pickup;
2. overlapping attack/dodge inputs;
3. pause/modal input leakage;
4. repeated scene transitions causing duplicate listeners;
5. stale equipment/skill references after content changes;
6. one attack overlap triggering multiple damage applications;
7. Playwright accidentally bypassing runtime through test-only state mutation;
8. boss phase transitions changing HP/armor unexpectedly.

## 19. Completion Gate

This pass is complete only when all of the following are true:

- `npm run typecheck` passes;
- `npm test` passes;
- `npm run build` passes;
- `npm run test:e2e` passes;
- Playwright uses real game input/runtime for its primary acceptance flow;
- the final review no longer finds the blockers recorded on PR #1;
- GitHub Actions is green on the updated PR head.

The PR must not be merged merely because domain tests are green.
