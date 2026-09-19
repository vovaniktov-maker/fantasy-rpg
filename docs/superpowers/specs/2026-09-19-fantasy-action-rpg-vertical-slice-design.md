# Fantasy Action RPG — Vertical Slice Design Specification

**Date:** 2026-09-19  
**Status:** Approved by user  
**Target:** Commercial-quality foundation, first playable vertical slice  

## 1. Product Vision

Build a single-player top-down fantasy action RPG for desktop browsers. The game is combat- and loot-driven, with responsive manual control, class-based character progression, deep buildcraft, repeatable dungeons, and a persistent character/world structure.

The first playable release is a polished vertical slice rather than a throwaway prototype. Its purpose is to validate the feel of combat, loot progression, character builds, enemy encounters, dungeon replayability, and the technical architecture needed for a larger commercial game.

The design prioritizes:

- responsive action combat over passive stat checks;
- meaningful loot and build progression;
- readable enemy attacks and player skill expression;
- modular systems that can grow without rewriting the game core;
- a compact first release with enough content to feel like a real RPG.

## 2. Target Platform and Controls

Primary platform: desktop browser.

Primary input: keyboard and mouse only for the first vertical slice.

Default controls:

- `WASD` — character movement;
- mouse — independent facing/aim direction;
- left mouse button — basic attack/combo;
- right mouse button — secondary combat action;
- `1–4` — active skills;
- `Space` — dodge;
- interaction key — manually pick up loot and interact with objects/NPCs.

There is no requirement to support mobile or gamepad in the first slice.

## 3. Technology and Architecture

Chosen stack:

- Phaser 4 for the real-time game world;
- TypeScript for game and UI code;
- Vite for development/build tooling;
- React for complex UI surfaces.

Phaser owns:

- world rendering;
- player and enemy entities;
- movement;
- collision;
- combat simulation;
- projectiles;
- hitboxes/hurtboxes;
- enemy AI;
- maps;
- particles and combat feedback;
- camera and screen effects.

React owns:

- inventory;
- equipment screen;
- character stats;
- skill tree;
- merchant UI;
- quest log;
- settings and menus;
- item comparison tooltips.

A shared game-state/domain layer sits between Phaser and React. UI must not directly own combat logic, and Phaser scenes must not hard-code inventory or skill-tree presentation logic.

The vertical slice has no required backend, authentication system, or remote database. Saves are local. Content definitions are data-driven so that items, affixes, skills, enemies, loot tables, quests, and balance values can be edited without rewriting engine logic.

## 4. Visual Direction

Visual style: hybrid pixel art.

Characters, environments, props, and core world assets use pixel-art aesthetics. Modern rendering effects are layered on top where they improve readability and impact, including:

- dynamic lighting;
- shadows;
- particles;
- hit flashes;
- attack trails;
- screen shake;
- ability effects;
- restrained post-processing.

Camera distance is medium: close enough to read character animation and combat feedback, but far enough to support positioning, multi-enemy encounters, ranged threats, traps, and dodge space.

## 5. Core Game Loop

The vertical-slice loop is:

1. Start in the dark frontier outpost.
2. Accept/continue the main contract.
3. Prepare using merchant, equipment, potions, inventory, and skills.
4. Enter the Cursed Forest.
5. Fight enemies, gain XP, collect loot, and explore side paths.
6. Find the bandit hideout.
7. Navigate ambushes, traps, mixed enemy groups, and elite encounters.
8. Fight the Bandit Leader boss.
9. Receive boss/unique loot and complete the contract objective.
10. Return to the outpost.
11. Receive quest rewards, improve the build, buy supplies, and respec if desired.
12. Re-enter content for improved loot and alternate encounter/room configurations.

The story exists to support the combat-and-loot loop rather than dominate it.

## 6. World Structure

### 6.1 Frontier Outpost

The hub is a dark frontier outpost at the edge of dangerous territory. It should feel like the last safe preparation point before hostile wilderness.

Required functional locations/NPC roles:

- merchant;
- skill-respec NPC/service;
- quest giver;
- stash/storage;
- save point / safe-zone save access.

The outpost is intentionally compact and should not become a large town simulation in the first release.

### 6.2 Cursed Forest

The first adventure area is the Cursed Forest.

Primary qualities:

- ambush-friendly terrain;
- dangerous wildlife or forest threats;
- bandit patrols;
- hidden paths;
- small optional branches;
- loot opportunities;
- environmental atmosphere that foreshadows the bandit hideout.

The forest is primarily authored rather than procedural so that pacing and encounter composition remain intentional.

### 6.3 Bandit Hideout

The first dungeon is a bandit hideout.

Its encounter vocabulary includes:

- melee guards;
- fast flankers;
- ranged attackers;
- armored/heavy enemies;
- traps;
- ambushes;
- treasure rooms;
- a final boss arena.

Dungeon replayability uses a semi-procedural approach: rooms are hand-authored, while room order, selected encounters, traps, and rewards can vary between runs. The goal is controlled replayability without sacrificing level-design quality.

## 7. Quest Premise

The main vertical-slice contract is straightforward:

The frontier outpost is being cut off from its trade routes. A bandit group controls the forest paths, attacks caravans, and raids the outpost. The player is sent through the Cursed Forest to locate the bandit hideout and eliminate its leader.

The first quest should require minimal exposition and move the player into combat quickly.

## 8. Player Class Strategy

The game is class-based.

The architecture must support approximately four to six distinct classes in the future, but the first vertical slice fully implements only one class: **Rogue**.

The Rogue serves as the reference implementation for:

- player combat architecture;
- active abilities;
- passive skills;
- energy management;
- hitboxes/hurtboxes;
- dodge/i-frame behavior;
- status effects;
- equipment and build synergies.

## 9. Rogue Combat Model

Combat pace is medium-fast: dynamic enough to reward reaction and mobility, but readable enough for players to recognize attack telegraphs and make tactical decisions.

### 9.1 Basic Combat

The Rogue has a short basic attack combo on the left mouse button. Basic attacks do not consume energy.

Desired properties:

- approximately three attacks in the base combo chain;
- attacks aim toward the mouse independently of movement direction;
- the player may cancel/reposition between appropriate combo windows;
- the final strike has stronger impact, such as increased stagger or damage;
- combat must feel responsive rather than animation-locked.

### 9.2 Energy

Energy/stamina is the main action resource.

Energy is spent by stronger combat actions such as:

- dodge;
- secondary attacks;
- selected active abilities.

Energy rapidly regenerates automatically after the player briefly stops spending it. The system should discourage ability/dodge spam without forcing long passive downtime.

Energy potions are normal inventory consumables and restore energy immediately.

### 9.3 Dodge

`Space` performs a dodge.

The dodge:

- consumes energy;
- provides a short invulnerability window;
- is a key defensive tool;
- must be tuned so that repeated dodge spam is not optimal.

### 9.4 Active Skills

The combat bar contains four active-skill slots mapped to `1–4`.

Active skills are unlocked only through the skill tree. Equipment may modify or synergize with learned skills but does not directly grant entirely new active skills in the first design.

Example Rogue ability space for the vertical slice may include:

- a dash-through attack;
- thrown blades;
- poison strike;
- smoke bomb.

Final ability names and exact numbers are balance/content decisions, not architectural requirements.

## 10. Core Character Stats

The initial stat model includes:

- HP;
- Energy;
- Attack Power;
- Critical Chance;
- Critical Damage;
- Armor;
- Move Speed;
- Attack Speed;
- Cooldown Reduction;
- Dodge Distance.

Damage supports physical damage plus build/status effects such as poison and bleeding. Equipment may later add elemental or magical modifiers.

All formulas and tuning constants must live in configuration/domain data rather than being scattered across scene code.

## 11. Skill Tree

The Rogue uses a deep, mixed-build skill tree with three major branches.

### 11.1 Assassin

Focus:

- critical hits;
- burst damage;
- damage against vulnerable/full-health targets;
- post-dodge offense;
- finishers.

### 11.2 Duelist

Focus:

- attack speed;
- mobility;
- dodge interactions;
- counters;
- sustained combat rhythm.

### 11.3 Poisoner

Focus:

- poison;
- bleeding;
- traps;
- damage over time;
- detonating or amplifying accumulated effects.

Players may freely mix nodes across branches rather than locking permanently into one specialization.

The vertical slice should contain roughly 18–24 meaningful nodes total, with approximately 5–7 ordinary nodes per branch, active skills distributed through the branches, and one major keystone-style passive per branch.

Keystone passives should change play patterns, not merely add small percentage bonuses.

Examples of keystone behavior include:

- converting poison accumulation into a burst/detonation mechanic;
- making critical hits interact with dodge cooldown/recovery;
- rewarding precise dodge timing with a short offensive window.

Skill points are earned through leveling.

Respeccing is allowed but costs gold. The price must be meaningful enough to preserve decision weight without making experimentation prohibitive.

## 12. Loot and Itemization

The loot system is hybrid: procedural affixed gear plus authored legendary/unique items.

### 12.1 Rarity Ladder

Target rarity vocabulary:

1. Common
2. Uncommon
3. Rare
4. Epic
5. Legendary
6. Unique

Not every tier must appear with equal frequency in the first slice.

### 12.2 Item Construction

Conceptual item model:

`Base Item + Rarity + Random Affixes + Optional Authored Unique Effect = Final Item`

Items have an item level tied to source content/enemy-zone level ranges so the same base type can scale without requiring a hand-authored item for every level.

### 12.3 Equipment Slots

Initial equipment slots:

- main weapon;
- off-hand / second weapon;
- head;
- body;
- gloves;
- boots;
- amulet;
- ring 1;
- ring 2.

### 12.4 Affix Families

Affixes may include:

Offense:

- physical damage;
- critical chance;
- critical damage;
- attack speed.

Defense:

- health;
- armor;
- resistances.

Mobility/resource:

- movement speed;
- dodge distance;
- energy recovery.

Build specialization:

- poison damage;
- bleed duration/damage;
- damage after dodge;
- damage against full-health or otherwise conditioned targets.

### 12.5 Unique Items

Legendary/unique items may alter build behavior rather than simply raise stats.

Example pattern:

A unique dagger could improve crit/poison statistics and add an effect where dodging empowers the next strike to deal amplified damage and apply multiple poison stacks.

The important rule is that items may modify learned skills and build behavior, but active skills themselves are unlocked through the skill tree.

### 12.6 Vertical Slice Content Target

Approximate initial content target:

- 8–12 base equipment types;
- 20–30 affixes;
- several rarity tiers meaningfully represented;
- 3–5 unique items;
- health potions;
- energy potions;
- gold;
- a small number of crafting/quest materials if needed by the slice.

## 13. Inventory and Pickup

Inventory model: fixed-slot inventory.

Rules:

- one item occupies one slot unless it is stackable;
- stackable consumables/resources combine according to stack limits;
- equipment uses its defined equipment slots;
- when the inventory is full, new loot cannot be picked up;
- blocked loot remains in the world until the player frees inventory space or leaves the content context;
- world loot is picked up manually using the interaction input.

The React UI should provide item comparison: hovering/selecting an item shows the currently equipped comparison and the resulting stat differences.

## 14. Consumables

Potions are ordinary consumable inventory items. The player may carry/use as many as the inventory and stack rules permit.

Health potions restore health immediately.

Energy potions restore energy immediately.

Balance should come primarily from acquisition rate, economy, stack/inventory pressure, and an appropriate short use cooldown rather than checkpoint-based refill charges.

## 15. Death and Saving

Death follows a classic RPG model rather than roguelite or Souls-like progression loss.

On death, the player returns to/reloads the latest checkpoint/save state. Core character progression and equipment are not permanently lost as a death penalty.

Saving behavior for the vertical slice:

- automatic saves on entering the safe outpost;
- automatic saves after major milestones/events;
- checkpoint-style saves at appropriate safe/progression points;
- manual saving available in safe zones.

Save data must be versioned from the beginning so future schema migrations are possible.

## 16. Enemy Archetypes

The vertical slice targets approximately five primary enemy archetypes, each testing a different player behavior.

### 16.1 Melee Bandit

- straightforward pressure;
- readable basic attacks;
- teaches spacing and attack windows.

### 16.2 Fast Cutthroat

- rapid movement;
- flanking behavior;
- punishes stationary play.

### 16.3 Archer

- maintains distance;
- creates movement pressure;
- supports mixed encounter compositions.

### 16.4 Heavy Bandit

- slower movement;
- stronger defense/armor;
- dangerous heavy swings;
- creates frontal pressure and longer commitment windows.

### 16.5 Scout / Trapper

- places or uses traps;
- retreats/repositions;
- controls space rather than simply chasing the player.

Enemy groups should become dangerous through composition. A heavy frontliner plus an archer plus a flanker should be substantially more demanding than three identical melee enemies.

## 17. Enemy AI Architecture

Enemy AI uses reusable state-driven behavior rather than bespoke scripts for every enemy.

Core state vocabulary may include:

- patrol/idle;
- suspicion;
- detection;
- chase;
- position selection;
- attack preparation;
- attack execution;
- recovery;
- retreat/reposition;
- disabled/dead.

Individual archetypes configure or extend this vocabulary.

AI should not require every enemy to sprint directly toward the player. Position selection, range preference, cooldowns, group composition, and recovery windows create combat texture.

## 18. Telegraphing and Combat Fairness

Dangerous enemy actions must be readable before impact.

Telegraphing may use:

- anticipation animation;
- sound cues;
- weapon posture;
- direction/facing;
- restrained ground or particle effects where useful.

The design should avoid relying exclusively on large generic red danger circles.

Deaths should generally feel attributable to readable player mistakes rather than invisible or unavoidable damage.

## 19. Boss: Bandit Leader

The boss is a fast Rogue-like mirror opponent rather than a giant tank.

Core identity:

- rapid melee sequences;
- side dodges/repositioning;
- thrown knives;
- poison blade attacks;
- smoke concealment/area denial;
- feints and delayed attacks;
- aggressive repositioning around the player.

The encounter becomes more aggressive as health falls, but phases primarily change behavior and attack selection rather than secretly inflating health/defense during the fight.

Suggested encounter structure:

Phase 1:

- readable fast combos;
- thrown knives;
- poison strike;
- smoke usage;
- defensive dodges.

Around 60% HP:

- longer/more aggressive strings;
- feints;
- reposition/dash behind player;
- stronger poison pressure;
- shorter recovery between selected actions.

Around 25% HP:

- high-pressure attack cadence;
- more frequent smoke and mobility;
- longer strings;
- compensating, clearly readable vulnerability windows so the phase remains fair.

The boss should test the same skills the player learned through normal combat: reading telegraphs, managing energy, choosing attack windows, aiming, positioning, and dodging.

## 20. Difficulty Model

The first vertical slice ships with one carefully tuned baseline difficulty rather than Easy/Normal/Hard selection.

Difficulty should primarily be produced through:

- encounter composition;
- enemy behavior;
- positioning pressure;
- attack timing;
- resource availability;
- elite variants;
- dungeon variation.

Avoid using raw enemy HP inflation as the main difficulty lever.

The game does not use universal one-to-one level scaling. Areas have intended level ranges. Becoming stronger should make earlier content feel easier.

Future high-level replayability can use explicit higher-difficulty dungeon variants, elites, higher item levels, or modifiers rather than automatically scaling every enemy to the player at all times.

## 21. Vertical Slice Scope

The first complete playable slice contains:

- one dark frontier outpost;
- one authored adventure zone: Cursed Forest;
- one semi-procedural dungeon: Bandit Hideout;
- one fully implemented class: Rogue;
- mouse-aimed action combat;
- basic attack combo;
- dodge/i-frames;
- energy and regeneration;
- health and energy potions;
- four active skill slots;
- a mixed three-branch Rogue skill tree;
- leveling and skill points;
- gold-based respec;
- inventory;
- equipment;
- item rarities;
- random affixes;
- unique items;
- merchant;
- quest flow;
- 4–6 enemy archetypes/variants;
- Bandit Leader boss;
- checkpoints and local saving;
- repeatable dungeon loop;
- hybrid pixel-art presentation with modern effects.

## 22. Explicit Non-Goals for the First Slice

The following are deliberately out of scope unless later required by implementation dependencies:

- multiplayer/co-op;
- mobile controls;
- gamepad support;
- backend services;
- account system;
- cloud saves;
- large open world;
- multiple fully playable classes;
- large narrative campaign;
- crafting economy as a major system;
- housing/base building;
- PvP;
- procedurally generated entire world;
- extensive accessibility-mode matrix beyond basic settings needed for a usable first slice.

## 23. System Boundaries

The project should keep the following domains independently understandable and testable:

- input and control mapping;
- player movement;
- combat resolution;
- hitbox/hurtbox collision;
- energy/resource handling;
- status effects;
- skill definitions and progression;
- item generation/affixes;
- inventory;
- equipment/stat aggregation;
- loot tables and drops;
- enemy AI/state machines;
- encounter spawning/composition;
- quests;
- economy/merchant;
- save/load/version migration;
- React UI bridge;
- audio/visual feedback.

Each domain should communicate through clear interfaces/events/state contracts rather than directly reaching into unrelated systems.

## 24. Data Flow Principles

Content definitions are data-driven. Runtime systems consume definitions rather than owning content values.

Examples:

- item generator consumes base-item, rarity, affix-pool, and item-level definitions;
- combat consumes character stats, skill definitions, and status-effect definitions;
- enemies consume archetype/stat/behavior definitions;
- loot drops consume loot-table definitions;
- React reads exposed game/domain state and sends deliberate commands/actions back through a bridge rather than manipulating Phaser objects directly.

The save system serializes domain state, not engine-object references.

## 25. Error Handling and Robustness

The vertical slice should fail safely where possible.

Required engineering principles:

- validate content/data definitions during development;
- unknown item/skill IDs in a save should be handled through migration/fallback logic rather than crashing the entire game;
- save writes should be atomic or recoverable enough to avoid corrupting the only save copy;
- the game should maintain at least a recent backup/autosave strategy locally;
- UI should gracefully handle missing icons/assets using development fallbacks;
- entity cleanup must prevent stale references when scenes or dungeon rooms change.

## 26. Testing Strategy

Core domain logic should be testable without requiring a running rendered game wherever practical.

Priority automated tests:

- damage formulas;
- critical-hit calculation;
- energy spending/regeneration rules;
- cooldown logic;
- status stacking/expiry;
- affix generation constraints;
- equipment stat aggregation;
- inventory capacity/stack behavior;
- loot-table selection;
- skill prerequisites and respec cost behavior;
- save serialization/deserialization/migrations;
- enemy state-transition rules where deterministic logic permits.

Integration/playtest coverage should focus on:

- input responsiveness;
- combo cancelling/windows;
- dodge/i-frame correctness;
- hitbox/hurtbox synchronization;
- Phaser ↔ React state synchronization;
- room transitions;
- death/reload behavior;
- boss phase transitions;
- dungeon replay variation.

## 27. Definition of Vertical-Slice Success

The vertical slice is successful when a player can:

1. launch the browser game;
2. enter the outpost;
3. understand the basic contract and controls;
4. equip/manage gear and supplies;
5. enter the Cursed Forest;
6. fight multiple readable enemy archetypes using manual aiming, combos, energy, skills, and dodge;
7. gain XP and improve the Rogue;
8. find clearly differentiated loot with meaningful stat/build choices;
9. enter and clear the Bandit Hideout;
10. defeat the Bandit Leader through learned combat skills;
11. receive meaningful boss rewards;
12. return to the outpost, turn in the quest, respec/shop if desired;
13. save and resume progress;
14. replay the dungeon and encounter meaningful variation and loot incentives.

The experience should already communicate the intended identity of the larger game: **skill-based action combat plus deep loot/build progression in a persistent fantasy RPG structure**.
