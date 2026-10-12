import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';
import { createSettingsMiddleware, createRunSavesMiddleware, settingsDirectory } from '../scripts/user-settings-server.mjs';

const vite = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { UserSettingsStore } = await vite.ssrLoadModule('/src/models/userSettings.ts');
const { hostedUserSettingsStorage } = await vite.ssrLoadModule('/src/platform/userSettingsStorage.ts');
const { hostedRunSaveStorage } = await vite.ssrLoadModule('/src/platform/runSaveStorage.ts');
const { RunSaveStore } = await vite.ssrLoadModule('/src/models/runSaves.ts');
const { createInitialRunState } = await vite.ssrLoadModule('/src/models/RunState.ts');
const { CONVERSATIONS } = await vite.ssrLoadModule('/src/data/conversations.ts');
await vite.close();
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'SttS settings 日本語 '));
let server, base;
const start = async () => {
  const middleware = createSettingsMiddleware(directory);
  const runMiddleware = createRunSavesMiddleware(path.join(directory, 'saves'));
  server = http.createServer((req, res) => { void middleware(req, res, () => {
    void runMiddleware(req, res, () => { res.writeHead(404); res.end(); });
  }); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
};
const stop = () => new Promise((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeIdleConnections(); });
const browser = (raw = null) => ({ raw, async read() { return this.raw; }, async write(contents) { this.raw = contents; }, async remove() { this.raw = null; } });
const request = (url, options) => fetch(base + url, options);
const file = path.join(directory, 'user-settings.json');
try {
  await start();
  assert.equal(settingsDirectory('win32', { LOCALAPPDATA: 'C:\\Users\\Someone Else\\AppData\\Local' }, 'ignored'),
    path.join('C:\\Users\\Someone Else\\AppData\\Local', 'SttS', 'preferences'));
  // Migrate existing browser history once, without changing the saved schema.
  const legacy = JSON.stringify({ version: 3, settings: { gallery: { seenPortraitIds: ['old-portrait'], seenConversationIds: ['old-end'] } } });
  const storage = await hostedUserSettingsStorage(browser(legacy), request, true);
  const store = new UserSettingsStore(); await store.initialize(storage);
  assert.deepEqual(store.value.gallery.seenPortraitIds, ['old-portrait']);
  store.markPortraitSeen('new-portrait'); store.markConversationSeen('prologueAfterBattle');
  await store.flush();
  assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')).settings.gallery.seenConversationIds, ['old-end', 'prologueAfterBattle']);
  // New browser profile + restarted host/changed port must still restore the same file.
  await stop(); await start();
  const restored = new UserSettingsStore();
  await restored.initialize(await hostedUserSettingsStorage(browser(), request, true));
  assert.deepEqual(restored.value.gallery, store.value.gallery);
  // A still-open page can renew the host token following a server restart.
  store.markPortraitSeen('after-server-restart'); await store.flush();
  assert.ok(JSON.parse(await fs.readFile(file, 'utf8')).settings.gallery.seenPortraitIds.includes('after-server-restart'));

  // No unauthenticated or cross-origin local-file mutation; invalid JSON leaves the file intact.
  const before = await fs.readFile(file, 'utf8');
  assert.equal((await request('/__stts/user-settings', { method: 'DELETE' })).status, 403);
  const { token } = await (await request('/__stts/user-settings')).json();
  assert.equal((await request('/__stts/user-settings', { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, Origin: 'https://example.invalid' } })).status, 403);
  assert.equal((await request('/__stts/user-settings', { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: '{broken' })).status, 500);
  assert.equal(await fs.readFile(file, 'utf8'), before);
  // Manual and auto-save slots, including thumbnails, survive an empty browser
  // profile and a new host. The run file must never overwrite Extra/settings.
  const capture = {
    floor: 1, scene: 'novel', run: createInitialRunState(),
    sceneState: { conversationId: Object.keys(CONVERSATIONS)[0], pageIndex: 0, completion: 'battle' },
    preview: { kind: 'novel', image: 'data:image/webp;base64,' + 'A'.repeat(80 * 1024) },
  };
  const runFile = path.join(directory, 'saves', 'run-saves.json');
  const seedBrowser = browser(), seed = new RunSaveStore(); await seed.initialize(seedBrowser);
  await seed.save(1, capture);
  const runStorage = await hostedRunSaveStorage(seedBrowser, request, true);
  const runs = new RunSaveStore(); await runs.initialize(runStorage);
  assert.equal(runs.get(1).preview.image, capture.preview.image, 'migrate existing browser save slots');
  await runs.save(0, capture, true); await runs.save(12, capture);
  const savedRuns = await fs.readFile(runFile, 'utf8');
  assert.equal(await fs.readFile(file, 'utf8'), before);
  await stop(); await start();
  const reloaded = new RunSaveStore(); await reloaded.initialize(await hostedRunSaveStorage(browser(), request, true));
  assert.deepEqual(reloaded.list().map(slot => slot.slot), [0, 1, 12]);
  assert.equal(reloaded.lastPage, 1);
  assert.equal(reloaded.get(12).preview.image, capture.preview.image);
  await reloaded.delete(1);
  assert.deepEqual(JSON.parse(await fs.readFile(runFile, 'utf8')).slots.map(slot => slot.slot), [0, 12]);
  // File-write errors still leave the in-memory slot list unchanged.
  const failing = new RunSaveStore();
  await failing.initialize(await hostedRunSaveStorage(browser(), (url, options) => options?.method === 'PUT'
    ? Promise.resolve(Response.json({ code: 'ENOSPC' }, { status: 500 })) : request(url, options), true));
  await assert.rejects(failing.save(2, capture), { code: 'ENOSPC' }); assert.equal(failing.get(2), undefined);
  // Explicit deletion is persistent too; a stale browser copy must not resurrect it.
  await restored.reset();
  assert.notEqual((await fs.readFile(runFile, 'utf8')).trim(), 'null', 'resetting Extra/settings does not delete runs');
  const fresh = new UserSettingsStore();
  await fresh.initialize(await hostedUserSettingsStorage(browser(legacy), request, true));
  assert.deepEqual(fresh.value.gallery.seenConversationIds, []);
  assert.deepEqual(fresh.value.gallery.seenPortraitIds, []);
  assert.equal((await fs.readFile(file, 'utf8')).trim(), 'null');
  store.markPortraitSeen('retained-after-run-clear'); await store.flush();
  const settingsBeforeClear = await fs.readFile(file, 'utf8');
  await reloaded.clear();
  const afterClear = new RunSaveStore();
  await afterClear.initialize(await hostedRunSaveStorage(browser(savedRuns), request, true));
  assert.equal(afterClear.list().length, 0, 'old browser saves cannot resurrect a deleted run file');
  assert.equal(await fs.readFile(file, 'utf8'), settingsBeforeClear, 'clearing runs does not delete Extra/settings');
  // Ordinary static deployments have no Node endpoint; injected native storage
  // and the original browser adapter remain independent platform choices.
  const local = browser(legacy);
  assert.equal(await hostedUserSettingsStorage(local, async () => new Response('', { status: 404 }), false), local);
  await assert.rejects(hostedUserSettingsStorage(local, async () => new Response('', { status: 404 }), true), { code: 'StorageUnavailable' });
  assert.deepEqual((await fs.readdir(directory)).sort(), ['saves', 'user-settings.json'], 'atomic write temporary files are cleaned up');
  assert.deepEqual(await fs.readdir(path.join(directory, 'saves')), ['run-saves.json']);
  console.log('Settings/run persistence: private-profile/host restarts, migration, thumbnails, deletion isolation, failures and paths passed.');
} finally {
  if (server?.listening) await stop();
  assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
  assert.ok(path.basename(directory).startsWith('SttS settings 日本語 '));
  await fs.rm(directory, { recursive: true, force: true });
}
