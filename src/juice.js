// =============================================================
// JUICE — game-feel helpers. Pass the scene in; these use Phaser
// tweens/cameras/particles. Juice scales with importance.
// =============================================================
window.Juice = {
  // Camera screen shake. intensity ~0.002 light .. 0.02 big.
  screenShake(scene, duration = 150, intensity = 0.008) {
    scene.cameras.main.shake(duration, intensity);
  },

  // Freeze the world briefly (hit-stop). Pauses physics + tweens.
  hitStop(scene, ms = 60) {
    if (scene.physics && scene.physics.world) scene.physics.world.pause();
    scene.tweens.timeScale = 0;
    scene.time.delayedCall(ms, () => {
      scene.tweens.timeScale = 1;
      if (scene.physics && scene.physics.world) scene.physics.world.resume();
    });
  },

  // Particle pop at a point. color is a 0xRRGGBB number.
  burstParticles(scene, x, y, color = 0xffffff, count = 14) {
    // Ensure a 1px white particle texture exists (reused).
    if (!scene.textures.exists('__juiceDot')) {
      const g = scene.add.graphics();
      g.fillStyle(0xffffff, 1);
      g.fillCircle(4, 4, 4);
      g.generateTexture('__juiceDot', 8, 8);
      g.destroy();
    }
    const emitter = scene.add.particles(x, y, '__juiceDot', {
      speed: { min: 80, max: 260 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.9, end: 0 },
      lifespan: { min: 250, max: 550 },
      gravityY: 300,
      tint: color,
      quantity: count,
      blendMode: 'ADD',
      emitting: false,
    });
    emitter.explode(count, 0, 0);
    scene.time.delayedCall(700, () => emitter.destroy());
  },

  // 1-frame full-screen white flash.
  flash(scene, duration = 90, color = [255, 255, 255]) {
    scene.cameras.main.flash(duration, color[0], color[1], color[2]);
  },

  // Squash & stretch pop on a game object.
  squashStretch(scene, obj, amount = 0.28, duration = 120) {
    if (!obj || !obj.scene) return;
    const sx = obj.scaleX, sy = obj.scaleY;
    scene.tweens.add({
      targets: obj,
      scaleX: sx * (1 + amount),
      scaleY: sy * (1 - amount),
      duration: duration / 2,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  },

  // Floating score popup text that rises and fades.
  scorePopup(scene, x, y, text, color = '#ffffff') {
    const t = scene.add.text(x, y, text, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color,
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(1000);
    scene.tweens.add({
      targets: t,
      y: y - 60,
      alpha: 0,
      scale: 1.3,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  },
};
