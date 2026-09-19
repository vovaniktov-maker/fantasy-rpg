import test from 'node:test';
import assert from 'node:assert/strict';
import { GameSession } from '../../src/game/GameSession.js';
import { GameBridge } from '../../src/game/bridge/GameBridge.js';
import { createInitialGameState } from '../../src/domain/state/GameState.js';
import { LocalSaveRepository, type StorageLike } from '../../src/domain/save/saveRepository.js';

class MemoryStorage implements StorageLike {
  map = new Map<string,string>(); writes = 0;
  getItem(k:string){return this.map.get(k) ?? null;} setItem(k:string,v:string){this.writes++;this.map.set(k,v);} removeItem(k:string){this.map.delete(k);}
}
function make(now=()=>1000){const storage=new MemoryStorage();const repo=new LocalSaveRepository(storage,createInitialGameState,new Set(['health_potion','energy_potion']));return {storage,session:new GameSession(repo,new GameBridge(),{now})};}

test('potions are instant consumables with cooldown',()=>{let time=1000;const {session}=make(()=>time);const s=session.startNew();s.player.hp=40;s.inventory.slots[0]={instanceId:'h',definitionId:'health_potion',quantity:2};session.replaceState(s);assert.equal(session.usePotion('health'),true);assert.equal(session.getState().player.hp,90);assert.equal(session.getState().inventory.slots[0]?.quantity,1);assert.equal(session.usePotion('health'),false);time=2000;assert.equal(session.usePotion('health'),true);assert.equal(session.getState().player.hp,100);assert.equal(session.getState().inventory.slots[0],null);});

test('death restores checkpoint snapshot exactly',()=>{const {session}=make();const s=session.startNew();s.progression.level=5;s.skills.learned.assassin_precision=1;s.inventory.slots[0]={instanceId:'h',definitionId:'health_potion',quantity:3};session.replaceState(s);session.onCheckpoint('forest',12,34);const cp=structuredClone(session.getState());const later=structuredClone(cp);later.player.hp=0;later.progression.level=9;later.inventory.slots[0]=null;session.replaceState(later);assert.deepEqual(session.onDeath(),cp);});

test('repeat hideout changes seed and keeps progression',()=>{const {session}=make();const s=session.startNew();s.progression.level=4;session.replaceState(s);session.enterHideout();const a=structuredClone(session.getState());session.enterOutpost();session.enterHideout();const b=session.getState();assert.notEqual(a.runSeed,b.runSeed);assert.equal(b.world.hideoutRunsStarted,a.world.hideoutRunsStarted+1);assert.deepEqual(b.progression,a.progression);});
