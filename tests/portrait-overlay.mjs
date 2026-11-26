import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { ActionOverlayHits, chooseOverlayFiles, overlayRules, portraitMarkStrength, savedPortraitMarks } = await server.ssrLoadModule('/src/models/portraitOverlay.ts');
await server.close();

test('marks retain full strength through the next turn and expire on the configured turn', () => {
  const ages = [0, 1, 2, 3, 4, 5, 6];
  assert.deepEqual(ages.map(age => portraitMarkStrength(age, 5)), [1, 1, .75, .5, .25, 0, 0]);
  assert.deepEqual(ages.slice(0, 3).map(age => portraitMarkStrength(age, 1)), [1, 1, 0]);
});

test('slime variants use their own pool and male peaks use the trait, including prologue enemies', () => {
  for (const [id, material] of [['slime', 'slime_blue'], ['slimeColony', 'slime_blue'], ['aphrodisiacSlime', 'slime_pink']]) {
    assert.deepEqual(overlayRules('enemyHit', { id }).map(r => r.material), [material]);
    assert.deepEqual(overlayRules('enemyOrgasm', { id }), []);
  }
  assert.equal(overlayRules('enemyOrgasm', { id: 'prologueGrunt', traits: ['male'] })[0].material, 'milk');
});

test('milk prefers action parts, then the peaked enemy connections, then one side of M', () => {
  const rule = overlayRules('enemyOrgasm', { traits: ['male'] })[0];
  for (const peakFirst of [false, true]) {
    const batches = [], action = new ActionOverlayHits(placements => batches.push(placements.map(p => p.part)));
    if (peakFirst) action.peak(rule, ['A']);
    action.hit(['B', 'V']);
    action.hit(['B']);
    if (!peakFirst) action.peak(rule, ['A']);
    action.finish();
    assert.deepEqual(batches, [['B', 'V']]);
  }
  const marks = [], action = new ActionOverlayHits(placements => marks.push(...placements.map(p => [p.part, p.besideM])));
  action.peak(rule, ['A', 'A']);
  action.peak(rule, ['M']);
  action.peak(rule, []);
  action.peak({ ...rule, unconnectedMOffsetRatio: undefined }, []);
  action.finish();
  assert.deepEqual(marks, [['A', undefined], ['M', undefined], ['M', true]]);
});

test('simultaneous draws can reassign an earlier choice to satisfy every part', () => {
  const files = ['a','b','c'], parts = ['M','B','V'];
  for (const m of files) for (const b of files) for (const v of files) {
    const previous = new Map([['M',m],['B',b],['V',v]]);
    for (const random of [0,.5,.99]) {
      const drawn = chooseOverlayFiles(files, parts, previous, () => random);
      assert.ok(drawn.every((file,i) => file !== previous.get(parts[i])));
      assert.equal(new Set(drawn).size, new Set(previous.values()).size === 1 ? 2 : 3);
    }
  }
});

test('a missing group skips placement, a single variant remains usable, and expired history releases its exclusion', () => {
  const previous = new Map([['M','a']]);
  assert.deepEqual(chooseOverlayFiles([], ['M'], previous), []);
  assert.deepEqual(chooseOverlayFiles(['a'], ['M','B'], previous), ['a','a']);
  assert.deepEqual(chooseOverlayFiles(['a','b'], ['M'], previous), ['b']);
  assert.deepEqual(chooseOverlayFiles(['a','b'], ['M'], new Map(), () => 0), ['a']);
});

test('old saves and expired or invalid marks load safely; valid stamps preserve their variant and jitter', () => {
  const m = { material: 'slime_blue', file: 'slime_blue_2.png', part: 'B', dx: .2, dy: .9, blend: .4, size: .6, age: 4 };
  assert.deepEqual(savedPortraitMarks(undefined), []);
  assert.deepEqual(savedPortraitMarks([m, { ...m, age: 5 }, { ...m, part: '?' }, { ...m, dx: -1 }]), [m]);
});
