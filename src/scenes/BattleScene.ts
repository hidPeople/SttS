import Phaser from 'phaser';
import { createStartingDeckDefinitions } from '../data/cards';
import { Enemy, Player } from '../models/Combatants';
import { Deck } from '../models/Deck';
import type { AttackAttribute, CardDefinition, CardInstance } from '../models/types';

type CardView = {
  card: CardInstance;
  container: Phaser.GameObjects.Container;
};

type HudBars = {
  hpFill: Phaser.GameObjects.Rectangle;
  blockFill: Phaser.GameObjects.Rectangle;
  mpFill: Phaser.GameObjects.Rectangle;
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
  private charmBadgeText!: Phaser.GameObjects.Text;

  private playerHud!: Phaser.GameObjects.Text;
  private enemyHud!: Phaser.GameObjects.Text;
  private playerBars!: HudBars;
  private enemyBars!: HudBars;
  private energyText!: Phaser.GameObjects.Text;
  private pileHud!: Phaser.GameObjects.Text;
  private intentText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private resultOverlay!: Phaser.GameObjects.Container;
  private modalOverlay!: Phaser.GameObjects.Container;

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
    this.createSettingsButton();
    this.createEndTurnButton();

    this.drawCards(5, true);
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
    this.charmBadgeText = this.add.text(0, 0, 'Charm', {
      fontFamily: 'Arial',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#fff3f8',
    });
    this.charmBadgeText.setOrigin(0.5);
    this.charmBadge.add([badge, this.charmBadgeText]);
    this.charmBadge.setDepth(20);
    this.charmBadge.setVisible(false);
  }

  private createHud(): void {
    this.createPanel(20, 18, 330, 180, 'PLAYER');
    this.createPanel(930, 62, 330, 180, 'ENEMY');

    this.playerBars = this.createHudBars(136, 58);
    this.enemyBars = this.createHudBars(1046, 102);
    this.playerHud = this.add.text(38, 52, '', this.hudStyle(17));
    this.enemyHud = this.add.text(948, 96, '', this.hudStyle(17));
    this.createEnergyHud();

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

    this.resultOverlay = this.add.container(0, 0);
    this.resultOverlay.setDepth(3000);
    this.resultOverlay.setVisible(false);

    this.modalOverlay = this.add.container(0, 0);
    this.modalOverlay.setDepth(5000);
    this.modalOverlay.setVisible(false);
  }

  private createHudBars(x: number, y: number): HudBars {
    const hpBg = this.add.rectangle(x, y, 190, 12, 0x17351f, 1);
    hpBg.setOrigin(0, 0.5);
    hpBg.setStrokeStyle(1, 0x426f4a, 0.9);
    const hpFill = this.add.rectangle(x, y, 190, 12, 0x39b769, 1);
    hpFill.setOrigin(0, 0.5);

    const blockBg = this.add.rectangle(x, y + 23, 190, 12, 0x16243d, 1);
    blockBg.setOrigin(0, 0.5);
    blockBg.setStrokeStyle(1, 0x405d82, 0.9);
    const blockFill = this.add.rectangle(x, y + 23, 190, 12, 0x3a80d7, 1);
    blockFill.setOrigin(0, 0.5);

    const mpBg = this.add.rectangle(x, y + 46, 190, 12, 0x3a1730, 1);
    mpBg.setOrigin(0, 0.5);
    mpBg.setStrokeStyle(1, 0x8b4a76, 0.9);
    const mpFill = this.add.rectangle(x, y + 46, 190, 12, 0xe45ca8, 1);
    mpFill.setOrigin(0, 0.5);

    return { hpFill, blockFill, mpFill };
  }

  private createEnergyHud(): void {
    const panel = this.add.rectangle(24, 552, 166, 96, 0x242a33, 0.95);
    panel.setOrigin(0, 0);
    panel.setStrokeStyle(2, 0xd8a84c, 0.85);
    this.add.text(42, 566, 'ENERGY', {
      fontFamily: 'Arial',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#d8a84c',
    });
    this.energyText = this.add.text(42, 590, '', {
      fontFamily: 'Arial',
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#ffd36e',
    });
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

  private createSettingsButton(): void {
    const button = this.add.container(1220, 28);
    const bg = this.add.rectangle(0, 0, 100, 36, 0x333b47, 1);
    bg.setStrokeStyle(2, 0x7d8ba0, 0.85);
    const label = this.add.text(0, 0, 'Settings', {
      fontFamily: 'Arial',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#f8fafc',
    });
    label.setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x455164));
    bg.on('pointerout', () => bg.setFillStyle(0x333b47));
    bg.on('pointerup', () => this.showSettingsMenu());
    button.add([bg, label]);
    button.setDepth(6000);
  }

  private showSettingsMenu(): void {
    this.modalOverlay.removeAll(true);
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x050607, 0.55);
    const panel = this.add.rectangle(640, 360, 460, 300, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x758195, 0.9);
    const title = this.add.text(640, 255, 'Settings', {
      fontFamily: 'Arial',
      fontSize: '30px',
      fontStyle: 'bold',
      color: '#f8fafc',
    });
    title.setOrigin(0.5);

    const restart = this.createModalButton(640, 325, 330, 48, 'Restart Battle', () => this.restartBattle());
    const help = this.createModalButton(640, 385, 330, 48, 'Help', () => this.showHelpPage());
    const close = this.createModalButton(640, 445, 180, 42, 'Close', () => this.hideModal());

    this.modalOverlay.add([shade, panel, title, restart, help, close]);
    this.modalOverlay.setVisible(true);
  }

  private showHelpPage(): void {
    this.modalOverlay.removeAll(true);
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x050607, 0.58);
    const panel = this.add.rectangle(640, 360, 820, 560, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x758195, 0.9);
    const title = this.add.text(640, 115, 'Help', {
      fontFamily: 'Arial',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#f8fafc',
    });
    title.setOrigin(0.5);

    const helpText = this.add.text(
      275,
      160,
      [
        'Player HP: Your health. If it reaches 0, you lose.',
        'Player MP: Your mental strength. It recovers by 1 each turn. If it reaches 0, it recovers immediately, but repeated MP breaks gradually reduce that recovery. The next turn starts with 1 less energy.',
        'Energy: Spent to play cards. Cards with cost 0 can be played with 0 energy.',
        'Block: Reduces incoming HP damage first, then resets at the start of your next turn.',
        '',
        'Enemy HP: Enemy health. If all enemies reach 0 HP, you win.',
        'Enemy MP: Enemy mental strength. If it reaches 0, the player heals by the enemy max MP, the enemy takes that much HP damage, then the enemy MP fully recovers.',
        'Buffs/Debuffs: The same status can stack. One stack is consumed when that status takes effect.',
        'Charm: The enemy next attack hits player MP instead of HP.',
        '',
        'Deck Loop: Draw 5 cards at battle start and each turn. Played cards and end-turn hand cards go to discard. If the draw pile is empty, the discard pile is shuffled back into the draw pile.',
      ],
      {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#e5edf7',
        wordWrap: { width: 730 },
        lineSpacing: 7,
      },
    );

    const back = this.createModalButton(640, 610, 220, 42, 'Back', () => this.showSettingsMenu());
    this.modalOverlay.add([shade, panel, title, helpText, back]);
    this.modalOverlay.setVisible(true);
  }

  private createModalButton(
    x: number,
    y: number,
    width: number,
    height: number,
    labelText: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, width, height, 0x3c4654, 1);
    bg.setStrokeStyle(2, 0x9ba8ba, 0.9);
    const label = this.add.text(0, 0, labelText, {
      fontFamily: 'Arial',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#f8fafc',
    });
    label.setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x526075));
    bg.on('pointerout', () => bg.setFillStyle(0x3c4654));
    bg.on('pointerup', onClick);
    button.add([bg, label]);
    return button;
  }

  private hideModal(): void {
    this.modalOverlay.removeAll(true);
    this.modalOverlay.setVisible(false);
  }

  private restartBattle(): void {
    this.scene.restart();
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
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0xf0a54e));
    bg.on('pointerout', () => bg.setFillStyle(0xd08b3e));
    bg.on('pointerup', () => this.endTurn());
  }

  private drawCards(count: number, animate: boolean): void {
    const drawn = this.deck.draw(count);
    this.renderHand(new Set(drawn.map((card) => card.uid)), animate);
  }

  private renderHand(animatedDraws = new Set<string>(), animateDraws = false): void {
    this.cardViews.forEach((view) => view.container.destroy());
    this.cardViews.clear();

    const count = this.deck.hand.length;
    const gap = Math.min(168, count > 1 ? 820 / (count - 1) : 0);
    const startX = 640 - ((count - 1) * gap) / 2;

    this.deck.hand.forEach((card, index) => {
      const targetX = startX + index * gap;
      const view = this.createCardView(card, targetX, HAND_Y);
      if (animateDraws && animatedDraws.has(card.uid)) {
        view.container.setX(-120 - index * 24);
        view.container.setAlpha(0);
        this.tweens.add({
          targets: view.container,
          x: targetX,
          alpha: 1,
          duration: 260,
          delay: index * 55,
          ease: 'Sine.easeOut',
        });
      }
      this.cardViews.set(card.uid, view);
    });

    this.updateHud();
  }

  private animateCardToDiscard(cardView: Phaser.GameObjects.Container, onComplete: () => void): void {
    this.tweens.add({
      targets: cardView,
      x: 1390,
      y: HAND_Y + 24,
      alpha: 0,
      angle: 8,
      duration: 240,
      ease: 'Sine.easeIn',
      onComplete,
    });
  }

  private createCardView(card: CardInstance, x: number, y: number): CardView {
    const container = this.add.container(x, y);
    const cardColor = this.cardColor(card.definition);
    const bg = this.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, cardColor, 1);
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
      bg.setFillStyle(cardColor);
    });

    bg.on('pointerup', () => this.playCard(card, container, bg));

    return { card, container };
  }

  private cardColor(definition: CardDefinition): number {
    if (definition.debuff) {
      return 0xe7f4c8;
    }

    if (definition.mpDamage) {
      return 0xf8d6e8;
    }

    if (definition.hpDamage) {
      return 0xf0d3d6;
    }

    return 0xdceafa;
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
        if (this.isGameOver) {
          return;
        }

        this.animateCardToDiscard(container, () => {
          this.isAnimating = false;
          this.renderHand();
        });
      },
    });
  }

  private applyCardEffect(card: CardInstance): void {
    const definition = card.definition;
    const messages: string[] = [];

    if (definition.hpDamage) {
      const damage = this.enemy.takeHpDamage(definition.hpDamage);
      this.playDamageEffect(definition.attackAttribute ?? 'strike', 910, 300);
      if (damage === 0) {
        this.showShieldEffect(910, 300);
      }
      this.flashEnemy();
      messages.push(`${definition.name}: ${damage} HP damage`);
    }

    if (definition.mpDamage) {
      this.enemy.takeMpDamage(definition.mpDamage);
      this.playDamageEffect(definition.attackAttribute ?? 'love', 910, 300);
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
      this.enemy.addStatus(definition.debuff);
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
    this.healingEffect();
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
    this.showMessage('Enemy turn');

    const cardsToDiscard = this.deck.hand
      .map((card) => this.cardViews.get(card.uid)?.container)
      .filter((container): container is Phaser.GameObjects.Container => Boolean(container));

    const finishDiscard = () => {
      this.deck.discardHand();
      this.renderHand();
      this.time.delayedCall(350, () => this.enemyAction());
    };

    if (cardsToDiscard.length === 0) {
      finishDiscard();
      return;
    }

    let completed = 0;
    cardsToDiscard.forEach((container, index) => {
      this.tweens.add({
        targets: container,
        x: 1390,
        y: HAND_Y + 24,
        alpha: 0,
        angle: 10,
        duration: 220,
        delay: index * 35,
        ease: 'Sine.easeIn',
        onComplete: () => {
          completed += 1;
          if (completed === cardsToDiscard.length) {
            finishDiscard();
          }
        },
      });
    });
  }

  private enemyAction(): void {
    if (this.enemy.isDefeated) {
      this.startNextTurn();
      return;
    }

    const intent = this.enemy.currentIntent();
    if (intent.damageType === 'mp') {
      this.enemyMpAttackMotion();
      this.playDamageEffect('love', 270, 315);
      const broke = this.player.takeMentalDamage(intent.amount);
      this.enemy.consumeStatus('Charm');
      this.flashPlayer();
      this.showMessage(broke ? 'Player MP break: next energy -1' : `Enemy dealt ${intent.amount} MP damage`);
    } else {
      this.enemyHpAttackMotion();
      const damage = this.player.takeHpDamage(intent.amount);
      this.playDamageEffect(intent.attackAttribute, 270, 315);
      if (damage === 0) {
        this.showShieldEffect(270, 315);
      }
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
    this.drawCards(5, true);
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

  private enemyHpAttackMotion(): void {
    this.tweens.add({
      targets: this.enemyArea,
      x: this.enemyArea.x - 32,
      duration: 120,
      ease: 'Sine.easeOut',
      yoyo: true,
      onComplete: () => this.enemyArea.setX(910),
    });
  }

  private enemyMpAttackMotion(): void {
    this.tweens.add({
      targets: this.enemyArea,
      y: this.enemyArea.y - 14,
      duration: 70,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: 3,
      onComplete: () => this.enemyArea.setY(320),
    });
  }

  private healingEffect(): void {
    for (let i = 0; i < 12; i += 1) {
      const x = Phaser.Math.Between(185, 355);
      const y = Phaser.Math.Between(330, 425);
      const cross = this.add.text(x, y, '+', {
        fontFamily: 'Arial',
        fontSize: `${Phaser.Math.Between(16, 24)}px`,
        fontStyle: 'bold',
        color: '#6df090',
      });
      cross.setOrigin(0.5);
      cross.setDepth(1200);
      this.tweens.add({
        targets: cross,
        y: y - Phaser.Math.Between(42, 86),
        alpha: 0,
        duration: Phaser.Math.Between(520, 850),
        delay: i * 35,
        ease: 'Sine.easeOut',
        onComplete: () => cross.destroy(),
      });
    }
  }

  private playDamageEffect(attribute: AttackAttribute, x: number, y: number): void {
    if (attribute === 'strike') {
      this.strikeImpactEffect(x, y);
      return;
    }

    if (attribute === 'slash') {
      this.slashImpactEffect(x, y);
      return;
    }

    this.loveImpactEffect(x, y);
  }

  private strikeImpactEffect(x: number, y: number): void {
    const offsets = [
      { x: -22, y: -12 },
      { x: 12, y: 8 },
      { x: 30, y: -20 },
    ];

    offsets.forEach((offset, index) => {
      const ring = this.add.circle(x + offset.x, y + offset.y, 14, 0xffffff, 0);
      ring.setStrokeStyle(5, 0xffe0a3, 0.95);
      ring.setDepth(1400);
      this.tweens.add({
        targets: ring,
        scale: 2.4,
        alpha: 0,
        duration: 360,
        delay: index * 45,
        ease: 'Sine.easeOut',
        onComplete: () => ring.destroy(),
      });
    });
  }

  private slashImpactEffect(x: number, y: number): void {
    const slash = this.add.graphics();
    slash.lineStyle(9, 0xf8f3e8, 0.98);
    slash.lineBetween(-48, -52, 48, 52);
    slash.lineStyle(3, 0xdf475a, 0.95);
    slash.lineBetween(-34, -38, 62, 66);
    slash.setPosition(x, y);
    slash.setDepth(1400);
    slash.setAlpha(0.95);
    this.tweens.add({
      targets: slash,
      x: x + 28,
      y: y + 20,
      scale: 1.18,
      alpha: 0,
      duration: 360,
      ease: 'Sine.easeOut',
      onComplete: () => slash.destroy(),
    });
  }

  private loveImpactEffect(x: number, y: number): void {
    for (let i = 0; i < 5; i += 1) {
      const heart = this.add.text(x + Phaser.Math.Between(-36, 36), y + 42, '♥', {
        fontFamily: 'Arial',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ff73b8',
      });
      heart.setOrigin(0.5);
      heart.setDepth(1400);
      heart.setScale(0.55);
      this.tweens.add({
        targets: heart,
        y: y - Phaser.Math.Between(18, 54),
        scale: 1.35,
        alpha: 0,
        duration: 620,
        delay: i * 65,
        ease: 'Sine.easeOut',
        onComplete: () => heart.destroy(),
      });
    }
  }

  private showShieldEffect(x: number, y: number): void {
    const shield = this.add.graphics();
    shield.fillStyle(0x3a80d7, 0.78);
    shield.lineStyle(5, 0xd8ecff, 0.95);
    const points = [
      new Phaser.Math.Vector2(0, -58),
      new Phaser.Math.Vector2(54, -24),
      new Phaser.Math.Vector2(36, 42),
      new Phaser.Math.Vector2(0, 70),
      new Phaser.Math.Vector2(-54, -24),
    ];
    shield.fillPoints(points, true);
    shield.strokePoints(points, true);
    shield.setPosition(x, y);
    shield.setDepth(1500);
    shield.setScale(0.65);
    this.tweens.add({
      targets: shield,
      scale: 1.05,
      alpha: 0,
      duration: 900,
      ease: 'Sine.easeOut',
      onComplete: () => shield.destroy(),
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
    this.resultOverlay.removeAll(true);
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
    this.resultOverlay.add([shade, banner, text]);
    this.resultOverlay.setVisible(true);
  }

  private updateHud(): void {
    if (!this.playerHud || !this.enemyHud) {
      return;
    }

    this.playerHud.setText([
      `HP: ${this.player.hp}/${this.player.maxHp}`,
      `Block: ${this.player.block}`,
      `MP: ${this.player.mp}/${this.player.maxMp}`,
      `MP Breaks: ${this.player.mpBreakCount}`,
      `Buffs/Debuffs: ${this.player.statusLabel()}`,
    ]);

    this.enemyHud.setText([
      `HP: ${this.enemy.hp}/${this.enemy.maxHp}`,
      `Block: ${this.enemy.block}`,
      `MP: ${this.enemy.mp}/${this.enemy.maxMp}`,
      `Buffs/Debuffs: ${this.enemy.statusLabel()}`,
    ]);

    this.updateBars(this.playerBars, this.player.hp, this.player.maxHp, this.player.block, this.player.mp, this.player.maxMp);
    this.updateBars(this.enemyBars, this.enemy.hp, this.enemy.maxHp, this.enemy.block, this.enemy.mp, this.enemy.maxMp);

    const intent = this.enemy.currentIntent();
    this.intentText.setText(intent.label);
    this.intentText.setColor(intent.damageType === 'hp' ? '#ff6b72' : '#ff73b8');
    this.energyText.setText(`${this.player.energy}/${this.player.maxEnergy}`);
    this.pileHud.setText(
      `Draw: ${this.deck.drawPile.length}   Hand: ${this.deck.hand.length}   Discard: ${this.deck.discardPile.length}`,
    );
    const charmStacks = this.enemy.statuses.get('Charm') ?? 0;
    this.charmBadgeText.setText(charmStacks > 1 ? `Charm x${charmStacks}` : 'Charm');
    this.charmBadge.setVisible(this.enemy.hasStatus('Charm') && !this.enemy.isDefeated);
  }

  private updateBars(bars: HudBars, hp: number, maxHp: number, block: number, mp: number, maxMp: number): void {
    const hpRatio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    bars.hpFill.displayWidth = 190 * hpRatio;
    bars.hpFill.setFillStyle(hpRatio < 1 / 3 ? 0xd94a56 : 0x39b769);
    bars.blockFill.displayWidth = 190 * Phaser.Math.Clamp(block / maxHp, 0, 1);
    bars.mpFill.displayWidth = 190 * Phaser.Math.Clamp(mp / maxMp, 0, 1);
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
