// =============================================================
// GAME CONFIG / TUNING
// =============================================================
window.GAME = {
  WIDTH: 1024,
  HEIGHT: 640,          // landscape: laptops, Chromebooks, classroom boards
  TITLE: "Lumi's Constellations",
  SUBTITLE: 'Light up the sky by remembering what you learn',
  BG_COLOR: '#0a0d2e',
  ACCENT: '#6c5ce7',
  GOLD: '#ffc94a',
  BEST_KEY: 'lumi-best-',   // + topic id

  tuning: {
    pointsCorrect: 10,
    streakBonus: 2,       // extra points per streak step (capped)
    streakCap: 5,
    feedbackMinMs: 900,   // a miss's explanation stays up at least this long
    feedbackAutoMs: 7000, // then continues by itself if no tap
    nextDelayMs: 650,     // pause after a correct answer
  },
};

// Teacher settings (persisted per device; edited in the Teacher panel)
window.Settings = (function () {
  const KEY = 'lumi-settings';
  const def = { calm: false, size: 10 };
  let s = def;
  try { s = { ...def, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { s = def; }
  s.save = function () { try { localStorage.setItem(KEY, JSON.stringify({ calm: s.calm, size: s.size })); } catch (e) { /* ignore */ } };
  return s;
})();
