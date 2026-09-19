import { text as l, type LocalizedText } from '../models/localization';

export interface ConversationPage {
  text: LocalizedText;
  speaker: 'quote' | 'narration' | 'user';
  portrait?: string; // image/character内のファイル名（自動検出）、または登録ID。空欄は既存の立ち絵を制御しない。
  background?: string; // image内の相対ファイル名。空欄は表示なし。
}

export const CONVERSATIONS: Record<string, ConversationPage[]> = {
  tutorialTurn3: [
    { speaker: 'quote', text: l('Tutorial dialogue 1 (placeholder).', 'チュートリアル会話1（仮テキスト）。'), portrait: '', background: '' },
    { speaker: 'user', text: l('Tutorial dialogue 2 (placeholder).', 'チュートリアル会話2（仮テキスト）。'), portrait: '', background: '' },
    { speaker: 'quote', text: l('Tutorial dialogue 3 (placeholder).', 'チュートリアル会話3（仮テキスト）。'), portrait: '', background: '' },
    { speaker: 'user', text: l('Tutorial dialogue 4 (placeholder).', 'チュートリアル会話4（仮テキスト）。'), portrait: '', background: '' },
  ],
  defeatDefault: [
    { speaker: 'quote', text: l('Placeholder text 1', '仮テキスト1'), portrait: 'Succubus_normal_idle_1.png', background: '' },
    { speaker: 'quote', text: l('Placeholder text 2', '仮テキスト2'), portrait: 'Succubus_normal_idle_1.png', background: '' },
    { speaker: 'quote', text: l('Placeholder text 3', '仮テキスト3'), portrait: 'Succubus_normal_idle_1.png', background: '' },
    { speaker: 'quote', text: l('Placeholder text 4', '仮テキスト4'), portrait: 'Succubus_normal_idle_1.png', background: '' },
    { speaker: 'quote', text: l('Placeholder text 5', '仮テキスト5'), portrait: 'Succubus_normal_idle_1.png', background: '' },
    { speaker: 'quote', text: l('Placeholder text 6', '仮テキスト6'), portrait: 'Succubus_normal_idle_1.png', background: '' },
    { speaker: 'quote', text: l('Placeholder text 7', '仮テキスト7'), portrait: 'Succubus_normal_idle_1.png', background: '' },
    { speaker: 'quote', text: l('Placeholder text 8', '仮テキスト8'), portrait: 'Succubus_normal_idle_1.png', background: '' },
    { speaker: 'quote', text: l('Placeholder text 9', '仮テキスト9'), portrait: 'Succubus_normal_idle_1.png', background: '' },
    { speaker: 'quote', text: l('Placeholder text 10', '仮テキスト10'), portrait: 'Succubus_normal_idle_1.png', background: '' },
  ],
};

/** Add cause → dialogue ID entries here as defeat variants are introduced. */
export const DEFEAT_CONVERSATIONS: Record<string, string> = { default: 'defeatDefault' };
export const CONVERSATION_WINDOW = { openDuration: 500, closeDuration: 500 };
