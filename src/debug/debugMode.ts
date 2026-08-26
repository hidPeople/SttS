import Phaser from 'phaser';
import { CARD_DEFINITIONS } from '../data/cards';
import { ENEMY_DEFINITIONS } from '../data/enemies';
import { RELIC_DEFINITIONS } from '../data/relics';
import { STATUS_DESCRIPTIONS, sensitivityStatusId, type SensitivityLevel } from '../data/statuses';
import { Enemy } from '../models/Combatants';
import { localize } from '../models/localization';
import { RUN_STATE } from '../models/RunState';
import { EP_DAMAGE_PARTS, type EpDamagePart, type StatusEffect, type StatusOwner } from '../models/types';

// DEBUG_MODE_START
// Debug-only code is isolated in this file. Runtime entry points must also check
// DEBUG_FEATURES_AVAILABLE and DEBUG_STATE.enabled before mutating game state.
export const DEBUG_FEATURES_AVAILABLE = true;

export const DEBUG_STATE = {
//  enabled: false,
  enabled: true,  // 開発用にデバッグモードを常に有効化
  encounterThreatOverride: undefined as number | undefined,
};

type DebugScene = Phaser.Scene & Record<string, any>;
type DebugTarget = {
  id: string;
  label: string;
  value: any;
  owner: StatusOwner;
  disabled: boolean;
};

type DebugScrollArea = {
  content: Phaser.GameObjects.Container;
  setContentBottom: (bottom: number) => void;
};
type DebugScrollAreaOptions = {
  initialScroll?: number;
  onScroll?: (scroll: number) => void;
};
type DebugStatRow = {
  label: string;
  value: () => number;
  set: (value: number) => void;
};
type DebugStatSelectionEntry = {
  row: DebugStatRow;
  setSelected: (selected: boolean) => void;
  refresh: () => void;
};
type DebugStatSelectionState = {
  selectedIds: Set<string>;
  entries: Map<string, DebugStatSelectionEntry>;
  primaryId?: string;
};

const statusDebugScrollByTarget = new Map<string, number>();
const debugPanelScrollPositions = new Map<string, number>();

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
    createDebugButton(scene, 1010, 408, 240, 40, 'DEBUG: レリック操作', () => showRelicDebugPanel(scene)),
    createDebugButton(scene, 1010, 458, 240, 40, 'DEBUG: 脅威度操作', () => showThreatDebugPanel(scene)),
    createDebugButton(scene, 1010, 508, 240, 40, 'DEBUG: 敵操作', () => showEnemyDebugPanel(scene)),
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
  overlay.add([shade, panel, title]);
  const scrollArea = createDebugScrollArea(scene, overlay, 190, 112, 900, 492, persistedDebugScroll('deck'));
  const cards = Object.values(CARD_DEFINITIONS);

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
    scrollArea.content.add([label, add, remove]);
  });

  scrollArea.setContentBottom(150 + Math.ceil(cards.length / 3) * 58 + 24);
  overlay.add(createDebugButton(scene, 640, 630, 180, 40, '戻る', () => showSettingsMenuFromDebug(scene)));
  overlay.setVisible(true);
}

function showStatsDebugPanel(scene: DebugScene): void {
  const overlay = resetOverlay(scene);
  const { shade, panel, title } = createDebugPanel(scene, 'DEBUG: 能力値操作', 940, 650);
  overlay.add([shade, panel, title]);
  const scrollArea = createDebugScrollArea(scene, overlay, 250, 105, 780, 520);
  const player = scene.player;
  const rows = [
    statRow('最大HP', () => player.maxHp, (value) => setMutableNumber(player, 'maxHp', Math.max(1, value))),
    statRow('現在HP', () => player.hp, (value) => {
      const nextHp = Math.max(0, value);
      if (nextHp > player.maxHp) {
        setMutableNumber(player, 'maxHp', nextHp);
      }
      player.hp = Phaser.Math.Clamp(nextHp, 0, player.maxHp);
    }),
    statRow('Block', () => player.block, (value) => { player.block = Math.max(0, value); }),
    statRow('最大EP', () => player.maxEp, (value) => setMutableNumber(player, 'maxEp', Math.max(1, value))),
    statRow('現在EP', () => player.ep, (value) => {
      const nextEp = Phaser.Math.Clamp(value, 0, scene.playerEffectiveMaxEp());
      player.ep = nextEp;
      if (scene.playerEpReserveValue > nextEp) {
        setPlayerEpReserveForDebug(scene, nextEp);
      }
    }),
    statRow('EPリセット下限', () => scene.playerEpReserveValue, (value) => {
      const nextReserve = Phaser.Math.Clamp(value, 0, scene.playerEffectiveMaxEp());
      if (player.ep < nextReserve) {
        player.ep = nextReserve;
      }
      setPlayerEpReserveForDebug(scene, nextReserve);
    }),
    statRow('最大エナジー', () => player.maxEnergy, (value) => setMutableNumber(player, 'maxEnergy', Math.max(0, value))),
    statRow('現在エナジー', () => player.energy, (value) => { player.energy = Phaser.Math.Clamp(value, 0, player.maxEnergy); }),
    ...EP_DAMAGE_PARTS.map((part) => statRow(`累計EP ${part}`, () => player.epDamageByPart[part], (value) => {
      player.epDamageByPart[part] = Math.max(0, value);
    })),
    ...EP_DAMAGE_PARTS.map((part) => statRow(`EP Peak回数 ${part}`, () => player.epPeakByPart[part], (value) => {
      player.epPeakByPart[part] = Math.max(0, value);
    })),
  ];

  rows.forEach((row, index) => {
    const y = 118 + index * 34;
    const rowId = `stat-${index}`;
    scrollArea.content.add(scene.add.text(285, y, row.label, debugTextStyle(14)));
    scrollArea.content.add(createDebugNumberInput(scene, overlay, 535, y + 10, 80, 24, rowId, row, () => showStatsDebugPanel(scene)));
    [-100, -10, -1, 1, 10, 100].forEach((delta, buttonIndex) => {
      const widths = [44, 38, 34, 34, 38, 46];
      const xPositions = [610, 658, 700, 739, 781, 829];
      scrollArea.content.add(createDebugButton(scene, xPositions[buttonIndex], y + 10, widths[buttonIndex], 24, delta > 0 ? `+${delta}` : String(delta), () => {
        applyDebugStatDelta(scene, overlay, rowId, row, delta, () => showStatsDebugPanel(scene));
      }));
    });
  });

  scrollArea.setContentBottom(118 + rows.length * 34 + 24);
  overlay.add(createDebugButton(scene, 640, 668, 180, 34, '戻る', () => showSettingsMenuFromDebug(scene)));
  overlay.setVisible(true);
}

function showStatusDebugPanel(scene: DebugScene, targetId = 'player'): void {
  const overlay = resetOverlay(scene);
  const { shade, panel, title } = createDebugPanel(scene, 'DEBUG: 状態異常操作', 980, 620);
  overlay.add([shade, panel, title]);
  const targets = debugTargets(scene);
  const target = targets.find((item) => item.id === targetId && !item.disabled) ?? targets.find((item) => !item.disabled) ?? targets[0];
  const scrollArea = createDebugScrollArea(scene, overlay, 170, 105, 940, 520, {
    initialScroll: statusDebugScrollByTarget.get(target.id) ?? 0,
    onScroll: (scroll) => statusDebugScrollByTarget.set(target.id, scroll),
  });
  const statuses = (Object.keys(STATUS_DESCRIPTIONS) as StatusEffect[]).filter((status) => !isSensitivityStatus(status));

  targets.forEach((item, index) => {
    scrollArea.content.add(createDebugButton(scene, 270 + index * 170, 120, 150, 30, item.label, () => showStatusDebugPanel(scene, item.id), { disabled: item.disabled }));
  });

  let startY = 175;
  if (target.owner === 'player' && !target.disabled) {
    scrollArea.content.add(scene.add.text(210, startY - 22, '開発レベル', debugTextStyle(17)));
    EP_DAMAGE_PARTS.forEach((part, index) => {
      const y = startY + index * 42;
      const level = sensitivityLevelForDebug(target.value, part);
      scrollArea.content.add(scene.add.text(210, y, `${part}: Lv.${level}`, debugTextStyle(15)));
      for (let nextLevel = 0; nextLevel <= 5; nextLevel += 1) {
        scrollArea.content.add(createDebugButton(scene, 330 + nextLevel * 48, y + 10, 38, 26, String(nextLevel), () => {
          setSensitivityLevelForDebug(target.value, part, nextLevel);
          refreshBattleScene(scene);
          showStatusDebugPanel(scene, target.id);
        }, { disabled: level === nextLevel }));
      }
    });
    startY += EP_DAMAGE_PARTS.length * 42 + 34;
  } else {
    scrollArea.content.add(scene.add.text(210, startY - 18, '開発レベルはPlayer専用', debugTextStyle(15, true)));
    startY += 22;
  }

  statuses.forEach((status, index) => {
    const x = 210 + (index % 3) * 305;
    const y = startY + Math.floor(index / 3) * 58;
    const statusDefinition = STATUS_DESCRIPTIONS[status];
    const disabled = target.disabled || !statusDefinition.allowedOwners.includes(target.owner);
    const stacks = target.value.statuses.get(status) ?? 0;
    scrollArea.content.add(scene.add.text(x, y, `${localize(statusDefinition.name)} (${stacks})`, debugTextStyle(15, disabled)));
    scrollArea.content.add(createDebugButton(scene, x + 190, y + 10, 42, 28, '+', () => {
      target.value.addStatus(status, 1);
      refreshBattleScene(scene);
      showStatusDebugPanel(scene, target.id);
    }, { disabled }));
    scrollArea.content.add(createDebugButton(scene, x + 240, y + 10, 42, 28, '消', () => {
      target.value.statuses.delete(status);
      refreshBattleScene(scene);
      showStatusDebugPanel(scene, target.id);
    }, { disabled }));
  });

  scrollArea.setContentBottom(startY + Math.ceil(statuses.length / 3) * 58 + 24);
  overlay.add(createDebugButton(scene, 640, 655, 180, 40, '戻る', () => showSettingsMenuFromDebug(scene)));
  overlay.setVisible(true);
}

function showRelicDebugPanel(scene: DebugScene): void {
  const overlay = resetOverlay(scene);
  const { shade, panel, title } = createDebugPanel(scene, 'DEBUG: レリック操作', 900, 560);
  overlay.add([shade, panel, title]);
  const scrollArea = createDebugScrollArea(scene, overlay, 210, 112, 860, 492, persistedDebugScroll('relic'));
  const relics = Object.values(RELIC_DEFINITIONS);

  relics.forEach((relic, index) => {
    const x = 250 + (index % 2) * 390;
    const y = 145 + Math.floor(index / 2) * 58;
    const owned = scene.player.relicIds.includes(relic.id);
    scrollArea.content.add(scene.add.text(x, y, `${localize(relic.name)} [${relic.rarity}] ${owned ? '装備中' : ''}`, debugTextStyle(15)));
    scrollArea.content.add(createDebugButton(scene, x + 245, y + 10, 52, 28, '追加', () => {
      addRelicForDebug(scene, relic.id);
      showRelicDebugPanel(scene);
    }, { disabled: owned }));
    scrollArea.content.add(createDebugButton(scene, x + 305, y + 10, 52, 28, '削除', () => {
      removeRelicForDebug(scene, relic.id);
      showRelicDebugPanel(scene);
    }, { disabled: !owned }));
  });

  scrollArea.setContentBottom(145 + Math.ceil(relics.length / 2) * 58 + 24);
  overlay.add(createDebugButton(scene, 640, 630, 180, 40, '戻る', () => showSettingsMenuFromDebug(scene)));
  overlay.setVisible(true);
}

function showThreatDebugPanel(scene: DebugScene): void {
  const overlay = resetOverlay(scene);
  const { shade, panel, title } = createDebugPanel(scene, 'DEBUG: ステージ脅威度操作', 680, 360);
  overlay.add([shade, panel, title]);
  const scrollArea = createDebugScrollArea(scene, overlay, 420, 245, 440, 210);
  const defaultThreat = Math.min(3, RUN_STATE.battleIndex + 1);
  const current = DEBUG_STATE.encounterThreatOverride ?? defaultThreat;
  scrollArea.content.add([
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
  ]);
  scrollArea.setContentBottom(410);
  overlay.add(createDebugButton(scene, 640, 500, 180, 40, '戻る', () => showSettingsMenuFromDebug(scene)));
  overlay.setVisible(true);
}

function showEnemyDebugPanel(scene: DebugScene): void {
  const overlay = resetOverlay(scene);
  const { shade, panel, title } = createDebugPanel(scene, 'DEBUG: 敵操作', 960, 590);
  overlay.add([shade, panel, title]);
  const scrollArea = createDebugScrollArea(scene, overlay, 180, 105, 920, 505, persistedDebugScroll('enemy'));
  const enemies = Object.values(ENEMY_DEFINITIONS);
  const currentNames = enemyDebugDisplayNames(scene);

  scrollArea.content.add(scene.add.text(205, 118, '出現中の敵', debugTextStyle(18)));
  scene.enemies.forEach((enemy: Enemy, index: number) => {
    const y = 155 + index * 42;
    scrollArea.content.add(scene.add.text(205, y, `${index + 1}. ${currentNames[index] ?? localize(enemy.definition.name)}`, debugTextStyle(15)));
    scrollArea.content.add(createDebugButton(scene, 460, y + 11, 70, 28, '削除', () => {
      if (isLastAliveEnemy(scene, enemy)) {
        showDebugVictoryConfirmPanel(scene, enemy);
        return;
      }
      scene.enemies.splice(index, 1);
      rebuildEnemyViews(scene, Math.min(index, scene.enemies.length - 1));
      showEnemyDebugPanel(scene);
    }));
  });

  scrollArea.content.add(scene.add.text(610, 118, '敵プール', debugTextStyle(18)));
  enemies.forEach((definition, index) => {
    const y = 155 + index * 44;
    const count = scene.enemies.filter((enemy: Enemy) => enemy.definition.id === definition.id).length;
    scrollArea.content.add(scene.add.text(610, y, `${localize(definition.name)} (${count})`, debugTextStyle(15)));
    scrollArea.content.add(createDebugButton(scene, 850, y + 11, 70, 28, '追加', () => {
      scene.enemies.push(new Enemy(definition));
      rebuildEnemyViews(scene, scene.enemies.length - 1);
      showEnemyDebugPanel(scene);
    }));
  });

  scrollArea.setContentBottom(Math.max(155 + scene.enemies.length * 42, 155 + enemies.length * 44) + 24);
  overlay.add(createDebugButton(scene, 640, 640, 180, 40, '戻る', () => showSettingsMenuFromDebug(scene)));
  overlay.setVisible(true);
}

function showDebugVictoryConfirmPanel(scene: DebugScene, enemy: Enemy): void {
  const overlay = resetOverlay(scene);
  const { shade, panel, title } = createDebugPanel(scene, 'DEBUG: 戦闘勝利確認', 620, 280);
  overlay.add([
    shade,
    panel,
    title,
    scene.add.text(640, 300, '最後の敵です。戦闘に勝利しますか？', {
      ...debugTextStyle(20),
      align: 'center',
    }).setOrigin(0.5),
    createDebugButton(scene, 555, 405, 130, 40, 'はい', () => {
      void forceDebugVictory(scene, enemy);
    }),
    createDebugButton(scene, 725, 405, 130, 40, 'いいえ', () => showEnemyDebugPanel(scene)),
  ]);
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

function createDebugScrollArea(
  scene: DebugScene,
  overlay: Phaser.GameObjects.Container,
  x: number,
  y: number,
  width: number,
  height: number,
  options: DebugScrollAreaOptions = {},
): DebugScrollArea {
  const content = scene.add.container(0, 0);
  content.setDepth(7100);

  const maskGraphics = scene.make.graphics({});
  maskGraphics.fillStyle(0xffffff, 1);
  maskGraphics.fillRect(x, y, width, height);
  const mask = maskGraphics.createGeometryMask();
  content.setMask(mask);

  const trackHeight = height - 8;
  const track = scene.add.rectangle(x + width - 8, y + height / 2, 5, trackHeight, 0x0f172a, 0.75);
  const thumb = scene.add.rectangle(x + width - 8, y + 18, 7, 36, 0xfacc15, 0.9);
  track.setDepth(7200);
  thumb.setDepth(7201);
  track.setVisible(false);
  thumb.setVisible(false);

  let contentBottom = y + height;
  let scroll = Math.max(0, options.initialScroll ?? 0);

  const applyScroll = () => {
    const maxScroll = Math.max(0, contentBottom - (y + height));
    scroll = Phaser.Math.Clamp(scroll, 0, maxScroll);
    content.setY(-scroll);
    options.onScroll?.(scroll);
    const hasOverflow = maxScroll > 0;
    track.setVisible(hasOverflow);
    thumb.setVisible(hasOverflow);
    if (!hasOverflow) {
      return;
    }

    const contentHeight = Math.max(height, contentBottom - y);
    const thumbHeight = Phaser.Math.Clamp((height / contentHeight) * trackHeight, 36, trackHeight);
    const thumbTravel = trackHeight - thumbHeight;
    const ratio = maxScroll > 0 ? scroll / maxScroll : 0;
    thumb.setDisplaySize(7, thumbHeight);
    thumb.setY(y + 4 + thumbHeight / 2 + thumbTravel * ratio);
  };

  const wheelHandler = (pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
    if (!overlay.visible) {
      return;
    }
    if (pointer.x < x || pointer.x > x + width || pointer.y < y || pointer.y > y + height) {
      return;
    }
    scroll += deltaY > 0 ? 42 : -42;
    applyScroll();
  };

  scene.input.on('wheel', wheelHandler);
  addDebugCleanup(overlay, () => {
    scene.input.off('wheel', wheelHandler);
    mask.destroy();
    maskGraphics.destroy();
  });

  overlay.add([content, track, thumb]);
  return {
    content,
    setContentBottom: (bottom: number) => {
      contentBottom = bottom;
      applyScroll();
    },
  };
}

function createDebugNumberInput(
  scene: DebugScene,
  overlay: Phaser.GameObjects.Container,
  x: number,
  y: number,
  width: number,
  height: number,
  id: string,
  row: DebugStatRow,
  rerender: () => void,
): Phaser.GameObjects.Container {
  const input = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, width, height, 0x0f172a, 1);
  bg.setStrokeStyle(1, 0x64748b, 0.9);
  const label = scene.add.text(0, 0, String(row.value()), {
    fontFamily: 'Arial',
    fontSize: '14px',
    color: '#f8fafc',
  });
  label.setOrigin(0.5);
  bg.setInteractive({ useHandCursor: true });

  const setSelected = (selected: boolean) => {
    bg.setStrokeStyle(selected ? 2 : 1, selected ? 0xfacc15 : 0x64748b, selected ? 1 : 0.9);
  };
  const refresh = () => label.setText(String(row.value()));

  const selectionState = debugStatSelectionState(overlay);
  selectionState.entries.set(id, { row, setSelected, refresh });
  addDebugCleanup(overlay, () => {
    selectionState.entries.delete(id);
    selectionState.selectedIds.delete(id);
    if (selectionState.primaryId === id) {
      selectionState.primaryId = undefined;
    }
  });

  const activate = (multiSelect: boolean) => {
    const state = debugStatSelectionState(overlay);
    if (!multiSelect) {
      state.selectedIds.forEach((selectedId) => state.entries.get(selectedId)?.setSelected(false));
      state.selectedIds.clear();
    }

    if (multiSelect && state.selectedIds.has(id)) {
      state.selectedIds.delete(id);
      setSelected(false);
      state.primaryId = state.selectedIds.values().next().value as string | undefined;
      return;
    }

    state.selectedIds.add(id);
    state.primaryId = id;
    setSelected(true);
    refresh();
  };

  bg.on('pointerup', (pointer: Phaser.Input.Pointer) => {
    const event = pointer.event as MouseEvent | undefined;
    activate(Boolean(event?.ctrlKey || event?.metaKey));
  });

  const keyHandler = (event: KeyboardEvent) => {
    const state = debugStatSelectionState(overlay);
    if (state.primaryId !== id) {
      return;
    }
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key !== 'c' && key !== 'v') {
      return;
    }

    event.preventDefault();
    if (key === 'c') {
      void navigator.clipboard?.writeText(String(row.value()));
      return;
    }

    void navigator.clipboard?.readText().then((text) => {
      if (debugStatSelectionState(overlay).primaryId !== id) {
        return;
      }
      const pasted = text.trim();
      if (/^-?[0-9]+$/.test(pasted)) {
        applyDebugStatValueToSelection(scene, overlay, Number.parseInt(pasted, 10), rerender);
      }
    });
  };

  scene.input.keyboard?.on('keydown', keyHandler);
  addDebugCleanup(overlay, () => scene.input.keyboard?.off('keydown', keyHandler));

  input.add([bg, label]);
  input.setDepth(7100);
  return input;
}

function addDebugCleanup(overlay: Phaser.GameObjects.Container, cleanup: () => void): void {
  const previousCleanup = overlay.getData('debugCleanup') as (() => void) | undefined;
  overlay.setData('debugCleanup', () => {
    previousCleanup?.();
    cleanup();
  });
}

function persistedDebugScroll(key: string): DebugScrollAreaOptions {
  return {
    initialScroll: debugPanelScrollPositions.get(key) ?? 0,
    onScroll: (scroll) => debugPanelScrollPositions.set(key, scroll),
  };
}

function debugStatSelectionState(overlay: Phaser.GameObjects.Container): DebugStatSelectionState {
  const existing = overlay.getData('debugStatSelection') as DebugStatSelectionState | undefined;
  if (existing) {
    return existing;
  }

  const state: DebugStatSelectionState = {
    selectedIds: new Set<string>(),
    entries: new Map<string, DebugStatSelectionEntry>(),
  };
  overlay.setData('debugStatSelection', state);
  addDebugCleanup(overlay, () => overlay.setData('debugStatSelection', undefined));
  return state;
}

function selectedDebugStatEntries(
  overlay: Phaser.GameObjects.Container,
  fallbackId: string,
  fallbackRow: DebugStatRow,
): DebugStatSelectionEntry[] {
  const state = debugStatSelectionState(overlay);
  if (state.selectedIds.has(fallbackId)) {
    const entries = Array.from(state.selectedIds)
      .map((id) => state.entries.get(id))
      .filter((entry): entry is DebugStatSelectionEntry => Boolean(entry));
    if (entries.length > 0) {
      return entries;
    }
  }

  return [{ row: fallbackRow, setSelected: () => undefined, refresh: () => undefined }];
}

function applyDebugStatDelta(
  scene: DebugScene,
  overlay: Phaser.GameObjects.Container,
  rowId: string,
  row: DebugStatRow,
  delta: number,
  _rerender: () => void,
): void {
  selectedDebugStatEntries(overlay, rowId, row).forEach((entry) => {
    entry.row.set(entry.row.value() + delta);
  });
  clampPlayerAfterStatChange(scene);
  refreshBattleScene(scene);
  refreshDebugStatInputs(overlay);
}

function applyDebugStatValueToSelection(
  scene: DebugScene,
  overlay: Phaser.GameObjects.Container,
  value: number,
  _rerender: () => void,
): void {
  const state = debugStatSelectionState(overlay);
  Array.from(state.selectedIds)
    .map((id) => state.entries.get(id))
    .filter((entry): entry is DebugStatSelectionEntry => Boolean(entry))
    .forEach((entry) => entry.row.set(value));
  clampPlayerAfterStatChange(scene);
  refreshBattleScene(scene);
  refreshDebugStatInputs(overlay);
}

function refreshDebugStatInputs(overlay: Phaser.GameObjects.Container): void {
  debugStatSelectionState(overlay).entries.forEach((entry) => entry.refresh());
}

function createDebugButton(
  scene: DebugScene,
  x: number,
  y: number,
  width: number,
  height: number,
  labelText: string,
  onClick: () => void,
  options: { disabled?: boolean } = {},
): Phaser.GameObjects.Container {
  const button = scene.add.container(x, y);
  const disabled = options.disabled ?? false;
  const bg = scene.add.rectangle(0, 0, width, height, disabled ? 0x343942 : 0x514826, 1);
  bg.setStrokeStyle(2, disabled ? 0x6b7280 : 0xfacc15, disabled ? 0.65 : 0.9);
  const label = scene.add.text(0, 0, labelText, {
    fontFamily: 'Arial',
    fontSize: '14px',
    fontStyle: 'bold',
    color: disabled ? '#8b93a1' : '#fff7d6',
  });
  label.setOrigin(0.5);
  if (!disabled) {
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x6b5d2c));
    bg.on('pointerout', () => bg.setFillStyle(0x514826));
    bg.on('pointerup', onClick);
  }
  button.add([bg, label]);
  button.setDepth(7100);
  return button;
}

function debugTextStyle(fontSize: number, disabled = false): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: 'Arial',
    fontSize: `${fontSize}px`,
    color: disabled ? '#7b8494' : '#f8fafc',
  };
}

function statRow(label: string, value: () => number, set: (value: number) => void): DebugStatRow {
  return { label, value, set };
}

function resetOverlay(scene: DebugScene): Phaser.GameObjects.Container {
  const overlay = scene.modalOverlay as Phaser.GameObjects.Container;
  const cleanup = overlay.getData('debugCleanup') as (() => void) | undefined;
  cleanup?.();
  overlay.setData('debugCleanup', undefined);
  overlay.removeAll(true);
  return overlay;
}

function showSettingsMenuFromDebug(scene: DebugScene): void {
  resetOverlay(scene);
  scene.showSettingsMenu();
}

function refreshBattleScene(scene: DebugScene): void {
  scene.updateHud?.();
  scene.renderHand?.();
  scene.refreshHandCardUsabilities?.();
}

function refreshRelicsForDebug(scene: DebugScene): void {
  scene.relicIcons?.destroy?.(true);
  scene.relicIconViews?.clear?.();
  scene.indexPlayerRelics?.();
  scene.createRelicHud?.();
  refreshBattleScene(scene);
}

async function forceDebugVictory(scene: DebugScene, enemy: Enemy): Promise<void> {
  const overlay = scene.modalOverlay as Phaser.GameObjects.Container | undefined;
  overlay?.removeAll(true);
  overlay?.setVisible(false);

  enemy.hp = 0;
  scene.updateHud?.();

  if (typeof scene.defeatEnemy === 'function') {
    scene.isAnimating = true;
    await scene.defeatEnemy(enemy);
    return;
  }

  scene.enemies.forEach((candidate: Enemy) => {
    candidate.hp = 0;
  });
  scene.updateHud?.();
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
  setPlayerEpReserveForDebug(scene, Phaser.Math.Clamp(scene.playerEpReserveValue, 0, scene.playerEffectiveMaxEp()));
  player.energy = Phaser.Math.Clamp(player.energy, 0, player.maxEnergy);
}

function setMutableNumber(target: Record<string, number>, key: string, value: number): void {
  target[key] = value;
}

function setPlayerEpReserveForDebug(scene: DebugScene, value: number): void {
  const maxEp = scene.playerEffectiveMaxEp();
  const clamped = Phaser.Math.Clamp(value, 0, maxEp);
  if (typeof scene.setPlayerEpReserveValue === 'function') {
    scene.setPlayerEpReserveValue(clamped, maxEp, false);
    return;
  }

  scene.playerEpReserveValue = clamped;
}

function debugTargets(scene: DebugScene): DebugTarget[] {
  const enemyNames = enemyDebugDisplayNames(scene);
  return [
    { id: 'player', label: 'Player', value: scene.player, owner: 'player', disabled: false },
    ...scene.enemies.map((enemy: any, index: number) => ({
      id: `enemy-${index}`,
      label: `${enemyNames[index] ?? `Enemy ${index + 1}`}${enemy.isDefeated ? ' (撃破)' : ''}`,
      value: enemy,
      owner: 'enemy' as const,
      disabled: !!enemy.isDefeated,
    })),
  ];
}

function isSensitivityStatus(status: StatusEffect): boolean {
  return /^(A|B|C|V|M)SensitivityLv[1-5]$/.test(status);
}

function sensitivityLevelForDebug(target: { statuses: Map<StatusEffect, number> }, part: EpDamagePart): number {
  for (let level = 5; level >= 1; level -= 1) {
    if (target.statuses.has(sensitivityStatusId(part, level as SensitivityLevel))) {
      return level;
    }
  }

  return 0;
}

function setSensitivityLevelForDebug(
  target: { statuses: Map<StatusEffect, number> },
  part: EpDamagePart,
  level: number,
): void {
  for (let currentLevel = 1; currentLevel <= 5; currentLevel += 1) {
    target.statuses.delete(sensitivityStatusId(part, currentLevel as SensitivityLevel));
  }

  if (level > 0) {
    target.statuses.set(sensitivityStatusId(part, level as SensitivityLevel), 1);
  }
}

function enemyDebugDisplayNames(scene: DebugScene): string[] {
  if (typeof scene.enemyDisplayNames === 'function') {
    return scene.enemyDisplayNames(scene.enemies);
  }

  return scene.enemies.map((enemy: Enemy) => localize(enemy.definition.name));
}

function isLastAliveEnemy(scene: DebugScene, enemy: Enemy): boolean {
  if (enemy.isDefeated) {
    return false;
  }

  return scene.enemies.filter((candidate: Enemy) => !candidate.isDefeated).length <= 1;
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

function addRelicForDebug(scene: DebugScene, relicId: string): void {
  if (!scene.player.relicIds.includes(relicId)) {
    scene.player.relicIds.push(relicId);
  }
  if (!RUN_STATE.relicIds.includes(relicId)) {
    RUN_STATE.relicIds.push(relicId);
  }
  refreshRelicsForDebug(scene);
}

function removeRelicForDebug(scene: DebugScene, relicId: string): void {
  removeFirst(scene.player.relicIds, relicId);
  removeFirst(RUN_STATE.relicIds, relicId);
  refreshRelicsForDebug(scene);
}

function removeFirst(values: string[], value: string): void {
  const index = values.indexOf(value);
  if (index >= 0) {
    values.splice(index, 1);
  }
}

function debugUid(cardId: string): string {
  return `debug-${cardId}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}
// DEBUG_MODE_END
