// Results: formative summary for student + teacher.
window.ResultsScene = class ResultsScene extends Phaser.Scene {
  constructor() { super('Results'); }
  init(d) { this.d = d; }

  create() {
    const W = window.GAME.WIDTH, H = window.GAME.HEIGHT, d = this.d, r = d.report;
    this.cameras.main.fadeIn(300, 10, 13, 46);
    this.add.image(W / 2, H / 2, 'bg').setDisplaySize(W, H);
    UI.scrim(this, 0.35);

    // best score per topic
    const key = window.GAME.BEST_KEY + d.topicId;
    let prev = 0; try { prev = parseInt(localStorage.getItem(key) || '0', 10); } catch (e) { /* ignore */ }
    const isBest = d.score > prev;
    if (isBest) { try { localStorage.setItem(key, String(d.score)); } catch (e) { /* ignore */ } }

    UI.label(this, W / 2, 40, d.topicTitle + '  ·  session complete', { style: { color: window.GAME.GOLD } });
    const title = UI.title(this, W / 2, 82, 'You lit up the sky!', { style: { fontSize: '40px' } }).setScale(0);
    this.tweens.add({ targets: title, scale: 1, duration: 450, ease: 'Back.easeOut' });

    // stars earned (out of 9)
    for (let i = 0; i < r.maxStars; i++) {
      const lit = i < r.stars;
      const s = this.add.image(W / 2 + (i - (r.maxStars - 1) / 2) * 40, 136, lit ? 'star' : 'star_dim').setScale(0);
      this.tweens.add({ targets: s, scale: lit ? 0.4 : 0.45, duration: 300, delay: 300 + i * 90, ease: 'Back.easeOut',
        onStart: () => { if (lit) window.Audio.sfx('star'); } });
    }

    // ---- left: stats ----
    const lx = 296, py = 330;
    UI.panel(this, lx, py, 400, 296, { title: 'How it went' });
    const pct = Math.round(r.accuracy * 100);
    const m = Math.floor(d.ms / 60000), s = Math.round((d.ms % 60000) / 1000);
    const stats = [
      ['First-try accuracy', `${pct}%`, `${r.firstTryCorrect} of ${r.total} items`],
      ['Items mastered', `${r.total}/${r.total}`, 'every item answered correctly'],
      ['Time on task', `${m}:${String(s).padStart(2, '0')}`, 'minutes : seconds'],
      ['Score', String(d.score), isBest ? 'new personal best!' : `best streak ×${d.bestStreak}`],
    ];
    stats.forEach((st, i) => {
      const y = py - 92 + i * 60;
      this.add.text(lx - 168, y, st[0], { fontFamily: UI.BODY, fontSize: '14px', fontStyle: '600', color: '#d9d5f5' }).setOrigin(0, 0.5);
      this.add.text(lx - 168, y + 18, st[2], { fontFamily: UI.BODY, fontSize: '12px', color: '#8f88c2' }).setOrigin(0, 0.5);
      this.add.text(lx + 168, y + 8, st[1], { fontFamily: UI.DISPLAY, fontSize: '26px', fontStyle: '700', color: i === 0 ? window.GAME.GOLD : '#ffffff' }).setOrigin(1, 0.5);
    });

    // ---- right: what to practise next ----
    const rx = 728;
    UI.panel(this, rx, py, 400, 296, { title: 'Practise next' });
    if (r.review.length === 0) {
      UI.body(this, rx, py - 10, 'Every item right on the first try!\nTry a longer session or a new topic.', { style: { fontSize: '15px', color: '#f3f4fb', align: 'center' } });
    } else {
      r.review.slice(0, 5).forEach((it, i) => {
        const y = py - 92 + i * 44;
        const t = this.add.text(rx - 168, y, `${it.q}  →  ${it.a}`, { fontFamily: UI.DISPLAY, fontSize: '16px', fontStyle: '600', color: '#ffffff' }).setOrigin(0, 0.5);
        if (t.width > 280) t.setFontSize(13);
        this.add.text(rx + 168, y, `missed ×${it.misses}`, { fontFamily: UI.BODY, fontSize: '12px', fontStyle: '600', color: '#ffb3a6' }).setOrigin(1, 0.5);
      });
      if (r.review.length > 5) UI.body(this, rx, py + 128, `+${r.review.length - 5} more in the copied report`, { style: { fontSize: '12px' } });
    }

    // ---- buttons ----
    const by = 548;
    UI.button(this, W / 2 - 252, by, 224, 56, 'PLAY AGAIN', () => this._go('Game', { topicId: d.topicId }));
    UI.button(this, W / 2, by, 224, 56, 'NEW TOPIC', () => this._go('Menu'), { ghost: true });
    this.copyBtn = UI.button(this, W / 2 + 252, by, 224, 56, 'COPY REPORT', () => this._copy(), { ghost: true });
    UI.body(this, W / 2, 600, 'Spaced practice works best: replay this topic tomorrow to lock it in.', { style: { fontSize: '13px' } });

    const lumi = this.add.image(72, 560, 'lumi_happy').setScale(0.36);
    this.tweens.add({ targets: lumi, y: 548, angle: { from: -4, to: 4 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.time.delayedCall(400, () => { Juice.burstParticles(this, W / 2, 136, UI.hex(window.GAME.GOLD), 30); window.Audio.sfx('level'); });

    this.input.keyboard.on('keydown-ENTER', () => this._go('Game', { topicId: d.topicId }));
  }

  _go(scene, data) {
    if (this._leaving) return;
    this._leaving = true;
    window.Audio.sfx('start');
    this.cameras.main.fade(240, 10, 13, 46);
    this.time.delayedCall(250, () => this.scene.start(scene, data));
  }

  _copy() {
    const d = this.d, r = d.report;
    const lines = [
      `Lumi's Constellations · ${d.topicTitle} · ${new Date().toLocaleString()}`,
      `First-try accuracy: ${Math.round(r.accuracy * 100)}% (${r.firstTryCorrect}/${r.total})`,
      `Stars: ${r.stars}/${r.maxStars} · Score: ${d.score} · Time: ${Math.round(d.ms / 1000)}s`,
      r.review.length ? 'Practise next:' : 'All items correct on the first try.',
      ...r.review.map((it) => `  - ${it.q} = ${it.a} (missed ${it.misses}×)`),
    ];
    const text = lines.join('\n');
    const done = () => { this.copyBtn.setLabel('COPIED ✓'); window.Audio.sfx('correct'); this.time.delayedCall(1800, () => this.copyBtn.setLabel('COPY REPORT')); };
    const fallback = () => {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) { /* ignore */ } ta.remove(); done();
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  }
};
