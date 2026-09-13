import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { analyze, contracts, contractChanges, dataFiles, diagnostics, hash, programFor, mergeProperties, formatSource } from './schema.mjs';
import { ensureRequirements } from './semantics.mjs';
import { editLiteral } from './literal-edit.mjs';
import { validateSpriteModels } from './sprite-validation.mjs';
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
let currentProgram, programDirty = false;
const sources = () => Object.fromEntries(Object.entries(drafts).map(([file, d]) => [file, d.source]));
const refresh = () => { programDirty = false; return currentProgram = programFor(root, sources()); };
refresh();
async function catalog() {
    const diskProgram = programFor(root);
    return { files: await Promise.all(dataFiles(root).map(async (file) => ({ file, dirty: !!drafts[file], conflict: drafts[file] ? hash(await fs.readFile(await safeFile(root, file), 'utf8')) !== hash(drafts[file].base) : false }))), changes: contractChanges(baseContract, contracts(diskProgram, root)), recovery,
        assets: (await fs.readdir(path.join(root, 'Sprite'))).filter(f => /\.(png|webp|jpg|jpeg)$/i.test(f)), refs: referenceOptions(currentProgram) };
}
function referenceOptions(program) {
    const result = {};
    for (const [file, name, group = file] of [['cards', 'CARD_DEFINITIONS'], ['relics', 'RELIC_DEFINITIONS'], ['enemies', 'ENEMY_DEFINITIONS'], ['enemySprites', 'ENEMY_SPRITES'], ['sprites', 'EFFECT_SPRITES', 'effectSprites'], ['sprites', 'UI_SPRITES', 'uiSprites']]) {
        const decl = analyze(program, root, `src/data/${file}.ts`).declarations.find(d => d.name === name)?.node;
        result[group] = decl?.entries?.filter(e => e.key).map(e => {
            const obj = e.node.kind === 'call' ? e.node.args[0] : e.node;
            const localizedName = obj?.entries?.find(p => p.key === 'name')?.node;
            return { key: e.key, id: obj?.entries?.find(p => p.key === 'id')?.node.value, label: localizedName?.args?.[1]?.value ?? localizedName?.entries?.find(p => p.key === 'ja')?.node.value ?? localizedName?.value ?? e.key,
                definition: { file: `src/data/${file}.ts`, declaration: name, entry: e.key, name: e.key } };
        }) ?? [];
    }
    return result;
}
function preflight() {
    const refs = referenceOptions(currentProgram);
    const mapping = { cardId: ['cards', 'key'], startingDeckIds: ['cards', 'key'], cardIds: ['cards', 'id'], relicId: ['relics', 'id'], relicIds: ['relics', 'id'], relics: ['relics', 'id'], sprite: ['enemySprites', 'key'], spriteIds: ['effectSprites', 'key'] };
    const issues = [...diagnostics(currentProgram, root), ...validateSpriteModels([
        analyze(currentProgram, root, 'src/data/enemySprites.ts'),
        analyze(currentProgram, root, 'src/data/sprites.ts'),
    ])];
    for (const file of dataFiles(root).filter(f => f.startsWith('src/data/'))) {
        const model = analyze(currentProgram, root, file);
        issues.push(...model.issues);
        function visit(n, key, location) {
            if (n.kind === 'string' && n.value.trim() && mapping[key]) {
                const [group, property] = mapping[key];
                if (!refs[group].some(r => (r[property] ?? r.key) === n.value)) issues.push({ file, line: model.source.slice(0, n.start).split('\n').length, code: 'CONFIG', message: `${location}: 参照先「${n.value}」が ${group} に登録されていません。` });
            }
            for (const e of n.entries ?? []) visit(e.node, e.key, `${location}.${e.key}`);
            (n.args ?? []).forEach((arg, i) => visit(arg, n.parameters[i]?.name, `${location}.${n.parameters[i]?.name ?? i}`));
            (n.items ?? []).forEach((arg, i) => visit(arg, key, `${location}[${i + 1}]`));
            if (n.inner) visit(n.inner, key, location);
        }
        for (const d of model.declarations.filter(d => !d.template && !d.typeDefinition)) visit(d.node, d.name, d.name);
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
            if (programDirty && !['/api/literal', '/api/snippet'].includes(url.pathname)) refresh();
            if (req.method === 'GET' && url.pathname === '/api/catalog')
                return json(res, await catalog());
            if (req.method === 'GET' && url.pathname === '/api/file') {
                const file = url.searchParams.get('file');
                await safeFile(root, file);
                return json(res, { ...analyze(currentProgram, root, file), base: drafts[file]?.base });
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
                    return json(res, { sourceHash: hash(source), dirty: source !== base });
                }
                if (url.pathname === '/api/snippet')
                    return json(res, { source: mergeProperties(input.original, input.fragment) });
                if (url.pathname === '/api/analyze') {
                    const file = input.file, target = await safeFile(root, file);
                    if (typeof input.source !== 'string')
                        throw Error('TypeScriptソースを入力してください。');
                    const analyzedSource = currentProgram.getSourceFile(path.join(root, file))?.text ?? await fs.readFile(target, 'utf8');
                    if (input.previousHash && input.previousHash !== hash(analyzedSource))
                        throw Error('別の画面または更新操作で下書きが変わりました。入力をコピーしてから最新の情報を取得してください。');
                    const base = drafts[file]?.base ?? analyzedSource;
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
                    return json(res, { ...analyze(currentProgram, root, file), base, refs: referenceOptions(currentProgram), diagnostics: diagnostics(currentProgram, root).filter(d => d.file === file) });
                }
                if (url.pathname === '/api/refresh') {
                    refresh();
                    return json(res, await catalog());
                }
                if (url.pathname === '/api/discard') {
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
                    refresh();
                    const errors = preflight();
                    if (errors.length) return json(res, { ok: false, validationFailed: true, log: errors.map(d => `${d.file}:${d.line} ${d.code}\n${d.message}`).join('\n\n'), diagnostics: errors });
                    const result = await transactions.apply(drafts);
                    if (result.ok) {
                        drafts = {};
                        await atomicWrite(stateFile, '{}');
                    }
                    refresh();
                    return json(res, result);
                }
                return json(res, { error: '未対応の操作です。' }, 404);
            }
            finally {
                modifying = false;
            }
        }
        if (req.method !== 'GET')
            return json(res, { error: '未対応の操作です。' }, 405);
        if (url.pathname === '/asset') {
            const asset = url.searchParams.get('name');
            if (!asset || path.basename(asset) !== asset || !/\.(png|webp|jpg|jpeg)$/i.test(asset))
                throw Error('画像ファイル名が不正です。');
            const file = await fs.realpath(path.join(root, 'Sprite', asset));
            if (!file.startsWith(`${await fs.realpath(path.join(root, 'Sprite'))}${path.sep}`))
                throw Error('画像の参照先が不正です。');
            res.writeHead(200, { 'Content-Type': asset.endsWith('.png') ? 'image/png' : asset.endsWith('.webp') ? 'image/webp' : 'image/jpeg', 'Cache-Control': 'no-cache' });
            res.end(await fs.readFile(file));
            return;
        }
        const allowed = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'], '/help.js': ['help.js', 'text/javascript'], '/field-policy.js': ['field-policy.js', 'text/javascript'], '/sprite-checker.js': ['sprite-checker.js', 'text/javascript'], '/sprite-edit.js': ['sprite-edit.js', 'text/javascript'], '/sprite-values.js': ['sprite-values.js', 'text/javascript'] };
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
