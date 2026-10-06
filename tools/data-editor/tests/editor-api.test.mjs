import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

// Isolated source/tool copies: no requests write the developer's real drafts or game.
test('portrait numeric saves, explicit validation and no-build apply work through the API', async t => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'stts-editor-api-'));
    const repo = process.cwd(), tool = path.join(root, 'tools/data-editor');
    let child;
    t.after(async () => {
        if (child && child.exitCode === null) { const closed = once(child, 'exit'); child.kill(); await closed; }
        assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep + 'stts-editor-api-'));
        await fs.rm(root, { recursive: true, force: true });
    });
    await fs.cp(path.join(repo, 'src'), path.join(root, 'src'), { recursive: true });
    await fs.copyFile(path.join(repo, 'tsconfig.json'), path.join(root, 'tsconfig.json'));
    await fs.symlink(path.join(repo, 'node_modules'), path.join(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
    await fs.mkdir(tool, { recursive: true });
    for (const entry of await fs.readdir(path.join(repo, 'tools/data-editor'), { withFileTypes: true })) {
        if (entry.name === 'public' || entry.isFile()) await fs.cp(path.join(repo, 'tools/data-editor', entry.name), path.join(tool, entry.name), { recursive: true });
    }
    for (const dir of ['Sprite', 'image/character', 'image/background']) await fs.mkdir(path.join(root, dir), { recursive: true });
    // Hold the isolated fixture's atomic write long enough to exercise a GET
    // changing the server's active model during the numeric fast path.
    const transactionFile = path.join(tool, 'transaction.mjs');
    await fs.writeFile(transactionFile, (await fs.readFile(transactionFile, 'utf8')).replace('export async function atomicWrite(file, text) {',
        "export async function atomicWrite(file, text) { process.stdout.write('TEST_WRITE_WAIT\\n'); await new Promise(resolve => setTimeout(resolve, 250));"));
    child = spawn(process.execPath, [path.join(tool, 'server.mjs')], { cwd: root, env: { ...process.env, STTS_EDITOR_PORT: '0', STTS_EDITOR_STATE_DIR: path.join(root, 'state') }, windowsHide: true });
    let output = '';
    child.stdout.on('data', data => output += data);
    child.stderr.on('data', data => output += data);
    const deadline = Date.now() + 30000;
    while (!output.match(/http:\/\/127\.0\.0\.1:\d+/)) {
        if (child.exitCode !== null || Date.now() > deadline) throw Error(output || 'server did not start');
        await new Promise(resolve => setTimeout(resolve, 25));
    }
    const url = output.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
    const html = await (await fetch(url)).text();
    // A missing imported module prevents app.js from reaching its loading/error UI.
    const visited = new Set();
    async function checkModule(moduleUrl) {
        if (visited.has(moduleUrl)) return;
        visited.add(moduleUrl);
        const response = await fetch(moduleUrl);
        assert.equal(response.status, 200, moduleUrl);
        assert.match(response.headers.get('content-type'), /javascript/, moduleUrl);
        const code = await response.text();
        for (const match of code.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+\.js)['"]/g)) {
            await checkModule(new URL(match[1], moduleUrl).href);
        }
    }
    await checkModule(url + '/app.js');
    assert.ok(visited.has(url + '/portrait-anchors.js'));
    const token = html.match(/name="editor-token" content="([^"]+)"/)[1];
    const api = async (endpoint, data) => {
        const response = await fetch(`${url}/api/${endpoint}`, { method: data === undefined ? 'GET' : 'POST', headers: { 'X-Editor-Token': token, 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) });
        const result = await response.json();
        assert.equal(response.ok, true, result.error);
        return result;
    };
    const file = 'src/data/characterPortraits.ts';
    let model = await api('file?file=' + file);
    const base = model.source;
    const id = 'Succubus_normal_idle_1';
    const placement = m => m.declarations.find(d => d.name === 'CHARACTER_PORTRAITS').node.entries.find(e => e.key === id).node;
    const initialHeight = placement(model).entries.find(e => e.key === 'displayHeight').node.value;
    assert.equal((await fetch(url + '/editor-session.js')).status, 200);
    await api('portrait-preview');
    for (const height of [812.5, 456]) {
        model = await api('file?file=' + file);
        const node = placement(model).entries.find(e => e.key === 'displayHeight').node;
        const source = model.source.slice(0, node.start) + height + model.source.slice(node.end);
        const start = performance.now();
        const waiting = new Promise(resolve => {
            const listen = chunk => {if (chunk.toString().includes('TEST_WRITE_WAIT')) {child.stdout.off('data', listen);resolve();}};
            child.stdout.on('data', listen);
        });
        const saving = api('analyze', { file, source, previousHash: model.sourceHash, ensureAt: placement(model).start });
        await waiting;
        const other = await api('file?file=src/data/player.ts');
        assert.equal(other.file, 'src/data/player.ts');
        model = await saving;
        assert.equal(model.file, file);
        t.diagnostic(`portrait numeric draft save: ${Math.round(performance.now() - start)} ms`);
        assert.equal(model.source, source);
        assert.equal(placement(model).entries.find(e => e.key === 'displayHeight').node.value, height);
        assert.equal(model.refs, undefined);
        assert.equal(model.diagnostics.length, 0);
        await api('portrait-preview');
    }
    assert.equal(await fs.readFile(path.join(root, file), 'utf8'), base);
    assert.equal((await api('portrait-placement?id=' + id)).displayHeight, initialHeight);
    const invalid = await fetch(`${url}/api/analyze`, { method: 'POST', headers: { 'X-Editor-Token': token }, body: JSON.stringify({ file, source: 'const broken = {', previousHash: model.sourceHash }) });
    assert.equal(invalid.status, 400);
    assert.equal((await api('file?file=' + file)).source, model.source);
    const result = await api('apply', { build: false });
    assert.equal(result.ok, true); // Fixture has no build script: this proves no build was attempted.
    assert.equal(await fs.readFile(path.join(root, file), 'utf8'), model.source);
    assert.equal(await fs.readFile(path.join(result.backup, file), 'utf8'), base);
    assert.equal((await api('portrait-placement?id=' + id)).displayHeight, 456);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(root, 'state/drafts.json'), 'utf8')), {});
});
