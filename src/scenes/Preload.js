// Preload: load all art with a progress bar.
window.PreloadScene = class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    const W = window.GAME.WIDTH, H = window.GAME.HEIGHT;
    const barW = 360, barH = 14, barX = (W - barW) / 2, barY = H / 2;
    const box = this.add.graphics().fillStyle(0xffffff, 0.08).fillRoundedRect(barX, barY, barW, barH, 7);
    const bar = this.add.graphics();
    const label = UI.label(this, W / 2, barY - 28, 'Mapping the stars');
    this.load.on('progress', (v) => {
      bar.clear().fillStyle(UI.hex(window.GAME.GOLD), 1).fillRoundedRect(barX, barY, Math.max(barH, barW * v), barH, 7);
    });
    this.load.on('complete', () => { box.destroy(); bar.destroy(); label.destroy(); });

    ['bg', 'bg_play', 'lumi', 'lumi_happy', 'lumi_think', 'gem', 'gem_ok', 'gem_bad', 'star', 'star_dim',
     'icon_times', 'icon_fractions', 'icon_spanish', 'icon_space', 'icon_custom']
      .forEach((k) => this.load.image(k, `assets/${k}.png`));
  }

  create() {
    // soft round particle used by the juice helpers
    const g = this.add.graphics().fillStyle(0xffffff, 1).fillCircle(4, 4, 4);
    g.generateTexture('__juiceDot', 8, 8); g.destroy();
    this.scene.start('Menu');
  }
};
