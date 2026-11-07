/** BGMのIDは bgm/直下の拡張子を除いたファイル名。秒はデコード後の音声先頭基準。 */
export interface BgmTrack {
  loopStart: number; // 2周目以降の開始秒。初回は必ず0秒から再生。
  loopEnd?: number; // 省略時は音声末尾。loopStartより後の秒数。
}

// 未登録の音源も自動検出され、曲全体をループする。
export const BGM_TRACKS: Record<string, BgmTrack> = {
  'Unresolved': { loopStart: 20.980875 }, // ループ(範囲)　イメージ・用途：暗い、おごそか、バッド、タイトル　曲評価：★★
  '混濁の囁き': { loopStart: 15.7174375 }, // ループ(範囲)　イメージ・用途：悲しみ、飄々、疲れ、プロローグ戦闘　曲評価：★★
  'Wandering Melody1': { loopStart: 0 }, // ループ(全体)　イメージ・用途：非日常感、軽快、爽快感、通常戦闘　曲評価：★★★
  'Wandering Melody2': { loopStart: 15.45725 }, // ループ(範囲)　イメージ・用途：さわやか、覚悟、寂しさ、通常戦闘　曲評価：★★
  '夢中の小悪魔': { loopStart: 15.45725 }, // ループ(範囲)　イメージ・用途：不思議、怪しさ、決意、集中、ちょいつよ戦闘　曲評価：★★★
  'Hollow Motif': { loopStart: 15.03475 }, // ループ(範囲)　イメージ・用途：戻れない、覚悟、孤高、信頼、つよ戦闘　曲評価：★★★★
  'Wobbly Woodpecker1': { loopStart: 8.594229167 }, // ループ(範囲)　イメージ・用途：子気味良い、余裕、徐々に盛り上がり、驚き、ちょいつよ戦闘　曲評価：★★★
  'Wobbly Woodpecker2': { loopStart: 0 }, // ループ(全体)　イメージ・用途：本気、覚悟、息をのむ展開、苦戦、驚き、ボス戦闘　曲評価：★★★★
  'Wobbly Waltz': { loopStart: 18.3710625 }, // ループ(範囲)　イメージ・用途：日常、日向ぼっこ、元気、散歩、スキップ、会話、道中　曲評価：★★
  'Waltz of the Hollow Synth': { loopStart: 7.601541667 }, // ループ(範囲)　イメージ・用途：明るい、楽しい、ふわふわ、雲の上、軽快、道中、会話　曲評価：★★★
  'Drowsy Deck Draft': { loopStart: 19.3304375 }, // ループ(範囲)　イメージ・用途：のどか、幸せ、カフェ、チルタイム、優しさ、会話　曲評価：★
  '夢中の囁き': { loopStart: 0 }, // ループ(全体)　イメージ・用途：感動、愛、優しさ、会話、ED？　曲評価：★★
  'Nocturnal Elegance': { loopStart: 16.256041667 }, // ループ(範囲)　イメージ・用途：悲しみ、切なさ、高貴、会話、エロ、バッド　曲評価：★
  'Hollow Elegance': { loopStart: 17.615520833 }, // ループ(範囲)　イメージ・用途：美しさ、自尊心、オーセンティック、道中、エロ　曲評価：★★★
  'Breathtakingly Bittersweet1': { loopStart: 0 }, // ループ(全体)　イメージ・用途：官能的、繰り返し、悲嘆、快感、しつこさ、エロ　曲評価：★★
  'Breathtakingly Bittersweet2': { loopStart: 0 }, // ループ(全体)　イメージ・用途：官能的、軽快、優しさ、落ち着き、エロ　曲評価：★
  'Unresolved Descent': { loopStart: 15.614958333 }, // ループ(範囲)　イメージ・用途：暗い、憂鬱、取り返しのつかない、悲しみ、エロ　曲評価：★★
  'Velvet Labyrinth': { loopStart: 0 }, // ループ(全体)　イメージ・用途：落ち着き、切なさ、迷い、退廃的、エロ　曲評価：★
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
