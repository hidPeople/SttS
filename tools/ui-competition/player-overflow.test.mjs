import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerOverflow } from './player-overflow.js';
import { CONFIG } from './config.js';

test('playbacks vary order and volume, while preserving right-biased bounded outlets', () => {
  let seed=12345;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
  const plans=Array.from({length:100},()=>createPlayerOverflow(random));
  const orders=new Set();
  for(const plan of plans){
    assert.equal(plan.length,CONFIG.playerDrain.outletCount);
    orders.add(plan.map((o,i)=>({i,at:o.delay+o.cycle*.68})).sort((a,b)=>a.at-b.at).map(o=>o.i).join());
    for(const outlet of plan){
      assert.ok(outlet.position>=0&&outlet.position<=1);
      for(const key of ['delay','cycle','radius','drift']){
        assert.ok(outlet[key]>=CONFIG.playerDrain[key][0]&&outlet[key]<=CONFIG.playerDrain[key][1]);
      }
    }
  }
  assert.ok(orders.size>1);
  const positions=plans.flat().map(o=>o.position);
  assert.ok(positions.some(x=>x<.25));
  assert.ok(positions.filter(x=>x>.5).length>positions.length*.6);
  assert.notDeepEqual(plans[0],plans[1]);
});
