import type { LocalizedText } from '../models/localization';
import { text as l } from '../models/localization';

export type TutorialEnemyState = 'inserted' | 'peakAftershocks';
export interface TutorialTipPage {
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

export interface TutorialTipDefinition {
  id: string; // 1戦につき1回。配列の上から優先して表示。
  battleId: string; // normalで通常戦闘全体。イベント戦闘はeventBattles.tsのID（例：tutorial）。
  turn?: number; // 省略時は全ターン。
  delayMs?: number; // そのターンで操作可能になってからのゲーム内時間。Ctrl早送り対象。メニュー・Tips中は数えない。
  enemyState?: TutorialEnemyState; // 生存敵のうち、この状態の敵が初めている操作可能時点。
  pages: TutorialTipPage[]; // 1ページ以上。文章・位置・強調をページごとに設定。
}

export const TUTORIAL_TIPS: TutorialTipDefinition[] = [
  {
    id: 'endFirstTurn', battleId: 'tutorial', turn: 1, delayMs: 20000,
    pages: [{
      text: l(
        'Your status effects seem to prevent you from acting. End the turn.',
        '状態異常により何もできない様だ。ターン終了しよう。'),
      position: { anchor: 'endTurn', x: 0, y: -12 },
    }],
  },
  {
    id: 'useSeduction', battleId: 'tutorial', turn: 3,
    pages: [{
      text: l(
        'Select an enemy, then click a card to use it. Give {player} your instructions.',
        'カードは、敵を選択した後クリックで使用できるぞ。{player}ちゃんに指示を与えよう。'),
      position: { anchor: 'card', cardId: 'seduction', x: 12, y: -12 },
      highlightCardId: 'seduction',
    }],
  },
  {
    id: 'pullout', battleId: 'tutorial', enemyState: 'inserted',
    pages: [
      {
        text: l(
          'While inserted, you can pull out if you withstand the EP damage. ',
          '挿入時はEPダメージに耐えれば引き抜くこともできるぞ。'
        ),
        position: { anchor: 'card', cardId: 'pullout', x: 12, y: -12 },
        highlightCardId: 'pullout',
      },
      {
        text: l(
          'As I want to milk him this time, it seems better to leave things as they are.',
          '今回は搾精したいので、カードは使わずこのまま動いてもらえば良さそうだ。'
        ),
        position: { anchor: 'card', cardId: 'pullout', x: 12, y: -12 },
        highlightCardId: 'pullout',
      }
    ],
  },
  {
    id: 'enemyAftershocks', battleId: 'tutorial', enemyState: 'peakAftershocks',
    pages: [{
      text: l(
        'An enemy cannot act for one turn after Peak. Seduction can make them act anyway.',
        '敵をPeakさせると、1ターンの間行動できなくなる。誘惑することで、強制的に行動させることもできるぞ。'
      ),
      position: { anchor: 'enemyIntent', x: 0, y: -12 },
      highlightCardId: 'seduction', highlightEnemy: true,
    }],
  },
  {
    id: 'firstFaint', battleId: 'tutorial',
    pages: [
      {
        text: l(
          'You have been causing Peak on purpose, haven’t you? Once the per-turn Peak limit is exceeded, you can allow {player} to faint.',
          'さてはわざとPeakさせまくってるな？ 1ターンのPeak回数限界を超えた時、失神を許可できるぞ。'
        ),
        position: { anchor: 'card', cardId: 'faint', x: 12, y: -12 },
        highlightCardId: 'faint',
      },
      {
        text: l(
          'Fainting resets the EP gauge and restores the body after it has become prone to Peak. However, {player} will be defenseless against enemies while unconscious, so be careful!',
          '失神するとEPゲージをリセットし、Peakしやすくなった体を元に戻せるぞ。ただし失神中は敵に対して無防備になってしまうので注意だ！'
        ),
        position: { anchor: 'card', cardId: 'faint', x: 12, y: -12 },
        highlightCardId: 'faint',
      },
      {
        text: l(
          'By the way, a mysterious power prevents {player} from losing consciousness without permission. Poor thing…',
          'ちなみに{player}ちゃんは謎の力で勝手に気を失うことは出来ない。可哀想だね…'
        ),
        position: { anchor: 'card', cardId: 'faint', x: 12, y: -12 },
        highlightCardId: 'faint',
      },
    ],
  },
];
