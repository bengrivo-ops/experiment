// main: boot Phaser.
window.addEventListener('load', () => {
  window.__game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: window.GAME.WIDTH,
    height: window.GAME.HEIGHT,
    backgroundColor: window.GAME.BG_COLOR,
    resolution: 1, // never oversample: locked 60fps on school laptops
    render: { pixelArt: false, antialias: true },
    audio: { noAudio: true }, // all sound is our own Web Audio synth
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: window.GAME.WIDTH, height: window.GAME.HEIGHT },
    scene: [window.BootScene, window.PreloadScene, window.MenuScene, window.GameScene, window.ResultsScene],
  });
});
