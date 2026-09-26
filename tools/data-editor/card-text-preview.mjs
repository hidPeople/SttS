// Base card text preview uses the SAME model renderer, with inert draft values.
// Draft expressions are never evaluated as JavaScript.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { analyze } from './schema.mjs';

function number(node) {
  if(ts.isNumericLiteral(node)) return Number(node.text);
  if(ts.isParenthesizedExpression(node)) return number(node.expression);
  if(ts.isPrefixUnaryExpression(node)) return node.operator === ts.SyntaxKind.MinusToken ? -number(node.operand) : number(node.operand);
  if(ts.isBinaryExpression(node)) {
    const a = number(node.left), b = number(node.right);
    switch(node.operatorToken.kind) { case ts.SyntaxKind.PlusToken: return a + b; case ts.SyntaxKind.MinusToken: return a - b; case ts.SyntaxKind.AsteriskToken: return a * b; case ts.SyntaxKind.SlashToken: return a / b; }
  }
  return NaN;
}
function value(node) {
  if(!node) return undefined;
  if(node.kind === 'wrap') return value(node.inner);
  if(['string', 'number', 'boolean'].includes(node.kind)) return node.value;
  if(node.kind === 'array') return node.items.map(value);
  if(node.kind === 'object') return Object.fromEntries(node.entries.filter(e => e.key && !['flavors', 'triggers', 'visuals'].includes(e.key)).map(e => [e.key, value(e.node)]));
  if(node.kind === 'call') {
    if(node.callee === 'l' || node.callee === 'text') return { en: value(node.args[0]), ja: value(node.args[1]) };
    if(node.callee === 'defineCard') {
      const card = value(node.args[0]); return { ...card, conditions: card.conditions ?? (card.playCondition === 'noCardsPlayedThisTurn' ? [{ kind: 'cardsPlayedThisTurn', operator: 'eq', value: 0 }] : []), textOrder: card.textOrder ?? Object.keys(card).map(k => k === 'playCondition' ? 'conditions' : k).filter(k => ['description', 'conditions', 'effects', 'categories', 'vanish', 'temporary'].includes(k)) };
    }
    if(node.callee === 'effect') return { kind: value(node.args[0]), target: value(node.args[1]), amount: value(node.args[2]), times: 1, ...value(node.args[3]) };
    if(node.callee === 'condition') return { kind: value(node.args[0]), operator: value(node.args[1]), ...value(node.args[2]) };
    if(['defineStatus', 'defineRelic'].includes(node.callee)) return value(node.args[0]);
  }
  const source = ts.createSourceFile('number.ts', '(' + node.source + ')', ts.ScriptTarget.Latest, true);
  const numeric = number(source.statements[0]?.expression);
  if(Number.isFinite(numeric)) return numeric;
  return undefined;
}
export function cardTextPreview(program, root, entry) {
  const read = file => Object.fromEntries(analyze(program, root, file).declarations.filter(d => !d.typeDefinition).map(d => [d.name, value(d.node)]));
  const cards = read('src/data/cards.ts').CARD_DEFINITIONS;
  const card = cards?.[entry];
  if(!card) throw Error('カードを選択してください。');
  if(card.effects.some(e => !e || typeof e.amount !== 'number')) throw Error('プレビューで解釈できない効果の式があります。リテラル値・四則演算・effect()が対応対象です。');
  const deps = {    
...read('src/data/cardText.ts'), CARD_DEFINITIONS: cards, STATUS_DESCRIPTIONS: read('src/data/statuses.ts').STATUS_DESCRIPTIONS, RELIC_DEFINITIONS: read('src/data/relics.ts').RELIC_DEFINITIONS,
    SETTINGS_STATE: { language: 'ja' }, localizeGameText: (v, lang = 'ja', replacements = {}) => {
      const text = typeof v === 'string' ? v : v?.[lang] ?? '';
      return text.replace(/\{([^{}]+)\}/g, (match, key) => replacements[key] ?? match);
    }  
};
  // Only trusted model implementation is compiled. Data above comes from the typed syntax tree.
  const file = path.join(root, 'src/models/cardDescription.ts');
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const code = source.statements.filter(n => !ts.isImportDeclaration(n)).map(n => n.getText(source).replace(/^export\s+/, '')).join('\n');
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const renderer = new Function(...Object.keys(deps), js + ';return {cardDescriptionLines,cardTextIssues};')(...Object.values(deps));
  return { ja: renderer.cardDescriptionLines(card, 'ja'), en: renderer.cardDescriptionLines(card, 'en'), issues: renderer.cardTextIssues(card) };
}
