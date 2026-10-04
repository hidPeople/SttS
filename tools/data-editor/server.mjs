import { cardTextPreview } from './card-text-preview.mjs';
import { cardArtworkPreviewConfig } from './card-artwork-preview.mjs';
import { validateCardArtworkReferences } from './card-artwork-reference.mjs';
import ts from 'typescript';
import { portraitPreviewConfig, implementationPortraitPlacement } from './portrait-preview-config.mjs';
import { referenceFieldRule } from './public/reference-fields.js';
import { statusReferenceOptions, validateStatusIconReferences, validateRelicIconReferences } from './status-icon-references.mjs';
import http from 'node:http';
import fs from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import { validatePortraitModels } from './portrait-validation.mjs';
import { validateTutorialTips } from './tutorial-tips-validation.mjs';
import { validateBattlePresentation } from './battle-presentation-validation.mjs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { analyze, contracts, contractChanges, dataFiles, diagnostics, hash, programFor, mergeProperties, formatSource } from './schema.mjs';
import { ensureRequirements, inspectModel } from './semantics.mjs';
import { editLiteral, numericEdits, referenceSignature } from './literal-edit.mjs';
import { updateLiteralModel } from './public/field-policy.js';
import { validateSpriteModels } from './sprite-validation.mjs';
import { validateEventModels } from './event-validation.mjs';
import { atomicWrite, safeFile, Transactions } from './transaction.mjs';
const toolRoot = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(toolRoot, '../..');
const stateFile = path.join(process.env.STTS_EDITOR_STATE_DIR ?? path.join(toolRoot, '.state'), 'drafts.json');
const token = crypto.randomBytes(24).toString('hex');
const transactions = new Transactions(root, toolRoot);
const recovery = await transactions.recover();
let drafts = {};
try {
    drafts = JSON.parse(await fs.readFile(stateFile, 'utf8'));
}
catch (e) {
    if (e.code !== 'ENOENT')
        throw e;
}
for (const [file, d] of Object.entries(drafts)) {
    const current = await fs.readFile(await safeFile(root, file), 'utf8');
    if (d.source === current)
        delete drafts[file];
}
let baseContract = {};
try {
    baseContract = JSON.parse(await fs.readFile(path.join(toolRoot, 'schema-baseline.json'), 'utf8'));
}
catch { }
let currentProgram, programDirty = false, activeModel, portraitConfigCache;
const sources = () => Object.fromEntries(Object.entries(drafts).map(([file, d]) => [file, d.source]));
const refresh = () => { programDirty = false; activeModel = undefined; return currentProgram = programFor(root, sources()); };
const ensureProgram = () => {
    if (!programDirty) return;
    // Deferred scalar changes already updated this model. A dependent preview
    // may need fresh compiler values without discarding the editable model.
    const retained = activeModel;
    refresh();
    activeModel = retained;
};
function patchActiveModel(file, edits, sourceHash) {
    if (activeModel?.file !== file) return;
    for (const edit of edits) {
        const value = ts.createSourceFile('v.ts', `const v = ${edit.replacement}`, ts.ScriptTarget.Latest, true).statements[0].declarationList.declarations[0].initializer;
        updateLiteralModel(activeModel, { start: edit.start, end: edit.end }, edit.replacement,
            ts.isStringLiteralLike(value) ? value.text : Number(edit.replacement), sourceHash);
    }
    activeModel.diagnostics = [];
    activeModel.issues = inspectModel(activeModel);
}
function canPatchNumbers(file, edits) {
    if (!edits || file === 'src/models/types.ts' || activeModel?.file !== file) return false;
    const literals = new Set();
    function visit(n) {
        if (n.kind === 'number' && n.ensureOwner === undefined && activeModel.schemas[n.schema]?.kind === 'number') literals.add(`${n.start}:${n.end}`);
        for (const child of [...(n.args ?? []), ...(n.items ?? []), ...(n.entries ?? []).map(e => e.node), ...(n.inner ? [n.inner] : [])]) visit(child);
    }
    activeModel.declarations.forEach(d => visit(d.node));
    return edits.every(edit => literals.has(`${edit.start}:${edit.end}`));
}
refresh();
async function catalog() {
    const diskProgram = programFor(root);
    return { imageFiles: await imageNames(), files: await Promise.all(dataFiles(root).map(async (file) => ({ file, dirty: !!drafts[file], conflict: drafts[file] ? hash(await fs.readFile(await safeFile(root, file), 'utf8')) !== hash(drafts[file].base) : false }))), changes: contractChanges(baseContract, contracts(diskProgram, root)), recovery,
        assets: [...(await fs.readdir(path.join(root, 'Sprite'))).filter(f => /\.(png|webp|jpg|jpeg)$/i.test(f)), ...(await fs.readdir(path.join(root, 'image/character')).catch(error => { if (error.code === 'ENOENT') return []; throw error; })).filter(f => /\.(png|webp|jpg|jpeg)$/i.test(f)).map(f => 'character/' + f)], refs: referenceOptions(currentProgram) };
}
async function imageNames(relative = '') {
    const files = await fs.readdir(path.join(root, 'image', relative), { withFileTypes: true });
    return (await Promise.all(files.map(entry => entry.isDirectory() ? imageNames(relative + entry.name + '/') : entry.isFile() && /\.(png|webp|jpe?g)$/i.test(entry.name) ? [relative + entry.name] : []))).flat();
}
function referenceOptions(program) {
    const result = {};
    for (const [file, name, group = file] of [['cards', 'CARD_DEFINITIONS'], ['relics', 'RELIC_DEFINITIONS'], ['statuses', 'STATUS_DESCRIPTIONS'], ['enemies', 'ENEMY_DEFINITIONS'], ['enemySprites', 'ENEMY_SPRITES'], ['sprites', 'EFFECT_SPRITES', 'effectSprites'], ['sprites', 'UI_SPRITES', 'uiSprites'], ['characterPortraits', 'CHARACTER_PORTRAITS', 'characterSprites'], ['conversations', 'CONVERSATIONS'], ['eventBattles', 'EVENT_BATTLES']]) {
        const decl = analyze(program, root, `src/data/${file}.ts`).declarations.find(d => d.name === name)?.node;
        result[group] = decl?.entries?.filter(e => e.key).map(e => {
            const obj = e.node.kind === 'call' ? e.node.args[0] : e.node;
            const localizedName = obj?.entries?.find(p => p.key === 'name')?.node;
            return { key: e.key, id: obj?.entries?.find(p => p.key === 'id')?.node.value, label: localizedName?.args?.[1]?.value ?? localizedName?.entries?.find(p => p.key === 'ja')?.node.value ?? localizedName?.value ?? e.key,
                assetFile: name === 'CHARACTER_PORTRAITS' ? e.key + '.png' : obj?.entries?.find(p => p.key === 'source')?.node.source.match(/image\/character\/([^'"`]+)/)?.[1],
                definition: { file: `src/data/${file}.ts`, declaration: name, entry: e.key, name: e.key } };
        }) ?? [];
    }
    result.statuses = statusReferenceOptions(program, root, result.statuses);
    result.battles = [{ key: 'normal', label: '通常戦闘' }, ...result.eventBattles];
    result.cardArtwork = analyze(program, root, 'src/data/cardAppearance.ts').declarations.find(d => d.name === 'CARD_ARTWORK')?.node.entries?.map(e => ({ key: e.key, label: e.key, definition: { file: 'src/data/cardAppearance.ts', declaration: 'CARD_ARTWORK', entry: e.key, name: e.key } })) ?? [];
    for (const file of readdirSync(path.join(root, 'image/character')).filter(f => /^.+_.+_[1-9]\d*\.png$/.test(f))) {
        const key = file.slice(0, -4);
        if (!result.characterSprites.some(r => r.key === key)) result.characterSprites.push({ key, label: key, assetFile: file });
    }
    return result;
}
function preflight() {
    const refs = referenceOptions(currentProgram);
    const issues = [...diagnostics(currentProgram, root), ...validateSpriteModels([
        analyze(currentProgram, root, 'src/data/enemySprites.ts'),
        analyze(currentProgram, root, 'src/data/sprites.ts'),
        analyze(currentProgram, root, 'src/data/characterPortraits.ts'),
    ])];
    issues.push(...validateEventModels(root, analyze(currentProgram, root, 'src/data/conversations.ts'), analyze(currentProgram, root, 'src/data/eventBattles.ts'), analyze(currentProgram, root, 'src/data/characterPortraits.ts')));
    issues.push(...validateTutorialTips(analyze(currentProgram, root, 'src/data/tutorialTips.ts')));
    issues.push(...validateCardArtworkReferences(analyze(currentProgram, root, 'src/data/cardAppearance.ts')));
    issues.push(...validateStatusIconReferences(analyze(currentProgram, root, 'src/data/statuses.ts')));
    issues.push(...validateRelicIconReferences(analyze(currentProgram, root, 'src/data/relics.ts')));
    issues.push(...validatePortraitModels(root, analyze(currentProgram, root, 'src/data/characterPortraits.ts'), analyze(currentProgram, root, 'src/data/portraitFactors.ts')));
    issues.push(...validateBattlePresentation(root, analyze(currentProgram, root, 'src/data/battlePresentation.ts'), analyze(currentProgram, root, 'src/data/eventBattles.ts')));
    for (const file of dataFiles(root).filter(f => f.startsWith('src/data/'))) {
        const model = analyze(currentProgram, root, file);
        issues.push(...model.issues);
        function visit(n, key, location, declarationName) {
            const reference = referenceFieldRule(key, declarationName);
            if (n.kind === 'string' && n.value.trim() && reference) {
                const [group, property] = reference;
                if (!refs[group].some(r => (r[property] ?? r.key) === n.value)) issues.push({ file, line: model.source.slice(0, n.start).split('\n').length, code: 'CONFIG', message: `${location}: 参照先「${n.value}」が ${group} に登録されていません。` });
            }
            for (const e of n.entries ?? []) visit(e.node, e.key, `${location}.${e.key}`, declarationName);
            (n.args ?? []).forEach((arg, i) => visit(arg, n.parameters[i]?.name, `${location}.${n.parameters[i]?.name ?? i}`, declarationName));
            (n.items ?? []).forEach((arg, i) => visit(arg, key, `${location}[${i + 1}]`, declarationName));
            if (n.inner) visit(n.inner, key, location, declarationName);
        }
        for (const d of model.declarations.filter(d => !d.template && !d.typeDefinition)) visit(d.node, d.name, d.name, d.name);
    }
    return issues;
}
async function body(req) {
    let text = '';
    for await (const chunk of req) {
        text += chunk;
        if (text.length > 8000000)
            throw Error('入力サイズが大きすぎます。');
    }
    return JSON.parse(text || '{}');
}
function json(res, value, status = 200) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); }
let modifying = false;
const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const expectedHost = `127.0.0.1:${server.address().port}`;
        if (req.headers.host !== expectedHost || req.headers.origin && req.headers.origin !== `http://${expectedHost}`)
            return json(res, { error: 'ローカルのツール画面から操作してください。' }, 403);
        if (url.pathname.startsWith('/api/')) {
            if (req.headers['x-editor-token'] !== token)
                return json(res, { error: 'セッションが変わりました。画面を再読み込みしてください。' }, 403);
            // Numeric/text saves don't invalidate unrelated preview configuration.
            // Compiler work is deferred until a schema-dependent request needs it.
            if (['/api/catalog', '/api/card-text-preview', '/api/card-artwork-preview'].includes(url.pathname)) ensureProgram();
            if (req.method === 'GET' && url.pathname === '/api/catalog')
                return json(res, await catalog());
            if (req.method === 'GET' && url.pathname === '/api/card-text-preview')
                return json(res, cardTextPreview(currentProgram, root, url.searchParams.get('entry')));
            if (req.method === 'GET' && url.pathname === '/api/card-artwork-preview')
                return json(res, cardArtworkPreviewConfig(currentProgram, root, url.searchParams.get('entry')));
            if (req.method === 'GET' && url.pathname === '/api/portrait-preview') {
                const dependencies = ['src/data/ui.ts', 'src/data/player.ts', 'src/data/battlePresentation.ts'];
                const key = dependencies.map(file => drafts[file]?.source ?? '').join('\0');
                if (!portraitConfigCache || portraitConfigCache.key !== key) {
                    ensureProgram();
                    portraitConfigCache = { key, config: portraitPreviewConfig(currentProgram, root) };
                }
                return json(res, portraitConfigCache.config);
            }
            if (req.method === 'GET' && url.pathname === '/api/portrait-placement')
                return json(res, implementationPortraitPlacement(await fs.readFile(path.join(root, 'src/data/characterPortraits.ts'), 'utf8'), url.searchParams.get('id')));
            if (req.method === 'GET' && url.pathname === '/api/file') {
                const file = url.searchParams.get('file');
                await safeFile(root, file);
                if (activeModel?.file !== file) { ensureProgram(); activeModel = analyze(currentProgram, root, file); }
                return json(res, { ...activeModel, base: drafts[file]?.base });
            }
            if (req.method !== 'POST')
                return json(res, { error: '未対応の操作です。' }, 404);
            if (modifying || transactions.busy)
                return json(res, { error: '処理中です。完了後に再操作してください。' }, 409);
            modifying = true;
            try {
                const input = await body(req);
                if (url.pathname === '/api/literal') {
                    const file = input.file, target = await safeFile(root, file);
                    const previous = drafts[file]?.source ?? await fs.readFile(target, 'utf8');
                    if (!input.previousHash || input.previousHash !== hash(previous)) throw Error('別の画面または更新操作で下書きが変わりました。入力をコピーしてから最新の情報を取得してください。');
                    const source = editLiteral(previous, input), base = drafts[file]?.base ?? previous;
                    const nextDrafts = { ...drafts, [file]: { base, source } };
                    if (source === base) delete nextDrafts[file];
                    await atomicWrite(stateFile, JSON.stringify(nextDrafts));
                    drafts = nextDrafts;
                    programDirty = true;
                    patchActiveModel(file, [input], hash(source));
                    const refsChanged = referenceSignature(previous) !== referenceSignature(source);
                    let refs;
                    if (refsChanged) { ensureProgram(); refs = referenceOptions(currentProgram); }
                    return json(res, { sourceHash: hash(source), dirty: source !== base, refs });
                }
                if (url.pathname === '/api/snippet')
                    return json(res, { source: mergeProperties(input.original, input.fragment) });
                if (url.pathname === '/api/analyze') {
                    const file = input.file, target = await safeFile(root, file);
                    if (typeof input.source !== 'string')
                        throw Error('TypeScriptソースを入力してください。');
                    const syntax = ts.createSourceFile(file, input.source, ts.ScriptTarget.Latest, true);
                    if (syntax.parseDiagnostics.length) throw Error(syntax.parseDiagnostics.map(d => `${file}:${syntax.getLineAndCharacterOfPosition(d.start ?? 0).line + 1} ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`).join('\n'));
                    const analyzedSource = drafts[file]?.source ?? await fs.readFile(target, 'utf8');
                    if (input.previousHash && input.previousHash !== hash(analyzedSource))
                        throw Error('別の画面または更新操作で下書きが変わりました。入力をコピーしてから最新の情報を取得してください。');
                    const base = drafts[file]?.base ?? analyzedSource;
                    const edits = numericEdits(analyzedSource, input.source);
                    if (canPatchNumbers(file, edits)) {
                        const nextDrafts = { ...drafts, [file]: { base, source: input.source } };
                        if (base === input.source) delete nextDrafts[file];
                        await atomicWrite(stateFile, JSON.stringify(nextDrafts));
                        drafts = nextDrafts;
                        patchActiveModel(file, edits, hash(input.source));
                        programDirty = true;
                        return json(res, { ...activeModel, base });
                    }
                    if (Number.isInteger(input.ensureAt)) {
                        const proposed = programFor(root, { ...sources(), [file]: input.source });
                        input.source = ensureRequirements(analyze(proposed, root, file), input.ensureAt);
                    }
                    input.source = formatSource(input.source);
                    drafts[file] = { base, source: input.source };
                    if (base === input.source)
                        delete drafts[file];
                    await atomicWrite(stateFile, JSON.stringify(drafts));
                    refresh();
                    activeModel = analyze(currentProgram, root, file);
                    const refsChanged = file === 'src/models/types.ts' || referenceSignature(analyzedSource) !== referenceSignature(input.source);
                    return json(res, { ...activeModel, base, ...(refsChanged ? { refs: referenceOptions(currentProgram) } : {}) });
                }
                if (url.pathname === '/api/refresh') {
                    portraitConfigCache = undefined;
                    refresh();
                    return json(res, await catalog());
                }
                if (url.pathname === '/api/discard') {
                    portraitConfigCache = undefined;
                    await safeFile(root, input.file);
                    delete drafts[input.file];
                    await atomicWrite(stateFile, JSON.stringify(drafts));
                    refresh();
                    return json(res, await catalog());
                }
                if (url.pathname === '/api/validate') {
                    refresh();
                    return json(res, { diagnostics: preflight() });
                }
                if (url.pathname === '/api/apply') {
                    const build = input.build !== false;
                    if (build) refresh();
                    const errors = build ? preflight() : [];
                    if (errors.length) return json(res, { ok: false, validationFailed: true, log: errors.map(d => `${d.file}:${d.line} ${d.code}\n${d.message}`).join('\n\n'), diagnostics: errors });
                    const result = await transactions.apply(drafts, { build });
                    if (result.ok) {
                        drafts = {};
                        await atomicWrite(stateFile, '{}');
                    }
                    if (build) refresh();
                    else programDirty = true;
                    return json(res, result);
                }
                if (url.pathname === '/api/build') return json(res, await transactions.buildOnly());
                return json(res, { error: '未対応の操作です。' }, 404);
            }
            finally {
                modifying = false;
            }
        }
        if (req.method !== 'GET')
            return json(res, { error: '未対応の操作です。' }, 405);
        const sharedDrawing = { '/shared/cardArtworkCanvas.js': 'src/ui/cardArtworkCanvas.ts', '/shared/cardArtworkGeometry.js': 'src/models/cardArtworkGeometry.ts', '/shared/cardArtworkVariants.js': 'src/models/cardArtworkVariants.ts' };
        if (sharedDrawing[url.pathname]) {
            const source = await fs.readFile(path.join(root, sharedDrawing[url.pathname]), 'utf8');
            const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
            res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(code);
            return;
        }
        if (url.pathname === '/asset') {
            const asset = url.searchParams.get('name');
            if (!asset || !/^(?:(?:character|background|card)\/)?[^/\\:]+\.(png|webp|jpg|jpeg)$/i.test(asset))
                throw Error('画像ファイル名が不正です。');
            const assetRoot = await fs.realpath(path.join(root, asset.startsWith('character/') ? 'image/character' : asset.startsWith('background/') ? 'image/background' : asset.startsWith('card/') ? 'image/card' : 'Sprite'));
            const file = await fs.realpath(path.join(assetRoot, path.basename(asset)));
            if (!file.startsWith(`${assetRoot}${path.sep}`))
                throw Error('画像の参照先が不正です。');
            res.writeHead(200, { 'Content-Type': asset.endsWith('.png') ? 'image/png' : asset.endsWith('.webp') ? 'image/webp' : 'image/jpeg', 'Cache-Control': 'no-cache' });
            res.end(await fs.readFile(file));
            return;
        }
        const allowed = { '/source-format.js': ['source-format.js', 'text/javascript'], '/diagnostic-navigation.js': ['diagnostic-navigation.js', 'text/javascript'], '/portrait-preview.js': ['portrait-preview.js', 'text/javascript'], '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/reference-fields.js': ['reference-fields.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'], '/help.js': ['help.js', 'text/javascript'], '/field-policy.js': ['field-policy.js', 'text/javascript'], '/sprite-checker.js': ['sprite-checker.js', 'text/javascript'], '/sprite-edit.js': ['sprite-edit.js', 'text/javascript'], '/sprite-values.js': ['sprite-values.js', 'text/javascript'] };
        allowed['/card-artwork-editor.js'] = ['card-artwork-editor.js', 'text/javascript'];
        allowed['/card-artwork-edit.js'] = ['card-artwork-edit.js', 'text/javascript'];
        allowed['/selection-glow-preview.js'] = ['selection-glow-preview.js', 'text/javascript'];
        if (!allowed[url.pathname])
            return json(res, { error: 'Not found' }, 404);
        const [file, mime] = allowed[url.pathname];
        let content = await fs.readFile(path.join(toolRoot, 'public', file), 'utf8');
        if (file === 'index.html')
            content = content.replace('__TOKEN__', token);
        res.writeHead(200, { 'Content-Type': `${mime}; charset=utf-8`, 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'" });
        res.end(content);
    }
    catch (error) {
        json(res, { error: error.message }, 400);
    }
});
const port = Number(process.env.STTS_EDITOR_PORT ?? 5190);
server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${server.address().port}`;
    console.log(`SttS データ編集ツール: ${url}\n終了: Ctrl+C / 下書きとバックアップは tools/data-editor 内に保存されます。`);
    if (process.argv.includes('--open') && process.platform === 'win32')
        spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], { windowsHide: true });
});
server.on('error', error => { console.error(`起動できません: ${error.message}`); process.exitCode = 1; });
