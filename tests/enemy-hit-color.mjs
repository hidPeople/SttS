import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

// Exercise the real color/movement lifecycle without a renderer.
const source = ts.createSourceFile('battle.ts', fs.readFileSync('src/scenes/BattleScene.ts', 'utf8'), 99, true);
const cls = source.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'BattleScene');
const names = ['enemyHitColorTimers', 'flashEnemy', 'cancelEnemyHitColorReset', 'setEnemyBodyHitColor', 'restoreEnemyBodyColor', 'sideSwayMotion', 'playStatusRemovedMotion', 'playPairedStatusSway', 'playEnemyStatusSway', 'isIntrudedStatus', 'flashOrgasm', 'setCombatantBodyOrgasmColor', 'restoreCombatantBodyColor'];
const code = ts.transpileModule(`class Harness {${names.map(name => cls.members.find(n => n.name?.getText(source) === name).getText(source)).join('\n')}}`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
class Enemy { isDefeated = false; }
class Rectangle {
  active = true; color = 0x8a414d;
  setFillStyle(color) { this.color = color; }
}
class Sprite {
  active = true; color = 0xffffff;
  setTint(color) { this.color = color; }
  clearTint() { this.color = 0xffffff; }
}
const Harness = new Function('Phaser', 'Enemy', 'PLAYER_VISUAL_X', 'ORGASM_BASE_FLASH_COUNT', 'ORGASM_FLASH_STEP_DURATION', `${code}; return Harness;`)(
  { GameObjects: { Sprite } }, Enemy, 140, 3, 100,
);
function setup(Body = Sprite) {
  const h = new Harness(), timers = [], tweens = [];
  const area = () => ({ x: 400, alpha: 1, setX(x) { this.x = x; }, setAlpha(alpha) { this.alpha = alpha; } });
  h.enemy = new Enemy(); h.playerArea = area();
  const view = { enemy: h.enemy, body: new Body(), area: area(), baseX: 400 };
  h.enemyViewFor = () => view;
  h.updateReticlePosition = () => {};
  h.time = { delayedCall(delay, callback) {
    const timer = { delay, callback, removed: false, remove() { this.removed = true; } };
    timers.push(timer); return timer;
  } };
  h.tweens = {
    add(config) { const tween = { ...config, destroyed: false }; tweens.push(tween); return tween; },
    // Phaser killTweensOf destroys tweens; neither onStop nor onComplete runs.
    killTweensOf(target) { tweens.filter(t => t.targets === target).forEach(t => { t.destroyed = true; }); },
  };
  return { h, view, timers, tweens };
}

test('M connection removal after successive hits cannot strand the red tint', () => {
  for (const status of ['InsertM', 'IntrudedM']) for (const Body of [Sprite, Rectangle]) {
    const { h, view, timers, tweens } = setup(Body);
    h.flashEnemy(); h.flashEnemy();
    h.playStatusRemovedMotion(h.enemy, status);
    assert.ok(tweens.slice(0, 2).every(t => t.destroyed));
    assert.equal(view.body.color, 0xff4657);
    assert.equal(timers[0].removed, true);
    assert.equal(timers[1].delay, 330);
    timers[1].callback();
    assert.equal(view.body.color, Body === Sprite ? 0xffffff : 0x8a414d);
    assert.equal(h.enemyHitColorTimers.has(view.body), false);
  }
});

test('an older hit completion cannot clear the newer hit color', () => {
  const { h, view, timers, tweens } = setup();
  h.flashEnemy(); h.flashEnemy();
  timers[0].callback(); tweens[0].onComplete();
  assert.equal(view.body.color, 0xff4657);
  timers[1].callback();
  assert.equal(view.body.color, 0xffffff);
});

test('normal single-hit color returns without adding a combat wait', () => {
  const { h, view, timers } = setup();
  assert.equal(h.flashEnemy(), undefined);
  timers[0].callback(); assert.equal(view.body.color, 0xffffff);
});

test('defeated and destroyed bodies are not recolored by a pending hit', () => {
  for (const dead of [true, false]) {
    const { h, view, timers } = setup(); h.flashEnemy();
    if (dead) h.enemy.isDefeated = true; else view.body.active = false;
    timers[0].callback(); assert.equal(view.body.color, 0xff4657);
    assert.equal(h.enemyHitColorTimers.has(view.body), false);
  }
});

test('a subsequent orgasm owns its color until its own effect completes', async () => {
  const { h, view, timers, tweens } = setup(); h.flashEnemy();
  const done = h.flashOrgasm(view.area, view.body, 0x8a414d);
  assert.equal(timers[0].removed, true);
  timers[0].callback(); assert.equal(view.body.color, 0xff73b8);
  tweens.at(-1).onComplete(); await done;
  assert.equal(view.body.color, 0xffffff);
});
