# Fantasy RPG — Vertical Slice

A desktop-browser top-down fantasy action RPG prototype focused on responsive Rogue combat, loot, class progression, and repeatable dungeon runs.

## Run

```bash
npm install
npm run dev
```

## Verify

```bash
npm run verify
npm run test:e2e
```

`npm run verify` runs TypeScript type-checking, unit/component tests, and a production Vite build. Playwright covers the deterministic vertical-slice acceptance flow.

## Controls

- **WASD** — movement
- **Mouse** — independent aim
- **LMB** — basic attack
- **RMB** — secondary action
- **1–4** — active skills
- **Space** — dodge
- **E** — interact / transition at prototype gates
- **I** — inventory
- **K** — skill tree
- **J** — quest log
- **Esc** — pause menu

## Architecture

- **Phaser 4** owns the game runtime, scenes, camera, input, combat presentation, and world rendering.
- **React** owns HUD, inventory/equipment, quests, merchant, skills, pause UI, and deterministic acceptance controls.
- **Pure TypeScript domain modules** own stats, damage, energy, dodge/combo/status rules, itemization, loot, progression, quests/economy, dungeon generation, AI, boss phases, and save schema.
- `GameBridge` passes immutable snapshots and typed commands between Phaser/React and `GameSession`.
- Saves are versioned local browser saves with primary/backup recovery. No server is required for this slice.

## Vertical slice scope

Included: frontier outpost, Cursed Forest, semi-procedural Bandit Hideout, five enemy archetype definitions, Bandit Leader boss, merchant, quest, levels, three-branch Rogue skill tree, paid respec, fixed-slot inventory, item rarities/affixes/uniques, potions, checkpoint/death recovery, and repeatable run seeds.

Not included in this slice: backend services, accounts/authentication, cloud saves, multiplayer, gamepad support, or mobile/touch controls.

## Deterministic acceptance mode

Open `/?testMode=1` during development to expose shortcuts used by Playwright. They call the same `GameSession` state transitions and normal UI commands as production, while shortening encounter time.
