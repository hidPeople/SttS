export interface EpHeartEffectConfig {
  imageSources: string[]; // 1粒ごとにランダム選択する静止画像URL。
  size: number; // 表示幅px。
  burstRadius: number; // 放射距離px。
  fanAngle: number; // 真上を中心とした扇の開き角度（度）。0～180。
  curveHeight: number; // 吸収軌道の膨らみpx。0以上。
  burstEndVariation: number; // 粒ごとの放射終了時点のばらつき。0以上、burstEnd未満。
  burstEnd: number; // 放射終了時点。移動時間に対する割合（0より大きく0.8以下）。
  travelDuration: number; // 移動時間ms。EP表示全体をこの時間だけ遅らせ、ダメージ間隔は変えない。
  depth: number; // 描画順。
}
/** EP吸収用の静止素材。状態付与用のloveスプライトとは別の画像。 */
export const EP_HEART_EFFECT: EpHeartEffectConfig = {
  imageSources: [
    new URL('../../image/ui/heart1.png', import.meta.url).href,
    new URL('../../image/ui/heart2.png', import.meta.url).href,
    new URL('../../image/ui/heart3.png', import.meta.url).href,
    new URL('../../image/ui/heart4.png', import.meta.url).href,
    new URL('../../image/ui/heart5.png', import.meta.url).href,
    new URL('../../image/ui/heart6.png', import.meta.url).href,
  ],
  size: 38, // 画像の表示幅px。高さは縦横比を維持。
  burstRadius: 120, // 放射状に広がる最大距離px。
  fanAngle: 140,
  curveHeight: 60,
  burstEnd: 0.44, // 移動時間に対する放射フェーズ終了位置（0～1）。
  burstEndVariation: 0.06,
  travelDuration: 620,
  depth: 1450,
};

/** 絶頂時の立ち絵上の紋章。待機を追加せず再発動時は演出を更新します。 */
export const PORTRAIT_SIGIL_EFFECT = {
  requiredRelic: 'contractSigil',
  source: new URL('../../image/ui/Sigil.png', import.meta.url).href,
  widthRatio: 0.25, // 立ち絵の横幅に対する紋章の横幅。
  duration: 480, // ms。Ctrl早送りに追従。
  expansion: 1.25,
  alpha: 0.85,
};
