import { useEffect, useState } from 'react';
import { GameCanvas } from '../game/GameCanvas';
import { getDefaultGameSession } from '../game/GameSession';
import { Hud } from '../ui/hud/Hud';
import { InventoryPanel } from '../ui/inventory/InventoryPanel';
import { EquipmentPanel } from '../ui/equipment/EquipmentPanel';
import { SkillTreePanel } from '../ui/skills/SkillTreePanel';
import { QuestPanel } from '../ui/quests/QuestPanel';
import { MerchantPanel } from '../ui/merchant/MerchantPanel';
import { PauseMenu } from '../ui/menus/PauseMenu';
import { TestFlowPanel } from '../ui/test/TestFlowPanel';
import { useGameSnapshot } from '../ui/useGameSnapshot';
import '../styles/game-ui.css';

const merchantOffers = [
  { id: 'health_potion', name: 'Health Potion', price: 25, quantity: 99 },
  { id: 'energy_potion', name: 'Energy Potion', price: 20, quantity: 99 },
  { id: 'steel_dagger', name: 'Steel Dagger', price: 80, quantity: 99 },
];

export default function App() {
  getDefaultGameSession();
  const state = useGameSnapshot();
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [merchantOpen, setMerchantOpen] = useState(false);
  const [questOpen, setQuestOpen] = useState(true);
  const [paused, setPaused] = useState(false);
  const testMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('testMode') === '1';

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === 'i') setInventoryOpen((open) => !open);
      if (key === 'k') setSkillsOpen((open) => !open);
      if (key === 'j') setQuestOpen((open) => !open);
      if (event.key === 'Escape') setPaused((open) => !open);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const modalOpen = inventoryOpen || skillsOpen || merchantOpen || paused;
  return (
    <main className="app-shell">
      <GameCanvas />
      <div className="ui-layer" data-game-input-suppressed={modalOpen || undefined}>
        <Hud />
        <nav className="ui-nav" aria-label="Game panels">
          <button className="inventory-toggle" onClick={() => setInventoryOpen(true)}>Inventory [I]</button>
          <button onClick={() => setSkillsOpen((open) => !open)}>Skills [K]</button>
          <button onClick={() => setQuestOpen((open) => !open)}>Quest [J]</button>
          {state.screen === 'outpost' && <button onClick={() => setMerchantOpen((open) => !open)}>Merchant</button>}
        </nav>
        <InventoryPanel open={inventoryOpen} onClose={() => setInventoryOpen(false)} />
        <EquipmentPanel open={inventoryOpen} />
        <SkillTreePanel open={skillsOpen} />
        <QuestPanel open={questOpen || testMode} />
        <MerchantPanel open={merchantOpen} offers={merchantOffers} />
        <PauseMenu open={paused} onResume={() => setPaused(false)} />
        {testMode && <TestFlowPanel />}
      </div>
    </main>
  );
}
