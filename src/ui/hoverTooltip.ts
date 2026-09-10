import Phaser from 'phaser';

export const TOOLTIP_HOVER_DELAY = 300;

/** One hover target per scene; repeated position updates preserve the wait. */
export class HoverTooltip {
  private source?: Phaser.GameObjects.GameObject;
  private timer?: Phaser.Time.TimerEvent;
  private show?: () => void;
  private visible = false;

  constructor(private scene: Phaser.Scene, private hide: () => void) {
    scene.input.on('gameout', this.cancel, this);
    scene.events.on(Phaser.Scenes.Events.PAUSE, this.cancel, this);
    scene.events.on(Phaser.Scenes.Events.SLEEP, this.cancel, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cancel();
      scene.input.off('gameout', this.cancel, this);
      scene.events.off(Phaser.Scenes.Events.PAUSE, this.cancel, this);
      scene.events.off(Phaser.Scenes.Events.SLEEP, this.cancel, this);
    });
  }

  bind(source: Phaser.GameObjects.GameObject, show: () => void): void {
    source.on('pointerover', () => this.request(source, show));
    source.on('pointerout', () => this.cancelSource(source));
  }

  request(source: Phaser.GameObjects.GameObject, show: () => void): void {
    if (this.source === source) {
      this.show = show;
      if (this.visible) show();
      return;
    }
    this.cancel();
    this.source = source;
    this.show = show;
    source.once(Phaser.GameObjects.Events.DESTROY, this.cancel, this);
    this.timer = this.scene.time.delayedCall(TOOLTIP_HOVER_DELAY, () => {
      this.timer = undefined;
      // A HUD can disappear without sending pointerout (for example on defeat).
      let target: Phaser.GameObjects.GameObject | undefined = this.source;
      while (target) {
        if (!target.active || !target.willRender(this.scene.cameras.main)) {
          this.cancel();
          return;
        }
        target = target.parentContainer;
      }
      this.visible = true;
      this.show?.();
    });
  }

  cancelSource(source: Phaser.GameObjects.GameObject): void {
    if (this.source === source) this.cancel();
  }

  cancel(): void {
    this.timer?.remove(false);
    this.timer = undefined;
    this.source?.off(Phaser.GameObjects.Events.DESTROY, this.cancel, this);
    this.source = undefined;
    this.show = undefined;
    this.visible = false;
    this.hide();
  }
}
