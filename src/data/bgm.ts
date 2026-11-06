/** BGMのIDは bgm/直下の拡張子を除いたファイル名。秒はデコード後の音声先頭基準。 */
export interface BgmTrack {
  loopStart: number; // 2周目以降の開始秒。初回は必ず0秒から再生。
  loopEnd?: number; // 省略時は音声末尾。loopStartより後の秒数。
}

// 未登録の音源も自動検出され、曲全体をループする。
export const BGM_TRACKS: Record<string, BgmTrack> = {
  'Unresolved': { loopStart: 20.980875 }, // ループ(範囲)、暗い、バッド、タイトル　★★
  '混濁の囁き': { loopStart: 15.7174375 }, // ループ(範囲)、プロローグ戦闘？　★★
  'Wandering Melody1': { loopStart: 0 }, // ループ、通常戦闘　★★★
  'Wandering Melody2': { loopStart: 15.45725 }, // ループ(範囲)、通常戦闘　★★
  '夢中の小悪魔': { loopStart: 15.45725 }, // ループ(範囲)、ちょいつよ戦闘　★★★
  'Hollow Motif': { loopStart: 15.03475 }, // ループ(範囲)、つよ戦闘　★★★★
  'Wobbly Woodpecker1': { loopStart: 8.594229167 }, // ループ(範囲)、驚き、ちょいつよ戦闘　★★★
  'Wobbly Woodpecker2': { loopStart: 0 }, // ループ、驚き、ボス戦闘　★★★★
  'Wobbly Waltz': { loopStart: 18.3710625 }, // ループ(範囲)、日常、元気、会話、道中　★★
  'Waltz of the Hollow Synth': { loopStart: 7.601541667 }, // ループ(範囲)、明るい、楽しい、道中、会話　★★★
  'Drowsy Deck Draft': { loopStart: 19.3304375 }, // ループ(範囲)、のどか、優しさ　★
  '夢中の囁き': { loopStart: 0 }, // ループ、会話、優しさ、ED？　★★
  'Nocturnal Elegance': { loopStart: 16.256041667 }, // ループ(範囲)、会話、エロ、バッド　★
  'Hollow Elegance': { loopStart: 17.615520833 }, // ループ(範囲)、道中、エロ　★★★
  'Breathtakingly Bittersweet1': { loopStart: 0 }, // ループ、エロ、しつこい　★★
  'Breathtakingly Bittersweet2': { loopStart: 0 }, // ループ、エロ、落ち着き、軽め　★
  'Unresolved Descent': { loopStart: 15.614958333 }, // ループ(範囲)、暗い、エロ、悲しみ　★★
  'Velvet Labyrinth': { loopStart: 0 }, // ループ、エロ、退廃的、落ち着き　★
};

export interface BgmBindings {
  title: string | null;
  battleDefault: string | null;
  battleThreats: Record<number, string | null>;
  stageBattles: Record<number, Record<number, string | null>>; // ステージ別の脅威度指定。共通設定より優先。
  stageRoutes: Record<number, string | null>; // 道中画面用。未指定時は現在曲を継続。
  eventBattles: Record<string, string | null>;
  conversations: Record<string, string | null>; // 会話開始時の曲。ページのbgm指定が優先。
}

export const BGM_BINDINGS: BgmBindings = {
  title: 'Unresolved',
  battleDefault: 'Wandering Melody1',
  battleThreats: {
    1: 'Wandering Melody1',
    2: '夢中の小悪魔',
    3: 'Hollow Motif',
    4: 'Wobbly Woodpecker1',
    5: 'Wobbly Woodpecker2',
  },
  stageBattles: {},
  stageRoutes: {},
  eventBattles: { prologue: '混濁の囁き' },
  conversations: {
    prologueBeforeBattle: '混濁の囁き',
    prologueAfterBattle: 'Hollow Elegance',
    prologueDefeat1: 'Unresolved Descent',
    prologueDefeat2: 'Nocturnal Elegance',
  },
};

export const AUDIO_SETTINGS = {
  defaultMaster: 7,
  defaultBgm: 5,
  pauseOnBlur: true,
  maxVolume: 9,
  fadeOutSeconds: 0.3,
  retryCount: 3, // 初回とは別の再試行回数。
  retryDelayMs: 500,
  loadTimeoutMs: 20000,
};
