import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createServer } from 'vite';

const server = await createServer({ resolve: { preserveSymlinks: true }, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { STATUS_DESCRIPTIONS: statuses } = await server.ssrLoadModule('/src/data/statuses.ts');
const { RELIC_DEFINITIONS: relics } = await server.ssrLoadModule('/src/data/relics.ts');
const { CARD_SYSTEM_TERMS: terms, CARD_BLOCK_CARRY_DESCRIPTION: carry } = await server.ssrLoadModule('/src/data/cardText.ts');
const { cardTermDescription } = await server.ssrLoadModule('/src/models/cardDescription.ts');
const { formatNamedDescription, localize, SETTINGS_STATE, text: l } = await server.ssrLoadModule('/src/models/localization.ts');
const { localizeGameText } = await server.ssrLoadModule('/src/models/gameText.ts');
const { relicTextReplacements } = await server.ssrLoadModule('/src/models/relicRules.ts');
const { BODY_PART_NAMES } = await server.ssrLoadModule('/src/data/bodyParts.ts');
await server.close();

test('body-part names stay lowercase within a sentence and capitalize only at sentence starts', () => {
  for (const definition of BODY_PART_NAMES) for (const name of Object.values(definition.names)) {
    const en = localize(name, 'en'), ja = localize(name, 'ja');
    assert.match(en, /^[a-z]/);
    const capitalized = en[0].toUpperCase() + en.slice(1);
    assert.equal(localizeGameText('Her {part} is described.', 'en', { part: en }), `Her ${en} is described.`);
    for (const prefix of ['', '"', 'Done. ', 'Done! ', 'Done? ', 'Done.\n', '- ']) {
      assert.equal(localizeGameText(prefix + '{part} is described.', 'en', { part: en }), prefix + capitalized + ' is described.');
    }
    assert.equal(localizeGameText('Her {part} is described.', 'en', { part: 'aroused ' + en }), `Her aroused ${en} is described.`);
    assert.equal(localizeGameText('{part} is described.', 'en', { part: 'aroused ' + en }), `Aroused ${en} is described.`);
    assert.equal(localizeGameText('{part}。', 'ja', { part: ja }), ja + '。');
  }
});

test('all status, relic and system descriptions contain bodies without a duplicate name heading', () => {
  for (const definition of [...Object.values(statuses), ...Object.values(relics), ...Object.values(terms)]) {
    for (const lang of ['ja', 'en']) {
      const name = localize(definition.name, lang);
      for (const body of [definition.description, ...Object.values(definition.descriptionsByOwner ?? {})]) {
        const raw = localize(body, lang);
        assert.ok(raw.trim(), name);
        assert.ok(!raw.toLowerCase().startsWith(name.toLowerCase() + (lang === 'ja' ? '：' : ':')), name);
        assert.ok(!raw.includes('\n' + name), name);
      }
    }
  }
  for (const lang of ['ja', 'en']) assert.ok(!localize(carry, lang).startsWith(localize(terms.block.name, lang)));
});

test('card term tips follow renamed definitions in both languages, including retained Block', () => {
  for (const [id, definition] of Object.entries({ ...statuses, ...terms })) {
    const saved = definition.name;
    try {
      definition.name = l('Renamed ' + id, '変更名' + id);
      for (const lang of ['ja', 'en']) for (const carryBlock of [false, true]) {
        const rendered = cardTermDescription(id, carryBlock, lang);
        assert.ok(rendered.startsWith(localize(definition.name, lang) + (lang === 'ja' ? '：' : ': ')), id);
        assert.ok(!/\{[^}]+\}/.test(rendered), id);
      }
    } finally { definition.name = saved; }
  }
  assert.match(cardTermDescription('SuccubusFluid', false, 'ja'), /^淫魔の体液：サキュバスの体内で熟成された特殊な唾液。\nプレイヤー/);
});

test('relic descriptions retain dynamic replacements beneath their current name', () => {
  for (const relic of Object.values(relics)) for (const lang of ['ja', 'en']) {
    const body = localizeGameText(relic.description, lang, () => relicTextReplacements(relic, 12));
    const rendered = formatNamedDescription(localizeGameText(relic.name, lang), body, lang);
    assert.ok(!/\{[^}]+\}/.test(rendered), relic.id);
    assert.equal(rendered.split(localize(relic.name, lang)).length, 2, relic.id);
  }
});

test('status icon tips keep name, owner-specific body, growth and stacks together', () => {
  const source = ts.createSourceFile('BattleScene.ts', fs.readFileSync('src/scenes/BattleScene.ts', 'utf8'), ts.ScriptTarget.Latest, true);
  const cls = source.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'BattleScene');
  const method = cls.members.find(n => n.name?.getText(source) === 'showStatusTooltip').getText(source);
  const code = ts.transpileModule(`class Harness { ${method} }`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const Harness = new Function('STATUS_DESCRIPTIONS', 'formatNamedDescription', 'SETTINGS_STATE', 'localize', 'l', code + ';return Harness;')(statuses, formatNamedDescription, SETTINGS_STATE, localize, l);
  const h = new Harness(); h.playerStatusIcons = {}; const enemyIcons = {};
  h.player = {}; h.enemyViews = [{ statusIcons: enemyIcons, enemy: {} }];
  h.localizeDisplayText = value => localizeGameText(value);
  h.statusRuntime = { growthMultiplier: () => 1.21 };
  h.showStatusTooltipText = text => { h.result = text; };
  const saved = SETTINGS_STATE.language;
  try {
    for (const lang of ['ja', 'en']) {
      SETTINGS_STATE.language = lang;
      for (const owner of [h.playerStatusIcons, enemyIcons]) {
        h.showStatusTooltip('Aphrodisiac', 1, 0, 0, owner);
        const expectedBody = owner === enemyIcons ? statuses.Aphrodisiac.descriptionsByOwner.enemy : statuses.Aphrodisiac.description;
        assert.equal(h.result, formatNamedDescription(localize(statuses.Aphrodisiac.name), localizeGameText(expectedBody), lang));
      }
      h.showStatusTooltip('SuccubusFluid', 2, 0, 0, enemyIcons);
      assert.ok(h.result.startsWith(localize(statuses.SuccubusFluid.name) + (lang === 'ja' ? '：' : ': ')));
      assert.match(h.result, /×1\.21\nStacks: 2$/);
    }
  } finally { SETTINGS_STATE.language = saved; }
});
