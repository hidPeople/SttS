import Phaser from 'phaser';
import { CARD_DEFINITIONS } from '../data/cards';
import { ENEMY_DEFINITIONS } from '../data/enemies';
import { STATUS_DESCRIPTIONS } from '../data/statuses';
import { Enemy } from '../models/Combatants';
import { localize } from '../models/localization';
import { RUN_STATE } from '../models/RunState';
import { EP_DAMAGE_PARTS, type EpDamagePart, type StatusEffect } from '../models/types';

// DEBUG_MODE_START
// Debug-only code is isolated in this file. Runtime entry points must also check
// DEBUG_FEATURES_AVAILABLE and DEBUG_STATE.enabled before mutating game state.
export const DEBUG_FEATURES_AVAILABLE = true;

export const DEBUG_STATE = {
  enabled: false,
  encounterThreatOverride: undefined as number | undefined,
};

type DebugScene = Phaser.Scene & Record<string, any>;
type DebugTarget = {
  id: string;
  label: string;
  value: any;
};

const DEBUG_SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'KeyA',
  'KeyB',
];

export function isDebugMode(): boolean {
  return DEBUG_FEATURES_AVAILABLE && DEBUG_STATE.enabled;
}

export function debugEncounterThreat(defaultThreat: number): number {
  if (!isDebugMode()) {
    return defaultThreat;
  }
  return DEBUG_STATE.encounterThreatOverride ?? defaultThreat;
}

export function installTitleDebugSequence(scene: Phaser.Scene): void {
  if (!DEBUG_FEATURES_AVAILABLE) {
    return;
  }

  let sequenceIndex = 0;
  scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
    if (!DEBUG_FEATURES_AVAILABLE) {
      return;
    }

    if (event.code === DEBUG_SEQUENCE[sequenceIndex]) {
      sequenceIndex += 1;
      if (sequenceIndex >= DEBUG_SEQUENCE.length) {
        DEBUG_STATE.enabled = true;
        sequenceIndex = 0;
        showDebugActivated(scene);
      }
      return;
    }

    sequenceIndex = event.code === DEBUG_SEQUENCE[0] ? 1 : 0;
  });
}

export function appendDebugSettingsButtons(scene: DebugScene, modalOverlay: Phaser.GameObjects.Container): void {
  if (!isDebugMode()) {
    return;
  }

  const buttons = [
    createDebugButton(scene, 1010, 258, 240, 40, 'DEBUG: デッキ操作', () => showDeckDebugPanel(scene)),
    createDebugButton(scene, 1010, 308, 240, 40, 'DEBUG: 能力値操作', () => showStatsDebugPanel(scene)),
    createDebugButton(scene, 1010, 358, 240, 40, 'DEBUG: 状態異常操作', () => showStatusDebugPanel(scene)),
    createDebugButton(scene, 1010, 408, 240, 40, 'DEBUG: 脅威度操作', () => showThreatDebugPanel(scene)),
    createDebugButton(scene, 1010, 458, 240, 40, 'DEBUG: 敵操作', () => showEnemyDebugPanel(scene)),
  ];

  modalOverlay.add(buttons);
}

function showDebugActivated(scene: Phaser.Scene): void {
  const text = scene.add.text(640, 500, 'DEBUG MODE ENABLED', {
    fontFamily: 'Arial',
    fontSize: '24px',
    fontStyle: 'bold',
    color: '#facc15',
  });
  text.setOrigin(0.5);
  text.setDepth(9000);
  scene.tweens.add({
    targets: text,
    alpha: 0,
    y: 470,
    delay: 650,
    duration: 900,
    onComplete: () => text.destroy(),
  });
}

function showDeckDebugPanel(scene: DebugScene): void {
  const overlay = resetOverlay(scene);
  const { shade, panel, title } = createDebugPanel(scene, 'DEBUG: デッキ操作', 900, 600);
  const cards = Object.values(CARD_DEFINITIONS);
  const children: Phaser.GameObjects.GameObject[] = [shade, panel, title];

  cards.forEach((card, index) => {
    const x = 280 + (index % 3) * 250;
    const y = 150 + Math.floor(index / 3) * 58;
    const count = RUN_STATE.deckIds.filter((id) => id === card.id).length;
    const label = scene.add.text(x, y, `${localize(card.name)} (${count})`, debugTextStyle(15));
    const add = createDebugButton(scene, x + 160, y + 10, 42, 28, '+', () => {
      RUN_STATE.deckIds.push(card.id);
      scene.deck?.drawPile?.push({ uid: debugUid(card.id), definition: card });
      refreshBattleScene(scene);
      showDeckDebugPanel(scene);
    });
    const remove = createDebugButton(scene, x + 210, y + 10, 42, 28, '-', () => {
      removeCardFromDebugDeck(scene, card.id);
      refreshBattleScene(scene);
      showDeckDebugPanel(scene);
    });
    children.push(label, add, remove);
  });

  children.push(createDebugButton(scene, 640, 630, 180, 40, '戻る', () => scene.showSettingsMenu()));
  overlay.add(children);
  overlay.setVisible(true);
}

function showStatsDebugPanel(scene: DebugScene): void {
  const overlay = resetOverlay(scene);
  const { shade, panel, title } = createDebugPanel(scene, 'DEBUG: 能力値操作', 940, 650);
  const player = scene.player;
  const rows = [
    statRow('最大HP', () => player.maxHp, (delta) => setMutableNumber(player, 'maxHp', Math.max(1, player.maxHp + delta))),
    statRow('現在HP', () => player.hp, (delta) => { player.hp = Phaser.Math.Clamp(player.hp + delta, 0, player.maxHp); }),
    statRow('最大EP', () => player.maxEp, (delta) => setMutableNumber(player, 'maxEp', Math.max(1, player.maxEp + delta))),
    statRow('現在EP', () => player.ep, (delta) => { player.ep = Phaser.Math.Clamp(player.ep + delta, 0, scene.playerEffectiveMaxEp()); }),
    statRow('EPリセット下限', () => scene.playerEpReserveValue, (delta) => { scene.playerEpReserveValue = Phaser.Math.Clamp(scene.playerEpReserveValue + delta, 0, scene.playerEffectiveMaxEp()); }),
    statRow('最大エナジー', () => player.maxEnergy, (delta) => setMutableNumber(player, 'maxEnergy', Math.max(0, player.maxEnergy + delta))),
    ...EP_DAMAGE_PARTS.map((part) => statRow(`累計EP ${part}`, () => player.epDamageByPart[part], (delta) => {
      player.epDamageByPart[part] = Math.max(0, player.epDamageByPart[part] + delta);
    })),
    ...EP_DAMAGE_PARTS.map((part) => statRow(`EP Peak回数 ${part}`, () => player.epPeakByPart[part], (delta) => {
      player.epPeakByPart[part] = Math.max(0, player.epPeakByPart[part] + delta);
    })),
  ];

  const children: Phaser.GameObjects.GameObject[] = [shade, panel, title];
  rows.forEach((row, index) => {
    const y = 118 + index * 31;
    children.push(scene.add.text(330, y, `${row.label}: ${row.value()}`, debugTextStyle(14)));
    children.push(createDebugButton(scene, 700, y + 10, 38, 24, '-1', () => {
      row.change(-1);
      clampPlayerAfterStatChange(scene);
      refreshBattleScene(scene);
      showStatsDebugPanel(scene);
    }));
    children.push(createDebugButton(scene, 750, y + 10, 38, 24, '+1', () => {
      row.change(1);
      clampPlayerAfterStatChange(scene);
      refreshBattleScene(scene);
      showStatsDebugPanel(scene);
    }));
    children.push(createDebugButton(scene, 805, y + 10, 48, 24, '+10', () => {
      row.change(10);
      clampPlayerAfterStatChange(scene);
      refreshBattleScene(scene);
      showStatsDebugPanel(scene);
    }));
  });

  children.push(createDebugButton(scene, 640, 668, 180, 34, '戻る', () => scene.showSettingsMenu()));
  overlay.add(children);
  overlay.setVisible(true);
}

function showStatusDebugPanel(scene: DebugScene, targetId = 'player'): void {
  const overlay = resetOverlay(scene);
  const { shade, panel, title } = createDebugPanel(scene, 'DEBUG: 状態異常操作', 980, 620);
  const targets = debugTargets(scene);
  const target = targets.find((item) => item.id === targetId) ?? targets[0];
  const statuses = Object.keys(STATUS_DESCRIPTIONS) as StatusEffect[];
  const children: Phaser.GameObjects.GameObject[] = [shade, panel, title];

  targets.forEach((item, index) => {
    children.push(createDebugButton(scene, 270 + index * 170, 120, 150, 30, item.label, () => showStatusDebugPanel(scene, item.id)));
  });

  statuses.forEach((status, index) => {
    const x = 210 + (index % 3) * 305;
    const y = 175 + Math.floor(index / 3) * 58;
    const stacks = target.value.statuses.get(status) ?? 0;
    children.push(scene.add.text(x, y, `${localize(STATUS_DESCRIPTIONS[status].name)} (${stacks})`, debugTextStyle(15)));
    children.push(createDebugButton(scene, x + 190, y + 10, 42, 28, '+', () => {
      target.value.addStatus(status, 1);
      refreshBattleScene(scene);
      showStatusDebugPanel(scene, target.id);
    }));
    children.push(createDebugButton(scene, x + 240, y + 10, 42, 28, '消', () => {
      target.value.statuses.delete(status);
      refreshBattleScene(scene);
      showStatusDebugPanel(scene, target.id);
    }));
  });

  children.push(createDebugButton(scene, 640, 655, 180, 40, '戻る', () => scene.showSettingsMenu()));
  overlay.add(children);
  overlay.setVisible(true);
}

function showThreatDebugPanel(scene: DebugScene): void {
  const overlay = resetOverlay(scene);
  const { shade, panel, title } = createDebugPanel(scene, 'DEBUG: ステージ脅威度操作', 680, 360);
  const defaultThreat = Math.min(3, RUN_STATE.battleIndex + 1);
  const current = DEBUG_STATE.encounterThreatOverride ?? defaultThreat;
  overlay.add([
    shade,
    panel,
    title,
    scene.add.text(480, 285, `通常値: ${defaultThreat}`, debugTextStyle(20)),
    scene.add.text(480, 330, `現在値: ${current}`, debugTextStyle(24)),
    createDebugButton(scene, 720, 295, 70, 34, '-1', () => {
      DEBUG_STATE.encounterThreatOverride = Math.max(1, current - 1);
      showThreatDebugPanel(scene);
    }),
    createDebugButton(scene, 805, 295, 70, 34, '+1', () => {
      DEBUG_STATE.encounterThreatOverride = Math.max(1, current + 1);
      showThreatDebugPanel(scene);
    }),
    createDebugButton(scene, 720, 350, 160, 34, '通常値に戻す', () => {
      DEBUG_STATE.encounterThreatOverride = undefined;
      showThreatDebugPanel(scene);
    }),
    createDebugButton(scene, 640, 500, 180, 40, '戻る', () => scene.showSettingsMenu()),
  ]);
  overlay.setVisible(true);
}

function showEnemyDebugPanel(scene: DebugScene): void {
  const overlay = resetOverlay(scene);
  const { shade, panel, title } = createDebugPanel(scene, 'DEBUG: 敵操作', 960, 590);
  const enemies = Object.values(ENEMY_DEFINITIONS);
  const currentNames = enemyDebugDisplayNames(scene);
  const children: Phaser.GameObjects.GameObject[] = [shade, panel, title];

  children.push(scene.add.text(205, 118, '出現中の敵', debugTextStyle(18)));
  scene.enemies.forEach((enemy: Enemy, index: number) => {
    const y = 155 + index * 42;
    children.push(scene.add.text(205, y, `${index + 1}. ${currentNames[index] ?? localize(enemy.definition.name)}`, debugTextStyle(15)));
    children.push(createDebugButton(scene, 460, y + 11, 70, 28, '削除', () => {
      if (scene.enemies.length <= 1) {
        return;
      }
      scene.enemies.splice(index, 1);
      rebuildEnemyViews(scene, Math.min(index, scene.enemies.length - 1));
      showEnemyDebugPanel(scene);
    }));
  });

  if (scene.enemies.length <= 1) {
    children.push(scene.add.text(205, 305, '最後の1体は削除不可', debugTextStyle(13)));
  }

  children.push(scene.add.text(610, 118, '敵プール', debugTextStyle(18)));
  enemies.forEach((definition, index) => {
    const y = 155 + index * 44;
    const count = scene.enemies.filter((enemy: Enemy) => enemy.definition.id === definition.id).length;
    children.push(scene.add.text(610, y, `${localize(definition.name)} (${count})`, debugTextStyle(15)));
    children.push(createDebugButton(scene, 850, y + 11, 70, 28, '追加', () => {
      scene.enemies.push(new Enemy(definition));
      rebuildEnemyViews(scene, scene.enemies.length - 1);
      showEnemyDebugPanel(scene);
    }));
  });

  children.push(createDebugButton(scene, 640, 640, 180, 40, '戻る', () => scene.showSettingsMenu()));
  overlay.add(children);
  overlay.setVisible(true);
}

function createDebugPanel(scene: DebugScene, label: string, width: number, height: number): {
  shade: Phaser.GameObjects.Rectangle;
  panel: Phaser.GameObjects.Rectangle;
  title: Phaser.GameObjects.Text;
} {
  const shade = scene.add.rectangle(640, 360, 1280, 720, 0x050607, 0.62);
  shade.setInteractive();
  const panel = scene.add.rectangle(640, 360, width, height, 0x1d2633, 0.98);
  panel.setStrokeStyle(3, 0xfacc15, 0.95);
  panel.setInteractive();
  const title = scene.add.text(640, 82, label, {
    fontFamily: 'Arial',
    fontSize: '28px',
    fontStyle: 'bold',
    color: '#facc15',
  });
  title.setOrigin(0.5);
  return { shade, panel, title };
}

function createDebugButton(
  scene: DebugScene,
  x: number,
  y: number,
  width: number,
  height: number,
  labelText: string,
  onClick: () => void,
): Phaser.GameObjects.Container {
  const button = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, width, height, 0x514826, 1);
  bg.setStrokeStyle(2, 0xfacc15, 0.9);
  const label = scene.add.text(0, 0, labelText, {
    fontFamily: 'Arial',
    fontSize: '14px',
    fontStyle: 'bold',
    color: '#fff7d6',
  });
  label.setOrigin(0.5);
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerover', () => bg.setFillStyle(0x6b5d2c));
  bg.on('pointerout', () => bg.setFillStyle(0x514826));
  bg.on('pointerup', onClick);
  button.add([bg, label]);
  button.setDepth(7100);
  return button;
}

function debugTextStyle(fontSize: number): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: 'Arial',
    fontSize: `${fontSize}px`,
    color: '#f8fafc',
  };
}

function statRow(label: string, value: () => number, change: (delta: number) => void) {
  return { label, value, change };
}

function resetOverlay(scene: DebugScene): Phaser.GameObjects.Container {
  const overlay = scene.modalOverlay as Phaser.GameObjects.Container;
  overlay.removeAll(true);
  return overlay;
}

function refreshBattleScene(scene: DebugScene): void {
  scene.updateHud?.();
  scene.renderHand?.();
  scene.refreshHandCardUsabilities?.();
}

function rebuildEnemyViews(scene: DebugScene, preferredIndex: number): void {
  destroyEnemyViews(scene);

  if (scene.enemies.length <= 0) {
    return;
  }

  const overlay = scene.modalOverlay as Phaser.GameObjects.Container | undefined;
  const wasOverlayVisible = overlay?.visible ?? false;
  overlay?.setVisible(false);

  const selectedIndex = Phaser.Math.Clamp(preferredIndex, 0, scene.enemies.length - 1);
  scene.selectedEnemyIndex = selectedIndex;
  scene.enemy = scene.enemies[selectedIndex];
  scene.createEnemy?.();
  scene.selectEnemy?.(selectedIndex);

  overlay?.setVisible(wasOverlayVisible);
  refreshBattleScene(scene);
}

function destroyEnemyViews(scene: DebugScene): void {
  scene.reticle?.destroy?.();
  scene.reticle = undefined;

  for (const view of scene.enemyViews ?? []) {
    view.area?.destroy?.();
    view.hudText?.destroy?.();
    view.statusIcons?.destroy?.();
    view.intentText?.destroy?.();

    for (const value of Object.values(view.bars ?? {})) {
      if (value && typeof value === 'object' && 'destroy' in value) {
        (value as Phaser.GameObjects.GameObject).destroy();
      }
    }
  }

  scene.enemyViews = [];
}

function clampPlayerAfterStatChange(scene: DebugScene): void {
  const player = scene.player;
  player.hp = Phaser.Math.Clamp(player.hp, 0, player.maxHp);
  player.ep = Phaser.Math.Clamp(player.ep, 0, scene.playerEffectiveMaxEp());
  scene.playerEpReserveValue = Phaser.Math.Clamp(scene.playerEpReserveValue, 0, scene.playerEffectiveMaxEp());
  player.energy = Phaser.Math.Clamp(player.energy, 0, player.maxEnergy);
}

function setMutableNumber(target: Record<string, number>, key: string, value: number): void {
  target[key] = value;
}

function debugTargets(scene: DebugScene): DebugTarget[] {
  return [
    { id: 'player', label: 'Player', value: scene.player },
    ...scene.enemies.map((enemy: any, index: number) => ({
      id: `enemy-${index}`,
      label: `Enemy ${index + 1}`,
      value: enemy,
    })),
  ];
}

function enemyDebugDisplayNames(scene: DebugScene): string[] {
  if (typeof scene.enemyDisplayNames === 'function') {
    return scene.enemyDisplayNames(scene.enemies);
  }

  return scene.enemies.map((enemy: Enemy) => localize(enemy.definition.name));
}

function removeCardFromDebugDeck(scene: DebugScene, cardId: string): void {
  const runIndex = RUN_STATE.deckIds.lastIndexOf(cardId);
  if (runIndex >= 0) {
    RUN_STATE.deckIds.splice(runIndex, 1);
  }

  const piles = [scene.deck?.drawPile, scene.deck?.discardPile, scene.deck?.hand].filter(Boolean);
  for (const pile of piles) {
    const index = pile.findIndex((card: any) => card.definition.id === cardId);
    if (index >= 0) {
      pile.splice(index, 1);
      return;
    }
  }
}

function debugUid(cardId: string): string {
  return `debug-${cardId}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}
// DEBUG_MODE_END
