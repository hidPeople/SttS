import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createServer } from 'vite';

const server = await createServer({ resolve: { preserveSymlinks: true }, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const m = {};
try {
  for (const name of ['models/Combatants', 'models/conditions', 'models/comboRules', 'models/localization', 'models/types', 'data/cards', 'data/enemies', 'data/player', 'data/statuses', 'data/flavorCatalog', 'data/bodyParts']) {
    Object.assign(m, await server.ssrLoadModule('/src/' + name + '.ts'));
  }
} finally { await server.close(); }
const { Player, Enemy, CARD_DEFINITIONS: cards, ENEMY_DEFINITIONS: enemies, STATUS_DESCRIPTIONS: statuses, GLOBAL_FLAVORS: global } = m;
const source = ts.createSourceFile('BattleScene.ts', fs.readFileSync('src/scenes/BattleScene.ts', 'utf8'), 99, true);
const cls = source.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'BattleScene');
const names = ['resolveFlavorLines', 'addPlayerEpDamageQuote', 'playerEpDamagePercentOfRange', 'addEnemyDeathNarration', 'enemyDeathNarration', 'matchEnemyDeathNarration', 'enemyDeathNarrationStatusesMatch', 'enemyDeathNarrationIntentMatches'];
const code = ts.transpileModule('class Harness {' + names.map(name => cls.members.find(n => n.name?.getText(source) === name).getText(source)).join('\n') + '}', { compilerOptions: { target: 99 } }).outputText;
const deps = { ...m, l: m.text };
const Harness = new Function(...Object.keys(deps), code + ';return Harness;')(...Object.values(deps));
function fresh(id = 'grunt') {
  const h = new Harness();
  h.player = new Player(m.PLAYER_DEFINITION);
  h.enemies = [new Enemy(enemies[id]), new Enemy(enemies.grunt)];
  h.enemy = h.enemies[0];
  h.playerEffectiveMaxEp = () => 100;
  h.playerEpReserveValue = 0;
  h.battleEventContext = c => ({ source: 'card', sourceName: '', player: h.player, actor: h.player, enemies: h.enemies, selectedEnemy: h.enemy, ...c });
  h.resolve = (entries, c = {}) => h.resolveFlavorLines(entries, h.battleEventContext(c));
  return h;
}
const quote = lines => lines.filter(x => x.kind === 'quote');
const narration = lines => lines.filter(x => x.kind === 'narration');
const flag = valueKey => ({ kind: 'flavorValue', operator: 'eq', valueKey, value: true });
const line = (text, conditions) => ({ kind: 'quote', text, conditions });

test('C02: Reflex Caress uses turn history, not arousal, old results or card acquisition', () => {
  const entries = cards.reflexCaress.flavors['card.play'];
  for (const turnsCount of [0,1,5]) for (const aroused of [false,true]) for (const occupancy of [undefined,'InsertM','IntrudedM','InsertV','InsertA']) {
    const h = fresh();
    h.player.orgasmsThisBattle = 12;
    if (aroused) h.player.addStatus('Horny');
    if (occupancy) h.enemy.addStatus(occupancy);
    const ctx = { flavorValues: { playerOrgasmsThisTurn: turnsCount } };
    const selected = h.resolve(entries, ctx);
    if (turnsCount === 0) {
      assert.equal(quote(selected).length, 0);
      assert.deepEqual(narration(selected), entries[0].lines);
    } else {
      assert.deepEqual(selected, h.resolve(entries.slice(1), ctx), 'all existing branches remain available after an orgasm');
      assert.ok(quote(selected).length > 0);
    }
    assert.deepEqual(h.resolve(entries, { ...ctx, cardInstance: { definition: cards.reflexCaress, uid: 'ordinary-draw' } }), selected);
  }
});

test('line eligibility filters a random pool; empty pools fall through per kind; suppression remains explicit', () => {
  const h = fresh(), eligible = flag('allowed');
  const conditional = line('conditional', [eligible]), common = line('common');
  assert.deepEqual(h.resolve([conditional, common], { flavorValues: { allowed: false } }), [common]);
  assert.deepEqual(h.resolve([conditional, common], { flavorValues: { allowed: true } }), [conditional, common]);
  const entries = [{ lines: [conditional, { kind: 'narration', text: 'original narration' }] }, { lines: [common] }];
  const rejected = h.resolve(entries);
  assert.deepEqual(quote(rejected), [common]);
  assert.equal(narration(rejected)[0].text, 'original narration');
  assert.deepEqual(quote(h.resolve([{ suppressKinds: ['quote'], lines: [conditional] }, { lines: [common] }])), []);
});

test('S01/S20: EP reactions classify the immediate source, keep all strength bands, and gate enemy-only lines', () => {
  const h = fresh(); let eventContext;
  h.addGlobalFlavorEvent = (_event, c) => { eventContext = c; };
  for (const [source, key] of [['card', 'Card'], ['enemyIntent', 'Enemy'], ['relic', 'Relic'], ['status', 'Status'], ['system', 'System']]) {
    h.addPlayerEpDamageQuote(20, h.battleEventContext({ source, damageOrigin: 'card', card: cards.strike }));
    const values = eventContext.flavorValues;
    assert.equal(values.epDamagePercentOfRange, 20);
    assert.deepEqual(Object.entries(values).filter(([k,v]) => k.startsWith('epDamageFrom') && v).map(([k]) => k), ['epDamageFrom' + key]);
    for (const gagged of [false, true]) {
      h.enemies[1].statuses.clear(); if (gagged) h.enemies[1].addStatus('IntrudedM');
      const candidates = h.resolve(global['battle.playerEpDamageQuote'], eventContext);
      assert.equal(candidates.some(x => x.text.ja.includes('あっ、そこ')), source === 'enemyIntent');
      assert.ok(candidates.length >= 9);
      assert.ok(candidates.every(x => !x.text.ja.includes('また')));
      assert.ok(candidates.every(x => !/careful|not so hard/.test(x.text.en)));
    }
  }
});

test('MultipleOrgasmsTorture: connection swaps one candidate while retaining both common alternatives', () => {
  const entries = statuses.MultipleOrgasmsTorture.triggers.find(t => t.flavors?.['status.trigger']).flavors['status.trigger'];
  for (const occupied of [undefined, 'InsertV', 'InsertA', 'InsertM', 'IntrudedV', 'IntrudedA', 'IntrudedM']) {
    for (const extraGagged of [false, true]) {
      const h = fresh();
      if (occupied) h.enemies[1].addStatus(occupied);
      if (extraGagged) h.enemy.addStatus('IntrudedM');
      const connected = !!occupied || extraGagged;
      const gagged = extraGagged || occupied?.endsWith('M') === true;
      const lines = h.resolve(entries);
      const candidates = quote(lines);
      assert.equal(candidates.length, 3);
      assert.ok(candidates.some(l => l.text.en.includes('A-Again')));
      assert.ok(candidates.some(l => l.text.en.includes('N-Not')));
      assert.equal(candidates.some(l => l.text.en.includes('hitting') && l.text.ja.includes('当たって')), connected);
      assert.equal(candidates.some(l => l.text.en.includes('overwhelming') && l.text.ja.includes('押し寄せて')), !connected);
      assert.ok(candidates.every(l => l.text.ja.startsWith('「（') === gagged));
      assert.equal(narration(lines).length, 1);
    }
  }
  const h = fresh();
  h.enemies[1].addStatus('InsertM'); h.enemies[1].hp = 0;
  const candidates = quote(h.resolve(entries));
  assert.equal(candidates.length, 3);
  assert.ok(candidates.some(l => l.text.en.includes('overwhelming')));
  assert.ok(candidates.every(l => !l.text.en.includes('hitting')));
});

test('S03: bite only permits the mouth occupant, but does not create an insertion-route restriction', () => {
  const h = fresh(); h.enemy.addStatus('InsertV');
  assert.equal(m.targetOccupancyFailure(cards.bite, h.enemy, h.enemies), undefined);
  for (const status of ['InsertM', 'IntrudedM']) {
    h.enemies[1].statuses.clear(); h.enemies[1].addStatus(status);
    const failure = m.targetOccupancyFailure(cards.bite, h.enemy, h.enemies);
    assert.equal(failure.enemy, h.enemies[1]); assert.equal(failure.part, 'M');
    assert.equal(m.targetOccupancyFailure(cards.bite, h.enemies[1], h.enemies), undefined);
  }
  h.enemies[1].hp = 0;
  assert.equal(m.targetOccupancyFailure(cards.bite, h.enemy, h.enemies), undefined);
  assert.ok(m.targetOccupancyFailure(cards.blowjob, h.enemy, h.enemies), 'existing oral insertion rule stays strict');
});

test('S04/S05/S16: grunt narration follows the actor, and helplessness takes precedence over invitation', () => {
  const h = fresh();
  const intents = [...enemies.grunt.intents, ...enemies.grunt.intents_E];
  const attacks = intents.filter(i => i.effects.some(e => e.epDamagePartMode === 'actorIntruded'));
  assert.equal(attacks.length, 2);
  for (const part of ['A', 'V']) {
    h.enemy.statuses.clear(); h.enemy.addStatus('Insert' + part);
    h.enemies[1].addStatus('Insert' + (part === 'A' ? 'V' : 'A'));
    for (const intent of attacks) {
      const lines = h.resolve(intent.flavors['enemy.intent'], { source: 'enemyIntent', actor: h.enemy, selectedEnemy: h.enemies[1] });
      for (const lang of ['ja', 'en']) {
        assert.ok(lines[0].text[lang].includes('{' + part + '}'));
        assert.ok(!lines[0].text[lang].includes('{' + (part === 'A' ? 'V' : 'A') + '}'));
      }
    }
  }
  const insertion = enemies.grunt.intents_E[0];
  h.enemy.addStatus('Charm');
  for (const state of ['Fainted', 'Bound']) {
    h.player.statuses.clear(); h.player.addStatus(state); h.player.addStatus('Starvation');
    const lines = h.resolve(insertion.flavors['enemy.intent'], { actor: h.enemy });
    assert.match(lines[0].text.ja, /抵抗できない/);
    assert.doesNotMatch(lines[0].text.ja, /誘われ/);
  }
  h.player.statuses.clear();
  assert.match(h.resolve(insertion.flavors['enemy.intent'], { actor: h.enemy })[0].text.ja, /誘われ/);
  assert.doesNotMatch(JSON.stringify(intents.find(i => i.id === 'fingering').flavors), /酷使|swollen/);
});

test('Aphrodisiac: restored speech and thought require occupancy and retain the common alternative', () => {
  const entries = statuses.Aphrodisiac.flavors['status.apply'];
  const context = { flavorValues: { statusTargetIsPlayer: true } };
  for (const occupied of [undefined, 'InsertV', 'InsertA', 'InsertM', 'IntrudedV', 'IntrudedA', 'IntrudedM']) {
    const h = fresh();
    if (occupied) h.enemies[1].addStatus(occupied);
    // Inspect line eligibility separately from the enclosing Gagged branch.
    const pool = quote(h.resolve(entries[0].lines, context));
    assert.equal(pool.length, 2);
    assert.equal(pool.some(l => l.text.en.includes('Deep inside')), !!occupied);
    assert.equal(pool.some(l => l.text.en.includes('Something')), !occupied);
    assert.ok(pool.some(l => l.text.en.includes('Stop')));
    const selected = quote(h.resolve(entries, context));
    assert.equal(selected.length, 2);
    assert.equal(selected.some(l => l.text.en.includes('Deep inside')), !!occupied);
    assert.ok(selected.every(l => l.text.ja.startsWith('「（') === (occupied?.endsWith('M') === true)));
    h.enemies[1].hp = 0;
    assert.ok(h.resolve(entries, context).every(l => !l.text.en.includes('Deep inside')));
  }
  const h = fresh(); h.enemy.addStatus('InsertM');
  const enemyLines = h.resolve(entries, { flavorValues: { statusTargetIsEnemy: true } });
  assert.equal(quote(enemyLines).length, 0);
  assert.equal(narration(enemyLines).length, 1);
  assert.doesNotMatch(JSON.stringify(enemyLines), /塗り込/);
});

test('S09: result wording about first/both outcomes requires the corresponding result flags', () => {
  // "Together" means both outcomes during the same card, not exact simultaneity.
  // The agreed wording and its scope are recorded in
  // docs/archive/flavor-review-2026-10-16.txt; this test checks flag gating only.
  const firstCards = new Set(), bothCards = new Set();
  for (const id of ['blowjob', 'titjob', 'cowgirlRiding']) {
    for (const playerCummed of [false, true]) for (const enemyCummed of [false, true]) for (const gagged of [false, true]) {
      const h = fresh();
      if (gagged) h.enemies[1].addStatus('InsertM');
      const selected = quote(h.resolve(cards[id].flavors['card.resolved'], { flavorValues: { playerCummed, enemyCummed } }));
      for (const entry of selected) {
        if (/先に|came first|Cumming before/.test(JSON.stringify(entry.text))) {
          firstCards.add(id);
          assert.equal(playerCummed, true, id);
          assert.equal(enemyCummed, false, id);
        }
        if (/一緒に|cumming with/.test(JSON.stringify(entry.text))) {
          bothCards.add(id);
          assert.equal(playerCummed, true, id);
          assert.equal(enemyCummed, true, id);
        }
      }
    }
  }
  assert.deepEqual([...firstCards].sort(), ['blowjob', 'cowgirlRiding']);
  assert.deepEqual([...bothCards], ['titjob']);
});

test('S12/S15: body references use localized part placeholders', () => {
  for (const part of ['A', 'V']) {
    const data = JSON.stringify(statuses['Infested' + part + '_Slime']);
    assert.ok(data.includes('{' + part + '}'));
    assert.ok(!data.includes('{player}の' + part));
  }
});

test('S10/S11/S18: aftermath does not promise continuation; exhaustion and species protests remain compatible with Gagged', () => {
  for (const id of ['feverPiston', 'hazyPiston']) assert.doesNotMatch(JSON.stringify(cards[id].flavors['battle.enemyOrgasm']), /また続ける|リズムを戻す|picks the rhythm|then pushes/);
  for (const id of ['handjob', 'blowjob', 'titjob', 'cowgirlRiding', 'feverPiston', 'hazyPiston']) {
    for (const [enemy, expected] of [['ForcedOrgasmMachine', /玩具/], ['slime', /感触、気持ち悪い/]]) {
      const h = fresh(enemy); h.player.addStatus('MultipleOrgasms'); h.player.addStatus('Bound');
      for (const gagged of [false, true]) {
        if (gagged) h.enemies[1].addStatus('IntrudedM');
        const lines = h.resolve(cards[id].flavors['card.play']);
        assert.match(quote(lines)[0].text.ja, expected);
        assert.equal(quote(lines)[0].text.ja.startsWith('「（'), gagged);
        if (id === 'cowgirlRiding') assert.match(narration(lines)[0].text.ja, /力の入らない/);
      }
    }
  }
  for (const id of ['sharedSensation', 'sensitivityTransfer']) {
    const h = fresh(); h.player.addStatus('MultipleOrgasms'); h.player.addStatus('Bound');
    assert.match(quote(h.resolve(cards[id].flavors['card.play']))[0].text.ja, /はぁっ/);
    h.enemy.definition = { ...h.enemy.definition, maxEp: 0 }; h.enemy.maxEp = 0;
    assert.equal(quote(h.resolve(cards[id].flavors['card.play'])).length, 0);
  }
});

test('S13/S14/S17: death uses the occupied-part snapshot; posture-free narration survives all combinations', () => {
  for (const id of ['slime', 'aphrodisiacSlime', 'slimeColony']) for (let mask = 1; mask < 8; mask++) {
    const h = fresh(id), parts = ['M', 'V', 'A'].filter((_p,i) => mask & (1 << i));
    h.narratedEnemyDefeats = new Set();
    h.enemyDefeatCauses = new Map([[h.enemy, { cause: 'hpDamage', statuses: parts.map(p => 'Intruded' + p), context: h.battleEventContext({}) }]]);
    let text, context;
    h.interpolateFlavorText = (t,c) => { context = c; return t; };
    h.addBattleLog = (_kind,t) => { text = t; };
    h.addEnemyDeathNarration(h.enemy);
    assert.match(text.ja, /connectionParts/);
    for (const lang of ['ja', 'en']) for (const p of parts) assert.ok(context.flavorValues.connectionParts[lang].includes(m.localize(m.bodyPartDefaultName(p), lang)));
    assert.equal(h.enemy.statuses.size, 0, 'parts come from the defeat snapshot, not the cleared state');
  }
  assert.doesNotMatch(JSON.stringify(global['battle.aftershocksAfterConsumption']), /地面|collapses/);
  const cover = enemies.slimeColony.intents.find(i => i.id === 'cover');
  assert.doesNotMatch(JSON.stringify(cover.flavors), /地面|走れ|逃げ切|catches up|slips away/);
});
