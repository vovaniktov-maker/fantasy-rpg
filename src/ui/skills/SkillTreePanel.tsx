import { rogueSkillNodes } from '../../content/skills';
import { gameBridge } from '../../game/bridge/GameBridge';
import { calculateRespecCost } from '../../domain/skills/skillTree';
import { useGameSnapshot } from '../useGameSnapshot';

export function SkillTreePanel({ open }: { open: boolean }) {
  const state = useGameSnapshot();
  if (!open) return null;
  const cost = calculateRespecCost({ learned: state.skills.learned }, state.progression.level);
  return (
    <section className="panel skill-panel" aria-label="Rogue skill tree">
      <header><h2>Rogue Skills</h2><span>{state.progression.unspentSkillPoints} points</span></header>
      {(['assassin','duelist','poisoner'] as const).map((branch) => (
        <div key={branch} className="skill-branch">
          <h3>{branch}</h3>
          {rogueSkillNodes.filter((node) => node.branch === branch).map((node) => (
            <button key={node.id} disabled={state.progression.unspentSkillPoints <= 0} onClick={() => gameBridge.dispatch({ type: 'UNLOCK_SKILL', skillId: node.id })}>
              {node.id} ({state.skills.learned[node.id] ?? 0}/{node.maxRank})
            </button>
          ))}
        </div>
      ))}
      <button disabled={state.economy.gold < cost} onClick={() => gameBridge.dispatch({ type: 'RESPEC_SKILLS' })}>Respec — {cost} gold</button>
    </section>
  );
}
