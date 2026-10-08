import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Offline knowledge snapshot. Only the requested official examples retain prose.
// This never edits game data.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = path.join(root, 'docs/ai-authoring');
const check = process.argv.includes('--check');
const read = p => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');
const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
const files = new Map();
function source(p) {
  if (!files.has(p)) files.set(p, ts.createSourceFile(p, read(p), ts.ScriptTarget.Latest, true));
  return files.get(p);
}
function declaration(p, name) {
  for (const st of source(p).statements) {
    if (st.name?.getText() === name) return st;
    if (ts.isVariableStatement(st)) {
      const d = st.declarationList.declarations.find(d => d.name.getText() === name);
      if (d) return d;
    }
  }
  throw new Error(`Missing declaration: ${p} ${name}`);
}
function unwrap(n) {
  while (ts.isAsExpression(n) || ts.isParenthesizedExpression(n) || ts.isSatisfiesExpression(n)) n = n.expression;
  return n;
}
function object(n) {
  n = unwrap(n);
  if (ts.isIdentifier(n)) return object(declaration(n.getSourceFile().fileName, n.text).initializer);
  if (ts.isCallExpression(n) && /^define/.test(n.expression.getText())) n = unwrap(n.arguments[0]);
  if (!ts.isObjectLiteralExpression(n)) throw new Error(`Expected object: ${n.getText().slice(0, 80)}`);
  return n;
}
const propName = p => p.name && (ts.isStringLiteral(p.name) ? p.name.text : p.name.getText());
function prop(n, key) {
  for (const p of [...object(n).properties].reverse()) {
    if (propName(p) === key) return p.initializer;
    if (ts.isSpreadAssignment(p)) {
      const inherited = prop(p.expression, key);
      if (inherited) return inherited;
    }
  }
}
function arrayElements(n) {
  n = unwrap(n);
  if (ts.isIdentifier(n)) return arrayElements(declaration(n.getSourceFile().fileName, n.text).initializer);
  if (ts.isPropertyAccessExpression(n)) return arrayElements(prop(n.expression, n.name.text));
  if (ts.isArrayLiteralExpression(n)) return n.elements.flatMap(x => ts.isSpreadElement(x) ? arrayElements(x.expression) : [x]);
  if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'filter') {
    const filter = n.arguments[0];
    if (!ts.isArrowFunction(filter) || !ts.isBinaryExpression(filter.body)) throw new Error('Unsupported registry filter');
    const { left, right, operatorToken } = filter.body;
    if (!ts.isPropertyAccessExpression(left) || !ts.isStringLiteral(right)) throw new Error('Unsupported registry predicate');
    const positive = operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken;
    if (!positive && operatorToken.kind !== ts.SyntaxKind.ExclamationEqualsEqualsToken) throw new Error('Unsupported registry operator');
    return arrayElements(n.expression.expression).filter(x => {
      const value = prop(x, left.name.text);
      return Boolean(value && ts.isStringLiteral(value) && value.text === right.text) === positive;
    });
  }
  throw new Error(`Unsupported registry array: ${n.getText()}`);
}
function textOf(n, sf) { return n ? printer.printNode(ts.EmitHint.Unspecified, n, sf).trim() : '—'; }
const cell = s => String(s).replaceAll('|', '\\|').replaceAll('\n', ' ');
const code = text => `\n\`\`\`ts\n${text}\n\`\`\`\n`;
function literals(n) {
  const values = [];
  function walk(x) { if (ts.isStringLiteral(x)) values.push(x.text); else ts.forEachChild(x, walk); }
  walk(n);
  return values;
}
function cleanNode(n) {
  const omit = new Set(['flavors', 'description', 'descriptionsByOwner', 'iconText', 'iconColor', 'iconImage', 'visuals', 'initialVisuals']);
  const result = ts.transform(n, [ctx => {
    const visit = x => {
      if (ts.isObjectLiteralExpression(x)) return ts.factory.updateObjectLiteralExpression(x,
        x.properties.filter(p => !omit.has(propName(p))).map(p => ts.visitEachChild(p, visit, ctx)));
      return ts.visitEachChild(x, visit, ctx);
    };
    return x => ts.visitNode(x, visit);
  }]);
  const text = textOf(result.transformed[0], n.getSourceFile());
  result.dispose();
  return text;
}
function variable(p, name, clean = false) {
  const d = declaration(p, name);
  return `const ${name} = ${clean ? cleanNode(d.initializer) : textOf(d.initializer, source(p))};`;
}

let ref = '# 現行登録と入力契約\n\n';
ref += 'リポジトリを読めないAI向けの自動抽出辞書です。共通設定は `01-authoring-knowledge.md`、フレーバー生成は `04-flavor-guide.md`、会話生成は `05-conversation-guide.md` を先に参照してください。型に存在する項目が、すべての配置先で実行されるとは限りません。コード欄の設定一覧は参照用であり、そのままゲームへ追加するブロックではありません。\n\n';
ref += 'ゲームの既存台詞は収録せず、登録ID、名前、判定に必要な設定、入力契約を収録します。状態の表示名は識別用の原文です。数値はこのスナップショット時点の値です。\n';
ref += '\n## 条件と文章の入力型\n';
const types = ['LocalizedText', 'BattleLogKind', 'BattleEventSource', 'ConditionKind', 'ConditionOperator', 'ConditionTarget', 'ConditionDefinition', 'BattleFlavorLine', 'BattleFlavorVariant', 'BattleFlavorEntry', 'BattleFlavorSet', 'EnemyTrait', 'BodyPartStatusKind', 'StatusEffect', 'EffectTarget', 'EffectKind', 'EpDamagePartMode', 'EffectPercentOf', 'EpRatioBase', 'CardAddVariant', 'EffectDefinition', 'RelicTriggerDefinition', 'StatusTriggerDefinition', 'EnemyReactionTrigger', 'EnemyReactionRule', 'EnemyReactionVariant', 'EnemyDeathNarration'];
// Select by actual names; required core contracts must always exist.
const available = new Set(source('src/models/types.ts').statements.map(s => s.name?.getText()).filter(Boolean));
for (const name of types) {
  const p = name === 'LocalizedText' ? 'src/models/localization.ts' : 'src/models/types.ts';
  if (name !== 'LocalizedText' && !available.has(name)) {
    throw new Error(`Contract renamed: ${name}`);
  }
  ref += code(textOf(declaration(p, name), source(p)));
}
for (const name of ['FLAVOR_EVENTS', 'EP_DAMAGE_PARTS', 'EFFECT_TIMINGS']) ref += code(variable('src/models/types.ts', name));
ref += '\n## 会話とイベントの入力型\n';
for (const [p, names] of [
  ['src/data/conversations.ts', ['ConversationPage', 'ConversationEventMetadata']],
  ['src/data/conversationTransitions.ts', ['ConversationBackgroundTransition']],
  ['src/data/eventBattles.ts', ['EventBattleDefinition']],
]) for (const name of names) ref += code(textOf(declaration(p, name), source(p)));
ref += '\n### ビルダーに渡す入力型\n\n実行時に生成される集計値を手入力しないため、ビルダーの入力契約を掲載します。型内の参照先は保存版マニュアルと登録表を併用してください。\n';
for (const name of ['CardDefinitionInput', 'EnemyIntentInput', 'RelicDefinitionInput']) ref += code(textOf(declaration('src/data/effectBuilders.ts', name), source('src/data/effectBuilders.ts')));
ref += code(variable('src/data/conversationTransitions.ts', 'CONVERSATION_TRANSITIONS'));

ref += '\n## 全状態IDと所有者\n\n';
ref += '| ID | 英語名 | 日本語名 | allowedOwners | 系列と順位 | 表示抑止 |\n| --- | --- | --- | --- | --- | --- |\n';
const statusPath = 'src/data/statuses.ts';
const statusObject = object(declaration(statusPath, 'STATUS_DESCRIPTIONS').initializer);
const ids = literals(declaration('src/models/types.ts', 'StatusEffect').type);
const namedStatuses = statusObject.properties.filter(ts.isPropertyAssignment);
for (const id of ids) {
  const entry = namedStatuses.find(p => propName(p) === id);
  if (!entry) {
    const m = /^([ABCVM])SensitivityLv([1-5])$/.exec(id);
    if (!m) throw new Error(`Status has no definition: ${id}`);
    ref += `| \`${id}\` | ${m[1]} Sensitivity Lv.${m[2]} | ${m[1]}開発 Lv.${m[2]} | player | 部位別レベル | — |\n`;
    continue;
  }
  const n = entry.initializer;
  const name = prop(n, 'name');
  const labels = name?.arguments?.map(x => ts.isStringLiteral(x) ? x.text : x.getText()) ?? [];
  const val = key => textOf(prop(n, key), source(statusPath));
  ref += `| \`${id}\` | ${cell(labels[0])} | ${cell(labels[1])} | ${cell(val('allowedOwners'))} | ${cell(val('exclusiveGroup'))} / ${cell(val('groupRank'))} | ${cell(val('blockedFlavorKinds'))} |\n`;
}
ref += `\n全${ids.length}状態。うち部位レベル状態は25種類です。Insert・Intruded・Bindingの所有者に注意してください。\n`;
ref += '\n## 状態の判定に関わる現行設定\n\n';
ref += '文章・説明・アイコン・描画演出を除いた状態設定です。`defineStatus` は入力をそのまま返します。`epDamageTakenMultiplier(n)` は `{kind: "epDamageTakenMultiplier", amount: n, target: "player"}`、HP倍率・最大EP倍率の同名ヘルパーも同じ構造です。`effect` と `condition` はマニュアルのビルダーです。\n';
ref += code(variable(statusPath, 'PART_SENSITIVITY_LEVELS'));
ref += code(cleanNode(declaration(statusPath, 'defineSensitivityStatuses')));
ref += code(variable(statusPath, 'STATUS_DESCRIPTIONS', true));
ref += '\n## 複合状態の完全な定義\n';
ref += code(variable('src/data/playerStates.ts', 'PLAYER_STATE_CONDITIONS'));
ref += '\n## 部位トークンと固定名\n\n';
ref += '大文字小文字を区別します。別名は条件の parts に使わず、文章置換に使います。動的名の段階や接頭辞の意味はナレッジ本文を参照してください。\n';
for (const name of ['BODY_PART_ALIASES', 'BODY_PART_STAT_PART', 'BODY_PART_DEFAULT_NAMES']) ref += code(variable('src/data/bodyParts.ts', name));

ref += '\n## 登録済みカードとレリック\n';
for (const [p, registry] of [['src/data/cards.ts', 'CARD_DEFINITIONS'], ['src/data/relics.ts', 'RELIC_DEFINITIONS']]) {
  ref += `\n### ${registry}\n\n| ID | 日英名 |\n| --- | --- |\n`;
  for (const entry of object(declaration(p, registry).initializer).properties.filter(ts.isPropertyAssignment)) {
    ref += `| \`${propName(entry)}\` | ${cell(textOf(prop(entry.initializer, 'name'), source(p)))} |\n`;
  }
}
ref += '\n## 登録済み敵と行動の配置先\n\n';
ref += '共有定義を展開した実行時添字です。元ソースが共有定義やfilterで構成されている場合、配列全体の差し替えはせず、行動ID・labelを目印に編集箇所を指定してください。\n';
const enemyPath = 'src/data/enemies.ts';
for (const entry of object(declaration(enemyPath, 'ENEMY_DEFINITIONS').initializer).properties.filter(ts.isPropertyAssignment)) {
  ref += `\n### ${propName(entry)}\n\n`;
  const n = entry.initializer;
  for (const key of ['name', 'traits', 'maxEp', 'intentEConditions', 'intentBConditions']) ref += `- ${key}: ${cell(textOf(prop(n, key), source(enemyPath)))}\n`;
  for (const key of ['intents', 'intents_E', 'intents_B']) {
    const array = prop(n, key);
    if (!array) continue;
    ref += `\n| ${key} の実行時添字 | id | label |\n| --- | --- | --- |\n`;
    arrayElements(array).forEach((it, i) => {
      ref += `| ${i} | ${cell(textOf(prop(it, 'id'), source(enemyPath)))} | ${cell(textOf(prop(it, 'label'), source(enemyPath)))} |\n`;
    });
  }
}
ref += '\n### 敵の条件で使うローカル定数と部位判定ヘルパー\n';
for (const st of source(enemyPath).statements) {
  if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) {
    const name = d.name.getText();
    if (['inserted', 'intruded', 'charmIntentConditions', 'bindingIntentConditions', 'playerNotBound', 'notInserted', 'hasInserted', 'hasInsertedA', 'hasInsertedV', 'notIntruded', 'hasIntruded', 'hasIntrudedA', 'hasIntrudedV', 'notIntrudedM', 'hasBothIntruded', 'hasOnlyIntrudedA', 'hasOnlyIntrudedV', 'noInsertAt', 'noInsertOrIntrusionAt', 'hasInsertOrIntrusionAt'].includes(name)) ref += code(variable(enemyPath, name));
  }
  if (ts.isFunctionDeclaration(st) && ['noInsertAt', 'noInsertOrIntrusionAt', 'hasInsertOrIntrusionAt'].includes(st.name?.getText())) ref += code(textOf(st, source(enemyPath)));
}
ref += '\n## 会話IDと現在の接続\n\n';
ref += '会話本文の生成例はナレッジ本文にあります。以下は既存本文の転載ではなく、参照先の識別情報です。\n\n';
ref += object(declaration('src/data/conversations.ts', 'CONVERSATIONS').initializer).properties.filter(ts.isPropertyAssignment).map(p => `- \`${propName(p)}\`: ${ts.isArrayLiteralExpression(p.initializer) ? p.initializer.elements.length : '?'} ページ`).join('\n') + '\n';
for (const name of ['CONVERSATION_EVENTS', 'DEFEAT_CONVERSATIONS']) ref += code(variable('src/data/conversations.ts', name));
ref += code(variable('src/data/eventBattles.ts', 'EVENT_BATTLES'));

ref += '\n## フレーバー呼出し配置の監査表\n\n';
ref += '各イベントがどの定義から呼ばれるかを示します。表のローカル変数名はそのまま差し込みキーとして使えません。条件用値の保証範囲はナレッジ本文のイベント表が基準です。`event` などの変数経由は呼出し元の制限に従います。\n\n';
ref += '| メソッド | 参照元 | イベント | ソース位置 |\n| --- | --- | --- | --- |\n';
const battle = source('src/scenes/BattleScene.ts');
function audit(n) {
  if (ts.isMethodDeclaration(n)) {
    function visit(x) {
      if (ts.isCallExpression(x) && /this\.(addFlavorEvent|addGlobalFlavorEvent)$/.test(x.expression.getText())) {
        const global = x.expression.getText().endsWith('addGlobalFlavorEvent');
        const line = battle.getLineAndCharacterOfPosition(x.getStart()).line + 1;
        ref += `| ${n.name.getText()} | ${cell(global ? 'GLOBAL_FLAVORS' : x.arguments[0].getText())} | ${cell(x.arguments[global ? 0 : 1].getText())} | BattleScene.ts:${line} |\n`;
      }
      ts.forEachChild(x, visit);
    }
    visit(n);
  } else ts.forEachChild(n, audit);
}
audit(battle);

const manuals = ['effects', 'events', 'combatants', 'cards', 'assets', 'presentation', 'editor'];
let manual = '# 設定マニュアル保存版\n\n';
manual += '文章生成に関わる設定を落とさないため、関連する現行マニュアル7章を全文保存しています。生成の手順はフレーバー用 `04-flavor-guide.md` と会話用 `05-conversation-guide.md` に分離しています。この保存版は詳細を確認するときの資料です。相対リンクだけをこの保存先に合わせて付け替えています。リンク先はリポジトリ内なので、添付ファイルだけのAIは開けません。入力型・IDは `02-current-reference.md` に収録しています。元マニュアルと実装で差がある箇所は専用ガイドの注意を優先してください。UI調整・戦闘バランスなどは通常の台詞生成で変更しません。\n';
for (const name of manuals) {
  const p = `docs/manual/${name}.md`;
  const content = read(p).replace(/\]\(([^)]+)\)/g, (match, href) => {
    if (/^(?:[a-z]+:|#|\/)/i.test(href)) return match;
    const [file, ...fragment] = href.split('#');
    const relative = path.posix.relative('docs/ai-authoring', path.posix.join('docs/manual', file));
    return `](${relative}${fragment.length ? '#' + fragment.join('#') : ''})`;
  });
  manual += `\n---\n\n元ファイル: \`${p}\`\n\n${content}\n`;
  source(p);
}
// Include semantic sources not otherwise parsed in this script in the fingerprint.
for (const p of ['src/models/conditions.ts', 'src/models/gameText.ts', 'src/data/effectBuilders.ts', 'src/data/flavorCatalog.ts', 'src/ui/conversation.ts', 'src/ui/battleLogStyle.ts', 'src/scenes/DefeatEventScene.ts', 'src/data/portraitTouch.ts', 'src/models/statusChanges.ts', 'src/models/statusRuntime.ts', 'src/models/statusRestrictions.ts']) source(p);
const sourceList = [...files.keys()].sort();
const combined = crypto.createHash('sha256');
const hashes = sourceList.map(p => {
  const hash = crypto.createHash('sha256').update(read(p)).digest('hex');
  combined.update(`${p}\0${hash}\n`);
  return { file: p, sha256: hash };
});
const stamp = `\n## 参照元と更新\n\nソース指紋: \`${combined.digest('hex')}\`。改行コードをLFへ正規化して計算しています。\n\n再生成: \`node tools/docs/generate-authoring-reference.mjs\`。鮮度確認: \`node tools/docs/generate-authoring-reference.mjs --check\`。再生成だけでは手書きのナレッジ本文の意味は更新されません。イベント追加・実行器変更時は本文も照合してください。\n\n`;
ref += stamp + '| 参照元 | SHA256 |\n| --- | --- |\n' + hashes.map(h => `| ${h.file} | ${h.sha256} |`).join('\n') + '\n';
// Copy the requested properties directly, without printing/reformatting the AST.
// The rest of each guide remains hand-maintained.
function exactProperty(n, key) {
  const property = object(n).properties.find(p => propName(p) === key);
  if (!property || !ts.isPropertyAssignment(property)) throw new Error(`Missing example property: ${key}`);
  const sf = property.getSourceFile();
  const start = property.getStart(sf);
  const lineStart = sf.text.lastIndexOf('\n', start - 1) + 1;
  const end = property.end + (sf.text[property.end] === ',' ? 1 : 0);
  return sf.text.slice(/^\s*$/.test(sf.text.slice(lineStart, start)) ? lineStart : start, end);
}
function withOfficialExample(file, heading, note, example) {
  const start = '<!-- official-example:start -->';
  const end = '<!-- official-example:end -->';
  const content = read(`docs/ai-authoring/${file}`);
  const section = `${start}\n\n## ${heading}\n\n${note}\n${code(example)}\n${end}`;
  const begin = content.indexOf(start);
  if (begin < 0) return content.trimEnd() + '\n\n' + section + '\n';
  const finish = content.indexOf(end, begin);
  if (finish < 0) throw new Error(`Unclosed official example: ${file}`);
  return content.slice(0, begin) + section + content.slice(finish + end.length);
}
const outputs = {
  '02-current-reference.md': ref,
  '03-manual-snapshot.md': manual,
  '04-flavor-guide.md': withOfficialExample('04-flavor-guide.md', '現行の正式記載例 Seduction',
    '`src/data/cards.ts` の `CARD_DEFINITIONS.seduction`（Seduction／誘惑）から、`flavors` を末尾まで原文のまま収録しています。日英本文・条件・候補数・並び順・表記を変更していません。既存の正式文章と条件分岐を参照するための例で、新しい本文や続きを追加する指示ではありません。上のStrike例は構造説明用、こちらは現行データの転載です。既存の表記揺れも保持しているため、新規出力の記法はプロジェクト指示とこのガイドを優先してください。',
    exactProperty(prop(declaration('src/data/cards.ts', 'CARD_DEFINITIONS').initializer, 'seduction'), 'flavors')),
  '05-conversation-guide.md': withOfficialExample('05-conversation-guide.md', '現行の正式記載例 prologueAfterBattle',
    '`src/data/conversations.ts` の `CONVERSATIONS.prologueAfterBattle` を、会話IDと全ページを含め原文のまま収録しています。日英本文・話者・順序・各設定値を変更していません。既存の正式文章とページ構成を参照するための例で、新しい本文や続きを追加する指示ではありません。\n\n原文には空文字以外の固定2欄、追加の設定項目があります。転載部分は修正せず保持しますが、新規生成では各ページの `portrait: \'\', background: \'\'` を優先します。原文の値や追加項目を新規ページへ自動転用しません。',
    exactProperty(declaration('src/data/conversations.ts', 'CONVERSATIONS').initializer, 'prologueAfterBattle')),
};
for (const [name, content] of Object.entries(outputs)) {
  const destination = path.join(outDir, name);
  if (check) {
    if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8').replace(/\r\n/g, '\n') !== content) throw new Error(`Stale authoring reference: ${name}`);
  } else {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(destination, content, 'utf8');
  }
  console.log(`${check ? 'OK' : 'Wrote'} ${path.relative(root, destination)}`);
}
