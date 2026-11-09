// Menu: topic picker. One click on a topic starts a session.
window.MenuScene = class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const W = window.GAME.WIDTH, H = window.GAME.HEIGHT;
    this.cameras.main.fadeIn(250, 10, 13, 46);
    this.add.image(W / 2, H / 2, 'bg').setDisplaySize(W, H);
    UI.scrim(this, 0.2);
    this._twinkles();

    const title = UI.title(this, W / 2, 64, window.GAME.TITLE, { style: { fontSize: '42px' } });
    this.tweens.add({ targets: title, y: 58, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    UI.body(this, W / 2, 106, window.GAME.SUBTITLE, { style: { fontSize: '16px', color: '#c9c3f0' } });
    UI.label(this, W / 2, 158, 'Choose a topic');

    // ---- topic cards ----
    const topics = Content.TOPICS;
    const cw = 176, ch = 216, gap = 16;
    const total = topics.length * cw + (topics.length - 1) * gap;
    const y = 290;
    this.cards = [];
    topics.forEach((t, i) => {
      const x = (W - total) / 2 + cw / 2 + i * (cw + gap);
      const count = t.pool().length;
      const empty = t.id === 'custom' && count < 4;
      const c = this.add.container(x, y + 30).setAlpha(0);
      const g = this.add.graphics();
      const draw = (hover) => {
        g.clear();
        g.fillStyle(0x000000, 0.35).fillRoundedRect(-cw / 2, -ch / 2 + 6, cw, ch, 18);
        g.fillStyle(hover ? 0x2a2560 : 0x17143a, 0.82).fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 18);
        g.lineStyle(hover ? 2 : 1, hover ? UI.hex(window.GAME.GOLD) : 0xffffff, hover ? 0.9 : 0.14).strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 18);
      };
      draw(false);
      const icon = this.add.image(0, -50, t.icon).setScale(0.62);
      const name = this.add.text(0, 18, t.title, { fontFamily: UI.DISPLAY, fontSize: '20px', fontStyle: '700', color: '#fff' }).setOrigin(0.5);
      const sub = this.add.text(0, 44, t.sub, { fontFamily: UI.BODY, fontSize: '13px', color: '#b9b3e0' }).setOrigin(0.5);
      const chipTxt = empty ? 'Set up in Teacher' : t.age;
      const chip = this.add.text(0, 78, chipTxt, { fontFamily: UI.BODY, fontSize: '12px', fontStyle: '600', color: empty ? '#ffd27a' : '#e9e5ff',
        backgroundColor: 'rgba(255,255,255,0.08)', padding: { x: 10, y: 5 } }).setOrigin(0.5);
      const key = this.add.text(-cw / 2 + 14, -ch / 2 + 12, String(i + 1), { fontFamily: UI.DISPLAY, fontSize: '13px', fontStyle: '700', color: '#8f88c2' });
      c.add([g, icon, name, sub, chip, key]);
      this.tweens.add({ targets: c, y, alpha: 1, duration: 420, delay: 80 * i, ease: 'Back.easeOut' });

      const hit = this.add.rectangle(x, y, cw, ch, 0xffffff, 0).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => { draw(true); window.Audio.sfx('move'); this.tweens.add({ targets: c, scale: 1.04, duration: 140, ease: 'Quad.easeOut' }); this.tweens.add({ targets: icon, angle: 8, duration: 140, yoyo: true }); });
      hit.on('pointerout', () => { draw(false); this.tweens.add({ targets: c, scale: 1, duration: 140, ease: 'Quad.easeOut' }); });
      hit.on('pointerdown', () => this._pick(i));
      this.cards.push({ topic: t, empty, c });
    });

    // ---- footer ----
    const calm = Settings.calm ? 'Calm mode ON (no timer)' : 'Calm mode off';
    UI.body(this, W / 2, 432, `3 levels  ·  ${Settings.size} items  ·  ${calm}  ·  No sign-in, nothing leaves this device`, { style: { fontSize: '13px', color: '#a49ed0' } });
    UI.button(this, W / 2, 496, 248, 48, 'FOR TEACHERS', () => window.Teacher.open('why'), { ghost: true });
    UI.body(this, W / 2, 548, 'Click a topic or press 1–5', { style: { fontSize: '13px' } });

    // Lumi greets
    const lumi = this.add.image(96, 548, 'lumi').setScale(0.42);
    this.tweens.add({ targets: lumi, y: 540, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const bubble = this.add.text(150, 500, 'Hoo! Pick a topic\nand let’s light up the sky.', { fontFamily: UI.BODY, fontSize: '13px', fontStyle: '600', color: '#1b1440',
      backgroundColor: '#fff7e6', padding: { x: 12, y: 8 }, lineSpacing: 2 }).setOrigin(0, 1).setScale(0);
    this.tweens.add({ targets: bubble, scale: 1, duration: 300, delay: 700, ease: 'Back.easeOut' });

    this.input.keyboard.on('keydown', (e) => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= this.cards.length) this._pick(n - 1);
    });
    this._starting = false;
  }

  _pick(i) {
    if (this._starting) return;
    const card = this.cards[i];
    window.Audio.unlock();
    if (card.empty) { window.Audio.sfx('select'); window.Teacher.open('deck'); return; }
    this._starting = true;
    window.Audio.sfx('start');
    Juice.squashStretch(this, card.c, 0.12, 160);
    Juice.burstParticles(this, card.c.x, card.c.y - 40, UI.hex(window.GAME.GOLD), 18);
    this.cameras.main.fade(260, 10, 13, 46);
    this.time.delayedCall(270, () => this.scene.start('Game', { topicId: card.topic.id }));
  }

  _twinkles() {
    for (let i = 0; i < 14; i++) {
      const s = this.add.image(Phaser.Math.Between(20, 1004), Phaser.Math.Between(20, 420), 'star').setScale(Phaser.Math.FloatBetween(0.08, 0.16)).setAlpha(0);
      this.tweens.add({ targets: s, alpha: { from: 0, to: 0.9 }, duration: Phaser.Math.Between(900, 1800), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 2500) });
    }
  }
};
