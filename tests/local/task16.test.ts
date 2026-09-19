import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_COMBAT_FEEDBACK, feedbackForCombatEvent } from '../../src/game/combat/CombatFeedback.js';

test('combat events map to visual commands only',()=>{const result=feedbackForCombatEvent({type:'hit',target:'enemy',critical:true},DEFAULT_COMBAT_FEEDBACK);assert.ok(result.some(x=>x.type==='hitFlash'));assert.ok(result.some(x=>x.type==='cameraShake'));assert.ok(result.some(x=>x.type==='particleBurst'));});
test('optional lighting respects configuration',()=>{const result=feedbackForCombatEvent({type:'bossCue',cueKey:'leader-smoke'},{...DEFAULT_COMBAT_FEEDBACK,lighting:false});assert.equal(result.some(x=>x.type==='lightPulse'),false);});

import { GameSession } from '../../src/game/GameSession.js';
import { GameBridge } from '../../src/game/bridge/GameBridge.js';
import { createInitialGameState } from '../../src/domain/state/GameState.js';
import { LocalSaveRepository, type StorageLike } from '../../src/domain/save/saveRepository.js';
class Task16Storage implements StorageLike { map=new Map<string,string>(); getItem(k:string){return this.map.get(k)??null;} setItem(k:string,v:string){this.map.set(k,v);} removeItem(k:string){this.map.delete(k);} }

test('session acceptance shortcuts use persistent production transitions',()=>{const storage=new Task16Storage();const bridge=new GameBridge();const session=new GameSession(new LocalSaveRepository(storage,createInitialGameState,new Set()),bridge,{now:()=>42});session.startNew();bridge.dispatch({type:'ACCEPT_QUEST',questId:'bandit_leader_contract'});session.enterForest();session.completeForestEncounter();assert.equal(session.grantLoot('steel_dagger'),true);session.enterHideout();session.enterBoss();session.markBanditLeaderDefeated();session.enterOutpost();bridge.dispatch({type:'TURN_IN_QUEST',questId:'bandit_leader_contract'});session.save();const state=session.getState();assert.equal(state.quests.bandit_leader_contract,'completed');assert.equal(state.economy.gold,250);assert.equal(state.world.forestEncounterDefeated,true);});

test('merchant command buys a real consumable atomically',()=>{const storage=new Task16Storage();const bridge=new GameBridge();const session=new GameSession(new LocalSaveRepository(storage,createInitialGameState,new Set()),bridge,{now:()=>99});const s=session.startNew();s.economy.gold=100;session.replaceState(s);bridge.dispatch({type:'BUY_ITEM',itemId:'health_potion'});const after=session.getState();assert.equal(after.economy.gold,75);assert.equal(after.inventory.slots.filter(Boolean).length,1);assert.equal(after.inventory.slots[0]?.definitionId,'health_potion');});
