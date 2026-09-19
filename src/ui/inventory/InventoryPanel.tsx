import { useMemo, useState } from 'react';
import { gameBridge } from '../../game/bridge/GameBridge';
import type { SerializableItemStack } from '../../domain/state/GameState';
import { useGameSnapshot } from '../useGameSnapshot';
import { ItemTooltip } from './ItemTooltip';

export function InventoryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useGameSnapshot();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo<SerializableItemStack | null>(() => state.inventory.slots.find((item) => item?.instanceId === selectedId) ?? null, [state.inventory.slots, selectedId]);
  if (!open) return null;
  return (
    <section className="panel inventory-panel" aria-label="Inventory">
      <header><h2>Inventory</h2><button onClick={onClose}>Close</button></header>
      <div className="inventory-grid">
        {state.inventory.slots.map((item, index) => (
          <button className="inventory-slot" key={index} data-empty={!item || undefined} onClick={() => setSelectedId(item?.instanceId ?? null)}>
            {item ? <><span>{item.definitionId}</span><small>{item.quantity > 1 ? `×${item.quantity}` : ''}</small></> : <span>—</span>}
          </button>
        ))}
      </div>
      <ItemTooltip item={selected} />
      {selected && <button onClick={() => gameBridge.dispatch({ type: 'EQUIP_ITEM', itemId: selected.instanceId, slot: 'weapon' })}>Equip</button>}
    </section>
  );
}
