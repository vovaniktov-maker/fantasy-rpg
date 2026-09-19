import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Hud } from '../../src/ui/hud/Hud';
import { InventoryPanel } from '../../src/ui/inventory/InventoryPanel';
import { gameBridge } from '../../src/game/bridge/GameBridge';

describe('RPG UI', () => {
  it('renders HP and Energy in HUD', () => {
    gameBridge.publish({ player: { hp: 75, maxHp: 100, energy: 40, maxEnergy: 100, position: { x: 0, y: 0 } } });
    render(<Hud />);
    expect(screen.getByLabelText(/HP 75 of 100/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Energy 40 of 100/)).toBeInTheDocument();
  });

  it('renders occupied and empty slots and dispatches one equip command', () => {
    const state = gameBridge.getSnapshot();
    const slots = [...state.inventory.slots];
    slots[0] = { instanceId: 'd1', definitionId: 'steel_dagger', quantity: 1, itemLevel: 2, rarity: 'rare' };
    gameBridge.publish({ inventory: { capacity: state.inventory.capacity, slots } });
    const spy = vi.fn(); const off = gameBridge.onCommand(spy);
    render(<InventoryPanel open onClose={() => {}} />);
    fireEvent.click(screen.getByText('steel_dagger'));
    fireEvent.click(screen.getByText('Equip'));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].type).toBe('EQUIP_ITEM');
    off();
  });
});


it('dispatches the declared equipment slot instead of hardcoding weapon', () => {
  const state = gameBridge.getSnapshot();
  const slots = [...state.inventory.slots];
  slots[0] = { instanceId: 'cowl-1', definitionId: 'shadow_cowl', quantity: 1, itemLevel: 2, rarity: 'rare' };
  gameBridge.publish({ inventory: { capacity: state.inventory.capacity, slots } });
  const spy = vi.fn();
  const off = gameBridge.onCommand(spy);
  render(<InventoryPanel open onClose={() => {}} />);
  fireEvent.click(screen.getByText('shadow_cowl'));
  fireEvent.click(screen.getByText('Equip'));
  expect(spy).toHaveBeenCalledWith({ type: 'EQUIP_ITEM', itemId: 'cowl-1', slot: 'head' });
  off();
});
