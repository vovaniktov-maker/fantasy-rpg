import { useGameSnapshot } from '../useGameSnapshot';

export function TestFlowPanel() {
  const state = useGameSnapshot();
  const equippedCount = Object.values(state.equipment).filter(Boolean).length;
  const inventoryCount = state.inventory.slots.filter(Boolean).length;
  const questStatus = state.quests.bandit_leader_contract ?? 'available';
  return (
    <section className="test-flow" aria-label="Runtime test diagnostics">
      <strong>Test mode diagnostics</strong>
      <span>screen: <output data-testid="runtime-screen">{state.screen}</output></span>
      <span>player: <output data-testid="runtime-player-position">{Math.round(state.player.position.x)},{Math.round(state.player.position.y)}</output></span>
      <span>quest: <output data-testid="runtime-quest-status">{questStatus}</output></span>
      <span>forest clear: <output data-testid="runtime-forest-cleared">{String(state.world.forestEncounterDefeated)}</output></span>
      <span>inventory: <output data-testid="runtime-inventory-count">{inventoryCount}</output></span>
      <span>equipped: <output data-testid="runtime-equipped-count">{equippedCount}</output></span>
    </section>
  );
}
