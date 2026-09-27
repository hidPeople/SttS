import { CONVERSATION_TRANSITIONS as STYLE, type ConversationBackgroundTransition } from '../data/conversationTransitions';

export function backgroundTransitionSettings(config: ConversationBackgroundTransition) {
  return {
    type: config.type,
    duration: Math.max(0, config.duration ?? STYLE.durations[config.type]),
    showText: config.showText ?? STYLE.showText,
    originX: Math.max(0, Math.min(1, config.originX ?? STYLE.originX)),
    originY: Math.max(0, Math.min(1, config.originY ?? STYLE.originY)),
    feather: Math.max(0, Math.min(0.9, config.feather ?? STYLE.feather)),
  };
}

export function backgroundTransitionFrame(type: ConversationBackgroundTransition['type'], progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  if (type === 'flash') {
    const frames = STYLE.flashFrames;
    const next = frames.findIndex(frame => frame.at >= p);
    if (next <= 0) return { alpha: frames[next === 0 ? 0 : frames.length - 1].alpha, swapped: p >= STYLE.flashSwitchAt };
    const a = frames[next - 1], b = frames[next];
    const t = (p - a.at) / Math.max(0.0001, b.at - a.at);
    return { alpha: a.alpha + (b.alpha - a.alpha) * t, swapped: p >= STYLE.flashSwitchAt };
  }
  return { alpha: Math.sin(Math.PI / 2 * Math.min(1, Math.min(p, 1 - p) / 0.45)), swapped: p >= 0.5 };
}

/** Fully cover every corner, including the transparent feather at the circle's edge. */
export function backgroundRevealRadius(width: number, height: number, x: number, y: number, feather: number): number {
  return Math.hypot(Math.max(x, 1 - x) * width, Math.max(y, 1 - y) * height) / (1 - feather);
}
