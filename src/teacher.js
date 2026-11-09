// Teacher panel: custom deck editor + settings + rationale.
window.Teacher = (function () {
  const $ = (id) => document.getElementById(id);
  const SAMPLE = [
    'Capital of France = Paris | Paris has been the capital since the 10th century',
    'Capital of Italy = Rome | Rome: the "Eternal City" on the Tiber',
    'Capital of Spain = Madrid | Madrid sits right in the centre of Spain',
    'Capital of Germany = Berlin | Berlin became the capital again in 1990',
    'Capital of Portugal = Lisbon | Lisbon is on the Atlantic coast',
    'Capital of Greece = Athens | Athens is named after the goddess Athena',
    'Capital of Japan = Tokyo | Tokyo means "eastern capital"',
    'Capital of Canada = Ottawa | Not Toronto! Ottawa was chosen in 1857',
    'Capital of Australia = Canberra | Not Sydney! Canberra was built as a compromise',
    'Capital of Egypt = Cairo | Cairo lies on the river Nile',
  ].join('\n');
  let game = null, pausedKey = null;

  function status() {
    const { items, errors } = Content.parseDeck($('t-deck').value);
    const el = $('t-status');
    if (errors.length) { el.textContent = errors[0]; el.className = 't-status err'; return false; }
    if (items.length < 4) { el.textContent = `${items.length} question${items.length === 1 ? '' : 's'}. Add at least 4.`; el.className = 't-status'; return false; }
    el.textContent = `${items.length} questions ready ✓`; el.className = 't-status ok'; return true;
  }

  function tab(name) {
    document.querySelectorAll('.t-tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
    document.querySelectorAll('.t-pane').forEach((p) => { p.hidden = p.dataset.pane !== name; });
  }

  function open(which) {
    if (!game) return;
    $('t-deck').value = Content.customDeckText();
    $('t-calm').checked = !!Settings.calm;
    $('t-size').value = String(Settings.size);
    status();
    tab(which || 'deck');
    // freeze the game underneath so nothing moves or steals keys
    pausedKey = game.scene.isActive('Game') ? 'Game' : null;
    if (pausedKey) game.scene.pause('Game');
    game.input.keyboard.enabled = false;
    game.input.enabled = false; // DOM clicks on the panel must not reach canvas objects underneath
    $('teacher').hidden = false;
    setTimeout(() => (which === 'deck' || !which) && $('t-deck').focus(), 30);
  }

  function close() {
    $('teacher').hidden = true;
    game.input.keyboard.enabled = true;
    setTimeout(() => { game.input.enabled = true; }, 50); // after this click finishes
    if (pausedKey) game.scene.resume(pausedKey);
    pausedKey = null;
    if (game.scene.isActive('Menu')) game.scene.getScene('Menu').scene.restart(); // refresh "My Deck" card
  }

  function init(g) {
    game = g;
    if ($('btn-teacher').__wired) return;
    $('btn-teacher').__wired = true;
    $('btn-teacher').addEventListener('click', () => open());
    $('t-close').addEventListener('click', close);
    $('teacher').addEventListener('click', (e) => { if (e.target.id === 'teacher') close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('teacher').hidden) close(); });
    document.querySelectorAll('.t-tab').forEach((b) => b.addEventListener('click', () => tab(b.dataset.tab)));
    $('t-deck').addEventListener('input', status);
    $('t-sample').addEventListener('click', () => { $('t-deck').value = SAMPLE; status(); });
    $('t-save').addEventListener('click', () => {
      Content.saveCustomDeck($('t-deck').value);
      const ok = status();
      $('t-status').textContent = ok ? 'Saved ✓ Choose "My Deck" on the topic screen.' : 'Saved, but you need at least 4 valid questions to play.';
    });
    $('t-calm').addEventListener('change', (e) => { Settings.calm = e.target.checked; Settings.save(); });
    $('t-size').addEventListener('change', (e) => { Settings.size = parseInt(e.target.value, 10); Settings.save(); });
  }

  return { init, open, close };
})();
