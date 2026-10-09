import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ resolve: { preserveSymlinks: true }, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
try {
  const { selectConversationPages } = await server.ssrLoadModule('/src/models/conversationPages.ts');
  const { CONVERSATIONS } = await server.ssrLoadModule('/src/data/conversations.ts');
  const { normalizeSave } = await server.ssrLoadModule('/src/models/saveCompatibility.ts');
  const { createInitialRunState } = await server.ssrLoadModule('/src/models/RunState.ts');
  const pages = CONVERSATIONS.prologueDefeat1;
  const original = JSON.stringify(pages);
  for (const turn of [0, 1, 2, 3, 4]) {
    const expected = turn < 3 ? pages.filter((_, index) => index !== 0 && index !== 6) : pages;
    assert.deepEqual(selectConversationPages(pages, { battleTurn: turn }), expected);
  }
  assert.deepEqual(selectConversationPages(pages), pages);
  assert.equal(JSON.stringify(pages), original);
  const page = { speaker: 'narration', text: { en: 'Test', ja: '確認' }, showWhen: { minBattleTurn: 2, maxBattleTurn: 4 } };
  for (const turn of [0, 1, 2, 3, 4, 5]) assert.equal(selectConversationPages([page], { battleTurn: turn }).length, turn >= 2 && turn <= 4 ? 1 : 0);
  const makeSave = (conversationContext, pageIndex = 4, completion = 'title') => ({
    slot: 1, savedAt: '2026-10-10T00:00:00Z', floor: 1, scene: 'novel', run: createInitialRunState(),
    sceneState: { conversationId: 'prologueDefeat1', pageIndex, completion, conversationContext }, preview: { kind: 'novel' },
  });
  const saved = normalizeSave(JSON.parse(JSON.stringify(makeSave({ battleTurn: 2 })))).save;
  assert.deepEqual(saved.sceneState.conversationContext, { battleTurn: 2 });
  assert.equal(saved.sceneState.pageIndex, 4);
  assert.equal(selectConversationPages(pages, saved.sceneState.conversationContext)[saved.sceneState.pageIndex], pages[5]);
  assert.equal(normalizeSave(makeSave({ battleTurn: 2 }, 7)).save.sceneState.pageIndex, 0);
  const legacy = normalizeSave(makeSave(undefined, 6)).save.sceneState;
  assert.equal(legacy.conversationContext, undefined);
  assert.equal(selectConversationPages(pages, legacy.conversationContext)[legacy.pageIndex], pages[6]);
  const gallery = normalizeSave(makeSave({ battleTurn: 1 }, 6, 'extra')).save.sceneState;
  assert.equal(gallery.conversationContext, undefined);
  assert.equal(gallery.pageIndex, 6);
  console.log('OK: early/late/gallery page selection, inclusive ranges, source preservation and save/load context');
} finally { await server.close(); }
