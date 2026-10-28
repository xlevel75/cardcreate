/* ===================================================================
   슈퍼알까기 카드 스튜디오 — AI 이미지 호출 / 크로마키 / AI 프레임·아이콘
   =================================================================== */
const AI = { proxy: false };
const KEY_GREEN = '#00ff00';

async function detectProxy() {
  if (!location.protocol.startsWith('http')) return (AI.proxy = false);
  try { const r = await fetch('/proxy/ping', { cache: 'no-store' }); AI.proxy = r.ok && (await r.json()).ok === true; } catch { AI.proxy = false; }
  return AI.proxy;
}
function apiUrl(kind, path) {
  const base = { openai: 'https://api.openai.com', gemini: 'https://generativelanguage.googleapis.com', vertex: 'https://aiplatform.googleapis.com' }[kind];
  return AI.proxy ? `/proxy/${kind}/${path}` : `${base}/${path}`;
}
const canvasToBlob = (c, type = 'image/png') => new Promise(r => c.toBlob(r, type));
function loadImage(src) {
  return new Promise((res, rej) => { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => res(img); img.onerror = () => rej(new Error('이미지를 불러오지 못했습니다')); img.src = src; });
}
function coverTo(img, w, h) {
  const c = mk(w, h), g = c.getContext('2d'), s = Math.max(w / img.width, h / img.height), iw = img.width * s, ih = img.height * s;
  g.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih); return c;
}

function explainError(engine, m) {
  const tips = [];
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) tips.push(AI.proxy ? '네트워크 연결이 끊겼습니다. 잠시 후 다시 시도하세요.' : '브라우저가 API 요청을 막았습니다 → start.bat(로컬 서버)로 실행한 주소 http://localhost:8765 에서 다시 시도하세요.');
  if (/has not been used|is disabled|SERVICE_DISABLED/i.test(m)) tips.push('Google Cloud 콘솔에서 이 프로젝트의 Vertex AI API를 “사용 설정”하세요 (적용까지 몇 분 걸릴 수 있음).');
  if (/are blocked|API_KEY_SERVICE_BLOCKED/i.test(m)) tips.push('API 키에 사용 제한이 걸려 있습니다 → 콘솔 › API 및 서비스 › 사용자 인증 정보 › 해당 키 › “API 제한사항”에 Vertex AI API를 추가하세요. 또는 aistudio.google.com 에서 발급하는 AIza… 키를 쓰면 더 간단합니다.');
  if (/organization must be verified|must be verified|verify your organization/i.test(m)) tips.push('gpt-image 모델은 OpenAI 조직 인증이 필요합니다 → platform.openai.com › Settings › Organization › Verify.');
  if (/Incorrect API key|invalid_api_key|API key not valid|API_KEY_INVALID/i.test(m)) tips.push('API 키가 올바르지 않습니다. 앞뒤 공백 없이 다시 붙여넣어 주세요.');
  if (/billing|quota|insufficient_quota|RESOURCE_EXHAUSTED|rate limit/i.test(m)) tips.push('사용 한도 또는 결제 설정을 확인하세요.');
  if (/safety|blocked by|moderation/i.test(m)) tips.push('안전 필터에 걸렸습니다. 컨셉 문구를 바꿔 보세요.');
  return m + (tips.length ? '\n\n💡 ' + tips.join('\n💡 ') : '');
}

/* 엔진 공통 호출: refs(캔버스)를 넣으면 참조 이미지 기반 편집으로 요청 */
async function aiImage({ engine, prompt, refs = [], aspect = '2:3' }) {
  const S = state.settings;
  try {
    if (engine === 'openai') {
      const model = S.openaiModel || 'gpt-image-1', dalle = model.startsWith('dall-e');
      const size = aspect === '1:1' ? '1024x1024' : dalle ? '1024x1792' : '1024x1536';
      let r;
      if (refs.length && !dalle) {
        const fd = new FormData();
        fd.append('model', model); fd.append('prompt', prompt); fd.append('size', size); fd.append('n', '1'); fd.append('quality', S.openaiQuality || 'medium');
        for (const [i, c] of refs.entries()) fd.append('image[]', await canvasToBlob(c), `ref${i}.png`);
        r = await fetch(apiUrl('openai', 'v1/images/edits'), { method: 'POST', headers: { Authorization: 'Bearer ' + S.openaiKey }, body: fd });
      } else {
        const body = { model, prompt, n: 1, size };
        if (dalle) body.response_format = 'b64_json'; else body.quality = S.openaiQuality || 'medium';
        r = await fetch(apiUrl('openai', 'v1/images/generations'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + S.openaiKey }, body: JSON.stringify(body) });
      }
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error?.message || 'HTTP ' + r.status);
      const d = j.data?.[0]; if (!d) throw new Error('응답에 이미지가 없습니다');
      return loadImage(d.b64_json ? 'data:image/png;base64,' + d.b64_json : d.url);
    }
    const model = encodeURIComponent(S.geminiModel || 'gemini-2.5-flash-image');
    const vertex = S.geminiKey.startsWith('AQ.');
    const url = vertex ? apiUrl('vertex', `v1/publishers/google/models/${model}:generateContent`) : apiUrl('gemini', `v1beta/models/${model}:generateContent`);
    const parts = refs.map(c => ({ inlineData: { mimeType: 'image/png', data: c.toDataURL('image/png').split(',')[1] } }));
    parts.push({ text: prompt });
    const r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': S.geminiKey },
      body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: aspect } } }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((Array.isArray(j) ? j[0] : j).error?.message || 'HTTP ' + r.status);
    const cand = j.candidates?.[0], part = (cand?.content?.parts || []).find(p => p.inlineData || p.inline_data);
    if (!part) throw new Error('응답에 이미지가 없습니다' + (cand?.finishReason ? ` (사유: ${cand.finishReason})` : '') + (j.promptFeedback?.blockReason ? ` (차단: ${j.promptFeedback.blockReason})` : ''));
    const d = part.inlineData || part.inline_data;
    return loadImage(`data:${d.mimeType || d.mime_type || 'image/png'};base64,${d.data}`);
  } catch (e) { throw new Error(explainError(engine, e.message || String(e))); }
}

/* -------- 크로마키: 초록 배경을 투명으로 ------------------------------------
   outerSeeds 에서 번지는 영역 = 카드 바깥(투명)
   windowSeeds 에서 번지는 영역 = 카드 창(투명 + 그림이 들어갈 마스크) */
function chromaKey(src, { windowSeeds = [], outerSeeds = [], tol = 105, dilate = 7 } = {}) {
  const w = src.width, h = src.height, c = mk(w, h), g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  const im = g.getImageData(0, 0, w, h), d = im.data, region = new Uint8Array(w * h);
  const greenish = i => { const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2]; return gg > 110 && gg - Math.max(r, b) > 55; };
  function keyColor(seeds) {
    let n = 0, R = 0, G = 0, B = 0;
    for (const [x, y] of seeds) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const xx = Math.min(w - 1, Math.max(0, x + dx)), yy = Math.min(h - 1, Math.max(0, y + dy)), i = yy * w + xx;
      if (greenish(i)) { R += d[i * 4]; G += d[i * 4 + 1]; B += d[i * 4 + 2]; n++; }
    }
    return n ? [R / n, G / n, B / n] : null;
  }
  const dist = (i, k) => Math.hypot(d[i * 4] - k[0], d[i * 4 + 1] - k[1], d[i * 4 + 2] - k[2]);
  function flood(seeds, label) {
    const k = keyColor(seeds); if (!k) return 0;
    const st = []; let count = 0;
    for (const [x, y] of seeds) { const i = Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x)); if (!region[i] && dist(i, k) < tol) { region[i] = label; st.push(i); } }
    while (st.length) {
      const p = st.pop(); count++;
      const x = p % w, y = (p / w) | 0;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1])
        if (q >= 0 && !region[q] && dist(q, k) < tol) { region[q] = label; st.push(q); }
    }
    return count;
  }
  const outerN = flood(outerSeeds, 1), winN = flood(windowSeeds, 2);
  for (let i = 0; i < w * h; i++) {
    if (region[i]) { d[i * 4 + 3] = 0; continue; }
    const x = i % w, y = (i / w) | 0; let edge = false;
    for (let r = 1; r <= 2 && !edge; r++) edge = (x >= r && region[i - r]) || (x < w - r && region[i + r]) || (y >= r && region[i - r * w]) || (y < h - r && region[i + r * w]);
    if (edge) { // 가장자리 초록 번짐 제거 + 부드럽게
      const r = d[i * 4], b = d[i * 4 + 2], mx = Math.max(r, b);
      if (d[i * 4 + 1] > mx) { const spill = d[i * 4 + 1] - mx; d[i * 4 + 1] = mx; if (edge) d[i * 4 + 3] = Math.max(0, 255 - spill * 2.2); }
    }
  }
  g.putImageData(im, 0, 0);
  let mask = null;
  if (winN > w * h * .05) {
    const m = mk(w, h), mg = m.getContext('2d'), mi = mg.createImageData(w, h);
    for (let i = 0; i < w * h; i++) if (region[i] === 2) { mi.data[i * 4] = mi.data[i * 4 + 1] = mi.data[i * 4 + 2] = 255; mi.data[i * 4 + 3] = 255; }
    mg.putImageData(mi, 0, 0);
    mask = mk(w, h); const g2 = mask.getContext('2d');
    for (let a = 0; a < 16; a++) g2.drawImage(m, Math.cos(a / 16 * Math.PI * 2) * dilate, Math.sin(a / 16 * Math.PI * 2) * dilate);
    g2.drawImage(m, 0, 0);
  }
  return { image: c, mask, outerN, winN };
}
function autoFit(c, size, fill = .94) {
  const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const out = mk(size, size); if (x1 <= x0) return out;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, s = size * fill / Math.max(bw, bh);
  out.getContext('2d').drawImage(c, x0, y0, bw, bh, (size - bw * s) / 2, (size - bh * s) / 2, bw * s, bh * s);
  return out;
}

/* -------- AI 프레임 ------------------------------------------------------ */
const FRAME_TIER_PROMPT = [
  'COMMON grade: plain, simple grey iron frame, minimal ornament, no gems, no glow, no effects',
  'UNCOMMON grade: green and bronze frame, a few small gems, light engraved detail, very subtle glow',
  'RARE grade: blue and silver frame, gems, engraved patterns, small wings on the emblem, soft glow',
  'EPIC hero grade: purple and gold ornate frame, filigree, glowing gems, wings on the emblem and the name banner, sparkles',
  'LEGENDARY grade: spectacular gold and ruby frame, crown and large wings on the emblem, radiant light rays, flames and sparkles bursting from the border, iridescent rainbow sheen',
];
function frameGuide(design, t) {
  const c = mk(); const g = c.getContext('2d'); g.fillStyle = KEY_GREEN; g.fillRect(0, 0, W, H);
  g.drawImage(renderFrame(design, t, { fx: false }), 0, 0); return c;
}
function framePrompt(t, style, withPrev) {
  return [
    `Redesign the trading-card FRAME shown in the first image for the board game "Super Alkkagi" (flicking go stones).`,
    'Keep EXACTLY the same layout, proportions and positions: the border around the card, the round socket at the top-left corner (its inside stays dark and empty), the grade emblem at the top-center, and the name banner at the bottom-center (leave the banner empty).',
    `The emblem shows only the letters "${GRADES[t]}". No other text anywhere.`,
    `Visual style: ${style || 'high fantasy game UI'}.`,
    `${FRAME_TIER_PROMPT[t]}.`,
    withPrev ? 'The second image is the lower-grade frame of the SAME set: keep the same design language, materials and silhouette, but make this grade clearly more ornate and luxurious.' : '',
    'CRITICAL: the large central window and the whole area outside the frame must remain perfectly flat pure chroma green (#00FF00) — no shadows, gradients, textures, glow or objects on the green. Flat front view, symmetric, vertical 2:3.',
  ].filter(Boolean).join(' ');
}
const WIN_SEEDS = [[400, 600], [400, 420], [400, 800], [280, 600], [520, 600], [400, 950]];
const OUT_SEEDS = [[1, 1], [798, 1], [1, 1198], [798, 1198], [400, 1], [400, 1198], [1, 600], [798, 600]];
async function aiFrameOne(design, t, style, engine, prevRaw) {
  const guide = frameGuide(design, t);
  const img = await aiImage({ engine, prompt: framePrompt(t, style, !!prevRaw), refs: prevRaw ? [guide, prevRaw] : [guide], aspect: '2:3' });
  const raw = coverTo(img, W, H);
  const k = chromaKey(raw, { windowSeeds: WIN_SEEDS, outerSeeds: OUT_SEEDS });
  let mask = k.mask;
  if (!mask) { // 창을 못 찾으면 레이아웃 창 모양으로 대신 비움
    const G = frameGeom(design, t); cutInner(k.image.getContext('2d'), G);
    mask = mk(); const mg = mask.getContext('2d'); mg.fillStyle = '#fff'; mg.beginPath(); outerPath(mg, G); mg.fill();
  }
  return { frame: k.image, mask, raw, autoWindow: !!k.mask };
}

/* -------- AI 역할 아이콘 -------------------------------------------------- */
const ROLE_EN = {
  atk: 'ATTACK — symbol: a sword', def: 'DEFENSE — symbol: a shield', dis: 'DISRUPTION / trickery — symbol: a hypnotic spiral or eye',
  sup: 'SUPPORT / healing — symbol: a plus sign or heart', king: 'KING — symbol: a royal crown',
};
function iconGuide(set, role) {
  const c = mk(1024, 1024), g = c.getContext('2d'); g.fillStyle = KEY_GREEN; g.fillRect(0, 0, 1024, 1024);
  g.drawImage(renderRoleIcon(set, role, 860), 82, 82); return c;
}
function iconPrompt(role, style, withPrev) {
  const R = ROLES.find(r => r.id === role);
  return [
    `Redesign the game UI badge icon shown in the first image for the role ${ROLE_EN[role]} in the card game "Super Alkkagi".`,
    `Keep the same composition: one centered badge with the symbol, readable at small size. Main color: ${R.color}.`,
    `Visual style: ${style || 'polished fantasy game icon'}.`,
    withPrev ? 'The second image is another icon from the SAME icon set: match its badge shape, rim material, lighting and rendering style exactly; only the symbol and main color change.' : 'All five role icons of this set will share this badge shape and rim, so make the badge design clean and reusable.',
    'No text or letters. The background must be perfectly flat pure chroma green (#00FF00), with no shadow, glow or objects on it. Square 1:1.',
  ].join(' ');
}
async function aiIconOne(guideSet, role, style, engine, prevRaw) {
  const img = await aiImage({ engine, prompt: iconPrompt(role, style, !!prevRaw), refs: prevRaw ? [iconGuide(guideSet, role), prevRaw] : [iconGuide(guideSet, role)], aspect: '1:1' });
  const raw = coverTo(img, 512, 512);
  const S = [[1, 1], [510, 1], [1, 510], [510, 510], [256, 1], [256, 510], [1, 256], [510, 256]];
  const k = chromaKey(raw, { outerSeeds: S });
  return { icon: autoFit(k.image, 512), raw };
}

/* -------- 알 텍스처 (위에서 본 동그란 알 윗면 + 가운데 엠블럼) ------------ */
const TEX_TIER_PROMPT = [
  'COMMON grade: a simple clean emblem, flat colours, plain thin rim, no glow',
  'UNCOMMON grade: a clear emblem with a soft glow and a simple metallic rim',
  'RARE grade: a detailed glowing emblem, a ring of engraved runes around it, a polished silver rim',
  'EPIC grade: an intensely glowing emblem with energy swirling inside the disc, an ornate gold filigree rim, sparkles',
  'LEGENDARY grade: a spectacular radiant emblem bursting with light, iridescent rainbow highlights, an extremely ornate jewelled rim, light rays and particles inside the disc, masterpiece',
];
function texturePrompt(req) {
  const t = Math.max(0, GRADES.indexOf(req.grade));
  const sk = (req.skills || []).map(id => SKILLS.find(s => s.id === id)).filter(Boolean);
  const stone = req.stone === 'white' ? 'glossy white' : req.stone === 'black' ? 'glossy black' : 'glossy';
  return [
    'Create the top-face TEXTURE of the round go-stone game piece from the attached card artwork, for use in a 3D game.',
    'Seen perfectly straight from above (orthographic top-down), one perfect circle, centered, filling the square canvas almost edge to edge.',
    `Material: ${stone} polished stone matching the stone in the reference image.`,
    `In the center: a round emblem icon that represents this card${sk.length ? ` — its power: ${sk.map(s => s.en.split(' — ')[0]).join(' + ')}` : ''}${req.concept ? `, theme (Korean): "${req.concept}"` : ''}. Use the same colours, effects and art style as the reference image.`,
    `${TEX_TIER_PROMPT[t]}.`,
    'Everything outside the circle must be flat pure chroma green (#00FF00). No perspective, no side view, no shadow outside the disc, no text, no letters. Square 1:1.',
  ].join(' ');
}
function circleCut(src, size = 512) {
  const fit = autoFit(src, size, .98), c = mk(size, size), g = c.getContext('2d');
  g.drawImage(fit, 0, 0); g.globalCompositeOperation = 'destination-in';
  g.beginPath(); g.arc(size / 2, size / 2, size * .49, 0, Math.PI * 2); g.fill(); return c;
}
// 내장 엔진: 카드 그림의 가운데를 엠블럼으로 오려 알 윗면을 만듦
function proceduralTexture(req, art) {
  const S = 512, c = mk(S, S), g = c.getContext('2d'), t = Math.max(0, GRADES.indexOf(req.grade)), cx = S / 2, R = S * .49;
  const sk = (req.skills || []).map(id => SKILLS.find(s => s.id === id)).filter(Boolean), col = sk[0]?.color || '#ffd88a';
  const black = req.stone !== 'white';
  const bg = g.createRadialGradient(cx - 80, cx - 90, 10, cx, cx, R);
  (black ? ['#5f6670', '#1f2228', '#050607'] : ['#ffffff', '#eceff2', '#aab0b9']).forEach((s, i) => bg.addColorStop(i / 2, s));
  g.beginPath(); g.arc(cx, cx, R, 0, 7); g.fillStyle = bg; g.fill();
  const er = R * [.5, .54, .56, .58, .6][t];
  g.save(); g.beginPath(); g.arc(cx, cx, er, 0, 7); g.clip();
  const crop = 520 - t * 30; g.drawImage(art, 400 - crop / 2, 610 - crop / 2, crop, crop, cx - er, cx - er, er * 2, er * 2);
  radial(g, cx, cx, er, col, [.1, .2, .3, .4, .5][t], 'lighter'); g.restore();
  g.save(); g.lineWidth = [3, 5, 6, 8, 10][t];
  const rim = t >= 3 ? goldGrad(g, cx - er, cx - er, cx + er, cx + er, t === 4 ? '#ffd34d' : '#e9c46a') : black ? '#8a929e' : '#7b828c';
  if (t >= 1) { g.shadowColor = col; g.shadowBlur = [0, 8, 14, 22, 30][t]; }
  g.beginPath(); g.arc(cx, cx, er, 0, 7); g.strokeStyle = rim; g.stroke(); g.restore();
  if (t >= 2) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(col, .8); g.lineWidth = 2; g.shadowColor = col; g.shadowBlur = 10;
    const rr = er + 22; g.beginPath(); g.arc(cx, cx, rr, 0, 7); g.stroke();
    for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2, l = i % 3 ? 6 : 12; g.beginPath(); g.moveTo(cx + Math.cos(a) * (rr + 4), cx + Math.sin(a) * (rr + 4)); g.lineTo(cx + Math.cos(a) * (rr + 4 + l), cx + Math.sin(a) * (rr + 4 + l)); g.stroke(); }
    g.restore();
  }
  if (t === 4) {
    g.save(); const cg = g.createConicGradient(0, cx, cx); [0, 60, 120, 180, 240, 300, 360].forEach((h, i) => cg.addColorStop(i / 6, hsl2hex(h % 360, 100, 65)));
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = .6; g.lineWidth = 8; g.strokeStyle = cg; g.beginPath(); g.arc(cx, cx, R - 10, 0, 7); g.stroke(); g.restore();
    for (let i = 0; i < 14; i++) { const a = Math.random() * 7, d = er + 30 + Math.random() * 40; sparkle(g, cx + Math.cos(a) * d, cx + Math.sin(a) * d, 6 + Math.random() * 10, hsl2hex(Math.floor(Math.random() * 360), 100, 72), .9); }
  }
  if (t >= 3) sparkle(g, cx - er * .45, cx - er * .5, 26 + t * 6, '#ffffff', 1);
  g.beginPath(); g.arc(cx, cx, R, 0, 7); g.lineWidth = 4; g.strokeStyle = black ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.18)'; g.stroke();
  const hl = g.createLinearGradient(0, cx - R, 0, cx); hl.addColorStop(0, 'rgba(255,255,255,.28)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  g.beginPath(); g.ellipse(cx - 30, cx - R * .45, R * .7, R * .38, -.25, 0, 7); g.fillStyle = hl; g.fill();
  return c;
}
async function makeTexture(req, art, engine) {
  if (!engine) return proceduralTexture(req, art);
  const img = await aiImage({ engine, prompt: texturePrompt(req), refs: [art], aspect: '1:1' });
  const raw = coverTo(img, 512, 512), S = [[1, 1], [510, 1], [1, 510], [510, 510], [256, 1], [256, 510], [1, 256], [510, 256]];
  return circleCut(chromaKey(raw, { outerSeeds: S }).image, 512);
}
