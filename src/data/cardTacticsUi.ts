import { text as l } from '../models/localization';

export const CARD_TACTICS_UI = {
  returnFromDiscard: { x: 1230, y: 625, duration: 440, stagger: 65, arc: 85, angle: 12 }, // 捨て札からの回収。座標px・時間ms。
  depth: 5000, shadeAlpha: 0.58, revealDuration: 260, revealStagger: 45,
  transformOutDuration: 180, transformInDuration: 240,
  inspectScale: 1.05, slotScale: 0.64,
  inspectGroupGap: 100, // 手札取得枠と捨て札枠の追加間隔px。
  takeColor: 0x63b8ff, discardColor: 0xff7e86,
  selectedColor: 0xffd249, selectedAlpha: 1, // 手札除外選択中の常時点灯。
  confirm: l('Confirm', '確定'),
  inspect: l('Take cards first, then choose any cards to discard. Click again to undo.\nUnselected cards remain on top of the draw pile.', '手札に加えるカード、捨て札へ送るカードの順に選択。再クリックで取り消し。\n選ばなかったカードは山札の上に残ります。'),
  take: l('To hand', '手札に加えるカード'), discard: l('To discard', '捨て札に送るカード'),
  retain: l('Select a non-temporary card to keep. Confirm without selecting to skip.', '捨てずに残すカードを選択（一時カード以外）。未選択のまま確定でスキップ。'),
  exhaust: l('Select cards to remove for this battle.', '手札からこの戦闘中除外するカードを選択'),
  choose: l('Choose one effect', '効果を1つ選択'),
  growthNext: l('Next effect if not chosen:', '選ばなかった場合の次回効果：'),
  growthFixed: l('Growth complete', '成長完了'),
};
