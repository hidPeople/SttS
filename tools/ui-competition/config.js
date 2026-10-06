/** Comparison-only presentation settings. Durations are ms; values are ratios. */
export const CONFIG = {
  canvas: { width: 600, height: 282, pixelRatioLimit: 2, fps: 30 },
  initial: { hp: 0.72, ep: 0.78, floor: 0.32, block: 24 },
  durations: { damage: 1100, heal: 1000, charge: 1300, playerReset: 1800, enemyReset: 1900 },
  damagePreview: { amount: 16, absorbEnd: .26, breakDuration: .2, hpDuration: .3, trailDelay: .16, trailDuration: .36 }, // 時間は単独見本全体に対する比率。
  enemyPulses: [{ start: 0.13, end: 0.35, remaining: 0.48 }, { start: 0.59, end: 0.88, remaining: 0 }],
  enemyEjection: { streamCount: 12, streamWidth: 4, dropletCount: 36, dropletRadius: 2, reach: 60, spread: 23 },
  playerDrain: {
    fallDistance: 65, // px。溜まった雫がちぎれた後に落ちる距離。
    outletCount: 4, // 下限で範囲が狭くなっても本数を保ち、密度を上げる。
    rightBias: 2.5, // 1で均等、1より大きいほど右側に集中。
    delay: [0, .28], cycle: [.58, .91], // 再生開始からの遅延・周期の抽選範囲（演出時間比）。
    radius: [3.2, 4.7], drift: [-1.8, 1.8], // 雫半径と横ずれの抽選範囲（px）。
  },
};

export const DESIGNS = [
  { id: 'A', name: '墨のフレーム', en: 'Graphite frame', kind: 'graphite', tag: 'FRAME / クレヨンの延長',
    description: '描き込んだ墨の縁に、色を閉じ込める。現行のクレヨンUIに寄せた、控えめな更新。',
    floor: '濃い紫の領域＋白い切れ目。枠の下に下限値を添える。', liquid: false },
  { id: 'B', name: '硝子のリザーバー', en: 'Glass reservoir', kind: 'glass', tag: 'LIQUID 01 / 透明な器',
    description: '細い金具で留めた硝子管。揺れる液面、小さな気泡、下に抜ける滴で蓄積と解放を表現。',
    floor: '沈んだ紫の液層を残す。白い目盛りがリセット後の境界。', liquid: true },
  { id: 'C', name: '流体リボン', en: 'Fluid ribbon', kind: 'ribbon', tag: 'LIQUID 02 / 枠のない流れ',
    description: '硬い外枠を使わず、厚みのある色の帯そのものをゲージに。排出時は細い流れが下へほどける。',
    floor: '細い下側レールと境界マーカー。濃色の帯が必ず残る範囲を示す。', liquid: true },
  { id: 'D', name: '鍛銀のステータス', en: 'Forged silver', kind: 'classic', tag: 'CLASSIC / 王道の読みやすさ',
    description: '面取りした銀のフレームと明確な目盛り。HPの減少残像と数値をはっきり読ませる。',
    floor: '斜線の予約領域と明るい縦線。色に頼らず境界を読み取れる。', liquid: false },
  { id: 'E', name: '錬金セル', en: 'Alchemical cells', kind: 'cells', tag: 'LIQUID 03 / 小さな液室',
    description: '連なった液室を左から満たす。量が少ない時も輪郭を保ち、排出は小さな滴の束になる。',
    floor: 'セルの上にも通る連続した境界線。端数の下限も正確に表示。', liquid: true },
];
