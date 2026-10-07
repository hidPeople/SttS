export interface PortraitTouchConfig {
  radius: number;
  bodyShake: {
    first: { distance: number; duration: number; repeat: number };
    second: { distance: number; duration: number; repeat: number };
  };
  headSink: { distance: number; duration: number };
  sigilIntensity: { scaleStep: number; alphaStep: number; maximum: number };
}

/** Shared portrait-touch hit radius and presentation values. Distances are screen pixels. */
export const PORTRAIT_TOUCH: PortraitTouchConfig = {
  radius: 34,
  bodyShake: {
    first: { distance: 5, duration: 42, repeat: 1 },
    second: { distance: 7, duration: 45, repeat: 2 },
  },
  headSink: { distance: 5, duration: 110 },
  sigilIntensity: { scaleStep: 0.22, alphaStep: 0.1, maximum: 3 },
};
