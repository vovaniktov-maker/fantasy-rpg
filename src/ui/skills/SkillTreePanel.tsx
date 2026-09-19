import { useMemo, useState } from 'react';
import { rogueSkillNodes } from '../../content/skills';
import { calculateRespecCost } from '../../domain/skills/skillTree';
import { gameBridge } from '../../game/bridge/GameBridge';
import { useGameSnapshot } from '../useGameSnapshot';

export function SkillTreePanel({ open }: { open: boolean }) {
  const state = useGameSnapshot();
  const [selectedActiveSkillId, setSelectedActiveSkillId] = useState<string | null>(null);
  const cost = calculateRespecCost({ learned: state.skills.learned }, state.progression.level);

  const learnedActiveSkills = useMemo(() => (
    rogueSkillNodes
      .filter((node) => node.kind === 'active' && node.activeSkillId && (state.skills.learned[node.id] ?? 0) > 0)
      .map((node) => node.activeSkillId!)
  ), [state.skills.learned]);

  if (!open) return null;

  return (
    <section className="panel skill-panel" aria-label="Rogue skill tree">
      <header><h2>Rogue Skills</h2><span>{state.progression.unspentSkillPoints} points</span></header>
      {(['assassin','duelist','poisoner'] as const).map((branch) => (
        <div key={branch} className="skill-branch">
          <h3>{branch}</h3>
          {rogueSkillNodes.filter((node) => node.branch === branch).map((node) => {
            const rank = state.skills.learned[node.id] ?? 0;
            const maxed = rank >= node.maxRank;
            return (
              <button
                key={node.id}
                disabled={state.progression.unspentSkillPoints <= 0 || maxed}
                onClick={() => gameBridge.dispatch({ type: 'UNLOCK_SKILL', skillId: node.id })}
              >
                {node.id} ({rank}/{node.maxRank})
              </button>
            );
          })}
        </div>
      ))}

      <div className="active-skill-assignment" aria-label="Active skill hotbar">
        <h3>Active skills</h3>
        <div>
          {learnedActiveSkills.length === 0 && <span>No learned active skills</span>}
          {learnedActiveSkills.map((skillId) => (
            <button
              key={skillId}
              aria-pressed={selectedActiveSkillId === skillId}
              onClick={() => setSelectedActiveSkillId(skillId)}
            >
              {skillId}
            </button>
          ))}
        </div>
        <div>
          {state.skills.equippedActiveSkillIds.map((skillId, index) => (
            <button
              key={index}
              disabled={!selectedActiveSkillId}
              onClick={() => {
                if (!selectedActiveSkillId) return;
                gameBridge.dispatch({
                  type: 'ASSIGN_ACTIVE_SKILL',
                  activeSkillId: selectedActiveSkillId,
                  slotIndex: index,
                });
              }}
            >
              Slot {index + 1}{skillId ? `: ${skillId}` : ''}
            </button>
          ))}
        </div>
      </div>

      <button
        disabled={state.economy.gold < cost}
        onClick={() => gameBridge.dispatch({ type: 'RESPEC_SKILLS' })}
      >
        Respec — {cost} gold
      </button>
    </section>
  );
}
