import type { EnemyTrait } from '../models/types';

export interface PortraitOverlayRule {
  material: string; // image/overlay/<material>_<連番>.png
  trigger: 'enemyHit' | 'enemyOrgasm';
  enemyIds?: string[];
  trait?: EnemyTrait;
  heightRatio: number; // 立ち絵表示高に対する付着画像の高さ。
  fade: 'topDown' | 'centerOut';
  unconnectedMOffsetRatio?: number; // 攻撃部位も接続もないenemyOrgasm時、Mから左右にずらす距離（立ち絵表示高比）。省略で付着なし。
}

export const PORTRAIT_OVERLAY_RULES: PortraitOverlayRule[] = [
  { material: 'slime_blue', trigger: 'enemyHit', enemyIds: ['slime', 'slimeColony'], heightRatio: 0.17, fade: 'topDown' },
  { material: 'slime_pink', trigger: 'enemyHit', enemyIds: ['aphrodisiacSlime'], heightRatio: 0.17, fade: 'topDown' },
  { material: 'milk', trigger: 'enemyOrgasm', trait: 'male', heightRatio: 0.13, fade: 'topDown', unconnectedMOffsetRatio: 0.015 },
];

export const PORTRAIT_OVERLAY_STYLE = {
  turns: 5, maxMarks: 24, fadeMs: 350, opacity: 0.86,
  partScale: { M: 0.5, B: 1, C: 1, V: 1, A: 1 }, // 素材別の高さに掛ける部位倍率。縦横比は維持。
  spreadRatio: 0.0125, // M以外の部位中心からの最大ずれ（立ち絵表示高比）。
  anchorY: 0.2, // M・A・V・Cに重ねる素材内の高さ。上端0～下端1。
  bAnchorY: 0.36, // B1・B2の間に重ねる素材内の高さ。
};

export interface EpHeartEffectConfig {
  imageSources: string[]; // 1粒ごとにランダム選択する静止画像URL。
  size: number; // 表示幅px。
  singlePartMaxCount: number; // 1部位から一度に出すハートの上限個数。0以上の整数。敵へのEP攻撃にも適用。
  multiPartMaxCount: number; // 2部位以上から同時に出す場合の各部位の上限個数。0以上の整数。
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
  singlePartMaxCount: 20,
  multiPartMaxCount: 10,
  burstRadius: 120, // 放射状に広がる最大距離px。
  fanAngle: 140,
  curveHeight: 60,
  burstEnd: 0.44, // 移動時間に対する放射フェーズ終了位置（0～1）。
  burstEndVariation: 0.06,
  travelDuration: 620,
  depth: 1450,
};

/** 絶頂時の立ち絵上の淫紋。待機を追加せず再発動時は演出を更新します。 */
export const PORTRAIT_SIGIL_EFFECT = {
  requiredRelic: 'contractSigil',
  source: new URL('../../image/ui/Sigil.png', import.meta.url).href,
  widthRatio: 0.25, // 立ち絵の横幅に対する淫紋の横幅。
  duration: 1000, // ms。Ctrl早送りに追従。
  expansion: 1.25,
  alpha: 0.85,
};
