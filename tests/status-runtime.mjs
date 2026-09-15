import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { Player, Enemy } = await server.ssrLoadModule('/src/models/Combatants.ts');
  const { StatusRuntime, statusTargetAllowed, blocksTurnStartEpRecovery } = await server.ssrLoadModule('/src/models/statusRuntime.ts');
  const { PLAYER_DEFINITION } = await server.ssrLoadModule('/src/data/player.ts');
  const { ENEMY_DEFINITIONS } = await server.ssrLoadModule('/src/data/enemies.ts');
  const { STATUS_DESCRIPTIONS } = await server.ssrLoadModule('/src/data/statuses.ts');
  const { RUN_STATE, saveRunVitals, resetRunState } = await server.ssrLoadModule('/src/models/RunState.ts');
  const status = 'Aphrodisiac';
  const fresh = () => {
    const player = new Player(PLAYER_DEFINITION), clock = new StatusRuntime();
    clock.advance(player, [], 0);
    return { player, clock };
  };
  {
    const { player, clock } = fresh();
    player.ep = 10;
    clock.applyDuration(player, status, true); clock.countActive(player);
    clock.countActive(player);
    assert.equal(player.statusActiveTurns[status], 1);
    assert.equal(player.statuses.get(status), 3);
    player.startTurn(false, !blocksTurnStartEpRecovery(player));
    assert.equal(player.ep, 10);
    clock.advance(player, [], 0);
    assert.equal(player.statuses.get(status), 2);
    assert.equal(clock.hadNoPeaks(2), false);
    clock.advance(player, [], 0);
    assert.equal(player.statuses.get(status), 1);
    assert.equal(clock.hadNoPeaks(2), true);
    clock.advance(player, [], 1);
    assert.equal(player.hasStatus(status), false);
    assert.equal(player.statusActiveTurns[status], 3);
    assert.equal(clock.hadNoPeaks(2), false);
    player.startTurn(false, !blocksTurnStartEpRecovery(player));
    assert.equal(player.ep, 9);
  }
  {
    const { player, clock } = fresh();
    clock.applyDuration(player, status, false);
    clock.advance(player, [], 0);
    assert.equal(player.statuses.get(status), 3);
    clock.advance(player, [], 0);
    clock.applyDuration(player, status, true); clock.countActive(player);
    assert.equal(player.statuses.get(status), 3);
    assert.equal(player.statusActiveTurns[status], 2);
    assert.equal(clock.remainingAtNextTurn(player, status), 2);
    saveRunVitals(player.hp, player.ep, 0, 0, player.epDamageByPart, player.epPeakByPart, player.recentEpPeakByPart,
      [{ effect: status, stacks: clock.remainingAtNextTurn(player, status) }], player.statusActiveTurns);
    player.statusActiveTurns[status] = 99;
    assert.equal(RUN_STATE.playerStatusActiveTurns[status], 2, 'saved record is a copy');
    const restored = new Player(PLAYER_DEFINITION), next = new StatusRuntime();
    restored.statuses.set(status, RUN_STATE.playerStatuses[0].stacks);
    restored.statusActiveTurns = { ...RUN_STATE.playerStatusActiveTurns };
    next.advance(restored, [], 0);
    assert.equal(restored.statuses.get(status), 2);
    assert.equal(restored.statusActiveTurns[status], 3);
    next.advance(restored, [], 0); next.advance(restored, [], 0);
    assert.equal(restored.hasStatus(status), false);
    assert.equal(restored.statusActiveTurns[status], 4);
    resetRunState(); assert.deepEqual(RUN_STATE.playerStatusActiveTurns, {});
  }
  for (const [definition, allowed] of [
    [ENEMY_DEFINITIONS.grunt, true], [ENEMY_DEFINITIONS.slime, false], [ENEMY_DEFINITIONS.aphrodisiacSlime, false],
    [{ ...ENEMY_DEFINITIONS.grunt, maxEp: 0 }, false],
    [{ ...ENEMY_DEFINITIONS.grunt, traits: ['softBody'] }, false],
    [{ ...ENEMY_DEFINITIONS.grunt, traits: ['sexToy'] }, false],
  ]) {
    const enemy = new Enemy(definition);
    assert.equal(statusTargetAllowed(enemy, status, enemy), allowed);
  }
  const variant = ENEMY_DEFINITIONS.aphrodisiacSlime, original = ENEMY_DEFINITIONS.slime;
  assert.equal(variant.intents.length, original.intents.length);
  assert.equal(variant.intents_E.length, original.intents_E.length);
  assert.equal(variant.reactionRules.length, original.reactionRules.length);
  assert.equal(variant.sprite, 'aphrodisiacSlime');
  for (const id of ['IntrudedA', 'IntrudedV', 'IntrudedM']) {
    assert.ok(variant.statusTriggers[id].some(t => t.timing === 'statusApplied' && t.effects.some(e => e.status === status)));
    assert.ok(variant.statusTriggers[id].some(t => t.timing === 'turnStart' && t.effects.some(e => e.status === status)));
  }
  for (const part of ['A', 'V']) {
    const effects = STATUS_DESCRIPTIONS[`Infested${part}_AphrodisiacSlime`].triggers[0].effects;
    assert.equal(effects[0].kind, 'epDamage'); assert.equal(effects[0].chance, undefined);
    assert.equal(effects[0].perStack, true); assert.equal(effects[1].chance, 0.15);
  }
  assert.equal(STATUS_DESCRIPTIONS[status].triggers[0].modifiers[0].amount, 1.5);
  console.log('PASS status duration, refresh, recovery, history, persistence, target restrictions and variant data');
} finally { await server.close(); }
