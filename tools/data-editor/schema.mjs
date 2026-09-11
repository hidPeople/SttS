import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { inspectModel } from './semantics.mjs';
export const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const slash = p => p.replaceAll('\\', '/');
export function dataFiles(root) {
    const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.ts') ? [slash(path.relative(root, path.join(dir, e.name)))] : []);
    return [...walk(path.join(root, 'src/data')).sort(), 'src/models/types.ts'];
}
export function programFor(root, drafts = {}) {
    const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
    if (config.error)
        throw Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
    const host = ts.createCompilerHost(parsed.options);
    const read = host.readFile;
    host.readFile = file => drafts[slash(path.relative(root, file))] ?? read(file);
    return ts.createProgram(parsed.fileNames, parsed.options, host);
}
export function diagnostics(program, root) {
    return [...program.getSyntacticDiagnostics(), ...program.getSemanticDiagnostics()].map(d => {
        const pos = d.file?.getLineAndCharacterOfPosition(d.start ?? 0);
        return { file: d.file ? slash(path.relative(root, d.file.fileName)) : '', line: pos ? pos.line + 1 : 0, code: d.code, message: ts.flattenDiagnosticMessageText(d.messageText, '\n') };
    });
}
export function mergeProperties(original, fragment) {
    const parse = text => ts.createSourceFile('fragment.ts', `const input = (${text});`, ts.ScriptTarget.Latest, true);
    const old = parse(original), next = parse(`{${fragment}}`);
    if (next.parseDiagnostics.length)
        throw Error('プロパティ記法の構文を確認してください。');
    const expression = f => f.statements[0].declarationList.declarations[0].initializer.expression;
    const a = expression(old), b = expression(next);
    if (!ts.isObjectLiteralExpression(a))
        throw Error('プロパティ記法はオブジェクトのTS欄で使用してください。');
    const replacements = new Map(b.properties.filter(ts.isPropertyAssignment).map(p => [p.name.text ?? p.name.getText(next), p.getText(next)]));
    const properties = a.properties.map(p => {
        const key = p.name?.text ?? p.name?.getText(old), updated = replacements.get(key);
        if (updated) {
            replacements.delete(key);
            return updated;
        }
        return p.getFullText(old).trim();
    });
    properties.push(...replacements.values());
    return `{\n${properties.join(',\n')}\n}`;
}
/** Forms follow the compiler's resolved types (including aliases, mapped types and builder parameters). */
export function analyze(program, root, relative) {
    const file = program.getSourceFile(path.join(root, relative));
    if (!file)
        throw Error(`解析対象がありません: ${relative}`);
    const checker = program.getTypeChecker(), schemas = {}, seen = new Map();
    function schema(type, at = file) {
        if (!type)
            return null;
        if (seen.has(type))
            return seen.get(type);
        const id = `s${seen.size}`;
        seen.set(type, id);
        const s = schemas[id] = { kind: 'expression', name: checker.typeToString(type, at, ts.TypeFormatFlags.NoTruncation) };
        const flags = type.flags;
        if (type.isUnion()) {
            const types = type.types.filter(t => !(t.flags & ts.TypeFlags.Undefined));
            if (types.every(t => t.flags & (ts.TypeFlags.StringLiteral | ts.TypeFlags.NumberLiteral | ts.TypeFlags.BooleanLiteral))) {
                s.kind = 'enum';
                s.values = types.map(t => t.flags & ts.TypeFlags.BooleanLiteral ? t.intrinsicName === 'true' : t.value);
            }
            else {
                s.kind = 'union';
                s.variants = types.map(t => schema(t, at));
            }
        }
        else if (flags & (ts.TypeFlags.StringLiteral | ts.TypeFlags.NumberLiteral)) {
            s.kind = 'enum';
            s.values = [type.value];
        }
        else if (flags & ts.TypeFlags.BooleanLiteral) {
            s.kind = 'enum';
            s.values = [type.intrinsicName === 'true'];
        }
        else if (flags & ts.TypeFlags.String)
            s.kind = 'string';
        else if (flags & ts.TypeFlags.Number)
            s.kind = 'number';
        else if (flags & ts.TypeFlags.Boolean)
            s.kind = 'boolean';
        else if (checker.isArrayType(type) || checker.isTupleType(type)) {
            s.kind = 'array';
            const args = checker.getTypeArguments(type);
            if (checker.isTupleType(type)) {
                s.items = args.map(t => schema(t, at));
                s.minLength = type.target.minLength;
                s.rest = !!type.target.hasRestElement;
                s.element = s.items.at(-1);
            }
            else {
                s.element = schema(args[0], at);
                s.minLength = 0;
            }
        }
        else if (flags & ts.TypeFlags.Object && !type.getCallSignatures().length) {
            s.kind = 'object';
            s.properties = checker.getPropertiesOfType(type).map(p => {
                const decl = p.valueDeclaration ?? p.declarations?.[0] ?? at;
                return { name: p.name, optional: !!(p.flags & ts.SymbolFlags.Optional), schema: schema(checker.getTypeOfSymbolAtLocation(p, decl), decl),
                    doc: ts.displayPartsToString(p.getDocumentationComment(checker)), origin: `${slash(path.relative(root, decl.getSourceFile().fileName))}:${decl.getSourceFile().getLineAndCharacterOfPosition(decl.pos).line + 1}` };
            });
            s.index = schema(checker.getIndexTypeOfType(type, ts.IndexKind.String) ?? checker.getIndexTypeOfType(type, ts.IndexKind.Number), at);
        }
        return id;
    }
    const typeFor = n => checker.getContextualType(n) ?? checker.getTypeAtLocation(n);
    function node(n, expected) {
        const result = { start: n.getStart(file), end: n.end, source: n.getText(file), schema: schema(expected ?? typeFor(n), n) };
        if (ts.isObjectLiteralExpression(n)) {
            result.kind = 'object';
            result.entries = n.properties.map(p => {
                if (ts.isPropertyAssignment(p)) {
                    const keyType = ts.isComputedPropertyName(p.name) ? checker.getTypeAtLocation(p.name.expression) : null;
                    const key = keyType?.isLiteral() ? String(keyType.value) : p.name.text ?? p.name.getText(file);
                    return { key, keySource: p.name.getText(file), node: node(p.initializer), start: p.getFullStart(), end: p.end };
                }
                if (ts.isSpreadAssignment(p))
                    return { key: null, keySource: '...', node: node(p.expression), start: p.getFullStart(), end: p.end };
                return { key: p.name?.getText(file) ?? '?', keySource: p.name?.getText(file), node: node(p), start: p.getFullStart(), end: p.end, shorthand: true };
            });
        }
        else if (ts.isArrayLiteralExpression(n)) {
            result.kind = 'array';
            result.items = n.elements.map(e => node(e));
        }
        else if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
            result.kind = 'string';
            result.value = n.text;
        }
        else if (ts.isNumericLiteral(n) || ts.isPrefixUnaryExpression(n) && ts.isNumericLiteral(n.operand)) {
            result.kind = 'number';
            result.value = Number(n.getText(file));
        }
        else if ([ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword].includes(n.kind)) {
            result.kind = 'boolean';
            result.value = n.kind === ts.SyntaxKind.TrueKeyword;
        }
        else if (ts.isCallExpression(n) || ts.isNewExpression(n)) {
            result.kind = 'call';
            result.callee = n.expression.getText(file);
            result.construct = ts.isNewExpression(n);
            const sig = checker.getResolvedSignature(n);
            result.parameters = (sig?.parameters ?? []).map(p => {
                const d = p.valueDeclaration ?? p.declarations?.[0];
                return { name: p.name, optional: !!(d?.questionToken || d?.initializer || d?.dotDotDotToken), schema: schema(checker.getTypeOfSymbolAtLocation(p, d ?? n), n), default: d?.initializer?.getText() };
            });
            result.args = (n.arguments ?? []).map((a, i) => node(a, sig?.parameters[i] ? checker.getTypeOfSymbolAtLocation(sig.parameters[i], a) : undefined));
        }
        else if (ts.isAsExpression(n) || ts.isSatisfiesExpression(n) || ts.isParenthesizedExpression(n)) {
            result.kind = 'wrap';
            result.inner = node(n.expression, expected);
        }
        else {
            result.kind = 'expression';
            const actual = checker.getTypeAtLocation(n);
            if (actual.isLiteral())
                result.value = actual.value;
        }
        return result;
    }
    const declarations = [];
    for (const st of file.statements) {
        if (ts.isTypeAliasDeclaration(st)) {
            const types = ts.isUnionTypeNode(st.type) ? st.type.types : [st.type];
            if (types.every(t => ts.isLiteralTypeNode(t) && (ts.isStringLiteral(t.literal) || ts.isNumericLiteral(t.literal)))) {
                const id = `type-list-${st.name.text}`, valueId = `${id}-value`;
                schemas[valueId] = { kind: types.every(t => ts.isNumericLiteral(t.literal)) ? 'number' : 'string', name: '型の選択肢' };
                schemas[id] = { kind: 'array', name: st.name.text, element: valueId, minLength: 1 };
                declarations.push({ name: `型: ${st.name.text}`, typeDefinition: true, node: { kind: 'array', schema: id, start: st.type.getStart(file), end: st.type.end, source: st.type.getText(file), separator: ' | ', items: types.map(t => ({ ...node(t.literal), schema: valueId })) } });
            }
        }
        if (ts.isVariableStatement(st))
            for (const d of st.declarationList.declarations)
                if (d.initializer)
                    declarations.push({ name: d.name.getText(file), node: node(d.initializer, checker.getTypeAtLocation(d.name)), exported: !!st.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) });
        // Generated data stays generated: expose its literal templates in the original lexical scope.
        if (ts.isFunctionDeclaration(st)) {
            let index = 0;
            const visit = n => {
                if (ts.isObjectLiteralExpression(n)) {
                    declarations.push({ name: `${st.name?.text} / 生成テンプレート ${++index}`, node: node(n), template: true });
                    return;
                }
                ts.forEachChild(n, visit);
            };
            if (st.body)
                visit(st.body);
        }
    }
    const constructors = [];
    for (const symbol of checker.getSymbolsInScope(file, ts.SymbolFlags.Function | ts.SymbolFlags.Alias)) {
        const signatures = checker.getTypeOfSymbolAtLocation(symbol, file).getCallSignatures();
        for (const sig of signatures) {
            const d = sig.declaration;
            if (!d || !slash(d.getSourceFile().fileName).startsWith(slash(path.join(root, 'src'))))
                continue;
            constructors.push({ name: symbol.name, result: schema(sig.getReturnType(), d), parameters: sig.parameters.map(p => {
                    const pd = p.valueDeclaration ?? p.declarations?.[0];
                    return { name: p.name, optional: !!(pd?.questionToken || pd?.initializer), schema: schema(checker.getTypeOfSymbolAtLocation(p, pd ?? d), pd ?? d) };
                }) });
        }
    }
    const model = { file: relative, source: file.text, sourceHash: hash(file.text), declarations, schemas, constructors };
    model.issues = inspectModel(model);
    return model;
}
export function formatSource(source) {
    const file = 'editing.ts';
    if (ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true).parseDiagnostics.length) return source;
    const service = ts.createLanguageService({ getCompilationSettings: () => ({}), getScriptFileNames: () => [file], getScriptVersion: () => '1', getScriptSnapshot: () => ts.ScriptSnapshot.fromString(source), getCurrentDirectory: () => '', getDefaultLibFileName: () => '', fileExists: () => true, readFile: () => source });
    try {
        const edits = service.getFormattingEditsForDocument(file, { indentSize: 2, tabSize: 2, convertTabsToSpaces: true, newLineCharacter: source.includes('\r\n') ? '\r\n' : '\n', semicolons: ts.SemicolonPreference.Insert, insertSpaceAfterCommaDelimiter: true, insertSpaceBeforeAndAfterBinaryOperators: true, insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true });
        for (const e of edits.sort((a, b) => b.span.start - a.span.start)) source = source.slice(0, e.span.start) + e.newText + source.slice(e.span.start + e.span.length);
        return source;
    } finally { service.dispose(); }
}
export function contracts(program, root) {
    const result = {};
    const checker = program.getTypeChecker();
    for (const f of program.getSourceFiles()) {
        const relative = slash(path.relative(root, f.fileName));
        if (!(relative.startsWith('src/data/') || relative === 'src/models/types.ts' || relative === 'src/models/localization.ts'))
            continue;
        result[relative] = {};
        for (const n of f.statements) {
            if (ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n))
                result[relative][n.name.text] = n.getText(f).replace(/\s+/g, ' ');
            if (ts.isFunctionDeclaration(n))
                result[relative][`${n.name?.text}()`] = n.getText(f).slice(0, n.body ? n.body.getStart(f) - n.getStart(f) : undefined).replace(/\s+/g, ' ');
            if (ts.isVariableStatement(n))
                for (const d of n.declarationList.declarations)
                    result[relative][`const ${d.name.getText(f)}`] = d.type?.getText(f) ?? checker.typeToString(checker.getTypeAtLocation(d.name), d, ts.TypeFormatFlags.NoTruncation);
        }
    }
    return result;
}
export function contractChanges(before, after) {
    const changes = [];
    for (const file of new Set([...Object.keys(before), ...Object.keys(after)]))
        for (const name of new Set([...Object.keys(before[file] ?? {}), ...Object.keys(after[file] ?? {})])) {
            const previous = before[file]?.[name], current = after[file]?.[name];
            if (previous !== current)
                changes.push({ file, name, previous: previous ?? '(追加)', current: current ?? '(削除)', message: `データ編集ツールの追従確認をお願いします。${file} の ${name} が変更されました。\n以前: ${previous ?? '(なし)'}\n現在: ${current ?? '(なし)'}\n選択肢は最新ソースから再取得済みです。フォーム・参照・Tips・プレビューの対応を確認し、必要なら tools/data-editor を修正してください。` });
        }
    return changes;
}
