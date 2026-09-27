/** 切り替え先の会話ページに指定。時間はms、位置は画面左上からの0〜1比率。 */
export interface ConversationBackgroundTransition {
  type: 'radial' | 'flash' | 'pageTurn' | 'fade' | 'blink'; // 円形ぼかし／連続白フラッシュ／横ページめくり／黒暗転／まばたき。
  duration?: number; // 演出全体の時間。0なら即時切り替え。
  showText?: boolean; // 切り替え中も次ページのテキストを表示する。省略時true。
  originX?: number; // radialの中心X。0=左端、1=右端。
  originY?: number; // radialの中心Y。0=上端、1=下端。
  feather?: number; // radialの円半径に対するぼかし幅（0〜0.9）。
}

export const CONVERSATION_TRANSITIONS = {
  durations: { radial: 1800, flash: 1800, pageTurn: 700, fade: 650, blink: 800 },
  showText: true,
  originX: 0.5,
  originY: 0.5,
  feather: 0.16,
  maskResolution: 512, // 円形ぼかしの一時テクスチャ解像度。画像本体の解像度は変えない。
  pageFoldWidth: 38, // めくる端の影の幅px。
  pageFoldAlpha: 0.28,
  flashSwitchAt: 0.7, // 長い白フラッシュの頂点で画像を交換。
  flashFrames: [ // 全体時間に対する位置と白さ。短い2回→一拍→長い1回。
    { at: 0, alpha: 0 }, { at: 0.04, alpha: 1 }, { at: 0.12, alpha: 0 },
    { at: 0.18, alpha: 1 }, { at: 0.26, alpha: 0 }, { at: 0.44, alpha: 0 },
    { at: 0.66, alpha: 1 }, { at: 0.76, alpha: 1 }, { at: 1, alpha: 0 },
  ],
};
