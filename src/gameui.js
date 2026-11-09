// =============================================================
// gameui.js — CCC GAME UI helper (in-canvas Phaser UI)
// The website "design bar" as a Phaser toolkit: frosted-glass
// panels, one consistent pill button, a fixed type scale, and a
// clean aligned HUD strip — all snapped to an 8px grid with one
// accent colour. Dependency-free (pure Phaser graphics + text).
//
//   UI.panel(scene, x, y, w, h, {title})  -> frosted rounded panel
//   UI.button(scene, x, y, w, h, label, onClick) -> pill button
//   UI.title / UI.label / UI.value         -> type-scale text
//   UI.hudBar(scene)                       -> top HUD strip
//
// Everything is centered/aligned and baseline-correct. Future
// games use these instead of ad-hoc text + rectangles.
// =============================================================
(function () {
  // 8px spacing scale — snap any layout number through UI.grid().
  const GRID = 8;
  const grid = (n) => Math.round(n / GRID) * GRID;

  const hex = (c) => Phaser.Display.Color.HexStringToColor(c).color;

  // ---- palette (mirrors game-ui.css tokens) -----------------
  const palette = {
    accent:  (window.GAME && window.GAME.ACCENT) || '#6c5ce7',
    glass:   0x12121e,   // frosted panel fill
    glassA:  0.55,       // panel fill alpha
    border:  0xffffff,   // panel/border light line
    borderA: 0.10,
    panel:   0x0b0b16,   // solid sub-panel
    text:    '#f3f4fb',
    muted:   '#9aa0c0',
    success: '#3ddc84',
    danger:  '#ff5b6e',
    radius:  16,
  };

  // ---- type scale (display = Space Grotesk, body = Inter) ----
  const DISPLAY = '"Space Grotesk", system-ui, sans-serif';
  const BODY = '"Inter", system-ui, sans-serif';
  const TYPE = {
    title: { fontFamily: DISPLAY, fontSize: '44px', fontStyle: '700', color: palette.text, letterSpacing: 1 },
    h2:    { fontFamily: DISPLAY, fontSize: '26px', fontStyle: '700', color: palette.text },
    label: { fontFamily: BODY,    fontSize: '13px', fontStyle: '600', color: palette.muted, letterSpacing: 1.5 },
    value: { fontFamily: DISPLAY, fontSize: '24px', fontStyle: '700', color: palette.text },
    body:  { fontFamily: BODY,    fontSize: '15px', fontStyle: '400', color: palette.muted },
    btn:   { fontFamily: DISPLAY, fontSize: '20px', fontStyle: '700', color: '#ffffff', letterSpacing: 1 },
  };

  // Apply a small kerning approximation (Phaser has no letterSpacing
  // pre-3.80 on all builds, so we set it where supported, no-op else).
  function mkText(scene, x, y, str, style, origin) {
    const t = scene.add.text(x, y, str, style).setOrigin(origin === undefined ? 0.5 : origin);
    if (style.letterSpacing && t.setLetterSpacing) t.setLetterSpacing(style.letterSpacing);
    return t;
  }

  // ---- frosted-glass rounded panel --------------------------
  // Returns a container { gfx, title?, x, y, w, h } centered on x,y.
  function panel(scene, x, y, w, h, opts = {}) {
    w = grid(w); h = grid(h);
    const r = opts.radius != null ? opts.radius : palette.radius;
    const left = x - w / 2, top = y - h / 2;
    const g = scene.add.graphics();
    // soft drop shadow
    g.fillStyle(0x000000, 0.35).fillRoundedRect(left, top + 6, w, h, r);
    // frosted fill
    g.fillStyle(palette.glass, palette.glassA).fillRoundedRect(left, top, w, h, r);
    // 1px light border
    g.lineStyle(1, palette.border, palette.borderA + 0.06).strokeRoundedRect(left, top, w, h, r);
    // top inner sheen
    g.fillStyle(0xffffff, 0.04).fillRoundedRect(left + 1, top + 1, w - 2, Math.min(h * 0.4, 60), r);

    const out = { gfx: g, x, y, w, h, left, top };
    if (opts.title) {
      out.title = mkText(scene, x, top + grid(20), opts.title, TYPE.label, 0.5)
        .setText(String(opts.title).toUpperCase());
    }
    return out;
  }

  // ---- consistent pill button -------------------------------
  // Accent fill, rounded, centered display-font label, hover
  // lighten+scale, press feedback. Returns { container, setLabel }.
  function button(scene, x, y, w, h, label, onClick, opts = {}) {
    w = grid(w); h = grid(h);
    const r = h / 2; // pill
    const accent = hex(opts.accent || palette.accent);
    const ghost = !!opts.ghost;

    const g = scene.add.graphics();
    const draw = (fillA, lighten) => {
      g.clear();
      if (ghost) {
        g.fillStyle(0xffffff, 0.05 + (lighten ? 0.05 : 0)).fillRoundedRect(-w / 2, -h / 2, w, h, r);
        g.lineStyle(1.5, accent, 0.9).strokeRoundedRect(-w / 2, -h / 2, w, h, r);
      } else {
        const col = lighten ? Phaser.Display.Color.IntegerToColor(accent).brighten(14).color : accent;
        g.fillStyle(0x000000, 0.30).fillRoundedRect(-w / 2, -h / 2 + 4, w, h, r);
        g.fillStyle(col, 1).fillRoundedRect(-w / 2, -h / 2, w, h, r);
        g.fillStyle(0xffffff, 0.18).fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h * 0.42, r);
      }
    };
    draw(1, false);

    const txt = scene.add.text(0, 0, String(label), {
      ...TYPE.btn, color: ghost ? '#ffffff' : '#ffffff',
    }).setOrigin(0.5);
    if (TYPE.btn.letterSpacing && txt.setLetterSpacing) txt.setLetterSpacing(TYPE.btn.letterSpacing);

    const c = scene.add.container(x, y, [g, txt]).setSize(w, h);

    // INPUT lives on a dedicated top-level interactive Rectangle, NOT on the
    // container. Plain Rectangles hit-test reliably; Container hitAreas can
    // silently fail to register a click (Phaser quirk) — that caused buttons
    // to need several clicks. The container stays visual-only.
    const hit = scene.add.rectangle(x, y, w, h, 0xffffff, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { draw(1, true); scene.tweens.add({ targets: c, scale: 1.04, duration: 120, ease: 'Quad.easeOut' }); });
    hit.on('pointerout',  () => { draw(1, false); scene.tweens.add({ targets: c, scale: 1.0, duration: 120, ease: 'Quad.easeOut' }); });
    hit.on('pointerdown', () => { scene.tweens.add({ targets: c, scale: 0.96, duration: 80, yoyo: true, ease: 'Quad.easeOut' }); if (onClick) onClick(); });

    // keep the visual + its hit zone together for depth and teardown
    const _setDepth = c.setDepth.bind(c);
    c.setDepth = (d) => { _setDepth(d); hit.setDepth(d); return c; };
    const _destroy = c.destroy.bind(c);
    c.destroy = function (fromScene) { if (hit && hit.scene) hit.destroy(); _destroy(fromScene); };
    c.setLabel = (s) => txt.setText(String(s));
    c._hit = hit;
    return c;
  }

  // ---- type-scale text helpers (aligned/baseline-correct) ---
  function title(scene, x, y, str, opts = {}) {
    const t = mkText(scene, x, y, String(str), { ...TYPE.title, ...(opts.style || {}) }, opts.origin);
    return t;
  }
  function label(scene, x, y, str, opts = {}) {
    const t = mkText(scene, x, y, String(str).toUpperCase(), { ...TYPE.label, ...(opts.style || {}) }, opts.origin);
    return t;
  }
  function value(scene, x, y, str, opts = {}) {
    const t = mkText(scene, x, y, String(str), { ...TYPE.value, ...(opts.style || {}) }, opts.origin);
    return t;
  }
  function body(scene, x, y, str, opts = {}) {
    const t = mkText(scene, x, y, String(str), { ...TYPE.body, ...(opts.style || {}) }, opts.origin);
    return t;
  }

  // ---- top HUD strip ----------------------------------------
  // A clean frosted bar across the top with evenly-spaced,
  // aligned stat slots. slots = [{ label, value }]. Returns an
  // object whose .set(index|labelKey, value) updates a slot — all
  // values stay center-aligned to their column.
  function hudBar(scene, slots, opts = {}) {
    const W = (opts.width != null ? opts.width : (scene.scale ? scene.scale.width : window.GAME.WIDTH));
    const margin = grid(opts.margin != null ? opts.margin : 16);
    const h = grid(opts.height != null ? opts.height : 56);
    const y = grid(opts.y != null ? opts.y : 16) + h / 2;
    const w = W - margin * 2;
    const x = W / 2;

    const pnl = panel(scene, x, y, w, h, { radius: 12 });
    pnl.gfx.setDepth(opts.depth || 500);

    const n = slots.length;
    const colW = w / n;
    const startX = x - w / 2;
    const byKey = {};
    const refs = [];

    slots.forEach((slot, i) => {
      const cx = startX + colW * (i + 0.5);
      const lt = mkText(scene, cx, y - grid(10), String(slot.label).toUpperCase(), TYPE.label, 0.5)
        .setDepth((opts.depth || 500) + 1);
      const vt = mkText(scene, cx, y + grid(8), String(slot.value != null ? slot.value : '—'),
        { ...TYPE.value, fontSize: '20px', color: slot.color || palette.text }, 0.5)
        .setDepth((opts.depth || 500) + 1);
      // divider between slots
      if (i > 0) {
        scene.add.graphics().setDepth((opts.depth || 500) + 1)
          .lineStyle(1, palette.border, 0.10)
          .lineBetween(startX + colW * i, y - h / 2 + grid(10), startX + colW * i, y + h / 2 - grid(10));
      }
      const ref = { label: lt, value: vt };
      refs.push(ref);
      if (slot.key) byKey[slot.key] = ref;
    });

    return {
      panel: pnl,
      set(which, v) {
        const ref = typeof which === 'number' ? refs[which] : byKey[which];
        if (ref) ref.value.setText(String(v));
      },
      setColor(which, col) {
        const ref = typeof which === 'number' ? refs[which] : byKey[which];
        if (ref) ref.value.setColor(col);
      },
      refs, byKey, y, height: h,
    };
  }

  // ---- modal scrim (for menu / game-over dim) ---------------
  function scrim(scene, alpha) {
    const W = scene.scale ? scene.scale.width : window.GAME.WIDTH;
    const H = scene.scale ? scene.scale.height : window.GAME.HEIGHT;
    return scene.add.rectangle(W / 2, H / 2, W, H, 0x07070f, alpha == null ? 0.55 : alpha);
  }

  // ---- HTML chrome bridge -----------------------------------
  // Reflect the game title into the .stage header.
  function setStageTitle(str) {
    const el = document.querySelector('.stage-title');
    if (!el) return;
    const dot = el.querySelector('.dot');
    el.textContent = '';
    if (dot) el.appendChild(dot);
    el.appendChild(document.createTextNode(str));
  }

  // Wire the HTML control cluster (mute / restart) to the game.
  // Mute toggles Audio; restart re-launches the active Game scene
  // (or Menu if no Game is running). Idempotent.
  function wireControls(game) {
    const mute = document.getElementById('btn-mute');
    const reset = document.getElementById('btn-reset');
    if (mute && !mute.__wired) {
      mute.__wired = true;
      mute.addEventListener('click', () => {
        if (window.Audio && window.Audio.toggleMute) {
          const muted = window.Audio.toggleMute();
          mute.textContent = muted ? 'MUTED' : 'SOUND';
          mute.style.color = muted ? 'var(--accent)' : '';
        }
      });
    }
    if (reset && !reset.__wired) {
      reset.__wired = true;
      reset.addEventListener('click', () => {
        if (window.Audio && window.Audio.unlock) window.Audio.unlock();
        const sm = game.scene;
        const target = sm.isActive('Game') ? 'Game' : (sm.isActive('GameOver') ? 'Game' : 'Menu');
        sm.getScenes(true).forEach((s) => { if (s.scene.key !== 'Boot') sm.stop(s.scene.key); });
        sm.start(target);
      });
    }
  }

  window.UI = {
    GRID, grid, hex, palette, TYPE, DISPLAY, BODY,
    panel, button, title, label, value, body, hudBar, scrim,
    setStageTitle, wireControls,
  };
})();
