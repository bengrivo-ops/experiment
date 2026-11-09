// =============================================================
// LEARNING ENGINE — pure logic, no rendering. Encodes the
// learning-design choices so they are testable and explicit:
//
//  • Chunking:     new items are introduced a few at a time.
//  • Scaffolding:  choices grow 2 → 3 → 4 across levels; time
//                  pressure only appears once items are familiar.
//  • Spacing:      a missed item re-enters the queue 2–3 questions
//                  later (not immediately), and again in Level 3.
//  • Interleaving: Level 3 mixes every item from the session.
//  • Mastery:      a level ends only when every item in it has
//                  been answered correctly; progress is never lost.
//  • Data:         first-try accuracy per item for the report.
// =============================================================
(function () {
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  const LEVELS = [
    { name: 'Discover', choices: 2, fallSec: 0, tip: 'No timer. Take your time and notice the pattern.' },
    { name: 'Practise', choices: 3, fallSec: 11, tip: 'New items join the old ones. Answer before the crystals reach the hills.' },
    { name: 'Master', choices: 4, fallSec: 8, tip: 'Everything is mixed together, so you have to really remember it.' },
  ];

  class Session {
    constructor(pool, opts = {}) {
      const size = Math.min(opts.size || 10, pool.length);
      this.items = shuffle(pool).slice(0, size).map((it, i) => ({
        ...it, id: i, attempts: 0, misses: 0, firstTry: null,
      }));
      this.allAnswers = [...new Set(pool.map((p) => p.a))];
      this.calm = !!opts.calm;
      this.level = -1;
      this.queue = [];
      this.levelStats = [];
      const half = Math.ceil(this.items.length / 2);
      this.chunkA = this.items.slice(0, half);
      this.chunkB = this.items.slice(half);
    }

    get levelDef() { return LEVELS[this.level]; }
    get levelCount() { return LEVELS.length; }

    startLevel(n) {
      this.level = n;
      let set;
      if (n === 0) set = this.chunkA;
      else if (n === 1) {
        // new chunk + review: earlier misses first, then a few others
        const review = this.chunkA.slice().sort((x, y) => y.misses - x.misses).slice(0, Math.min(3, this.chunkA.length));
        set = this.chunkB.length ? shuffle([...this.chunkB, ...review]) : shuffle(this.chunkA);
      } else set = this.items; // interleave everything
      this.queue = shuffle(set);
      this.levelTotal = this.queue.length; // stars in this constellation
      this.levelDone = 0;
      this.levelFirstTry = 0;
      this.levelAsked = 0;
      this._seenThisLevel = new Set();
      return this.queue.length;
    }

    current() { return this.queue[0] || null; }

    // Build the answer options for the current item.
    options() {
      const item = this.current();
      const n = Math.min(this.levelDef.choices, 1 + this._distractorPool(item).length);
      const picks = shuffle(this._distractorPool(item)).slice(0, n - 1);
      return shuffle([item.a, ...picks]);
    }

    _distractorPool(item) {
      const pool = (item.d && item.d.length ? item.d : []).filter((x) => x !== item.a);
      // top up from other answers if hand-picked ones are too few
      if (pool.length < 3) {
        shuffle(this.allAnswers).forEach((a) => { if (a !== item.a && !pool.includes(a) && pool.length < 3) pool.push(a); });
      }
      return pool;
    }

    // Record an answer. Returns { correct, item, firstAttemptThisLevel }.
    answer(choice) {
      const item = this.queue.shift();
      const correct = choice === item.a;
      const first = !this._seenThisLevel.has(item.id);
      this._seenThisLevel.add(item.id);
      item.attempts++;
      if (first) this.levelAsked++;
      if (item.firstTry === null) item.firstTry = correct;
      if (correct) {
        this.levelDone++;
        if (first) this.levelFirstTry++;
      } else {
        item.misses++;
        // spacing: bring it back after 2 other questions (or at the end)
        this.queue.splice(Math.min(2, this.queue.length), 0, item);
      }
      return { correct, item, first };
    }

    levelComplete() { return this.queue.length === 0; }

    finishLevel() {
      const acc = this.levelAsked ? this.levelFirstTry / this.levelAsked : 1;
      const stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1;
      this.levelStats[this.level] = { acc, stars };
      return { acc, stars };
    }

    report() {
      const first = this.items.filter((i) => i.firstTry).length;
      const review = this.items.filter((i) => i.misses > 0).sort((a, b) => b.misses - a.misses);
      return {
        total: this.items.length,
        firstTryCorrect: first,
        accuracy: this.items.length ? first / this.items.length : 0,
        stars: this.levelStats.reduce((s, l) => s + (l ? l.stars : 0), 0),
        maxStars: LEVELS.length * 3,
        review,
        mastered: this.items.filter((i) => i.misses === 0),
      };
    }
  }

  window.Learning = { Session, LEVELS, shuffle };
})();
