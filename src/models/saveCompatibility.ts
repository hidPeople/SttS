import { createInitialRunState, type RunStateSnapshot } from './RunState';
import type { RunSaveSlot } from './runSaves';
import type { BattleSceneSaveState, SavedCardInstance } from './battleSave';
import { CARD_DEFINITIONS } from '../data/cards';
import { ENEMY_DEFINITIONS } from '../data/enemies';
import { RELIC_DEFINITIONS } from '../data/relics';
import { STATUS_DESCRIPTIONS } from '../data/statuses';
import { EVENT_BATTLES } from '../data/eventBattles';
import { CONVERSATIONS } from '../data/conversations';
import { EP_DAMAGE_PARTS, type EpDamagePart, type StatusEffect, type BattleEventSource } from './types';

export const SAVE_VERSION = 3;
export interface CompatibleSave { save: RunSaveSlot; repaired: boolean; restartedBattle: boolean }
const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const known = (registry: object, id: unknown): id is string => typeof id === 'string' && Object.prototype.hasOwnProperty.call(registry, id);

/** Whitelist persisted fields. Unknown IDs/fields never become executable game state. */
export function normalizeSave(value: unknown): CompatibleSave | undefined {
  const input = object(value);
  if (!Number.isInteger(input.slot) || Number(input.slot) < 0 || Number(input.slot) >= 100) return;
  let repaired = false;
  const bad = <T>(fallback: T): T => { repaired = true; return fallback; };
  const num = (v: unknown, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER): number =>
    typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : bad(fallback);
  const int = (v: unknown, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) => {
    const n = num(v, fallback, min, max); return Number.isInteger(n) ? n : bad(Math.floor(n));
  };
  const bool = (v: unknown, fallback = false) => typeof v === 'boolean' ? v : bad(fallback);
  const arr = (v: unknown): unknown[] => Array.isArray(v) ? v : bad([]);
  const ids = (v: unknown, registry: object, fallback: string[] = []) => v === undefined ? bad([...fallback]) : arr(v).filter(id => known(registry, id) || (bad(false)) ) as string[];
  const parts = (v: unknown): EpDamagePart[] => arr(v).filter(p => EP_DAMAGE_PARTS.includes(p as EpDamagePart) || bad(false)) as EpDamagePart[];
  const partRecord = (v: unknown, fallback?: Record<EpDamagePart, number>) => Object.fromEntries(EP_DAMAGE_PARTS.map(p => [p, num(object(v)[p], fallback?.[p] ?? 0)])) as Record<EpDamagePart, number>;
  const statusMap = (v: unknown): [StatusEffect, number][] => arr(v).flatMap(entry => {
    if (!Array.isArray(entry) || !known(STATUS_DESCRIPTIONS, entry[0])) return bad([]);
    return [[entry[0] as StatusEffect, num(entry[1])]];
  });
  const activeTurns = (v: unknown) => Object.fromEntries(statusMap(Object.entries(object(v))));
  const pairs = (v: unknown): [number, number][] => arr(v).flatMap(entry => Array.isArray(entry) && entry.length === 2
    ? [[int(entry[0]), int(entry[1])] as [number, number]] : bad([]));
  const d = createInitialRunState(), r = object(input.run);
  const run: RunStateSnapshot = {
    stage: int(r.stage, d.stage, 1), battleIndex: int(r.battleIndex),
    eventBattleId: r.eventBattleId === undefined ? undefined : known(EVENT_BATTLES, r.eventBattleId) ? r.eventBattleId : bad(undefined),
    deckIds: ids(r.deckIds, CARD_DEFINITIONS, d.deckIds), relicIds: ids(r.relicIds, RELIC_DEFINITIONS, d.relicIds),
    encounterEnemyIds: ids(r.encounterEnemyIds, ENEMY_DEFINITIONS).slice(0, 3),
    playerHp: num(r.playerHp, d.playerHp), playerEp: num(r.playerEp), playerOrgasmCount: int(r.playerOrgasmCount),
    playerEpReserveValue: num(r.playerEpReserveValue), playerEpDamageByPart: partRecord(r.playerEpDamageByPart, d.playerEpDamageByPart),
    playerOrgasmByPart: partRecord(r.playerOrgasmByPart, d.playerOrgasmByPart), playerRecentOrgasmByPart: partRecord(r.playerRecentOrgasmByPart),
    playerStatuses: arr(r.playerStatuses).flatMap(v => { const s = object(v); return known(STATUS_DESCRIPTIONS, s.effect)
      ? [{ effect: s.effect as StatusEffect, stacks: num(s.stacks) }] : bad([]); }),
    playerStatusActiveTurns: activeTurns(r.playerStatusActiveTurns), battleLogs: [], nextBattleLogId: int(r.nextBattleLogId, 1, 1),
  };
  const logKinds = ['system', 'narration', 'quote', 'important', 'status'];
  run.battleLogs = arr(r.battleLogs).flatMap(v => {
    const e = object(v), t = object(e.text);
    if (!logKinds.includes(String(e.kind)) || !(typeof e.text === 'string' || (typeof t.en === 'string' && typeof t.ja === 'string'))) return bad([]);
    return [{ id: int(e.id), kind: e.kind as RunStateSnapshot['battleLogs'][number]['kind'],
      text: typeof e.text === 'string' ? e.text : { en: t.en as string, ja: t.ja as string },
      ...(e.spacing === undefined ? {} : { spacing: num(e.spacing) }) }];
  });
  run.nextBattleLogId = run.battleLogs.reduce((next, e) => Math.max(next, e.id + 1), run.nextBattleLogId);
  let scene = ['battle', 'reward', 'novel'].includes(String(input.scene)) ? input.scene as RunSaveSlot['scene'] : bad('battle' as const);
  let sceneState: unknown;
  let restartedBattle = false;
  const s = object(input.sceneState);
  if (scene === 'battle') {
    const p = object(s.player), deck = object(s.deck);
    const enemyList = Array.isArray(s.enemies) ? s.enemies : [];
    // A broken encounter cannot safely retain links or continue mid-turn. Restart only that battle.
    const resumable = Object.keys(p).length > 0 && ['drawPile', 'hand', 'discardPile'].every(k => Array.isArray(deck[k]))
      && enemyList.length > 0 && enemyList.length === run.encounterEnemyIds.length
      && enemyList.every((e, i) => object(e).enemyId === run.encounterEnemyIds[i])
      && s.isPlayerTurn !== false;
    if (!resumable) { bad(undefined); restartedBattle = true; run.playerHp = Math.max(1, run.playerHp); }
    else {
      const turn = int(s.turn, 1, 1);
      const combatant = (v: Record<string, unknown>, hp: number) => ({ hp: num(v.hp, hp), ep: num(v.ep), block: num(v.block), statuses: statusMap(v.statuses) });
      const enemies = enemyList.map((v, i) => {
        const e = object(v), def = ENEMY_DEFINITIONS[run.encounterEnemyIds[i]], special = object(e.specialIntent);
        const pool = special.pool === 'b' ? 'b' as const : 'e' as const;
        const intents = pool === 'b' ? def.intents_B ?? [] : def.intents_E;
        const specialIndex = e.specialIntent === undefined ? 0 : int(special.index);
        return { ...combatant(e, def.maxHp), enemyId: def.id,
          intentIndex: int(e.intentIndex, 0, 0, Math.max(0, def.intents.length - 1)),
          intentUsage: arr(e.intentUsage).flatMap(v => Array.isArray(v) && typeof v[0] === 'string' ? [[v[0], int(v[1])] as [string, number]] : bad([])),
          inOrgasmAftershocks: bool(e.inOrgasmAftershocks), hasForcedOrgasmAftershocksIntent: bool(e.hasForcedOrgasmAftershocksIntent),
          specialIntent: e.specialIntent === undefined ? undefined : intents[specialIndex] ? { pool, index: specialIndex } : bad(undefined) };
      });
      const usedUids = new Set<string>(); let nextUid = int(deck.nextUid, 1, 1);
      const cards = (v: unknown): SavedCardInstance[] => arr(v).flatMap(v => {
        const c = object(v); if (!known(CARD_DEFINITIONS, c.cardId)) return bad([]);
        const link = object(c.link); let savedLink: SavedCardInstance['link'];
        if (['purge', 'pullout', 'wriggleFree'].includes(c.cardId)) {
          // Legacy generated cards have no unambiguous enemy association: omit instead of targeting a different enemy.
          if (!Number.isInteger(link.enemyIndex) || !enemies[Number(link.enemyIndex)] || link.variant !== c.cardId
            || (c.cardId !== 'wriggleFree' && !known(STATUS_DESCRIPTIONS, link.status))) return bad([]);
          savedLink = { enemyIndex: Number(link.enemyIndex), variant: c.cardId as NonNullable<SavedCardInstance['link']>['variant'],
            status: c.cardId === 'wriggleFree' ? undefined : link.status as StatusEffect };
        }
        let uid = typeof c.uid === 'string' && c.uid ? c.uid : bad(`${c.cardId}-${nextUid++}`);
        if (usedUids.has(uid)) uid = bad(`${c.cardId}-${nextUid++}`);
        usedUids.add(uid); nextUid = Math.max(nextUid, Number(uid.match(/-(\d+)$/)?.[1] ?? 0) + 1);
        return [{ uid, cardId: c.cardId, link: savedLink }];
      });
      const drawPile = cards(deck.drawPile), hand = cards(deck.hand), discardPile = cards(deck.discardPile);
      const rt = object(s.statusRuntime), effects = object(s.turnEpEffects), touches = object(s.touchCounts);
      const validIndex = (v: unknown) => Number.isInteger(v) && Number(v) >= 0 && Number(v) < enemies.length;
      const result: BattleSceneSaveState = {
        rngState: int(s.rngState, 1, 1, 0xffffffff), turn, orgasmHistory: arr(s.orgasmHistory).map(v => int(v)),
        isPlayerTurn: true, canEndTurn: bool(s.canEndTurn, true), selectedEnemyIndex: int(s.selectedEnemyIndex, 0, 0, enemies.length - 1),
        cardsPlayedThisTurn: int(s.cardsPlayedThisTurn), playerOrgasmsThisCycle: int(s.playerOrgasmsThisCycle),
        playerEpReserveValue: num(s.playerEpReserveValue), completedTurnEvents: pairs(s.completedTurnEvents),
        touchCounts: { dormantSigil: int(touches.dormantSigil), arousedSigil: int(touches.arousedSigil), body: int(touches.body), head: int(touches.head) },
        player: { ...combatant(p, run.playerHp), energy: num(p.energy), orgasmCount: int(p.orgasmCount, run.playerOrgasmCount),
          orgasmsThisBattle: int(p.orgasmsThisBattle), epDamageByPart: partRecord(p.epDamageByPart, run.playerEpDamageByPart), orgasmByPart: partRecord(p.orgasmByPart, run.playerOrgasmByPart),
          recentOrgasmByPart: partRecord(p.recentOrgasmByPart), statusActiveTurns: activeTurns(p.statusActiveTurns),
          statusDrainCounts: statusMap(p.statusDrainCounts), lastEpDamageParts: parts(p.lastEpDamageParts),
          epDamageRecords: arr(p.epDamageRecords).flatMap(v => { const e = object(v);
            if (!['card', 'enemyIntent', 'relic', 'status', 'system'].includes(String(e.source))) return bad([]);
            return [{ amount: num(e.amount), parts: parts(e.parts), causedOrgasm: bool(e.causedOrgasm),
              source: e.source as BattleEventSource, sourceName: typeof e.sourceName === 'string' ? e.sourceName : '',
              sourceId: typeof e.sourceId === 'string' ? e.sourceId : undefined }]; }) },
        enemies, deck: { drawPile, hand, discardPile, nextUid },
        shownTutorialTips: arr(s.shownTutorialTips).filter(v => typeof v === 'string') as string[],
        turnEpEffects: { shared: arr(effects.shared).filter(v => validIndex(v) || bad(false)) as number[],
          sensitivity: arr(effects.sensitivity).flatMap(v => Array.isArray(v) && validIndex(v[0]) && EP_DAMAGE_PARTS.includes(v[1])
            ? [[v[0], v[1]] as [number, EpDamagePart]] : bad([])) },
      };
      if (s.statusRuntime !== undefined) result.statusRuntime = {
        turn, orgasmHistory: result.orgasmHistory, counted: statusMap(rt.counted),
        expiries: [result.player, ...enemies].map((owner, i) => {
          const entries = Array.isArray(rt.expiries) ? rt.expiries[i] : undefined;
          return entries === undefined ? bad(owner.statuses.filter(([id]) => STATUS_DESCRIPTIONS[id]?.durationTurns).map(([id, n]) => [id, turn + n])) : statusMap(entries);
        }),
      }; else bad(undefined);
      sceneState = result;
    }
  } else if (scene === 'reward') {
    const cardIds = ids(s.cardIds, CARD_DEFINITIONS), relicIds = ids(s.relicIds, RELIC_DEFINITIONS);
    sceneState = { cardIds, relicIds, selectedCardId: cardIds.includes(String(s.selectedCardId)) ? s.selectedCardId : undefined,
      selectedRelicId: relicIds.includes(String(s.selectedRelicId)) ? s.selectedRelicId : undefined,
      portraitId: typeof s.portraitId === 'string' ? s.portraitId : undefined };
  } else if (known(CONVERSATIONS, s.conversationId) && CONVERSATIONS[s.conversationId].length) {
    sceneState = { conversationId: s.conversationId, pageIndex: int(s.pageIndex, 0, 0, CONVERSATIONS[s.conversationId].length - 1),
      eventBattleId: known(EVENT_BATTLES, s.eventBattleId) ? s.eventBattleId : undefined,
      nextAction: s.nextAction === 'newGame' ? 'newGame' : undefined,
      completion: ['battle', 'newGame', 'title', 'extra'].includes(String(s.completion)) ? s.completion : bad('title') };
  } else { scene = bad('battle'); restartedBattle = true; run.playerHp = Math.max(1, run.playerHp); }
  const preview = object(input.preview);
  const save: RunSaveSlot = { slot: Number(input.slot), savedAt: typeof input.savedAt === 'string' ? input.savedAt : bad(''),
    floor: int(input.floor, run.stage, 1), run, scene, sceneState,
    preview: { kind: scene, image: typeof preview.image === 'string' && /^data:image\/(webp|jpeg|png);base64,/.test(preview.image) ? preview.image : undefined,
      hp: num(preview.hp, run.playerHp), ep: num(preview.ep, run.playerEp),
      ...(preview.maxHp === undefined ? {} : { maxHp: num(preview.maxHp, 1, 1) }),
      ...(preview.maxEp === undefined ? {} : { maxEp: num(preview.maxEp, 1, 1) }),
      ...(preview.turn === undefined ? {} : { turn: int(preview.turn) }) } };
  return { save, repaired, restartedBattle };
}
