import type { SkillNodeDefinition } from '../domain/skills/skillTree.js';

export const rogueSkillNodes: SkillNodeDefinition[] = [
  { id: 'assassin_precision', branch: 'assassin', kind: 'passive', prerequisites: [], maxRank: 3, modifiers: [{ stat: 'critChance', mode: 'addPercent', value: 0.03 }] },
  { id: 'assassin_opening', branch: 'assassin', kind: 'passive', prerequisites: ['assassin_precision'], maxRank: 2, modifiers: [{ stat: 'critDamage', mode: 'addPercent', value: 0.08 }] },
  { id: 'assassin_shadow_dash', branch: 'assassin', kind: 'active', prerequisites: ['assassin_precision'], maxRank: 1, activeSkillId: 'shadow_dash' },
  { id: 'assassin_afterimage', branch: 'assassin', kind: 'passive', prerequisites: ['assassin_shadow_dash'], maxRank: 2, modifiers: [{ stat: 'dodgeDistance', mode: 'addPercent', value: 0.08 }] },
  { id: 'assassin_executioner', branch: 'assassin', kind: 'passive', prerequisites: ['assassin_opening'], maxRank: 2, modifiers: [{ stat: 'attackPower', mode: 'addPercent', value: 0.06 }] },
  { id: 'assassin_blade_fan', branch: 'assassin', kind: 'active', prerequisites: ['assassin_executioner'], maxRank: 1, activeSkillId: 'blade_fan' },
  { id: 'assassin_keystone_perfect_window', branch: 'assassin', kind: 'keystone', prerequisites: ['assassin_afterimage', 'assassin_executioner'], maxRank: 1 },

  { id: 'duelist_footwork', branch: 'duelist', kind: 'passive', prerequisites: [], maxRank: 3, modifiers: [{ stat: 'moveSpeed', mode: 'addPercent', value: 0.03 }] },
  { id: 'duelist_quick_hands', branch: 'duelist', kind: 'passive', prerequisites: ['duelist_footwork'], maxRank: 3, modifiers: [{ stat: 'attackSpeed', mode: 'addPercent', value: 0.04 }] },
  { id: 'duelist_riposte', branch: 'duelist', kind: 'active', prerequisites: ['duelist_footwork'], maxRank: 1, activeSkillId: 'riposte' },
  { id: 'duelist_endurance', branch: 'duelist', kind: 'passive', prerequisites: ['duelist_quick_hands'], maxRank: 2, modifiers: [{ stat: 'energy', mode: 'addPercent', value: 0.08 }] },
  { id: 'duelist_flow', branch: 'duelist', kind: 'passive', prerequisites: ['duelist_riposte'], maxRank: 2, modifiers: [{ stat: 'cooldownReduction', mode: 'addPercent', value: 0.03 }] },
  { id: 'duelist_flurry', branch: 'duelist', kind: 'active', prerequisites: ['duelist_quick_hands'], maxRank: 1, activeSkillId: 'flurry' },
  { id: 'duelist_keystone_relentless', branch: 'duelist', kind: 'keystone', prerequisites: ['duelist_endurance', 'duelist_flow'], maxRank: 1 },

  { id: 'poisoner_toxicology', branch: 'poisoner', kind: 'passive', prerequisites: [], maxRank: 3, modifiers: [{ stat: 'attackPower', mode: 'addPercent', value: 0.025 }] },
  { id: 'poisoner_coated_blade', branch: 'poisoner', kind: 'active', prerequisites: ['poisoner_toxicology'], maxRank: 1, activeSkillId: 'poison_strike' },
  { id: 'poisoner_virulence', branch: 'poisoner', kind: 'passive', prerequisites: ['poisoner_toxicology'], maxRank: 3, modifiers: [{ stat: 'critChance', mode: 'addPercent', value: 0.015 }] },
  { id: 'poisoner_trapcraft', branch: 'poisoner', kind: 'active', prerequisites: ['poisoner_virulence'], maxRank: 1, activeSkillId: 'venom_trap' },
  { id: 'poisoner_bloodletting', branch: 'poisoner', kind: 'passive', prerequisites: ['poisoner_coated_blade'], maxRank: 2, modifiers: [{ stat: 'attackSpeed', mode: 'addPercent', value: 0.03 }] },
  { id: 'poisoner_smoke_bomb', branch: 'poisoner', kind: 'active', prerequisites: ['poisoner_trapcraft'], maxRank: 1, activeSkillId: 'smoke_bomb' },
  { id: 'poisoner_keystone_volatile_toxins', branch: 'poisoner', kind: 'keystone', prerequisites: ['poisoner_bloodletting', 'poisoner_trapcraft'], maxRank: 1 },
];
