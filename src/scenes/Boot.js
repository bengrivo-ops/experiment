// Boot: audio unlock, header controls, wait for fonts.
window.BootScene = class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    const unlock = () => window.Audio.unlock();
    this.input.once('pointerdown', unlock);
    this.input.keyboard.once('keydown', unlock);

    const game = this.game;
    const mute = document.getElementById('btn-mute');
    const menu = document.getElementById('btn-reset');
    if (mute && !mute.__wired) {
      mute.__wired = true;
      mute.addEventListener('click', () => {
        window.Audio.unlock();
        const m = window.Audio.toggleMute();
        mute.textContent = m ? 'MUTED' : 'SOUND';
        mute.style.color = m ? 'var(--accent)' : '';
        if (!m && game.scene.isActive('Game')) window.Audio.startMusic();
      });
    }
    if (menu && !menu.__wired) {
      menu.__wired = true;
      menu.addEventListener('click', () => {
        window.Audio.unlock();
        game.scene.getScenes(true).forEach((s) => { if (s.scene.key !== 'Boot') game.scene.stop(s.scene.key); });
        game.scene.start('Menu');
      });
    }
    window.Teacher.init(game);

    (window.__fontsReady || Promise.resolve()).then(() => this.scene.start('Preload'));
  }
};
