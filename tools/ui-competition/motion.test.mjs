import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleMotion } from './motion.js';

test('player reset preserves every reserve floor, including 0 and 100%', () => {
  for (const floor of [0, .32, .95, 1]) {
    const base = { hp: .72, ep: Math.max(.78, floor), floor };
    let previous = 1;
    for (let step = 0; step <= 100; step++) {
      const frame = sampleMotion('playerReset', step / 100, base);
      assert.ok(frame.ep >= floor && frame.ep <= previous);
      if (step > 0 && step < 100) assert.ok(frame.playerOut > 0);
      previous = frame.ep;
    }
    assert.equal(sampleMotion('playerReset', 1, base).ep, floor);
  }
});

test('enemy reset has two bursts separated by a stable pause', () => {
  const base = { hp: .72, ep: .78, floor: .32 };
  const frame = p => sampleMotion('enemyReset', p, base);
  assert.equal(frame(0).enemyEp, 1);
  assert.equal(frame(.25).enemyOut.length, 1);
  assert.equal(frame(.5).enemyEp, .48);
  assert.equal(frame(.5).enemyEpFromMax, true);
  assert.equal(frame(.75).enemyEpFromMax, true);
  assert.equal(sampleMotion('charge', .5, base).enemyEpFromMax, false);
  assert.equal(frame(.5).enemyOut.length, 0);
  assert.equal(frame(.58).enemyEp, .48);
  assert.equal(frame(.75).enemyOut.length, 1);
  assert.equal(frame(1).enemyEp, 0);
  assert.equal(frame(1).enemyOut.length, 0);
  assert.equal(frame(1).ep, base.ep);
});

test('HP damage trail catches up and healing cannot exceed max', () => {
  const base = { hp: .9, ep: .78, floor: .32 };
  const damage = sampleMotion('damage', .35, base);
  assert.ok(damage.hpTrail > damage.hp);
  const end = sampleMotion('damage', 1, base);
  assert.equal(end.hpTrail, end.hp);
  assert.equal(sampleMotion('heal', 1, base).hp, 1);
  assert.equal(sampleMotion('damage', 1, { ...base, hp: .1 }).hp, 0);
});

test('block absorbs first, breaking before excess HP damage; exact absorption preserves HP',()=>{
  const stats={playerMaxHp:50},base={hp:.72,ep:.78,floor:.32,block:5,damage:16};
  const at=(p,b=base)=>sampleMotion('damage',p,b,stats);
  assert.equal(at(.2).hp,base.hp);
  assert.ok(at(.2).block<5&&at(.2).block>0);
  const breaking=at(.35);
  assert.equal(breaking.block,0);assert.equal(breaking.hp,base.hp);
  assert.ok(breaking.blockBreak>0&&breaking.blockBreak<1);
  assert.ok(at(.6).hp<base.hp);assert.ok(at(.6).hpTrail>at(.6).hp);
  const end=at(1);
  assert.equal(end.hp,.5);assert.equal(end.hpTrail,.5);assert.equal(end.block,0);
  assert.equal(end.absorbed+end.hpDamage,base.damage);
  assert.equal(end.enemyHp,base.hp);
  for(const block of [16,24,75]){
    const guarded=at(1,{...base,block});
    assert.equal(guarded.hp,base.hp);assert.equal(guarded.block,block-16);
    assert.equal(guarded.hpImpact,0);
  }
  assert.ok(at(.1,{...base,block:0}).hp<base.hp);
  assert.equal(at(1,{...base,hp:.1}).hp,0);
});
