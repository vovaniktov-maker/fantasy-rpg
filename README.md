# Fantasy RPG — Vertical Slice

A desktop-browser top-down fantasy action RPG prototype focused on responsive Rogue combat, loot, class progression, and repeatable dungeon runs.

## Run

```bash
npm install
npm run dev
```

Open the local Vite URL in a desktop browser. The game is designed for keyboard and mouse.

## Verify

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

`npm run verify` is also available for TypeScript checking, unit/component tests, and the production Vite build. Playwright covers the complete deterministic vertical-slice flow through real keyboard/mouse input and normal React UI.

## Controls

- **WASD** — movement
- **Mouse** — independent aim/facing
- **LMB** — basic three-hit attack combo
- **1–4** — assigned active skills
- **Space** — dodge with energy cost and temporary invulnerability
- **E** — interact, manually collect nearby loot, and use scene gates
- **I** — inventory/equipment
- **K** — Rogue skill tree and active-skill assignment
- **J** — quest log
- **Esc** — pause menu

Learn active skills in the Rogue skill tree, select the learned active skill in the **Active skills** section, then assign it to **Slot 1–4**. Equipment and learned passive skills feed the same derived-stat path used by live combat.

World loot is never auto-collected. Move within interaction range and press **E**. If the fixed-slot inventory cannot accept the full pickup, the item stays in the world.

## Architecture

- **Phaser 4** owns the game runtime, scenes, camera, input, combat presentation, enemies, world pickups, and world rendering.
- **React** owns HUD, inventory/equipment, quests, merchant, skills, pause UI, and optional read-only acceptance diagnostics.
- **Pure TypeScript domain modules** own stats, damage, energy, dodge/combo/status rules, itemization, inventory rules, loot tables, progression, quests/economy, dungeon generation, AI, boss phases, and save schema.
- Runtime adapters (`PlayerRuntime`, `EnemyRuntime`, `CombatRuntime`, `LootRuntime`, `BossRuntime`) connect Phaser to the domain rules.
- `GameBridge` passes immutable snapshots and typed commands between Phaser/React and `GameSession`.
- Saves are versioned local browser saves with primary/backup recovery. No server is required for this slice.

## Vertical slice

The playable route is:

**Frontier Outpost → Cursed Forest → Bandit Hideout → Bandit Leader → Frontier Outpost**

The slice includes the contract quest, five bandit enemy archetypes, real-time Rogue combat, manual world loot, equipment, a three-branch skill tree, paid respec, semi-procedural hideout generation, boss phases, checkpoint/death recovery, local saves, and repeatable run seeds.

Not included: backend services, accounts/authentication, cloud saves, multiplayer, gamepad support, or mobile/touch controls.

## Deterministic acceptance mode

Open `/?testMode=1` during development to enable deterministic, accelerated acceptance tuning and read-only runtime diagnostics used by Playwright.

Acceptance mode uses the same real scene transitions, enemy AI, attack windows, loot pickup, equipment UI, boss victory, quest flow, and save/reload path as normal play. It has **no buttons or commands that directly defeat encounters, kill the boss, grant loot, or mutate quest milestones**.

Production play uses normal HP/damage/timing values; acceptance tuning only exists to make automated browser verification deterministic and fast.
