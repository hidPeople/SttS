import { text as l } from '../models/localization';

export const CARD_TACTICS_UI = {
  depth: 5000, shadeAlpha: 0.58, revealDuration: 260, revealStagger: 45,
  transformOutDuration: 180, transformInDuration: 240,
  inspectScale: 1.05, slotScale: 0.64,
  confirm: l('Confirm', '確定'),
  inspect: l('Take cards first, then choose any cards to discard. Click again to undo.', '手札に加えるカード、捨て札へ送るカードの順に選択。再クリックで取り消し。'),
  take: l('To hand', '手札に加えるカード'), discard: l('To discard', '捨て札に送るカード'),
  exhaust: l('Select cards to remove for this battle.', '手札からこの戦闘中除外するカードを選択'),
  choose: l('Choose one effect', '効果を1つ選択'),
  growthNext: l('If not chosen, next time:', '選ばなかった場合の次回：'),
  growthFixed: l('Growth complete', '成長完了'),
};
