import test from 'node:test';
import assert from 'node:assert/strict';
import { battleDuration, sampleBattleMotion, BATTLE_TIMING } from './battle-motion.js';
import { CONFIG } from './config.js';
import { sampleMotion } from './motion.js';
const stats={playerMaxHp:50,playerMaxEp:10,enemyMaxHp:54,enemyMaxEp:12,drainRatio:1};
const base={hp:.72,ep:.78,floor:.32};
const at=(action,ms,initial=base)=>sampleBattleMotion(action,ms/battleDuration(action,initial,stats),initial,stats);

test('player overflows at full EP during reserve rise, then resets immediately',()=>{
  const fill=at('playerBattle',160);
  assert.ok(fill.ep>.8&&fill.ep<1);
  assert.equal(fill.numbers.playerEp,10);
  const middle=at('playerBattle',720);
  assert.equal(middle.ep,1);
  assert.ok(middle.floor>.3&&middle.floor<.4);
  assert.equal(at('playerBattle',1119).ep,1);
  assert.ok(middle.playerOut>0);
  const reset=at('playerBattle',1121);
  assert.equal(reset.ep,.4);assert.equal(reset.floor,.4);
  assert.equal(reset.playerOut,0);
});
test('enemy bursts retain standalone speed and overlap HP drain without delaying it',()=>{
  const burstAt=p=>at('enemyBattle',320+CONFIG.durations.enemyReset*(p-CONFIG.enemyPulses[0].start));
  const first=burstAt(.27);
  assert.ok(first.enemyEp<1&&first.enemyEp>.48);assert.equal(first.enemyOut.length,1);
  assert.equal(first.enemyEpFromMax,true);assert.equal(first.drainProgress,-1);
  assert.equal(first.numbers.enemyHp,39);
  const gap=burstAt(.5);
  assert.equal(gap.enemyEp,.48);assert.deepEqual(gap.enemyOut,[]);
  const second=burstAt(.76);
  assert.ok(second.enemyEp<.48&&second.enemyEp>0);assert.equal(second.enemyOut.length,1);
  assert.ok(second.drainProgress>0);assert.equal(second.phase,'hpDrain');
  assert.ok(second.enemyHp<39/54);assert.ok(second.hp>36/50);
  assert.equal(at('enemyBattle',1119).drainProgress,-1);
  const start=at('enemyBattle',1121);
  assert.equal(start.numbers.enemyHp,27);assert.equal(start.numbers.playerHp,48);
  assert.ok(start.enemyHp>27/54);assert.ok(start.hp<48/50);
  assert.equal(start.enemyEp,.48);
  for(const p of [.2,.3,.45,.7,.82,.95]){
    const standalone=sampleMotion('enemyReset',p,base),battle=burstAt(p);
    assert.ok(Math.abs(battle.enemyEp-standalone.enemyEp)<1e-10);
    assert.equal(battle.enemyOut.length,standalone.enemyOut.length);
  }
  const end=at('enemyBattle',1700);
  assert.equal(end.enemyHp,27/54);assert.equal(end.hp,48/50);
  assert.equal(at('enemyBattle',2200).enemyEp,0);
  assert.deepEqual(at('enemyBattle',2200).enemyOut,[]);
});
test('HP clamp and reserve cap follow ordinary battle rules',()=>{
  assert.equal(at('enemyBattle',2000,{...base,hp:.99}).numbers.playerHp,50);
  assert.equal(at('enemyBattle',2000,{...base,hp:.1}).numbers.enemyHp,0);
  const reset=at('playerBattle',801,{...base,ep:1,floor:.95});
  assert.equal(reset.floor,.9);assert.equal(reset.ep,.9);
});
test('already-full EP skips filling; a defeated enemy does not drain',()=>{
  assert.equal(at('playerBattle',0,{...base,ep:1}).phase,'playerPeak');
  assert.equal(at('playerBattle',801,{...base,ep:1}).phase,'playerRecovered');
  const dead=at('enemyBattle',1500,{...base,hp:0});
  assert.equal(dead.phase,'enemyDefeated');assert.equal(dead.hp,0);
});
test('overflow continues at the reserve cap without extending the battle timeline',()=>{
  const middle=at('playerBattle',720,{...base,ep:1,floor:.9});
  assert.equal(middle.ep,1);assert.equal(middle.floor,.9);assert.ok(middle.playerOut>0);
  assert.equal(at('playerBattle',801,{...base,ep:1,floor:.9}).playerOut,0);
  assert.equal(battleDuration('playerBattle',base,stats),320+800+BATTLE_TIMING.endHold);
  assert.equal(battleDuration('enemyBattle',base,stats),320+800+1120+BATTLE_TIMING.endHold);
});
