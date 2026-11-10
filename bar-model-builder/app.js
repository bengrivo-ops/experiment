/* Bar Model Builder — demo.
   Every problem carries a structure definition (schema, quantities, which one is unknown).
   That one definition drives the problem text, the expert model, the counters template
   and the model check. */
(function () {
  'use strict';

  // ============================================================
  // Utilities
  // ============================================================
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
  };

  // ============================================================
  // Schemas, stages, settings
  // ============================================================
  const SCHEMAS = [
    { id: 'partwhole', level: 1, name: 'Part–whole', desc: 'Parts join to make a total.', why: 'Two parts make one total, and nothing changes over time. That is part–whole.' },
    { id: 'change', level: 2, name: 'Change', desc: 'A starting amount goes up or down.', why: 'There is a starting amount, then something is added or taken away. That is a change problem.' },
    { id: 'compare', level: 3, name: 'Compare', desc: 'Two amounts side by side; the difference matters.', why: 'Two separate amounts are compared, and the difference between them matters. That is compare.' },
    { id: 'groups', level: 4, name: 'Equal groups', desc: 'Equal units repeated: groups of, or times as many.', why: 'The same unit is repeated a number of times. That is equal groups.' },
    { id: 'fraction', level: 5, name: 'Fraction of an amount', desc: 'A whole in equal units; some units are counted.', why: 'A whole is split into equal units and some of them are counted. That is a fraction of an amount.' },
  ];
  const SCHEMA = Object.fromEntries(SCHEMAS.map((s) => [s.id, s]));
  const STAGES = ['Counters', 'Guided bars', 'Free bars', 'Equation only'];
  const ERRORS = {
    no_bar: 'No bar drawn', bar_count: 'Wrong number of bars', part_count: 'Wrong number of parts', whole_missing: 'Total not marked',
    label_missing: 'Labels missing', part_labels: 'Parts and total mixed up', whole_label: 'Total mislabelled', unknown: '? missing or doubled',
    shade: 'Taken-away part not shown', proportion: 'Bars not to scale', names: 'Bars not named', longer: 'Bigger amount on shorter bar',
    diff_missing: 'Difference not marked', align: 'Bars not lined up', small_label: 'Compare labels mixed up', big_label: 'Compare labels mixed up',
    diff_label: 'Difference mislabelled', unit_count: 'Wrong number of units', equal_units: 'Units not equal', unit_label: 'Unit mislabelled',
    shade_count: 'Wrong fraction shaded', part_bracket: 'Fraction part not labelled', count: 'Counters miscounted', count_unknown: 'Unknown part miscounted',
  };

  const settings = Object.assign({ schemas: SCHEMAS.map((s) => s.id), range: '100', read: true }, store.get('bmb-settings', {}));
  const saveSettings = () => store.set('bmb-settings', settings);
  let pupil = store.get('bmb-pupil', 'Pupil 1');

  function data() { return store.get('bmb-data', { pupils: {} }); }
  function prog(name, schema) {
    const d = data();
    const p = (d.pupils[name] = d.pupils[name] || { schemas: {} });
    return p.schemas[schema] || { stage: 0, streakOk: 0, streakBad: 0, problems: 0, models: 0, modelsOk: 0, ids: 0, idsOk: 0, eqs: 0, eqsOk: 0, shown: 0, errors: {} };
  }
  function saveProg(name, schema, P) {
    const d = data();
    const p = (d.pupils[name] = d.pupils[name] || { schemas: {} });
    p.schemas[schema] = P;
    store.set('bmb-data', d);
  }

  // ============================================================
  // Problem generation (varied contexts, same structures)
  // ============================================================
  const NAMES = ['Mia', 'Leo', 'Ava', 'Sam', 'Noor', 'Kai', 'Zara', 'Ben', 'Ivy', 'Omar', 'Lena', 'Raj'];
  const K = (v, name) => ({ v, q: false, name });
  const Q = (v, name) => ({ v, q: true, name });
  const twoNames = () => { const a = pick(NAMES); let b; do { b = pick(NAMES); } while (b === a); return [a, b]; };
  const maxFor = (r) => (r === 'tiny' ? 10 : parseInt(r, 10));
  function twoParts(max) {
    const lo = max >= 100 ? Math.round(max * 0.08) : 1;
    let a, b, guard = 0;
    do { a = rnd(lo, max - lo); b = rnd(lo, Math.max(lo, max - a)); guard++; } while ((a === b || a + b > max) && guard < 200);
    return [a, b];
  }

  const GEN = {
    partwhole(r) {
      const [a, b] = twoParts(maxFor(r));
      const n = pick(NAMES);
      return pick([
        () => ({ html: `${n} has [[${a}]] red beads and [[${b}]] blue beads. How many beads does ${n} have altogether?`, s: { parts: [K(a), K(b)], whole: Q(a + b) } }),
        () => ({ html: `A jar holds [[${a + b}]] sweets. [[${a}]] are lemon and the rest are cherry. How many sweets are cherry?`, s: { parts: [K(a), Q(b)], whole: K(a + b) } }),
        () => ({ html: `A ribbon is cut into two pieces. One is [[${a}]] cm long and the other is [[${b}]] cm long. How long was the ribbon?`, s: { parts: [K(a), K(b)], whole: Q(a + b) } }),
        () => ({ html: `${n} spent £[[${a}]] on a book and £[[${b}]] on a game. How much did ${n} spend in total?`, s: { parts: [K(a), K(b)], whole: Q(a + b) } }),
        () => ({ html: `There are [[${a + b}]] children in a club. [[${a}]] of them are boys. How many are girls?`, s: { parts: [K(a), Q(b)], whole: K(a + b) } }),
      ])();
    },
    change(r) {
      const [a, b] = twoParts(maxFor(r));
      const [n, n2] = twoNames();
      return pick([
        () => ({ html: `${n} had [[${a}]] stickers. Then ${n2} gave ${n} [[${b}]] more. How many stickers does ${n} have now?`, s: { dir: 'join', parts: [K(a), K(b)], whole: Q(a + b), shaded: null } }),
        () => ({ html: `A bus had [[${a}]] passengers. At the next stop, [[${b}]] more got on. How many passengers are on the bus now?`, s: { dir: 'join', parts: [K(a), K(b)], whole: Q(a + b), shaded: null } }),
        () => ({ html: `${n} had [[${a}]] marbles. After winning some more, ${n} had [[${a + b}]]. How many marbles did ${n} win?`, s: { dir: 'join', parts: [K(a), Q(b)], whole: K(a + b), shaded: null } }),
        () => ({ html: `${n} had [[${a + b}]] stickers and gave away [[${b}]]. How many stickers does ${n} have left?`, s: { dir: 'separate', parts: [Q(a), K(b)], whole: K(a + b), shaded: 1 } }),
        () => ({ html: `A bottle held [[${a + b}]] ml of juice. ${n} drank [[${b}]] ml. How much juice is left?`, s: { dir: 'separate', parts: [Q(a), K(b)], whole: K(a + b), shaded: 1 } }),
        () => ({ html: `${n} had £[[${a + b}]]. After buying a kite, ${n} had £[[${a}]] left. How much did the kite cost?`, s: { dir: 'separate', parts: [K(a), Q(b)], whole: K(a + b), shaded: 1 } }),
      ])();
    },
    compare(r) {
      const [S, d] = twoParts(maxFor(r));
      const B = S + d;
      const [A, C] = twoNames();
      return pick([
        () => ({ html: `[[@${A}]] has [[${B}]] cards. [[@${C}]] has [[${S}]] cards. How many more cards does ${A} have than ${C}?`, s: { big: K(B, A), small: K(S, C), diff: Q(d) } }),
        () => ({ html: `[[@${C}]] has [[${S}]] stamps. [[@${A}]] has [[${d}]] more stamps than ${C}. How many stamps does ${A} have?`, s: { big: Q(B, A), small: K(S, C), diff: K(d) } }),
        () => ({ html: `[[@${A}]] has [[${B}]] shells. ${A} has [[${d}]] more shells than [[@${C}]]. How many shells does ${C} have?`, s: { big: K(B, A), small: Q(S, C), diff: K(d) } }),
        () => ({ html: `[[@${A}]] is [[${B}]] cm tall. [[@${C}]] is [[${d}]] cm shorter than ${A}. How tall is ${C}?`, s: { big: K(B, A), small: Q(S, C), diff: K(d) } }),
        () => ({ html: `A [[@scarf]] costs £[[${B}]] and a [[@hat]] costs £[[${S}]]. How much more does the scarf cost than the hat?`, s: { big: K(B, 'scarf'), small: K(S, 'hat'), diff: Q(d) } }),
      ])();
    },
    groups(r) {
      const max = maxFor(r);
      const k = r === 'tiny' ? rnd(2, 4) : rnd(2, 6);
      const uMax = r === 'tiny' ? 3 : Math.max(2, Math.floor(max / k));
      const u = rnd(r === 'tiny' ? 1 : 2, uMax);
      const t = k * u;
      const [A, C] = twoNames();
      return pick([
        () => ({ html: `There are ${k} bags with [[${u}]] apples in each bag. How many apples are there altogether?`, s: { variant: 'groups', k, unit: K(u), total: Q(t) } }),
        () => ({ html: `[[${t}]] pencils are shared equally between ${k} pots. How many pencils go in each pot?`, s: { variant: 'groups', k, unit: Q(u), total: K(t) } }),
        () => ({ html: `[[@${C}]] has [[${u}]] stamps. [[@${A}]] has ${k} times as many stamps as ${C}. How many stamps does ${A} have?`, s: { variant: 'times', k, unit: K(u, C), other: A, total: Q(t) } }),
        () => ({ html: `[[@${A}]] saved £[[${t}]]. That is ${k} times as much as [[@${C}]] saved. How much did ${C} save?`, s: { variant: 'times', k, unit: Q(u, C), other: A, total: K(t) } }),
        () => ({ html: `A [[@pencil]] is [[${u}]] cm long. A [[@ruler]] is ${k} times as long. How long is the ruler?`, s: { variant: 'times', k, unit: K(u, 'pencil'), other: 'ruler', total: Q(t) } }),
      ])();
    },
    fraction(r) {
      const fr = r === 'tiny' ? pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4]]) : pick([[3, 5], [2, 3], [1, 4], [3, 4], [2, 5], [5, 8], [3, 10], [4, 5]]);
      const [num, den] = fr;
      const max = maxFor(r);
      const mMax = r === 'tiny' ? 3 : Math.max(1, Math.floor(max / den));
      const m = rnd(r === 'tiny' ? 1 : Math.min(2, mMax), mMax);
      const W = den * m, P = num * m;
      const n = pick(NAMES);
      return pick([
        () => ({ html: `There are [[${W}]] children in a class. ${num}/${den} of them are girls. How many girls are there?`, s: { num, den, whole: K(W), part: Q(P) } }),
        () => ({ html: `A cake weighs [[${W}]] g. ${n} eats ${num}/${den} of it. How much cake does ${n} eat?`, s: { num, den, whole: K(W), part: Q(P) } }),
        () => ({ html: `${n} had £[[${W}]] and spent ${num}/${den} of it. How much did ${n} spend?`, s: { num, den, whole: K(W), part: Q(P) } }),
        () => ({ html: `${n} has read ${num}/${den} of a book. That is [[${P}]] pages. How many pages are in the book?`, s: { num, den, whole: Q(W), part: K(P) } }),
      ])();
    },
  };

  let problemSeq = 0;
  function finishProblem(schema, g, custom) {
    const s = Object.assign({ schema }, g.s);
    return { id: ++problemSeq, schema, html: g.html, s, answer: unknownRole(s).v, custom: !!custom };
  }
  function roles(s) {
    switch (s.schema) {
      case 'partwhole': case 'change': return [s.parts[0], s.parts[1], s.whole];
      case 'compare': return [s.big, s.small, s.diff];
      case 'groups': return [s.unit, s.total];
      case 'fraction': return [s.whole, s.part];
    }
    return [];
  }
  const unknownRole = (s) => roles(s).find((r) => r.q);
  const maxValue = (s) => Math.max(...roles(s).map((r) => r.v));

  // ============================================================
  // Expert model (and the counters template, which reuses it)
  // ============================================================
  const MAXU = 24;
  const L = (r) => (r.q ? '?' : String(r.v));
  const seg = (len, v, label, shaded) => ({ len, v, label: label == null ? null : label, shaded: !!shaded, c: 0 });
  function expertModel(s, counters) {
    const scale = counters ? 1 : 16 / maxValue(s);
    const len = (v) => Math.max(1, Math.round(v * scale));
    const m = { bars: [], brackets: [] };
    if (s.schema === 'partwhole' || s.schema === 'change') {
      m.bars.push({ name: null, segs: s.parts.map((p, i) => seg(len(p.v), p.v, L(p), s.shaded === i)) });
      m.brackets.push({ bar: 0, span: { kind: 'whole' }, side: 'top', label: L(s.whole), v: s.whole.v });
    } else if (s.schema === 'compare') {
      let lb = len(s.big.v), ls = len(s.small.v);
      if (lb <= ls) lb = ls + 1;
      m.bars.push({ name: s.big.name, segs: [seg(lb, s.big.v, L(s.big))] });
      m.bars.push({ name: s.small.name, segs: [seg(ls, s.small.v, L(s.small))] });
      m.brackets.push({ bar: 0, span: { kind: 'gap', short: 1 }, side: 'bottom', label: L(s.diff), v: s.diff.v });
    } else if (s.schema === 'groups') {
      let ul = len(s.unit.v);
      if (ul * s.k > 22) ul = Math.max(1, Math.floor(22 / s.k));
      if (s.variant === 'groups') {
        m.bars.push({ name: null, segs: Array.from({ length: s.k }, (_, i) => seg(ul, s.unit.v, i === 0 ? L(s.unit) : null)) });
        m.brackets.push({ bar: 0, span: { kind: 'whole' }, side: 'top', label: L(s.total), v: s.total.v });
      } else {
        m.bars.push({ name: s.unit.name, segs: [seg(ul, s.unit.v, L(s.unit))] });
        m.bars.push({ name: s.other, segs: Array.from({ length: s.k }, () => seg(ul, s.unit.v, null)) });
        m.brackets.push({ bar: 1, span: { kind: 'whole' }, side: 'top', label: L(s.total), v: s.total.v });
      }
    } else if (s.schema === 'fraction') {
      const uv = s.whole.v / s.den;
      let ul = len(uv);
      if (ul * s.den > 22) ul = Math.max(1, Math.floor(22 / s.den));
      if (ul * s.den < 8) ul = Math.ceil(8 / s.den);
      m.bars.push({ name: null, segs: Array.from({ length: s.den }, (_, i) => seg(ul, uv, null, i < s.num)) });
      m.brackets.push({ bar: 0, span: { kind: 'whole' }, side: 'top', label: L(s.whole), v: s.whole.v });
      m.brackets.push({ bar: 0, span: { kind: 'segs', a: 0, b: s.num }, side: 'bottom', label: L(s.part), v: s.part.v });
    }
    return m;
  }
  function counterTemplate(s) {
    const m = expertModel(s, true);
    m.bars.forEach((b) => b.segs.forEach((x) => { x.expect = x.label; x.label = null; x.c = 0; }));
    m.brackets.forEach((b) => { b.expect = b.label; b.label = null; });
    m.template = true;
    return m;
  }

  const blen = (b) => b.segs.reduce((t, x) => t + segLen(x), 0);
  function segLen(x) { return x.counterMode ? Math.max(1, x.c) : x.len; }
  function segStart(b, j) { let t = 0; for (let i = 0; i < j; i++) t += segLen(b.segs[i]); return t; }
  function resolve(m, br) {
    const bar = m.bars[br.bar];
    if (!br.span) return { from: br.from, to: br.to };
    if (br.span.kind === 'whole') return { from: 0, to: blen(bar) };
    if (br.span.kind === 'gap') { const a = blen(m.bars[br.span.short]), b = blen(bar); return { from: Math.min(a, b), to: Math.max(a, b) }; }
    if (br.span.kind === 'segs') return { from: segStart(bar, br.span.a), to: segStart(bar, br.span.b) };
    return { from: 0, to: 0 };
  }

  // ============================================================
  // Model check — structure, not pixels
  // ============================================================
  const E = (code, msg, hint, focus) => ({ code, msg, hint, focus });
  const qCount = (m) => m.bars.reduce((t, b) => t + b.segs.filter((x) => x.label === '?').length, 0) + m.brackets.filter((b) => b.label === '?').length;
  const whole = (m, i) => m.brackets.find((b) => b.bar === i && b.from === 0 && b.to === blen(m.bars[i]));
  const labelVal = (lbl, s) => (lbl === '?' ? unknownRole(s).v : Number(lbl));
  const HINTS = {
    partwhole: 'One bar split into two parts, with a bracket over the whole bar for the total.',
    change: 'One bar for the amount at the end of the story (join) or the start (separate), split into two parts. Shade any part that was taken away.',
    compare: 'Two bars, one per person or thing, both starting at the left. The extra part of the longer bar is the difference: mark it with a bracket.',
    groups: 'Equal units of the same length. Use one unit per group, and a bracket over all of them for the total.',
    fraction: 'One bar split into as many equal units as the bottom number of the fraction. Shade the units the top number counts.',
  };

  // two-bar part–whole (whole bar above a split bar) is a valid alternative: normalise it
  function normalisePartWhole(m) {
    if (m.bars.length !== 2) return m;
    const one = m.bars[0].segs.length === 1 ? 0 : m.bars[1].segs.length === 1 ? 1 : -1;
    if (one < 0) return m;
    const other = 1 - one;
    if (m.bars[other].segs.length < 2 || blen(m.bars[one]) !== blen(m.bars[other])) return m;
    return {
      bars: [m.bars[other]],
      brackets: [{ bar: 0, from: 0, to: blen(m.bars[other]), label: m.bars[one].segs[0].label },
        ...m.brackets.filter((b) => b.bar === other).map((b) => Object.assign({}, b, { bar: 0 }))],
    };
  }

  function checkModel(s, m0) {
    if (!m0.bars.length) return E('no_bar', 'Start by adding a bar.', HINTS[s.schema]);
    if (s.schema === 'partwhole' || s.schema === 'change') return checkPartWhole(s, normalisePartWhole(m0));
    if (s.schema === 'compare') return checkCompare(s, m0);
    if (s.schema === 'groups') return checkGroups(s, m0);
    if (s.schema === 'fraction') return checkFraction(s, m0);
    return null;
  }

  function checkPartWhole(s, m) {
    const sep = s.shaded != null;
    if (m.bars.length !== 1) return E('bar_count', 'This story is about one total made of parts. Can you show it with one bar split into parts?', HINTS[s.schema]);
    const b = m.bars[0];
    if (b.segs.length !== 2) return E('part_count', 'How many parts make up the total? Split the bar into one part for each amount.', HINTS[s.schema], 0);
    const w = whole(m, 0);
    if (!w) return E('whole_missing', sep ? 'What did the story start with? Add a bracket over the whole bar for it.' : 'Where is the total? Add a bracket over the whole bar.', HINTS[s.schema]);
    if (b.segs.some((x) => x.label == null) || w.label == null) return E('label_missing', 'Every part and the bracket need a label: a number from the problem, or ? for the amount you need to find.', HINTS[s.schema], 0);
    const exp = s.parts.map(L), got = b.segs.map((x) => x.label);
    const same = (got[0] === exp[0] && got[1] === exp[1]) || (got[0] === exp[1] && got[1] === exp[0]);
    if (!same || w.label !== L(s.whole)) {
      if (sep) return E('part_labels', 'What did the story start with? That amount is the whole bar. The part taken away and the part left are inside it.', HINTS[s.schema], 0);
      return E(w.label !== L(s.whole) ? 'whole_label' : 'part_labels', 'Which amount is made of the other two? That one goes on the bracket over the whole bar.', HINTS[s.schema], 0);
    }
    if (qCount(m) !== 1) return E('unknown', 'Mark the one amount you need to find with ?.', HINTS[s.schema]);
    if (sep) {
      const sh = b.segs.filter((x) => x.shaded);
      if (sh.length !== 1 || sh[0].label !== L(s.parts[s.shaded])) return E('shade', 'Which part was taken away? Shade that part so the model shows it is gone.', HINTS[s.schema], 0);
    }
    const v0 = labelVal(b.segs[0].label, s), v1 = labelVal(b.segs[1].label, s);
    const l0 = b.segs[0].len, l1 = b.segs[1].len;
    if (Math.abs(v0 - v1) / Math.max(v0, v1) >= 0.12 && ((v0 > v1) !== (l0 > l1) || l0 === l1)) {
      const big = v0 > v1 ? b.segs[0].label : b.segs[1].label;
      return E('proportion', `Which part is bigger? The part labelled ${big} should be the longer one.`, 'Bar lengths should match the sizes of the amounts.', 0);
    }
    return null;
  }

  function checkCompare(s, m) {
    if (m.bars.length !== 2) return E('bar_count', 'You are comparing two amounts. Make one bar for each.', HINTS.compare);
    const names = m.bars.map((b) => b.name);
    if (names.some((n) => !n)) return E('names', 'Whose bar is whose? Put a name on each bar’s name tag.', HINTS.compare);
    const bi = names.indexOf(s.big.name), si = names.indexOf(s.small.name);
    if (bi < 0 || si < 0 || bi === si) return E('names', `Make one bar for ${s.big.name} and one for ${s.small.name}.`, HINTS.compare);
    const big = m.bars[bi], small = m.bars[si];
    const lb = blen(big), ls = blen(small);
    if (lb <= ls) return E('longer', `Who has more, ${s.big.name} or ${s.small.name}? That bar should be longer.`, HINTS.compare, bi);
    // small total
    const smallLbl = small.segs.length === 1 ? small.segs[0].label : (whole(m, si) || {}).label;
    // big total + difference: (a) big bar split [same | difference], or (b) one bar + gap bracket
    let bigLbl, diffLbl;
    if (big.segs.length === 2) {
      if (big.segs[0].len !== ls) return E('align', `The first part of ${s.big.name}’s bar should line up with the end of ${s.small.name}’s bar.`, HINTS.compare, bi);
      diffLbl = big.segs[1].label;
      bigLbl = (whole(m, bi) || {}).label;
      if (bigLbl === undefined && !s.big.q) return E('whole_missing', `Where is ${s.big.name}’s total? Add a bracket over the whole of that bar.`, HINTS.compare, bi);
    } else if (big.segs.length === 1) {
      bigLbl = big.segs[0].label;
      const gap = m.brackets.find((b) => (b.bar === bi || b.bar === si) && b.from === ls && b.to === lb);
      if (!gap) return E('diff_missing', `How much more does ${s.big.name} have? Mark the extra part of the longer bar with a bracket.`, HINTS.compare, bi);
      diffLbl = gap.label;
    } else {
      return E('part_count', `Keep ${s.big.name}’s bar simple: one bar, or one part the same as ${s.small.name}’s plus the difference.`, HINTS.compare, bi);
    }
    if (smallLbl == null || bigLbl == null || diffLbl == null) return E('label_missing', 'Label both bars and the difference with numbers from the problem, or ? for the one you need to find.', HINTS.compare);
    if (smallLbl !== L(s.small) || bigLbl !== L(s.big)) return E('big_label', `Check the labels: which amount belongs to ${s.big.name}, and which to ${s.small.name}?`, HINTS.compare);
    if (diffLbl !== L(s.diff)) return E('diff_label', 'Which number is the difference between the two amounts? It goes on the extra part.', HINTS.compare);
    if (qCount(m) !== 1) return E('unknown', 'Mark the one amount you need to find with ?.', HINTS.compare);
    return null;
  }

  function checkGroups(s, m) {
    const equal = (segs, len) => segs.every((x) => x.len === (len || segs[0].len));
    if (s.variant === 'groups') {
      if (m.bars.length !== 1) return E('bar_count', 'All the groups belong to one total. Show them as one bar made of equal units.', HINTS.groups);
      const b = m.bars[0];
      if (b.segs.length !== s.k) return E('unit_count', `How many equal groups are there? The bar needs one unit for each group.`, HINTS.groups, 0);
      if (!equal(b.segs)) return E('equal_units', 'Each group is the same size, so every unit should be the same length. Try Equal units.', HINTS.groups, 0);
      const lab = b.segs.map((x) => x.label).filter((x) => x != null);
      if (!lab.length) return E('label_missing', 'Label one unit with the amount in each group.', HINTS.groups, 0);
      if (lab.some((x) => x !== L(s.unit))) return E('unit_label', 'What goes in one unit: the amount in each group, or the total?', HINTS.groups, 0);
      const w = whole(m, 0);
      if (!w || w.label == null) return E('whole_missing', 'Where is the total? Add a bracket over the whole bar and label it.', HINTS.groups, 0);
      if (w.label !== L(s.total)) return E('whole_label', 'Which number is the total of all the groups? It goes on the bracket.', HINTS.groups, 0);
      if (qCount(m) < 1 || (s.unit.q ? false : qCount(m) !== 1)) return E('unknown', 'Mark the amount you need to find with ?.', HINTS.groups);
      return null;
    }
    // times as many: two bars
    if (m.bars.length !== 2) return E('bar_count', `Make one bar for ${s.unit.name} and one for ${s.other}.`, HINTS.groups);
    const names = m.bars.map((b) => b.name);
    if (names.some((n) => !n)) return E('names', 'Whose bar is whose? Put a name on each bar’s name tag.', HINTS.groups);
    const ui = names.indexOf(s.unit.name), oi = names.indexOf(s.other);
    if (ui < 0 || oi < 0 || ui === oi) return E('names', `Make one bar for ${s.unit.name} and one for ${s.other}.`, HINTS.groups);
    const ub = m.bars[ui], ob = m.bars[oi];
    if (ub.segs.length !== 1) return E('part_count', `${s.unit.name}’s amount is one unit. Keep that bar as one part.`, HINTS.groups, ui);
    if (ob.segs.length !== s.k) return E('unit_count', `${s.other} has ${s.k} times as much as ${s.unit.name}. How many units long should ${s.other}’s bar be?`, HINTS.groups, oi);
    if (!equal(ob.segs, ub.segs[0].len)) return E('equal_units', `Each unit of ${s.other}’s bar should be the same length as ${s.unit.name}’s bar.`, HINTS.groups, oi);
    if (ub.segs[0].label == null) return E('label_missing', `Label ${s.unit.name}’s bar.`, HINTS.groups, ui);
    if (ub.segs[0].label !== L(s.unit)) return E('unit_label', `Which number belongs to ${s.unit.name}: one unit?`, HINTS.groups, ui);
    const w = whole(m, oi);
    if (!w || w.label == null) return E('whole_missing', `Where is ${s.other}’s total? Add a bracket over the whole of that bar.`, HINTS.groups, oi);
    if (w.label !== L(s.total)) return E('whole_label', `Which number is ${s.other}’s total?`, HINTS.groups, oi);
    if (qCount(m) !== 1) return E('unknown', 'Mark the one amount you need to find with ?.', HINTS.groups);
    return null;
  }

  function checkFraction(s, m) {
    if (m.bars.length !== 1) return E('bar_count', 'The fraction is part of one whole. Use one bar for the whole.', HINTS.fraction);
    const b = m.bars[0];
    const word = { 2: 'halves', 3: 'thirds', 4: 'quarters', 5: 'fifths', 8: 'eighths', 10: 'tenths' }[s.den] || 'equal parts';
    if (b.segs.length !== s.den) return E('unit_count', `The fraction is in ${word}. How many equal units does the whole bar need?`, HINTS.fraction, 0);
    if (!b.segs.every((x) => x.len === b.segs[0].len)) return E('equal_units', 'Fractions need equal parts. Make every unit the same length (try Equal units).', HINTS.fraction, 0);
    const shaded = b.segs.map((x, i) => (x.shaded ? i : -1)).filter((i) => i >= 0);
    if (shaded.length !== s.num) return E('shade_count', `How many ${word} does the problem talk about? Shade that many units.`, HINTS.fraction, 0);
    if (shaded[shaded.length - 1] - shaded[0] !== shaded.length - 1) return E('shade_count', 'Keep the shaded units next to each other so one bracket can cover them.', HINTS.fraction, 0);
    const w = whole(m, 0);
    if (!w || w.label == null) return E('whole_missing', 'Where is the whole amount? Add a bracket over the whole bar and label it.', HINTS.fraction, 0);
    if (w.label !== L(s.whole)) return E('whole_label', 'Which number is the whole amount? It goes on the bracket over the whole bar.', HINTS.fraction, 0);
    const from = segStart(b, shaded[0]), to = segStart(b, shaded[shaded.length - 1] + 1);
    const pb = m.brackets.find((x) => x.bar === 0 && x.from === from && x.to === to);
    if (!pb || pb.label == null) return E('part_bracket', 'Add a bracket over just the shaded units and label it.', HINTS.fraction, 0);
    if (pb.label !== L(s.part)) return E('part_bracket', 'Which number is the shaded part? It goes on the bracket over the shaded units.', HINTS.fraction, 0);
    if (qCount(m) !== 1) return E('unknown', 'Mark the one amount you need to find with ?.', HINTS.fraction);
    return null;
  }

  // Counters stage: the template is given (allowed only at this stage); check labels and counts
  function checkCounters(s, m) {
    const segs = m.bars.flatMap((b, bi) => b.segs.map((x, j) => ({ x, bi, j })));
    // labels the template expects; part–whole and change parts may be in either order
    if (segs.some(({ x }) => x.expect != null && x.label == null) || m.brackets.some((b) => b.expect != null && b.label == null)) {
      return E('label_missing', 'Label the parts and brackets: a number from the problem, or ? for the amount you need to find.', 'Tap a number in the problem, then tap the part or bracket it belongs to.');
    }
    if (s.schema === 'partwhole' || s.schema === 'change') {
      const b = m.bars[0];
      const [e0, e1] = [b.segs[0].expect, b.segs[1].expect];
      if (b.segs[0].label === e1 && b.segs[1].label === e0 && e0 !== e1 && s.shaded == null) { // swapped parts are fine
        [b.segs[0].expect, b.segs[1].expect] = [e1, e0];
        [b.segs[0].v, b.segs[1].v] = [b.segs[1].v, b.segs[0].v];
      }
    }
    const wrongLabel = segs.find(({ x }) => x.expect != null && x.label !== x.expect) || m.brackets.find((b) => b.expect != null && b.label !== b.expect);
    if (wrongLabel) return E('part_labels', 'Check the labels: does each number sit on the part or bracket it describes? Is the ? on the amount you need to find?', HINTS[s.schema]);
    for (const { x, bi } of segs) {
      if (x.c === x.v) continue;
      const who = m.bars[bi].name ? `${m.bars[bi].name}’s bar` : 'this part';
      if (x.label != null && x.label !== '?') return E('count', `Count the counters in ${who}. It is labelled ${x.label}, so it needs ${x.label} counters.`, 'Use Add counter and Remove counter.', bi);
      return E('count_unknown', `Use the numbers you know to work out how many counters ${who} needs, then count them out.`, 'For a ? part, think about what the other parts and the whole tell you.', bi);
    }
    return null;
  }

  // ============================================================
  // Rendering (SVG)
  // ============================================================
  const VBW = 900, NAMEW = 108, PADR = 20, UNIT = (VBW - NAMEW - PADR) / MAXU, ROWH = 140, BARY = 46, BARH = 48;
  const xOf = (u) => NAMEW + u * UNIT;
  const uOf = (x) => clamp(Math.round((x - NAMEW) / UNIT), 0, MAXU);

  function renderSVG(m, o) {
    o = o || {};
    const rows = Math.max(1, m.bars.length);
    const H = rows * ROWH + 4;
    let s = `<defs><pattern id="hatch${o.id || ''}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="transparent"/><line x1="0" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="3.5"/></pattern></defs>`;
    if (!m.bars.length) s += `<text class="svg-empty-msg" x="${VBW / 2}" y="${ROWH / 2}">Add a bar to start building.</text>`;
    m.bars.forEach((b, bi) => {
      const y0 = bi * ROWH;
      const by = y0 + BARY;
      if (!o.readonly) s += `<rect data-k="row" data-b="${bi}" x="${NAMEW}" y="${y0}" width="${VBW - NAMEW}" height="${ROWH}" fill="transparent"/>`;
      if (o.grid) for (let u = 0; u <= MAXU; u++) s += `<line class="svg-tick" x1="${xOf(u)}" x2="${xOf(u)}" y1="${by - 8}" y2="${by + BARH + 8}"/>`;
      // name tag
      if (o.names || b.name) {
        s += `<rect ${o.readonly ? '' : `data-k="name" data-b="${bi}"`} class="svg-name ${b.name ? 'set' : ''}" x="8" y="${by + 4}" width="${NAMEW - 22}" height="${BARH - 8}" rx="8"/>`;
        s += `<text class="svg-name-text ${b.name ? '' : 'ph'}" x="${8 + (NAMEW - 22) / 2}" y="${by + BARH / 2}">${esc(b.name || 'name')}</text>`;
      }
      // segments
      let u = 0;
      b.segs.forEach((x, j) => {
        const len = segLen(x);
        const x0 = xOf(u), w = len * UNIT;
        const empty = x.counterMode && x.c === 0;
        const cls = `svg-seg ${empty ? 'empty' : j % 2 ? 'b' : 'a'} ${o.hl && x.label != null && o.hl.has(x.label) ? 'hl' : ''} ${o.focus === bi ? 'bad' : ''}`;
        s += `<rect ${o.readonly ? '' : `data-k="seg" data-b="${bi}" data-s="${j}"`} class="${cls}" x="${x0}" y="${by}" width="${w}" height="${BARH}"/>`;
        if (x.shaded) s += `<rect x="${x0}" y="${by}" width="${w}" height="${BARH}" fill="url(#hatch${o.id || ''})" style="color:var(--bar-edge);opacity:.45" pointer-events="none"/>`;
        if (x.counterMode) for (let k = 0; k < x.c; k++) s += `<circle class="svg-dot" cx="${x0 + (k + 0.5) * UNIT}" cy="${by + BARH - 12}" r="${Math.min(8, UNIT * 0.26)}" pointer-events="none"/>`;
        if (x.label != null) s += `<text class="svg-label ${x.label === '?' ? 'q' : ''}" x="${x0 + w / 2}" y="${x.counterMode ? by + 16 : by + BARH / 2}" style="${w < 40 ? 'font-size:14px' : ''}">${esc(x.label)}</text>`;
        u += len;
      });
      // stretch handles
      if (o.handles) {
        let uu = 0;
        b.segs.forEach((x, j) => {
          uu += segLen(x);
          s += `<rect data-k="handle" data-b="${bi}" data-s="${j}" class="svg-handle" x="${xOf(uu) - 5}" y="${by - 6}" width="10" height="${BARH + 12}" rx="4" opacity="${j === b.segs.length - 1 ? 1 : 0.55}"/>`;
        });
      }
    });
    // brackets
    m.brackets.forEach((br, i) => {
      if (!m.bars[br.bar]) return;
      const { from, to } = resolve(m, br);
      if (to <= from) return;
      const x1 = xOf(from) + 2, x2 = xOf(to) - 2, xm = (x1 + x2) / 2;
      const by = br.bar * ROWH + BARY;
      const top = br.side !== 'bottom';
      const yl = top ? by - 6 : by + BARH + 6;
      const d = top ? `M${x1} ${yl} v-12 H${x2} v12 M${xm} ${yl - 12} v-7` : `M${x1} ${yl} v12 H${x2} v-12 M${xm} ${yl + 12} v7`;
      const ty = top ? yl - 30 : yl + 32;
      const hl = o.hl && br.label != null && o.hl.has(br.label);
      s += `<g class="svg-br ${hl ? 'hl' : ''}"><path d="${d}"/>`;
      if (br.label != null) s += `<text class="svg-label ${br.label === '?' ? 'q' : ''}" x="${xm}" y="${ty}">${esc(br.label)}</text>`;
      else if (!o.readonly) s += `<text class="svg-label" x="${xm}" y="${ty}" style="fill:var(--muted);font-size:13px;font-weight:400">label</text>`;
      s += `</g>`;
      if (!o.readonly) s += `<rect data-k="br" data-i="${i}" x="${x1}" y="${top ? ty - 16 : yl}" width="${x2 - x1}" height="${top ? yl - ty + 16 : ty - yl + 16}" fill="transparent"/>`;
    });
    if (o.preview) {
      const { b, from, to } = o.preview;
      const by = b * ROWH + BARY;
      s += `<rect class="svg-preview" x="${xOf(from)}" y="${by - 30}" width="${(to - from) * UNIT}" height="${BARH + 36}" rx="6"/>`;
    }
    return { svg: s, H };
  }

  function svgString(m, o) {
    const r = renderSVG(m, Object.assign({ readonly: true, id: 'r' + Math.random().toString(36).slice(2, 7) }, o));
    // trim unused width for small previews
    return `<svg viewBox="0 0 ${VBW} ${r.H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Bar model">${r.svg}</svg>`;
  }

  // ============================================================
  // Builder (interactive canvas)
  // ============================================================
  const canvas = $('#canvas');
  const B = { model: { bars: [], brackets: [] }, tool: 'stretch', chip: null, drag: null, mode: 'free', hl: null, focus: null, locked: false };
  const TOOLS = {
    stretch: { label: 'Stretch', help: 'Drag a dark handle to make a bar or part longer or shorter.', icon: '<path d="M2 8h12M5 5l-3 3 3 3M11 5l3 3-3 3" stroke="currentColor" stroke-width="1.8" fill="none"/>' },
    split: { label: 'Split', help: 'Tap a bar where you want to split it into two parts.', icon: '<path d="M8 1v14" stroke="currentColor" stroke-width="2"/><rect x="1" y="4" width="14" height="8" fill="none" stroke="currentColor" stroke-width="1.6"/>' },
    equal: { label: 'Equal units', help: 'Tap a bar to split it into equal units.', icon: '<rect x="1" y="4" width="14" height="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.7 4v8M10.3 4v8" stroke="currentColor" stroke-width="1.6"/>' },
    bracket: { label: 'Bracket', help: 'Drag along a bar to put a bracket over those units. A bracket can reach past the end of a bar to show a difference.', icon: '<path d="M2 10V6h12v4M8 6V3" stroke="currentColor" stroke-width="1.8" fill="none"/>' },
    shade: { label: 'Shade', help: 'Tap a part to shade it: a part taken away, or the units a fraction counts.', icon: '<rect x="1" y="4" width="14" height="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 12l6-8M7 12l6-8" stroke="currentColor" stroke-width="1.4"/>' },
    erase: { label: 'Erase', help: 'Tap a part to join it to its neighbour, a bracket to remove it, or a one-part bar to delete it.', icon: '<path d="M3 13h10M4 10l6-7 4 4-6 6H5z" stroke="currentColor" stroke-width="1.6" fill="none"/>' },
    add: { label: 'Add counter', help: 'Tap a part to add a counter. The bar grows with each counter.', icon: '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 5v6M5 8h6" stroke="currentColor" stroke-width="1.8"/>' },
    remove: { label: 'Remove counter', help: 'Tap a part to take away a counter.', icon: '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 8h6" stroke="currentColor" stroke-width="1.8"/>' },
  };

  function renderToolbar() {
    const tb = $('#toolbar');
    tb.innerHTML = '';
    const ids = B.mode === 'concrete' ? ['add', 'remove'] : ['stretch', 'split', 'equal', 'bracket', 'shade', 'erase'];
    if (B.mode !== 'concrete') {
      const add = el('button', 'tool', '<svg viewBox="0 0 16 16"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2"/></svg>Add bar');
      add.type = 'button';
      add.onclick = () => { if (B.locked) return; if (B.model.bars.length >= 3) return toast('Three bars is the most you need here.'); B.model.bars.push({ name: null, segs: [{ len: 6, label: null, shaded: false }] }); draw(); };
      tb.append(add, el('span', 'sep'));
    }
    ids.forEach((id) => {
      const t = el('button', 'tool', `<svg viewBox="0 0 16 16">${TOOLS[id].icon}</svg>${TOOLS[id].label}`);
      t.type = 'button';
      t.setAttribute('aria-pressed', String(B.tool === id && !B.chip));
      t.onclick = () => { B.tool = id; setChip(null); renderToolbar(); toolHelp(); };
      tb.append(t);
    });
    if (B.mode !== 'concrete') {
      const clr = el('button', 'tool', 'Clear');
      clr.type = 'button';
      clr.style.marginLeft = 'auto';
      clr.onclick = () => { if (B.locked) return; B.model = { bars: [], brackets: [] }; draw(); };
      tb.append(clr);
    }
    tb.hidden = B.locked;
    toolHelp();
  }
  function toolHelp() {
    const h = $('#tool-help');
    if (B.locked) { h.textContent = ''; return; }
    if (B.chip) h.innerHTML = B.chip.type === 'name' ? `Now tap a name tag at the start of a bar to put <b>${esc(B.chip.v)}</b> on it.` : `Now tap a part or a bracket to put <b>${esc(B.chip.v)}</b> on it.`;
    else h.textContent = TOOLS[B.tool].help;
  }

  function draw() {
    const r = renderSVG(B.model, {
      readonly: B.locked, grid: B.mode !== 'free' && !B.locked, handles: B.mode !== 'concrete' && B.tool === 'stretch' && !B.locked && !B.chip,
      names: hasNameChips(), hl: B.hl, focus: B.focus, preview: B.drag && B.drag.type === 'bracket' && B.drag.u1 !== B.drag.u0 ? { b: B.drag.b, from: Math.min(B.drag.u0, B.drag.u1), to: Math.max(B.drag.u0, B.drag.u1) } : null, id: 'c',
    });
    canvas.setAttribute('viewBox', `0 0 ${VBW} ${r.H}`);
    canvas.innerHTML = r.svg;
    $('#canvas-wrap').classList.toggle('squared', B.mode !== 'free');
  }

  function svgPoint(e) {
    const pt = canvas.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(canvas.getScreenCTM().inverse());
  }
  function hit(e) {
    const t = e.target.closest('[data-k]');
    return t ? { k: t.dataset.k, b: +t.dataset.b, s: +t.dataset.s, i: +t.dataset.i } : null;
  }
  function wholeBrackets(bi) { const L0 = blen(B.model.bars[bi]); return B.model.brackets.filter((b) => b.bar === bi && b.from === 0 && b.to === L0); }

  canvas.addEventListener('pointerdown', (e) => {
    if (B.locked) return;
    const h = hit(e);
    if (!h) return;
    const p = svgPoint(e);
    const m = B.model;
    closePopover();
    if (B.chip) {
      if (h.k === 'seg') { m.bars[h.b].segs[h.s].label = B.chip.type === 'name' ? null : B.chip.v; if (B.chip.type === 'name') return toast('Names go on the name tag at the start of a bar.'); }
      else if (h.k === 'br') { if (B.chip.type === 'name') return toast('Names go on the name tag at the start of a bar.'); m.brackets[h.i].label = B.chip.v; }
      else if (h.k === 'name') { if (B.chip.type !== 'name') return toast('Numbers go on parts and brackets. Name tags are for names.'); m.bars[h.b].name = B.chip.v; }
      else return;
      B.focus = null;
      draw();
      return;
    }
    const tool = B.tool;
    if (tool === 'add' || tool === 'remove') {
      if (h.k !== 'seg') return;
      const x = m.bars[h.b].segs[h.s];
      x.c = clamp(x.c + (tool === 'add' ? 1 : -1), 0, 20);
      draw();
      return;
    }
    if (tool === 'stretch' && h.k === 'handle') {
      B.drag = { type: 'handle', b: h.b, s: h.s, wholes: wholeBrackets(h.b) };
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    if (tool === 'split' && h.k === 'seg') {
      const bar = m.bars[h.b], x = bar.segs[h.s], st = segStart(bar, h.s), u = uOf(p.x);
      if (u <= st || u >= st + x.len) return toast('Tap inside the part, between two grid lines.');
      bar.segs.splice(h.s, 1, { len: u - st, label: null, shaded: x.shaded }, { len: st + x.len - u, label: null, shaded: x.shaded });
      draw();
      return;
    }
    if (tool === 'equal' && (h.k === 'seg' || h.k === 'row') && m.bars[h.b]) { openEqualPopover(h.b, e); return; }
    if (tool === 'bracket' && !isNaN(h.b) && h.k !== 'br') {
      const u = uOf(p.x);
      B.drag = { type: 'bracket', b: h.b, u0: u, u1: u };
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    if (tool === 'shade' && h.k === 'seg') { const x = m.bars[h.b].segs[h.s]; x.shaded = !x.shaded; draw(); return; }
    if (tool === 'erase') {
      if (h.k === 'br') { m.brackets.splice(h.i, 1); draw(); return; }
      if (h.k === 'name') { m.bars[h.b].name = null; draw(); return; }
      if (h.k === 'seg') {
        const bar = m.bars[h.b];
        if (bar.segs.length === 1) {
          m.bars.splice(h.b, 1);
          m.brackets = m.brackets.filter((x) => x.bar !== h.b).map((x) => Object.assign(x, { bar: x.bar > h.b ? x.bar - 1 : x.bar }));
        } else {
          const j = h.s < bar.segs.length - 1 ? h.s : h.s - 1;
          const a = bar.segs[j], c = bar.segs[j + 1];
          bar.segs.splice(j, 2, { len: a.len + c.len, label: null, shaded: false });
        }
        draw();
      }
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!B.drag) return;
    const p = svgPoint(e);
    const m = B.model;
    if (B.drag.type === 'handle') {
      const bar = m.bars[B.drag.b], j = B.drag.s, st = segStart(bar, j), u = uOf(p.x);
      if (j === bar.segs.length - 1) bar.segs[j].len = clamp(u - st, 1, MAXU - st);
      else { const sum = bar.segs[j].len + bar.segs[j + 1].len; bar.segs[j].len = clamp(u - st, 1, sum - 1); bar.segs[j + 1].len = sum - bar.segs[j].len; }
      B.drag.wholes.forEach((w) => { w.to = blen(bar); });
      draw();
    } else if (B.drag.type === 'bracket') {
      const u = uOf(p.x);
      if (u !== B.drag.u1) { B.drag.u1 = u; draw(); }
    }
  });
  const endDrag = () => {
    if (!B.drag) return;
    if (B.drag.type === 'bracket') {
      const { b, u0, u1 } = B.drag;
      const from = Math.min(u0, u1), to = Math.max(u0, u1);
      if (to > from) {
        const overlap = (side) => B.model.brackets.some((x) => x.bar === b && (x.side || 'top') === side && x.from < to && from < x.to);
        B.model.brackets.push({ bar: b, from, to, side: overlap('top') ? 'bottom' : 'top', label: null });
      } else toast('Drag along the bar to make a bracket.');
    }
    B.drag = null;
    draw();
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  let popover = null;
  function openEqualPopover(bi, e) {
    closePopover();
    const wrap = $('#canvas-wrap'), r = wrap.getBoundingClientRect();
    popover = el('div', 'popover');
    popover.innerHTML = '<b style="font-size:14px">How many equal units?</b><div class="row"></div>';
    const row = popover.querySelector('.row');
    for (let n = 2; n <= 10; n++) {
      const b = el('button', 'btn ghost small', String(n));
      b.type = 'button';
      b.onclick = () => {
        const bar = B.model.bars[bi];
        const wholes = wholeBrackets(bi);
        let ul = Math.max(1, Math.round(blen(bar) / n));
        if (ul * n > MAXU) ul = Math.max(1, Math.floor(MAXU / n));
        bar.segs = Array.from({ length: n }, () => ({ len: ul, label: null, shaded: false }));
        wholes.forEach((w) => { w.to = blen(bar); });
        B.model.brackets = B.model.brackets.filter((x) => x.bar !== bi || wholes.includes(x));
        closePopover();
        draw();
      };
      row.append(b);
    }
    wrap.append(popover);
    popover.style.left = clamp(e.clientX - r.left - 100, 8, Math.max(8, r.width - popover.offsetWidth - 8)) + 'px';
    popover.style.top = clamp(e.clientY - r.top + 12, 8, Math.max(8, r.height - popover.offsetHeight - 8)) + 'px';
  }
  function closePopover() { if (popover) { popover.remove(); popover = null; } }
  document.addEventListener('pointerdown', (e) => { if (popover && !popover.contains(e.target) && !canvas.contains(e.target)) closePopover(); });

  // ============================================================
  // Chips (quantities and names in the problem)
  // ============================================================
  function renderProblemText(html) {
    return esc(html).replace(/\[\[(@?)([^\]]+)\]\]/g, (_, at, v) => `<button type="button" class="chip ${at ? 'name' : ''}" data-type="${at ? 'name' : 'num'}" data-v="${v}" aria-pressed="false">${v}</button>`);
  }
  function plainText(html) { return html.replace(/\[\[@?([^\]]+)\]\]/g, '$1'); }
  function hasNameChips() { return !!(T.prob && /\[\[@/.test(T.prob.html)); }
  function setChip(c) {
    B.chip = c;
    $$('#card .chip').forEach((b) => {
      const on = c && ((b.id === 'chip-q' && c.v === '?') || (b.dataset.v === c.v && b.dataset.type === c.type));
      b.setAttribute('aria-pressed', String(!!on));
    });
    if (T.phase === 'build') { renderToolbar(); draw(); }
  }
  $('#card').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    if (T.phase !== 'build' || T.stage === 3) { toast(T.stage === 3 ? 'At this stage you work with the numbers in your head.' : 'Your model is done. Use the numbers in the calculation.'); return; }
    const c = b.id === 'chip-q' ? { type: 'num', v: '?' } : { type: b.dataset.type, v: b.dataset.v };
    setChip(B.chip && B.chip.v === c.v && B.chip.type === c.type ? null : c);
  });

  // ============================================================
  // Turn flow
  // ============================================================
  const T = { prob: null, stage: 0, phase: 'build', firstModel: null, idFirst: null, eqFirst: null, shown: false, n: 0, lastSchema: null };

  function chooseSchema() {
    const en = SCHEMAS.map((s) => s.id).filter((id) => settings.schemas.includes(id));
    if (!en.length) return 'partwhole';
    const st = Object.fromEntries(en.map((id) => [id, prog(pupil, id).stage]));
    const mastered = en.filter((id) => st[id] >= 2), learning = en.filter((id) => st[id] < 2);
    if (mastered.length >= 2 && (!learning.length || Math.random() < 0.5)) {
      const pool = mastered.length > 1 ? mastered.filter((id) => id !== T.lastSchema) : mastered;
      return pick(pool); // mixed review: the pupil has to choose the model
    }
    return learning.length ? learning[0] : pick(en);
  }

  function newProblem() {
    const schema = chooseSchema();
    const P = prog(pupil, schema);
    T.stage = P.stage;
    const range = T.stage === 0 ? 'tiny' : settings.range;
    const customs = store.get('bmb-custom', []).filter((c) => c.schema === schema && (T.stage > 0 || maxValue(c.s) <= 12));
    T.prob = customs.length && Math.random() < 0.5 ? (function () { const c = pick(customs); return finishProblem(schema, { html: c.html, s: c.s }, true); })() : finishProblem(schema, GEN[schema](range));
    T.lastSchema = schema;
    T.phase = T.stage === 3 ? 'name' : 'build';
    T.firstModel = null; T.idFirst = null; T.eqFirst = null; T.shown = false; T.errors = [];
    T.n++;
    B.chip = null; B.hl = null; B.focus = null; B.locked = false; B.drag = null;
    if (T.stage === 0) { B.mode = 'concrete'; B.tool = 'add'; B.model = counterTemplate(T.prob.s); B.model.bars.forEach((b) => b.segs.forEach((x) => { x.counterMode = true; })); }
    else { B.mode = T.stage === 1 ? 'guided' : 'free'; B.tool = 'stretch'; B.model = { bars: [], brackets: [] }; }
    renderPractise();
  }

  function renderPractise() {
    const stage = T.stage;
    $('#prob-count').textContent = `Problem ${T.n}${T.prob.custom ? ' · from your teacher' : ''}`;
    $('#stage-pips').innerHTML = STAGES.map((_, i) => `<i class="${i <= stage ? 'on' : ''}"></i>`).join('');
    $('#stage-name').textContent = STAGES[stage];
    $('#problem-text').innerHTML = renderProblemText(T.prob.html);
    $('#read-aloud').hidden = !settings.read;
    $('#chip-q').hidden = stage === 3;
    $('#chip-help').hidden = stage === 3;
    $('#step-build').hidden = stage === 3;
    $('#step-abstract').hidden = stage !== 3;
    $('#abstract-model').hidden = true;
    $('#build-title').textContent = stage === 0 ? 'Build the model with counters' : 'Build the model';
    $('#build-sub').textContent = stage === 0 ? 'The bars are set up for you at this stage.' : stage === 1 ? 'Squared paper and hints after a mistake.' : 'No hints until you check.';
    $('#build-feedback').hidden = true;
    $('#check-model').disabled = false;
    $('#step-name').hidden = stage !== 3;
    $('#step-eq').hidden = true;
    $('#step-review').hidden = true;
    $('#name-feedback').hidden = true;
    $('#eq-feedback').hidden = true;
    $('#eq-input').value = ''; $('#ans-input').value = '';
    renderSchemaOptions();
    renderStepper();
    if (stage < 3) { renderToolbar(); draw(); }
    setChip(null);
  }

  function renderStepper() {
    const steps = T.stage === 3 ? [['name', 'Name the type'], ['eq', 'Calculate'], ['review', 'Compare']] : [['build', 'Build the model'], ['name', 'Name the type'], ['eq', 'Calculate'], ['review', 'Compare']];
    const idx = steps.findIndex((s) => s[0] === T.phase);
    $('#stepper').innerHTML = steps.map((s, i) => `<span class="${i === idx ? 'now' : i < idx ? 'done' : ''}">${i + 1}. ${s[1]}</span>`).join('');
  }

  function showFeedback(sel, kind, title, msg, hint) {
    const f = $(sel);
    f.className = 'feedback ' + kind;
    f.innerHTML = `<b>${esc(title)}</b>${esc(msg)}${hint ? `<div class="hint">${esc(hint)}</div>` : ''}`;
    f.hidden = false;
  }

  $('#check-model').onclick = () => {
    if (T.phase !== 'build') return;
    const res = T.stage === 0 ? checkCounters(T.prob.s, B.model) : checkModel(T.prob.s, B.model);
    if (T.firstModel === null) T.firstModel = !res;
    if (res) {
      T.errors.push(res.code);
      B.focus = T.stage <= 1 ? res.focus : null;
      draw();
      // Guided and counters stages get a structural hint; Free bars gets only the question
      showFeedback('#build-feedback', 'bad', 'Not quite yet', res.msg, T.stage <= 1 ? 'Hint: ' + res.hint : '');
      return;
    }
    B.focus = null; B.locked = true; setChip(null);
    T.phase = 'name';
    renderToolbar(); draw();
    showFeedback('#build-feedback', 'ok', 'Your model shows the structure.', 'Now say what type of problem it is.');
    $('#check-model').disabled = true;
    $('#step-name').hidden = false;
    renderStepper();
    $('#step-name').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  function renderSchemaOptions() {
    const box = $('#schema-options');
    box.innerHTML = '';
    SCHEMAS.forEach((sc) => {
      const b = el('button', 'opt', `<b>${sc.name}</b><span>${sc.desc}</span>`);
      b.type = 'button';
      b.onclick = () => {
        if (T.phase !== 'name') return;
        const ok = sc.id === T.prob.schema;
        if (T.idFirst === null) T.idFirst = ok;
        if (!ok) {
          b.classList.add('wrong');
          showFeedback('#name-feedback', 'bad', `Not ${sc.name}.`, schemaNudge(T.prob.s), '');
          return;
        }
        b.classList.add('right');
        showFeedback('#name-feedback', 'ok', `Yes: ${sc.name}.`, SCHEMA[sc.id].why);
        T.phase = 'eq';
        $('#step-eq').hidden = false;
        renderStepper();
        $('#eq-input').focus({ preventScroll: true });
        $('#step-eq').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
      box.append(b);
    });
  }
  function schemaNudge(s) {
    switch (s.schema) {
      case 'partwhole': return 'Does anything change over time in this story, or are two parts just put together?';
      case 'change': return 'Is there a starting amount that goes up or down during the story?';
      case 'compare': return 'Are there two separate amounts being compared? Look at how many bars you used.';
      case 'groups': return 'Is the same amount repeated? Look at the units in your model.';
      case 'fraction': return 'Is a whole split into equal units, with some of them counted?';
    }
    return '';
  }

  // equation: live highlight of matching parts
  $('#eq-input').addEventListener('input', () => {
    const r = parseEq($('#eq-input').value);
    B.hl = new Set((r.nums || []).map(String));
    if (T.stage < 3) draw();
    else if (!$('#abstract-model').hidden) $('#abstract-model').innerHTML = svgString(expertModel(T.prob.s), { hl: B.hl, names: false });
  });
  $$('.ops button').forEach((b) => {
    b.onclick = () => { const i = $('#eq-input'); const p = i.selectionStart ?? i.value.length; i.value = i.value.slice(0, p) + ` ${b.dataset.op} ` + i.value.slice(i.selectionEnd ?? p); i.focus(); i.dispatchEvent(new Event('input')); };
  });
  $('#ans-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#check-eq').click(); });
  $('#eq-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#ans-input').focus(); });

  $('#check-eq').onclick = () => {
    if (T.phase !== 'eq') return;
    const r = parseEq($('#eq-input').value);
    const ans = Number(String($('#ans-input').value).replace(/[£,\s]|cm|ml|g/g, ''));
    const target = T.prob.answer;
    let msg = null;
    if (r.error) msg = r.error;
    else if (Math.abs(r.value - target) > 1e-9) msg = `Your calculation comes to ${fmt(r.value)}. Look at the model: where is the ?, and which parts and totals do you know?`;
    else if ($('#ans-input').value.trim() === '' || isNaN(ans)) msg = 'Your calculation is right. Now work it out and write the answer.';
    else if (Math.abs(ans - target) > 1e-9) msg = 'Your calculation is right. Check the answer you worked out.';
    if (T.eqFirst === null) T.eqFirst = !msg;
    if (msg) { showFeedback('#eq-feedback', 'bad', 'Not quite yet', msg); return; }
    showFeedback('#eq-feedback', 'ok', `Correct: ${fmt(target)}.`, '');
    T.phase = 'review';
    T.eqText = $('#eq-input').value.trim();
    finishTurn();
  };

  function finishTurn() {
    const P = prog(pupil, T.prob.schema);
    const stage = T.stage;
    const modelOk = stage < 3 ? T.firstModel : T.eqFirst;
    P.problems++;
    if (stage < 3) { P.models++; if (T.firstModel) P.modelsOk++; }
    P.ids++; if (T.idFirst) P.idsOk++;
    P.eqs++; if (T.eqFirst) P.eqsOk++;
    if (T.shown) P.shown++;
    T.errors.forEach((c) => { P.errors[c] = (P.errors[c] || 0) + 1; });
    let notice = '';
    const name = SCHEMA[T.prob.schema].name;
    if (modelOk) {
      P.streakOk++; P.streakBad = 0;
      if (P.streakOk >= 3 && P.stage < 3) { P.stage++; P.streakOk = 0; notice = `Three right in a row. Next time a ${name} problem comes up, you move on to ${STAGES[P.stage]}.`; }
      else if (P.stage < 3) notice = `${P.streakOk} of 3 right in a row for ${name} problems.`;
    } else {
      P.streakBad++; P.streakOk = 0;
      if (P.streakBad >= 2 && P.stage > 0) { P.stage--; P.streakBad = 0; notice = `Let’s go back to ${STAGES[P.stage]} for ${name} problems for a little while.`; }
    }
    saveProg(pupil, T.prob.schema, P);
    // review
    $('#review-yours').innerHTML = stage < 3 ? svgString(B.model, { names: false }) : '<p class="muted" style="margin:16px">Equation only this time.</p>';
    $('#review-expert').innerHTML = svgString(expertModel(T.prob.s), { names: false });
    $('#review-eq').innerHTML = `${esc(T.eqText)} = ${fmt(T.prob.answer)}`;
    $('#review-note').textContent = stage < 3 ? 'Your model does not have to look exactly like the expert one. What matters is the same parts, the same whole, and the ? in the same place.' : 'This is the model behind your calculation.';
    $('#stage-notice').textContent = notice;
    $('#stage-notice').hidden = !notice;
    $('#step-review').hidden = false;
    renderStepper();
    $('#step-review').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  $('#next-problem').onclick = () => { newProblem(); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  $('#show-model').onclick = () => {
    T.shown = true;
    const box = $('#abstract-model');
    box.innerHTML = svgString(expertModel(T.prob.s), { hl: B.hl, names: false });
    box.hidden = false;
  };

  $('#read-aloud').onclick = () => {
    try {
      if (!window.speechSynthesis) return toast('Read aloud is not available in this browser.');
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(plainText(T.prob.html).replace(/£(\d+)/g, '$1 pounds'));
      u.rate = 0.9; u.lang = 'en-GB';
      speechSynthesis.speak(u);
    } catch (e) { toast('Read aloud is not available here.'); }
  };

  // ============================================================
  // Equation parser (numbers and + − × ÷ ( ), optional "= ?")
  // ============================================================
  const fmt = (v) => (Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000));
  function parseEq(raw) {
    let s = String(raw || '').replace(/−|–/g, '-').replace(/[×xX*]/g, '*').replace(/÷/g, '/').replace(/,/g, '').replace(/£|cm|ml|\bg\b/g, '');
    if (s.includes('=')) {
      const parts = s.split('=').map((p) => p.trim());
      s = parts.find((p) => p && !p.includes('?') && /[+\-*/]/.test(p)) || parts.find((p) => p && !p.includes('?')) || '';
    }
    s = s.replace(/\?/g, '').trim();
    const toks = s.match(/\d+(?:\.\d+)?|[+\-*/()]/g) || [];
    const nums = toks.filter((t) => /\d/.test(t)).map(Number);
    if (!s) return { error: 'Write a calculation using numbers from the problem, like 40 − 15.', nums };
    if (toks.join('') !== s.replace(/\s+/g, '')) return { error: 'Use only numbers and + − × ÷.', nums };
    if (!toks.some((t) => /[+\-*/]/.test(t))) return { error: 'Write the calculation, not just the answer: for example 40 − 15.', nums };
    let i = 0;
    const peek = () => toks[i];
    function expr() { let v = term(); while (peek() === '+' || peek() === '-') { const o = toks[i++]; const r = term(); v = o === '+' ? v + r : v - r; } return v; }
    function term() { let v = factor(); while (peek() === '*' || peek() === '/') { const o = toks[i++]; const r = factor(); v = o === '*' ? v * r : v / r; } return v; }
    function factor() {
      const t = toks[i++];
      if (t === '(') { const v = expr(); if (toks[i++] !== ')') throw 0; return v; }
      if (t === '-') return -factor();
      if (t != null && /\d/.test(t)) return Number(t);
      throw 0;
    }
    try { const v = expr(); if (i !== toks.length || !isFinite(v)) throw 0; return { value: v, nums }; }
    catch (e) { return { error: 'That calculation is not complete. Check the numbers and signs.', nums }; }
  }

  // ============================================================
  // Views
  // ============================================================
  function show(v) {
    ['practise', 'teacher', 'dash', 'print'].forEach((n) => { $('#view-' + n).hidden = n !== v; });
    $$('nav.tabs button').forEach((b) => b.setAttribute('aria-current', b.dataset.view === v || (v === 'print' && b.dataset.view === 'teacher') ? 'page' : 'false'));
    if (v === 'teacher') renderTeacher();
    if (v === 'dash') renderDash();
    if (v === 'print') renderPrint();
  }
  $$('nav.tabs button').forEach((b) => { b.onclick = () => show(b.dataset.view); });

  const pupilIn = $('#pupil');
  pupilIn.value = pupil;
  pupilIn.addEventListener('change', () => {
    pupil = pupilIn.value.trim() || 'Pupil 1';
    pupilIn.value = pupil;
    store.set('bmb-pupil', pupil);
    newProblem();
    toast(`Practising as ${pupil}.`);
  });

  // ============================================================
  // Teacher view
  // ============================================================
  function renderTeacher() {
    const ch = $('#schema-checks');
    ch.innerHTML = '';
    SCHEMAS.forEach((sc) => {
      const l = el('label', '', `<input type="checkbox" id="sch-${sc.id}"> <span><b>Level ${sc.level} · ${sc.name}</b> <span class="muted">${sc.desc}</span></span>`);
      const c = l.querySelector('input');
      c.checked = settings.schemas.includes(sc.id);
      c.onchange = () => {
        settings.schemas = SCHEMAS.map((s) => s.id).filter((id) => $('#sch-' + id).checked);
        if (!settings.schemas.length) { settings.schemas = [sc.id]; c.checked = true; toast('Keep at least one problem type.'); }
        saveSettings();
      };
      ch.append(l);
    });
    $('#range').value = settings.range;
    $('#opt-read').checked = !!settings.read;
    $('#jump-schema').innerHTML = SCHEMAS.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
    $('#jump-stage').innerHTML = STAGES.map((s, i) => `<option value="${i}">${s}</option>`).join('');
    $('#cp-schema').innerHTML = SCHEMAS.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
    $('#cp-schema').value = cpSchema;
    renderCpFields();
    renderCpList();
  }
  $('#range').onchange = (e) => { settings.range = e.target.value; saveSettings(); };
  $('#opt-read').onchange = (e) => { settings.read = e.target.checked; saveSettings(); $('#read-aloud').hidden = !settings.read; };
  $('#jump-go').onclick = () => {
    const sc = $('#jump-schema').value, st = +$('#jump-stage').value;
    const P = prog(pupil, sc);
    P.stage = st; P.streakOk = 0; P.streakBad = 0;
    saveProg(pupil, sc, P);
    if (!settings.schemas.includes(sc)) { settings.schemas.push(sc); saveSettings(); }
    toast(`${pupil} is now on ${STAGES[st]} for ${SCHEMA[sc].name}.`);
    newProblemWith(sc); // show that type next
    show('practise');
  };
  function newProblemWith(sc) {
    const keep = settings.schemas;
    settings.schemas = [sc];
    newProblem();
    settings.schemas = keep;
  }

  // custom problem authoring via a structure definition
  let cpSchema = 'partwhole';
  const CP_FIELDS = {
    partwhole: [['a', 'Part 1', 'num', 17], ['b', 'Part 2', 'num', 25], ['unknown', 'Find', ['whole:the total', 'b:part 2']]],
    change: [['dir', 'Direction', ['join:join (goes up)', 'separate:separate (goes down)']], ['start', 'Start amount', 'num', 40], ['change', 'Change', 'num', 15], ['unknown', 'Find', ['end:the end amount', 'change:the change']]],
    compare: [['bigName', 'Who has more', 'text', 'Mia'], ['big', 'Their amount', 'num', 24], ['smallName', 'Who has less', 'text', 'Leo'], ['small', 'Their amount', 'num', 12], ['unknown', 'Find', ['diff:the difference', 'big:the bigger amount', 'small:the smaller amount']]],
    groups: [['variant', 'Kind', ['groups:equal groups', 'times:times as many']], ['k', 'Number of units', 'num', 4], ['u', 'Size of one unit', 'num', 6], ['unitName', 'Name for one unit (times as many)', 'text', 'Leo'], ['otherName', 'Name for the bigger bar (times as many)', 'text', 'Mia'], ['unknown', 'Find', ['total:the total', 'unit:one unit']]],
    fraction: [['num', 'Numerator', 'num', 3], ['den', 'Denominator', 'num', 5], ['whole', 'Whole amount', 'num', 30], ['unknown', 'Find', ['part:the fraction of it', 'whole:the whole']]],
  };
  const CP_EXAMPLES = {
    partwhole: 'A shop sold 17 red pens and 25 blue pens. How many pens did it sell?',
    change: 'Sam had 40 stickers and gave away 15. How many stickers are left?',
    compare: 'Mia has 24 cards. Leo has 12 cards. How many more cards does Mia have?',
    groups: 'There are 4 boxes with 6 eggs in each box. How many eggs are there?',
    fraction: 'There are 30 children in the class. 3/5 of them are girls. How many girls are there?',
  };
  $('#cp-schema').onchange = (e) => { cpSchema = e.target.value; renderCpFields(); };
  function renderCpFields() {
    const box = $('#cp-fields');
    box.innerHTML = '';
    CP_FIELDS[cpSchema].forEach(([k, label, type, def]) => {
      const f = el('div', 'field');
      const id = 'cpf-' + k;
      if (Array.isArray(type)) f.innerHTML = `<label class="label" for="${id}">${label}</label><select id="${id}">${type.map((o) => { const [v, t] = o.split(':'); return `<option value="${v}">${t}</option>`; }).join('')}</select>`;
      else f.innerHTML = `<label class="label" for="${id}">${label}</label><input id="${id}" ${type === 'num' ? 'type="number" min="1"' : ''} value="${esc(def)}">`;
      box.append(f);
    });
    $('#cp-text').value = CP_EXAMPLES[cpSchema];
    $('#cp-feedback').hidden = true;
    $('#cp-preview-wrap').hidden = true;
  }
  function cpBuild() {
    const v = (k) => { const e = $('#cpf-' + k); return e ? e.value.trim() : ''; };
    const n = (k) => Number(v(k));
    const bad = (msg) => ({ error: msg });
    const posInt = (...ks) => ks.every((k) => Number.isInteger(n(k)) && n(k) > 0);
    let s, names = [];
    if (cpSchema === 'partwhole') {
      if (!posInt('a', 'b')) return bad('Use whole numbers above zero.');
      const a = n('a'), b = n('b');
      s = v('unknown') === 'whole' ? { parts: [K(a), K(b)], whole: Q(a + b) } : { parts: [K(a), Q(b)], whole: K(a + b) };
    } else if (cpSchema === 'change') {
      if (!posInt('start', 'change')) return bad('Use whole numbers above zero.');
      const st = n('start'), c = n('change');
      if (v('dir') === 'join') s = v('unknown') === 'end' ? { dir: 'join', parts: [K(st), K(c)], whole: Q(st + c), shaded: null } : { dir: 'join', parts: [K(st), Q(c)], whole: K(st + c), shaded: null };
      else {
        if (c >= st) return bad('For a separate problem, the change must be smaller than the start amount.');
        s = v('unknown') === 'end' ? { dir: 'separate', parts: [Q(st - c), K(c)], whole: K(st), shaded: 1 } : { dir: 'separate', parts: [K(st - c), Q(c)], whole: K(st), shaded: 1 };
      }
    } else if (cpSchema === 'compare') {
      if (!posInt('big', 'small')) return bad('Use whole numbers above zero.');
      if (n('big') <= n('small')) return bad('The person who has more needs the bigger amount.');
      if (!v('bigName') || !v('smallName') || v('bigName') === v('smallName')) return bad('Give the two bars different names.');
      const B0 = n('big'), S0 = n('small'), u = v('unknown');
      s = { big: (u === 'big' ? Q : K)(B0, v('bigName')), small: (u === 'small' ? Q : K)(S0, v('smallName')), diff: (u === 'diff' ? Q : K)(B0 - S0) };
      names = [v('bigName'), v('smallName')];
    } else if (cpSchema === 'groups') {
      if (!posInt('k', 'u')) return bad('Use whole numbers above zero.');
      if (n('k') < 2 || n('k') > 10) return bad('Use between 2 and 10 units.');
      const k = n('k'), u = n('u'), unk = v('unknown');
      if (v('variant') === 'groups') s = { variant: 'groups', k, unit: (unk === 'unit' ? Q : K)(u), total: (unk === 'total' ? Q : K)(k * u) };
      else {
        if (!v('unitName') || !v('otherName') || v('unitName') === v('otherName')) return bad('Give the two bars different names.');
        s = { variant: 'times', k, unit: (unk === 'unit' ? Q : K)(u, v('unitName')), other: v('otherName'), total: (unk === 'total' ? Q : K)(k * u) };
        names = [v('unitName'), v('otherName')];
      }
    } else if (cpSchema === 'fraction') {
      if (!posInt('num', 'den', 'whole')) return bad('Use whole numbers above zero.');
      const nu = n('num'), de = n('den'), W = n('whole');
      if (nu >= de || de > 12) return bad('Use a proper fraction with a denominator up to 12.');
      if (W % de) return bad(`The whole (${W}) must split evenly into ${de} units.`);
      s = { num: nu, den: de, whole: (v('unknown') === 'whole' ? Q : K)(W), part: (v('unknown') === 'part' ? Q : K)(W / de * nu) };
    }
    s = Object.assign({ schema: cpSchema }, s);
    // the story must mention every known quantity (and the bar names); those become tappable chips
    const text = $('#cp-text').value.trim();
    if (!text) return bad('Write the story.');
    if (/\[\[|\]\]/.test(text)) return bad('Please remove [[ and ]] from the story.');
    let html = text;
    const known = roles(s).filter((r) => !r.q).map((r) => r.v);
    for (const kv of known) {
      const re = new RegExp(`(^|[^\\d/])(${kv})(?![\\d/])`);
      if (!re.test(html)) return bad(`The story should mention ${kv}.`);
      html = html.replace(re, `$1[[${kv}]]`);
    }
    const ans = unknownRole(s).v;
    if (new RegExp(`(^|[^\\d/\\[])${ans}(?![\\d/\\]])`).test(html) && !known.includes(ans)) return bad(`The story gives away the answer (${ans}).`);
    for (const nm of names) {
      const re = new RegExp(`\\b${nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      if (!re.test(html)) return bad(`The story should mention ${nm}.`);
      html = html.replace(re, `[[@${nm}]]`);
    }
    return { s, html, text };
  }
  $('#cp-check').onclick = () => {
    const r = cpBuild();
    if (r.error) { showFeedback('#cp-feedback', 'bad', 'Check the problem', r.error); $('#cp-preview-wrap').hidden = true; return; }
    showFeedback('#cp-feedback', 'ok', 'Looks good.', `Answer: ${unknownRole(r.s).v}. The numbers in the story become tappable labels.`);
    $('#cp-preview').innerHTML = svgString(expertModel(r.s), { names: false });
    $('#cp-preview-wrap').hidden = false;
  };
  $('#cp-save').onclick = () => {
    const r = cpBuild();
    if (r.error) { showFeedback('#cp-feedback', 'bad', 'Check the problem', r.error); return; }
    const list = store.get('bmb-custom', []);
    list.push({ id: Date.now(), schema: cpSchema, s: r.s, html: r.html, text: r.text });
    store.set('bmb-custom', list);
    showFeedback('#cp-feedback', 'ok', 'Saved.', 'It will now come up in practice for this problem type.');
    renderCpList();
  };
  function renderCpList() {
    const list = store.get('bmb-custom', []);
    const box = $('#cp-list');
    box.innerHTML = list.length ? '' : '<span class="muted" style="font-size:14px">None yet.</span>';
    list.forEach((c) => {
      const it = el('div', 'custom-item', `<div><span class="pill">${SCHEMA[c.schema].name}</span><div>${esc(c.text)}</div></div>`);
      const del = el('button', 'btn ghost small', 'Delete');
      del.type = 'button';
      del.onclick = () => { store.set('bmb-custom', store.get('bmb-custom', []).filter((x) => x.id !== c.id)); renderCpList(); };
      it.append(del);
      box.append(it);
    });
  }

  // ============================================================
  // Dashboard
  // ============================================================
  function renderDash() {
    const d = data();
    const names = Object.keys(d.pupils);
    const body = $('#dash-body');
    const rows = [];
    names.forEach((nm) => {
      SCHEMAS.forEach((sc) => {
        const P = d.pupils[nm].schemas[sc.id];
        if (!P || (!P.problems && !P.stage)) return;
        const pct = (a, b) => (b ? Math.round((100 * a) / b) + '%' : '–');
        const errs = Object.entries(P.errors || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, k]) => `<span class="pill">${esc(ERRORS[c] || c)} ×${k}</span>`).join('') || '<span class="muted">None</span>';
        rows.push(`<tr><td><b>${esc(nm)}</b></td><td>${sc.name}</td>
          <td><span class="pips" style="display:inline-flex">${STAGES.map((_, i) => `<i class="${i <= P.stage ? 'on' : ''}"></i>`).join('')}</span><div style="font-size:13px">${STAGES[P.stage]}</div></td>
          <td>${pct(P.modelsOk, P.models)} <span class="muted" style="font-size:13px">(${P.modelsOk}/${P.models})</span></td>
          <td>${pct(P.idsOk, P.ids)}</td><td>${pct(P.eqsOk, P.eqs)}</td><td>${P.shown}</td><td>${errs}</td></tr>`);
      });
    });
    if (!rows.length) {
      body.innerHTML = '<div style="text-align:center;padding:32px;display:grid;gap:10px;justify-items:center"><h3>No practice yet</h3><p class="muted" style="margin:0;max-width:52ch">After a pupil finishes a problem, this shows their stage for each problem type, how often their model was right first time, how often they named the type, and their most common model errors.</p></div>';
      return;
    }
    body.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Pupil</th><th>Problem type</th><th>Stage</th><th>Model accuracy</th><th>Type named</th><th>Calculation right</th><th>Models shown</th><th>Common model errors</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  }
  $('#dash-example').onclick = () => {
    const d = data();
    const mk = (stage, models, ok, ids, idok, eqok, shown, errors) => ({ stage, streakOk: 0, streakBad: 0, problems: models, models, modelsOk: ok, ids, idsOk: idok, eqs: ids, eqsOk: eqok, shown, errors });
    d.pupils['Example: Amira'] = { schemas: { partwhole: mk(3, 9, 8, 12, 12, 11, 1, { proportion: 1 }), change: mk(2, 8, 6, 8, 7, 7, 0, { shade: 2, part_labels: 1 }), compare: mk(1, 5, 2, 5, 3, 4, 0, { longer: 2, diff_missing: 2, big_label: 1 }) } };
    d.pupils['Example: Josh'] = { schemas: { partwhole: mk(2, 7, 5, 7, 6, 6, 0, { whole_missing: 2 }), compare: mk(0, 4, 1, 4, 2, 2, 0, { count_unknown: 3, part_labels: 1 }) } };
    d.pupils['Example: Wen'] = { schemas: { groups: mk(2, 6, 5, 6, 6, 5, 0, { equal_units: 1 }), fraction: mk(1, 5, 3, 5, 4, 4, 0, { unit_count: 2, part_bracket: 1 }) } };
    store.set('bmb-data', d);
    renderDash();
    toast('Example pupils added. They are marked "Example".');
  };
  $('#dash-clear').onclick = function handler() {
    const w = $('#dash-clear-wrap');
    w.innerHTML = '<span class="muted">Delete all practice data on this device?</span>';
    const yes = el('button', 'btn small', 'Delete all'); yes.type = 'button';
    const no = el('button', 'btn ghost small', 'Cancel'); no.type = 'button';
    const restore = () => { w.innerHTML = '<button class="btn ghost" type="button" id="dash-clear">Clear data</button>'; $('#dash-clear').onclick = handler; };
    yes.onclick = () => { store.set('bmb-data', { pupils: {} }); restore(); renderDash(); newProblem(); toast('Practice data deleted.'); };
    no.onclick = restore;
    w.append(yes, no);
  };

  // ============================================================
  // Print kit
  // ============================================================
  function renderPrint() {
    const en = settings.schemas.length ? settings.schemas : ['partwhole'];
    const root = $('#print-root');
    root.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const sc = en[i % en.length];
      const p = finishProblem(sc, GEN[sc](settings.range));
      root.append(el('div', 'print-card', `<span class="label">Problem ${i + 1}</span><div class="ptext">${esc(plainText(p.html))}</div>
        <div class="blank-model" aria-label="Blank squared template for a bar model"></div>
        <div class="print-lines"><div>Type of problem:</div><div>Calculation:</div><div>Answer:</div></div>`));
    }
  }
  $('#open-print').onclick = () => show('print');
  $('#print-new').onclick = renderPrint;
  $('#print-back').onclick = () => show('teacher');
  $('#do-print').onclick = () => {
    let framed = false;
    try { framed = window.self !== window.top; } catch (e) { framed = true; }
    if (framed) { $('#print-note').textContent = 'Printing is blocked in this preview. Open the game file directly in a browser to print.'; return; }
    window.print();
  };

  // ============================================================
  // Toast + boot
  // ============================================================
  let toastEl = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = el('div', 'feedback');
      toastEl.setAttribute('role', 'status');
      toastEl.style.cssText = 'position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom, 0px));transform:translateX(-50%);z-index:20;box-shadow:0 8px 24px rgba(0,0,0,.18);max-width:calc(100% - 32px)';
      document.body.append(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { toastEl.hidden = true; }, 2600);
  }

  // read-only hooks for automated checks
  window.__bmb = { get T() { return T; }, get B() { return B; }, resolve, counterTemplate, checkModel, checkCounters, expertModel, parseEq, GEN, finishProblem, newProblemWith, prog };

  newProblem();
})();
