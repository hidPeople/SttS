/** Documentation only. Never imports/evaluates game data or changes game sources. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const check = process.argv.includes('--check');
const chapters = {
  battlePresentation: 'presentation', blockPresentation: 'presentation', bodyParts: 'effects',
  cardCategories: 'cards', cards: 'cards', cardText: 'cards', cardAppearance: 'assets', characterPortraits: 'assets',
  conversationAppearance: 'presentation', conversations: 'events', conversationTransitions: 'events',
  effectBuilders: 'effects', enemies: 'combatants', enemySprites: 'assets', eventBattles: 'events', epPresentation: 'presentation',
  flavorCatalog: 'effects', player: 'combatants', portraitFactors: 'assets', rarities: 'combatants',
  relics: 'combatants', sprites: 'assets', statuses: 'combatants', tutorialTips: 'events', ui: 'presentation',
};
const printer = ts.createPrinter({ removeComments: true });
const typeText = (node, sf) => printer.printNode(ts.EmitHint.Unspecified, node, sf);
const runtimeOnly = new Set(['BattleEventContext', 'PlayerEpDamageRecord', 'CardDefinition', 'RelicDefinition', 'CardInstance', 'EnemyIntent', 'CharacterPortraitDefinition']);
const chapterForType = name => {
  if (/Portrait|Sprite|CardArtwork|CardRarityFinish/.test(name)) return 'assets';
  if (/ConversationTheme|ConversationDesign|Crayon|CardTextRender|CardTextResolution|BattleBackground|BattleEntrance|EpHeartEffect/.test(name)) return 'presentation';
  if (/Conversation|Novel|Tutorial|EventBattle/.test(name)) return 'events';
  if (/PlayerDefinition|EnemyDefinition|EnemyIntentInput|EnemyReaction|EnemyDeath|RelicDefinitionInput|StatusDefinition|Sensitivity/.test(name)) return 'combatants';
  if (/CardDefinitionInput|CardDisplay|CardTextOrder|CardTextSection|CardCategories|ColoredCardCategory/.test(name)) return 'cards';
  return 'effects';
};
const dataFiles = fs.readdirSync(path.join(root, 'src/data')).filter(f => f.endsWith('.ts')).sort();
for (const file of dataFiles) if (!chapters[file.slice(0, -3)]) throw new Error('Add a manual chapter for src/data/' + file);
const files = ['src/models/types.ts', 'src/models/localization.ts', ...dataFiles.map(f => 'src/data/' + f)];
const configFile = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
const program = ts.createProgram(config.fileNames, { ...config.options, noEmit: true });
const checker = program.getTypeChecker();
const sources = files.map(f => program.getSourceFile(path.join(root, f)) ?? ts.createSourceFile(f, fs.readFileSync(path.join(root, f), 'utf8'), ts.ScriptTarget.Latest, true));
const exported = node => node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
const esc = text => String(text).replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').replace(/\|/g, '&#124;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/`/g, '&#96;').trim();
const code = text => '<code>' + esc(text) + '</code>';
const rel = sf => path.relative(root, sf.fileName).replaceAll('\\', '/');
const sourceLink = sf => '[' + rel(sf) + '](../../' + rel(sf) + ')';
const refs = {
  status: 'statuses.ts / STATUS_DESCRIPTIONS（StatusEffect）', statuses: 'StatusEffect。所有者別の初期状態はStatusApplication',
  nextStatus: 'statuses.ts / STATUS_DESCRIPTIONS', purgeStatus: 'StatusEffect（生成した除去カードの原因）', repeatWhileStatus: 'StatusEffect', chanceBonusStatus: 'StatusEffect', requiredStatuses: 'StatusEffect[]', causeStatus: 'StatusEffect', blockedEnemyTraits: 'EnemyTrait',
  cardId: 'cards.ts / CARD_DEFINITIONSのキー', cardIds: 'cards.ts / CARD_DEFINITIONSのキー', deckIds: 'cards.ts / CARD_DEFINITIONSのキー', startingDeckIds: 'cards.ts / CARD_DEFINITIONSのキー',
  highlightCardId: 'cards.ts / CARD_DEFINITIONSのキー', relicId: '所持relicIds内のID（新規登録はキーとidを一致）', relicIds: '所持レリックID配列', excludedRelicIds: 'relics.ts / RELIC_DEFINITIONSのキー配列（イベント開始時の初期所持から除外）',
  enemyIds: 'enemies.ts / ENEMY_DEFINITIONSのキー', sprite: 'enemySprites.ts / ENEMY_SPRITESのキー', spriteIds: 'sprites.ts / EFFECT_SPRITESのキー',
  conversationId: 'conversations.ts / CONVERSATIONSのキー', introConversationId: 'CONVERSATIONSのキー', battleStartConversationId: 'CONVERSATIONSのキー', victoryConversationId: 'CONVERSATIONSのキー',
  portrait: 'characterPortraits.ts / 拡張子なし画像ID（自動検出も可）', background: 'image/からの相対パス',
  timing: 'types.ts / EFFECT_TIMINGS（所有者別の対応は効果章）', flavors: 'types.ts / FLAVOR_EVENTS → BattleFlavorSet',
  conditions: 'ConditionDefinition[]（AND）', applyConditions: 'ConditionDefinition[]（AND）',
  categories: 'types.ts / CardCategory', rarity: 'types.ts / Rarity', attackAttribute: 'types.ts / AttackAttribute → DAMAGE_SPRITE_EFFECTS',
  epDamageParts: 'types.ts / EP_DAMAGE_PARTS', parts: 'types.ts / EP_DAMAGE_PARTS',
  visuals: 'types.ts / StatusVisualKey', portraitEvent: 'types.ts / PortraitEvent → portraitFactors.ts',
  intentIds: '同じ敵の行動定義id', name: 'LocalizedText（l(en, ja)）', text: 'LocalizedText（l(en, ja)）', description: 'LocalizedText（l(en, ja)）',
};
const noteOverrides = {
  'StatusDefinition.receivedEpDamage': '正の被EPダメージを固定。敵予告は変更しない。手札のEP自傷予測は反映。',
  'EffectDefinition.times': '直書きでは必須。effect()のoptionsでは任意、省略1。一部kindは繰返し対象外。',
};
function trailingComment(node, sf) {
  const tail = sf.text.slice(node.end, sf.text.indexOf('\n', node.end) < 0 ? sf.text.length : sf.text.indexOf('\n', node.end));
  return tail.match(/^\s*[;,]?\s*\/\/\s*(.*)/)?.[1] ?? '';
}
function membersOf(node) {
  if (ts.isTypeLiteralNode(node)) return node.members;
  if (ts.isInterfaceDeclaration(node)) return node.members;
  return undefined;
}
function table(members, sf, owner, prefix = '') {
  const rows = [];
  for (const m of members) {
    if (!ts.isPropertySignature(m) || !m.name || !m.type) continue;
    const name = m.name.getText(sf).replace(/^['"]|['"]$/g, '');
    const field = prefix + name;
    const required = m.questionToken ? '任意' : (prefix ? '親を設定時必須' : '必須');
    const note = noteOverrides[owner + '.' + field] ?? (owner === 'StatusApplication' && name === 'effect' ? 'StatusEffectから選ぶ初期付与状態ID。' : trailingComment(m, sf));
    rows.push('| ' + code(field) + ' | ' + required + ' | ' + code(ts.isTypeLiteralNode(m.type) ? 'オブジェクト（下位項目参照）' : ts.isArrayTypeNode(m.type) && ts.isTypeLiteralNode(m.type.elementType) ? 'オブジェクト配列（下位項目参照）' : ts.isIndexedAccessTypeNode(m.type) ? checker.typeToString(checker.getTypeFromTypeNode(m.type), m, ts.TypeFormatFlags.NoTruncation) : typeText(m.type, sf)) + ' | ' + esc([refs[name], note].filter(Boolean).join('。')) + ' |');
    let child = m.type;
    let suffix = '.';
    if (ts.isArrayTypeNode(child)) { child = child.elementType; suffix = '[].'; }
    if (ts.isTypeLiteralNode(child)) rows.push(...table(child.members, sf, owner, field + suffix));
  }
  return rows;
}
const typeLines = ['# 入力型の全項目リファレンス', '', '[マニュアル目次](README.md) / [設定定数](reference-config.md)', '',
  'この文書は型から生成します。現在のバランス数値・登録カード一覧は複製しません。型上の必須／任意と、動作上の条件付き必須は別です。各型の「使い方」を併読してください。参照欄が空でも、型名のリンクと「使い方」から意味・参照先・省略時の動作を確認してください。', '',
  'カード／敵行動／レリックはビルダー入力型を掲載し、生成後の内部集計型を除外しています。EffectDefinitionだけは直書きの型です。effect()を使うとtimesを省略できます。', ''];
const seen = new Set();
for (const sf of sources) for (const node of sf.statements) {
  if (!ts.isInterfaceDeclaration(node) && !ts.isTypeAliasDeclaration(node)) continue;
  const name = node.name.text;
  if (seen.has(name) || runtimeOnly.has(name)) continue;
  const allowed = rel(sf) === 'src/models/localization.ts' ? name === 'LocalizedText' : exported(node) || ['CardDefinitionInput', 'EnemyIntentInput', 'RelicDefinitionInput', 'CardCategories', 'ColoredCardCategory'].includes(name);
  if (!allowed) continue;
  seen.add(name);
  typeLines.push('## ' + name, '', '定義: ' + sourceLink(sf) + ' ／ [使い方](' + chapterForType(name) + '.md)', '');
  const members = ts.isInterfaceDeclaration(node) ? node.members : membersOf(node.type);
  if (members) {
    if (node.heritageClauses) typeLines.push('継承元の項目も必要: ' + node.heritageClauses.map(h => code(h.getText(sf))).join('、'), '');
    typeLines.push('| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |', '| --- | --- | --- | --- |', ...table(members, sf, name), '');
  } else typeLines.push(code(typeText(node.type, sf)), '');
}
const registries = new Set(['ENEMY_ORGASM_AFTERSHOCKS_INTENT','CARD_DEFINITIONS', 'ENEMY_DEFINITIONS', 'STATUS_DESCRIPTIONS', 'RELIC_DEFINITIONS', 'CHARACTER_PORTRAITS', 'ENEMY_SPRITES', 'EFFECT_SPRITES', 'UI_SPRITES', 'DAMAGE_SPRITE_EFFECTS', 'CONVERSATIONS', 'DEFEAT_CONVERSATIONS', 'EVENT_BATTLES', 'GLOBAL_FLAVORS', 'TUTORIAL_TIPS', 'PART_SENSITIVITY_LEVELS', 'BODY_PART_NAMES', 'BODY_PART_DEFAULT_NAMES', 'BODY_PART_STAT_PART', 'REWARD_RARITY_DROP_RATES', 'CARD_CATEGORY_COLORS', 'CONVERSATION_THEMES', 'CARD_TEXT_TARGETS', 'CARD_VALUE_BASES', 'CARD_EFFECT_TEXT', 'CARD_CONDITION_NAMES', 'CARD_CONDITION_OPERATORS']);
function widened(type, node) {
  if (type.flags & ts.TypeFlags.NumberLiteral) return 'number';
  if (type.flags & ts.TypeFlags.StringLiteral) return 'string';
  if (type.flags & ts.TypeFlags.BooleanLiteral) return 'boolean';
  return checker.typeToString(type, node, ts.TypeFormatFlags.NoTruncation);
}
function configRows(type, node, prefix = '', depth = 0) {
  if (depth > 5) return [];
  const rows = [];
  for (const prop of checker.getPropertiesOfType(type)) {
    const decl = prop.valueDeclaration ?? prop.declarations?.[0] ?? node;
    const ptype = checker.getTypeOfSymbolAtLocation(prop, decl);
    const field = prefix + prop.name;
    const isOptional = Boolean(prop.flags & ts.SymbolFlags.Optional);
    const sf = decl.getSourceFile();
    const comment = prop.name === 'numberFontSize' ? '行動予告のダメージ数値だけの文字サイズpx。' : trailingComment(decl, sf);
    const display = widened(ptype, decl);
    const short = display.length > 180 ? (checker.isArrayType(ptype) ? '配列（下位項目参照）' : 'オブジェクト（下位項目参照）') : display;
    rows.push('| ' + code(field) + ' | ' + (isOptional ? '任意' : prefix ? '親を設定時必須' : '必須') + ' | ' + code(short) + ' | ' + esc(comment) + ' |');
    let nested = ptype;
    let suffix = '.';
    if (checker.isArrayType(ptype)) { nested = checker.getTypeArguments(ptype)[0]; suffix = '[].'; }
    const symbolName = nested.aliasSymbol?.name ?? nested.symbol?.name;
    if (nested.flags & ts.TypeFlags.Object && (symbolName === '__type' || symbolName === '__object' || !symbolName || /Point$/.test(symbolName))) {
      rows.push(...configRows(nested, decl, field + suffix, depth + 1));
    }
  }
  return rows;
}
const cfgLines = ['# 設定定数リファレンス', '', '[マニュアル目次](README.md) / [入力型](reference-types.md)', '',
  'src/dataの公開設定を列挙します。登録データの本文・現在値は掲載せず、キーと値の契約を記載します。値を変更するときはリンク先のソースを編集してください。必須は設定オブジェクト自体に対する型の要求です。', ''];
for (const sf of sources.filter(s => rel(s).startsWith('src/data/') || rel(s) === 'src/models/types.ts')) {
  const base = path.basename(sf.fileName, '.ts');
  const decls = sf.statements.filter(ts.isVariableStatement).filter(exported).flatMap(s => [...s.declarationList.declarations]);
  if (!decls.length) continue;
  cfgLines.push('## ' + base + '.ts', '', sourceLink(sf) + ' ／ [意味・単位・手順](' + (chapters[base] ?? 'effects') + '.md)', '');
  for (const d of decls) {
    const name = d.name.getText(sf);
    cfgLines.push('### ' + name, '');
    if (['EFFECT_TIMINGS', 'FLAVOR_EVENTS', 'EP_DAMAGE_PARTS'].includes(name)) {
      cfgLines.push('識別子の契約（現在のバランス設定ではありません）:', '', '~~~ts', d.initializer.getText(sf), '~~~', '');
      continue;
    }
    const type = checker.getTypeAtLocation(d.name);
    const signature = d.type?.getText(sf) ?? widened(type, d);
    if (registries.has(name)) {
      cfgLines.push('構造: ' + code(signature), '');
      if (name === 'CARD_DEFINITIONS') cfgLines.push('追加する1件は [CardDefinitionInput](reference-types.md#carddefinitioninput)。内部CardDefinitionの集計値は入力しません。', '');
      if (name === 'ENEMY_ORGASM_AFTERSHOCKS_INTENT') cfgLines.push('共通の強制行動。入力は [EnemyIntentInput](reference-types.md#enemyintentinput)。内部ダメージ集計値は入力しません。', '');
      if (name === 'ENEMY_DEFINITIONS') cfgLines.push('各行動は [EnemyIntentInput](reference-types.md#enemyintentinput) をdefineEnemyIntentへ渡します。', '');
      if (name === 'RELIC_DEFINITIONS') cfgLines.push('入力は [RelicDefinitionInput](reference-types.md#relicdefinitioninput)。', '');
      const names = [...new Set(signature.match(/[A-Z][A-Za-z]+/g) ?? [])].filter(n => seen.has(n));
      if (names.length) cfgLines.push('値の詳細: ' + names.map(n => '[' + n + '](reference-types.md#' + n.toLowerCase() + ')').join(' / '), '');
    } else if (checker.isArrayType(type) || checker.isTupleType(type) || !(type.flags & ts.TypeFlags.Object)) {
      cfgLines.push('型: ' + code(signature), '');
    } else {
      cfgLines.push('| 設定パス | 必須／任意 | 型 | 注記 |', '| --- | --- | --- | --- |', ...configRows(type, d), '');
    }
  }
}
// Non-exported but user-editable category selection; helper implementation is not a config object.
cfgLines.push('## 非公開の設定とヘルパー', '',
  '- [cardCategories.ts](../../src/data/cardCategories.ts) のCRAVING_PLAYABLE_CARD_CATEGORIESはCardCategoryのSet。快楽渇望中に許可するカテゴリ。',
  '- [enemySprites.ts](../../src/data/enemySprites.ts) のspriteは素材設定の補完ヘルパー。引数と既定値を変える場合は全呼出しへの影響を確認。',
  '- [effectBuilders.ts](../../src/data/effectBuilders.ts) のdefineCard、defineEnemyIntent、defineRelic、effect、conditionは入力を正規化する関数。設定値ではありません。', '',
  '生成元: tools/docs/generate-reference.mjs。手編集せず、意味の説明は該当マニュアルへ追加してください。', '');
function addTypeLinks(text) {
  return text.split(/(?=^## )/m).map(section => {
    const own = section.match(/^## (.+)/)?.[1];
    const related = [...new Set(section.match(/[A-Z][A-Za-z]+/g) ?? [])].filter(n => seen.has(n) && n !== own);
    if (!own || !related.length) return section;
    const start = section.indexOf('\n\n', section.indexOf('\n\n') + 2);
    return section.slice(0, start) + '\n\n関連する型: ' + related.map(n => '[' + n + '](reference-types.md#' + n.toLowerCase() + ')').join(' / ') + section.slice(start);
  }).join('');
}
const navigation = '\n主な入力: [カード](#carddefinitioninput) / [効果](#effectdefinition) / [条件](#conditiondefinition) / [敵](#enemydefinition) / [行動](#enemyintentinput) / [状態](#statusdefinition) / [レリック](#relicdefinitioninput) / [プレイヤー](#playerdefinition) / [会話](#conversationpage) / [Tips](#tutorialtipdefinition) / [立ち絵](#characterportraitplacement) / [スプライト](#spritedefinition)\n';
const normalize = text => text.replaceAll('\r\n', '\n');
const typeOutput = addTypeLinks(typeLines.join('\n')).replace('## StatusEffect', navigation + '\n## StatusEffect');
const outputs = new Map([['docs/manual/reference-types.md', normalize(typeOutput)], ['docs/manual/reference-config.md', normalize(cfgLines.join('\n'))]]);
let failed = false;
for (const [file, text] of outputs) {
  const dest = path.join(root, file);
  if (check) { if (!fs.existsSync(dest) || normalize(fs.readFileSync(dest, 'utf8')) !== text) { console.error('Out of date: ' + file); failed = true; } }
  else { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, text); console.log('Generated ' + file); }
}
// Validate local Markdown targets, including generated anchors. Ignore code fences and external URLs.
const markdown = [path.join(root, 'README.md'), path.join(root, 'AGENT.md'), path.join(root, 'tools/data-editor/README.md')];
function collect(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) collect(p); else if (e.name.endsWith('.md')) markdown.push(p); } }
collect(path.join(root, 'docs'));
for (const file of markdown) {
  const content = fs.readFileSync(file, 'utf8').replace(/(?:`{3}|~{3})[^\n]*\n[\s\S]*?(?:`{3}|~{3})/g, '');
  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const href = match[1];
    if (/^(?:https?:|mailto:|codex:)/.test(href)) continue;
    const [p, anchor] = href.split('#');
    const dest = p ? path.resolve(path.dirname(file), p) : file;
    if (!fs.existsSync(dest)) { console.error('Broken link in ' + path.relative(root, file) + ': ' + href); failed = true; continue; }
    if (anchor && dest.endsWith('.md')) {
      const target = fs.readFileSync(dest, 'utf8');
      const headings = [...target.matchAll(/^#{1,6} (.+)$/gm)].map(m => m[1].toLowerCase().replace(/[^\p{L}\p{N}_ -]/gu, '').replaceAll(' ', '-'));
      if (!headings.includes(anchor)) { console.error('Missing anchor in ' + path.relative(root, file) + ': ' + href); failed = true; }
    }
  }
}
if (failed) process.exitCode = 1;
else console.log((check ? 'Reference is current; ' : '') + 'local links OK. Data modules: ' + dataFiles.length + ', input types: ' + seen.size);
