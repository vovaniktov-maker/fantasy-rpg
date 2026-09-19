# SDD ledger — plan: docs/superpowers/plans/2026-09-19-runtime-integration-implementation.md

Environment ruling: the connected GitHub repository persists while the harness-local worktree does not, so branch `vertical-slice` is the isolated feature workspace. TDD evidence comes from PR #1 GitHub Actions on each RED/GREEN commit. Cost if wrong: extra CI commits on the feature branch; main remains untouched.

Pre-flight:
- Task 1 -> Task 2: sanitized GameState/equipment references feed derived stats; interfaces align.
- Task 2 -> Task 5: assigned active skill IDs and derived stats feed PlayerRuntime; interfaces align.
- Task 3 -> Tasks 5/8/9: shared gameplay control snapshot gates player/scene/boss runtime; interfaces align.
- Task 4 -> Tasks 5/6/9: CombatRuntime attack-window contract is shared by player/enemy/boss runtimes; interfaces align.
- Task 6 -> Task 7: enemy death events feed LootRuntime; interfaces align.
- Task 7 -> Task 8: LootRuntime is owned by SceneRuntimeHost and scene integration; interfaces align.
- Task 8 -> Task 11: real scene runtime becomes Playwright acceptance surface; interfaces align.
- Task 9 -> Task 11: BossRuntime replaces click-to-damage before E2E is rewritten; interfaces align.
