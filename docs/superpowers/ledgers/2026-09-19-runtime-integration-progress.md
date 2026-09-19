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

Task 1: Ruling: active-slot sanitation fixture must learn `assassin_shadow_dash` before expecting `shadow_dash` to survive — the spec requires only learned active skills in slots — cost if wrong: one test fixture change.
Task 1: Ruling: death/checkpoint fixture must contain the equipped dagger instance — stale equipment references are intentionally sanitized on load — cost if wrong: one test fixture change.

Task 1: complete (commits 4a7d2dc..edc7d71, tests: GitHub Actions CI run 35455883642 -> success; typecheck, unit tests, build, e2e all green)
