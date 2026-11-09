#!/usr/bin/env node
// =============================================================
// make-art.mjs — renders every game sprite from hand-authored SVG
// into transparent PNGs (assets/). Deterministic (seeded RNG), so
// the art is reproducible and needs no network or paid service.
//
//   node tools/make-art.mjs            (needs `sharp` resolvable)
// =============================================================
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'assets');
fs.mkdirSync(OUT, { recursive: true });

function load(pkg) {
  const bases = [process.cwd(), __dirname, process.env.SHARP_FROM || ''];
  for (const b of bases) {
    if (!b) continue;
    try { return createRequire(pathToFileURL(path.join(b, 'noop.js')))(pkg); } catch (e) { /* next */ }
  }
  throw new Error('sharp not found — set SHARP_FROM=<dir with node_modules/sharp>');
}
const sharp = load('sharp');

// seeded RNG so the starfield is identical every build
let seed = 1337;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

async function render(name, svg, w, h) {
  const file = path.join(OUT, name + '.png');
  await sharp(Buffer.from(svg), { density: 96 }).resize(w, h).png({ compressionLevel: 9 }).toFile(file);
  console.log('  wrote', name + '.png');
}

// ---------------------------------------------------------------
// BACKGROUND — night sky, nebula, starfield, hills + observatory
// ---------------------------------------------------------------
function background(moon = true) {
  const W = 1024, H = 640;
  let stars = '';
  for (let i = 0; i < 260; i++) {
    const x = rnd() * W, y = rnd() * (H * 0.82);
    const r = rnd() < 0.92 ? 0.5 + rnd() * 1.1 : 1.6 + rnd() * 1.2;
    const o = 0.35 + rnd() * 0.65;
    stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="#fff" opacity="${o.toFixed(2)}"/>`;
    if (r > 1.8) stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 4).toFixed(1)}" fill="url(#glow)" opacity="0.6"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0a0d2e"/>
      <stop offset="0.55" stop-color="#22195a"/>
      <stop offset="0.9" stop-color="#4b2d77"/>
      <stop offset="1" stop-color="#6a3a86"/>
    </linearGradient>
    <radialGradient id="glow"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <radialGradient id="neb1"><stop offset="0" stop-color="#7d5cff" stop-opacity="0.55"/><stop offset="1" stop-color="#7d5cff" stop-opacity="0"/></radialGradient>
    <radialGradient id="neb2"><stop offset="0" stop-color="#ff7fb8" stop-opacity="0.35"/><stop offset="1" stop-color="#ff7fb8" stop-opacity="0"/></radialGradient>
    <radialGradient id="neb3"><stop offset="0" stop-color="#3fc6ff" stop-opacity="0.35"/><stop offset="1" stop-color="#3fc6ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="moon" cx="0.4" cy="0.4"><stop offset="0" stop-color="#fffbe9"/><stop offset="0.7" stop-color="#f3e3b5"/><stop offset="1" stop-color="#d9c08a"/></radialGradient>
    <radialGradient id="moonGlow"><stop offset="0" stop-color="#ffeebb" stop-opacity="0.45"/><stop offset="1" stop-color="#ffeebb" stop-opacity="0"/></radialGradient>
    <linearGradient id="hillFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2468"/><stop offset="1" stop-color="#2a1a50"/></linearGradient>
    <linearGradient id="hillNear" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f1542"/><stop offset="1" stop-color="#120c2a"/></linearGradient>
    <filter id="blur40" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>
    <filter id="blur10" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <g filter="url(#blur40)">
    <ellipse cx="300" cy="200" rx="360" ry="140" fill="url(#neb1)" transform="rotate(-14 300 200)"/>
    <ellipse cx="720" cy="140" rx="300" ry="120" fill="url(#neb2)" transform="rotate(10 720 140)"/>
    <ellipse cx="560" cy="330" rx="380" ry="110" fill="url(#neb3)" transform="rotate(-8 560 330)"/>
  </g>
  <ellipse cx="512" cy="260" rx="620" ry="60" fill="#ffffff" opacity="0.05" filter="url(#blur10)" transform="rotate(-18 512 260)"/>
  ${stars}
  ${moon ? `<circle cx="92" cy="86" r="90" fill="url(#moonGlow)"/>
  <circle cx="92" cy="86" r="34" fill="url(#moon)"/>
  <circle cx="80" cy="78" r="6" fill="#d9c08a" opacity="0.5"/><circle cx="104" cy="96" r="4" fill="#d9c08a" opacity="0.5"/><circle cx="98" cy="72" r="3" fill="#d9c08a" opacity="0.45"/>` : ''}
  <path d="M0 560 C 120 520, 220 540, 330 548 S 560 512, 700 536 S 900 520, 1024 530 L1024 640 L0 640 Z" fill="url(#hillFar)"/>
  <!-- observatory on the far ridge -->
  <g transform="translate(820 494)">
    <rect x="-26" y="10" width="52" height="34" fill="#2a1a50"/>
    <path d="M-30 12 A30 30 0 0 1 30 12 Z" fill="#33215e"/>
    <rect x="-4" y="-22" width="8" height="30" fill="#2a1a50" transform="rotate(32)"/>
    <rect x="-6" y="24" width="12" height="20" fill="#ffd36b" opacity="0.85"/>
  </g>
  <path d="M0 596 C 160 570, 300 600, 470 590 S 760 566, 880 584 S 980 590, 1024 586 L1024 640 L0 640 Z" fill="url(#hillNear)"/>
  <!-- pine silhouettes -->
  ${[40, 70, 210, 600, 640, 990].map((x, i) => { const s = 0.7 + (i % 3) * 0.2; const y = 600 - (i % 2) * 6; return `<path d="M${x} ${y - 44 * s} L${x + 14 * s} ${y} L${x - 14 * s} ${y} Z" fill="#0f0a24"/>`; }).join('')}
</svg>`;
}

// ---------------------------------------------------------------
// LUMI — the owl guide (3 expressions)
// ---------------------------------------------------------------
function owl(mood) {
  const eyesOpen = (dx, dy) => `
    <circle cx="${120 + dx}" cy="${150 + dy}" r="15" fill="#1d1540"/>
    <circle cx="${200 + dx}" cy="${150 + dy}" r="15" fill="#1d1540"/>
    <circle cx="${126 + dx}" cy="${144 + dy}" r="5.5" fill="#fff"/>
    <circle cx="${206 + dx}" cy="${144 + dy}" r="5.5" fill="#fff"/>
    <circle cx="${116 + dx}" cy="${157 + dy}" r="2.5" fill="#fff" opacity="0.7"/>
    <circle cx="${196 + dx}" cy="${157 + dy}" r="2.5" fill="#fff" opacity="0.7"/>`;
  let eyes, extra = '';
  if (mood === 'happy') {
    eyes = `<path d="M102 156 Q120 134 138 156" stroke="#1d1540" stroke-width="8" fill="none" stroke-linecap="round"/>
            <path d="M182 156 Q200 134 218 156" stroke="#1d1540" stroke-width="8" fill="none" stroke-linecap="round"/>`;
    extra = `<ellipse cx="96" cy="186" rx="13" ry="8" fill="#ff8fb3" opacity="0.6"/><ellipse cx="224" cy="186" rx="13" ry="8" fill="#ff8fb3" opacity="0.6"/>`;
  } else if (mood === 'think') {
    eyes = eyesOpen(6, -5);
    extra = `<path d="M100 116 Q120 106 140 114" stroke="#3b2a86" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  } else {
    eyes = eyesOpen(0, 0);
  }
  const wingUp = mood === 'think'
    ? `<path d="M262 200 C 300 170, 312 128, 296 104 C 280 130, 262 160, 246 190 Z" fill="url(#wing)"/>`
    : `<ellipse cx="262" cy="232" rx="30" ry="58" fill="url(#wing)" transform="rotate(-12 262 232)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="340" viewBox="0 0 320 340">
  <defs>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a7bff"/><stop offset="1" stop-color="#5a43d4"/></linearGradient>
    <linearGradient id="wing" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6f55e6"/><stop offset="1" stop-color="#4330b0"/></linearGradient>
    <radialGradient id="belly" cx="0.5" cy="0.35"><stop offset="0" stop-color="#fff8ea"/><stop offset="1" stop-color="#e9dcff"/></radialGradient>
    <radialGradient id="disk" cx="0.5" cy="0.45"><stop offset="0" stop-color="#fffdf5"/><stop offset="1" stop-color="#f1e6ff"/></radialGradient>
  </defs>
  <ellipse cx="160" cy="326" rx="96" ry="10" fill="#000" opacity="0.25"/>
  <!-- ear tufts -->
  <path d="M86 100 L70 36 L126 84 Z" fill="#7a5cf2"/>
  <path d="M234 100 L250 36 L194 84 Z" fill="#7a5cf2"/>
  <!-- body -->
  <ellipse cx="160" cy="200" rx="112" ry="122" fill="url(#body)"/>
  <ellipse cx="58" cy="232" rx="30" ry="58" fill="url(#wing)" transform="rotate(12 58 232)"/>
  ${wingUp}
  <!-- belly with feather scallops -->
  <ellipse cx="160" cy="246" rx="70" ry="68" fill="url(#belly)"/>
  ${[0, 1, 2].map((r) => [0, 1, 2, 3].slice(0, 4 - (r === 2 ? 1 : 0)).map((c) => {
    const x = 118 + c * 28 + (r % 2 ? 14 : 0) - (r === 2 ? 0 : 0); const y = 224 + r * 24;
    return `<path d="M${x - 9} ${y} Q${x} ${y + 10} ${x + 9} ${y}" stroke="#c9b6f5" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }).join('')).join('')}
  <!-- face disks -->
  <circle cx="120" cy="152" r="40" fill="url(#disk)"/>
  <circle cx="200" cy="152" r="40" fill="url(#disk)"/>
  ${eyes}
  ${extra}
  <!-- beak -->
  <path d="M148 172 L172 172 L160 194 Z" fill="#ffb13d"/>
  <path d="M148 172 L172 172 L160 180 Z" fill="#ffd27a"/>
  <!-- feet -->
  <path d="M120 312 q6 -14 12 0 q6 -14 12 0 q6 -14 12 0 Z" fill="#ffb13d"/>
  <path d="M164 312 q6 -14 12 0 q6 -14 12 0 q6 -14 12 0 Z" fill="#ffb13d"/>
  <!-- scholar cap -->
  <g transform="translate(160 78) rotate(-6)">
    <path d="M-40 6 L40 6 L36 30 L-36 30 Z" fill="#1c1840"/>
    <path d="M0 -26 L78 2 L0 30 L-78 2 Z" fill="#2a2560"/>
    <path d="M0 -26 L78 2 L0 10 L-78 2 Z" fill="#37307a"/>
    <circle cx="0" cy="2" r="5" fill="#ffc94a"/>
    <path d="M0 2 Q 46 6 58 24" stroke="#ffc94a" stroke-width="4" fill="none" stroke-linecap="round"/>
    <rect x="52" y="22" width="12" height="20" rx="4" fill="#ffc94a"/>
  </g>
</svg>`;
}

// ---------------------------------------------------------------
// ANSWER CRYSTAL — faceted gem with a light label plate
// ---------------------------------------------------------------
function gem(c) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="140" viewBox="0 0 240 140">
  <defs>
    <linearGradient id="plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.p1}"/><stop offset="1" stop-color="${c.p2}"/></linearGradient>
    <radialGradient id="halo"><stop offset="0" stop-color="${c.glow}" stop-opacity="0.55"/><stop offset="1" stop-color="${c.glow}" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse cx="120" cy="70" rx="120" ry="70" fill="url(#halo)"/>
  <!-- outer facets -->
  <path d="M40 22 L200 22 L232 70 L200 118 L40 118 L8 70 Z" fill="${c.edge}"/>
  <path d="M40 22 L200 22 L184 36 L56 36 Z" fill="${c.top}"/>
  <path d="M200 22 L232 70 L212 70 L184 36 Z" fill="${c.side1}"/>
  <path d="M232 70 L200 118 L184 104 L212 70 Z" fill="${c.side2}"/>
  <path d="M200 118 L40 118 L56 104 L184 104 Z" fill="${c.bottom}"/>
  <path d="M40 118 L8 70 L28 70 L56 104 Z" fill="${c.side2}"/>
  <path d="M8 70 L40 22 L56 36 L28 70 Z" fill="${c.side1}"/>
  <!-- label plate -->
  <path d="M56 36 L184 36 L212 70 L184 104 L56 104 L28 70 Z" fill="url(#plate)"/>
  <path d="M56 36 L184 36 L176 44 L64 44 Z" fill="#ffffff" opacity="0.55"/>
  <path d="M40 22 L200 22 L232 70 L200 118 L40 118 L8 70 Z" fill="none" stroke="#ffffff" stroke-opacity="0.65" stroke-width="2"/>
  <path d="M60 28 L90 28 L80 33 L56 33 Z" fill="#fff" opacity="0.8"/>
</svg>`;
}
const GEMS = {
  gem:     { p1: '#ffffff', p2: '#e7e1ff', edge: '#6d5bd9', top: '#b7a9ff', side1: '#8f7cf0', side2: '#5a47c4', bottom: '#4a39a8', glow: '#a48bff' },
  gem_ok:  { p1: '#f3fff6', p2: '#c9f7d7', edge: '#1f9d57', top: '#7fe3a4', side1: '#3fc779', side2: '#178249', bottom: '#11683a', glow: '#4cf08f' },
  gem_bad: { p1: '#fff5f3', p2: '#ffd9d3', edge: '#d0533f', top: '#ffa898', side1: '#ec7a66', side2: '#b2402e', bottom: '#8f3122', glow: '#ff7a63' },
};

// ---------------------------------------------------------------
// STAR (constellation node) + small sparkle
// ---------------------------------------------------------------
function starShape(cx, cy, R, r) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rad).toFixed(1) + ' ' + (cy + Math.sin(a) * rad).toFixed(1) + ' ';
  }
  return d + 'Z';
}
function star() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs>
    <radialGradient id="g"><stop offset="0" stop-color="#ffe9a6" stop-opacity="0.9"/><stop offset="1" stop-color="#ffcf4a" stop-opacity="0"/></radialGradient>
    <linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset="1" stop-color="#ffc23a"/></linearGradient>
  </defs>
  <circle cx="48" cy="48" r="46" fill="url(#g)"/>
  <path d="${starShape(48, 50, 26, 11)}" fill="url(#f)" stroke="#fff3c4" stroke-width="2" stroke-linejoin="round"/>
  <path d="${starShape(44, 44, 8, 3.5)}" fill="#fff" opacity="0.8"/>
</svg>`;
}
function starDim() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <circle cx="48" cy="48" r="10" fill="#cfc8ff" opacity="0.35"/>
  <circle cx="48" cy="48" r="5" fill="#e9e5ff" opacity="0.8"/>
</svg>`;
}

// ---------------------------------------------------------------
// TOPIC ICONS — round badges
// ---------------------------------------------------------------
function badge(c1, c2, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <circle cx="64" cy="66" r="58" fill="#000" opacity="0.25"/>
  <circle cx="64" cy="62" r="58" fill="url(#b)"/>
  <path d="M20 46 A50 50 0 0 1 108 46" stroke="#fff" stroke-opacity="0.35" stroke-width="5" fill="none" stroke-linecap="round"/>
  ${inner}
</svg>`;
}
const ICONS = {
  icon_times: badge('#ffb84d', '#f0662e', `
    <rect x="58" y="26" width="12" height="72" rx="6" fill="#fff" transform="rotate(45 64 62)"/>
    <rect x="58" y="26" width="12" height="72" rx="6" fill="#fff" transform="rotate(-45 64 62)"/>`),
  icon_fractions: badge('#5ee0c4', '#1f9d8c', `
    <circle cx="64" cy="62" r="32" fill="#fff" opacity="0.25"/>
    <path d="M64 62 L64 30 A32 32 0 0 1 96 62 Z" fill="#fff"/>
    <circle cx="64" cy="62" r="32" fill="none" stroke="#fff" stroke-width="5"/>
    <line x1="64" y1="30" x2="64" y2="94" stroke="#fff" stroke-width="4"/><line x1="32" y1="62" x2="96" y2="62" stroke="#fff" stroke-width="4"/>`),
  icon_spanish: badge('#ff7fa8', '#d6336c', `
    <path d="M30 36 h68 a10 10 0 0 1 10 10 v28 a10 10 0 0 1 -10 10 h-38 l-16 14 v-14 h-14 a10 10 0 0 1 -10 -10 v-28 a10 10 0 0 1 10 -10 z" fill="#fff"/>
    <circle cx="48" cy="60" r="6" fill="#d6336c"/><circle cx="64" cy="60" r="6" fill="#d6336c"/><circle cx="80" cy="60" r="6" fill="#d6336c"/>`),
  icon_space: badge('#7aa8ff', '#4a3fd1', `
    <circle cx="64" cy="62" r="24" fill="#fff"/>
    <ellipse cx="64" cy="62" rx="44" ry="12" fill="none" stroke="#fff" stroke-width="5" transform="rotate(-20 64 62)"/>
    <path d="M44 56 a24 24 0 0 1 40 -6" stroke="#b9c8ff" stroke-width="5" fill="none"/>`),
  icon_custom: badge('#b8a6ff', '#6a4fe0', `
    <rect x="58" y="22" width="16" height="66" rx="3" fill="#fff" transform="rotate(40 64 62)"/>
    <path d="M38 92 L44 76 L54 86 Z" fill="#ffd27a"/>
    <rect x="58" y="22" width="16" height="12" rx="3" fill="#ffd27a" transform="rotate(40 64 62)"/>`),
};

// ---------------------------------------------------------------
console.log('Rendering art ->', OUT);
await render('bg', background(true), 1024, 640);
seed = 1337;
await render('bg_play', background(false), 1024, 640);
await render('lumi', owl('idle'), 240, 255);
await render('lumi_happy', owl('happy'), 240, 255);
await render('lumi_think', owl('think'), 240, 255);
for (const [k, c] of Object.entries(GEMS)) await render(k, gem(c), 240, 140);
await render('star', star(), 96, 96);
await render('star_dim', starDim(), 96, 96);
for (const [k, s] of Object.entries(ICONS)) await render(k, s, 128, 128);
console.log('done.');
