import { text as l, type LocalizedText } from '../models/localization';

export type ConversationDesign = 'graphite' | 'paper' | 'night';
export interface ConversationTheme {
  name: LocalizedText;
  surface: number;
  accent: number;
  progressColor: number; // オート経過バーの色。
  ink: { quote: string; narration: string; user: string };
  outline: string;
}
/** 正式採用の3デザイン。色・管理用名称はここで変更。形状はconversationSurface.ts。 */
export const CONVERSATION_THEMES: Record<ConversationDesign, ConversationTheme> = {
  graphite: { name: l('A · Graphite', 'A・墨の筆跡'), surface: 0x202938, accent: 0xcba97c, progressColor: 0xe3bc8a,
    ink: { quote: '#ffe2ec', narration: '#f2eee7', user: '#dcecff' }, outline: '#131b28' },
  paper: { name: l('B · Paper', 'B・画用紙'), surface: 0xf2e8d5, accent: 0x805350, progressColor: 0x344459,
    ink: { quote: '#653448', narration: '#302c2b', user: '#244666' }, outline: '#fff8eb' },
  night: { name: l('C · Nocturne', 'C・夜の余白'), surface: 0x141b29, accent: 0xb2a3d3, progressColor: 0xe3bc8a,
    ink: { quote: '#f5dce9', narration: '#ececf1', user: '#cfe3fa' }, outline: '#101623' },
};
export const CONVERSATION_APPEARANCE: {
  design: ConversationDesign; backgroundOpacity: number; showDesignSelector: boolean;
} = {
  design: 'graphite',
  backgroundOpacity: 0.92, // 0=背景のみ完全透明、1=不透明。本文は常に表示。
  showDesignSelector: true, // A/B/Cデザイン選択ボタン。falseで非表示にできる。
};
export const NOVEL_AUTO = {
  baseMs: 3000,
  perCharacterMs: 30, // 重み付き1文字あたりの追加待ち時間。
  latinWeight: 1,
  japaneseWeight: 2,
};
