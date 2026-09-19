import { useMemo, useState } from 'react';
import { buildContentRegistry } from '../../domain/content/contentRegistry';
import type { SerializableItemStack } from '../../domain/state/GameState';
import { gameBridge } from '../../game/bridge/GameBridge';
import { useGameSnapshot } from '../useGameSnapshot';
import { ItemTooltip } from './ItemTooltip';

const CONTENT = buildContentRegistry();

export function InventoryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useGameSnapshot();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo<SerializableItemStack | null>(
    () => state.inventory.slots.find((item) => item?.instanceId === selectedId) ?? null,
    [state.inventory.slots, selectedId],
  );
  const selectedDefinition = selected ? CONTENT.items.get(selected.definitionId) : undefined;
  const potionKind = selectedDefinition?.id === 'health_potion'
    ? 'health'
    : selectedDefinition?.id === 'energy_potion'
      ? 'energy'
      : null;

  if (!open) return null;
  return (
    <section className="panel inventory-panel" aria-label="Inventory">
      <header><h2>Inventory</h2><button onClick={onClose}>Close</button></header>
      <div className="inventory-grid">
        {state.inventory.slots.map((item, index) => (
          <button
            className="inventory-slot"
            key={index}
            data-empty={!item || undefined}
            onClick={() => setSelectedId(item?.instanceId ?? null)}
          >
            {item ? <><span>{item.definitionId}</span><small>{item.quantity > 1 ? `×${item.quantity}` : ''}</small></> : <span>—</span>}
          </button>
        ))}
      </div>
      <ItemTooltip item={selected} />
      {selected && potionKind && (
        <button
          aria-label={`Use ${potionKind} potion`}
          onClick={() => gameBridge.dispatch({ type: 'USE_POTION', kind: potionKind })}
        >
          Use {potionKind} potion
        </button>
      )}
      {selected && selectedDefinition?.kind === 'gear' && selectedDefinition.equipSlot && (
        <button
          onClick={() => gameBridge.dispatch({
            type: 'EQUIP_ITEM',
            itemId: selected.instanceId,
            slot: selectedDefinition.equipSlot!,
          })}
        >
          Equip
        </button>
      )}
    </section>
  );
}
