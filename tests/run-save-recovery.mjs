import assert from 'node:assert/strict';
import { createServer } from 'vite';
import fs from 'node:fs';
import ts from 'typescript';

const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const m = {};
try {
  for (const name of ['models/runSaves', 'models/saveCompatibility', 'models/storageErrors', 'models/RunState', 'models/Deck', 'models/Combatants', 'models/statusRuntime', 'models/turnEpEffects', 'models/tutorialTips', 'data/player', 'data/enemies', 'data/cards', 'data/tutorialTips']) {
    Object.assign(m, await server.ssrLoadModule(`/src/${name}.ts`));
  }
  const { RunSaveStore, RUN_SAVES, retryableBattleAutoSave, normalizeSave, SAVE_VERSION, createInitialRunState,
    Deck, Player, Enemy, StatusRuntime, TurnEpEffects, TutorialTipRuntime, PLAYER_DEFINITION, ENEMY_DEFINITIONS, CARD_DEFINITIONS, TUTORIAL_TIPS } = m;
  const memory = (raw = null) => ({ raw, fail: false, async read() { return this.raw; }, async write(v) {
    if (this.fail) throw { code: 'ENOSPC' }; this.raw = v;
  }, async remove() { if (this.fail) throw { code: 'EACCES' }; this.raw = null; } });
  const run = createInitialRunState(); run.encounterEnemyIds = ['grunt', 'grunt'];
  const player = new Player(PLAYER_DEFINITION), enemies = run.encounterEnemyIds.map(id => new Enemy(ENEMY_DEFINITIONS[id]));
  const clock = new StatusRuntime(); clock.advance(player, enemies, 0);
  clock.applyDuration(player, 'Aphrodisiac', true); clock.applyDuration(enemies[1], 'Aphrodisiac', false); clock.countActive(player);
  const links = new TurnEpEffects(); links.share(enemies[1]); links.copySensitivity(enemies[0], 'C');
  const deck = new Deck([CARD_DEFINITIONS.strike]); deck.draw(1);
  const generated = { ...CARD_DEFINITIONS.pullout, purgeStatus: 'InsertA' };
  deck.addToHand(generated);
  const savedDeck = deck.snapshot(def => def === generated ? { enemyIndex: 1, status: 'InsertA', variant: 'pullout' } : undefined);
  const tips = new TutorialTipRuntime(TUTORIAL_TIPS); tips.markShown(TUTORIAL_TIPS[0].id);
  const capture = {
    floor: 1, scene: 'battle', run, preview: { kind: 'battle', hp: player.hp, ep: player.ep },
    sceneState: {
      rngState: 123, turn: clock.turn, orgasmHistory: clock.snapshot().orgasmHistory, isPlayerTurn: true, canEndTurn: true, selectedEnemyIndex: 1,
      cardsPlayedThisTurn: 2, playerOrgasmsThisCycle: 1, playerEpReserveValue: 0, completedTurnEvents: [[1, 1]],
      touchCounts: { dormantSigil: 1, arousedSigil: 0, body: 0, head: 0 },
      player: { hp: player.hp, ep: player.ep, block: 2, energy: 4, statuses: [...player.statuses],
        orgasmCount: 0, orgasmsThisBattle: 1, epDamageByPart: player.epDamageByPart, orgasmByPart: player.orgasmByPart,
        recentOrgasmByPart: player.recentOrgasmByPart, statusActiveTurns: player.statusActiveTurns,
        statusDrainCounts: [], epDamageRecords: [], lastEpDamageParts: ['M'] },
      enemies: enemies.map(e => e.snapshot()), deck: savedDeck, statusRuntime: clock.snapshot([player, ...enemies]),
      turnEpEffects: links.snapshot(enemies), shownTutorialTips: tips.snapshot(),
    },
  };
  const storage = memory(), store = new RunSaveStore(); await store.initialize(storage);
  const saved = await store.save(1, capture);
  const normalized = normalizeSave(saved);
  assert.equal(normalized.repaired, false, 'current complete saves must not show a compatibility warning');
  assert.equal(normalized.restartedBattle, false);
  assert.deepEqual(JSON.parse(JSON.stringify(normalized.save.sceneState)), JSON.parse(JSON.stringify(capture.sceneState)));
  const restoredStore = new RunSaveStore(); await restoredStore.initialize(storage);
  assert.equal(restoredStore.get(1).compatibility, undefined);
  const state = restoredStore.get(1).sceneState;
  const restoredDeck = new Deck([]); let restoredLink;
  restoredDeck.restore(state.deck, CARD_DEFINITIONS, c => {
    if (c.link) { restoredLink = c.link; return { ...CARD_DEFINITIONS[c.cardId], purgeStatus: c.link.status }; }
    return CARD_DEFINITIONS[c.cardId];
  });
  assert.equal(restoredDeck.hand[1].definition.purgeStatus, 'InsertA'); assert.equal(restoredLink.enemyIndex, 1);
  const nextPlayer = new Player(PLAYER_DEFINITION), nextEnemies = enemies.map(e => new Enemy(e.definition));
  nextPlayer.statuses = new Map(state.player.statuses); nextPlayer.statusActiveTurns = { ...state.player.statusActiveTurns };
  nextEnemies.forEach((e, i) => e.restore(state.enemies[i]));
  const nextClock = new StatusRuntime(); nextClock.restore(state.statusRuntime, [nextPlayer, ...nextEnemies]);
  nextClock.countActive(nextPlayer); assert.deepEqual(nextPlayer.statusActiveTurns, player.statusActiveTurns, 'no double counting on load');
  for (let i = 0; i < 4; i++) {
    clock.advance(player, enemies, 0); nextClock.advance(nextPlayer, nextEnemies, 0);
    assert.deepEqual([...nextPlayer.statuses], [...player.statuses]);
    assert.deepEqual([...nextEnemies[1].statuses], [...enemies[1].statuses]);
  }
  const nextLinks = new TurnEpEffects(); nextLinks.restore(state.turnEpEffects, nextEnemies);
  assert.deepEqual(nextLinks.recipients(nextPlayer, nextPlayer), [nextEnemies[1]]);
  assert.equal(nextLinks.sensitivityPart(nextEnemies[0]), 'C'); assert.equal(nextLinks.sensitivityPart(nextEnemies[1]), undefined);
  nextLinks.clear(); assert.deepEqual(nextLinks.recipients(nextPlayer, nextPlayer), []);
  const nextTips = new TutorialTipRuntime(TUTORIAL_TIPS); nextTips.restore(state.shownTutorialTips);
  assert.deepEqual(nextTips.snapshot(), tips.snapshot());

  // Pending/failed writes and deletions cannot corrupt the previous in-memory or persisted slot.
  const original = storage.raw; storage.fail = true;
  await assert.rejects(store.save(1, { ...capture, floor: 8 }));
  await assert.rejects(store.delete(1)); await assert.rejects(store.clear());
  assert.equal(store.get(1).floor, 1); assert.equal(storage.raw, original);
  storage.fail = false;
  await Promise.all([store.save(2, capture), store.save(3, capture), store.delete(2)]);
  assert.deepEqual(store.list().map(s => s.slot), [1, 3]);
  assert.deepEqual(JSON.parse(storage.raw).slots.map(s => s.slot), [1, 3]);

  const autoStorage = memory(); await RUN_SAVES.initialize(autoStorage);
  const generation = RUN_SAVES.invalidateRetry(); const auto = await RUN_SAVES.saveAuto(capture);
  assert.equal(retryableBattleAutoSave(run), undefined);
  RUN_SAVES.enableRetry(auto, generation); assert.equal(retryableBattleAutoSave(run), auto);
  // Retry itself preserves capability, explicit load revokes it even when encounters match.
  assert.equal(retryableBattleAutoSave({ ...run }), auto);
  RUN_SAVES.invalidateRetry(); assert.equal(retryableBattleAutoSave(run), undefined);
  RUN_SAVES.enableRetry(auto, generation); assert.equal(retryableBattleAutoSave(run), undefined);
  const nextGeneration = RUN_SAVES.invalidateRetry(); const nextAuto = await RUN_SAVES.saveAuto(capture);
  RUN_SAVES.enableRetry(nextAuto, nextGeneration); assert.equal(retryableBattleAutoSave(run), nextAuto);
  assert.equal(retryableBattleAutoSave({ ...run, battleIndex: 1 }), undefined);

  // Tolerant repair: default missing values, drop unknown references, keep valid neighbors.
  const broken = JSON.parse(JSON.stringify(saved));
  broken.run.deckIds.push('missing-card'); delete broken.run.playerOrgasmByPart;
  broken.sceneState.turnEpEffects.shared.push(999); broken.sceneState.player.statuses.push(['unknown-status', 5]);
  broken.sceneState.player.epDamageRecords.push({ amount: 'oops', parts: null });
  broken.sceneState.deck.hand[1].link.enemyIndex = 999;
  const fixed = normalizeSave(broken); assert.equal(fixed.repaired, true); assert.equal(fixed.restartedBattle, false);
  assert.equal(fixed.save.sceneState.deck.hand.length, 1);
  assert.deepEqual(fixed.save.run.deckIds, run.deckIds);
  assert.deepEqual(fixed.save.sceneState.turnEpEffects.shared, [1]);
  const missing = normalizeSave({ slot: 1, scene: 'battle', run: {}, preview: {} });
  assert.equal(missing.restartedBattle, true); assert.equal(missing.save.sceneState, undefined);
  assert.deepEqual(missing.save.run.deckIds, createInitialRunState().deckIds);
  const unknownEncounter = JSON.parse(JSON.stringify(saved)); unknownEncounter.run.encounterEnemyIds[0] = 'deleted-enemy';
  assert.equal(normalizeSave(unknownEncounter).restartedBattle, true);
  const novel = normalizeSave({ ...saved, scene: 'novel', sceneState: { conversationId: 'prologueBeforeBattle', pageIndex: 999 } });
  assert.equal(novel.repaired, true); assert.equal(novel.save.sceneState.pageIndex, 0);
  const reward = normalizeSave({ ...saved, scene: 'reward', sceneState: { cardIds: ['strike', 'gone'], relicIds: [], selectedCardId: 'gone' } });
  assert.deepEqual(reward.save.sceneState.cardIds, ['strike']); assert.equal(reward.save.sceneState.selectedCardId, undefined);
  const oldStorage = memory(JSON.stringify({ version: SAVE_VERSION - 1, slots: [saved] }));
  const oldStore = new RunSaveStore(); await oldStore.initialize(oldStorage);
  assert.equal(oldStore.get(1).compatibility.repaired, true);
  await oldStore.save(2, capture); assert.equal(JSON.parse(oldStorage.raw).slots[0].compatibility.repaired, true);
  const futureStorage = memory(JSON.stringify({ version: SAVE_VERSION + 1, slots: [{ ...saved, futureField: 42 }] }));
  const futureStore = new RunSaveStore(); await futureStore.initialize(futureStorage); await futureStore.save(2, capture);
  assert.equal(JSON.parse(futureStorage.raw).slots[0].futureField, 42);
  const corrupt = memory('{bad json'); const corruptStore = new RunSaveStore();
  const warn = console.warn; console.warn = () => {};
  try { await corruptStore.initialize(corrupt); await assert.rejects(corruptStore.save(1, capture)); }
  finally { console.warn = warn; }
  assert.equal(corrupt.raw, '{bad json'); await corruptStore.clear(); await corruptStore.save(1, capture);

  const errorCodes = ['ENOSPC', 'EACCES', 'EROFS', 'EINVAL', 'ENAMETOOLONG', 'ENOENT', 'EBUSY', 'EIO', 'SecurityError', 'StorageUnavailable', 'SyntaxError', 'QuotaExceededError'];
  const messages = errorCodes.map(code => m.storageErrorMessage({ code }));
  assert.equal(new Set(messages.map(message => message.ja)).size, errorCodes.length);
  for (const message of messages) { assert.ok(message.en); assert.ok(message.ja); }
  assert.match(m.storageErrorMessage({ name: 'QuotaExceededError', code: 22 }).ja, /容量/);
  assert.match(m.storageErrorMessage({ code: 'EINVAL', path: 'C:/Game With Spaces/invalid\u0000/save' }).ja, /制御文字/);
  assert.match(m.storageErrorMessage({ code: 'EACCES', path: 'C:/Game With Spaces/save' }).ja, /権限/);

  // Exercise actual scene restore code without Phaser/rendering.
  const source = ts.createSourceFile('BattleScene.ts', fs.readFileSync('src/scenes/BattleScene.ts', 'utf8'), ts.ScriptTarget.Latest, true);
  const scene = source.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'BattleScene');
  const method = scene.members.find(n => n.name?.getText(source) === 'resumeSavedBattle').getText(source);
  const code = ts.transpileModule(`class Harness { ${method} }`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const Harness = new Function('CARD_DEFINITIONS', `${code}; return Harness;`)(CARD_DEFINITIONS);
  const h = new Harness(); Object.assign(h, { resumeState: state, deck: new Deck([]), enemies: nextEnemies,
    enemyLinkedCards: new WeakMap(), turnEpEffects: new TurnEpEffects(), tutorialTips: { restoreShown: ids => nextTips.restore(ids) },
    enemyViews: [], createPulloutCardDefinitionForEnemy: (enemy, status) => ({ ...CARD_DEFINITIONS.pullout, purgeStatus: status }),
    setTurnOverlayColor() {}, selectEnemy() {}, updateHud() {}, renderHand() {}, setEndTurnEnabled() {} });
  h.resumeSavedBattle(); assert.equal(h.enemyLinkedCards.get(h.deck.hand[1].definition), nextEnemies[1]);
  assert.equal(h.deck.hand[1].definition.purgeStatus, 'InsertA'); assert.equal(h.resumeState, undefined);
  console.log('Save recovery: round trips, dynamic links, timers, tips, retry gating, failures, compatibility and scene restore passed.');
} finally { await server.close(); }
