/* ===================================================================
   슈퍼알까기 카드 스튜디오 — 렌더링 엔진
   (프레임 / 역할 아이콘 / 절차적 카드 일러스트 / 카드 조합)
   =================================================================== */
const W = 800, H = 1200;                       // 2:3 카드 캔버스
const WIN = { x: 84, y: 84, w: 632, h: 1032 }; // 프레임 안쪽(투명) 창
const HZ = 720;                                // 일러스트 지평선

const GRADES = ['C', 'B', 'A', 'S', 'SS'];
const GRADE_INFO = [
  { g: 'C', ko: '일반', col: '#a3aab4' },
  { g: 'B', ko: '고급', col: '#4ade80' },
  { g: 'A', ko: '희귀', col: '#60a5fa' },
  { g: 'S', ko: '영웅', col: '#c084fc' },
  { g: 'SS', ko: '전설', col: '#fbbf24' },
];
const ROLES = [
  { id: 'atk', ko: '공격', color: '#e5484d' },
  { id: 'def', ko: '방어', color: '#2f7fe0' },
  { id: 'dis', ko: '교란', color: '#9b4de0' },
  { id: 'sup', ko: '지원', color: '#21b45a' },
  { id: 'king', ko: '왕', color: '#e9a800' },
];
const SKILLS = [
  { id: 'pierce', ko: '관통', desc: '앞의 알을 통과해서 공격', color: '#ffe08a', eng: 'a sharp spear-head arrow driving straight through a cracked ring', en: 'PIERCE — the stone is wrapped in a razor-sharp drill/lance of light pointing forward, spiralling light streaks and piercing energy trailing behind it' },
  { id: 'accel', ko: '가속', desc: '빠르게 날아감', color: '#5ee7ff', eng: 'three forward-pointing chevron arrows with trailing speed lines (a fast-forward symbol)', en: 'ACCELERATION — the stone is flying fast in ONE clear direction (diagonally forward and up), dramatic straight wind effect: dense parallel straight wind lines and razor-thin speed streaks all running in the same single direction, streaming past and trailing far behind the stone, a sharp wind-cutting wedge of air at its leading edge, glowing afterimages trailing behind along the same line, the background slightly motion-blurred along that direction' },
  { id: 'explode', ko: '폭발', desc: '주위 알들을 바깥으로 날림', color: '#ff8a3d', eng: 'a bursting explosion starburst with jagged rays and flying shards', en: 'EXPLOSION — the stone is the core of a massive radiant blast, shockwave rings and fiery debris erupting outward all around it' },
  { id: 'shield', ko: '쉴드', desc: '밀려나는 힘 40~70% 감소', color: '#6fb7ff', eng: 'a heraldic shield outline with a hexagonal barrier pattern inside', en: 'SHIELD — the stone is guarded by a glowing translucent hexagonal energy barrier dome with bright shimmering edges' },
  { id: 'thorns', ko: '가시', desc: '나를 친 알을 세게 튕겨냄', color: '#ff4d6d', eng: 'a ring of sharp outward thorns and spikes around a core', en: 'THORNS — sharp glowing crystal spikes burst out from the rim of the stone like armor, crackling with retaliating energy' },
  { id: 'revive', ko: '부활', desc: '바깥에서 죽으면 근처에서 부활', color: '#ffb547', eng: 'a rising phoenix with spread wings inside a circular rebirth arrow', en: 'RESURRECTION — huge blazing phoenix wings unfold behind the stone, a pillar of rebirth light and a radiant halo above it' },
  { id: 'split', ko: '분열', desc: '공격 시 알이 둘로 나뉨', color: '#c77dff', eng: 'one circle cracking and dividing into two circles', en: 'SPLIT — the stone splits into two glowing mirror twins flanking it, connected by a bright dividing energy slash' },
  { id: 'magnet', ko: '자석', desc: '날아가는 알을 내 쪽으로 휘게 함', color: '#ff5a5a', eng: 'a horseshoe magnet with curved field lines pulling inward', en: 'MAGNETISM — an overwhelming magnetic vortex sucks everything toward the stone: glowing red and blue field lines spiral inward and converge into its centre, iron filings, metal shards, sparks, debris and smaller enemy stones are dragged toward it with motion streaks, the surrounding background visibly warps and bends inward like a gravity well, crackling electromagnetic arcs, a red N glow on one side and a blue S glow on the other' },
  { id: 'mark', ko: '표식', desc: '상대 스킬을 봉인', color: '#ff4fd8', eng: 'an occult sealing brand: a thorny eye locked inside a ring of chain links (not an X, not a letter)', en: 'CURSE MARK — the stone casts a dark curse on a smaller enemy stone nearby: a sinister glowing curse brand burns into the enemy stone (an abstract thorny occult symbol made only of curved shapes, thorns and an eye-like spiral — NOT an X, NOT a letter, NOT a number, NOT a crosshair), violet-black cursed smoke and shadowy tendrils and spectral chains link the stone to its victim, the victim stone cracks, darkens and is wrapped in withering purple miasma, an ominous hex circle of pure geometric lines beneath, eerie dark aura' },
  { id: 'cloak', ko: '클로킹', desc: '투명해져 보이지 않음', color: '#9ff5e6', eng: 'a fading eye-shaped veil drawn with broken dotted lines, half vanishing', en: 'CLOAKING — the stone is semi-transparent like clear ghostly glass: the background scenery is clearly visible THROUGH its body, slightly magnified and bent by refraction; a cloaking field spreads around it so the surrounding background also turns see-through, pale and faded, dissolving into translucent haze with heat-haze ripples; only a thin shimmering rim of light, glitching light fragments and faint distortion reveal where it is' },
  { id: 'scout', ko: '정찰', desc: '상대 알의 스킬을 파악', color: '#8fa8ff', eng: 'an all-seeing open eye with radar scan arcs', en: 'SCOUTING / ALL-SEEING EYE — a huge glowing clairvoyant eye opens on the top face of the stone like a mystic third eye, its iris made of swirling starlight; a wide cone of revealing light and scanning beams sweep out from the eye across the field, exposing ghostly translucent silhouettes of distant enemy stones with their hidden skill auras glowing, floating concentric scan rings and radar ripples, an omniscient watchful mood (the eye is pure light and shapes, no text, no letters)' },
  { id: 'support', ko: '지원', desc: '반경 내 아군 강화', color: '#5df08a', eng: 'a radiant cross inside a circle with upward boost arrows around it', en: 'SUPPORT AURA — a warm radiant aura and glowing circle around the stone, rising plus-shaped sparks and blessing light' },
];

/* ---------------- utils ---------------- */
const mk = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgba(h, a) { const [r, g, b] = hex2rgb(h); return `rgba(${r},${g},${b},${a})`; }
function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
const lighten = (c, t) => mix(c, '#ffffff', t), darken = (c, t) => mix(c, '#000000', t);
function hsl2hex(h, s, l) { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l); const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); }

function radial(g, x, y, r, col, a, comp) {
  g.save(); if (comp) g.globalCompositeOperation = comp;
  const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, rgba(col, a)); rg.addColorStop(1, rgba(col, 0));
  g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r); g.restore();
}
function sparkle(g, x, y, r, col, a = 1) {
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a;
  const rg = g.createRadialGradient(x, y, 0, x, y, r * 1.1); rg.addColorStop(0, 'rgba(255,255,255,.85)'); rg.addColorStop(.25, rgba(col, .45)); rg.addColorStop(1, rgba(col, 0));
  g.fillStyle = rg; g.beginPath(); g.arc(x, y, r * 1.1, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r * .7, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r * .7, y); g.quadraticCurveTo(x, y, x, y - r); g.fill();
  g.restore();
}
function drawGem(g, x, y, r, col, glow) {
  g.save(); if (glow) { g.shadowColor = col; g.shadowBlur = glow; }
  const gr = g.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r);
  gr.addColorStop(0, '#fff'); gr.addColorStop(.25, lighten(col, .35)); gr.addColorStop(.7, col); gr.addColorStop(1, darken(col, .5));
  g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = gr; g.fill(); g.shadowBlur = 0;
  g.lineWidth = Math.max(1.5, r * .18); g.strokeStyle = darken(col, .6); g.stroke();
  g.beginPath(); g.ellipse(x - r * .3, y - r * .38, r * .32, r * .18, -.6, 0, 7); g.fillStyle = 'rgba(255,255,255,.85)'; g.fill();
  g.restore();
}
function feather(g, x, y, len, wid, ang, fill, stroke) {
  g.save(); g.translate(x, y); g.rotate(ang); g.beginPath(); g.moveTo(0, 0);
  g.quadraticCurveTo(len * .45, -wid, len, 0); g.quadraticCurveTo(len * .45, wid * .6, 0, 0); g.closePath();
  g.fillStyle = fill; g.fill(); if (stroke) { g.lineWidth = 1.5; g.strokeStyle = stroke; g.stroke(); } g.restore();
}
function wings(g, cx, cy, side, n, len, wid, fill, stroke, spread = .3) {
  for (let i = n - 1; i >= 0; i--) {
    const ang = side > 0 ? (-0.85 + i * spread) : (Math.PI + 0.85 - i * spread);
    feather(g, cx, cy, len * (1 - i * .1), wid, ang, fill, stroke);
  }
}
function flameTongue(g, x, y, nx, ny, len, wid, c1, c2, sway = 0) {
  const px = -ny, py = nx, tx = x + nx * len + px * sway, ty = y + ny * len + py * sway;
  const gr = g.createLinearGradient(x, y, tx, ty); gr.addColorStop(0, rgba(c1, .95)); gr.addColorStop(.5, rgba(c2, .7)); gr.addColorStop(1, rgba(c2, 0));
  g.fillStyle = gr; g.beginPath(); g.moveTo(x + px * wid, y + py * wid);
  g.quadraticCurveTo(x + nx * len * .5 + px * wid * .9, y + ny * len * .5 + py * wid * .9, tx, ty);
  g.quadraticCurveTo(x + nx * len * .5 - px * wid * .9, y + ny * len * .5 - py * wid * .9, x - px * wid, y - py * wid);
  g.closePath(); g.fill();
}
function polyPath(g, x, y, r, n, rot = -Math.PI / 2) { for (let i = 0; i < n; i++) { const a = rot + i / n * Math.PI * 2; i ? g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); }
function starPath(g, x, y, r1, r2, n, rot = -Math.PI / 2) { for (let i = 0; i < n * 2; i++) { const a = rot + i / (n * 2) * Math.PI * 2, r = i % 2 ? r2 : r1; i ? g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); }

/* =================================================================
   1) 프레임
   ================================================================= */
const TIER_PAL = [
  { light: '#e3e7ec', mid: '#a3aab4', dark: '#4c525b', accent: '#cfd4da', gem: '#b8c0ca', glow: '#cbd5e1' },
  { light: '#b9f5c4', mid: '#3fae5c', dark: '#15491f', accent: '#e0b67c', gem: '#4fe07a', glow: '#4ade80' },
  { light: '#cde9ff', mid: '#3a86e0', dark: '#102f66', accent: '#eef4fb', gem: '#47b3ff', glow: '#60a5fa' },
  { light: '#f1d9ff', mid: '#9b4be0', dark: '#2f0d55', accent: '#ffd36b', gem: '#e07bff', glow: '#c084fc' },
  { light: '#fff6cc', mid: '#f2b630', dark: '#6e3603', accent: '#ff4d6d', gem: '#ff3d63', glow: '#ffc23d' },
];
const FRAME_SHAPES = { round: '둥근 모서리', chamfer: '깎은 모서리', notch: '오목 모서리' };
const FRAME_PATTERNS = { lines: '이중선', dots: '구슬', diamonds: '다이아', runes: '룬 문자' };
const FRAME_CORNERS = ['브래킷', '가시잎', '메달리온'];

function randomFrameDesign(seed) {
  const r = mulberry32(seed);
  const pick = a => a[Math.floor(r() * a.length)];
  return { seed, shape: pick(Object.keys(FRAME_SHAPES)), pattern: pick(Object.keys(FRAME_PATTERNS)), corner: Math.floor(r() * 3), thick: 22 + Math.round(r() * 8), radius: 18 + Math.round(r() * 22) };
}
function frameKey(d, t) { return [d.seed, d.shape, d.pattern, d.corner, d.thick, d.radius, t].join('_'); }

function shapePath(g, x, y, w, h, r, kind) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  if (kind === 'chamfer') {
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.lineTo(x + w, y + r); g.lineTo(x + w, y + h - r);
    g.lineTo(x + w - r, y + h); g.lineTo(x + r, y + h); g.lineTo(x, y + h - r); g.lineTo(x, y + r); g.closePath();
  } else if (kind === 'notch') {
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.arc(x + w, y, r, Math.PI, Math.PI / 2, true);
    g.lineTo(x + w, y + h - r); g.arc(x + w, y + h, r, -Math.PI / 2, -Math.PI, true);
    g.lineTo(x + r, y + h); g.arc(x, y + h, r, 0, -Math.PI / 2, true);
    g.lineTo(x, y + r); g.arc(x, y, r, Math.PI / 2, 0, true); g.closePath();
  } else g.roundRect(x, y, w, h, r);
}
function frameGeom(d, t) {
  const b = d.thick + t * 4;
  const O = { x: WIN.x - b, y: WIN.y - b, w: WIN.w + 2 * b, h: WIN.h + 2 * b };
  const rI = d.radius;
  const rO = d.shape === 'chamfer' ? rI + b * .42 : d.shape === 'notch' ? rI * .85 : rI + b;
  return {
    b, O, rI, rO, kind: d.shape,
    socket: { x: WIN.x + 40, y: WIN.y + 40, r: 50 + t * 2 },
    emblem: { x: W / 2, y: WIN.y + [-4, 2, 8, 14, 20][t], s: [34, 48, 54, 58, 62][t] },
    plate: { x: W / 2, y: WIN.y + WIN.h - 8, w: 360 + t * 26, h: 60 },
  };
}
const outerPath = (g, G) => shapePath(g, G.O.x, G.O.y, G.O.w, G.O.h, G.rO, G.kind);
const innerPath = (g, G) => shapePath(g, WIN.x, WIN.y, WIN.w, WIN.h, G.rI, G.kind);
function cutInner(g, G) { g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); innerPath(g, G); g.fill(); g.restore(); }

function metalGrad(g, x0, y0, x1, y1, P, t) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  const s = t === 0 ? [[0, P.light], [.5, P.mid], [1, P.dark]]
    : [[0, P.light], [.18, P.mid], [.36, P.dark], [.48, P.mid], [.56, P.light], [.72, P.mid], [.88, P.dark], [1, P.mid]];
  s.forEach(([o, c]) => gr.addColorStop(o, c)); return gr;
}
function goldGrad(g, x0, y0, x1, y1, base) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, lighten(base, .6)); gr.addColorStop(.35, base); gr.addColorStop(.6, darken(base, .35)); gr.addColorStop(.8, lighten(base, .3)); gr.addColorStop(1, darken(base, .2));
  return gr;
}
function bandPoints(G, step, skip) {
  const { O, b } = G, m = b / 2, x0 = O.x + m, y0 = O.y + m, x1 = O.x + O.w - m, y1 = O.y + O.h - m, pts = [];
  const seg = (ax, ay, bx, by, nx, ny) => {
    const L = Math.hypot(bx - ax, by - ay), n = Math.floor((L - 2 * skip) / step), pad = ((L - 2 * skip) - n * step) / 2;
    for (let i = 0; i <= n; i++) { const u = (skip + pad + i * step) / L; pts.push({ x: ax + (bx - ax) * u, y: ay + (by - ay) * u, nx, ny, ang: Math.atan2(by - ay, bx - ax) }); }
  };
  seg(x0, y0, x1, y0, 0, -1); seg(x1, y0, x1, y1, 1, 0); seg(x1, y1, x0, y1, 0, 1); seg(x0, y1, x0, y0, -1, 0);
  return pts;
}

function renderFrame(d, t, opt = {}) {
  const G = frameGeom(d, t), P = TIER_PAL[t], rnd = mulberry32((d.seed | 0) * 31 + t * 977 + 5);
  const c = mk(), g = c.getContext('2d'), fx = opt.fx !== false;
  if (t >= 1 && fx) { const f = mk(), fg = f.getContext('2d'); frameBackFx(fg, d, t, G, P, rnd); cutInner(fg, G); g.drawImage(f, 0, 0); }
  drawBand(g, d, t, G, P, rnd);
  drawCorners(g, d, t, G, P, rnd);
  if (t >= 3) sideGems(g, t, G, P);
  drawPlate(g, t, G, P);
  drawSocket(g, t, G, P);
  drawEmblem(g, t, G, P, rnd);
  if (t >= 1 && fx) { const f = mk(), fg = f.getContext('2d'); frameFrontFx(fg, t, G, P, rnd); cutInner(fg, G); g.drawImage(f, 0, 0); }
  return c;
}

function frameBackFx(g, d, t, G, P, rnd) {
  g.save();
  g.shadowColor = rgba(P.glow, [0, .55, .75, .9, 1][t]); g.shadowBlur = [0, 16, 26, 38, 50][t];
  g.beginPath(); outerPath(g, G); g.fillStyle = P.glow; g.fill(); if (t >= 3) g.fill();
  g.restore();
  if (t >= 3) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const n = t === 4 ? 44 : 26, cx = W / 2, cy = H / 2;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + rnd() * .04, da = .018 + rnd() * .03;
      const col = t === 4 ? (i % 3 === 0 ? P.accent : i % 3 === 1 ? P.light : hsl2hex(i * 37 % 360, 90, 65)) : P.glow;
      const rg = g.createRadialGradient(cx, cy, 480, cx, cy, 820);
      rg.addColorStop(0, rgba(col, 0)); rg.addColorStop(.25, rgba(col, t === 4 ? .55 : .35)); rg.addColorStop(1, rgba(col, 0));
      g.fillStyle = rg; g.beginPath(); g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a - da) * 1000, cy + Math.sin(a - da) * 1000); g.lineTo(cx + Math.cos(a + da) * 1000, cy + Math.sin(a + da) * 1000); g.closePath(); g.fill();
    }
    const step = t === 4 ? 26 : 58;
    for (const p of bandPoints(G, step, 30)) {
      if (t === 3 && rnd() < .35) continue;
      const len = t === 4 ? 24 + rnd() * 46 : 14 + rnd() * 22;
      flameTongue(g, p.x + p.nx * G.b * .45, p.y + p.ny * G.b * .45, p.nx, p.ny, len, t === 4 ? 12 + rnd() * 8 : 8, t === 4 ? P.light : P.light, t === 4 ? (rnd() < .5 ? P.mid : P.accent) : P.glow, (rnd() - .5) * 16);
    }
    g.restore();
  }
}

function drawBand(g, d, t, G, P, rnd) {
  const { O, b } = G;
  g.save();
  g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 16; g.shadowOffsetY = 6;
  g.beginPath(); outerPath(g, G); innerPath(g, G);
  g.fillStyle = metalGrad(g, O.x, O.y, O.x + O.w, O.y + O.h, P, t); g.fill('evenodd');
  g.restore();
  if (t === 4 || t === 3) { // 홀로그램 / 광택
    g.save(); g.beginPath(); outerPath(g, G); innerPath(g, G); g.clip('evenodd');
    const cg = g.createConicGradient(rnd() * 6, W / 2, H / 2);
    const hues = t === 4 ? [0, 50, 120, 190, 260, 320, 360] : [270, 300, 40, 270, 300, 40, 270];
    hues.forEach((h, i) => cg.addColorStop(i / (hues.length - 1), hsl2hex(h % 360, 95, 60)));
    g.globalCompositeOperation = 'overlay'; g.globalAlpha = t === 4 ? .5 : .28; g.fillStyle = cg; g.fillRect(0, 0, W, H);
    g.restore();
  }
  bandPattern(g, d, t, G, P, rnd);
  g.save();
  g.beginPath(); outerPath(g, G); g.lineWidth = 3; g.strokeStyle = darken(P.dark, .45); g.stroke();
  g.beginPath(); shapePath(g, O.x + 4, O.y + 4, O.w - 8, O.h - 8, G.rO - 3, G.kind); g.lineWidth = 2; g.strokeStyle = rgba(lighten(P.light, .4), t ? .75 : .5); g.stroke();
  g.beginPath(); innerPath(g, G); g.lineWidth = 5; g.strokeStyle = darken(P.dark, .35); g.stroke();
  g.beginPath(); shapePath(g, WIN.x - 6, WIN.y - 6, WIN.w + 12, WIN.h + 12, G.rI + 6, G.kind);
  g.lineWidth = t >= 2 ? 3 : 2; g.strokeStyle = t >= 3 ? P.accent : lighten(P.mid, .35);
  if (t >= 3) { g.shadowColor = P.accent; g.shadowBlur = 8; }
  g.stroke();
  g.restore();
}

function bandPattern(g, d, t, G, P, rnd) {
  const { O, b } = G, m = b / 2;
  g.save(); g.beginPath(); outerPath(g, G); innerPath(g, G); g.clip('evenodd');
  const col = t >= 3 ? P.accent : darken(P.dark, .25), a = t >= 3 ? .95 : .6;
  if (t >= 3) { g.shadowColor = P.accent; g.shadowBlur = 6; }
  g.beginPath(); shapePath(g, O.x + m, O.y + m, O.w - b, O.h - b, (G.rO + G.rI) / 2, G.kind);
  g.lineWidth = t === 0 ? 1.5 : 2; g.strokeStyle = rgba(col, a * .6);
  if (d.pattern === 'lines' || t === 0) g.stroke();
  if (t === 0) { g.restore(); return; }
  if (d.pattern === 'lines') {
    for (const k of [-1, 1]) { const mm = m + k * b * .26; g.beginPath(); shapePath(g, O.x + mm, O.y + mm, O.w - 2 * mm, O.h - 2 * mm, (G.rO + G.rI) / 2 - k * b * .2, G.kind); g.lineWidth = 1.5; g.strokeStyle = rgba(col, a * .7); g.stroke(); }
  } else {
    const pts = bandPoints(G, d.pattern === 'runes' ? 30 : 24, 70 + t * 6);
    pts.forEach((p, i) => {
      g.save(); g.translate(p.x, p.y); g.rotate(p.ang); g.fillStyle = rgba(col, a); g.strokeStyle = rgba(col, a);
      if (d.pattern === 'dots') { g.beginPath(); g.arc(0, 0, 2.6 + t * .6, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(-1, -1, 1, 0, 7); g.fill(); }
      else if (d.pattern === 'diamonds') { const s = 4 + t; g.beginPath(); g.moveTo(-s * 1.6, 0); g.lineTo(0, -s); g.lineTo(s * 1.6, 0); g.lineTo(0, s); g.closePath(); g.fill(); }
      else {
        const r2 = mulberry32(i * 13 + 7); g.lineWidth = 2; g.lineCap = 'round'; g.beginPath();
        g.moveTo(-5, -7); g.lineTo(-5, 7);
        const k = Math.floor(r2() * 4);
        if (k === 0) { g.moveTo(-5, -5); g.lineTo(4, -1); g.moveTo(-5, 1); g.lineTo(4, 5); }
        else if (k === 1) { g.moveTo(-5, -7); g.lineTo(4, 0); g.lineTo(-5, 7); }
        else if (k === 2) { g.moveTo(4, -7); g.lineTo(4, 7); g.moveTo(-5, -2); g.lineTo(4, 2); }
        else { g.moveTo(-5, 0); g.lineTo(3, -6); g.moveTo(-5, 0); g.lineTo(3, 6); }
        g.stroke();
      }
      g.restore();
    });
  }
  g.restore();
}

function drawCorners(g, d, t, G, P, rnd) {
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    g.save(); g.translate(W / 2, H / 2); g.scale(sx, sy); g.translate(-W / 2, -H / 2);
    cornerOrn(g, d, t, G, P); g.restore();
  }
}
function cornerOrn(g, d, t, G, P) {
  const { O, b } = G, ax = O.x + b / 2, ay = O.y + b / 2, s = 26 + t * 13, h = b / 2 + 5;
  const base = t >= 3 ? (t === 4 ? '#ffcf4a' : P.accent) : P.mid;
  if (t === 0) { for (const [x, y] of [[ax, ay]]) { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fillStyle = metalGrad(g, x - 6, y - 6, x + 6, y + 6, P, 1); g.fill(); g.strokeStyle = P.dark; g.lineWidth = 1.5; g.stroke(); } return; }
  g.save();
  if (t === 4) { // 모서리 날개
    g.save(); g.shadowColor = P.glow; g.shadowBlur = 16;
    const wf = goldGrad(g, ax - 90, ay - 90, ax, ay, '#ffd34d');
    for (let i = -2; i <= 2; i++) feather(g, ax, ay, 92 - Math.abs(i) * 14, 16, Math.PI * 1.25 + i * .32, wf, rgba('#7a4300', .7));
    g.restore();
  }
  g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 8; g.shadowOffsetY = 3;
  g.fillStyle = goldGrad(g, ax - s, ay - s, ax + s * 1.6, ay + s * 1.6, base);
  g.beginPath();
  if (d.corner === 0) {
    const L = s * 1.7;
    g.moveTo(ax - h, ay - h); g.lineTo(ax + L, ay - h); g.lineTo(ax + L + h * .7, ay); g.lineTo(ax + L, ay + h); g.lineTo(ax + h, ay + h);
    g.lineTo(ax + h, ay + L); g.lineTo(ax, ay + L + h * .7); g.lineTo(ax - h, ay + L); g.closePath();
  } else if (d.corner === 1) {
    g.moveTo(ax - s * .95, ay - s * .95); g.lineTo(ax + s * .75, ay - s * .1); g.lineTo(ax + s * .3, ay + s * .3); g.lineTo(ax - s * .1, ay + s * .75); g.closePath();
  } else {
    g.arc(ax, ay, h + 4 + t * 2.5, 0, 7);
  }
  g.fill(); g.shadowColor = 'transparent';
  g.lineWidth = 2; g.strokeStyle = darken(base, .55); g.stroke();
  if (d.corner === 1) {
    const lf = goldGrad(g, ax, ay, ax + s * 2, ay + s * 2, base);
    feather(g, ax + s * .25, ay, s * 1.5, 11, 0, lf, darken(base, .5));
    feather(g, ax, ay + s * .25, s * 1.5, 11, Math.PI / 2, lf, darken(base, .5));
  }
  if (d.corner === 2 && t >= 2) {
    g.strokeStyle = darken(base, .4); g.lineWidth = 2;
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.beginPath(); g.moveTo(ax + Math.cos(a) * (h + 6), ay + Math.sin(a) * (h + 6)); g.lineTo(ax + Math.cos(a) * (h + 13 + t * 2), ay + Math.sin(a) * (h + 13 + t * 2)); g.stroke(); }
  }
  if (t >= 3) { // 필리그리 소용돌이
    g.save(); g.strokeStyle = t === 4 ? '#ffe28a' : P.accent; g.lineWidth = 2.5; g.shadowColor = P.accent; g.shadowBlur = 6;
    for (const [dx, dy, rot] of [[1, 0, 0], [0, 1, Math.PI / 2]]) {
      for (let k = 0; k < 2; k++) {
        const off = s * 2.1 + k * s * .9, cx = ax + dx * off, cy = ay + dy * off;
        g.save(); g.translate(cx, cy); g.rotate(rot); g.beginPath();
        for (let a = 0; a < Math.PI * 2.6; a += .15) { const r = b * .36 - a * 2.1; const x = Math.cos(a + k * Math.PI) * r * 1.6, y = Math.sin(a + k * Math.PI) * r * .7; a ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke(); g.restore();
      }
    }
    g.restore();
  }
  drawGem(g, ax, ay, 5 + t * 2.4, P.gem, t >= 3 ? 14 : 0);
  g.restore();
}
function sideGems(g, t, G, P) {
  const { O, b } = G;
  const pts = [[O.x + b / 2, H / 2], [O.x + O.w - b / 2, H / 2]];
  for (const [x, y] of pts) {
    g.save(); g.fillStyle = goldGrad(g, x - 20, y - 30, x + 20, y + 30, t === 4 ? '#ffcf4a' : P.accent);
    g.beginPath(); g.moveTo(x, y - 34 - t * 3); g.lineTo(x + b / 2 + 4, y); g.lineTo(x, y + 34 + t * 3); g.lineTo(x - b / 2 - 4, y); g.closePath();
    g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 6; g.fill(); g.shadowColor = 'transparent'; g.strokeStyle = darken(P.dark, .3); g.lineWidth = 1.5; g.stroke();
    drawGem(g, x, y, 7 + t, P.gem, 14); g.restore();
  }
}

function platePath(g, t, x, y, w, h) {
  if (t === 0) { g.roundRect(x - w / 2, y - h / 2, w, h, 10); return; }
  const p = h * .5;
  g.moveTo(x - w / 2, y - h / 2); g.lineTo(x + w / 2, y - h / 2); g.lineTo(x + w / 2 + p, y); g.lineTo(x + w / 2, y + h / 2);
  g.lineTo(x - w / 2, y + h / 2); g.lineTo(x - w / 2 - p, y); g.closePath();
}
function drawPlate(g, t, G, P) {
  const { x, y, w, h } = G.plate;
  g.save();
  if (t >= 3) {
    g.save(); g.shadowColor = P.glow; g.shadowBlur = 12;
    const wf = goldGrad(g, x - w, y - 60, x + w, y + 20, t === 4 ? '#ffd34d' : P.accent);
    for (const side of [-1, 1]) wings(g, x + side * (w / 2 + h * .5 - 4), y, side, t === 4 ? 4 : 3, t === 4 ? 70 : 48, 12, wf, rgba('#4a2a00', .6), .32);
    g.restore();
  }
  g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 12; g.shadowOffsetY = 4;
  g.beginPath(); platePath(g, t, x, y, w + 14, h + 14); g.fillStyle = metalGrad(g, x - w / 2, y - h, x + w / 2, y + h, P, t); g.fill();
  g.shadowColor = 'transparent'; g.lineWidth = 2; g.strokeStyle = darken(P.dark, .4); g.stroke();
  g.beginPath(); platePath(g, t, x, y, w, h);
  const ig = g.createLinearGradient(0, y - h / 2, 0, y + h / 2); ig.addColorStop(0, mix(P.dark, '#141a3a', .45)); ig.addColorStop(1, mix(P.dark, '#000000', .55));
  g.fillStyle = ig; g.fill(); g.lineWidth = 2; g.strokeStyle = t >= 3 ? P.accent : rgba(P.light, .55); g.stroke();
  if (t >= 2) for (const side of [-1, 1]) drawGem(g, x + side * (w / 2 + (t ? h * .5 : 0) - 4), y, 6 + t, P.gem, t >= 3 ? 12 : 0);
  g.restore();
}
function drawSocket(g, t, G, P) {
  const { x, y, r } = G.socket;
  g.save();
  if (t >= 2) {
    g.fillStyle = goldGrad(g, x - r, y - r, x + r, y + r, t >= 3 ? (t === 4 ? '#ffcf4a' : P.accent) : P.mid);
    const n = t === 4 ? 12 : 8;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + Math.PI / n; g.beginPath(); g.moveTo(x + Math.cos(a - .14) * (r + 8), y + Math.sin(a - .14) * (r + 8)); g.lineTo(x + Math.cos(a) * (r + 22 + t * 3), y + Math.sin(a) * (r + 22 + t * 3)); g.lineTo(x + Math.cos(a + .14) * (r + 8), y + Math.sin(a + .14) * (r + 8)); g.closePath(); g.fill(); g.strokeStyle = darken(P.dark, .3); g.lineWidth = 1; g.stroke(); }
  }
  g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
  g.beginPath(); g.arc(x, y, r + 12, 0, 7); g.fillStyle = metalGrad(g, x - r, y - r, x + r, y + r, P, t); g.fill();
  g.shadowColor = 'transparent'; g.lineWidth = 2.5; g.strokeStyle = darken(P.dark, .4); g.stroke();
  g.beginPath(); g.arc(x, y, r + 1, 0, 7);
  const ig = g.createRadialGradient(x, y - r * .3, 2, x, y, r); ig.addColorStop(0, '#2a3566'); ig.addColorStop(1, '#070a18'); g.fillStyle = ig; g.fill();
  g.beginPath(); g.arc(x, y, r + 5, 0, 7); g.lineWidth = 2; g.strokeStyle = t >= 3 ? P.accent : lighten(P.mid, .35); g.stroke();
  if (t >= 3) for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; drawGem(g, x + Math.cos(a) * (r + 6), y + Math.sin(a) * (r + 6), 5, P.gem, 8); }
  g.restore();
}
function badgePath(g, t, x, y, s) {
  if (t === 0) g.roundRect(x - s * 1.35, y - s * .88, s * 2.7, s * 1.76, s * .3);
  else if (t === 1) { g.moveTo(x - s, y - s * .8); g.quadraticCurveTo(x, y - s * 1.05, x + s, y - s * .8); g.lineTo(x + s, y); g.quadraticCurveTo(x + s * .9, y + s * .7, x, y + s); g.quadraticCurveTo(x - s * .9, y + s * .7, x - s, y); g.closePath(); }
  else if (t === 2) polyPath(g, x, y, s * 1.1, 6, 0);
  else if (t === 3) polyPath(g, x, y, s * 1.25, 4);
  else starPath(g, x, y, s * 1.12, s * 1.0, 12);
}
function drawEmblem(g, t, G, P, rnd) {
  const { x, y, s } = G.emblem, L = GRADES[t];
  g.save();
  if (t === 4) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2, len = s * (2 + (i % 2) * .7);
      const rg = g.createRadialGradient(x, y, s * .6, x, y, len); rg.addColorStop(0, rgba(i % 2 ? P.light : P.accent, .7)); rg.addColorStop(1, rgba(P.light, 0));
      g.fillStyle = rg; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a - .06) * len, y + Math.sin(a - .06) * len); g.lineTo(x + Math.cos(a + .06) * len, y + Math.sin(a + .06) * len); g.closePath(); g.fill();
    }
    g.restore();
    g.save(); g.shadowColor = P.glow; g.shadowBlur = 18; g.beginPath(); g.arc(x, y, s * 1.35, 0, 7); g.lineWidth = 4; g.strokeStyle = rgba(P.light, .9); g.stroke(); g.restore();
  }
  if (t >= 2) {
    g.save(); if (t >= 3) { g.shadowColor = P.glow; g.shadowBlur = 12; }
    const wf = t >= 3 ? goldGrad(g, x - s * 3, y - s, x + s * 3, y + s, t === 4 ? '#ffd34d' : P.accent) : metalGrad(g, x - s * 3, y - s, x + s * 3, y + s, P, t);
    const n = [0, 0, 3, 4, 5][t], len = [0, 0, 62, 86, 110][t];
    for (const side of [-1, 1]) wings(g, x + side * s * .7, y + 4, side, n, len, 15, wf, rgba(darken(P.dark, .3), .8), .28);
    g.restore();
  }
  g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 12; g.shadowOffsetY = 4;
  g.beginPath(); badgePath(g, t, x, y, s); g.fillStyle = t >= 3 ? goldGrad(g, x - s, y - s, x + s, y + s, t === 4 ? '#ffcf4a' : P.accent) : metalGrad(g, x - s, y - s, x + s, y + s, P, t); g.fill();
  g.shadowColor = 'transparent'; g.lineWidth = 3; g.strokeStyle = darken(P.dark, .5); g.stroke();
  g.beginPath(); badgePath(g, t, x, y, s * .8);
  const ig = g.createRadialGradient(x, y - s * .3, 2, x, y, s); ig.addColorStop(0, lighten(P.mid, .1)); ig.addColorStop(1, darken(P.dark, .35));
  g.fillStyle = ig; g.fill(); g.lineWidth = 2; g.strokeStyle = rgba(t >= 3 ? lighten(P.accent, .4) : P.light, .8); g.stroke();
  if (t === 3) { g.save(); g.shadowColor = P.accent; g.shadowBlur = 10; g.beginPath(); starPath(g, x, y - s * 1.25 - 12, 15, 6, 5); g.fillStyle = goldGrad(g, x - 15, y - s * 1.5, x + 15, y - s, P.accent); g.fill(); g.restore(); }
  if (t === 4) {
    const cy = y - s * 1.05, cw = s * .95;
    g.save(); g.shadowColor = P.glow; g.shadowBlur = 14; g.beginPath();
    g.moveTo(x - cw, cy); g.lineTo(x - cw * 1.1, cy - 30); g.lineTo(x - cw * .5, cy - 14); g.lineTo(x, cy - 40); g.lineTo(x + cw * .5, cy - 14); g.lineTo(x + cw * 1.1, cy - 30); g.lineTo(x + cw, cy); g.closePath();
    g.fillStyle = goldGrad(g, x - cw, cy - 40, x + cw, cy, '#ffd34d'); g.fill(); g.shadowColor = 'transparent'; g.strokeStyle = '#7a4300'; g.lineWidth = 2; g.stroke();
    drawGem(g, x, cy - 14, 6, P.gem, 8); drawGem(g, x - cw * 1.1, cy - 30, 4, '#5be3ff', 6); drawGem(g, x + cw * 1.1, cy - 30, 4, '#5be3ff', 6); drawGem(g, x, cy - 40, 4.5, '#ffffff', 8);
    g.restore();
  }
  const fs = [36, 50, 54, 58, 54][t];
  g.font = `900 ${fs}px Cinzel, "Black Han Sans", serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const ty = y + fs * .05;
  g.lineJoin = 'round'; g.lineWidth = 8; g.strokeStyle = darken(P.dark, .6); g.strokeText(L, x, ty);
  let fg;
  if (t === 4) { fg = g.createLinearGradient(x - s, 0, x + s, 0); [0, 50, 120, 200, 280, 330].forEach((hh, i) => fg.addColorStop(i / 5, hsl2hex(hh, 100, 70))); }
  else { fg = g.createLinearGradient(0, ty - fs / 2, 0, ty + fs / 2); fg.addColorStop(0, '#ffffff'); fg.addColorStop(.5, lighten(P.light, .3)); fg.addColorStop(1, t >= 3 ? P.accent : P.light); }
  if (t >= 3) { g.shadowColor = t === 4 ? '#ffffff' : P.glow; g.shadowBlur = 14; }
  g.fillStyle = fg; g.fillText(L, x, ty);
  g.shadowColor = 'transparent'; g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,255,255,.7)'; g.strokeText(L, x, ty);
  g.restore();
}
function frameFrontFx(g, t, G, P, rnd) {
  const n = [0, 4, 10, 22, 46][t], pts = bandPoints(G, 8, 0);
  for (let i = 0; i < n; i++) {
    const p = pts[Math.floor(rnd() * pts.length)], off = (rnd() - .3) * G.b * 1.6;
    const col = t === 4 ? hsl2hex(Math.floor(rnd() * 360), 100, 70) : P.light;
    sparkle(g, p.x + p.nx * off, p.y + p.ny * off, (3 + rnd() * 9) * (1 + t * .25), col, .6 + rnd() * .4);
  }
  if (t >= 3) {
    const { O } = G;
    sparkle(g, O.x + O.w - 6, O.y + 8, t === 4 ? 46 : 30, P.light, 1);
    sparkle(g, O.x + 8, O.y + O.h - 8, t === 4 ? 40 : 24, P.accent, .9);
  }
  if (t === 4) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const p of bandPoints(G, 40, 60)) if (rnd() < .5) flameTongue(g, p.x + p.nx * G.b * .2, p.y + p.ny * G.b * .2, p.nx, p.ny, 14 + rnd() * 26, 7, '#fff6cc', '#ff9a3d', (rnd() - .5) * 10);
    g.restore();
  }
}

/* =================================================================
   2) 역할 아이콘
   ================================================================= */
const ICON_STYLES = { medal: '메달', gem: '보석', rune: '룬석' };
function randomIconDesign(seed) {
  const r = mulberry32(seed), st = Object.keys(ICON_STYLES);
  const variant = {}; ROLES.forEach(R => variant[R.id] = r() < .5 ? 0 : 1);
  return { seed, style: st[Math.floor(r() * st.length)], rim: r() < .6 ? 'gold' : 'silver', variant };
}
function rimGrad(g, rim, r) {
  const gr = g.createLinearGradient(-r, -r, r, r);
  const st = rim === 'silver' ? ['#ffffff', '#c7cfda', '#6f7986', '#e8edf3', '#8a94a1'] : ['#fff3c4', '#f2c14e', '#8a5a0a', '#ffe08a', '#a86f10'];
  st.forEach((c, i) => gr.addColorStop(i / (st.length - 1), c)); return gr;
}
function renderRoleIcon(set, roleId, size = 256) {
  const c = mk(size, size), g = c.getContext('2d'); g.scale(size / 256, size / 256); g.translate(128, 128);
  const R = ROLES.find(r => r.id === roleId), col = R.color, v = (set.variant || {})[roleId] || 0;
  g.save(); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 10; g.shadowOffsetY = 4;
  if (set.style === 'gem') {
    g.beginPath(); polyPath(g, 0, 0, 118, 6, -Math.PI / 2); g.fillStyle = rimGrad(g, set.rim, 118); g.fill(); g.shadowColor = 'transparent';
    const vs = []; for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i / 6 * Math.PI * 2; vs.push([Math.cos(a) * 100, Math.sin(a) * 100]); }
    const shade = [.3, .12, -.25, -.4, -.15, .18];
    for (let i = 0; i < 6; i++) { const [x1, y1] = vs[i], [x2, y2] = vs[(i + 1) % 6]; g.beginPath(); g.moveTo(0, 0); g.lineTo(x1, y1); g.lineTo(x2, y2); g.closePath(); g.fillStyle = shade[i] > 0 ? lighten(col, shade[i]) : darken(col, -shade[i]); g.fill(); }
    g.beginPath(); polyPath(g, 0, 0, 70, 6, -Math.PI / 2); const ig = g.createRadialGradient(-20, -24, 4, 0, 0, 80); ig.addColorStop(0, lighten(col, .3)); ig.addColorStop(1, darken(col, .25)); g.fillStyle = ig; g.fill();
    g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.35)'; g.stroke();
  } else if (set.style === 'rune') {
    g.beginPath(); g.moveTo(0, -118); g.lineTo(106, -8); g.lineTo(0, 118); g.lineTo(-106, -8); g.closePath(); g.lineJoin = 'round';
    const ig = g.createRadialGradient(0, -20, 10, 0, 0, 130); ig.addColorStop(0, '#343c5e'); ig.addColorStop(1, '#0b0e1b'); g.fillStyle = ig; g.fill();
    g.shadowColor = 'transparent'; g.lineWidth = 10; g.strokeStyle = rimGrad(g, set.rim, 118); g.stroke();
    g.beginPath(); g.moveTo(0, -94); g.lineTo(84, -8); g.lineTo(0, 94); g.lineTo(-84, -8); g.closePath(); g.lineWidth = 2; g.strokeStyle = rgba(col, .6); g.stroke();
  } else {
    g.beginPath(); g.arc(0, 0, 118, 0, 7); g.fillStyle = rimGrad(g, set.rim, 118); g.fill(); g.shadowColor = 'transparent';
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; g.beginPath(); g.arc(Math.cos(a) * 109, Math.sin(a) * 109, 3, 0, 7); g.fillStyle = 'rgba(0,0,0,.25)'; g.fill(); }
    g.beginPath(); g.arc(0, 0, 99, 0, 7); const ig = g.createRadialGradient(-30, -35, 6, 0, 0, 110); ig.addColorStop(0, lighten(col, .38)); ig.addColorStop(.6, col); ig.addColorStop(1, darken(col, .45)); g.fillStyle = ig; g.fill();
    g.lineWidth = 3; g.strokeStyle = darken(col, .5); g.stroke(); g.beginPath(); g.arc(0, 0, 89, 0, 7); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.3)'; g.stroke();
  }
  g.restore();
  g.save();
  const glow = set.style === 'rune', fg = glow ? lighten(col, .5) : '#ffffff';
  g.shadowColor = glow ? col : 'rgba(0,0,0,.5)'; g.shadowBlur = glow ? 22 : 6; g.shadowOffsetY = glow ? 0 : 3;
  g.scale(1.25, 1.25); drawGlyph(g, roleId, v, fg, glow ? '#141a30' : darken(col, .35));
  g.restore();
  if (set.style !== 'rune') { g.save(); g.beginPath(); g.ellipse(-8, -52, 70, 32, -.2, 0, 7); const gl = g.createLinearGradient(0, -84, 0, -20); gl.addColorStop(0, 'rgba(255,255,255,.35)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fill(); g.restore(); }
  return c;
}
function sword(g, s, rot, outline) {
  g.save(); g.rotate(rot); g.scale(s, s);
  const p = () => { g.beginPath(); g.moveTo(0, -52); g.lineTo(8, -41); g.lineTo(8, 16); g.lineTo(-8, 16); g.lineTo(-8, -41); g.closePath(); g.roundRect(-23, 15, 46, 9, 4); g.roundRect(-4.5, 23, 9, 17, 3); g.moveTo(6.5, 44); g.arc(0, 44, 6.5, 0, 7); };
  if (outline) { p(); g.save(); g.shadowColor = 'transparent'; g.lineWidth = 5; g.strokeStyle = outline; g.stroke(); g.restore(); }
  p(); g.fill(); g.restore();
}
function drawGlyph(g, id, v, fg, bg) {
  g.fillStyle = fg; g.strokeStyle = fg; g.lineCap = 'round'; g.lineJoin = 'round';
  if (id === 'atk') { if (v === 0) sword(g, 1.05, Math.PI / 4); else { sword(g, .92, -Math.PI / 4); sword(g, .92, Math.PI / 4, bg); } }
  else if (id === 'def') {
    if (v === 0) {
      g.beginPath(); g.moveTo(0, -46); g.quadraticCurveTo(22, -36, 40, -38); g.lineTo(38, 2); g.quadraticCurveTo(32, 32, 0, 48); g.quadraticCurveTo(-32, 32, -38, 2); g.lineTo(-40, -38); g.quadraticCurveTo(-22, -36, 0, -46); g.fill();
      g.shadowColor = 'transparent'; g.fillStyle = bg; g.fillRect(-5, -32, 10, 62); g.fillRect(-25, -12, 50, 10);
    } else {
      g.beginPath(); g.arc(0, 0, 43, 0, 7); g.fill(); g.shadowColor = 'transparent';
      g.beginPath(); g.arc(0, 0, 32, 0, 7); g.lineWidth = 4; g.strokeStyle = bg; g.stroke();
      g.beginPath(); g.arc(0, 0, 11, 0, 7); g.fillStyle = bg; g.fill();
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; g.beginPath(); g.arc(Math.cos(a) * 22, Math.sin(a) * 22, 3.5, 0, 7); g.fill(); }
    }
  } else if (id === 'dis') {
    if (v === 0) { g.lineWidth = 9; g.beginPath(); for (let a = 0; a < Math.PI * 4.3; a += .08) { const r = 3 + a * 3.1, x = Math.cos(a) * r, y = Math.sin(a) * r; a ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    else {
      g.beginPath(); g.moveTo(-50, 0); g.quadraticCurveTo(0, -46, 50, 0); g.quadraticCurveTo(0, 46, -50, 0); g.fill(); g.shadowColor = 'transparent';
      g.beginPath(); g.arc(0, 0, 18, 0, 7); g.fillStyle = bg; g.fill();
      g.lineWidth = 3; g.strokeStyle = fg; g.beginPath(); for (let a = 0; a < Math.PI * 3.6; a += .1) { const r = 1 + a * 1.2; const x = Math.cos(a) * r, y = Math.sin(a) * r; a ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    }
  } else if (id === 'sup') {
    if (v === 0) {
      g.beginPath(); g.roundRect(-13, -42, 26, 84, 7); g.roundRect(-42, -13, 84, 26, 7); g.fill();
      g.shadowColor = 'transparent'; g.beginPath(); starPath(g, 34, -34, 13, 4, 4); g.fill(); g.beginPath(); starPath(g, -34, 36, 9, 3, 4); g.fill();
    } else {
      g.beginPath(); g.moveTo(0, 46); g.bezierCurveTo(-62, 4, -42, -52, 0, -22); g.bezierCurveTo(42, -52, 62, 4, 0, 46); g.fill();
      g.shadowColor = 'transparent'; g.fillStyle = bg; g.fillRect(-5.5, -14, 11, 36); g.fillRect(-18, -1.5, 36, 11);
    }
  } else if (id === 'king') {
    g.beginPath();
    if (v === 0) { g.moveTo(-42, 22); g.lineTo(-47, -22); g.lineTo(-20, 0); g.lineTo(0, -34); g.lineTo(20, 0); g.lineTo(47, -22); g.lineTo(42, 22); }
    else { g.moveTo(-44, 22); g.lineTo(-48, -16); g.lineTo(-33, 0); g.lineTo(-22, -28); g.lineTo(-11, 0); g.lineTo(0, -38); g.lineTo(11, 0); g.lineTo(22, -28); g.lineTo(33, 0); g.lineTo(48, -16); g.lineTo(44, 22); }
    g.closePath(); g.fill(); g.beginPath(); g.roundRect(-46, 25, 92, 15, 4); g.fill();
    const tips = v === 0 ? [[-47, -27, 6], [0, -40, 7], [47, -27, 6]] : [[-48, -21, 5], [-22, -33, 5], [0, -44, 6], [22, -33, 5], [48, -21, 5]];
    for (const [x, y, r] of tips) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    g.shadowColor = 'transparent'; g.fillStyle = bg; g.beginPath(); g.arc(0, 32.5, 4.5, 0, 7); g.arc(-24, 32.5, 3.5, 0, 7); g.fill(); g.beginPath(); g.arc(24, 32.5, 3.5, 0, 7); g.fill();
  }
}

/* =================================================================
   3) 절차적 카드 일러스트 엔진 (API 키 없이 동작)
   ================================================================= */
const THEMES = [
  { id: 'ice', ko: '얼음', kw: ['얼음', '빙', '서리', '겨울', '냉기', '크리스탈', '수정', '눈송', '설원', 'ice', 'frost', 'snow'], sky: ['#06142c', '#1d5a88', '#a9e8ff'], floor: ['#cdeeff', '#4b88b3'], grid: 'rgba(255,255,255,.4)', accent: '#c9f6ff', part: 'snow', env: 'crystals', ai: 'BACKGROUND RULE: NO mountains, NO houses, NO buildings, NO village, NO landscape scenery. Instead a noble ICE CRYSTAL CAVE as a stylized 2.5D background: walls made of patterned faceted ice crystals, crystal clusters and prism shards arranged in an elegant repeating geometric pattern, layered depth like a 2.5D game backdrop, cool blue, cyan and white with a soft inner glow, regal and pristine. Effects sparkle with frost crystals and fine ice dust.' },
  { id: 'fire', ko: '불꽃', kw: ['불', '화염', '용암', '타오', '태양', '마그마', '지옥', 'fire', 'flame', 'lava'], sky: ['#160402', '#6e1206', '#ff7a1a'], floor: ['#5a200b', '#170502'], grid: 'rgba(255,140,40,.3)', accent: '#ffb347', part: 'ember', env: 'flames', ai: 'BACKGROUND RULE: NO mountains, NO volcano landscape, NO scenery. The stone is INSIDE a raging inferno, completely engulfed — roaring walls of fire fill the entire background, flames everywhere around it, as if standing in the heart of a blaze. EFFECTS: every skill effect is wrapped in intense violent fire VFX — huge flame tongues, fire swirls, blazing embers, sparks and heat distortion, extremely fiery and powerful.' },
  { id: 'nature', ko: '자연', kw: ['자연', '숲', '치유', '나무', '꽃', '풀', '생명', '정령', '대지', 'nature', 'forest', 'heal'], sky: ['#06200f', '#1f6b3a', '#c6f7a8'], floor: ['#6b9a43', '#20401a'], grid: 'rgba(20,50,10,.35)', accent: '#c4ff9e', part: 'leaf', env: 'leaves', ai: 'BACKGROUND RULE: NO mountains, NO rocky cliffs, NO forest, NO giant tree, NO big trees, NO tree trunks. Instead a vast open lush GREEN MEADOW / grassland plain spreading to a low gentle horizon, and decorative patterns of fresh green leaves filling the scene, soft warm healing sunlight, floating glowing leaves and light motes, peaceful and restorative. Effects are woven with swirling green leaves and gentle healing light.' },
  { id: 'divine', ko: '신화', kw: ['올림푸스', '신화', '천상', '신성', '영웅', '천사', '성스', '제우스', '빛의', 'olymp', 'divine', 'holy', 'hero'], sky: ['#1e1406', '#7a5518', '#e9c66f'], floor: ['#cdbd98', '#6b5a3e'], grid: 'rgba(90,60,20,.4)', accent: '#ffd98a', part: 'mote', env: 'columns', bright: true },
  { id: 'dark', ko: '어둠', kw: ['어둠', '암흑', '그림자', '악마', '저주', '공허', '죽음', '해골', 'dark', 'shadow', 'demon'], sky: ['#040108', '#2a0f45', '#6b2fa0'], floor: ['#1d1228', '#060309'], grid: 'rgba(190,120,255,.22)', accent: '#c58bff', part: 'smoke', env: 'smoke', ai: 'BACKGROUND RULE: deep darkness from which grotesque, twisted, organic shapes reach out — writhing thorny tendrils, warped vein-like branching patterns and eerie biomechanical forms emerging from the shadows, NO landscape, NO buildings. LIGHTING: uncanny, sinister lighting — sickly violet and toxic green under-lighting, harsh rim lights cutting through black fog, glowing cracks. EFFECTS: premium high-end dark VFX — streams of dark energy and black shadowy wisps spreading out in every direction from the stone, volumetric shadow smoke, distortion and glowing particles, unsettling and elegant.' },
  { id: 'storm', ko: '번개', kw: ['번개', '전기', '폭풍', '뇌', '천둥', 'thunder', 'lightning', 'storm'], sky: ['#040918', '#1b2f6b', '#6fa8ff'], floor: ['#1d2848', '#0a0f1f'], grid: 'rgba(140,190,255,.3)', accent: '#cfe6ff', part: 'spark', env: 'bolts' },
  { id: 'deep', ko: '심해', kw: ['심해', '깊은 바다', '해저', 'abyss', 'deep sea'], sky: ['#000510', '#021a33', '#06486b'], floor: ['#04263a', '#00060c'], grid: 'rgba(90,200,255,.16)', accent: '#5fe8ff', part: 'bubble', env: 'abyss', ai: 'BACKGROUND RULE: the DEEP SEA abyss — dark, deep navy and blue darkness, mysterious and silent, faint shafts of light falling from far above, bioluminescent glows and drifting particles in the depths, NO beach, NO sky, NO surface waves. EFFECTS: every skill effect is shaped with streams of rising air bubbles, swirling underwater currents and flowing ribbons of water around the stone.' },
  { id: 'sea', ko: '바다', kw: ['바다', '물', '파도', '해양', '인어', 'sea', 'ocean', 'water'], sky: ['#021a24', '#0b5a6e', '#59e0d6'], floor: ['#0f5566', '#04202a'], grid: 'rgba(160,255,240,.25)', accent: '#9ffcf0', part: 'bubble', env: 'waves' },
  { id: 'cosmic', ko: '우주', kw: ['우주', '별', '은하', '성운', '행성', '달', 'cosmic', 'galaxy', 'space', 'star'], sky: ['#03020c', '#1d0f4a', '#7b3fd0'], floor: ['#1a1040', '#05030f'], grid: 'rgba(200,160,255,.3)', accent: '#ffd6ff', part: 'star', env: 'nebula', ai: 'BACKGROUND RULE (very important): deep space WITHOUT any galaxies — NO galaxies, NO spiral shapes, NO planets, NO black hole, NO landscape. Instead the space is filled with thick, TANGLED COSMIC DUST: swirling, intertwined clouds and ribbons of colourful nebula gas and dark dust lanes twisting through each other in a rich chaotic pattern, with a field of ASTEROIDS — rugged rocky asteroids of many sizes floating and tumbling around the stone, some near and big, some far and small, lit by rim light. EFFECTS: INTENSE LIGHT everywhere — blinding light bursts, brilliant starburst flares, lens flares and beams of light piercing through the dust, glowing hot edges on the asteroids.' },
  { id: 'arcane', ko: '알까기판', kw: [], sky: ['#0a0c1e', '#23306b', '#6b86e0'], floor: ['#d7a45a', '#7a4f22'], grid: 'rgba(80,40,0,.45)', accent: '#ffd88a', part: 'mote', env: 'arcane' },
];
function pickThemes(concept) {
  const s = (concept || '').toLowerCase();
  const hits = THEMES.filter(th => th.kw.some(k => s.includes(k)))
    .sort((a, b) => Math.min(...a.kw.map(k => s.indexOf(k)).filter(i => i >= 0)) - Math.min(...b.kw.map(k => s.indexOf(k)).filter(i => i >= 0)));
  return hits.length ? hits : [THEMES[THEMES.length - 1]];
}
const isNoble = s => /고귀|귀족|황금|왕|황제|여왕|royal|noble|gold/i.test(s || '');

function stoneSprite(rx, ry, th, color, tint, tintA) {
  const pad = 8, c = mk(Math.ceil(rx * 2 + pad * 2), Math.ceil(ry * 2 + th + pad * 2)), g = c.getContext('2d');
  const x = c.width / 2, y = ry + pad, dark = color === 'black';
  g.beginPath(); g.moveTo(x - rx, y); g.lineTo(x - rx, y + th); g.ellipse(x, y + th, rx, ry, 0, Math.PI, 0, true); g.lineTo(x + rx, y); g.ellipse(x, y, rx, ry, 0, 0, Math.PI, false); g.closePath();
  const sg = g.createLinearGradient(x - rx, 0, x + rx, 0);
  (dark ? ['#040506', '#2d3138', '#040506'] : ['#858b94', '#f4f6f8', '#8d939c']).forEach((cc, i) => sg.addColorStop(i / 2, cc));
  g.fillStyle = sg; g.fill();
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  const tg = g.createRadialGradient(x - rx * .3, y - ry * .45, rx * .05, x, y, rx * 1.05);
  if (dark) { tg.addColorStop(0, '#5f6670'); tg.addColorStop(.35, '#1f2228'); tg.addColorStop(1, '#050607'); }
  else { tg.addColorStop(0, '#ffffff'); tg.addColorStop(.55, '#eceff2'); tg.addColorStop(1, '#b6bcc5'); }
  g.fillStyle = tg; g.fill();
  g.beginPath(); g.ellipse(x - rx * .32, y - ry * .42, rx * .34, ry * .2, -.15, 0, Math.PI * 2);
  const hg = g.createRadialGradient(x - rx * .32, y - ry * .42, 0, x - rx * .32, y - ry * .42, rx * .34);
  hg.addColorStop(0, `rgba(255,255,255,${dark ? .45 : .9})`); hg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = hg; g.fill();
  if (tint) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = rgba(tint, tintA ?? .5); g.fillRect(0, 0, c.width, c.height); }
  return c;
}
function rimLight(g, x, y, rx, ry, th, col, a, blur) {
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.shadowColor = col; g.shadowBlur = blur; g.strokeStyle = col;
  g.lineWidth = 3; g.beginPath(); g.ellipse(x, y, rx, ry, 0, Math.PI * 1.04, Math.PI * 1.96); g.stroke();
  g.lineWidth = 2.5; g.beginPath(); g.ellipse(x, y + th, rx, ry, 0, Math.PI * .08, Math.PI * .92); g.stroke();
  g.restore();
}
function drawStone(g, x, y, rx, ry, th, color, o = {}) {
  const sp = stoneSprite(rx, ry, th, color, o.tint, o.tintA);
  g.save(); g.globalAlpha = o.alpha ?? 1; g.drawImage(sp, x - sp.width / 2, y - ry - 8); g.restore();
  if (o.rim) rimLight(g, x, y, rx, ry, th, o.rim, o.rimA ?? .8, o.glow ?? 10);
}
function stoneShadow(g, x, y, rx, a = .55) { g.save(); g.translate(x, y); g.scale(1, .28); radial(g, 0, 0, rx * 1.25, '#000000', a); g.restore(); }
function shardPiece(g, x, y, s, rot, col) { g.save(); g.translate(x, y); g.rotate(rot); g.beginPath(); g.moveTo(0, -s); g.lineTo(s * .8, s * .5); g.lineTo(-s * .6, s * .7); g.closePath(); g.fillStyle = col; g.fill(); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1; g.stroke(); g.restore(); }
function leafShape(g, x, y, s, ang, col) { g.save(); g.translate(x, y); g.rotate(ang); g.beginPath(); g.moveTo(-s, 0); g.quadraticCurveTo(0, -s * .7, s, 0); g.quadraticCurveTo(0, s * .7, -s, 0); g.fillStyle = col; g.fill(); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-s, 0); g.lineTo(s, 0); g.stroke(); g.restore(); }

/* ---- 배경 ---- */
function drawSky(c) {
  const { g, th, th2, t } = c;
  const gr = g.createLinearGradient(0, 0, 0, HZ + 40); gr.addColorStop(0, th.sky[0]); gr.addColorStop(.55, th.sky[1]); gr.addColorStop(1, th.sky[2]);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  if (th2) radial(g, c.rnd() < .5 ? 150 : 650, 320, 460, th2.sky[2], .4);
  radial(g, 400, 560, 470, th.accent, [.12, .2, .28, .36, .46][t]);
}
function drawFloor(c) {
  const { g, th } = c;
  const gr = g.createLinearGradient(0, HZ, 0, H); gr.addColorStop(0, th.floor[0]); gr.addColorStop(1, th.floor[1]);
  g.fillStyle = gr; g.fillRect(0, HZ, W, H - HZ);
  g.save(); g.beginPath(); g.rect(0, HZ, W, H - HZ); g.clip(); g.strokeStyle = th.grid; g.lineWidth = 2;
  const vx = 400, vy = HZ - 420;
  for (let i = -12; i <= 12; i++) { const bx = 400 + i * 95; g.beginPath(); g.moveTo(vx + (bx - vx) * ((HZ - vy) / (H - vy)), HZ); g.lineTo(bx, H); g.stroke(); }
  for (let k = 1; k <= 10; k++) { const y = HZ + (H - HZ) * Math.pow(k / 10, 1.7); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.restore();
  const fg = g.createLinearGradient(0, HZ - 70, 0, HZ + 150);
  fg.addColorStop(0, rgba(th.sky[2], 0)); fg.addColorStop(.33, rgba(th.sky[2], .6)); fg.addColorStop(1, rgba(th.sky[2], 0));
  g.fillStyle = fg; g.fillRect(0, HZ - 70, W, 220);
  radial(g, 400, 770, 330, th.accent, .25 + c.t * .05, 'lighter');
}
function shard(g, x, y, w, h, lean, col, a) {
  const tx = x + lean * h; g.save(); g.globalAlpha = a;
  const gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0); gr.addColorStop(0, lighten(col, .6)); gr.addColorStop(.5, col); gr.addColorStop(1, darken(col, .4));
  g.fillStyle = gr; g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(tx - w * .16, y - h * .84); g.lineTo(tx, y - h); g.lineTo(tx + w * .16, y - h * .84); g.lineTo(x + w / 2, y); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.5; g.stroke();
  g.beginPath(); g.moveTo(x, y); g.lineTo(tx, y - h); g.strokeStyle = 'rgba(255,255,255,.4)'; g.stroke(); g.restore();
}
function flame(g, x, y, w, h, sway, a, soft) {
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a;
  const gr = g.createLinearGradient(0, y, 0, y - h); if (soft) { gr.addColorStop(0, 'rgba(255,150,40,0)'); gr.addColorStop(.18, 'rgba(255,236,150,.9)'); } else gr.addColorStop(0, 'rgba(255,236,150,.95)'); gr.addColorStop(.35, 'rgba(255,120,30,.8)'); gr.addColorStop(1, 'rgba(200,20,0,0)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(x - w / 2, y);
  g.bezierCurveTo(x - w * .55, y - h * .45, x + sway - w * .2, y - h * .7, x + sway, y - h);
  g.bezierCurveTo(x + sway + w * .15, y - h * .65, x + w * .6, y - h * .4, x + w / 2, y); g.closePath(); g.fill(); g.restore();
}
function column(g, x, top, bot, w, a) {
  g.save(); g.globalAlpha = a;
  const gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0); gr.addColorStop(0, '#b9ab90'); gr.addColorStop(.4, '#fffaf0'); gr.addColorStop(1, '#a89878');
  g.fillStyle = gr; g.fillRect(x - w / 2, top + 26, w, bot - top - 40);
  g.fillRect(x - w * .75, top, w * 1.5, 26); g.fillRect(x - w * .7, bot - 16, w * 1.4, 16);
  g.strokeStyle = 'rgba(120,100,70,.4)'; g.lineWidth = 2;
  for (let i = 1; i < 5; i++) { const xx = x - w / 2 + i * w / 5; g.beginPath(); g.moveTo(xx, top + 30); g.lineTo(xx, bot - 18); g.stroke(); }
  g.restore();
}
// 어둠에서 뻗는 뒤틀린 촉수 (가시 + 갈라짐 + 보랏빛 테두리)
function tendril(g, rnd, x, y, a, w, depth, col) {
  const pts = [[x, y]], n = 9; let L = 24 + w * 2;
  for (let i = 0; i < n; i++) { a += (rnd() - .5) * .9 + Math.sin(i * 1.3) * .15; x += Math.cos(a) * L; y += Math.sin(a) * L; pts.push([x, y]); L *= .93; }
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = '#050008'; g.shadowColor = col; g.shadowBlur = 16;
  for (let pass = 0; pass < 2; pass++) for (let i = 1; i < pts.length; i++) { if (pass) g.shadowBlur = 0; g.lineWidth = w * (1 - i / pts.length) + 1; g.beginPath(); g.moveTo(...pts[i - 1]); g.lineTo(...pts[i]); g.stroke(); }
  for (let i = 1; i < pts.length; i++) {
    const ww = w * (1 - i / pts.length) + 1;
    if (i % 2 && ww > 5) { const [px, py] = pts[i], ta = Math.atan2(py - pts[i - 1][1], px - pts[i - 1][0]) + (rnd() < .5 ? 1.4 : -1.4); g.lineWidth = 2; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(ta) * ww * 1.6, py + Math.sin(ta) * ww * 1.6); g.stroke(); }
  }
  g.globalCompositeOperation = 'lighter'; g.shadowBlur = 8; g.strokeStyle = rgba(col, .35); g.lineWidth = 1.5; g.beginPath(); g.moveTo(...pts[0]); for (const p of pts) g.lineTo(p[0] - 2, p[1] - 2); g.stroke();
  g.restore();
  if (depth > 1) for (let k = 0; k < 2; k++) { const p = pts[2 + Math.floor(rnd() * 5)]; tendril(g, rnd, p[0], p[1], a + (rnd() - .5) * 2.2, w * .5, depth - 2, col); }
}
// 소행성: 울퉁불퉁한 바위 + 분화구 + 빛 받는 테두리
function asteroid(g, rnd, x, y, r, col) {
  const n = 11, pts = Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2, rr = r * (.72 + rnd() * .4); return [x + Math.cos(a) * rr, y + Math.sin(a) * rr * .85]; });
  g.save(); g.beginPath(); pts.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.closePath();
  const gr = g.createRadialGradient(x - r * .4, y - r * .45, r * .1, x, y, r * 1.2); gr.addColorStop(0, '#8a7f8c'); gr.addColorStop(.5, '#3d3540'); gr.addColorStop(1, '#120e16');
  g.fillStyle = gr; g.fill(); g.clip();
  for (let k = 0; k < 3 + Math.floor(r / 12); k++) { const cx = x + (rnd() - .5) * r * 1.2, cy = y + (rnd() - .5) * r, cr = r * (.08 + rnd() * .16); g.fillStyle = 'rgba(10,6,14,.45)'; g.beginPath(); g.arc(cx, cy, cr, 0, 7); g.fill(); g.strokeStyle = 'rgba(200,190,210,.25)'; g.lineWidth = 1; g.beginPath(); g.arc(cx - cr * .15, cy - cr * .15, cr, Math.PI, Math.PI * 1.6); g.stroke(); }
  g.restore();
  g.save(); g.globalCompositeOperation = 'lighter'; g.shadowColor = col; g.shadowBlur = r * .4; g.strokeStyle = rgba(lighten(col, .4), .7); g.lineWidth = Math.max(1, r * .06);
  g.beginPath(); for (let i = 0; i <= 5; i++) { const [px, py] = pts[i]; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); g.restore();
}
// 스킬 각인: 알 윗면에 스킬을 상징하는 문양 (홈 + 빛나는 선)
const ENGRAVE = {
  // 관통: 금 간 고리를 꿰뚫는 창끝 화살
  pierce: () => [arc(0, 0, .55, .25, 1.35), arc(0, 0, .55, 1.8, 2.9), arc(0, 0, .55, 3.4, 4.45), arc(0, 0, .55, 4.95, 6.05), [[0, .95], [0, -.75]], [[-.3, -.45], [0, -.95], [.3, -.45], [0, -.6], [-.3, -.45]], [[-.18, .95], [0, .75], [.18, .95]], [[.5, -.2], [.62, -.05]], [[-.5, .2], [-.64, .08]]],
  // 가속: 앞으로 향한 겹 화살표 + 속도선
  accel: () => [...[0, 1, 2].map(k => [[-.35 + k * .32, -.5], [-.05 + k * .32, 0], [-.35 + k * .32, .5]]), [[-.95, -.25], [-.5, -.25]], [[-1, 0], [-.45, 0]], [[-.95, .25], [-.5, .25]]],
  // 폭발: 들쭉날쭉한 폭발 별 + 파편
  explode: () => [Array.from({ length: 17 }, (_, i) => { const a = i / 16 * Math.PI * 2, r = i % 2 ? .38 : .9 - (i % 4) * .08; return [Math.cos(a) * r, Math.sin(a) * r]; }), circ(0, 0, .18), ...[.4, 2.2, 4.1].map(a => [[Math.cos(a) * 1.02, Math.sin(a) * 1.02], [Math.cos(a + .08) * 1.12, Math.sin(a + .08) * 1.12], [Math.cos(a - .06) * 1.14, Math.sin(a - .06) * 1.14], [Math.cos(a) * 1.02, Math.sin(a) * 1.02]])],
  // 쉴드: 방패 모양 + 육각 결계
  shield: () => [[[-.6, -.75], [0, -.9], [.6, -.75], [.6, -.05], [0, .9], [-.6, -.05], [-.6, -.75]], poly(0, -.05, .32, 6), [[0, -.37], [0, -.62]], [[0, .27], [0, .55]]],
  // 가시: 바깥으로 돋은 가시 고리
  thorns: () => [circ(0, 0, .35), Array.from({ length: 25 }, (_, i) => { const a = i / 24 * Math.PI * 2, r = i % 2 ? .95 : .52; return [Math.cos(a) * r, Math.sin(a) * r]; })],
  // 부활: 원형 화살표 안의 날개 편 불사조
  revive: () => { const p = arc(0, 0, .85, 2.1, 2.1 + Math.PI * 1.7), e = p[p.length - 1]; return [p, [[e[0] - .22, e[1] - .12], e, [e[0] + .02, e[1] + .26]], [[-.62, -.35], [-.38, -.55], [-.15, -.25], [0, -.05], [.15, -.25], [.38, -.55], [.62, -.35]], [[-.45, -.15], [-.2, -.05]], [[.45, -.15], [.2, -.05]], [[0, -.3], [0, .35]], [[-.2, .6], [0, .35], [.2, .6]], [[0, .35], [0, .65]], circ(0, -.38, .08)]; },
  // 분열: 원 하나가 금 가며 둘로 갈라짐
  split: () => [circ(0, -.45, .32), [[-.08, -.77], [.06, -.55], [-.06, -.4], [.08, -.13]], [[-.15, -.15], [-.45, .25]], [[.15, -.15], [.45, .25]], circ(-.5, .5, .27), circ(.5, .5, .27)],
  // 자석: 말굽자석 + 안으로 끌어당기는 자기력선
  magnet: () => [[[-.55, -.8], [-.55, .05], ...arc(0, .05, .55, Math.PI, 0, true).slice(1), [.55, -.8], [.25, -.8], [.25, .05], ...arc(0, .05, .25, 0, Math.PI).slice(1), [-.25, -.8], [-.55, -.8]], [[-.55, -.55], [-.25, -.55]], [[.25, -.55], [.55, -.55]], arc(0, -.8, .2, Math.PI, 2 * Math.PI), arc(0, -.8, .42, Math.PI * 1.1, Math.PI * 1.9), [[-.9, -.95], [-.7, -.75]], [[.9, -.95], [.7, -.75]]],
  // 표식(봉인): 사슬 고리 안에 갇힌 가시 눈
  mark: () => [[[-.6, 0], [-.3, -.28], [0, -.35], [.3, -.28], [.6, 0], [.3, .28], [0, .35], [-.3, .28], [-.6, 0]], circ(0, 0, .14), ...Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return circ(Math.cos(a) * .78, Math.sin(a) * .78, .1); }), ...[0, 1, 2, 3].map(k => { const a = k * Math.PI / 2 + Math.PI / 4; return [[Math.cos(a) * .4, Math.sin(a) * .4], [Math.cos(a + .25) * .58, Math.sin(a + .25) * .58]]; })],
  // 클로킹: 점선으로 사라져 가는 눈과 장막
  cloak: () => [dashed([[-.75, 0], [-.38, -.35], [0, -.45], [.38, -.35], [.75, 0], [.38, .35], [0, .45], [-.38, .35], [-.75, 0]]), circ(0, 0, .16, 1), circ(0, 0, .85, 1)],
  // 정찰: 뜬 눈 + 레이더 호
  scout: () => [[[-.7, .1], [-.35, -.25], [0, -.35], [.35, -.25], [.7, .1], [.35, .42], [0, .5], [-.35, .42], [-.7, .1]], circ(0, .08, .22), circ(0, .08, .07), arc(0, .1, .9, Math.PI * 1.15, Math.PI * 1.85), arc(0, .1, 1.05, Math.PI * 1.25, Math.PI * 1.75)],
  // 지원: 원 안의 십자 + 위로 향한 강화 화살표
  support: () => [circ(0, 0, .55), [[0, -.35], [0, .35]], [[-.35, 0], [.35, 0]], ...[0, 1, 2, 3].map(k => { const a = k * Math.PI / 2 - Math.PI / 4, x = Math.cos(a) * .82, y = Math.sin(a) * .82; return [[x - .12, y + .08], [x, y - .08], [x + .12, y + .08]]; })],
};
function arc(x, y, r, a0, a1, rev) { const p = [], n = 24; for (let i = 0; i <= n; i++) { const a = rev ? a0 + (a1 - a0) * i / n : a0 + (a1 - a0) * i / n; p.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } return p; }
function dashed(pts) { const out = []; pts.forEach((q, i) => { out.push(q); if (i % 2) out.push(null); }); return out; }
function circ(x, y, r, dash) { const p = []; for (let i = 0; i <= 36; i++) { if (dash && i % 4 === 3) { p.push(null); continue; } const a = i / 36 * Math.PI * 2; p.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } return p; }
function poly(x, y, r, n) { return Array.from({ length: n + 1 }, (_, i) => { const a = -Math.PI / 2 + i / n * Math.PI * 2; return [x + Math.cos(a) * r, y + Math.sin(a) * r]; }); }
function engraveSkills(c, skills, colFor) {
  const { g, S, stone, glow } = c, cx = S.x, cy = S.y;
  const stroke = (paths, ox, oy, sc, col) => {
    const M = ([x, y]) => [cx + (ox + x * sc) * S.rx, cy + (oy + y * sc) * S.ry];
    const draw = () => { g.beginPath(); for (const p of paths) { let pen = false; for (const q of p) { if (!q) { pen = false; continue; } const [X, Y] = M(q); pen ? g.lineTo(X, Y) : g.moveTo(X, Y); pen = true; } } g.stroke(); };
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    g.translate(0, 2); g.strokeStyle = stone === 'black' ? 'rgba(0,0,0,.75)' : 'rgba(60,60,70,.45)'; g.lineWidth = 6; draw(); g.translate(0, -2);
    g.globalCompositeOperation = 'lighter'; g.shadowColor = col; g.shadowBlur = glow + 10; g.strokeStyle = rgba(lighten(col, .35), .95); g.lineWidth = 2.6; draw();
    g.restore();
  };
  const main = colFor(skills[0]);
  // 테두리 고리 + 룬 눈금
  const ring = [circ(0, 0, .9), circ(0, 0, .78)];
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r2 = i % 3 ? .84 : .87; ring.push([[Math.cos(a) * .79, Math.sin(a) * .79], [Math.cos(a) * r2, Math.sin(a) * r2]]); }
  stroke(ring, 0, 0, 1, main);
  // 가운데: 첫 스킬 문양, 나머지 스킬은 고리 위 작은 문양
  stroke((ENGRAVE[skills[0].id] || (() => [circ(0, 0, .6)]))(), 0, 0, .6, main);
  skills.slice(1).forEach((s, i) => { const a = Math.PI * (.5 + (i + 1) * .5); stroke((ENGRAVE[s.id] || (() => [circ(0, 0, .6)]))(), Math.cos(a) * .84, Math.sin(a) * .84, .2, colFor(s)); });
}
// 여기저기 뻗어 나가는 암흑 기운
function darkWisps(c, col) {
  const { g, S, rnd, t } = c;
  for (let i = 0; i < 5 + t; i++) {
    let a = rnd() * Math.PI * 2, x = S.x + Math.cos(a) * S.rx * 1.05, y = S.y + S.th / 2 + Math.sin(a) * S.ry * 1.05, L = 340 + rnd() * 380, w = 34 + rnd() * 20;
    const pts = []; for (let k = 0; k < 26; k++) { a += (rnd() - .5) * .35; x += Math.cos(a) * L / 26; y += Math.sin(a) * L / 26 * .8; pts.push([x, y, w * (1 - k / 26) + 4]); }
    for (const [px, py, r] of pts) radial(g, px, py, r * 1.6, '#06000c', .28);
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.shadowColor = col; g.shadowBlur = 12;
    g.globalCompositeOperation = 'source-over'; g.shadowColor = col; g.shadowBlur = 18;
    for (let pass = 0; pass < 2; pass++) for (let k = 1; k < pts.length; k++) { if (pass) g.shadowBlur = 0; g.strokeStyle = '#0b0014'; g.lineWidth = pts[k][2] * .7; g.beginPath(); g.moveTo(pts[k - 1][0], pts[k - 1][1]); g.lineTo(pts[k][0], pts[k][1]); g.stroke(); }
    g.globalCompositeOperation = 'lighter'; g.shadowBlur = 10;
    for (const off of [-1, 1]) { g.strokeStyle = rgba(lighten(col, .3), .5); g.lineWidth = 1.6; g.beginPath(); pts.forEach(([px, py, r], k) => { const X = px + off * r * .35, Y = py - off * r * .2; k ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.stroke(); }
    g.restore();
  }
}
function drawEnv(c, layer) {
  const { g, th, rnd, Q, t } = c, env = th.env;
  if (env === 'crystals') {
    if (layer === 'back') {
      // 2.5D 얼음 동굴: 깎인 결정면 패턴 + 양옆 결정 벽 + 결정 무리
      const cs = 70, rows = Math.ceil(HZ / (cs * .866)) + 1;
      g.save();
      for (let r = 0; r < rows; r++) for (let q = -1; q < W / cs + 1; q++) for (const up of [0, 1]) {
        const x0 = q * cs + (r % 2) * cs / 2, y0 = r * cs * .866, edge = Math.min(1, Math.abs(x0 + cs / 2 - 400) / 420 + (1 - y0 / HZ) * .35);
        g.beginPath();
        if (up) { g.moveTo(x0, y0 + cs * .866); g.lineTo(x0 + cs / 2, y0); g.lineTo(x0 + cs, y0 + cs * .866); }
        else { g.moveTo(x0 + cs / 2, y0); g.lineTo(x0 + cs * 1.5, y0); g.lineTo(x0 + cs, y0 + cs * .866); }
        g.closePath(); const v = rnd();
        g.fillStyle = v < .5 ? rgba('#ffffff', (.04 + v * .14) * edge) : rgba('#04122a', (.1 + (v - .5) * .4) * edge); g.fill();
        g.strokeStyle = rgba('#d8f6ff', .12 + .2 * edge); g.lineWidth = 1; g.stroke();
      }
      g.restore();
      for (const sd of [-1, 1]) for (let i = 0; i < 7; i++) { const x = 400 + sd * (300 + rnd() * 140), y = 120 + i * 95; shard(g, x, y + 140, 50 + rnd() * 50, 160 + rnd() * 140, sd * -(.35 + rnd() * .3), th.accent, .55 + rnd() * .25); }
      for (let i = 0; i < Math.round(9 * Q) + 3; i++) shard(g, 60 + rnd() * 680, HZ + 10, 30 + rnd() * 50, 120 + rnd() * 240, (rnd() - .5) * .5, th.accent, .3 + rnd() * .35);
      g.save(); g.globalCompositeOperation = 'lighter'; radial(g, 400, 330, 340, '#bff2ff', .25 + t * .04, 'lighter'); g.restore();
    } else { shard(g, 60, H + 20, 110, 420, .22, th.accent, .8); shard(g, W - 70, H + 20, 120, 460, -.22, th.accent, .8); if (t >= 2) { shard(g, 160, H + 20, 70, 260, .08, th.accent, .7); shard(g, W - 170, H + 20, 70, 250, -.05, th.accent, .7); } }
  } else if (env === 'flames') {
    if (layer === 'back') {
      // 화염 속: 화면 전체를 겹겹이 채우는 불길
      radial(g, 400, 500, 620, '#ff5a10', .35, 'lighter');
      for (let row = 0; row < 4; row++) { const yb = HZ + 40 - row * 170; for (let i = 0; i < Math.round(9 * Q) + 5; i++) flame(g, rnd() * W, yb + rnd() * 120, 90 + rnd() * 110, 220 + rnd() * 300, (rnd() - .5) * 90, .38 + row * .06, row > 0); }
      for (let i = 0; i < 10; i++) flame(g, rnd() < .5 ? rnd() * 160 : W - rnd() * 160, HZ + 60, 120, 500 + rnd() * 300, (rnd() - .5) * 80, .6);
    } else {
      for (let i = 0; i < Math.round(10 * Q) + 4; i++) { const x = rnd() < .5 ? rnd() * 240 : W - rnd() * 240; flame(g, x, H + 10, 80 + rnd() * 90, 220 + rnd() * 340, (rnd() - .5) * 70, .9); }
      for (let i = 0; i < Math.round(8 * Q) + 4; i++) flame(g, rnd() * W, H + 30, 70 + rnd() * 70, 100 + rnd() * 160, (rnd() - .5) * 50, .7);
      // 알을 감싸는 불길
      const S = c.S; for (let i = 0; i < Math.round(6 * Q) + 4; i++) { const sd = i % 2 ? 1 : -1, x = S.x + sd * S.rx * (.85 + rnd() * .3); flame(g, x, S.y + S.th + S.ry * (.1 + rnd() * .3), 40 + rnd() * 40, 80 + rnd() * 110 * Q, sd * (10 + rnd() * 40), .5 + rnd() * .25, true); }
    }
  } else if (env === 'leaves') {
    if (layer === 'back') {
      // 펼쳐진 초원 + 거대한 녹색 나무 + 잎 패턴
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4 + t; i++) { const x = 60 + rnd() * 680; g.fillStyle = rgba('#fff6c0', .06); g.beginPath(); g.moveTo(x - 30, 0); g.lineTo(x + 40, 0); g.lineTo(x + 200, HZ); g.lineTo(x + 40, HZ); g.closePath(); g.fill(); }
      g.restore();
      for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(0, HZ + 10); for (let x = 0; x <= W; x += 20) g.lineTo(x, HZ - 40 + k * 22 - Math.sin(x / 210 + k * 1.7) * 14); g.lineTo(W, HZ + 10); g.closePath(); g.fillStyle = ['#7fc65a', '#5aa845', '#3f8a35'][k]; g.fill(); }
      // 위쪽 가장자리를 두르는 푸른 잎 패턴
      for (let i = 0; i < 90; i++) { const x = rnd() * W, y = Math.pow(rnd(), 2) * 260 * (Math.abs(x - 400) / 400 + .4); leafShape(g, x, y, 16 + rnd() * 20, rnd() * 6, ['#3f8f3a', '#5cbc4a', '#2c6e2a', '#9ae06a'][i % 4]); }
    } else {
      // 앞쪽 풀잎 + 모서리 잎 패턴
      g.save(); g.lineCap = 'round';
      for (let i = 0; i < 160 * Q + 60; i++) { const x = rnd() * W, y = H - rnd() * 90, h = 30 + rnd() * 70; g.strokeStyle = ['#3f8f3a', '#6cc04a', '#2c6e2a', '#9ae06a'][i % 4]; g.lineWidth = 2 + rnd() * 3; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (rnd() - .5) * 20, y - h * .6, x + (rnd() - .5) * 40, y - h); g.stroke(); }
      g.restore();
      for (const [cx, cy, sd] of [[0, 0, 1], [W, 0, -1], [0, H, 1], [W, H, -1]]) for (let i = 0; i < 14; i++) { const r = 40 + rnd() * 140, a = rnd() * Math.PI / 2; leafShape(g, cx + sd * Math.cos(a) * r, cy + (cy ? -1 : 1) * Math.sin(a) * r, 22 + rnd() * 22, rnd() * 6, i % 2 ? '#3f8f3a' : '#6cc04a'); }
    }
  } else if (env === 'columns') {
    if (layer === 'back') {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9 + t * 2; i++) { const a = -Math.PI / 2 + (i - 5) * .16; g.fillStyle = rgba('#fff3c8', .06); g.beginPath(); g.moveTo(400, -40); g.lineTo(400 + Math.cos(a - .04) * 1400, -40 + Math.sin(a - .04) * -1400); g.lineTo(400 + Math.cos(a + .04) * 1400, -40 + Math.sin(a + .04) * -1400); g.closePath(); g.fill(); }
      g.restore();
      const cols = t >= 1 ? [80, 205, 595, 720] : [100, 700];
      cols.forEach(x => column(g, x, 120 + Math.abs(x - 400) * .05, HZ + 30, 62, .85));
      for (let i = 0; i < 40; i++) radial(g, rnd() * W, HZ + 10 + rnd() * 50, 50 + rnd() * 50, '#ffffff', .5);
    } else for (let i = 0; i < 10; i++) radial(g, rnd() < .5 ? rnd() * 200 : W - rnd() * 200, H - rnd() * 120, 60 + rnd() * 50, '#ffffff', .55);
  } else if (env === 'smoke') {
    if (layer === 'back') {
      for (let i = 0; i < 12; i++) radial(g, rnd() * W, 200 + rnd() * 500, 120 + rnd() * 140, i % 3 ? '#000000' : th.accent, i % 3 ? .45 : .15);
      // 기괴한 조명: 아래에서 올라오는 독성 녹색·보라 빛
      radial(g, 400, HZ + 40, 420, '#5bff9a', .12 + t * .03, 'lighter'); radial(g, 180, 300, 260, '#a020ff', .2, 'lighter'); radial(g, 640, 220, 220, '#ff2a6a', .12, 'lighter');
      // 어둠 속에서 뻗어 나오는 뒤틀린 촉수·가지
      for (let i = 0; i < 4 + Math.ceil(t / 2); i++) { const sd = i % 2 ? 1 : -1; tendril(g, rnd, sd < 0 ? -20 : W + 20, 60 + rnd() * (HZ - 120), sd < 0 ? -.3 + rnd() * .6 : Math.PI - .3 + rnd() * .6, 34 + rnd() * 16, 3, th.accent); }
      for (let i = 0; i < 2; i++) tendril(g, rnd, 150 + rnd() * 500, -20, Math.PI / 2 + (rnd() - .5) * .8, 26 + rnd() * 10, 3, th.accent);
      // 어둠 속 빛나는 균열 무늬
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba('#d58bff', .35); g.shadowColor = '#b040ff'; g.shadowBlur = 10; g.lineWidth = 1.5;
      for (let i = 0; i < 10; i++) { let x = rnd() * W, y = rnd() * HZ, a = rnd() * 7; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { a += (rnd() - .5) * 1.4; x += Math.cos(a) * 22; y += Math.sin(a) * 22; g.lineTo(x, y); } g.stroke(); }
      g.restore();
    } else {
      for (let i = 0; i < 8; i++) radial(g, rnd() * W, H - rnd() * 140, 120 + rnd() * 80, '#000000', .55);
      for (const sd of [-1, 1]) tendril(g, rnd, sd < 0 ? -10 : W + 10, H + 20, sd < 0 ? -1.3 : -Math.PI + 1.3, 40, 1, th.accent);
      radial(g, c.S.x, c.S.y + c.S.th + 40, 240, '#5bff9a', .1, 'lighter');
      darkWisps(c, th.accent);
    }
  } else if (env === 'bolts') {
    if (layer === 'back') for (let b = 0; b < 2 + t; b++) {
      let x = 80 + rnd() * 640, y = 0; g.save(); g.globalCompositeOperation = 'lighter'; g.shadowColor = th.accent; g.shadowBlur = 20; g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y);
      while (y < HZ - 40) { x += (rnd() - .5) * 70; y += 30 + rnd() * 40; g.lineTo(x, y); }
      g.stroke(); g.lineWidth = 8; g.strokeStyle = rgba(th.accent, .35); g.stroke(); g.restore();
    }
  } else if (env === 'waves') {
    if (layer === 'back') for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 10) g.lineTo(x, HZ - 30 + k * 26 + Math.sin(x / 60 + k * 2) * 12); g.lineTo(W, H); g.closePath(); g.fillStyle = rgba(th.accent, .12); g.fill(); }
    else for (let i = 0; i < 30 * Q; i++) { const x = rnd() < .5 ? rnd() * 220 : W - rnd() * 220; g.beginPath(); g.arc(x, H - rnd() * 240, 2 + rnd() * 7, 0, 7); g.fillStyle = rgba('#e0fffb', .5 + rnd() * .4); g.fill(); }
  } else if (env === 'abyss') {
    if (layer === 'back') {
      // 심해: 위에서 희미하게 떨어지는 빛줄기, 발광 생물, 물 흐름
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) { const x = 100 + rnd() * 600, w = 40 + rnd() * 70; const lg = g.createLinearGradient(0, 0, 0, HZ); lg.addColorStop(0, rgba('#8fe6ff', .16)); lg.addColorStop(1, rgba('#8fe6ff', 0)); g.fillStyle = lg; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w * 2.4 + 80, HZ); g.lineTo(x - w * .6 + 80, HZ); g.closePath(); g.fill(); }
      g.lineCap = 'round';
      for (let k = 0; k < 7; k++) { const y0 = 150 + rnd() * 520; g.strokeStyle = rgba(th.accent, .12 + rnd() * .14); g.lineWidth = 2 + rnd() * 6; g.beginPath(); g.moveTo(-20, y0); for (let x = 0; x <= W + 20; x += 20) g.lineTo(x, y0 + Math.sin(x / 90 + k) * 26); g.stroke(); }
      for (let i = 0; i < 40 * Q + 10; i++) radial(g, rnd() * W, rnd() * HZ, 3 + rnd() * 10, rnd() < .7 ? th.accent : '#7affc8', .5 + rnd() * .4, 'lighter');
      g.restore();
      g.save(); g.globalCompositeOperation = 'multiply'; const vg = g.createRadialGradient(400, 560, 200, 400, 560, 760); vg.addColorStop(0, '#ffffff'); vg.addColorStop(1, '#203040'); g.fillStyle = vg; g.fillRect(0, 0, W, H); g.restore();
    } else {
      // 거품 기둥 + 알을 감싸는 물 흐름
      const S = c.S; g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      for (let k = 0; k < 4 + t; k++) { const a0 = rnd() * 6; g.strokeStyle = rgba(k % 2 ? '#bff6ff' : th.accent, .35 + rnd() * .3); g.lineWidth = 2 + rnd() * 4; g.beginPath(); for (let i = 0; i <= 40; i++) { const a = a0 + i / 40 * Math.PI * 1.6, rr = 1.15 + i / 40 * .45, x = S.x + Math.cos(a) * S.rx * rr, y = S.y + S.th / 2 + Math.sin(a) * S.ry * rr * .8 - i * 3; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
      g.restore();
      for (let col = 0; col < 5 + t; col++) { let x = rnd() * W, y = H - rnd() * 100; for (let i = 0; i < 14; i++) { x += (rnd() - .5) * 14; y -= 20 + rnd() * 40; const r = 2 + rnd() * 9; g.strokeStyle = rgba('#e0fffb', .55); g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); g.fillStyle = rgba('#ffffff', .5); g.beginPath(); g.arc(x - r * .35, y - r * .35, r * .25, 0, 7); g.fill(); } }
    }
  } else if (env === 'nebula') {
    if (layer === 'back') {
      const cols = [th.accent, th.sky[2], '#ff6ad5', '#6ad5ff'];
      for (let i = 0; i < 7; i++) radial(g, rnd() * W, rnd() * HZ, 180 + rnd() * 180, cols[i % 4], .22, 'lighter');
      for (let i = 0; i < 220 * Q; i++) { g.fillStyle = `rgba(255,255,255,${rnd() * .8 + .2})`; g.fillRect(rnd() * W, rnd() * HZ, 1.5, 1.5); }
      // 여러 종류의 은하 + 다양한 우주 먼지
      const dustCols = ['#7b5cff', '#ff6ad5', '#5fd0ff', '#ffb070', '#6affc8', '#ff7a7a'];
      for (let i = 0; i < 26; i++) { let x = rnd() * W, y = rnd() * HZ; const col = dustCols[i % 6]; for (let k = 0; k < 6; k++) { x += (rnd() - .5) * 120; y += (rnd() - .5) * 70; radial(g, x, y, 40 + rnd() * 110, col, .06 + rnd() * .07, 'lighter'); } }
      for (let i = 0; i < 9; i++) { let x = rnd() * W, y = rnd() * HZ, a = rnd() * 7; for (let k = 0; k < 18; k++) { a += (rnd() - .5) * .6; x += Math.cos(a) * 24; y += Math.sin(a) * 14; radial(g, x, y, 18 + rnd() * 26, '#0a0414', .12 + rnd() * .1); } }
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      for (let i = 0; i < 6; i++) { let x = rnd() * W, y = rnd() * HZ, a = rnd() * 7; g.strokeStyle = rgba(dustCols[(i + 2) % 6], .12); g.lineWidth = 6 + rnd() * 10; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 10; k++) { a += (rnd() - .5) * .7; x += Math.cos(a) * 40; y += Math.sin(a) * 26; g.lineTo(x, y); } g.stroke(); }
      g.restore();
      // 뒤엉킨 우주 먼지 리본 (서로 꼬이며 지나감)
      g.save(); g.lineCap = 'round';
      for (let i = 0; i < 10; i++) {
        let x = rnd() * W, y = rnd() * HZ, a = rnd() * 7; const col = dustCols[i % 6], pts = [];
        for (let k = 0; k < 30; k++) { a += (rnd() - .5) * .5 + Math.sin(k * .4 + i) * .12; x += Math.cos(a) * 26; y += Math.sin(a) * 18; pts.push([x, y]); }
        for (const [px, py] of pts) radial(g, px, py, 30 + rnd() * 40, i % 3 === 2 ? '#0a0414' : col, i % 3 === 2 ? .14 : .09, i % 3 === 2 ? 'source-over' : 'lighter');
        g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(lighten(col, .3), .18); g.lineWidth = 2 + rnd() * 3; g.beginPath(); pts.forEach(([px, py], k) => k ? g.lineTo(px, py) : g.moveTo(px, py)); g.stroke(); g.globalCompositeOperation = 'source-over';
      }
      g.restore();
      // 멀리 떠 있는 소행성들
      for (let i = 0; i < 16; i++) { const x = rnd() * W, y = rnd() * (HZ - 40); if (Math.abs(x - 400) < 190 && y > 420) continue; asteroid(g, rnd, x, y, 6 + rnd() * 26, th.accent); }
    } else {
      // 가까이 떠 있는 큰 소행성 (가장자리)
      for (let i = 0; i < 3 + Math.ceil(t / 2); i++) { const sd = i % 2 ? 1 : -1; asteroid(g, rnd, 400 + sd * (300 + rnd() * 120), 120 + rnd() * 900, 40 + rnd() * 50, th.accent); }
      // 먼지를 뚫는 강렬한 빛줄기
      g.save(); g.globalCompositeOperation = 'lighter';
      const lx = 120 + rnd() * 560, ly = 60 + rnd() * 200;
      radial(g, lx, ly, 260, '#fff2e0', .45, 'lighter'); radial(g, lx, ly, 70, '#ffffff', .9, 'lighter');
      for (let i = 0; i < 14; i++) { const a = rnd() * Math.PI * 2, L = 500 + rnd() * 600, w = .015 + rnd() * .03; const lg = g.createLinearGradient(lx, ly, lx + Math.cos(a) * L, ly + Math.sin(a) * L); lg.addColorStop(0, rgba('#fff4e0', .4)); lg.addColorStop(1, rgba(th.accent, 0)); g.fillStyle = lg; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + Math.cos(a - w) * L, ly + Math.sin(a - w) * L); g.lineTo(lx + Math.cos(a + w) * L, ly + Math.sin(a + w) * L); g.closePath(); g.fill(); }
      g.restore();
      // 빛이 퍼지는 섬광들
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 40 * Q; i++) sparkle(g, rnd() * W, rnd() * H, 3 + rnd() * 6, rnd() < .5 ? th.accent : '#bfe0ff', .7);
      const n = 3 + t * 2;
      for (let i = 0; i < n; i++) {
        const x = rnd() * W, y = rnd() * H * .9, R = 60 + rnd() * 140, col = rnd() < .5 ? th.accent : '#bfe0ff';
        radial(g, x, y, R * .6, col, .5, 'lighter');
        const hl = g.createLinearGradient(x - R * 2.5, 0, x + R * 2.5, 0); hl.addColorStop(0, rgba(col, 0)); hl.addColorStop(.5, rgba('#ffffff', .45)); hl.addColorStop(1, rgba(col, 0)); g.fillStyle = hl; g.fillRect(x - R * 2.5, y - 1.5, R * 5, 3);
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + rnd() * .2, L = R * (k % 2 ? .6 : 1.6); const lg = g.createLinearGradient(x, y, x + Math.cos(a) * L, y + Math.sin(a) * L); lg.addColorStop(0, rgba('#ffffff', .7)); lg.addColorStop(1, rgba(col, 0)); g.strokeStyle = lg; g.lineWidth = k % 2 ? 1.5 : 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
      }
      g.restore();
    }
  } else if (env === 'arcane') {
    if (layer === 'back') {
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(th.accent, .22); g.lineWidth = 2;
      for (const r of [260, 230, 150]) { g.beginPath(); g.arc(400, 420, r, 0, 7); g.stroke(); }
      for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; g.beginPath(); g.moveTo(400 + Math.cos(a) * 232, 420 + Math.sin(a) * 232); g.lineTo(400 + Math.cos(a) * 258, 420 + Math.sin(a) * 258); g.stroke(); }
      g.beginPath(); starPath(g, 400, 420, 228, 150, 6); g.stroke(); g.restore();
    }
  }
}
function drawParticles(c) {
  const { g, th, rnd, Q } = c, n = Math.round(70 * Q);
  g.save();
  for (let i = 0; i < n; i++) {
    const x = rnd() * W, y = rnd() * H, s = rnd();
    switch (th.part) {
      case 'snow': g.fillStyle = `rgba(255,255,255,${.4 + s * .5})`; g.beginPath(); g.arc(x, y, 1 + s * 3.5, 0, 7); g.fill(); break;
      case 'ember': g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(s < .5 ? '#ffb347' : '#ff6a1a', .8); g.lineWidth = 1.5 + s * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - .5) * 8, y - 8 - s * 16); g.stroke(); break;
      case 'leaf': if (i % 3 === 0) leafShape(g, x, y, 5 + s * 9, rnd() * 6, s < .5 ? '#8fdc5a' : '#d5ff9e'); else radial(g, x, y, 4 + s * 8, th.accent, .55, 'lighter'); break;
      case 'mote': radial(g, x, y, 3 + s * 10, th.accent, .5 + s * .3, 'lighter'); break;
      case 'smoke': radial(g, x, y, 2 + s * 6, th.accent, .5, 'lighter'); break;
      case 'spark': g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(th.accent, .9); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - .5) * 16, y + (rnd() - .5) * 16); g.lineTo(x + (rnd() - .5) * 16, y + (rnd() - .5) * 16); g.stroke(); break;
      case 'bubble': g.strokeStyle = rgba('#e0fffb', .5); g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 2 + s * 8, 0, 7); g.stroke(); break;
      case 'star': if (i % 4 === 0) sparkle(g, x, y, 3 + s * 9, th.accent, .8); else { g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(x, y, 2, 2); } break;
    }
    g.globalCompositeOperation = 'source-over';
  }
  g.restore();
}

/* ---- 스킬 이펙트 ---- */
function seal(g, x, y, r, col, rnd) {
  g.save(); g.globalCompositeOperation = 'lighter'; g.shadowColor = col; g.shadowBlur = 14; g.strokeStyle = col; g.translate(x, y); g.scale(1, .6);
  g.lineWidth = 3; for (const k of [1, .84, .55]) { g.beginPath(); g.arc(0, 0, r * k, 0, 7); g.stroke(); }
  g.lineWidth = 2; g.beginPath(); starPath(g, 0, 0, r * .82, r * .42, 6); g.stroke();
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * r * .86, Math.sin(a) * r * .86); g.lineTo(Math.cos(a) * r * (.95 + (i % 3 ? 0 : .05)), Math.sin(a) * r * (.95 + (i % 3 ? 0 : .05))); g.stroke(); }
  g.restore();
}
const SKFX = {
  pierce: {
    back(c, col) {
      const { g, S, rnd, t } = c, ex = S.x, ey = 255;
      drawStone(g, ex, ey, 88, 52, 22, c.enemy, {});
      g.save(); g.strokeStyle = c.enemy === 'black' ? 'rgba(255,255,255,.6)' : 'rgba(40,40,50,.65)'; g.lineWidth = 2;
      for (let i = 0; i < 8; i++) { let a = rnd() * Math.PI * 2, x = ex, y = ey; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { a += (rnd() - .5) * .8; x += Math.cos(a) * 18; y += Math.sin(a) * 11; g.lineTo(x, y); } g.stroke(); }
      g.restore();
      g.save(); g.globalCompositeOperation = 'lighter'; g.shadowColor = col; g.shadowBlur = c.glow + 10;
      const bg = g.createLinearGradient(0, S.y, 0, 30); bg.addColorStop(0, rgba(col, 0)); bg.addColorStop(.35, rgba(col, .6)); bg.addColorStop(1, 'rgba(255,255,255,.95)');
      g.fillStyle = bg; g.beginPath(); g.moveTo(S.x - 64, S.y - 20); g.lineTo(S.x + 64, S.y - 20); g.lineTo(ex, 28); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(S.x - 16, S.y - 40); g.lineTo(S.x + 16, S.y - 40); g.lineTo(ex, 30); g.closePath(); g.fill();
      g.lineWidth = 3; g.strokeStyle = rgba(col, .65);
      for (let i = 0; i < 4 + t; i++) { const yy = S.y - 100 - i * 70; if (yy < 70) break; const w = 62 * (yy - 30) / (S.y - 50); g.beginPath(); g.ellipse(ex, yy, w * 1.3, w * .35, 0, 0, 7); g.stroke(); }
      g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(ex, ey, 128, 42, 0, 0, 7); g.stroke();
      g.restore();
      for (let i = 0; i < 8 + t * 3; i++) { const a = -Math.PI / 2 + (rnd() - .5) * 2.6, d = 95 + rnd() * 150; shardPiece(g, ex + Math.cos(a) * d, ey + Math.sin(a) * d * .7, 6 + rnd() * 10, rnd() * 6, c.enemy === 'black' ? '#2a2d33' : '#e8ebef'); }
    },
    front(c, col) {
      const { g, S, rnd, Q } = c; g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 14 * Q + 4; i++) { const x = S.x + (rnd() - .5) * 200, y = S.y - 80 - rnd() * 420, L = 30 + rnd() * 70; const gr = g.createLinearGradient(x, y, x, y + L); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, rgba(col, 0)); g.strokeStyle = gr; g.lineWidth = 1.5 + rnd() * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + L); g.stroke(); }
      g.restore();
    },
  },
  accel: {
    back(c, col) {
      const { g, S, rnd, Q } = c, dx = -.78, dy = .62;
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < Math.round(36 * Q) + 8; i++) {
        const px = rnd() * W * 1.2 - 40, py = rnd() * H * .85, L = 120 + rnd() * 420;
        const gr = g.createLinearGradient(px, py, px + dx * L, py + dy * L); gr.addColorStop(0, rgba(i % 3 ? col : '#ffffff', .15 + rnd() * .55)); gr.addColorStop(1, rgba(col, 0));
        g.strokeStyle = gr; g.lineWidth = 1 + rnd() * 3.5; g.beginPath(); g.moveTo(px, py); g.lineTo(px + dx * L, py + dy * L); g.stroke();
      }
      g.restore();
      for (let k = 3; k >= 1; k--) drawStone(g, S.x + dx * k * 85, S.y + dy * k * 85, S.rx * (1 - k * .04), S.ry * (1 - k * .04), S.th, c.stone, { alpha: .42 - k * .1, tint: col, tintA: .55 });
    },
    front(c, col) {
      const { g, S, rnd, Q } = c, dx = -.78, dy = .62, px = -dy, py = dx;
      // 한 방향 직선 바람: 알 몸통을 스치고 뒤로 길게 뻗는 평행선
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      for (let i = 0; i < Math.round(22 * Q) + 10; i++) {
        const o = (rnd() * 2 - 1) * (S.rx + 40), sx = S.x + px * o - dx * (S.rx * .5 + rnd() * 60), sy = S.y + S.th / 2 + py * o * .7 - dy * (S.ry * .3 + rnd() * 40);
        const L = 160 + rnd() * 380, ex = sx + dx * L, ey = sy + dy * L;
        const gr = g.createLinearGradient(sx, sy, ex, ey); gr.addColorStop(0, rgba(i % 6 ? lighten(col, .2) : '#ffffff', (c.stone === 'white' ? .25 : .4) + rnd() * .35)); gr.addColorStop(1, rgba(col, 0));
        g.strokeStyle = gr; g.lineWidth = .8 + rnd() * 3; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
      }
      // 화면을 가로지르는 긴 바람선
      for (let i = 0; i < 6 + 4 * Q; i++) {
        const sx = 80 + rnd() * 760, sy = rnd() * H * .7, L = 500 + rnd() * 500;
        const gr = g.createLinearGradient(sx, sy, sx + dx * L, sy + dy * L); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.4, rgba('#ffffff', .55)); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.strokeStyle = gr; g.lineWidth = 1.5 + rnd() * 1.5; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + dx * L, sy + dy * L); g.stroke();
      }
      // 앞쪽 공기를 가르는 쐐기
      const fx = S.x - dx * (S.rx * .95), fy = S.y + S.th * .3 - dy * (S.ry * .95);
      g.shadowColor = col; g.shadowBlur = c.glow + 8; g.strokeStyle = rgba('#ffffff', .8); g.lineWidth = 3;
      for (const sgn of [-1, 1]) { g.beginPath(); g.moveTo(fx - dx * 30, fy - dy * 30); g.lineTo(fx + dx * 60 + px * sgn * (S.rx * .9), fy + dy * 60 + py * sgn * (S.ry * 1.1)); g.stroke(); }
      g.restore();
      g.save(); g.globalCompositeOperation = 'lighter'; g.shadowColor = col; g.shadowBlur = c.glow;
      for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(S.x + 30 + k * 18, S.y - 10 - k * 14, S.rx * 1.15 + k * 28, S.ry * 1.25 + k * 20, -.55, -2.2, -.4); g.strokeStyle = rgba(k ? col : '#ffffff', .75 - k * .2); g.lineWidth = 5 - k; g.stroke(); }
      g.restore();
    },
  },
  explode: {
    back(c, col) {
      const { g, S, rnd, t } = c, cx = S.x, cy = S.y + S.th * .5, n = 16 + t * 2;
      g.save(); g.globalCompositeOperation = 'lighter'; g.beginPath();
      for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, r = i % 2 ? 150 + rnd() * 40 : 260 + rnd() * 170; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * .8); }
      g.closePath(); const rg = g.createRadialGradient(cx, cy, 20, cx, cy, 420); rg.addColorStop(0, 'rgba(255,255,230,.95)'); rg.addColorStop(.3, rgba(col, .75)); rg.addColorStop(1, rgba(col, 0)); g.fillStyle = rg; g.fill();
      g.shadowColor = col; g.shadowBlur = c.glow;
      for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(cx, S.y + S.th + 30, 260 + k * 85, (260 + k * 85) * .3, 0, 0, 7); g.strokeStyle = rgba(k ? col : '#ffffff', .7 - k * .18); g.lineWidth = 7 - k * 2; g.stroke(); }
      g.restore();
    },
    front(c, col) {
      const { g, S, rnd, t, Q } = c, cx = S.x, cy = S.y + S.th * .5, n = 5 + t;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + .3 + (rnd() - .5) * .4, d = 310 + rnd() * 50, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * .62;
        g.save(); g.globalCompositeOperation = 'lighter'; const tx = x - Math.cos(a) * 150, ty = y - Math.sin(a) * 93;
        const gr = g.createLinearGradient(x, y, tx, ty); gr.addColorStop(0, rgba(col, .8)); gr.addColorStop(1, rgba(col, 0)); g.strokeStyle = gr; g.lineWidth = 26; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(tx, ty); g.stroke(); g.restore();
        drawStone(g, x, y, 40, 24, 11, i % 2 ? c.stone : c.enemy, { rim: col, rimA: .8, glow: c.glow });
      }
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba('#fff2c0', .8);
      for (let i = 0; i < 30 * Q; i++) { const a = rnd() * Math.PI * 2, d = 180 + rnd() * 220, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * .7; g.lineWidth = 1 + rnd() * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 22, y + Math.sin(a) * 15); g.stroke(); }
      g.restore();
    },
  },
  shield: {
    front(c, col) {
      const { g, S, rnd } = c, cx = S.x, cy = S.y + S.th * .6, rx = S.rx * 1.38, dh = S.ry * 2.8, rb = S.ry * 1.3;
      g.save(); g.globalCompositeOperation = 'lighter';
      const path = () => { g.beginPath(); g.moveTo(cx - rx, cy); g.ellipse(cx, cy, rx, dh, 0, Math.PI, Math.PI * 2, false); g.ellipse(cx, cy, rx, rb, 0, 0, Math.PI, false); g.closePath(); };
      path(); const rg = g.createRadialGradient(cx, cy - dh * .3, 20, cx, cy - dh * .2, rx * 1.1); rg.addColorStop(0, rgba(col, .05)); rg.addColorStop(1, rgba(col, .35)); g.fillStyle = rg; g.fill();
      g.save(); path(); g.clip(); const s = 26;
      for (let col_ = 0; col_ * s * 1.5 < 2 * rx + s * 2; col_++) for (let row = 0; row * s * 1.732 < dh + rb + s * 2; row++) {
        const hx = cx - rx + col_ * s * 1.5, hy = cy - dh + row * s * 1.732 + (col_ % 2) * s * .866;
        g.beginPath(); polyPath(g, hx, hy, s * .92, 6, 0); g.lineWidth = 1.5; g.strokeStyle = rgba(col, .4); g.stroke();
        if (rnd() < .08) { g.fillStyle = rgba(col, .2); g.fill(); }
      }
      g.restore();
      g.shadowColor = col; g.shadowBlur = c.glow + 8; path(); g.lineWidth = 3.5; g.strokeStyle = rgba(lighten(col, .4), .9); g.stroke();
      g.beginPath(); g.ellipse(cx - rx * .25, cy - dh * .62, rx * .45, dh * .25, -.5, Math.PI * 1.1, Math.PI * 1.7); g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,.5)'; g.stroke();
      g.restore();
    },
  },
  thorns: {
    back(c, col) {
      const { g, S } = c; spikes(c, col, 'back');
      const ix = S.x + S.rx * .72, iy = S.y - S.ry * .78, ex = 655, ey = 300;
      g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(ix, iy, ex, ey); gr.addColorStop(0, rgba(col, .0)); gr.addColorStop(1, rgba(col, .7)); g.strokeStyle = gr; g.lineWidth = 40; g.lineCap = 'round'; g.beginPath(); g.moveTo(ix, iy); g.lineTo(ex - 40, ey + 30); g.stroke(); g.restore();
      drawStone(g, ex, ey, 72, 43, 20, c.enemy, { rim: col, rimA: .9, glow: c.glow });
    },
    front(c, col) {
      const { g, S } = c; spikes(c, col, 'front');
      const ix = S.x + S.rx * .72, iy = S.y - S.ry * .78;
      g.save(); g.globalCompositeOperation = 'lighter'; g.shadowColor = col; g.shadowBlur = c.glow + 6; g.beginPath(); starPath(g, ix, iy, 70, 18, 8, .2); const rg = g.createRadialGradient(ix, iy, 0, ix, iy, 70); rg.addColorStop(0, '#ffffff'); rg.addColorStop(.4, rgba(col, .9)); rg.addColorStop(1, rgba(col, 0)); g.fillStyle = rg; g.fill(); g.restore();
    },
  },
  revive: {
    back(c, col) {
      const { g, S, t } = c;
      g.save(); g.globalCompositeOperation = 'lighter';
      const pg = g.createLinearGradient(0, 0, 0, S.y); pg.addColorStop(0, rgba(col, .5)); pg.addColorStop(1, rgba(col, .1)); g.fillStyle = pg; g.fillRect(S.x - 110, 0, 220, S.y);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(S.x - 30, 0, 60, S.y);
      g.shadowColor = col; g.shadowBlur = c.glow + 6;
      for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
        const ang = side > 0 ? -1.25 + i * .22 : Math.PI + 1.25 - i * .22, len = 250 - i * 16;
        const fg = g.createLinearGradient(S.x, S.y, S.x + side * len, S.y - len * .6); fg.addColorStop(0, rgba(col, .9)); fg.addColorStop(1, rgba(lighten(col, .5), .15));
        feather(g, S.x + side * 50, S.y - 20, len, 30, ang, fg);
      }
      g.beginPath(); g.ellipse(S.x, S.y - S.ry - 110, 110, 26, 0, 0, 7); g.lineWidth = 8; g.strokeStyle = rgba(lighten(col, .45), .9); g.stroke();
      g.restore();
    },
    front(c, col) {
      const { g, S, rnd, Q } = c; g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 40 * Q; i++) { const x = S.x + (rnd() - .5) * 420, y = S.y + 80 - rnd() * 600, r = 1.5 + rnd() * 3.5; radial(g, x, y, r * 4, col, .7, 'lighter'); g.fillStyle = '#fff'; g.fillRect(x - r / 2, y - r * 2, r, r * 3); }
      g.restore();
    },
  },
  split: {
    back(c, col) {
      const { g, S } = c;
      for (const side of [-1, 1]) {
        const x = S.x + side * 180, y = S.y - 75;
        g.save(); g.globalCompositeOperation = 'lighter'; g.shadowColor = col; g.shadowBlur = c.glow + 6; g.setLineDash([10, 8]); g.lineWidth = 4; g.strokeStyle = rgba(col, .8);
        g.beginPath(); g.moveTo(S.x, S.y - S.ry * .5); g.quadraticCurveTo(S.x + side * 70, S.y - 230, x, y - S.ry * .7); g.stroke(); g.restore();
        drawStone(g, x, y, S.rx * .74, S.ry * .74, S.th * .8, c.stone, { alpha: .6, tint: col, tintA: .45, rim: col, rimA: .9, glow: c.glow + 4 });
      }
    },
    front(c, col) {
      const { g, S } = c; g.save(); g.globalCompositeOperation = 'lighter'; g.shadowColor = col; g.shadowBlur = c.glow + 12;
      g.strokeStyle = rgba(col, .9); g.lineWidth = 10; g.beginPath(); g.moveTo(S.x + 14, S.y - S.ry - 70); g.lineTo(S.x - 14, S.y + S.th + S.ry + 50); g.stroke();
      g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.stroke(); g.restore();
    },
  },
  magnet: {
    back(c, col) {
      const { g, S, rnd, Q } = c, cx = S.x, cy = S.y + S.th * .4;
      // 중심으로 휘감겨 들어가는 자기장 소용돌이
      g.save(); g.translate(cx, cy); g.scale(1, .62); radial(g, 0, 0, 460, '#2a0b3a', .55); g.restore();
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      const N = 14;
      for (let k = 0; k < N; k++) {
        const a0 = k / N * Math.PI * 2, red = k % 2 === 0;
        g.shadowColor = red ? '#ff4d4d' : '#4d8bff'; g.shadowBlur = c.glow;
        for (let j = 0; j < 46; j++) {
          const u0 = j / 46, u1 = (j + 1) / 46, r0 = 470 * (1 - u0) + 60, r1 = 470 * (1 - u1) + 60, t0 = a0 + u0 * 3.4, t1 = a0 + u1 * 3.4;
          g.strokeStyle = rgba(red ? '#ff6a6a' : '#6aa0ff', .12 + u1 * .7); g.lineWidth = .8 + u1 * 3.2;
          g.beginPath(); g.moveTo(cx + Math.cos(t0) * r0, cy + Math.sin(t0) * r0 * .62); g.lineTo(cx + Math.cos(t1) * r1, cy + Math.sin(t1) * r1 * .62); g.stroke();
        }
      }
      // 빨려 들어가는 쇳조각 · 파편 (꼬리가 바깥쪽)
      for (let i = 0; i < 70 * Q + 20; i++) {
        const a = rnd() * Math.PI * 2, d = 150 + rnd() * 340, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * .7;
        const L = 30 + rnd() * 70, ux = (cx - x) / d, uy = (cy - y) / d, hx = x + ux * L, hy = y + uy * L;
        const gr = g.createLinearGradient(x, y, hx, hy); gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(1, rgba(rnd() < .5 ? '#ffd0d0' : '#cfe0ff', .9));
        g.shadowBlur = 6; g.shadowColor = col; g.strokeStyle = gr; g.lineWidth = 1.5 + rnd() * 2.5; g.beginPath(); g.moveTo(x, y); g.lineTo(hx, hy); g.stroke();
        g.fillStyle = '#e8ecf4'; g.save(); g.translate(hx, hy); g.rotate(a + rnd()); const sz = 2 + rnd() * 6; g.fillRect(-sz, -sz * .4, sz * 2, sz * .8); g.restore();
      }
      g.restore();
      // 끌려오는 적 알 (잔상)
      for (const [x, y, cxo] of [[150, 330, 1], [660, 400, -1], [640, 880, -1]]) {
        g.save(); g.globalCompositeOperation = 'lighter'; g.setLineDash([12, 10]); g.lineWidth = 4; g.strokeStyle = rgba(col, .75); g.shadowColor = col; g.shadowBlur = 10;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo((x + S.x) / 2 + cxo * 120, (y + S.y) / 2 - 80, S.x + (x - S.x) * .3, S.y + (y - S.y) * .3); g.stroke(); g.restore();
        for (let k = 3; k >= 1; k--) { g.save(); g.globalAlpha = .12 * (4 - k); drawStone(g, x + (S.x - x) * .07 * k, y + (S.y - y) * .07 * k, 46, 28, 12, c.enemy, {}); g.restore(); }
        drawStone(g, x, y, 46, 28, 12, c.enemy, { rim: col, rimA: .8, glow: c.glow });
      }
    },
    front(c) {
      const { g, S, rnd } = c, cx = S.x, cy = S.y + S.th * .4;
      radial(g, S.x - S.rx * .7, S.y - 10, 140, '#ff4d4d', .45, 'lighter'); radial(g, S.x + S.rx * .7, S.y + S.th, 140, '#4d8bff', .45, 'lighter');
      // 안쪽으로 조여드는 흡입 링
      g.save(); g.globalCompositeOperation = 'lighter'; g.shadowBlur = 12;
      for (let k = 0; k < 4; k++) { const r = S.rx * (1.25 + k * .32); g.shadowColor = k % 2 ? '#4d8bff' : '#ff4d4d'; g.strokeStyle = rgba(k % 2 ? '#8fb6ff' : '#ff9a9a', .5 - k * .1); g.lineWidth = 3 - k * .5; g.beginPath(); g.ellipse(cx, cy, r, r * .55, 0, Math.PI * (.05 + k * .1), Math.PI * (1.6 + k * .1)); g.stroke(); }
      // 전자기 스파크
      g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.shadowColor = '#bcd4ff';
      for (let i = 0; i < 5; i++) {
        let a = rnd() * Math.PI * 2, r = S.rx * 1.05, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * .6; g.beginPath(); g.moveTo(x, y);
        for (let j = 0; j < 5; j++) { r += 18 + rnd() * 18; a += (rnd() - .5) * .5; x = cx + Math.cos(a) * r; y = cy + Math.sin(a) * r * .6; g.lineTo(x, y); }
        g.stroke();
      }
      g.restore();
    },
  },
  mark: {
    back(c, col) {
      const { g, S, rnd, Q } = c, ex = 220, ey = 330, curse = mix(col, '#7a2cff', .5);
      // 발밑의 저주 원 + 적 알까지 이어지는 어둠의 촉수
      seal(g, S.x, S.y + S.th + 34, 270, rgba(curse, .5), rnd);
      g.save(); g.lineCap = 'round';
      for (let k = 0; k < 5; k++) {
        const ox = (rnd() - .5) * 80, oy = (rnd() - .5) * 40;
        g.strokeStyle = rgba('#14051f', .55); g.lineWidth = 16 - k * 2; g.beginPath(); g.moveTo(S.x - 30, S.y - 20);
        g.bezierCurveTo(S.x - 120 + ox, S.y - 160 + oy, ex + 140 - ox, ey + 120 + oy, ex + 30, ey + 10); g.stroke();
        g.globalCompositeOperation = 'lighter'; g.shadowColor = curse; g.shadowBlur = c.glow + 6; g.strokeStyle = rgba(lighten(curse, .2), .65); g.lineWidth = 4; g.stroke();
        g.globalCompositeOperation = 'source-over'; g.shadowBlur = 0;
      }
      g.restore();
      // 저주받은 적 알: 검보라 연기, 금, 낙인
      g.save(); g.translate(ex, ey); g.scale(1, .65); radial(g, 0, 0, 190, '#1a0628', .85); g.restore();
      drawStone(g, ex, ey, 86, 51, 22, c.enemy, {});
      g.save(); g.globalAlpha = .7; g.fillStyle = '#2a0838'; g.beginPath(); g.ellipse(ex, ey, 86, 51, 0, 0, 7); g.rect(ex - 86, ey, 172, 22); g.ellipse(ex, ey + 22, 86, 51, 0, 0, Math.PI); g.fill(); g.restore();
      g.save(); g.strokeStyle = rgba(lighten(curse, .3), .9); g.shadowColor = curse; g.shadowBlur = 12; g.lineWidth = 2.5;
      for (let i = 0; i < 7; i++) { let a = rnd() * Math.PI * 2, x = ex, y = ey; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { a += (rnd() - .5) * .9; x += Math.cos(a) * 20; y += Math.sin(a) * 12; g.lineTo(x, y); } g.stroke(); }
      // 낙인: 가시 돋친 눈 모양 문양 (글자·X 아님)
      g.translate(ex, ey); g.scale(1, .6); g.globalCompositeOperation = 'lighter'; g.strokeStyle = lighten(curse, .45); g.lineWidth = 4; g.shadowBlur = c.glow + 10;
      g.beginPath(); g.moveTo(-46, 0); g.quadraticCurveTo(0, -38, 46, 0); g.quadraticCurveTo(0, 38, -46, 0); g.stroke();
      g.beginPath(); g.arc(0, 0, 13, 0, 7); g.stroke(); g.fillStyle = lighten(curse, .5); g.beginPath(); g.arc(0, 0, 5, 0, 7); g.fill();
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * 54, Math.sin(a) * 54); g.lineTo(Math.cos(a + .18) * 70, Math.sin(a + .18) * 70); g.lineTo(Math.cos(a + .34) * 54, Math.sin(a + .34) * 54); g.stroke(); }
      g.restore();
      // 피어오르는 저주 연기
      for (let i = 0; i < 18 * Q + 6; i++) { const x = ex + (rnd() - .5) * 170, y = ey - rnd() * 230, r = 18 + rnd() * 34; radial(g, x, y, r, rnd() < .5 ? '#3a0a52' : curse, .18 + rnd() * .2, rnd() < .6 ? 'source-over' : 'lighter'); }
    },
    front(c, col) {
      const { g, S, rnd } = c, curse = mix(col, '#7a2cff', .5);
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 14; i++) { const a = rnd() * Math.PI * 2, d = S.rx * (1 + rnd() * .5), x = S.x + Math.cos(a) * d, y = S.y + S.th / 2 + Math.sin(a) * d * .55; radial(g, x, y - rnd() * 40, 14 + rnd() * 20, curse, .25, 'lighter'); }
      g.restore();
    },
  },
  cloak: {
    front(c, col) {
      const { g, S, rnd, Q } = c; g.save(); g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(S.x, S.y + S.th / 2, S.rx * (1.15 + k * .18), S.ry * (1.2 + k * .2), 0, 0, 7); g.strokeStyle = rgba('#ffffff', .18 - k * .05); g.lineWidth = 2; g.stroke(); }
      for (let i = 0; i < 60 * Q; i++) { const x = S.x + S.rx * .4 + rnd() * 300, y = S.y - 120 + rnd() * 280, s = 3 + rnd() * 9; g.fillStyle = rgba(rnd() < .5 ? col : '#ffffff', .2 + rnd() * .5 * (1 - (x - S.x) / 500)); g.fillRect(x, y, s, s); }
      g.restore();
    },
  },
  scout: {
    back(c, col) {
      const { g, S, rnd } = c, ex = S.x, ey = S.y - 6;
      // 눈에서 퍼지는 탐색 빛 원뿔 + 드러나는 적 알 실루엣
      const tg = [[180, 300], [610, 260], [660, 470]];
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const [x, y] of tg) {
        const a = Math.atan2(y - ey, x - ex), d = Math.hypot(x - ex, y - ey) + 90, sp = .2;
        const gr = g.createRadialGradient(ex, ey, 20, ex, ey, d); gr.addColorStop(0, rgba(col, .45)); gr.addColorStop(1, rgba(col, 0));
        g.fillStyle = gr; g.beginPath(); g.moveTo(ex, ey); g.arc(ex, ey, d, a - sp, a + sp); g.closePath(); g.fill();
      }
      g.restore();
      for (const [x, y] of tg) {
        g.save(); g.globalAlpha = .45; drawStone(g, x, y, 54, 32, 14, c.enemy, {}); g.restore();
        g.save(); g.globalCompositeOperation = 'lighter'; g.shadowColor = col; g.shadowBlur = 12; g.strokeStyle = rgba(lighten(col, .3), .9); g.lineWidth = 2; g.setLineDash([8, 6]);
        g.beginPath(); g.ellipse(x, y + 7, 70, 44, 0, 0, 7); g.stroke(); g.setLineDash([]);
        for (const k of [0, 1]) { g.beginPath(); g.moveTo(x - 82 + k * 164, y - 40); g.lineTo(x - 82 + k * 164, y - 54); g.lineTo(x - 68 + k * 136, y - 54); g.stroke(); }
        radial(g, x, y - 52, 26, mix(col, '#ffffff', .2), .5, 'lighter'); g.restore();
      }
      // 레이더 물결
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(col, .35); g.lineWidth = 2;
      for (let k = 1; k <= 4; k++) { g.beginPath(); g.ellipse(S.x, S.y + S.th, S.rx * (1.2 + k * .45), S.ry * (1.2 + k * .45), 0, 0, 7); g.globalAlpha = 1 - k * .2; g.stroke(); }
      g.restore();
    },
    front(c, col) {
      const { g, S, t } = c, x = S.x, y = S.y, w = S.rx * .62, h = S.ry * .5;
      // 알 윗면의 천리안 눈
      g.save(); g.globalCompositeOperation = 'lighter'; radial(g, x, y, S.rx * .9, col, .35 + t * .05, 'lighter'); g.restore();
      g.save(); g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x, y - h * 1.9, x + w, y); g.quadraticCurveTo(x, y + h * 1.9, x - w, y); g.closePath();
      g.fillStyle = '#0a0d24'; g.shadowColor = col; g.shadowBlur = c.glow + 14; g.fill(); g.clip();
      const ir = g.createRadialGradient(x, y, 2, x, y, h * 1.05); ir.addColorStop(0, '#ffffff'); ir.addColorStop(.25, lighten(col, .5)); ir.addColorStop(.7, col); ir.addColorStop(1, darken(col, .5));
      g.fillStyle = ir; g.beginPath(); g.ellipse(x, y, h * 1.05, h * .95, 0, 0, 7); g.fill();
      g.strokeStyle = rgba('#ffffff', .5); g.lineWidth = 1.2;
      for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; g.beginPath(); g.moveTo(x + Math.cos(a) * h * .35, y + Math.sin(a) * h * .32); g.lineTo(x + Math.cos(a) * h * .95, y + Math.sin(a) * h * .86); g.stroke(); }
      g.fillStyle = '#05060f'; g.beginPath(); g.ellipse(x, y, h * .22, h * .5, 0, 0, 7); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x - h * .3, y - h * .3, h * .14, 0, 7); g.fill();
      g.restore();
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = lighten(col, .4); g.lineWidth = 3; g.shadowColor = col; g.shadowBlur = c.glow + 10;
      g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x, y - h * 1.9, x + w, y); g.quadraticCurveTo(x, y + h * 1.9, x - w, y); g.stroke();
      for (let i = -3; i <= 3; i++) { const a = -Math.PI / 2 + i * .32; g.beginPath(); g.moveTo(x + Math.cos(a) * w * .95, y - h * .2 + Math.sin(a) * h * 1.6); g.lineTo(x + Math.cos(a) * w * 1.18, y - h * .2 + Math.sin(a) * h * 2.1); g.stroke(); }
      g.restore();
    },
  },
  support: {
    back(c, col) {
      const { g, S } = c, cx = S.x, cy = S.y + S.th + 40;
      g.save(); g.translate(cx, cy); g.scale(1, 150 / 380); radial(g, 0, 0, 380, col, .35, 'lighter'); g.restore();
      g.save(); g.globalCompositeOperation = 'lighter'; g.shadowColor = col; g.shadowBlur = c.glow + 6;
      g.beginPath(); g.ellipse(cx, cy, 380, 150, 0, 0, 7); g.lineWidth = 4; g.strokeStyle = rgba(lighten(col, .3), .9); g.stroke();
      g.setLineDash([14, 12]); g.beginPath(); g.ellipse(cx, cy, 330, 128, 0, 0, 7); g.lineWidth = 2; g.stroke(); g.restore();
    },
    front(c, col) {
      const { g, rnd, Q } = c;
      for (const [x, y] of [[140, 820], [660, 820]]) {
        drawStone(g, x, y, 70, 42, 20, c.stone, { rim: col, rimA: 1, glow: c.glow + 6 });
        g.save(); g.globalCompositeOperation = 'lighter'; g.shadowColor = col; g.shadowBlur = 14; g.strokeStyle = lighten(col, .3); g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
        for (let k = 0; k < 2; k++) { const yy = y - 80 - k * 34; g.beginPath(); g.moveTo(x - 24, yy + 18); g.lineTo(x, yy); g.lineTo(x + 24, yy + 18); g.stroke(); }
        g.restore();
      }
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rgba(lighten(col, .4), .85); g.shadowColor = col; g.shadowBlur = 10;
      for (let i = 0; i < 8 + 10 * Q; i++) { const x = 60 + rnd() * 680, y = 420 + rnd() * 420, s = 5 + rnd() * 9; g.fillRect(x - s, y - s * .3, s * 2, s * .6); g.fillRect(x - s * .3, y - s, s * .6, s * 2); }
      g.restore();
    },
  },
};
function spikes(c, col, half) {
  const { g, S } = c, N = 18; g.save();
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2 + .08, s = Math.sin(a);
    if (half === 'back' ? s >= 0 : s < 0) continue;
    const bx = S.x + Math.cos(a) * S.rx * .96, by = S.y + S.th * .55 + s * S.ry * .96;
    let nx = Math.cos(a), ny = s * .65; const nl = Math.hypot(nx, ny); nx /= nl; ny /= nl;
    const L = (70 + (i * 37 % 5) * 12) * (.8 + c.t * .1), px = -ny, py = nx, w = 17, tx = bx + nx * L, ty = by + ny * L;
    const gr = g.createLinearGradient(bx, by, tx, ty); gr.addColorStop(0, '#24262e'); gr.addColorStop(.6, darken(col, .2)); gr.addColorStop(1, lighten(col, .6));
    g.fillStyle = gr; g.shadowColor = col; g.shadowBlur = c.glow * .7; g.beginPath(); g.moveTo(bx + px * w, by + py * w); g.lineTo(tx, ty); g.lineTo(bx - px * w, by - py * w); g.closePath(); g.fill();
    g.shadowBlur = 0; g.strokeStyle = rgba(lighten(col, .5), .7); g.lineWidth = 1.5; g.beginPath(); g.moveTo(bx, by); g.lineTo(tx, ty); g.stroke();
  }
  g.restore();
}
function drawMainStone(c, ids, col) {
  const { g, S, stone, t } = c;
  stoneShadow(g, S.x, S.y + S.th + S.ry * .55, S.rx, ids.includes('cloak') ? .2 : .55);
  if (ids.includes('cloak')) {
    const sp = stoneSprite(S.rx, S.ry, S.th, stone, col, .25), X = S.x - sp.width / 2, Y = S.y - S.ry - 8;
    const cx = S.x, cy = S.y + S.th / 2, snap = mk(); snap.getContext('2d').drawImage(g.canvas, 0, 0);
    // 은신장: 알 주위 배경이 흐릿하고 옅게 비쳐 보임
    const f = mk(), fg = f.getContext('2d');
    fg.filter = `blur(5px) saturate(.35) brightness(${c.t >= 3 ? .8 : 1.2})`; fg.drawImage(snap, 0, 0); fg.filter = 'none';
    fg.globalCompositeOperation = 'destination-in'; fg.save(); fg.translate(cx, cy); fg.scale(1, .72);
    const rg = fg.createRadialGradient(0, 0, 0, 0, 0, S.rx * 2.1); rg.addColorStop(0, '#000'); rg.addColorStop(.55, 'rgba(0,0,0,.9)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    fg.fillStyle = rg; fg.fillRect(-W, -H, W * 2, H * 2); fg.restore();
    g.save(); g.globalAlpha = .8; g.drawImage(f, 0, 0); g.restore();
    // 알 몸통: 뒤 배경이 굴절돼(살짝 확대) 그대로 비침
    g.save(); g.beginPath(); g.ellipse(cx, S.y, S.rx, S.ry, 0, Math.PI, 0); g.lineTo(cx + S.rx, S.y + S.th); g.ellipse(cx, S.y + S.th, S.rx, S.ry, 0, 0, Math.PI); g.closePath(); g.clip();
    g.translate(cx, cy); g.scale(1.22, 1.22); g.translate(-cx, -cy); g.filter = `saturate(1.3) contrast(1.15) brightness(${c.t >= 3 ? .75 : .95})`; g.drawImage(snap, 0, 0); g.restore();
    g.save(); g.globalAlpha = .16; g.drawImage(sp, X, Y); g.restore();
    for (let i = 0; i < 10; i++) {
      const y0 = Y + i * sp.height / 10, dx = (c.rnd() - .5) * 30;
      g.save(); g.beginPath(); g.rect(0, y0, W, sp.height / 10 + 1); g.clip(); g.globalAlpha = .08 + c.rnd() * .08; g.drawImage(sp, X + dx, Y); g.restore();
    }
    g.save(); g.globalCompositeOperation = 'lighter'; g.shadowColor = '#ffffff'; g.shadowBlur = 8; g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(S.x, S.y, S.rx * .98, S.ry * .98, 0, Math.PI * 1.05, Math.PI * 1.7); g.stroke(); g.restore();
    g.save(); g.globalCompositeOperation = 'lighter'; g.setLineDash([18, 10]); g.shadowColor = col; g.shadowBlur = 12; g.strokeStyle = rgba(col, .7); g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(S.x, S.y, S.rx, S.ry, 0, 0, 7); g.stroke(); g.restore();
    return;
  }
  drawStone(g, S.x, S.y, S.rx, S.ry, S.th, stone, { rim: t >= 1 ? col : null, rimA: [0, .4, .6, .8, 1][t], glow: c.glow + 4 });
}
// 왕알: 옆면을 두르는 금빛 띠 + 윗면 가장자리 띠
function kingBand(c) {
  const { g, S } = c, y0 = S.y + S.th * .3, y1 = S.y + S.th * .72;
  g.save(); g.beginPath(); g.ellipse(S.x, y0, S.rx, S.ry, 0, 0, Math.PI); g.ellipse(S.x, y1, S.rx, S.ry, 0, Math.PI, 0, true); g.closePath();
  const gr = g.createLinearGradient(S.x - S.rx, 0, S.x + S.rx, 0);
  [[0, '#5a3a06'], [.18, '#c98d1a'], [.38, '#ffe9a0'], [.5, '#e0a72a'], [.75, '#9a6510'], [1, '#4a2f05']].forEach(([o, c]) => gr.addColorStop(o, c));
  g.fillStyle = gr; g.fill();
  g.strokeStyle = 'rgba(255,240,190,.85)'; g.lineWidth = 2; g.beginPath(); g.ellipse(S.x, y0, S.rx, S.ry, 0, .05, Math.PI - .05); g.stroke();
  g.strokeStyle = 'rgba(40,24,0,.7)'; g.beginPath(); g.ellipse(S.x, y1, S.rx, S.ry, 0, .05, Math.PI - .05); g.stroke();
  // 띠 위 작은 보석 장식
  for (let i = 1; i < 8; i++) { const a = Math.PI * i / 8, x = S.x + Math.cos(a) * S.rx, y = (y0 + y1) / 2 + Math.sin(a) * S.ry; g.fillStyle = i % 2 ? '#fff4c8' : '#c22a2a'; g.beginPath(); g.arc(x, y, 3.5 + Math.sin(a) * 2.5, 0, 7); g.fill(); }
  // 윗면 가장자리 띠
  g.strokeStyle = 'rgba(240,190,70,.9)'; g.lineWidth = 7; g.shadowColor = '#ffd76a'; g.shadowBlur = 8; g.beginPath(); g.ellipse(S.x, S.y, S.rx * .86, S.ry * .84, 0, 0, 7); g.stroke();
  g.shadowBlur = 0; g.strokeStyle = 'rgba(255,245,210,.7)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(S.x, S.y, S.rx * .86, S.ry * .84, 0, Math.PI * 1.05, Math.PI * 1.6); g.stroke();
  g.restore();
}
// 내장 엔진용 알 주위 기본 이펙트
const BASEFX_DRAW = {
  wind(c, col) {
    const { g, S, rnd, t } = c; g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (let i = 0; i < 7 + t * 2; i++) {
      const k = 1.15 + rnd() * .7, a0 = rnd() * Math.PI * 2, len = .9 + rnd() * 1.4, cy = S.y + S.th / 2 + (rnd() - .5) * 60;
      g.strokeStyle = rgba(lighten(col, .5), .25 + rnd() * .35); g.lineWidth = 2 + rnd() * 5; g.shadowColor = col; g.shadowBlur = 10;
      g.beginPath(); g.ellipse(S.x, cy, S.rx * k, S.ry * k * (.8 + rnd() * .5), (rnd() - .5) * .3, a0, a0 + len); g.stroke();
    }
    g.restore();
  },
  sparkle(c, col) {
    const { g, S, rnd, t } = c;
    for (let i = 0; i < 22 + t * 8; i++) { const a = rnd() * Math.PI * 2, d = 1.05 + rnd() * .9, x = S.x + Math.cos(a) * S.rx * d, y = S.y + Math.sin(a) * S.ry * d * 1.6 - 20, r = 10 + rnd() * 26; radial(g, x, y, r * .8, col, .35, 'lighter'); sparkle(g, x, y, r, i % 3 ? '#ffffff' : lighten(col, .4), 1); }
    for (let i = 0; i < 40; i++) { const a = rnd() * Math.PI * 2, d = 1 + rnd() * 1.2; radial(g, S.x + Math.cos(a) * S.rx * d, S.y + Math.sin(a) * S.ry * d * 1.6 - 20, 2 + rnd() * 4, '#ffffff', .9, 'lighter'); }
  },
  aura(c, col) {
    const { g, S, rnd, t } = c; radial(g, S.x, S.y, S.rx * 1.9, col, .3 + t * .06, 'lighter');
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { g.strokeStyle = rgba(lighten(col, .3), .35 - i * .09); g.lineWidth = 10 - i * 2; g.shadowColor = col; g.shadowBlur = 30; g.beginPath(); g.ellipse(S.x, S.y + S.th / 2 - i * 6, S.rx * (1.06 + i * .1), S.ry * (1.25 + i * .14) + S.th / 2, 0, 0, 7); g.stroke(); }
    g.restore();
    for (let i = 0; i < 14 + t * 4; i++) { const x = S.x + (rnd() - .5) * S.rx * 2, y = S.y - rnd() * 160; radial(g, x, y, 6 + rnd() * 14, col, .45, 'lighter'); }
  },
  // 묵직함: 알 무게로 바닥이 갈라지고 꺼짐 (알 뒤/아래)
  heavyBack(c) {
    const { g, S, rnd } = c, cy = S.y + S.th + S.ry * .35;
    // 무게로 꺼진 얕은 구덩이 + 테두리로 밀려 올라온 바닥
    g.save(); g.translate(S.x, cy); g.scale(1, .3);
    g.strokeStyle = 'rgba(255,240,220,.18)'; g.lineWidth = 14; g.beginPath(); g.arc(0, -8, S.rx * 1.45, Math.PI, 0); g.stroke();
    radial(g, 0, 0, S.rx * 1.5, '#000000', .85); g.restore();
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + (rnd() - .5) * .3; let r = S.rx * .85, x = S.x + Math.cos(a) * r, y = cy + Math.sin(a) * r * .3;
      const pts = [[x, y]]; let aa = a;
      for (let k = 0; k < 5; k++) { aa += (rnd() - .5) * .5; r += 22 + rnd() * 30; pts.push([S.x + Math.cos(aa) * r, cy + Math.sin(aa) * r * .3]); }
      // 갈라진 틈: 안쪽은 굵고 바깥으로 갈수록 가늘어짐 + 위쪽 모서리에 밝은 테두리
      for (let k = 1; k < pts.length; k++) { const w = 12 * (1 - k / pts.length) + 2; g.strokeStyle = 'rgba(8,5,3,.85)'; g.lineWidth = w; g.beginPath(); g.moveTo(...pts[k - 1]); g.lineTo(...pts[k]); g.stroke(); g.strokeStyle = 'rgba(255,240,220,.3)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(pts[k - 1][0], pts[k - 1][1] - w / 2); g.lineTo(pts[k][0], pts[k][1] - w / 2); g.stroke(); }
    }
    g.restore();
  },
  // 묵직함: 튀어 오르는 돌 부스러기 + 바닥 먼지 (알 앞)
  heavy(c) {
    const { g, S, rnd, t } = c, cy = S.y + S.th + S.ry * .35;
    for (let i = 0; i < 16; i++) { const a = Math.PI * (rnd() < .5 ? rnd() * .35 : .65 + rnd() * .35), d = S.rx * (1 + rnd() * .5); radial(g, S.x + Math.cos(a) * d, cy - rnd() * 30, 40 + rnd() * 50, '#b8a894', .12, 'source-over'); }
    for (let i = 0; i < 12 + t * 3; i++) {
      const sd = rnd() < .5 ? -1 : 1, x = S.x + sd * (S.rx * (.8 + rnd() * .7)), y = cy - 10 - rnd() * 120, r = 3 + rnd() * 9;
      g.save(); g.translate(x, y); g.rotate(rnd() * 6); g.fillStyle = rnd() < .5 ? '#3a342e' : '#6b6157';
      g.beginPath(); g.moveTo(-r, -r * .4); g.lineTo(r * .2, -r); g.lineTo(r, r * .1); g.lineTo(-r * .3, r * .8); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,245,230,.35)'; g.lineWidth = 1; g.stroke(); g.restore();
    }
    // 단단한 표면: 날카로운 하이라이트
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; g.shadowColor = '#ffffff'; g.shadowBlur = 6;
    g.beginPath(); g.ellipse(S.x, S.y, S.rx * .96, S.ry * .94, 0, Math.PI * 1.1, Math.PI * 1.55); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.ellipse(S.x, S.y + S.th, S.rx * .99, S.ry, 0, Math.PI * .15, Math.PI * .5); g.stroke(); g.restore();
  },
  spark(c, col) {
    const { g, S, rnd, t } = c;
    for (let i = 0; i < 6 + t * 2; i++) {
      const a = rnd() * Math.PI * 2, da = (rnd() < .5 ? 1 : -1) * (.25 + rnd() * .35); let x = S.x + Math.cos(a) * S.rx * .98, y = S.y + S.th / 2 + Math.sin(a) * S.ry;
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round';
      g.strokeStyle = rgba('#ffffff', .9); g.shadowColor = lighten(col, .3); g.shadowBlur = 16; g.lineWidth = 1.5 + rnd() * 2;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 1; k <= 6; k++) { const b = a + da * k / 6, d = 1 + .18 * Math.sin(k / 6 * Math.PI) + (rnd() - .5) * .12; x = S.x + Math.cos(b) * S.rx * d; y = S.y + S.th / 2 + Math.sin(b) * S.ry * d * 1.2 - k * 3; g.lineTo(x, y); }
      g.stroke(); g.restore();
      for (let k = 0; k < 3; k++) radial(g, x + (rnd() - .5) * 30, y + (rnd() - .5) * 30, 3 + rnd() * 5, '#ffffff', .8, 'lighter');
    }
  },
};
function postFx(c) {
  const { g, t, th, rnd, S } = c;
  if (t >= 3) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < (t === 4 ? 14 : 8); i++) {
      const x = 80 + rnd() * 640, w = 30 + rnd() * 70, gr = g.createLinearGradient(0, 0, 0, H * .8);
      gr.addColorStop(0, rgba(th.accent, t === 4 ? .18 : .12)); gr.addColorStop(1, rgba(th.accent, 0));
      g.fillStyle = gr; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w * 2.6 + 120, H * .8); g.lineTo(x + 120, H * .8); g.closePath(); g.fill();
    }
    g.restore();
  }
  if (t >= 2) {
    const cp = mk(); cp.getContext('2d').drawImage(g.canvas, 0, 0);
    g.save(); g.filter = 'blur(16px)'; g.globalCompositeOperation = 'screen'; g.globalAlpha = [0, 0, .22, .28, .32][t] * (th.bright ? .5 : 1); g.drawImage(cp, 0, 0); g.restore();
  }
  if (t === 4 && !c.noFx) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const cg = g.createConicGradient(0, S.x, S.y + S.th / 2); [0, 60, 120, 180, 240, 300, 360].forEach((hh, i) => cg.addColorStop(i / 6, hsl2hex(hh % 360, 100, 65)));
    g.strokeStyle = cg; g.globalAlpha = .45; g.lineWidth = 6; g.shadowColor = '#ffffff'; g.shadowBlur = 14;
    g.beginPath(); g.ellipse(S.x, S.y + S.th / 2, S.rx * 1.55, S.ry * 1.7, 0, 0, 7); g.stroke();
    g.restore();
    for (let i = 0; i < 26; i++) sparkle(g, rnd() * W, rnd() * H * .85, 5 + rnd() * 16, hsl2hex(Math.floor(rnd() * 360), 100, 72), .9);
    sparkle(g, S.x - S.rx * .35, S.y - S.ry * .45, 60, th.accent, 1);
  }
  const vg = g.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .72);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${[.3, .4, .45, .5, .5][t]})`);
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}
function renderArt(req, seed) {
  const t = Math.max(0, GRADES.indexOf(req.grade)), rnd = mulberry32(seed);
  const ths = pickThemes(req.concept), th = ths[0], th2 = ths[1];
  const stone = req.stone === 'random' || !req.stone ? (rnd() < .5 ? 'black' : 'white') : req.stone;
  const c = mk(), g = c.getContext('2d');
  const skills = (req.skills || []).map(id => SKILLS.find(s => s.id === id)).filter(Boolean);
  const ctx = {
    g, t, rnd, th, th2, stone, enemy: stone === 'black' ? 'white' : 'black',
    Q: [.45, .7, 1, 1.35, 1.8][t], glow: [0, 8, 14, 22, 32][t],
    S: req.king ? { x: 400, y: 600, rx: 205, ry: 120, th: 66 } : { x: 400, y: 610, rx: 165, ry: 98, th: 42 },
  };
  const colFor = s => mix(s.color, th.accent, .2);
  const mainCol = skills[0] ? colFor(skills[0]) : th.accent;
  drawSky(ctx); drawEnv(ctx, 'back'); drawFloor(ctx);
  const cloaked = skills.some(s => s.id === 'cloak'); // 은신: 알 뒤 후광을 줄여야 비쳐 보임
  const fxs = fxList(req), noFx = fxs[0] === 'none' && !skills.length; ctx.noFx = noFx;
  if (t >= 3 && !noFx) { radial(g, 400, 620, 360, mainCol, (th.bright ? .22 : .42) * (cloaked ? .3 : 1), 'lighter'); if (isNoble(req.concept)) radial(g, 400, 560, 300, '#ffd76a', th.bright ? .15 : .3, 'lighter'); }
  for (const s of skills) SKFX[s.id].back?.(ctx, colFor(s));
  if (fxs.includes('aura') && !cloaked) BASEFX_DRAW.aura(ctx, mainCol);
  if (fxs.includes('heavy') && !cloaked) BASEFX_DRAW.heavyBack(ctx, mainCol);
  drawMainStone(ctx, skills.map(s => s.id), mainCol);
  if (req.king && !cloaked) kingBand(ctx);
  if (!cloaked) for (const f of fxs) if (f !== 'none' && f !== 'aura') BASEFX_DRAW[f]?.(ctx, mainCol);
  if (req.engrave && skills.length && !cloaked) engraveSkills(ctx, skills, colFor);
  for (const s of skills) SKFX[s.id].front?.(ctx, colFor(s));
  drawEnv(ctx, 'front');
  drawParticles(ctx);
  if (isNoble(req.concept)) for (let i = 0; i < 6 + t * 3; i++) sparkle(g, rnd() * W, rnd() * H, 6 + rnd() * 12, '#ffd76a', .9);
  postFx(ctx);
  if (t === 0) { const cp = mk(); cp.getContext('2d').drawImage(c, 0, 0); g.clearRect(0, 0, W, H); g.filter = 'saturate(0.75) contrast(0.95)'; g.drawImage(cp, 0, 0); g.filter = 'none'; }
  return c;
}

/* =================================================================
   4) AI 이미지용 프롬프트
   ================================================================= */
// 등급이 높을수록 이펙트·배경·조명이 화려해짐 (C도 캐릭터 카드 느낌은 유지)
// 알 주위 기본 이펙트 (스킬과 별개, 여러 개 조합). 빈 목록 = 자동(등급 문구대로), ['none'] = 없음
// 예전 저장값(문자열 하나)도 목록으로 바꿔 읽음
function fxList(o) { const v = o?.fx; const a = Array.isArray(v) ? v : v && v !== 'auto' ? [v] : []; return a.includes('none') ? ['none'] : a.filter(x => x !== 'auto'); }
const BASE_FX = [
  { id: 'auto', label: '✨ 자동' },
  { id: 'none', label: '🚫 없음', ai: 'BASE EFFECT: NONE — absolutely NO effects around the stone: no wind swirls, no energy rings, no orbiting light trails, no aura, no sparkles, no particles circling it. The stone simply sits in the scene, lit only by natural rim light.' },
  { id: 'wind', label: '🌪 바람', ai: 'BASE EFFECT around the stone: WIND — soft curved streaks of wind and air currents sweeping around the stone, flowing ribbons of air carrying a little glowing dust.', only: 'No lightning, no glowing ring.' },
  { id: 'sparkle', label: '💫 반짝반짝', ai: 'BASE EFFECT around the stone: SPARKLES — many tiny twinkling star-shaped glints and glitter dots floating around the stone, like magical shimmering dust.', only: 'No swirls, no rings.' },
  { id: 'aura', label: '🔆 오라', ai: 'BASE EFFECT around the stone: AURA — a soft glowing aura of light emanating evenly from the stone, a gentle halo and rising flame-like energy outline hugging its silhouette.', only: 'No swirls, no rings, no lightning.' },
  { id: 'heavy', label: '🪨 묵직함', ai: 'BASE EFFECT: HEAVY AND SOLID — make the stone look extremely dense, hard and HEAVY, like it weighs tons: the ground beneath it is CRACKED and slightly sunken into a shallow crater from its weight, with radiating fractures, small rock debris and chips flying up, a low ring of dust kicked up around its base by the impact, a deep heavy contact shadow, and a hard polished surface with crisp metallic-like specular highlights and sharp thick edges. The feeling is weight and hardness.', only: 'No swirls, no magic rings, no sparkles.' },
  { id: 'spark', label: '⚡ 스파크', ai: 'BASE EFFECT around the stone: SPARKS — crackling electric sparks and small branching lightning arcs jumping across and around the edge of the stone, with bright spark particles.', only: 'No swirls, no rings.' },
];
// 기본 이펙트를 직접 고르면(스킬 없음) 등급 문구에서 이펙트 부분을 뺀 배경 위주 문구를 씀
const TIER_PROMPT_BG = [
  'COMMON grade: clean and simple character card, one soft rim light, a calm atmospheric background in the concept colours',
  'UNCOMMON grade: a richer atmospheric background, nice lighting',
  'RARE grade: dynamic lighting, a vivid dramatic background',
  'EPIC hero grade: intense cinematic lighting, an epic background',
  'LEGENDARY grade: the most spectacular version — breathtaking epic background, iridescent highlights, masterpiece splash-art quality',
];
const TIER_PROMPT = [
  'COMMON grade: clean and simple character card, one soft rim light, a calm atmospheric background in the concept colours, only a light hint of the skill effect',
  'UNCOMMON grade: a clear skill aura around the stone, a few particles, a richer atmospheric background',
  'RARE grade: strong glowing skill effects swirling around the stone, dynamic lighting, plenty of particles, a vivid dramatic background',
  'EPIC hero grade: explosive dramatic skill effects filling the scene, intense cinematic lighting and light rays, energy swirling around the stone, epic background',
  'LEGENDARY grade: the most spectacular version — overwhelming radiant aura, god rays, iridescent highlights, vortex of particles and magic, breathtaking epic background, masterpiece splash-art quality',
];
const fxOf = req => fxList(req).map(id => BASE_FX.find(f => f.id === id)).filter(f => f?.ai);
function buildPrompt(req) {
  const t = Math.max(0, GRADES.indexOf(req.grade));
  const sk = (req.skills || []).map(id => SKILLS.find(s => s.id === id)).filter(Boolean);
  const stone = req.stone === 'white' ? 'glossy white' : req.stone === 'black' ? 'glossy black' : 'glossy black or white';
  return [
    'Character splash art for a collectible game card ("Super Alkkagi", a game of flicking go stones).',
    `THE HERO is a single large ${stone} go stone (round, slightly domed, polished like a gem), treated as a powerful living character — like the champion portrait on a hero card in a mobile RPG.`,
    req.king ? 'KING STONE: this is NOT an ordinary go stone but the royal KING piece — a BIGGER, THICK CYLINDRICAL puck (like a tall checkers/draughts king piece or a thick hockey puck): a wide round disc with the SAME thickness all the way across, STRAIGHT VERTICAL side walls, a flat bottom, and a broad gently-domed top whose only rounding is a smooth bevel along the top edge. NOT a jar, NOT a pot, NOT a vase, NOT an urn, no bulging belly, no neck, no lid, no taper — the silhouette is a short wide cylinder, wider than it is tall (about 3 times wider than its height). A thick ornate GOLD BAND (engraved gold metal with small inset gems) wraps around the straight side wall like a crown ring, and a thinner gold ring circles the top face near its edge. It must look regal, dense and heavy.' : '',
    'Composition: the stone is BIG and dominant, centered, filling about 60% of the image width, dramatic low hero angle, close-up, strong rim light, the stone pops out from the background.',
    sk.length ? `Its power${sk.length > 1 ? 's (fused into one combined effect) radiate' : ' radiates'} around it: ${sk.map(s => s.en).join('; ')}.` : '',
    req.concept ? `Theme, world and colour mood of the background and effects (Korean): "${req.concept}".` : '',
    'Background: an atmospheric, painterly environment that matches the theme, with depth and bokeh — not a game board diagram, not a top-down view, no tutorial or explanation style.',
    req.concept ? pickThemes(req.concept).slice(0, 2).map(th => th.ai).filter(Boolean).join(' ') : '',
    req.engrave && sk.length ? `STONE ENGRAVING: the top face of the go stone is deeply ENGRAVED with a glowing emblem that clearly depicts its skill — ${sk.map(s => `${s.ko}/${s.id}: ${s.eng}`).join('; combined with ')} — framed by a simple thin ring made only of plain lines and dots. The engraving must obviously represent this skill. NO runes, NO letters, NO numbers, NO glyphs or symbols that look like writing anywhere on the stone.` : '',
    fxOf(req).length > 1 ? `COMBINE ALL OF THESE BASE EFFECTS around the stone at the same time, blended into one cohesive look (show every one of them clearly): ${fxOf(req).map((f, i) => `(${i + 1}) ${f.ai.replace(/^BASE EFFECT( around the stone)?: /, '')}`).join(' ')}` : fxOf(req)[0] ? `${fxOf(req)[0].ai} ${fxOf(req)[0].only || ''}` : '',
    `${(fxOf(req).length && !sk.length ? TIER_PROMPT_BG : TIER_PROMPT)[t]}.`,
    `Style: high-end fantasy card game splash art, painterly digital illustration, rich colours, ${fxList(req)[0] === 'none' && !sk.length ? '' : 'glowing VFX, '}high contrast.`,
    'Vertical 2:3, full-bleed edge to edge (no white margin, no border, no frame). Keep the very top-left corner, top-center and bottom-center slightly calmer because a card frame will be overlaid.',
    'Absolutely no text, letters, numbers or logos. No hands, no people.',
  ].filter(Boolean).join(' ');
}

/* =================================================================
   5) 카드 조합
   ================================================================= */
const _frameCache = new Map(), _iconCache = new Map();
// AI로 만든 프레임/아이콘 그림: id -> [{frame, mask}] (프레임) 또는 {role: canvas} (아이콘)
const aiAssets = new Map();
function getFrameCanvas(d, t) {
  if (d.kind === 'ai') { const a = aiAssets.get(d.id)?.[t]; if (a?.frame) return a.frame; }
  if (d.shape == null) d = { ...randomFrameDesign(d.seed || 1), ...d }; // 그림이 없는 AI 그룹 → 기본 모양으로 대신 그림
  const k = frameKey(d, t); if (!_frameCache.has(k)) { if (_frameCache.size > 60) _frameCache.clear(); _frameCache.set(k, renderFrame(d, t)); } return _frameCache.get(k);
}
function getIconCanvas(set, role, size = 256) {
  if (set.kind === 'ai') { const a = aiAssets.get(set.id)?.[role]; if (a) return a; }
  const k = [set.style, set.rim, JSON.stringify(set.variant), role, size].join('|'); if (!_iconCache.has(k)) _iconCache.set(k, renderRoleIcon(set, role, size)); return _iconCache.get(k);
}
function composeCard(o) {
  const c = mk(), g = c.getContext('2d'), G = frameGeom(o.design, o.t), P = TIER_PAL[o.t];
  if (o.art) {
    const z = o.zoom || 1, w = W * z, h = H * z, mask = o.design.kind === 'ai' ? aiAssets.get(o.design.id)?.[o.t]?.mask : null;
    if (mask) { // AI 프레임: 인식한 창 모양대로 그림을 넣음
      const a = mk(), ag = a.getContext('2d'); ag.drawImage(o.art, (W - w) / 2 + (o.ox || 0), (H - h) / 2 + (o.oy || 0), w, h);
      ag.globalCompositeOperation = 'destination-in'; ag.drawImage(mask, 0, 0); g.drawImage(a, 0, 0);
    } else {
      g.save(); g.beginPath(); outerPath(g, G); g.clip();
      g.drawImage(o.art, (W - w) / 2 + (o.ox || 0), (H - h) / 2 + (o.oy || 0), w, h); g.restore();
    }
  }
  g.drawImage(getFrameCanvas(o.design, o.t), 0, 0);
  // 레이어 위치: layout[레이어] = { dx, dy, s } (기본 위치 기준 이동량·배율). boxes 에 화면 상자를 돌려줌
  const L = o.layout || {}, lay = k => ({ dx: 0, dy: 0, s: 1, ...(L[k] || {}) }), boxes = o.boxes || {};
  if (o.iconSet && o.role) {
    const l = lay('icon'), s = (G.socket.r * 2 + 6) * l.s, cx = G.socket.x + l.dx, cy = G.socket.y + l.dy;
    g.drawImage(getIconCanvas(o.iconSet, o.role, 256), cx - s / 2, cy - s / 2, s, s);
    boxes.icon = { x: cx - s / 2, y: cy - s / 2, w: s, h: s };
  }
  const sk = (o.skills || []).map(id => SKILLS.find(s => s.id === id)).filter(Boolean);
  if (o.showSkills && sk.length) {
    const l = lay('skills'), cx = W / 2 + l.dx, cy = G.plate.y - G.plate.h / 2 - 32 + l.dy;
    g.save(); g.translate(cx, cy); g.scale(l.s, l.s);
    g.font = '700 22px "Noto Sans KR", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const ws = sk.map(s => g.measureText(s.ko).width + 36), total = ws.reduce((a, b) => a + b, 0) + (sk.length - 1) * 10;
    let x = -total / 2;
    sk.forEach((s, i) => {
      g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 8; g.beginPath(); g.roundRect(x, -18, ws[i], 36, 18); g.fillStyle = rgba(darken(s.color, .55), .92); g.fill();
      g.shadowColor = 'transparent'; g.lineWidth = 2; g.strokeStyle = s.color; g.stroke(); g.fillStyle = lighten(s.color, .5); g.fillText(s.ko, x + ws[i] / 2, 1); x += ws[i] + 10;
    });
    g.restore();
    boxes.skills = { x: cx - total / 2 * l.s, y: cy - 18 * l.s, w: total * l.s, h: 36 * l.s };
  }
  if (o.showName && o.name) {
    const l = lay('name'), f = { family: '"Black Han Sans"', size: 36, color: '#ffffff', stroke: '#000000', strokeW: 6, ...(o.font || {}) };
    const cx = W / 2 + l.dx, cy = G.plate.y + 2 + l.dy;
    g.save(); g.font = `400 ${f.size}px ${f.family}, "Noto Sans KR", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    const m = g.measureText(o.name), tw = m.width, th = (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) || f.size;
    if (f.strokeW > 0) { g.lineWidth = f.strokeW; g.strokeStyle = f.stroke; g.strokeText(o.name, cx, cy); }
    g.fillStyle = f.color; g.fillText(o.name, cx, cy); g.restore();
    const pad = 6 + f.strokeW / 2;
    boxes.name = { x: cx - tw / 2 - pad, y: cy - th / 2 - pad, w: tw + pad * 2, h: th + pad * 2 };
  }
  return c;
}
