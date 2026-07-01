import Phaser from 'phaser';
import { createStartingDeckDefinitions } from '../data/cards';
import { Enemy, Player } from '../models/Combatants';
import { Deck } from '../models/Deck';
import type { CardInstance } from '../models/types';

type CardView = {
  card: CardInstance;
  container: Phaser.GameObjects.Container;
};

const CARD_WIDTH = 150;
const CARD_HEIGHT = 190;
const HAND_Y = 585;

export class BattleScene extends Phaser.Scene {
  private player!: Player;
  private enemy!: Enemy;
  private deck!: Deck;

  private playerArea!: Phaser.GameObjects.Container;
  private playerBody!: Phaser.GameObjects.Rectangle;
  private enemyArea!: Phaser.GameObjects.Container;
  private enemyBody!: Phaser.GameObjects.Rectangle;
  private reticle!: Phaser.GameObjects.Graphics;
  private charmBadge!: Phaser.GameObjects.Container;

  private playerHud!: Phaser.GameObjects.Text;
  private enemyHud!: Phaser.GameObjects.Text;
  private pileHud!: Phaser.GameObjects.Text;
  private intentText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private statHelpText!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;

  private cardViews = new Map<string, CardView>();
  private isAnimating = false;
  private isGameOver = false;

  constructor() {
    super('BattleScene');
  }

  create(): void {
    this.player = new Player();
    this.enemy = new Enemy();
    this.deck = new Deck(createStartingDeckDefinitions());

    this.createArena();
    this.createPlayer();
    this.createEnemy();
    this.createHud();
    this.createEndTurnButton();

    this.deck.draw(5);
    this.renderHand();
    this.updateHud();
    this.showMessage('Your turn');
  }

  private createArena(): void {
    this.add.rectangle(640, 360, 1280, 720, 0x171a1f);
    this.add.rectangle(640, 460, 1280, 260, 0x20252d);
    this.add.rectangle(640, 590, 1280, 260, 0x111419, 0.94);

    const centerLine = this.add.rectangle(640, 360, 2, 560, 0x39404b, 0.5);
    centerLine.setDepth(0);

    this.add.text(40, 662, 'Deckbuilder combat prototype', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#68717f',
    });
  }

  private createPlayer(): void {
    this.playerArea = this.add.container(270, 335);

    const frame = this.add.rectangle(0, 0, 360, 390, 0x252c36, 0.95);
    frame.setStrokeStyle(3, 0x4a6b8a, 0.8);
    this.playerBody = this.add.rectangle(0, 20, 185, 260, 0x467fb1, 1);
    this.playerBody.setStrokeStyle(4, 0xb4d8f5, 0.75);

    const head = this.add.circle(0, -135, 48, 0x76b1df);
    const label = this.add.text(0, 185, 'PLAYER', {
      fontFamily: 'Arial',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#d8edff',
    });
    label.setOrigin(0.5);

    this.playerArea.add([frame, this.playerBody, head, label]);
  }

  private createEnemy(): void {
    this.enemyArea = this.add.container(910, 320);

    const shadow = this.add.ellipse(0, 140, 230, 48, 0x0c0f12, 0.6);
    this.enemyBody = this.add.rectangle(0, 0, 155, 210, 0x8a414d, 1);
    this.enemyBody.setStrokeStyle(4, 0xf0a2a7, 0.75);
    const head = this.add.circle(0, -132, 42, 0xb95d68);
    const label = this.add.text(0, 150, 'ENEMY', {
      fontFamily: 'Arial',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffe4e6',
    });
    label.setOrigin(0.5);

    this.enemyArea.add([shadow, this.enemyBody, head, label]);
    this.createReticle();
    this.createCharmBadge();
  }

  private createReticle(): void {
    this.reticle = this.add.graphics();
    this.reticle.lineStyle(3, 0xf3c75f, 1);
    this.reticle.strokeEllipse(910, 320, 235, 325);
    this.reticle.lineBetween(792, 320, 835, 320);
    this.reticle.lineBetween(985, 320, 1028, 320);
    this.reticle.lineBetween(910, 157, 910, 198);
    this.reticle.lineBetween(910, 442, 910, 483);
    this.reticle.setDepth(8);
  }

  private createCharmBadge(): void {
    this.charmBadge = this.add.container(1035, 202);
    const badge = this.add.rectangle(0, 0, 92, 34, 0xd85a91, 1);
    badge.setStrokeStyle(2, 0xffc7df, 0.9);
    const text = this.add.text(0, 0, 'Charm', {
      fontFamily: 'Arial',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#fff3f8',
    });
    text.setOrigin(0.5);
    this.charmBadge.add([badge, text]);
    this.charmBadge.setDepth(20);
    this.charmBadge.setVisible(false);
  }

  private createHud(): void {
    this.createPanel(20, 18, 330, 150, 'PLAYER');
    this.createPanel(930, 18, 330, 150, 'ENEMY');
    this.createPanel(380, 18, 520, 86, 'STAT NOTES');

    this.playerHud = this.add.text(38, 52, '', this.hudStyle(18));
    this.enemyHud = this.add.text(948, 52, '', this.hudStyle(18));
    this.statHelpText = this.add.text(
      400,
      50,
      [
        'Player HP 0 = defeat. Enemy HP 0 = victory.',
        'Player MP break: instant recovery, next turn energy -1.',
        'Enemy MP break: heal player and damage enemy by enemy max MP.',
      ],
      {
        ...this.hudStyle(15),
        color: '#c7d0dc',
        lineSpacing: 4,
      },
    );

    this.intentText = this.add.text(760, 170, '', {
      fontFamily: 'Arial',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffd36e',
      backgroundColor: '#1f2329',
      padding: { x: 12, y: 8 },
    });
    this.intentText.setOrigin(0.5);

    this.pileHud = this.add.text(1020, 660, '', this.hudStyle(17));
    this.messageText = this.add.text(640, 116, '', {
      fontFamily: 'Arial',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    this.messageText.setOrigin(0.5);

    this.overlay = this.add.container(0, 0);
    this.overlay.setDepth(3000);
    this.overlay.setVisible(false);
  }

  private createPanel(x: number, y: number, width: number, height: number, title: string): void {
    const panel = this.add.rectangle(x, y, width, height, 0x242a33, 0.92);
    panel.setOrigin(0, 0);
    panel.setStrokeStyle(2, 0x4d5665, 0.75);
    this.add.text(x + 16, y + 10, title, {
      fontFamily: 'Arial',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#8fa0b8',
    });
  }

  private hudStyle(fontSize: number): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'Arial',
      fontSize: `${fontSize}px`,
      color: '#f1f5f9',
      lineSpacing: 7,
    };
  }

  private createEndTurnButton(): void {
    const button = this.add.container(1110, 590);
    const bg = this.add.rectangle(0, 0, 150, 52, 0xd08b3e, 1);
    bg.setStrokeStyle(3, 0xffd48a, 0.8);
    const label = this.add.text(0, 0, 'End Turn', {
      fontFamily: 'Arial',
      fontSize: '21px',
      fontStyle: 'bold',
      color: '#1b1510',
    });
    label.setOrigin(0.5);
    button.add([bg, label]);
    button.setSize(150, 52);
    button.setInteractive(new Phaser.Geom.Rectangle(-75, -26, 150, 52), Phaser.Geom.Rectangle.Contains);
    button.on('pointerover', () => bg.setFillStyle(0xf0a54e));
    button.on('pointerout', () => bg.setFillStyle(0xd08b3e));
    button.on('pointerdown', () => this.endTurn());
  }

  private renderHand(): void {
    this.cardViews.forEach((view) => view.container.destroy());
    this.cardViews.clear();

    const count = this.deck.hand.length;
    const gap = Math.min(168, count > 1 ? 820 / (count - 1) : 0);
    const startX = 640 - ((count - 1) * gap) / 2;

    this.deck.hand.forEach((card, index) => {
      const view = this.createCardView(card, startX + index * gap, HAND_Y);
      this.cardViews.set(card.uid, view);
    });

    this.updateHud();
  }

  private createCardView(card: CardInstance, x: number, y: number): CardView {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, 0xf5f0df, 1);
    bg.setStrokeStyle(3, 0x38312a, 1);

    const costCircle = this.add.circle(-55, -70, 22, card.definition.cost === 0 ? 0x5cbf88 : 0x537fc1);
    const costText = this.add.text(-55, -70, String(card.definition.cost), {
      fontFamily: 'Arial',
      fontSize: '25px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    costText.setOrigin(0.5);

    const nameText = this.add.text(0, -46, card.definition.name, {
      fontFamily: 'Arial',
      fontSize: '19px',
      fontStyle: 'bold',
      color: '#1e252c',
      align: 'center',
      wordWrap: { width: CARD_WIDTH - 24 },
    });
    nameText.setOrigin(0.5);

    const effectText = this.add.text(0, 22, card.definition.description, {
      fontFamily: 'Arial',
      fontSize: '15px',
      color: '#2d3742',
      align: 'center',
      wordWrap: { width: CARD_WIDTH - 24 },
      lineSpacing: 5,
    });
    effectText.setOrigin(0.5);

    container.add([bg, costCircle, costText, nameText, effectText]);
    container.setSize(CARD_WIDTH, CARD_HEIGHT);
    container.setDepth(30);
    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerover', () => {
      if (this.isAnimating || this.isGameOver) {
        return;
      }
      container.setScale(1.08);
      container.setY(HAND_Y - 28);
      container.setDepth(1000);
      bg.setFillStyle(0xfff9e9);
    });

    bg.on('pointerout', () => {
      container.setScale(1);
      container.setY(HAND_Y);
      container.setDepth(30);
      bg.setFillStyle(0xf5f0df);
    });

    bg.on('pointerup', () => this.playCard(card, container, bg));

    return { card, container };
  }

  private playCard(
    card: CardInstance,
    container: Phaser.GameObjects.Container,
    hitArea: Phaser.GameObjects.Rectangle,
  ): void {
    if (this.isAnimating || this.isGameOver || this.enemy.isDefeated) {
      return;
    }

    if (this.player.energy < card.definition.cost) {
      this.showMessage('Not enough energy');
      this.tweens.add({
        targets: container,
        x: container.x + 8,
        duration: 45,
        yoyo: true,
        repeat: 3,
      });
      return;
    }

    this.isAnimating = true;
    this.player.energy -= card.definition.cost;
    this.updateHud();
    hitArea.disableInteractive();
    container.setDepth(2000);

    const originalX = container.x;
    const originalY = container.y;
    this.tweens.add({
      targets: container,
      x: 810,
      y: 420,
      scale: 0.92,
      duration: 160,
      ease: 'Sine.easeOut',
      yoyo: true,
      onComplete: () => {
        container.setPosition(originalX, originalY);
        container.setScale(1);
        this.applyCardEffect(card);
        this.deck.discard(card.uid);
        this.isAnimating = false;
        this.renderHand();
      },
    });
  }

  private applyCardEffect(card: CardInstance): void {
    const definition = card.definition;
    const messages: string[] = [];

    if (definition.hpDamage) {
      this.enemy.takeDirectHpDamage(definition.hpDamage);
      this.flashEnemy();
      messages.push(`${definition.name}: ${definition.hpDamage} HP damage`);
    }

    if (definition.mpDamage) {
      this.enemy.takeMpDamage(definition.mpDamage);
      this.flashEnemy();
      messages.push(`${definition.name}: ${definition.mpDamage} MP damage`);

      if (this.enemy.mp <= 0) {
        this.resolveEnemyMpBreak();
      }
    }

    if (definition.block) {
      this.player.block += definition.block;
      messages.push(`${definition.name}: +${definition.block} block`);
    }

    if (definition.debuff) {
      this.enemy.statuses.add(definition.debuff);
      messages.push(`${definition.name}: ${definition.debuff}`);
    }

    if (messages.length > 0) {
      this.showMessage(messages.join(' / '));
    }

    this.updateHud();

    if (this.enemy.isDefeated) {
      this.defeatEnemy();
    }
  }

  private resolveEnemyMpBreak(): void {
    this.player.healHp(this.enemy.maxMp);
    this.enemy.takeDirectHpDamage(this.enemy.maxMp);
    this.enemy.breakMp();
    this.flashEnemy();
    this.showMessage(`Enemy MP break: heal ${this.enemy.maxMp}, deal ${this.enemy.maxMp}`);
  }

  private endTurn(): void {
    if (this.isAnimating || this.isGameOver) {
      return;
    }

    this.isAnimating = true;
    this.deck.discardHand();
    this.renderHand();
    this.showMessage('Enemy turn');

    this.time.delayedCall(350, () => this.enemyAction());
  }

  private enemyAction(): void {
    if (this.enemy.isDefeated) {
      this.startNextTurn();
      return;
    }

    const intent = this.enemy.currentIntent();
    if (intent.damageType === 'mp') {
      const broke = this.player.takeMentalDamage(intent.amount);
      this.enemy.statuses.delete('Charm');
      this.flashPlayer();
      this.showMessage(broke ? 'Player MP break: next energy -1' : `Enemy dealt ${intent.amount} MP damage`);
    } else {
      const damage = this.player.takeHpDamage(intent.amount);
      this.flashPlayer();
      this.showMessage(`Enemy attacked: ${damage} HP damage`);
    }

    this.updateHud();

    if (this.player.isDefeated) {
      this.defeatPlayer();
      return;
    }

    this.time.delayedCall(650, () => this.startNextTurn());
  }

  private startNextTurn(): void {
    this.player.startTurn();
    this.deck.draw(5);
    this.renderHand();
    this.isAnimating = false;
    this.showMessage('Your turn');
    this.updateHud();
  }

  private flashEnemy(): void {
    this.enemyBody.setFillStyle(0xff4657);
    this.tweens.add({
      targets: this.enemyArea,
      x: this.enemyArea.x + 12,
      duration: 55,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        if (!this.enemy.isDefeated) {
          this.enemyArea.setX(910);
          this.enemyBody.setFillStyle(0x8a414d);
        }
      },
    });
  }

  private flashPlayer(): void {
    this.playerBody.setFillStyle(0xffffff);
    this.tweens.add({
      targets: this.playerArea,
      x: this.playerArea.x - 12,
      duration: 55,
      yoyo: true,
      repeat: 4,
      onComplete: () => {
        this.playerArea.setX(270);
        this.playerBody.setFillStyle(0x467fb1);
      },
    });
  }

  private defeatEnemy(): void {
    this.isGameOver = true;
    this.isAnimating = true;
    this.reticle.setVisible(false);
    this.charmBadge.setVisible(false);
    this.enemyBody.setFillStyle(0xff4657);

    this.tweens.add({
      targets: this.enemyArea,
      alpha: 0,
      y: this.enemyArea.y + 70,
      angle: 9,
      duration: 650,
      ease: 'Sine.easeIn',
      onComplete: () => this.showResult('VICTORY', 0x1f8f5f),
    });
  }

  private defeatPlayer(): void {
    this.isGameOver = true;
    this.isAnimating = true;
    this.tweens.add({
      targets: this.playerArea,
      alpha: 0.25,
      y: this.playerArea.y + 28,
      duration: 550,
      ease: 'Sine.easeIn',
      onComplete: () => this.showResult('DEFEAT', 0x9c2d39),
    });
  }

  private showResult(title: string, color: number): void {
    this.overlay.removeAll(true);
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x050607, 0.68);
    const banner = this.add.rectangle(640, 360, 500, 150, color, 0.94);
    banner.setStrokeStyle(4, 0xffffff, 0.75);
    const text = this.add.text(640, 360, title, {
      fontFamily: 'Arial',
      fontSize: '58px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    text.setOrigin(0.5);
    this.overlay.add([shade, banner, text]);
    this.overlay.setVisible(true);
  }

  private updateHud(): void {
    if (!this.playerHud || !this.enemyHud) {
      return;
    }

    this.playerHud.setText([
      `HP: ${this.player.hp}/${this.player.maxHp}`,
      `MP: ${this.player.mp}/${this.player.maxMp}`,
      `Energy: ${this.player.energy}/${this.player.maxEnergy}`,
      `Block: ${this.player.block}`,
      `Buffs/Debuffs: ${this.player.statusLabel()}`,
    ]);

    this.enemyHud.setText([
      `HP: ${this.enemy.hp}/${this.enemy.maxHp}`,
      `MP: ${this.enemy.mp}/${this.enemy.maxMp}`,
      `Block: ${this.enemy.block}`,
      `Buffs/Debuffs: ${this.enemy.statusLabel()}`,
      `Next: ${this.enemy.currentIntent().label}`,
    ]);

    this.intentText.setText(this.enemy.currentIntent().label);
    this.pileHud.setText(
      `Draw: ${this.deck.drawPile.length}   Hand: ${this.deck.hand.length}   Discard: ${this.deck.discardPile.length}`,
    );
    this.charmBadge.setVisible(this.enemy.statuses.has('Charm') && !this.enemy.isDefeated);
  }

  private showMessage(message: string): void {
    this.messageText.setText(message);
    this.messageText.setAlpha(1);
    this.tweens.killTweensOf(this.messageText);
    this.tweens.add({
      targets: this.messageText,
      alpha: 0.25,
      duration: 1200,
      ease: 'Sine.easeIn',
    });
  }
}
