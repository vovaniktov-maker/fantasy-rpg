export type GameCommand =
  | { type: 'USE_POTION'; kind: 'health' | 'energy' }
  | { type: 'EQUIP_ITEM'; itemId: string; slot: string }
  | { type: 'UNLOCK_SKILL'; skillId: string }
  | { type: 'ASSIGN_ACTIVE_SKILL'; activeSkillId: string; slotIndex: number }
  | { type: 'RESPEC_SKILLS' }
  | { type: 'BUY_ITEM'; itemId: string }
  | { type: 'ACCEPT_QUEST'; questId: string }
  | { type: 'TURN_IN_QUEST'; questId: string }
  | { type: 'SAVE_GAME' };

export type GameEvent =
  | { type: 'PLAYER_RESOURCES_SYNCED'; hp: number; energy: number }
  | { type: 'PLAYER_DAMAGED'; amount: number }
  | { type: 'LOOT_PICKED_UP'; itemId: string }
  | { type: 'QUEST_UPDATED'; questId: string }
  | { type: 'PLAYER_DIED' };
