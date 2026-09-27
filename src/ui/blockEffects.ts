import Phaser from 'phaser';
import { BLOCK_PRESENTATION as STYLE } from '../data/blockPresentation';

// An object post-effect keeps the source alpha and its live texture/frame intact.
// Time is supplied by a Scene tween, not the renderer clock (Ctrl/pause stay in sync).
const METAL_SHADER = `
precision mediump float;
uniform sampler2D uMainSampler;
varying vec2 outTexCoord;
uniform vec4 bodyRect;
uniform float progress;
uniform float passes;
uniform float silver;
uniform float strength;
uniform float bandWidth;
uniform float slant;
void main() {
  vec4 source = texture2D(uMainSampler, outTexCoord);
  vec3 original = source.rgb / max(source.a, 0.0001);
  vec2 point = (vec2(outTexCoord.x, 1.0 - outTexCoord.y) - bodyRect.xy) / max(bodyRect.zw, vec2(0.0001));
  float envelope = smoothstep(0.0, 0.10, progress) * (1.0 - smoothstep(0.80, 1.0, progress));
  float luminance = dot(original, vec3(0.299, 0.587, 0.114));
  vec3 steel = vec3(0.79, 0.87, 0.96) * (0.25 + luminance * 0.8);
  float sweep = fract(progress * passes);
  float center = mix(-0.35, 1.35 + slant, sweep);
  float distance = abs(point.x + point.y * slant - center);
  float broad = 1.0 - smoothstep(bandWidth * 0.35, bandWidth * 2.4, distance);
  float fine = 1.0 - smoothstep(0.0, bandWidth * 0.28, abs(point.x + point.y * slant - center + bandWidth * 1.6));
  vec3 color = mix(original, steel, silver * envelope);
  color = mix(color, vec3(1.0), min(1.0, (broad + fine * 0.45) * strength * envelope));
  gl_FragColor = vec4(color * source.a, source.a);
}`;

class BlockMetalPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  progress = 0;
  passes = 2;
  silver = STYLE.gainSilver;

  constructor(game: Phaser.Game) {
    super({ game, name: 'BlockMetal', fragShader: METAL_SHADER, renderTarget: true });
  }

  onDraw(target: Phaser.Renderer.WebGL.RenderTarget): void {
    const body = this.gameObject as Phaser.GameObjects.Sprite;
    const bounds = body.getBounds();
    const camera = body.scene.cameras.main;
    // PostFX render targets are full viewport sized. Clip the travel to the visible portrait.
    const width = this.renderer.width, height = this.renderer.height;
    const left = Phaser.Math.Clamp((bounds.left - camera.scrollX) * camera.zoom + camera.x, 0, width);
    const top = Phaser.Math.Clamp((bounds.top - camera.scrollY) * camera.zoom + camera.y, 0, height);
    const right = Phaser.Math.Clamp((bounds.right - camera.scrollX) * camera.zoom + camera.x, left + 1, width);
    const bottom = Phaser.Math.Clamp((bounds.bottom - camera.scrollY) * camera.zoom + camera.y, top + 1, height);
    this.set4f('bodyRect', left / width, top / height, Math.max(1, right - left) / width, Math.max(1, bottom - top) / height);
    this.set1f('progress', this.progress);
    this.set1f('passes', this.passes);
    this.set1f('silver', this.silver);
    this.set1f('strength', STYLE.reflectionStrength);
    this.set1f('bandWidth', Math.max(0.001, STYLE.reflectionWidth));
    this.set1f('slant', STYLE.reflectionSlant);
    this.bindAndDraw(target);
  }
}

type Body = Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle | undefined;

/** Transient block presentation. Never writes combat values, portrait tint, or input state. */
export class BlockEffects {
  private cleanups = new Set<() => void>();
  private metals = new Map<Phaser.GameObjects.Sprite, () => void>();
  private pipelines = new Map<Phaser.GameObjects.Sprite, { pipeline: BlockMetalPipeline; release: () => void }>();

  constructor(private scene: Phaser.Scene) {
    scene.events.once('shutdown', this.dispose, this);
    const renderer = scene.sys.renderer;
    if ('gl' in renderer) renderer.pipelines.addPostPipeline('BlockMetal', BlockMetalPipeline);
  }

  gain(body: Body, x: number, y: number): void {
    this.metal(body, 2, STYLE.gainDuration, STYLE.gainSilver);
    this.rise(x, y);
  }

  guard(body: Body, x: number, y: number): void {
    this.metal(body, 1, STYLE.guardDuration, STYLE.guardSilver);
    const shield = this.shield(x, y);
    shield.setScale(0.82);
    this.animate(shield, { scale: 1.12, alpha: 0, duration: STYLE.guardDuration, ease: 'Cubic.easeOut' });
    const ring = this.scene.add.ellipse(x, y, STYLE.shieldSize * 1.2, STYLE.shieldSize * 1.6)
      .setStrokeStyle(1, STYLE.shieldEdge, 0.6).setDepth(STYLE.depth);
    this.animate(ring, { scaleX: 1.65, scaleY: 1.15, alpha: 0, duration: STYLE.guardDuration, ease: 'Sine.easeOut' });
    this.sparks(x, y, false);
  }

  break(body: Body, x: number, y: number): Promise<void> {
    if (body instanceof Phaser.GameObjects.Sprite) this.metals.get(body)?.();
    const shield = this.shield(x, y);
    const size = STYLE.shieldSize;
    shield.lineStyle(STYLE.edgeWidth, STYLE.highlight, 1);
    shield.strokePoints(this.points([[0.10,-0.84],[-0.14,-0.32],[0.12,-0.08],[-0.1,0.23],[0.02,0.96]]), false);
    this.animate(shield, { scale: 1.06, duration: STYLE.breakLeadDuration, ease: 'Sine.easeIn' });
    // The awaited lead-in is short; shards continue while the normal hit lands.
    return this.after(STYLE.breakLeadDuration, () => {
      const pieces = [
        [[-0.9,-0.68],[0,-0.88],[-0.14,-0.32],[0.12,-0.08],[-0.7,0.12]],
        [[0,-0.88],[0.9,-0.68],[0.7,0.12],[0.12,-0.08],[-0.14,-0.32]],
        [[-0.9,-0.68],[-0.7,0.12],[0.12,-0.08],[-0.1,0.23],[0.02,0.96],[-0.62,0.46]],
        [[0.9,-0.68],[0.62,0.46],[0.02,0.96],[-0.1,0.23],[0.12,-0.08],[0.7,0.12]],
      ];
      pieces.forEach((points, index) => {
        const piece = this.scene.add.graphics().setPosition(x, y).setDepth(STYLE.depth);
        piece.fillStyle(STYLE.shieldFill, 0.25).fillPoints(this.points(points), true);
        piece.lineStyle(STYLE.edgeWidth, STYLE.shieldEdge, 0.9).strokePoints(this.points(points), true);
        const side = index % 2 ? 1 : -1;
        this.animate(piece, { x: x + side * size * 0.65, y: y + (index < 2 ? -0.35 : 0.55) * size, angle: side * 24, alpha: 0, duration: STYLE.fragmentDuration, ease: 'Cubic.easeOut' });
      });
      this.sparks(x, y, true);
    });
  }

  private metal(body: Body, passes: number, duration: number, silver: number): void {
    if (!(body instanceof Phaser.GameObjects.Sprite) || !body.active || !('gl' in this.scene.sys.renderer)) return;
    this.metals.get(body)?.();
    let cached = this.pipelines.get(body);
    if (!cached) {
      body.setPostPipeline('BlockMetal');
      const pipeline = body.postPipelines[body.postPipelines.length - 1] as BlockMetalPipeline;
      const release = () => {
        this.metals.get(body)?.();
        body.off('destroy', release);
        if (body.postPipelines?.includes(pipeline)) body.removePostPipeline(pipeline);
        this.pipelines.delete(body);
      };
      cached = { pipeline, release };
      this.pipelines.set(body, cached);
      body.once('destroy', release);
    }
    const { pipeline } = cached;
    pipeline.active = true;
    pipeline.progress = 0;
    pipeline.passes = passes;
    pipeline.silver = silver;
    let tween: Phaser.Tweens.Tween | undefined;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      tween?.remove();
      pipeline.active = false;
      this.metals.delete(body);
      this.cleanups.delete(finish);
    };
    this.metals.set(body, finish);
    this.cleanups.add(finish);
    tween = this.scene.tweens.add({ targets: pipeline, progress: 1, duration: Math.max(1, duration), onComplete: finish, onStop: finish });
  }

  private points(values: number[][]): Phaser.Math.Vector2[] {
    return values.map(([x,y]) => new Phaser.Math.Vector2(x * STYLE.shieldSize, y * STYLE.shieldSize));
  }

  private shield(x: number, y: number): Phaser.GameObjects.Graphics {
    const shape = this.scene.add.graphics().setPosition(x, y).setDepth(STYLE.depth);
    const points = [[0,-0.88],[0.9,-0.68],[0.8,0.16],[0.54,0.55],[0,0.96],[-0.54,0.55],[-0.8,0.16],[-0.9,-0.68]];
    shape.fillStyle(STYLE.shieldFill, STYLE.shieldFillAlpha).fillPoints(this.points(points), true);
    shape.lineStyle(STYLE.edgeWidth, STYLE.shieldEdge, 0.95).strokePoints(this.points(points), true);
    shape.lineStyle(1, STYLE.highlight, 0.35).strokePoints(this.points(points.map(([a,b]) => [a * 0.84, b * 0.84])), true);
    shape.lineStyle(1, STYLE.highlight, 0.65).strokePoints(this.points([[-0.38,-0.45],[0,-0.58],[0.38,-0.45]]), false);
    return shape;
  }

  private rise(x: number, y: number): void {
    const count = Phaser.Math.Clamp(Math.floor(STYLE.riseCount), 0, 16);
    for (let i = 0; i < count; i++) {
      const side = i % 2 ? 1 : -1;
      const px = x + side * (STYLE.shieldSize * 0.4 + Math.floor(i / 2) * 14);
      const line = this.scene.add.graphics().setPosition(px, y + 48 + (i % 3) * 13).setDepth(STYLE.depth);
      line.lineStyle(i % 2 ? 1 : 2, STYLE.shieldEdge, 0.8).lineBetween(0, 0, 0, -26 - (i % 3) * 12);
      line.fillStyle(STYLE.highlight, 0.9).fillPoints([new Phaser.Math.Vector2(0,-34),new Phaser.Math.Vector2(3,-29),new Phaser.Math.Vector2(0,-24),new Phaser.Math.Vector2(-3,-29)],true);
      this.animate(line, { y: line.y - STYLE.riseDistance, alpha: 0, delay: i * 28, duration: STYLE.gainDuration * 0.7, ease: 'Sine.easeOut' });
    }
  }

  private sparks(x: number, y: number, broken: boolean): void {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + 0.2;
      const spark = this.scene.add.rectangle(x + Math.cos(angle) * 18, y + Math.sin(angle) * 18, broken ? 3 : 2, 12, STYLE.highlight, 0.9)
        .setRotation(angle - Math.PI / 2).setDepth(STYLE.depth);
      const distance = STYLE.shieldSize * (broken ? 1.25 : 0.95);
      this.animate(spark, { x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance, alpha: 0, scaleY: 0.15, duration: broken ? STYLE.fragmentDuration : STYLE.guardDuration, ease: 'Cubic.easeOut' });
    }
  }

  private animate(object: Phaser.GameObjects.Graphics | Phaser.GameObjects.Ellipse | Phaser.GameObjects.Rectangle, config: Omit<Phaser.Types.Tweens.TweenBuilderConfig, 'targets'>): void {
    let tween: Phaser.Tweens.Tween | undefined;
    const finish = () => { this.cleanups.delete(finish); tween?.remove(); if (object.active) object.destroy(); };
    this.cleanups.add(finish);
    tween = this.scene.tweens.add({ ...config, targets: object, onComplete: finish, onStop: finish });
  }

  private after(duration: number, action: () => void): Promise<void> {
    return new Promise(resolve => {
      let timer: Phaser.Time.TimerEvent | undefined;
      const cancel = () => { timer?.remove(); this.cleanups.delete(cancel); resolve(); };
      this.cleanups.add(cancel);
      timer = this.scene.time.delayedCall(Math.max(0, duration), () => { this.cleanups.delete(cancel); action(); resolve(); });
    });
  }

  private dispose(): void {
    for (const cleanup of [...this.cleanups]) cleanup();
    this.cleanups.clear();
    this.metals.clear();
    for (const { release } of [...this.pipelines.values()]) release();
  }
}
