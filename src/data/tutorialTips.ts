import type { LocalizedText } from '../models/localization';
import { text as l } from '../models/localization';

export type TutorialTipEvent = 'enemyPeakDrain'; // 敵PeakによるHPドレインの演出完了後。
export type TutorialEnemyState = 'inserted' | 'peakAftershocks';
export interface TutorialTipPage {
  text: LocalizedText;
  position: {
    anchor: 'endTurn' | 'card' | 'enemyIntent' | 'enemy' | 'screen';
    cardId?: string; // card時に必須。手札内の同IDカードを基準にする。
    x: number; // screen時は画面座標。それ以外は基準位置からの補正px。
    y: number;
  };
  highlightCardId?: string; // 同IDの手札カードをすべて暗転から除外。
  highlightPlayerBars?: ('hp' | 'ep')[]; // プレイヤーの指定バーを数値・下限・ブロック表示ごと強調。
  highlightEnemyBars?: ('hp' | 'ep')[]; // 条件またはイベント対象の敵の指定バーを強調。
  highlightEnemy?: boolean; // 条件に一致した敵のSpriteを暗転から除外。
}

export interface TutorialTipDefinition {
  id: string; // 1戦につき1回。配列の上から優先して表示。
  battleId: string; // normalで通常戦闘全体。イベント戦闘はeventBattles.tsのID（例：tutorial）。
  turn?: number; // 省略時は全ターン。
  delayMs?: number; // そのターンで操作可能になってからのゲーム内時間。Ctrl早送り対象。メニュー・Tips中は数えない。
  event?: TutorialTipEvent; // 指定イベントの完了時に表示。通常の操作可能待ちは行わない。
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
        'Select an enemy, then click a card to use it. \nGive {player} your instructions.',
        'カードは、敵を選択した後クリックで使用できるぞ。\n{player}ちゃんに指示を与えよう。'),
      position: { anchor: 'card', cardId: 'seduction', x: 5, y: -5 },
      highlightCardId: 'seduction',
    }],
  },
  {
    id: 'pullout', battleId: 'tutorial', enemyState: 'inserted',
    pages: [
      {
        text: l(
          'While inserted, \nyou can pull out if you withstand the EP damage. ',
          '挿入時はEPダメージに耐えれば\n引き抜くこともできるぞ。'
        ),
        position: { anchor: 'card', cardId: 'pullout', x: 5, y: -5 },
        highlightCardId: 'pullout',
      },
      {
        text: l(
          'As I want to milk him this time, \nit seems better to leave things as they are.',
          '今回は搾精したいので、このカードは使わず\nこのまま動いてもらえば良さそうだ。'
        ),
        position: { anchor: 'card', cardId: 'pullout', x: 5, y: -5 },
        highlightCardId: 'pullout',
      },
      {
        text: l(
          'You can tempt the enemy currently inside you to make their movements more intense, \nor even tempt other enemies as well.',
          '挿入中の敵を誘惑して動きを激しくしたり、\n更に他の敵を誘惑する事も出来るぞ。'
        ),
        position: { anchor: 'card', cardId: 'seduction', x: 5, y: -5 },
        highlightCardId: 'seduction',
      }
    ],
  },
  {
    id: 'enemyAftershocks', battleId: 'tutorial', enemyState: 'peakAftershocks',
    pages: [{
      text: l(
        'An enemy cannot act for one turn after Peak. \nSeduction can make them act anyway.',
        '敵をPeakさせると、1ターンの間行動不能にできる。\n誘惑することで、強制的に行動させることもできるぞ。'
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
        position: { anchor: 'card', cardId: 'faint', x: 5, y: -5 },
        highlightCardId: 'faint',
      },
      {
        text: l(
          'Fainting resets the EP gauge and restores the body after it has become prone to Peak. However, {player} will be defenseless against enemies while unconscious, so be careful!',
          '失神するとEPゲージをリセットし、Peakしやすくなった体を元に戻せるぞ。ただし失神中は敵に対して無防備になってしまうので注意だ！'
        ),
        position: { anchor: 'card', cardId: 'faint', x: 5, y: -5 },
        highlightCardId: 'faint',
      },
      {
        text: l(
          'By the way, a mysterious power prevents {player} from losing consciousness without permission. Poor thing…',
          'ちなみに{player}ちゃんは謎の力で勝手に気を失うことは出来ない。可哀想だね…'
        ),
        position: { anchor: 'card', cardId: 'faint', x: 5, y: -5 },
        highlightCardId: 'faint',
      },
    ],
  },
  {
    id: 'firstEnemyPeakDrain', battleId: 'tutorial', event: 'enemyPeakDrain',
    pages: [{
      text: l(
        'When a succubus makes an enemy reach Peak, she can drain HP equal to that enemy’s maximum EP.',
        'サキュバスが敵をPeakさせると、敵のEPゲージの最大値分だけHPを吸収できるぞ。'),
      position: { anchor: 'enemy', x: 0, y: -12 },
      highlightEnemy: true,
      highlightPlayerBars: ['hp'],
      highlightEnemyBars: ['hp', 'ep'],
    }],
  },
];
