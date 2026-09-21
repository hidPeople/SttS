import type { LocalizedText } from '../models/localization';
import { text as l } from '../models/localization';

export type TutorialEnemyState = 'inserted' | 'peakAftershocks';
export interface TutorialTipDefinition {
  id: string; // 1戦につき1回。配列の上から優先して表示。
  battleId: string; // normalで通常戦闘全体。イベント戦闘はeventBattles.tsのID（例：tutorial）。
  turn?: number; // 省略時は全ターン。
  delayMs?: number; // そのターンで操作可能になってからのゲーム内時間。Ctrl早送り対象。メニュー・Tips中は数えない。
  enemyState?: TutorialEnemyState; // 生存敵のうち、この状態の敵が初めている操作可能時点。
  text: LocalizedText;
  position: {
    anchor: 'endTurn' | 'card' | 'enemyIntent' | 'screen';
    cardId?: string; // card時に必須。手札内の同IDカードを基準にする。
    x: number; // screen時は画面座標。それ以外は基準位置からの補正px。
    y: number;
  };
  highlightCardId?: string; // 同IDの手札カードをすべて暗転から除外。
  highlightEnemy?: boolean; // 条件に一致した敵のSpriteを暗転から除外。
}

export const TUTORIAL_TIPS: TutorialTipDefinition[] = [
  {
    id: 'endFirstTurn', battleId: 'tutorial', turn: 1, delayMs: 30000,
    text: l('Your status effects seem to prevent you from acting. End the turn.', '状態異常により何もできない様だ。ターン終了しよう。'),
    position: { anchor: 'endTurn', x: 0, y: -12 },
  },
  {
    id: 'useSeduction', battleId: 'tutorial', turn: 3,
    text: l('Select an enemy, then click a card to use it. Give {player} your instructions.', 'カードは、敵を選択した後クリックで使用できるぞ。{player}ちゃんに指示を与えよう。'),
    position: { anchor: 'card', cardId: 'seduction', x: 12, y: -12 },
    highlightCardId: 'seduction',
  },
  {
    id: 'pullout', battleId: 'tutorial', enemyState: 'inserted',
    text: l('While inserted, you can pull out if you withstand the EP damage. For now, it seems better to leave things as they are.', '挿入時はEPダメージに耐えれば引き抜くこともできるぞ。今回は使わずこのまま動いてもらえば良さそう。'),
    position: { anchor: 'card', cardId: 'pullout', x: 12, y: -12 },
    highlightCardId: 'pullout',
  },
  {
    id: 'enemyAftershocks', battleId: 'tutorial', enemyState: 'peakAftershocks',
    text: l('An enemy cannot act for one turn after Peak. Seduction can make them act anyway.', '敵をPeakさせると、1ターンの間行動できなくなる。誘惑することで、強制的に行動させることもできるぞ。'),
    position: { anchor: 'enemyIntent', x: 0, y: -12 },
    highlightCardId: 'seduction', highlightEnemy: true,
  },
];
