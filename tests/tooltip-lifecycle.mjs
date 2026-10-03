import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import EventEmitter from 'eventemitter3';

const Phaser = { Scenes: { Events: { PAUSE: 'pause', SLEEP: 'sleep', SHUTDOWN: 'shutdown' } }, GameObjects: { Events: { DESTROY: 'destroy' } } };
const hoverCode = ts.transpileModule(fs.readFileSync('src/ui/hoverTooltip.ts', 'utf8').replace("import Phaser from 'phaser';", '').replaceAll('export ', ''), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const HoverTooltip = new Function('Phaser', `${hoverCode};return HoverTooltip;`)(Phaser);
const source = ts.createSourceFile('BattleScene.ts', fs.readFileSync('src/scenes/BattleScene.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const sceneClass = source.statements.find(node => ts.isClassDeclaration(node) && node.name.text === 'BattleScene');
const methods = ['setHandInputLocked', 'markCardExiting', 'renderStatusIcons', 'orderedStatusEntries'].map(name => sceneClass.members.find(node => node.name?.getText(source) === name).getText(source)).join('\n');
const transitions = source.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText(source) === 'STATUS_REMOVAL_TRANSITIONS')).getText(source);
const code = ts.transpileModule(`${transitions}\nclass Harness { ${methods} }`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const Harness = new Function('KeyboardNavigation', 'PLAYER_STATUS_HUD_LAYOUT', 'ICON_HUD_LAYOUT', `${code};return Harness;`)(
  { for: () => ({ register() {} }) }, { iconSize: 34 }, { enemyStatusSize: 30, statusColumns: 8, gap: 2, statusRowGap: 4 });

class ObjectNode extends EventEmitter {
  active = true; list = []; data = new Map(); x = 0; y = 0;
  willRender() { return this.active; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setData(key, value) { this.data.set(key, value); return this; }
  getData(key) { return this.data.get(key); }
  add(child) { child.parentContainer = this; this.list.push(child); }
  removeAll() { for (const child of [...this.list]) child.destroy(); this.list = []; }
  destroy() {
    this.emit('destroy', this); this.active = false; this.removeAll();
    if (this.parentContainer) this.parentContainer.list = this.parentContainer.list.filter(child => child !== this);
  }
}
function setup() {
  const s = new Harness(), timers = []; let now = 0, hides = 0, shows = 0, value;
  s.input = new EventEmitter(); s.events = new EventEmitter(); s.cameras = { main: {} };
  s.time = { delayedCall(delay, callback) { const timer = { at: now + delay, callback, remove() { this.removed = true; } }; timers.push(timer); return timer; } };
  const advance = ms => { now += ms; for (const timer of timers) if (!timer.removed && timer.at <= now) { timer.removed = true; timer.callback(); } };
  s.tooltipHover = new HoverTooltip(s, () => hides++);
  s.cardViews = new Map(); s.exitingCardUids = new Set(); s.refreshHandCardUsabilities = () => {};
  s.statusIconViews = new WeakMap(); s.playerStatusIcons = new ObjectNode();
  s.statusDefinitionOrder = () => 0;
  s.createStatusIconVisual = () => {
    const group = new ObjectNode(), icon = new ObjectNode(); group.add(icon);
    return { group, icon, updateStacks: stacks => group.counter = stacks };
  };
  s.showStatusTooltip = (status, stacks) => { shows++; value = [status, stacks]; };
  const bind = () => { const node = new ObjectNode(); s.tooltipHover.bind(node, () => { shows++; }); node.emit('pointerover'); return node; };
  const addCard = () => {
    const container = new ObjectNode(), term = new ObjectNode(); container.add(term);
    s.cardViews.set('card', { container, hitArea: { disableInteractive() {} }, selectionGlow: { set() {} } });
    return { container, term };
  };
  return { s, advance, bind, addCard, counts: () => ({ hides, shows }), value: () => value };
}

test('hand locking and draw completion preserve a pending HUD hover without restarting its delay', () => {
  const h = setup(); h.addCard(); const node = h.bind();
  h.advance(150); const before = h.counts();
  h.s.setHandInputLocked(true); h.s.tooltipHover.refreshVisible(); h.s.setHandInputLocked(false);
  assert.deepEqual(h.counts(), before);
  h.advance(149); assert.equal(h.counts().shows, 0);
  h.advance(1); assert.equal(h.counts().shows, 1);
  assert.equal(h.s.tooltipHover.source, node);
});

test('visible HUD tips remain through hand locks and update live content without another pointerover', () => {
  const h = setup(); h.addCard(); const node = h.bind(); h.advance(300);
  const hides = h.counts().hides;
  h.s.setHandInputLocked(true); h.s.setHandInputLocked(false); h.s.tooltipHover.refreshVisible();
  assert.equal(h.counts().hides, hides); assert.equal(h.counts().shows, 2);
  node.emit('pointerout'); assert.equal(h.counts().hides, hides + 1);
  h.s.tooltipHover.refreshVisible(); assert.equal(h.counts().shows, 2);
});

test('hand locking and card exit still cancel their own term, but never another HUD tip', () => {
  for (const action of [s => s.setHandInputLocked(true), s => s.markCardExiting('card')]) {
    const h = setup(), { term } = h.addCard();
    h.s.tooltipHover.request(term, () => {}); action(h.s);
    assert.equal(h.s.tooltipHover.source, undefined);
    const node = h.bind(); action(h.s); h.advance(300);
    assert.equal(h.s.tooltipHover.source, node); assert.equal(h.counts().shows, 1);
  }
});

test('status HUD refresh reuses targets and updates stacks while preserving visible and pending tips', () => {
  const h = setup(), statuses = new Map([['A', 3], ['B', 1]]), area = h.s.playerStatusIcons;
  h.s.renderStatusIcons(area, statuses);
  const group = h.s.statusIconViews.get(area).get('A'), icon = group.list[0];
  icon.emit('pointerover'); h.advance(150);
  statuses.set('A', 2); h.s.renderStatusIcons(area, statuses); h.advance(150);
  assert.equal(h.s.statusIconViews.get(area).get('A'), group);
  assert.equal(group.counter, 2); assert.deepEqual(h.value(), ['A', 2]);
  const hides = h.counts().hides;
  statuses.set('A', 1); h.s.renderStatusIcons(area, statuses); h.s.tooltipHover.refreshVisible();
  assert.deepEqual(h.value(), ['A', 1]); assert.equal(h.counts().hides, hides);
  statuses.delete('B'); h.s.renderStatusIcons(area, statuses);
  assert.equal(h.s.tooltipHover.source, icon, 'removing an unrelated status preserves the tip');
  statuses.delete('A'); h.s.renderStatusIcons(area, statuses);
  assert.equal(h.s.tooltipHover.source, undefined); assert.equal(icon.active, false);
});

test('hidden status owners and destroyed hover targets cancel both timers and visible tips', () => {
  for (const visible of [false, true]) {
    const h = setup(), area = h.s.playerStatusIcons, statuses = new Map([['A', 1]]);
    h.s.renderStatusIcons(area, statuses); area.list[0].list[0].emit('pointerover');
    if (visible) h.advance(300);
    h.s.renderStatusIcons(area, statuses, true);
    assert.equal(h.s.tooltipHover.source, undefined);
    const shows = h.counts().shows; h.advance(400); assert.equal(h.counts().shows, shows);
    const node = h.bind(); node.destroy(); h.advance(400);
    assert.equal(h.s.tooltipHover.source, undefined); assert.equal(h.counts().shows, shows);
  }
});

test('upgrade icons replace the lower stage before its delayed removal without mutating battle state', () => {
  for (const [from, to] of [['MultipleOrgasm', 'OrgasmHell'], ['OrgasmHell', 'MultipleOrgasmsTorture'], ['MultipleOrgasm', 'MultipleOrgasmsTorture']]) {
    const h = setup(), area = h.s.playerStatusIcons, statuses = new Map([[from, 1], ['Focused', 2]]);
    h.s.renderStatusIcons(area, statuses);
    const lower = h.s.statusIconViews.get(area).get(from), unrelated = h.s.statusIconViews.get(area).get('Focused');
    lower.list[0].emit('pointerover'); h.advance(300);
    statuses.set(to, 1); const before = [...statuses];
    h.s.renderStatusIcons(area, statuses);
    assert.deepEqual([...statuses], before, 'display filtering must not change effect state or timing');
    const icons = h.s.statusIconViews.get(area), replacement = icons.get(to);
    assert.equal(icons.has(from), false); assert.ok(replacement); assert.equal(icons.size, 2);
    assert.equal(lower.active, false); assert.equal(h.s.tooltipHover.source, undefined);
    assert.equal(icons.get('Focused'), unrelated);
    statuses.delete(from); h.s.renderStatusIcons(area, statuses);
    assert.equal(icons.get(to), replacement, 'later effect removal must not recreate the upper icon');
  }
});

test('display filtering handles all three stages, ignores zero stacks and preserves unrelated statuses', () => {
  const h = setup();
  const statuses = new Map([['MultipleOrgasm', 1], ['OrgasmHell', 1], ['MultipleOrgasmsTorture', 1], ['Focused', 2]]);
  assert.deepEqual(h.s.orderedStatusEntries(statuses), [['MultipleOrgasmsTorture', 1], ['Focused', 2]]);
  statuses.set('MultipleOrgasmsTorture', 0);
  assert.deepEqual(h.s.orderedStatusEntries(statuses), [['OrgasmHell', 1], ['Focused', 2]]);
  statuses.delete('OrgasmHell');
  assert.deepEqual(h.s.orderedStatusEntries(statuses), [['MultipleOrgasm', 1], ['Focused', 2]]);
});
