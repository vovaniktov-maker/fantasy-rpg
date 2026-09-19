import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { gameBridge } from '../../src/game/bridge/GameBridge';
import { SkillTreePanel } from '../../src/ui/skills/SkillTreePanel';

describe('SkillTreePanel active hotbar', () => {
  it('assigns a learned active skill to slot 1', () => {
    const current = gameBridge.getSnapshot();
    gameBridge.publish({
      progression: { ...current.progression, unspentSkillPoints: 0 },
      skills: {
        learned: { assassin_shadow_dash: 1 },
        equippedActiveSkillIds: [null, null, null, null],
      },
    });
    const spy = vi.fn();
    const off = gameBridge.onCommand(spy);

    render(<SkillTreePanel open />);
    fireEvent.click(screen.getByRole('button', { name: /shadow_dash/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Slot 1' }));

    expect(spy).toHaveBeenCalledWith({
      type: 'ASSIGN_ACTIVE_SKILL',
      activeSkillId: 'shadow_dash',
      slotIndex: 0,
    });
    off();
  });
});
