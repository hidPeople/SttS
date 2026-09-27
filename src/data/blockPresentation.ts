/** ブロック演出。時間はms。Sceneの時計・Tweenを使うためCtrl早送りにも追従する。 */
export const BLOCK_PRESENTATION = {
  gainDuration: 620, // 付与時の金属化と2回の反射の合計。
  guardDuration: 320, // 完全防御時の1回の反射。
  guardShieldDuration: 700, // 完全防御時の盾・衝撃リング・火花が消えるまでの時間。
  breakLeadDuration: 50, // 盾に亀裂が入ってからHPダメージ演出へ移るまで。
  fragmentDuration: 1000, // 破片が散って消える時間。ダメージ演出と並行。
  gainSilver: 0.72, // 元画像を銀色に寄せる強さ（0～1）。
  guardSilver: 0.42,
  reflectionStrength: 0.8, // 反射光の強さ（0～1）。
  reflectionWidth: 0.065, // 表示範囲に対する反射帯の幅。
  reflectionSlant: 0.65, // 反射帯の傾き。
  shieldSize: 150, // 盾の半幅px。立ち絵の配置・大きさに依存しない。
  shieldFill: 0x7794ae,
  shieldEdge: 0xdbefff,
  highlight: 0xffffff,
  shieldFillAlpha: 0.6,
  edgeWidth: 2,
  riseCount: 6, // 付与時の細い上昇光の本数。
  riseDistance: 94,
  depth: 1500,
};
