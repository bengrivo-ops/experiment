// =============================================================
// Game: one learning session = 3 levels ("constellations").
// A question appears; answer crystals float (and, from Level 2,
// drift towards the hills). Pick the right one to light a star.
// A miss shows the right answer plus a short explanation, and
// the item comes back later (spacing).
// =============================================================
window.GameScene = class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.topic = Content.TOPICS.find((t) => t.id === (data && data.topicId)) || Content.TOPICS[0];
  }

  create() {
    const W = window.GAME.WIDTH, H = window.GAME.HEIGHT;
    this.cameras.main.fadeIn(300, 10, 13, 46);
    this.add.image(W / 2, H / 2, 'bg_play').setDisplaySize(W, H);

    this.session = new Learning.Session(this.topic.pool(), { size: Settings.size, calm: Settings.calm });
    this.score = 0; this.streak = 0; this.bestStreak = 0;
    this.startedAt = this.time.now;
    this.state = 'intro';
    this.FIELD_X = 390;           // centre of the play field
    this.HORIZON = 568;           // crystals must be answered before here

    // ---- HUD ----
    this.hud = UI.hudBar(this, [
      { key: 'topic', label: 'Topic', value: this.topic.title },
      { key: 'level', label: 'Level', value: '1 / 3' },
      { key: 'streak', label: 'Streak', value: '–', color: window.GAME.GOLD },
      { key: 'score', label: 'Score', value: '0' },
    ], { height: 56, y: 12 });

    // ---- question panel ----
    UI.panel(this, this.FIELD_X, 146, 648, 104);
    this.qLabel = UI.label(this, this.FIELD_X, 112, 'Question');
    this.qText = this.add.text(this.FIELD_X, 152, '', { fontFamily: UI.DISPLAY, fontSize: '40px', fontStyle: '700', color: '#ffffff', align: 'center',
      wordWrap: { width: 600 } }).setOrigin(0.5);

    // ---- horizon (time limit line) ----
    this.horizon = this.add.graphics();
    for (let x = 16; x < 768; x += 22) this.horizon.fillStyle(0xffd27a, 0.5).fillRoundedRect(x, this.HORIZON, 12, 3, 1.5);
    this.horizon.setAlpha(0);

    // ---- constellation panel ----
    this.cPanel = UI.panel(this, 904, 266, 200, 240);
    UI.label(this, 904, 168, 'Constellation');
    this.cName = UI.body(this, 904, 190, '', { style: { fontSize: '13px', color: '#ffd27a', fontStyle: '600' } });
    this.cLines = this.add.graphics();
    this.cStars = [];
    this.cProgress = UI.body(this, 904, 366, '', { style: { fontSize: '13px' } });

    // ---- Lumi + speech bubble ----
    this.lumi = this.add.image(904, 548, 'lumi').setScale(0.42);
    this.tweens.add({ targets: this.lumi, y: 542, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.bubble = this.add.text(904, 474, '', { fontFamily: UI.BODY, fontSize: '14px', fontStyle: '600', color: '#1b1440', align: 'center',
      backgroundColor: '#fff7e6', padding: { x: 12, y: 8 }, wordWrap: { width: 176 } }).setOrigin(0.5, 1).setAlpha(0).setDepth(20);

    // ---- answer crystals (a fixed pool of 4, reused every question) ----
    this.gems = [];
    for (let i = 0; i < 4; i++) {
      const img = this.add.image(0, 0, 'gem').setScale(0.75);
      const txt = this.add.text(0, 2, '', { fontFamily: UI.DISPLAY, fontSize: '24px', fontStyle: '700', color: '#1b1440', align: 'center' }).setOrigin(0.5);
      const key = this.add.text(-66, -44, String(i + 1), { fontFamily: UI.DISPLAY, fontSize: '13px', fontStyle: '700', color: '#ffffff',
        backgroundColor: 'rgba(27,20,64,0.85)', padding: { x: 6, y: 2 } }).setOrigin(0.5);
      const mark = this.add.text(70, -40, '', { fontFamily: UI.DISPLAY, fontSize: '30px', fontStyle: '700', color: '#fff', stroke: '#1b1440', strokeThickness: 5 }).setOrigin(0.5);
      const c = this.add.container(-500, -500, [img, txt, key, mark]).setVisible(false).setDepth(5);
      this.gems.push({ c, img, txt, key, mark, value: null, active: false, baseY: 0 });
    }

    // ---- feedback panel (shown on a miss) ----
    this.fb = this._buildFeedback();

    // ---- input ----
    this.input.on('pointerdown', (p) => this._onPointer(p));
    this.input.keyboard.on('keydown', (e) => this._onKey(e));
    window.Audio.startMusic();
    this.events.once('shutdown', () => window.Audio.stopMusic());

    this._levelIntro(0);
  }

  // =========================================================
  // LEVEL FLOW
  // =========================================================
  _levelIntro(n) {
    const count = this.session.startLevel(n);
    const L = this.session.levelDef;
    const names = ['The Little Owl', 'The Lantern', 'The Great Comet'];
    this.hud.set('level', `${n + 1} / 3`);
    this._buildConstellation(count, n);
    this.cName.setText(names[n]);
    this._updateProgress();
    this._say(n === 0 ? 'Every right answer lights a star!' : n === 1 ? 'Old and new items mixed. Keep going!' : 'Final level: everything mixed!', 'idle');

    const timed = L.fallSec > 0 && !this.session.calm;
    const lines = [
      `${L.choices} choices  ·  ${count} stars to light`,
      timed ? `Crystals drift down, so answer before they reach the hills.` : (L.fallSec > 0 ? 'Calm mode: no timer.' : 'No timer.'),
    ];
    this._card({
      kicker: `Level ${n + 1} of 3`,
      title: L.name,
      body: L.tip,
      small: lines.join('\n'),
      button: n === 0 ? 'START' : 'GO',
      onGo: () => this._nextQuestion(),
    });
  }

  _levelComplete() {
    this.state = 'between';
    const { acc, stars } = this.session.finishLevel();
    const last = this.session.level === this.session.levelCount - 1;
    window.Audio.sfx('level');
    Juice.flash(this, 160, [255, 236, 170]);
    Juice.screenShake(this, 260, 0.006);
    // constellation celebration
    this.cStars.forEach((s, i) => this.time.delayedCall(i * 60, () => {
      this.tweens.add({ targets: s, scale: s.scale * 1.6, duration: 160, yoyo: true, ease: 'Quad.easeOut' });
      Juice.burstParticles(this, s.x, s.y, UI.hex(window.GAME.GOLD), 6);
    }));
    this._say(acc >= 0.9 ? 'Brilliant memory!' : acc >= 0.7 ? 'Great work! It’s getting stronger.' : 'You kept going and fixed your mistakes. That’s how learning works!', 'happy');

    const pct = Math.round(acc * 100);
    this.time.delayedCall(700, () => this._card({
      kicker: 'Constellation complete!',
      title: this.cName.text,
      stars,
      body: `${pct}% right on the first try`,
      small: last ? 'All three constellations are lit.' : 'Next: ' + Learning.LEVELS[this.session.level + 1].name + '. ' + Learning.LEVELS[this.session.level + 1].tip,
      button: last ? 'SEE RESULTS' : 'NEXT LEVEL',
      onGo: () => (last ? this._finish() : this._levelIntro(this.session.level + 1)),
    }));
  }

  _finish() {
    this.state = 'done';
    const data = { topicId: this.topic.id, topicTitle: this.topic.title, report: this.session.report(), score: this.score,
      bestStreak: this.bestStreak, ms: this.time.now - this.startedAt };
    this.cameras.main.fade(350, 10, 13, 46);
    this.time.delayedCall(360, () => this.scene.start('Results', data));
  }

  // =========================================================
  // QUESTIONS
  // =========================================================
  _nextQuestion() {
    if (this.session.levelComplete()) { this._levelComplete(); return; }
    const item = this.session.current();
    const opts = this.session.options();
    const L = this.session.levelDef;
    this.timed = L.fallSec > 0 && !this.session.calm;
    this.tweens.add({ targets: this.horizon, alpha: this.timed ? 1 : 0, duration: 300 });

    // prompt
    this._fitText(this.qText, item.q, 40, 22, 600, 64);
    this.qText.setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: this.qText, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
    this.qLabel.setText(item.misses ? 'Try this one again' : 'Question');
    this.qLabel.setColor(item.misses ? window.GAME.GOLD : UI.palette.muted);

    // crystals
    const n = opts.length;
    const spacing = n >= 4 ? 190 : n === 3 ? 228 : 270;
    const startY = 276;
    this.fallSpeed = this.timed ? (this.HORIZON - 52 - startY - 14) / L.fallSec : 0;
    this.gems.forEach((g, i) => {
      this.tweens.killTweensOf(g.c);
      if (i >= n) { g.active = false; g.c.setVisible(false); return; }
      const x = this.FIELD_X + (i - (n - 1) / 2) * spacing;
      const y = startY + (i % 2 ? 14 : 0);
      g.value = opts[i]; g.active = true; g.baseY = y;
      g.img.setTexture('gem'); g.mark.setText('');
      this._fitText(g.txt, opts[i], 24, 13, 136, 58);
      g.key.setText(String(i + 1));
      g.c.setDepth(5).setPosition(x, y - 40).setVisible(true).setAlpha(0).setScale(0.6).setAngle(0);
      this.tweens.add({ targets: g.c, y, alpha: 1, scale: 1, duration: 380, delay: 70 * i, ease: 'Back.easeOut' });
      if (!this.timed) this.tweens.add({ targets: g.c, angle: { from: -1.5, to: 1.5 }, duration: 1600 + i * 180, yoyo: true, repeat: -1, delay: 400, ease: 'Sine.easeInOut' });
    });
    this.askReadyAt = this.time.now + 280;
    this.fallElapsed = 0;
    this.state = 'ask';
  }

  _pick(i) {
    if (this.state !== 'ask' || this.time.now < this.askReadyAt) return;
    const g = this.gems[i];
    if (!g || !g.active) return;
    this._resolve(g.value, g);
  }

  _resolve(choice, gem) {
    this.state = 'resolving';
    const { correct, item, first } = this.session.answer(choice);
    const fixed = correct && item.misses > 0;
    if (correct) this._onCorrect(gem, fixed);
    else this._onWrong(gem, item);
  }

  _onCorrect(gem, fixed) {
    const T = window.GAME.tuning;
    this.streak++; this.bestStreak = Math.max(this.bestStreak, this.streak);
    const pts = T.pointsCorrect + Math.min(this.streak - 1, T.streakCap) * T.streakBonus;
    this.score += pts;
    this.hud.set('score', this.score);
    this.hud.set('streak', this.streak > 1 ? '×' + this.streak : '–');
    if (this.streak > 1) Juice.squashStretch(this, this.hud.byKey.streak.value, 0.35, 160);

    gem.img.setTexture('gem_ok'); gem.mark.setText('✓').setColor('#3ddc84');
    this.tweens.killTweensOf(gem.c);
    gem.c.setAngle(0);
    Juice.squashStretch(this, gem.c, 0.18, 140);
    Juice.burstParticles(this, gem.c.x, gem.c.y, 0x7dffb0, 16);
    Juice.scorePopup(this, gem.c.x, gem.c.y - 50, '+' + pts, '#ffd27a');
    window.Audio.sfx(this.streak >= 3 && this.streak % 3 === 0 ? 'streak' : 'correct');

    const praise = ['Great recall!', 'You remembered!', 'Spot on!', 'Nailed it!', 'Yes! Well done.'];
    if (fixed) this._say('You fixed it! That’s how memory grows.', 'happy');
    else if (this.streak >= 3) this._say(`${this.streak} in a row. It’s sticking!`, 'happy');
    else this._say(praise[Math.floor(Math.random() * praise.length)], 'happy');

    this.gems.forEach((g) => { if (g !== gem && g.active) this.tweens.add({ targets: g.c, alpha: 0, scale: 0.7, duration: 220 }); });
    this._flyStar(gem.c.x, gem.c.y);
    this.time.delayedCall(T.nextDelayMs, () => this._clearGems(() => this._nextQuestion()));
  }

  _onWrong(gem, item) {
    this.streak = 0;
    this.hud.set('streak', '–');
    const timeout = !gem;
    window.Audio.sfx(timeout ? 'miss' : 'wrong');
    Juice.screenShake(this, 140, 0.004); // gentle, no red flash: mistakes are not punished
    if (gem) {
      gem.img.setTexture('gem_bad'); gem.mark.setText('✗').setColor('#ff8a7a');
      this.tweens.killTweensOf(gem.c);
      this.tweens.add({ targets: gem.c, x: gem.c.x + 8, duration: 50, yoyo: true, repeat: 3 });
    }
    const right = this.gems.find((g) => g.active && g.value === item.a);
    this.gems.forEach((g) => {
      if (!g.active || g === right) return;
      this.tweens.add({ targets: g.c, alpha: g === gem ? 0.55 : 0.18, duration: 260, delay: g === gem ? 280 : 0 });
    });
    if (right) {
      this.tweens.killTweensOf(right.c);
      right.img.setTexture('gem_ok'); right.mark.setText('✓').setColor('#3ddc84');
      right.c.setAngle(0).setDepth(6);
      this.tweens.add({ targets: right.c, x: this.FIELD_X, y: 270, scale: 1.12, duration: 420, ease: 'Cubic.easeOut', delay: 200 });
      this.gems.forEach((g) => { if (g.active && g !== right) this.tweens.add({ targets: g.c, y: g.c.y + 30, duration: 420, delay: 200, ease: 'Cubic.easeOut' }); });
    }
    this._say(timeout ? 'Time’s up. No problem, here’s the answer.' : 'Mistakes help you learn. Read the tip!', 'think');
    this._showFeedback(item, timeout);
  }

  _clearGems(done) {
    let left = 0;
    this.gems.forEach((g) => {
      if (!g.active) return;
      g.active = false; left++;
      this.tweens.killTweensOf(g.c);
      this.tweens.add({ targets: g.c, alpha: 0, y: g.c.y - 20, duration: 200, ease: 'Quad.easeIn',
        onComplete: () => { g.c.setVisible(false); if (--left === 0 && done) done(); } });
    });
    if (left === 0 && done) done();
  }

  // =========================================================
  // FEEDBACK (on a miss): right answer + why, then continue
  // =========================================================
  _buildFeedback() {
    const x = this.FIELD_X, y = 462;
    const c = this.add.container(x, y).setDepth(30).setVisible(false);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35).fillRoundedRect(-320, -82 + 6, 640, 164, 18);
    g.fillStyle(0x17143a, 0.95).fillRoundedRect(-320, -82, 640, 164, 18);
    g.lineStyle(2, UI.hex(window.GAME.GOLD), 0.7).strokeRoundedRect(-320, -82, 640, 164, 18);
    const head = this.add.text(0, -58, '', { fontFamily: UI.BODY, fontSize: '13px', fontStyle: '600', color: '#b9b3e0' }).setOrigin(0.5);
    const fact = this.add.text(0, -24, '', { fontFamily: UI.DISPLAY, fontSize: '28px', fontStyle: '700', color: window.GAME.GOLD, align: 'center' }).setOrigin(0.5);
    const why = this.add.text(0, 18, '', { fontFamily: UI.BODY, fontSize: '16px', color: '#f3f4fb', align: 'center', wordWrap: { width: 580 }, lineSpacing: 3 }).setOrigin(0.5);
    const cont = this.add.text(0, 62, 'Continue  ▸   click or press Enter', { fontFamily: UI.DISPLAY, fontSize: '13px', fontStyle: '700', color: '#8f88c2' }).setOrigin(0.5);
    c.add([g, head, fact, why, cont]);
    return { c, head, fact, why, cont };
  }

  _showFeedback(item, timeout) {
    const f = this.fb;
    f.head.setText(timeout ? 'TIME’S UP. HERE’S THE ANSWER' : 'NOT QUITE. HERE’S THE ANSWER');
    this._fitText(f.fact, `${item.q}  →  ${item.a}`, 28, 16, 600, 40);
    f.why.setText('Tip: ' + item.why);
    f.cont.setAlpha(0.3);
    f.c.setVisible(true).setAlpha(0).setY(492);
    this.tweens.add({ targets: f.c, alpha: 1, y: 462, duration: 320, ease: 'Cubic.easeOut' });
    this.state = 'feedback';
    this.fbReadyAt = this.time.now + window.GAME.tuning.feedbackMinMs;
    this.time.delayedCall(window.GAME.tuning.feedbackMinMs, () => this.tweens.add({ targets: f.cont, alpha: 1, duration: 200 }));
    if (this.fbAuto) this.fbAuto.remove();
    this.fbAuto = this.time.delayedCall(window.GAME.tuning.feedbackAutoMs, () => this._continueFromFeedback());
  }

  _continueFromFeedback() {
    if (this.state !== 'feedback' || this.time.now < this.fbReadyAt) return;
    this.state = 'resolving';
    if (this.fbAuto) { this.fbAuto.remove(); this.fbAuto = null; }
    window.Audio.sfx('select');
    this.tweens.add({ targets: this.fb.c, alpha: 0, y: 482, duration: 200, onComplete: () => this.fb.c.setVisible(false) });
    this._updateProgress();
    this._clearGems(() => this._nextQuestion());
  }

  // =========================================================
  // CONSTELLATION
  // =========================================================
  _buildConstellation(n, level) {
    this.cStars.forEach((s) => s.destroy());
    this.cStars = [];
    this.cLines.clear();
    const left = 830, right = 978, top = 222, bottom = 346;
    const phase = [0.3, 1.7, 2.9][level];
    this.cPos = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const x = left + t * (right - left);
      const y = (top + bottom) / 2 + Math.sin(t * Math.PI * 2.2 + phase) * 40 + ((i * 37) % 17) - 8;
      this.cPos.push({ x, y });
      const s = this.add.image(x, y, 'star_dim').setScale(0.42).setAlpha(0);
      this.tweens.add({ targets: s, alpha: 1, duration: 300, delay: i * 40 });
      this.cStars.push(s);
    }
    this.cLines.lineStyle(1, 0xffffff, 0.12);
    for (let i = 1; i < n; i++) this.cLines.lineBetween(this.cPos[i - 1].x, this.cPos[i - 1].y, this.cPos[i].x, this.cPos[i].y);
  }

  _flyStar(x, y) {
    const idx = this.session.levelDone - 1;
    const target = this.cPos[idx];
    if (!target) return;
    const s = this.add.image(x, y, 'star').setScale(0.5).setDepth(40);
    this.tweens.add({
      targets: s, x: target.x, y: target.y, scale: 0.34, duration: 520, ease: 'Cubic.easeInOut',
      onComplete: () => {
        s.destroy();
        const st = this.cStars[idx];
        st.setTexture('star').setScale(0.2);
        this.tweens.add({ targets: st, scale: 0.34, duration: 260, ease: 'Back.easeOut' });
        Juice.burstParticles(this, target.x, target.y, UI.hex(window.GAME.GOLD), 10);
        window.Audio.sfx('star');
        this._redrawLines();
        this._updateProgress();
      },
    });
  }

  _redrawLines() {
    const lit = this.session.levelDone;
    this.cLines.clear();
    this.cLines.lineStyle(1, 0xffffff, 0.12);
    for (let i = 1; i < this.cPos.length; i++) this.cLines.lineBetween(this.cPos[i - 1].x, this.cPos[i - 1].y, this.cPos[i].x, this.cPos[i].y);
    this.cLines.lineStyle(2.5, 0xffd27a, 0.85);
    for (let i = 1; i < lit; i++) this.cLines.lineBetween(this.cPos[i - 1].x, this.cPos[i - 1].y, this.cPos[i].x, this.cPos[i].y);
  }

  _updateProgress() {
    const s = this.session;
    const back = s.queue.length - (s.levelTotal - s.levelDone);
    this.cProgress.setText(`${s.levelDone} / ${s.levelTotal} stars` + (back > 0 ? `  ·  ${back} to retry` : ''));
  }

  // =========================================================
  // MODAL CARD (level intro / level complete)
  // =========================================================
  _card(o) {
    this.state = this.state === 'between' ? 'between' : 'intro';
    const x = this.FIELD_X, cy = 360, w = 520;
    const parts = [];
    const add = (t, d) => { t.setDepth(d || 51); parts.push(t); return t; };
    const scrim = add(this.add.rectangle(512, 320, 1024, 640, 0x07070f, 0.45).setAlpha(0), 49);
    this.tweens.add({ targets: scrim, alpha: 1, duration: 200 });

    // lay content out top-down from y=0, then shift into place
    const items = [];
    let y = 36;
    items.push([UI.label(this, x, 0, o.kicker, { style: { color: window.GAME.GOLD } }), y]); y += 44;
    items.push([UI.title(this, x, 0, o.title, { style: { fontSize: '36px', letterSpacing: 0 } }), y]); y += 46;
    const starObjs = [];
    if (o.stars) {
      for (let i = 0; i < 3; i++) { const s = this.add.image(x + (i - 1) * 56, 0, i < o.stars ? 'star' : 'star_dim').setScale(0); starObjs.push(s); items.push([s, y + 6]); }
      y += 44;
    }
    const body = this.add.text(x, 0, o.body, { fontFamily: UI.BODY, fontSize: '17px', fontStyle: '600', color: '#f3f4fb', align: 'center', wordWrap: { width: 440 } }).setOrigin(0.5, 0);
    items.push([body, y]); y += body.height + 12;
    const small = this.add.text(x, 0, o.small, { fontFamily: UI.BODY, fontSize: '14px', color: '#b9b3e0', align: 'center', wordWrap: { width: 440 }, lineSpacing: 4 }).setOrigin(0.5, 0);
    items.push([small, y]); y += small.height + 24;
    const btnY = y + 28; y += 56 + 28;
    const h = UI.grid(y);
    const top = cy - h / 2;
    const p = UI.panel(this, x, cy, w, h);
    add(p.gfx, 50);
    items.forEach(([obj, oy]) => { obj.y = top + oy; add(obj); });
    starObjs.forEach((s, i) => this.tweens.add({ targets: s, scale: i < o.stars ? 0.55 : 0.6, duration: 320, delay: 250 + i * 160, ease: 'Back.easeOut',
      onStart: () => { if (i < o.stars) window.Audio.sfx('star'); } }));

    const go = () => {
      if (this._cardGo !== go) return;
      this._cardGo = null;
      window.Audio.sfx('start');
      parts.forEach((t) => this.tweens.add({ targets: t, alpha: 0, duration: 160, onComplete: () => t.destroy() }));
      btn.destroy();
      o.onGo();
    };
    const btn = UI.button(this, x, top + btnY, 220, 56, o.button, go).setDepth(52);
    this._cardGo = go;
  }

  // =========================================================
  // INPUT
  // =========================================================
  _onPointer(p) {
    if (this.state === 'ask') {
      for (let i = 0; i < this.gems.length; i++) {
        const g = this.gems[i];
        if (g.active && Math.abs(p.x - g.c.x) < 90 && Math.abs(p.y - g.c.y) < 54) { this._pick(i); return; }
      }
    } else if (this.state === 'feedback') this._continueFromFeedback();
  }

  _onKey(e) {
    if (this.state === 'ask') {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4) this._pick(n - 1);
    } else if (this.state === 'feedback' && (e.key === 'Enter' || e.key === ' ')) this._continueFromFeedback();
    else if ((this.state === 'intro' || this.state === 'between') && (e.key === 'Enter' || e.key === ' ') && this._cardGo) this._cardGo();
  }

  update(time, delta) {
    if (this.state !== 'ask' || !this.timed) return;
    // Real elapsed time (not clamped per-frame), so the time limit is the same on
    // fast and slow machines. Capped per frame so a background tab doesn't skip
    // ahead, and it doesn't advance while the scene is paused (teacher panel).
    this.fallElapsed += Math.min(delta, 250);
    const t = Math.max(0, this.fallElapsed - 700) / 1000; // let the entry animation finish first
    let lowest = 0;
    for (let i = 0; i < this.gems.length; i++) {
      const g = this.gems[i];
      if (!g.active || t <= 0) continue;
      g.c.y = g.baseY + this.fallSpeed * t;
      if (g.c.y > lowest) lowest = g.c.y;
    }
    const danger = Phaser.Math.Clamp((lowest - 380) / (this.HORIZON - 52 - 380), 0, 1);
    this.horizon.setAlpha(0.5 + danger * 0.5);
    if (lowest >= this.HORIZON - 52) this._resolve(null, null);
  }

  // =========================================================
  // HELPERS
  // =========================================================
  _say(str, mood) {
    this.lumi.setTexture(mood === 'happy' ? 'lumi_happy' : mood === 'think' ? 'lumi_think' : 'lumi');
    Juice.squashStretch(this, this.lumi, 0.08, 180);
    this.bubble.setText(str).setAlpha(1).setScale(0.6);
    this.tweens.killTweensOf(this.bubble);
    this.tweens.add({ targets: this.bubble, scale: 1, duration: 240, ease: 'Back.easeOut' });
  }

  // shrink text until it fits a box
  _fitText(t, str, max, min, w, h) {
    t.setText(str);
    let size = max;
    t.setFontSize(size);
    t.setWordWrapWidth(w, true);
    while ((t.height > h || t.width > w) && size > min) { size -= 2; t.setFontSize(size); }
  }
};
