import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const deps = {};
try {
  for (const module of ['data/statuses', 'data/relics', 'data/player', 'models/Combatants', 'models/types']) {
    Object.assign(deps, await server.ssrLoadModule(`/src/${module}.ts`));
  }
} finally { await server.close(); }
const source = ts.createSourceFile('debugMode.ts', fs.readFileSync('src/debug/debugMode.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const names = ['selectDebugStat', 'setSensitivityLevelForDebug', 'sensitivityLevelForDebug', 'setMutableNumber',
  'applyStrongDebugPreset', 'applySensitivityDebugPreset', 'addAllRelicsForDebug', 'refreshBattleScene', 'refreshRelicsForDebug'];
const declarations = source.statements.filter(node => names.includes(node.name?.text)
  || (ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText(source) === 'DEBUG_PRESETS')));
const code = ts.transpileModule(declarations.map(node => node.getText(source)).join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
let enabled = true;
const run = { relicIds: [] };
Object.assign(deps, { isDebugMode: () => enabled, RUN_STATE: run });
const api = new Function(...Object.keys(deps), `${code}; return { ${names.join(',')} };`)(...Object.values(deps));
const player = () => new deps.Player(deps.PLAYER_DEFINITION);
const scene = () => ({ player: player() });
const selection = () => ({ selectedIds: new Set(), entries: new Map(['a', 'b', 'c', 'd', 'e', 'f'].map(id => [id, { setSelected() {} }])) });
const selected = state => [...state.selectedIds].sort();

test('Shift selects forward/backward ranges, shrinks from the same anchor, and Ctrl+Shift adds ranges', () => {
  const s = selection();
  api.selectDebugStat(s, 'b', false, false);
  api.selectDebugStat(s, 'e', false, true);
  assert.deepEqual(selected(s), ['b', 'c', 'd', 'e']);
  api.selectDebugStat(s, 'c', false, true);
  assert.deepEqual(selected(s), ['b', 'c']);
  api.selectDebugStat(s, 'a', false, true);
  assert.deepEqual(selected(s), ['a', 'b']);
  api.selectDebugStat(s, 'e', true, false);
  api.selectDebugStat(s, 'f', true, true);
  assert.deepEqual(selected(s), ['a', 'b', 'e', 'f']);
  assert.equal(s.primaryId, 'f'); assert.equal(s.anchorId, 'e');
});

test('Ctrl toggles rows, plain click resets, and initial Shift selects one row', () => {
  const s = selection();
  api.selectDebugStat(s, 'c', false, true);
  assert.deepEqual(selected(s), ['c']);
  api.selectDebugStat(s, 'd', true, false);
  api.selectDebugStat(s, 'c', true, false);
  assert.deepEqual(selected(s), ['d']);
  api.selectDebugStat(s, 'a', false, false);
  assert.deepEqual(selected(s), ['a']);
});

test('all development levels update both prerequisites from config, including lowering and resetting', () => {
  const p = player(); p.orgasmCount = 37;
  for (const part of deps.EP_DAMAGE_PARTS) {
    for (const level of [5, 2, 0, 1, 3, 4]) {
      api.setSensitivityLevelForDebug(p, part, level);
      const config = deps.PART_SENSITIVITY_LEVELS[level];
      assert.equal(p.orgasmByPart[part], config?.requiredOrgasmCount ?? 0);
      assert.equal(p.epDamageByPart[part], config?.requiredEpDamage ?? 0);
      assert.equal(api.sensitivityLevelForDebug(p, part), level);
      assert.equal([...p.statuses.keys()].filter(id => id.startsWith(`${part}SensitivityLv`)).length, level > 0 ? 1 : 0);
    }
  }
  assert.equal(p.orgasmCount, 37, 'part progress must not alter the independent relic counter');
  const config = deps.PART_SENSITIVITY_LEVELS[2], saved = { ...config };
  try {
    Object.assign(config, { requiredOrgasmCount: 75, requiredEpDamage: 333, conditionMode: 'and' });
    api.setSensitivityLevelForDebug(p, 'V', 2);
    assert.equal(p.orgasmByPart.V, 75); assert.equal(p.epDamageByPart.V, 333);
  } finally { Object.assign(config, saved); }
});

test('strong preset sets both current/max HP and energy and updates HUD once', () => {
  const s = scene(); let updates = 0; s.updateHud = () => updates++;
  api.applyStrongDebugPreset(s);
  assert.deepEqual([s.player.hp, s.player.maxHp, s.player.energy, s.player.maxEnergy], [1000, 1000, 20, 20]);
  assert.equal(updates, 1);
  s.player.startTurn(); assert.equal(s.player.energy, 20);
});

test('sensitivity preset sets every part, replaces lower arousal statuses, and is idempotent', () => {
  const s = scene(); s.player.addStatus('Horny'); s.player.addStatus('InHeat'); s.player.addStatus('Focused');
  api.applySensitivityDebugPreset(s); api.applySensitivityDebugPreset(s);
  for (const part of deps.EP_DAMAGE_PARTS) {
    assert.equal(api.sensitivityLevelForDebug(s.player, part), 5);
    assert.equal(s.player.orgasmByPart[part], deps.PART_SENSITIVITY_LEVELS[5].requiredOrgasmCount);
    assert.equal(s.player.epDamageByPart[part], deps.PART_SENSITIVITY_LEVELS[5].requiredEpDamage);
  }
  assert.equal(s.player.orgasmCount, 1200);
  assert.equal(s.player.statuses.get('DesperateToCum'), 1);
  assert.equal(s.player.hasStatus('Horny'), false); assert.equal(s.player.hasStatus('InHeat'), false);
  assert.equal(s.player.hasStatus('Focused'), true);
});

test('full relics includes newly defined relics, updates run ownership, and rebuilds once without duplicates', () => {
  const s = scene(); let reindexes = 0, rebuilds = 0;
  s.indexPlayerRelics = () => reindexes++; s.createRelicHud = () => rebuilds++;
  const first = s.player.relicIds[0];
  deps.RELIC_DEFINITIONS.testNewRelic = { id: 'testNewRelic' };
  try {
    api.addAllRelicsForDebug(s); api.addAllRelicsForDebug(s);
    const expected = Object.values(deps.RELIC_DEFINITIONS).map(r => r.id).sort();
    assert.deepEqual([...s.player.relicIds].sort(), expected);
    assert.deepEqual([...run.relicIds].sort(), expected);
    assert.equal(s.player.relicIds[0], first, 'keep the existing ownership order');
    assert.equal(reindexes, 2); assert.equal(rebuilds, 2);
  } finally { delete deps.RELIC_DEFINITIONS.testNewRelic; run.relicIds = []; }
});

test('presets cannot mutate state when debug mode is disabled', () => {
  const s = scene(), before = JSON.stringify(s.player);
  enabled = false;
  try {
    api.applyStrongDebugPreset(s); api.applySensitivityDebugPreset(s); api.addAllRelicsForDebug(s);
    assert.equal(JSON.stringify(s.player), before);
  } finally { enabled = true; }
});
