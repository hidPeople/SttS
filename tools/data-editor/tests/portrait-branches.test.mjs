import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { readBranchCatalog, branchPreview, importBranch } from '../portrait-branches.mjs';
import { addPortraitPlacement } from '../portrait-preview-config.mjs';

const rules = {
  states: ['Death'], statuses: ['A', 'B', 'C'], connections: [], relics: [], events: ['hit'],
  cards: ['play', 'copy'], percentComparisons: ['HP', 'EP'], interactions: ['hover'], ThresholdOrder: 'stricter',
};
test('placement insertion preserves draft edits and comments, and editing an alias opens its physical source', () => {
  const source = [
    'const DEFAULT_CHARACTER_PLACEMENT = { displayHeight: 600, offsetX: 0, offsetY: 0 };',
    'const CHARACTER_PORTRAITS = {',
    '  A: { displayHeight: 850 }, // keep height',
    "  Alias: 'A',",
    '};',
  ].join('\r\n');
  const expected = source.replace('  Alias:', '  B: { displayHeight: 600, offsetX: 0, offsetY: 0 },\r\n  Alias:');
  const added = addPortraitPlacement(source, 'B', ['missing', 'A']);
  assert.equal(added.source, expected);
  assert.deepEqual(addPortraitPlacement(expected, 'Alias'), { id: 'A', source: expected });
  assert.deepEqual(addPortraitPlacement(expected, 'B'), added);
});
function catalog(...ids) {
  return { player: 'P', categories: ['normal', 'event'], rules, aliases: { copy: 'play' },
    assets: Object.fromEntries(ids.map(id => [id, { source: id + '.png' }])),
    reserved: new Set(ids.map(id => id.toLowerCase())) };
}

test('derived placements follow the whole parent family while new normal variants precede hover', () => {
  const ids = ['P_event_A_idle_1','P_event_A_hover_1','P_event_A_hover_2','P_event_B_1'];
  const source = 'const DEFAULT_CHARACTER_PLACEMENT = { displayHeight:700 };\nconst CHARACTER_PORTRAITS = {\n'
    + ids.map(id => '  ' + id + ': {},').join('\n') + '\n};';
  for (const [id, previous] of [['P_event_A_hit_1',ids[2]], ['P_event_A_idle_2',ids[0]], ['P_event_A_hover_3',ids[2]]]) {
    const added = addPortraitPlacement(source, id, [ids[0]]);
    assert.ok(added.source.includes(previous + ': {},\n  ' + id + ':'));
  }
});

test('shows the winning subset, all variants, real hover overrides and one-factor branches', () => {
  const c = catalog('P_normal_idle_1', 'P_event_A_idle_1', 'P_event_A_B_1', 'P_event_A_B_2', 'P_event_A_B_hover_1');
  const a = branchPreview(c, 'event', ['A']);
  assert.equal(a.choices.some(choice => choice.tag === 'hover'), false);
  assert.deepEqual(a.current.hover, []);
  assert.equal(a.filenames[0], 'P_event_A_idle_2.png');
  assert.deepEqual(a.branches.map(b => b.tag), ['B']);
  const abc = branchPreview(c, 'event', ['A', 'B', 'C']);
  assert.deepEqual(abc.current.normal.map(p => p.id), ['P_event_A_B_1', 'P_event_A_B_2']);
  assert.deepEqual(abc.current.missing, ['C']);
  assert.equal(abc.current.hover[0].id, 'P_event_A_B_hover_1');
  assert.equal(abc.filenames[0], 'P_event_A_B_C_1.png');
  assert.equal(branchPreview(c, 'event').current.normal[0].id, 'P_normal_idle_1');
});

test('branches require the old and new factors on the same winning image, including hover-only art', () => {
  const c = catalog('P_normal_A_1', 'P_normal_B_1', 'P_normal_B_hit_1', 'P_normal_B_C_hover_1');
  const preview = (...tags) => branchPreview(c, 'normal', tags);
  assert.deepEqual(preview('B', 'A').current.missing, ['B']);
  const branches = preview('B').branches;
  assert.deepEqual(branches.map(b => b.tag).sort(), ['C', 'hit']);
  const hoverOnly = branches.find(b => b.tag === 'C');
  assert.deepEqual(hoverOnly.normal, []);
  assert.equal(hoverOnly.hover[0].id, 'P_normal_B_C_hover_1');
});

test('branches can tighten a stack condition, but cannot drop it or replace a previous card', () => {
  const c = catalog('P_normal_A_1', 'P_normal_Agte2_1', 'P_normal_Agte4_1', 'P_normal_play_1', 'P_normal_other_1');
  c.rules = { ...rules, cards: [...rules.cards, 'other'] };
  const tags = selected => branchPreview(c, 'normal', [selected]).branches.map(b => b.tag);
  assert.deepEqual(tags('Agte2'), ['Agte4']);
  assert.deepEqual(tags('play'), []);
});

test('uses activation order, aliases, status stacks, HP-derived Death and free thresholds', () => {
  const c = catalog('P_normal_idle_1', 'P_normal_play_A_1', 'P_normal_A_play_1',
    'P_normal_A_gte5_1', 'P_normal_A_1', 'P_Death_1');
  c.assets.P_Death_1.source = 'P_normal_A_1.png';
  const preview = (...tags) => branchPreview(c, 'normal', tags);
  assert.equal(preview('copy', 'A').current.normal[0].id, 'P_normal_play_A_1');
  assert.equal(preview('A', 'play').current.normal[0].id, 'P_normal_A_play_1');
  assert.equal(preview('Agte5').filenames[0], 'P_normal_A_gte5_2.png');
  assert.deepEqual(preview('Agte7').current.missing, ['Agte7']);
  assert.equal(preview('HPlte0per').current.normal[0].image, 'P_normal_A_1.png');
  assert.throws(() => preview('EPgt100per'));
  assert.throws(() => preview('../outside'));
});

test('applied factors identify removable inputs for fallback art, aliases, thresholds and derived states', () => {
  const c = catalog('P_normal_idle_1', 'P_normal_A_idle_1', 'P_normal_Agte2_1', 'P_normal_play_1', 'P_Death_1');
  const applied = (...tags) => branchPreview(c, 'normal', tags).current.appliedFactors;
  assert.deepEqual(applied('A','hit'), [{ tag: 'A', inputs: ['A'] }, { tag: 'idle', inputs: [] }]);
  assert.deepEqual(applied('Agte5'), [{ tag: 'Agte2', inputs: ['Agte5'] }]);
  assert.deepEqual(applied('copy'), [{ tag: 'play', inputs: ['copy'] }]);
  assert.deepEqual(applied('HPlte0per'), [{ tag: 'Death', inputs: ['HPlte0per'] }]);
  assert.deepEqual(applied('HPlte50per','Death'), [{ tag: 'Death', inputs: ['Death'] }]);
});

test('imports only the chosen PNG, preserves bytes, builds a thumbnail and rejects stale writes', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'stts-portrait-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const data = path.join(root, 'src/data'), folder = path.join(root, 'image/character');
  await fs.mkdir(data, { recursive: true });
  await fs.mkdir(folder, { recursive: true });
  const sources = {
    player: "const PLAYER_DEFINITION = { id: 'P' };",
    eventBattles: 'const EVENT_BATTLES = {};',
    portraitFactors: 'const PORTRAIT_FACTORS = ' + JSON.stringify(rules),
    characterPortraits: "const DEFAULT_CHARACTER_PLACEMENT = {}; const CHARACTER_PORTRAIT_CARD_ALIASES = {}; const CHARACTER_PORTRAITS = { P_normal_A_1:'P_normal_idle_1' };",
  };
  for (const [name, source] of Object.entries(sources)) await fs.writeFile(path.join(data, name + '.ts'), source);
  const png = await sharp({ create: { width: 24, height: 18, channels: 4, background: '#ff000080' } }).png().toBuffer();
  const name = 'P_normal_A_2.png';
  const save = bytes => importBranch(root, 'normal', ['A'], false, name, bytes);
  await assert.rejects(save(Buffer.from('invalid image')));
  assert.deepEqual(await fs.readdir(folder), []);
  await assert.rejects(importBranch(root, 'normal', ['A'], false, name, png, [], {
    registerPlacement: async () => { throw Error('draft write failed'); },
  }), /draft write failed/);
  assert.deepEqual(await fs.readdir(folder), []);
  assert.deepEqual(await fs.readdir(path.join(root, 'image/gallery-thumbnails/character')), []);
  await save(png);
  await assert.rejects(save(png), /登録名/);
  assert.deepEqual(await fs.readFile(path.join(folder, name)), png);
  const thumbnail = await sharp(await fs.readFile(path.join(root, 'image/gallery-thumbnails/character/P_normal_A_2.webp'))).metadata();
  assert.deepEqual([thumbnail.format, thumbnail.width, thumbnail.height], ['webp', 8, 6]);
  assert.equal(branchPreview(await readBranchCatalog(root), 'normal', ['A']).current.normal[0].image, name);
});
