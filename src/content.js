// =============================================================
// CONTENT — topic packs + the custom-deck parser.
//
// Every item: { q, a, why, d? }
//   q   prompt shown to the student
//   a   the correct answer
//   why short explanation shown on a miss (feedback that teaches)
//   d   hand-picked distractors (common misconceptions / errors).
//       If omitted, distractors are drawn from other answers in
//       the same pack.
// =============================================================
(function () {
  // ---- Times tables: generated, with strategy explanations and
  //      error-based distractors (neighbouring facts). -----------
  function timesItem(a, b) {
    const p = a * b;
    let why;
    if (a === 9 || b === 9) {
      const o = a === 9 ? b : a;
      why = `×9 trick: ${o} × 10 = ${o * 10}, then take away ${o} → ${p}`;
    } else if (b % 2 === 0 || a % 2 === 0) {
      const even = b % 2 === 0 ? b : a, other = even === b ? a : b;
      const half = other * (even / 2);
      why = `Double it: ${other} × ${even / 2} = ${half}, doubled = ${p}`;
    } else {
      // split the bigger factor into 5 + the rest (e.g. 7 × 3 = 3 × 5 + 3 × 2)
      const big = Math.max(a, b), small = Math.min(a, b), rest = big - 5;
      why = `Split it: ${small} × 5 = ${small * 5}, plus ${small} × ${rest} = ${small * rest} → ${p}`;
    }
    const d = [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, p + 10, p - 2]
      .filter((n) => n > 0 && n !== p);
    return { q: `${a} × ${b}`, a: String(p), why, d: [...new Set(d)].map(String) };
  }
  function timesPool() {
    const out = [];
    for (let a = 6; a <= 9; a++) for (let b = 3; b <= 9; b++) out.push(timesItem(a, b));
    return out;
  }

  const fractions = [
    { q: '1/2 as a decimal', a: '0.5', why: '1 ÷ 2 = 0.5  (half of one whole)', d: ['0.12', '1.2', '0.2'] },
    { q: '1/4 as a decimal', a: '0.25', why: '1 ÷ 4 = 0.25  (a quarter of 100 is 25)', d: ['0.14', '0.4', '1.4'] },
    { q: '3/4 as a decimal', a: '0.75', why: '3 quarters = 3 × 0.25 = 0.75', d: ['0.34', '0.43', '3.4'] },
    { q: '1/5 as a decimal', a: '0.2', why: '1 ÷ 5 = 0.2  (5 fifths make 1.0)', d: ['0.15', '0.5', '1.5'] },
    { q: '2/5 as a decimal', a: '0.4', why: '2 fifths = 2 × 0.2 = 0.4', d: ['0.25', '2.5', '0.52'] },
    { q: '3/10 as a decimal', a: '0.3', why: 'Tenths go in the first decimal place: 0.3', d: ['0.03', '3.1', '0.310'] },
    { q: '1/4 as a percent', a: '25%', why: 'Per cent means "out of 100": 1/4 = 25/100 = 25%', d: ['14%', '40%', '4%'] },
    { q: '3/4 as a percent', a: '75%', why: '3/4 = 75/100 = 75%', d: ['34%', '43%', '60%'] },
    { q: '0.6 as a percent', a: '60%', why: 'Multiply by 100: 0.6 × 100 = 60%', d: ['6%', '0.6%', '16%'] },
    { q: '0.05 as a percent', a: '5%', why: '0.05 × 100 = 5%  (5 hundredths)', d: ['50%', '0.5%', '15%'] },
    { q: '50% as a fraction', a: '1/2', why: '50/100 simplifies to 1/2', d: ['1/50', '2/5', '1/5'] },
    { q: '0.2 as a fraction', a: '1/5', why: '0.2 = 2/10 = 1/5', d: ['1/2', '2/100', '1/20'] },
  ];

  const spanish = [
    { q: 'the cat', a: 'el gato', why: '"gato" ends in -o → usually masculine → "el"', d: ['la gata', 'el gata', 'la gato'] },
    { q: 'the house', a: 'la casa', why: '"casa" ends in -a → usually feminine → "la"', d: ['el casa', 'la cosa', 'el caso'] },
    { q: 'the book', a: 'el libro', why: 'Think "library" → libro = book (masculine, -o)', d: ['la libra', 'el libre', 'la libro'] },
    { q: 'the library', a: 'la biblioteca', why: 'False friend! "librería" means bookshop, not library', d: ['la librería', 'el libro', 'el bibliotec'] },
    { q: 'the water', a: 'el agua', why: 'Feminine, but uses "el" to avoid "la a-" sounds (el agua fría)', d: ['la agua', 'el aguo', 'las agua'] },
    { q: 'the day', a: 'el día', why: 'Exception: ends in -a but is masculine → "el día"', d: ['la día', 'el dio', 'la dia'] },
    { q: 'the hand', a: 'la mano', why: 'Exception: ends in -o but is feminine → "la mano"', d: ['el mano', 'la mana', 'el mana'] },
    { q: 'the dog', a: 'el perro', why: 'perro (dog) has a rolled double "rr"; pero = but', d: ['el pero', 'la perra', 'el pelo'] },
    { q: 'the window', a: 'la ventana', why: 'Think "vent" → air comes in through la ventana', d: ['el ventano', 'la venta', 'el viento'] },
    { q: 'the apple', a: 'la manzana', why: 'manzana (apple) ends in -a → feminine "la"', d: ['el manzano', 'la mañana', 'la mansana'] },
    { q: 'the school', a: 'la escuela', why: 'Sounds like "school-a" → la escuela', d: ['el escuelo', 'la escula', 'el colegia'] },
    { q: 'the bread', a: 'el pan', why: 'Think "pan" → panini, pantry. Masculine: el pan', d: ['la pana', 'el pane', 'la pan'] },
  ];

  const space = [
    { q: 'Largest planet in our Solar System?', a: 'Jupiter', why: 'Jupiter is so big that over 1,300 Earths could fit inside it', d: ['Saturn', 'The Sun', 'Neptune'] },
    { q: 'Planet closest to the Sun?', a: 'Mercury', why: 'Order: Mercury, Venus, Earth, Mars… ("My Very Easy Method…")', d: ['Venus', 'Mars', 'Earth'] },
    { q: 'Hottest planet?', a: 'Venus', why: 'Venus’s thick CO₂ atmosphere traps heat; it is hotter than Mercury!', d: ['Mercury', 'Mars', 'Jupiter'] },
    { q: 'Which is called the Red Planet?', a: 'Mars', why: 'Iron oxide (rust) in Mars’s soil makes it look red', d: ['Jupiter', 'Venus', 'Mercury'] },
    { q: 'Which planet spins on its side?', a: 'Uranus', why: 'Uranus is tilted about 98°, probably after an ancient collision', d: ['Neptune', 'Saturn', 'Venus'] },
    { q: 'Farthest planet from the Sun?', a: 'Neptune', why: 'Neptune is 8th. Pluto was reclassified as a dwarf planet in 2006', d: ['Pluto', 'Uranus', 'Saturn'] },
    { q: 'What causes day and night?', a: 'Earth spinning', why: 'Earth rotates once every 24 h; orbiting the Sun takes a year', d: ['Earth orbiting', 'The Moon', 'Clouds'] },
    { q: 'What causes the seasons?', a: 'Earth’s tilt', why: 'Earth’s 23.5° tilt changes how directly sunlight hits us, not distance', d: ['Distance to Sun', 'The Moon', 'Sun’s heat changes'] },
    { q: 'Where does moonlight come from?', a: 'Reflected sunlight', why: 'The Moon makes no light of its own; it reflects the Sun’s light', d: ['Moon’s own glow', 'Earth’s light', 'Starlight'] },
    { q: 'Our nearest star?', a: 'The Sun', why: 'The Sun is a star! The next nearest is Proxima Centauri', d: ['Polaris', 'Proxima Centauri', 'Sirius'] },
    { q: 'How long is one Earth orbit?', a: '365 days', why: 'One trip around the Sun ≈ 365¼ days, so we add a leap day every 4 years', d: ['24 hours', '30 days', '7 days'] },
    { q: 'Planet with the brightest rings?', a: 'Saturn', why: 'All 4 giant planets have rings, but Saturn’s icy rings shine brightest', d: ['Jupiter', 'Uranus', 'Mars'] },
  ];

  // ---- custom deck parser: "question = answer | why" per line ----
  function parseDeck(text) {
    const items = [], errors = [];
    String(text || '').split(/\r?\n/).forEach((raw, i) => {
      const line = raw.trim();
      if (!line || line.startsWith('#')) return;
      const m = line.match(/^(.+?)\s*=\s*(.+?)(?:\s*\|\s*(.+))?$/);
      if (!m) { errors.push(`Line ${i + 1}: use "question = answer"`); return; }
      items.push({ q: m[1].trim(), a: m[2].trim(), why: (m[3] || `The answer is ${m[2].trim()}`).trim() });
    });
    return { items, errors };
  }

  const CUSTOM_KEY = 'lumi-custom-deck';
  function customDeckText() { try { return localStorage.getItem(CUSTOM_KEY) || ''; } catch (e) { return ''; } }
  function saveCustomDeck(t) { try { localStorage.setItem(CUSTOM_KEY, t); } catch (e) { /* ignore */ } }

  const TOPICS = [
    { id: 'times', title: 'Times Tables', sub: 'Maths · ×6 to ×9', age: 'Ages 8–10', icon: 'icon_times', pool: timesPool },
    { id: 'fractions', title: 'Fractions', sub: 'Decimals & percents', age: 'Ages 10–12', icon: 'icon_fractions', pool: () => fractions },
    { id: 'spanish', title: 'Spanish', sub: 'Starter nouns', age: 'Ages 9–13', icon: 'icon_spanish', pool: () => spanish },
    { id: 'space', title: 'Solar System', sub: 'Science facts', age: 'Ages 8–12', icon: 'icon_space', pool: () => space },
    { id: 'custom', title: 'My Deck', sub: 'Your own questions', age: 'Any subject', icon: 'icon_custom', pool: () => parseDeck(customDeckText()).items },
  ];

  window.Content = { TOPICS, parseDeck, customDeckText, saveCustomDeck };
})();
