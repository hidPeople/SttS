import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Checks documented coverage and type-checks the actual Markdown examples.
// Virtual source files are never written into src/data.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');
const guideFiles = ['01-authoring-knowledge.md', '04-flavor-guide.md', '05-conversation-guide.md'];
const knowledge = guideFiles.map(file => read(`docs/ai-authoring/${file}`)).join('\n');
const reference = read('docs/ai-authoring/02-current-reference.md');
const sf = ts.createSourceFile('types.ts', read('src/models/types.ts'), ts.ScriptTarget.Latest, true);
const contracts = new Map(sf.statements.filter(s => s.name).map(s => [s.name.getText(sf), s]));
const kinds = contracts.get('ConditionKind').type.types.map(t => t.literal.text);
const statuses = contracts.get('StatusEffect').type.types.map(t => t.literal.text);
const events = [];
for (const st of sf.statements) if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) {
  if (d.name.getText(sf) !== 'FLAVOR_EVENTS') continue;
  for (const group of d.initializer.expression.properties) {
    for (const event of group.initializer.properties) events.push(`${group.name.getText(sf)}.${event.name.getText(sf)}`);
  }
}
const missing = [
  ...events.filter(e => !knowledge.includes(`| ${e} |`)),
  ...kinds.filter(k => !knowledge.includes(`| \`${k}\` |`)),
  ...statuses.filter(s => !reference.includes(`| \`${s}\` |`)),
];
if (missing.length) throw new Error(`Missing documented contracts: ${missing.join(', ')}`);

const snippets = guideFiles.flatMap(file => {
  const content = read(`docs/ai-authoring/${file}`);
  const officialStart = content.indexOf('<!-- official-example:start -->');
  const officialEnd = content.indexOf('<!-- official-example:end -->');
  return [...content.matchAll(/```ts\n([\s\S]*?)```/g)].map(m => ({
    code: m[1].trimStart(),
    official: officialStart >= 0 && m.index > officialStart && m.index < officialEnd,
  }));
});
const prelude = `import { text as l } from '../models/localization';
import { FLAVOR_EVENTS, type BattleFlavorSet, type BattleFlavorEntry, type BattleFlavorVariant, type ConditionDefinition } from '../models/types';
import { condition } from './effectBuilders';
import type { ConversationPage, ConversationEventMetadata } from './conversations';
import type { EventBattleDefinition } from './eventBattles';\n`;
const virtual = new Map();
let checkedPages = 0;
let officialExamples = 0;
for (const [index, { code, official }] of snippets.entries()) {
  let wrapped;
  if (code.startsWith('import ')) wrapped = code;
  else if (code.startsWith('l(')) wrapped = prelude + code;
  else if (code.startsWith('condition(')) wrapped = prelude + `const example: ConditionDefinition = ${code};`;
  else if (code.startsWith('flavors:')) wrapped = prelude + `const example: { flavors: BattleFlavorSet } = {\n${code}\n};`;
  else if (code.startsWith('[FLAVOR_EVENTS.')) wrapped = prelude + `const example: BattleFlavorSet = {\n${code}\n};`;
  else if (code.startsWith('defeatConversations:')) wrapped = prelude + `const example: Pick<EventBattleDefinition, 'defeatConversations'> = {\n${code}\n};`;
  else if (code.startsWith('conditions:')) wrapped = prelude + `const example: Pick<BattleFlavorVariant, 'conditions'> = {\n${code}\n};`;
  else if (code.startsWith('{')) wrapped = prelude + `const example: BattleFlavorEntry[] = [\n${code}\n];`;
  else if (/^\w+:/.test(code)) wrapped = prelude + `const example: Record<string, ${code.includes('gallery:') ? 'ConversationEventMetadata' : 'ConversationPage[]'}> = {\n${code}\n};`;
  else throw new Error(`Unrecognized example ${index + 1}`);
  // The authoring contract is intentionally stricter than the runtime type:
  // every novel page must include both fixed empty fields.
  const parsed = ts.createSourceFile('example.ts', wrapped, ts.ScriptTarget.Latest, true);
  function checkPage(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const fields = new Map(node.properties.filter(ts.isPropertyAssignment).map(p => [p.name.getText(parsed), p.initializer]));
      if (fields.has('speaker')) {
        for (const key of ['portrait', 'background']) {
          const value = fields.get(key);
          if (!value || !ts.isStringLiteral(value) || value.text !== '') throw new Error(`Example ${index + 1}: ${key} must be an explicit empty string`);
        }
        checkedPages++;
      }
    }
    ts.forEachChild(node, checkPage);
  }
  // Exact official copies keep their original field values; still type-check them.
  if (official) officialExamples++;
  else checkPage(parsed);
  virtual.set(path.join(root, 'src/data', `__authoring_example_${index + 1}.ts`), wrapped);
}
const configFile = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
const options = { ...config.options, noEmit: true, noUnusedLocals: false, noUnusedParameters: false };
const host = ts.createCompilerHost(options);
const norm = p => path.resolve(p).toLowerCase();
const normalized = new Map([...virtual].map(([p, c]) => [norm(p), c]));
const getSourceFile = host.getSourceFile.bind(host);
const fileExists = host.fileExists.bind(host);
const readFile = host.readFile.bind(host);
host.fileExists = p => normalized.has(norm(p)) || fileExists(p);
host.readFile = p => normalized.get(norm(p)) ?? readFile(p);
host.getSourceFile = (p, version, onError, fresh) => normalized.has(norm(p))
  ? ts.createSourceFile(p, normalized.get(norm(p)), version, true)
  : getSourceFile(p, version, onError, fresh);
const program = ts.createProgram([...virtual.keys(), path.join(root, 'src/vite-env.d.ts')], options, host);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: f => f, getCurrentDirectory: () => root, getNewLine: () => '\n',
  }));
  process.exitCode = 1;
} else {
  console.log(`OK: ${events.length} events, ${kinds.length} conditions, ${statuses.length} statuses, ${snippets.length} typed examples (${officialExamples} official copies), ${checkedPages} pages with fixed empty fields`);
}
