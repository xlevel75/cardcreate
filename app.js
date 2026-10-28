/* ===================================================================
   슈퍼알까기 카드 스튜디오 — UI / 저장소 / 대기열
   =================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const sleep = ms => new Promise(r => setTimeout(r, ms));
function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k instanceof Node ? k : document.createTextNode(k));
  return e;
}
function toast(msg) { const d = el('div', {}, msg); $('#toast').append(d); setTimeout(() => d.remove(), 2600); }
function gradeTag(g) { const i = GRADES.indexOf(g); return el('span', { class: 'gl', style: `background:${GRADE_INFO[i].col}` }, g); }
function thumbOf(canvas, w = 240) { const c = mk(w, w * 1.5); c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height); return c; }
function safeName(s) { return (s || 'card').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60); }
function downloadCanvas(canvas, name) {
  canvas.toBlob(b => { const a = el('a', { href: URL.createObjectURL(b), download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, 'image/png');
}
function lightbox(node) { const w = $('#lbw'); w.innerHTML = ''; w.append(node); $('#lightbox').classList.add('on'); }
$('#lightbox').addEventListener('click', () => $('#lightbox').classList.remove('on'));
function canvasCopy(src) { const c = mk(src.width, src.height); c.getContext('2d').drawImage(src, 0, 0); return c; }
function seg(container, items, value, onChange) {
  container.innerHTML = '';
  items.forEach(it => {
    const b = el('button', { type: 'button', style: it.color ? `color:${it.color}` : '' }, it.label);
    if (it.value === value) b.classList.add('on');
    b.onclick = () => { $$('button', container).forEach(x => x.classList.remove('on')); b.classList.add('on'); onChange(it.value); };
    container.append(b);
  });
}

/* ---------------- 저장소 ----------------
   로컬 서버(server.py)로 열면: 프로젝트의 data/ 폴더에 파일로 저장 → git·폴더 복사에 함께 포함
   파일을 직접 열면: 브라우저(IndexedDB)에만 저장 */
const STORE_NAMES = ['iconSets', 'frameGroups', 'arts'];
const blobToB64 = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(b); });
async function encodeRec(v) {
  if (v instanceof Blob) return { $blob: await blobToB64(v), type: v.type || 'image/png' };
  if (Array.isArray(v)) return Promise.all(v.map(encodeRec));
  if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = await encodeRec(x); return o; }
  return v;
}
async function decodeRec(v) {
  if (Array.isArray(v)) return Promise.all(v.map(decodeRec));
  if (v && typeof v === 'object') {
    if (v.$file) { const r = await fetch(v.$file, { cache: 'no-store' }); if (!r.ok) throw new Error('파일 없음: ' + v.$file); return r.blob(); }
    const o = {}; for (const [k, x] of Object.entries(v)) o[k] = await decodeRec(x); return o;
  }
  return v;
}
const FileDB = {
  async raw(s) { const r = await fetch('/api/db/' + s, { cache: 'no-store' }); if (!r.ok) throw new Error('불러오기 실패 ' + r.status); return r.json(); },
  async all(s) { return (await Promise.all((await this.raw(s)).map(x => decodeRec(x).catch(e => { console.warn(e); return null; })))).filter(Boolean); },
  async put(s, v) {
    const r = await fetch(`/api/db/${s}/${encodeURIComponent(v.id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(await encodeRec(v)) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error?.message || '저장 실패 ' + r.status); }
  },
  async del(s, id) { await fetch(`/api/db-delete/${s}/${encodeURIComponent(id)}`, { method: 'POST' }); },
};
const DB = {
  file: false,
  async open() {
    this.file = AI.proxy;
    try { await IDB.open(); } catch (e) { if (!this.file) throw e; }
    if (this.file) await this.migrate();
  },
  all(s) { return this.file ? FileDB.all(s) : IDB.all(s); },
  async put(s, v) { try { return await (this.file ? FileDB.put(s, v) : IDB.put(s, v)); } catch (e) { toast('⚠ ' + (e.message || e)); throw e; } },
  del(s, id) { return this.file ? FileDB.del(s, id) : IDB.del(s, id); },
  // 예전에 브라우저에만 저장된 데이터가 있으면 data/ 폴더로 한 번 옮김 (폴더가 비어 있을 때만)
  async migrate() {
    if (!IDB.db) return;
    let n = 0;
    for (const s of STORE_NAMES) {
      if ((await FileDB.raw(s)).length) continue;
      for (const it of await IDB.all(s)) { await FileDB.put(s, it); n++; }
    }
    if (n) setTimeout(() => toast(`📁 브라우저에 있던 ${n}개 항목을 작업 폴더(data)로 옮겼습니다`), 500);
  },
};
const IDB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('alkkagi-card-studio', 1);
      r.onupgradeneeded = () => { const d = r.result; for (const s of ['iconSets', 'frameGroups', 'arts']) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' }); };
      r.onsuccess = () => { this.db = r.result; res(); }; r.onerror = () => rej(r.error);
    });
  },
  run(store, mode, fn) {
    return new Promise((res, rej) => { const tx = this.db.transaction(store, mode), req = fn(tx.objectStore(store)); tx.oncomplete = () => res(req && req.result); tx.onerror = () => rej(tx.error); });
  },
  all(s) { return this.run(s, 'readonly', st => st.getAll()); },
  put(s, v) { return this.run(s, 'readwrite', st => st.put(v)); },
  del(s, id) { return this.run(s, 'readwrite', st => st.delete(id)); },
};

/* ---------------- 상태 ---------------- */
// 설정: 브라우저에 저장하고, 로컬 서버가 있으면 data/settings.json 에도 저장 (API 키는 브라우저에만)
const LS = {
  srv: (() => {
    if (!location.protocol.startsWith('http')) return null;
    try { const x = new XMLHttpRequest(); x.open('GET', '/api/settings', false); x.send(); return x.status === 200 ? JSON.parse(x.responseText) : null; } catch { return null; }
  })(),
  local(k, d) { try { const v = localStorage.getItem('acs_' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  get(k, d) {
    if (!this.srv || !(k in this.srv)) return this.local(k, d);
    return k === 'settings' ? { ...this.local(k, {}), ...this.srv[k] } : this.srv[k];
  },
  set(k, v) {
    try { localStorage.setItem('acs_' + k, JSON.stringify(v)); } catch { }
    if (!this.srv) return;
    this.srv[k] = JSON.parse(JSON.stringify(v ?? null));
    clearTimeout(this._t);
    this._t = setTimeout(() => fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.srv) }).catch(() => { }), 400);
  },
};
const state = {
  iconProp: randomIconDesign(Date.now() & 0xffff),
  frameProp: randomFrameDesign((Date.now() >> 4) & 0xffff),
  iconSets: [], frameGroups: [], arts: [],
  activeIcon: LS.get('activeIcon', null), activeFrame: LS.get('activeFrame', null),
  settings: Object.assign({ openaiKey: '', openaiModel: 'gpt-image-2', openaiQuality: 'medium', geminiKey: '', geminiModel: 'gemini-2.5-flash-image' }, LS.get('settings', {})),
  gen: Object.assign({ grade: 'A', skills: ['pierce'], stone: 'black', count: 2, engine: 'gemini', concept: '' }, LS.get('gen', {})),
  reqSeq: 0, pending: 0,
  cmb: { frameId: null, t: 2, iconId: null, role: 'atk', artId: null, temp: null, name: '', showName: true, showSkills: true, zoom: 100, ox: 0, oy: 0,
    ...LS.get('cmbStyle', { layout: {}, font: { family: '"Black Han Sans"', size: 36, color: '#ffffff', stroke: '#000000', strokeW: 6 } }), sel: null, boxes: {} },
};
const artBitmaps = new Map(); // id -> ImageBitmap

/* ---------------- 탭 ---------------- */
function showTab(id) {
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === id));
  $$('.tab').forEach(s => s.classList.toggle('on', s.id === 'tab-' + id));
  if (id === 'combine') renderCombine(); if (id === 'vault') renderVault();
  window.scrollTo({ top: 0 });
}
$$('#tabs button').forEach(b => b.onclick = () => showTab(b.dataset.tab));
document.addEventListener('click', e => { const g = e.target.closest('[data-goto]'); if (g) showTab(g.dataset.goto); });
function updateHint() {
  const ic = state.iconSets.length, fr = state.frameGroups.length;
  $('#iconStatus').textContent = ic ? `등록 ${ic}세트` : '미등록'; $('#iconStatus').classList.toggle('ok', !!ic);
  $('#frameStatus').textContent = fr ? `등록 ${fr}그룹` : '미등록'; $('#frameStatus').classList.toggle('ok', !!fr);
  $('#stepHint').textContent = !ic || !fr ? `1단계: ${!ic ? '아이콘' : ''}${!ic && !fr ? ' · ' : ''}${!fr ? '프레임' : ''}을 승인해 등록하세요` : `보관함 ${state.arts.length}장 · 대기 ${state.pending}장`;
}

/* =================================================================
   ① 아이콘
   ================================================================= */
function renderIconProposal() {
  const p = state.iconProp, box = $('#iconPreview'); box.innerHTML = '';
  $('#icStyle').value = p.style; $('#icRim').value = p.rim;
  ROLES.forEach(R => {
    const cv = renderRoleIcon(p, R.id, 300);
    box.append(el('div', { class: 'iconCell', title: '클릭: 모양 바꾸기', onclick: () => { p.variant[R.id] = p.variant[R.id] ? 0 : 1; renderIconProposal(); } }, cv, el('b', {}, R.ko), el('small', {}, `모양 ${p.variant[R.id] + 1}/2`)));
  });
}
$('#icStyle').innerHTML = Object.entries(ICON_STYLES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
$('#icStyle').onchange = e => { state.iconProp.style = e.target.value; renderIconProposal(); };
$('#icRim').onchange = e => { state.iconProp.rim = e.target.value; renderIconProposal(); };
$('#icShuffle').onclick = () => { state.iconProp = randomIconDesign((Math.random() * 1e9) | 0); renderIconProposal(); };
$('#icApprove').onclick = async () => {
  const name = $('#icName').value.trim() || `아이콘 세트 ${state.iconSets.length + 1}`;
  const set = { id: uid(), name, created: Date.now(), ...structuredClone(state.iconProp) };
  await DB.put('iconSets', set); state.iconSets.push(set); state.activeIcon = set.id; LS.set('activeIcon', set.id);
  $('#icName').value = ''; renderIconSets(); updateHint(); toast(`✅ 아이콘 세트 “${name}” 등록 완료`);
};
function renderIconSets() {
  const box = $('#iconSets'); box.innerHTML = '';
  box.append(...brokenRows(aiBroken.icons, 'iconSets', '아이콘 세트', renderIconSets));
  if (!state.iconSets.length) { box.append(el('div', { class: 'empty' }, '아직 등록된 아이콘 세트가 없습니다.')); return; }
  for (const s of state.iconSets) {
    const thumbs = el('div', { class: 'thumbs' }, ROLES.map(R => { const c = mk(116, 116); c.getContext('2d').drawImage(getIconCanvas(s, R.id, 256), 0, 0, 116, 116); c.style.height = '52px'; c.style.background = 'none'; return c; }));
    const desc = s.kind === 'ai' ? `🤖 AI · ${s.aiStyle || '기본 스타일'}` : `${ICON_STYLES[s.style]} · ${s.rim === 'gold' ? '금' : '은'} 테두리`;
    box.append(el('div', { class: 'item' + (s.id === state.activeIcon ? ' active' : '') }, thumbs,
      el('div', { class: 'nm' }, s.name, el('small', {}, `${desc}${s.id === state.activeIcon ? ' · 기본 사용 중' : ''}`)),
      el('button', { class: 'btn sm', onclick: () => { state.activeIcon = s.id; LS.set('activeIcon', s.id); renderIconSets(); } }, '기본으로'),
      el('button', { class: 'btn sm', onclick: () => { state.iconProp = structuredClone({ seed: s.seed, style: s.style, rim: s.rim, variant: s.variant }); renderIconProposal(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }, '불러와 수정'),
      el('button', { class: 'btn sm', onclick: async () => { for (const R of ROLES) { downloadCanvas(s.kind === 'ai' ? getIconCanvas(s, R.id) : renderRoleIcon(s, R.id, 512), `icon_${safeName(s.name)}_${R.ko}.png`); await sleep(350); } } }, 'PNG 5장'),
      el('button', { class: 'btn sm danger', onclick: async () => { if (!confirm(`“${s.name}” 아이콘 세트를 삭제할까요?`)) return; await DB.del('iconSets', s.id); aiAssets.delete(s.id); state.iconSets = state.iconSets.filter(x => x.id !== s.id); if (state.activeIcon === s.id) state.activeIcon = state.iconSets[0]?.id || null; LS.set('activeIcon', state.activeIcon); renderIconSets(); updateHint(); } }, '삭제')));
  }
}

/* =================================================================
   ① 프레임
   ================================================================= */
let sampleArts = null;
function getSampleArts() {
  if (!sampleArts) sampleArts = GRADES.map((g, i) => renderArt({ grade: g, skills: [['shield'], ['accel'], ['pierce'], ['revive', 'explode'], ['split', 'revive']][i], concept: ['', '자연', '얼음', '불타는', '올림푸스 신화 황금'][i], stone: i % 2 ? 'white' : 'black' }, 1234 + i));
  return sampleArts;
}
function renderFrameProposal() {
  const d = state.frameProp, box = $('#framePreview'); box.innerHTML = '';
  $('#frShape').value = d.shape; $('#frPattern').value = d.pattern; $('#frCorner').value = d.corner; $('#frThick').value = d.thick; $('#frRadius').value = d.radius;
  const withArt = $('#frSample').checked, arts = withArt ? getSampleArts() : null;
  GRADES.forEach((g, t) => {
    const cv = withArt ? composeCard({ design: d, t, art: arts[t], iconSet: currentIconSet(), role: ROLES[t].id, name: `${GRADE_INFO[t].ko} 카드`, showName: true, skills: [], zoom: 1 }) : renderFrame(d, t);
    const wrap = el('div', { class: 'cv', onclick: () => lightbox(canvasCopy(cv)) }, cv);
    box.append(el('div', { class: 'frameCell' }, wrap,
      el('div', { style: 'margin-top:6px;display:flex;gap:6px;justify-content:center;align-items:center' }, gradeTag(g), el('span', { style: 'color:var(--muted);font-size:12px' }, GRADE_INFO[t].ko),
        el('button', { class: 'btn sm', onclick: () => downloadCanvas(renderFrame(d, t), `frame_${g}.png`) }, 'PNG'))));
  });
}
$('#frShape').innerHTML = Object.entries(FRAME_SHAPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
$('#frPattern').innerHTML = Object.entries(FRAME_PATTERNS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
$('#frCorner').innerHTML = FRAME_CORNERS.map((v, i) => `<option value="${i}">${v}</option>`).join('');
$('#frShape').onchange = e => { state.frameProp.shape = e.target.value; renderFrameProposal(); };
$('#frPattern').onchange = e => { state.frameProp.pattern = e.target.value; renderFrameProposal(); };
$('#frCorner').onchange = e => { state.frameProp.corner = +e.target.value; renderFrameProposal(); };
$('#frThick').onchange = e => { state.frameProp.thick = +e.target.value; renderFrameProposal(); };
$('#frRadius').onchange = e => { state.frameProp.radius = +e.target.value; renderFrameProposal(); };
$('#frSample').onchange = () => { renderFrameProposal(); renderAiFrames(); };
$('#frShuffle').onclick = () => { state.frameProp = randomFrameDesign((Math.random() * 1e9) | 0); renderFrameProposal(); };
$('#frApprove').onclick = async () => {
  const name = $('#frName').value.trim() || `프레임 그룹 ${state.frameGroups.length + 1}`;
  const grp = { id: uid(), name, created: Date.now(), ...structuredClone(state.frameProp) };
  await DB.put('frameGroups', grp); state.frameGroups.push(grp); state.activeFrame = grp.id; LS.set('activeFrame', grp.id);
  $('#frName').value = ''; renderFrameGroups(); updateHint(); toast(`✅ 프레임 그룹 “${name}” 등록 완료 — 다음 단계로 넘어가세요`);
};
function renderFrameGroups() {
  const box = $('#frameGroups'); box.innerHTML = '';
  box.append(...brokenRows(aiBroken.frames, 'frameGroups', '프레임 그룹', renderFrameGroups));
  if (!state.frameGroups.length) { box.append(el('div', { class: 'empty' }, '아직 등록된 프레임 그룹이 없습니다.')); return; }
  for (const f of state.frameGroups) {
    const thumbs = el('div', { class: 'thumbs' }, GRADES.map((g, t) => thumbOf(getFrameCanvas(f, t), 80)));
    box.append(el('div', { class: 'item' + (f.id === state.activeFrame ? ' active' : '') }, thumbs,
      el('div', { class: 'nm' }, f.name, el('small', {}, `${f.kind === 'ai' ? `🤖 AI · ${f.aiStyle || '기본 스타일'}` : `${FRAME_SHAPES[f.shape]} · ${FRAME_PATTERNS[f.pattern]} · ${FRAME_CORNERS[f.corner]}`}${f.id === state.activeFrame ? ' · 기본 사용 중' : ''}`)),
      el('button', { class: 'btn sm', onclick: () => { state.activeFrame = f.id; LS.set('activeFrame', f.id); renderFrameGroups(); } }, '기본으로'),
      el('button', { class: 'btn sm', title: 'AI 그룹은 레이아웃(모양·두께)만 불러옵니다', onclick: () => { const { seed, shape, pattern, corner, thick, radius } = f; state.frameProp = { seed, shape, pattern, corner, thick, radius }; if (f.aiStyle) $('#aiFrStyle').value = f.aiStyle; renderFrameProposal(); $('#framePreview').scrollIntoView({ behavior: 'smooth' }); } }, '불러와 수정'),
      el('button', { class: 'btn sm', onclick: async () => { for (let t = 0; t < 5; t++) { downloadCanvas(f.kind === 'ai' ? getFrameCanvas(f, t) : renderFrame(f, t), `frame_${safeName(f.name)}_${GRADES[t]}.png`); await sleep(350); } } }, 'PNG 5장'),
      el('button', { class: 'btn sm danger', onclick: async () => { if (!confirm(`“${f.name}” 프레임 그룹을 삭제할까요?`)) return; await DB.del('frameGroups', f.id); aiAssets.delete(f.id); state.frameGroups = state.frameGroups.filter(x => x.id !== f.id); if (state.activeFrame === f.id) state.activeFrame = state.frameGroups[0]?.id || null; LS.set('activeFrame', state.activeFrame); renderFrameGroups(); updateHint(); } }, '삭제')));
  }
}
function currentIconSet(id) { return state.iconSets.find(s => s.id === (id ?? state.activeIcon)) || state.iconSets[0] || state.iconProp; }
function currentFrame(id) { return state.frameGroups.find(s => s.id === (id ?? state.activeFrame)) || state.frameGroups[0] || state.frameProp; }

/* =================================================================
   ① AI 프레임 · AI 아이콘
   ================================================================= */
state.aiFrEngine = LS.get('aiFrEngine', 'gemini'); state.aiIcEngine = LS.get('aiIcEngine', 'gemini');
function aiEngineSeg(box, key) {
  seg(box, ['gemini', 'openai'].map(v => ({ label: ENGINES[v].label, value: v, color: ENGINES[v].color })), state[key], v => { state[key] = v; LS.set(key, v); });
}
function checkKey(engine) {
  const e = ENGINES[engine]; if (state.settings[e.key]) return true;
  toast(`${e.label} API 키를 ② 이미지 생성 › API 키 설정에 먼저 입력해 주세요`); return false;
}
async function blobCanvas(b) { const bm = await createImageBitmap(b); const c = mk(bm.width, bm.height); c.getContext('2d').drawImage(bm, 0, 0); return c; }
function waitBox(ratio) { return el('div', { class: 'cv', style: `aspect-ratio:${ratio};position:relative` }, el('div', { class: 'wait' }, el('div', { class: 'spinner' }))); }

const aiFr = { cells: [], running: 0, design: null, style: '', engine: 'gemini' };
async function aiFrameCell(t) {
  const prev = aiFr.chain && t > 0 ? aiFr.cells[t - 1]?.raw || null : null;
  aiFr.cells[t] = { status: 'pending' }; renderAiFrames();
  try { aiFr.cells[t] = { status: 'done', ...(await aiFrameOne(aiFr.design, t, aiFr.style, aiFr.engine, prev)) }; }
  catch (e) { aiFr.cells[t] = { status: 'err', err: e.message }; }
  aiAssets.set('__aiFr', aiFr.cells.map(c => c.status === 'done' ? { frame: c.frame, mask: c.mask } : null));
  renderAiFrames(); return aiFr.cells[t];
}
async function runAiFrames() {
  if (aiFr.running || !checkKey(state.aiFrEngine)) return;
  Object.assign(aiFr, { design: structuredClone(state.frameProp), style: $('#aiFrStyle').value.trim(), engine: state.aiFrEngine, chain: $('#aiFrChain').checked, cells: GRADES.map(() => ({ status: 'pending' })) });
  aiFr.running = 1; $('#aiFrGo').disabled = true; renderAiFrames();
  if (aiFr.chain) { for (let t = 0; t < 5; t++) await aiFrameCell(t); }
  else await Promise.all(GRADES.map((_, t) => aiFrameCell(t)));
  aiFr.running = 0; $('#aiFrGo').disabled = false; renderAiFrames();
}
function renderAiFrames() {
  const box = $('#aiFramePreview'); box.innerHTML = '';
  if (!aiFr.cells.length) return;
  const withArt = $('#frSample').checked, arts = withArt ? getSampleArts() : null, des = { ...aiFr.design, kind: 'ai', id: '__aiFr' };
  aiFr.cells.forEach((c, t) => {
    let inner;
    if (c.status === 'done') {
      const cv = withArt ? composeCard({ design: des, t, art: arts[t], iconSet: currentIconSet(), role: ROLES[t].id, name: `${GRADE_INFO[t].ko} 카드`, showName: true, skills: [], zoom: 1 }) : canvasCopy(c.frame);
      inner = el('div', { class: 'cv', onclick: () => lightbox(canvasCopy(cv)) }, cv);
    } else if (c.status === 'err') inner = el('div', { class: 'cv', style: 'aspect-ratio:2/3;position:relative' }, el('div', { class: 'errMsg' }, '⚠ ' + c.err));
    else inner = waitBox('2/3');
    box.append(el('div', { class: 'frameCell aiCell' }, inner,
      el('div', { style: 'margin-top:6px;display:flex;gap:6px;justify-content:center;align-items:center;flex-wrap:wrap' }, gradeTag(GRADES[t]),
        c.status === 'done' && !c.autoWindow ? el('span', { class: 'muted', title: '창을 자동 인식하지 못해 레이아웃 창 모양으로 비웠습니다' }, '⚠창') : null,
        el('button', { class: 'btn sm', disabled: c.status === 'pending', title: '이 등급만 다시 생성', onclick: () => aiFrameCell(t) }, '↻'),
        c.status === 'done' ? el('button', { class: 'btn sm', onclick: () => downloadCanvas(c.frame, `aiframe_${GRADES[t]}.png`) }, 'PNG') : null)));
  });
  $('#aiFrApproveRow').hidden = !aiFr.cells.every(c => c.status === 'done');
}
$('#aiFrGo').onclick = runAiFrames;
$('#aiFrApprove').onclick = async () => {
  if (aiFr.cells.length !== GRADES.length || !aiFr.cells.every(c => c.status === 'done' && c.frame)) return toast('먼저 5개 등급 프레임을 모두 생성해 주세요');
  const name = $('#aiFrName').value.trim() || `AI 프레임 ${state.frameGroups.length + 1}`, id = uid();
  const frames = await Promise.all(aiFr.cells.map(c => canvasToBlob(c.frame))), masks = await Promise.all(aiFr.cells.map(c => canvasToBlob(c.mask)));
  const grp = { ...aiFr.design, id, name, created: Date.now(), kind: 'ai', aiStyle: aiFr.style, engine: aiFr.engine, frames, masks };
  await DB.put('frameGroups', grp); aiAssets.set(id, aiFr.cells.map(c => ({ frame: c.frame, mask: c.mask })));
  state.frameGroups.push(grp); state.activeFrame = id; LS.set('activeFrame', id);
  $('#aiFrName').value = ''; renderFrameGroups(); updateHint(); toast(`✅ AI 프레임 그룹 “${name}” 등록 완료`);
};

const aiIc = { cells: {}, running: 0, guide: null, style: '', engine: 'gemini' };
async function aiIconCell(role) {
  const prev = aiIc.chain && role !== 'atk' ? aiIc.cells.atk?.raw || null : null;
  aiIc.cells[role] = { status: 'pending' }; renderAiIcons();
  try { aiIc.cells[role] = { status: 'done', ...(await aiIconOne(aiIc.guide, role, aiIc.style, aiIc.engine, prev)) }; }
  catch (e) { aiIc.cells[role] = { status: 'err', err: e.message }; }
  renderAiIcons(); return aiIc.cells[role];
}
async function runAiIcons() {
  if (aiIc.running || !checkKey(state.aiIcEngine)) return;
  Object.assign(aiIc, { guide: structuredClone(state.iconProp), style: $('#aiIcStyle').value.trim(), engine: state.aiIcEngine, chain: $('#aiIcChain').checked, cells: Object.fromEntries(ROLES.map(r => [r.id, { status: 'pending' }])) });
  aiIc.running = 1; $('#aiIcGo').disabled = true; renderAiIcons();
  if (aiIc.chain) { await aiIconCell('atk'); await Promise.all(ROLES.slice(1).map(r => aiIconCell(r.id))); }
  else await Promise.all(ROLES.map(r => aiIconCell(r.id)));
  aiIc.running = 0; $('#aiIcGo').disabled = false; renderAiIcons();
}
function renderAiIcons() {
  const box = $('#aiIconPreview'); box.innerHTML = '';
  if (!Object.keys(aiIc.cells).length) return;
  for (const R of ROLES) {
    const c = aiIc.cells[R.id];
    const body = c.status === 'done' ? canvasCopy(c.icon) : c.status === 'err' ? el('div', { class: 'errMsg', style: 'aspect-ratio:1' }, '⚠ ' + c.err) : el('div', { style: 'aspect-ratio:1;display:grid;place-items:center' }, el('div', { class: 'spinner' }));
    box.append(el('div', { class: 'iconCell aiCell', style: 'cursor:default' }, body, el('b', {}, R.ko),
      el('div', { style: 'display:flex;gap:4px;justify-content:center;margin-top:4px' },
        el('button', { class: 'btn sm', disabled: c.status === 'pending', title: '이 아이콘만 다시 생성', onclick: () => aiIconCell(R.id) }, '↻'),
        c.status === 'done' ? el('button', { class: 'btn sm', onclick: () => downloadCanvas(c.icon, `aiicon_${R.ko}.png`) }, 'PNG') : null)));
  }
  $('#aiIcApproveRow').hidden = !ROLES.every(R => aiIc.cells[R.id]?.status === 'done');
}
$('#aiIcGo').onclick = runAiIcons;
$('#aiIcApprove').onclick = async () => {
  if (!ROLES.every(R => aiIc.cells[R.id]?.status === 'done' && aiIc.cells[R.id].icon)) return toast('먼저 5개 역할 아이콘을 모두 생성해 주세요');
  const name = $('#aiIcName').value.trim() || `AI 아이콘 ${state.iconSets.length + 1}`, id = uid(), images = {}, cvs = {};
  for (const R of ROLES) { cvs[R.id] = aiIc.cells[R.id].icon; images[R.id] = await canvasToBlob(cvs[R.id]); }
  const set = { ...aiIc.guide, id, name, created: Date.now(), kind: 'ai', aiStyle: aiIc.style, engine: aiIc.engine, images };
  await DB.put('iconSets', set); aiAssets.set(id, cvs); state.iconSets.push(set); state.activeIcon = id; LS.set('activeIcon', id);
  $('#aiIcName').value = ''; renderIconSets(); updateHint(); toast(`✅ AI 아이콘 세트 “${name}” 등록 완료`);
};
// 그림이 빠진 AI 그룹(예전 버그로 빈 채 등록된 것)은 목록에서 빼고 따로 보여 줌
const aiBroken = { frames: [], icons: [] };
function splitBrokenAi() {
  const badF = f => f.kind === 'ai' && !(f.frames?.length === GRADES.length && f.masks?.length === GRADES.length);
  const badI = s => s.kind === 'ai' && !ROLES.every(R => s.images?.[R.id]);
  aiBroken.frames = state.frameGroups.filter(badF); state.frameGroups = state.frameGroups.filter(f => !badF(f));
  aiBroken.icons = state.iconSets.filter(badI); state.iconSets = state.iconSets.filter(s => !badI(s));
}
function brokenRows(list, store, label, rerender) {
  return list.map(x => el('div', { class: 'item', style: 'border-color:var(--danger)' },
    el('div', { class: 'nm' }, x.name, el('small', { style: 'color:var(--danger)' }, `⚠ 그림 없이 등록된 빈 ${label}입니다. 삭제한 뒤 다시 만들어 주세요.`)),
    el('button', { class: 'btn sm danger', onclick: async () => { await DB.del(store, x.id); const i = list.indexOf(x); if (i >= 0) list.splice(i, 1); rerender(); toast(`🗑 “${x.name}” 삭제`); } }, '삭제')));
}
async function loadAiAssets() {
  for (const f of state.frameGroups) if (f.kind === 'ai') aiAssets.set(f.id, await Promise.all(f.frames.map(async (b, i) => ({ frame: await blobCanvas(b), mask: await blobCanvas(f.masks[i]) }))));
  for (const s of state.iconSets) if (s.kind === 'ai') { const o = {}; for (const R of ROLES) o[R.id] = await blobCanvas(s.images[R.id]); aiAssets.set(s.id, o); }
}

/* =================================================================
   ② 생성
   ================================================================= */
const ENGINES = {
  gemini: { label: '🍌 나노바나나', color: '#ffd76a', desc: 'Google 나노바나나 (Gemini 이미지)', key: 'geminiKey', model: 'geminiModel' },
  openai: { label: '🤖 GPT Image', color: '#7fd6ff', desc: 'OpenAI GPT Image', key: 'openaiKey', model: 'openaiModel' },
  builtin: { label: '⚙ 내장', color: '#a3aab4', desc: '내장 엔진 — 키 없이 즉시 만드는 미리보기용 그림' },
};
const EXAMPLES = ['고귀한 느낌의 얼음', '올림푸스 신화 컨셉의 영웅적인 모습', '불타고 있는 모습', '자연에서 치유되는 느낌', '번개 폭풍 속의 전사', '심해의 신비로운 기운', '우주 은하의 별빛', '어둠의 저주'];
function saveGen() { LS.set('gen', state.gen); updatePrompt(); }
function initGenForm() {
  const G = state.gen;
  seg($('#gGrade'), GRADE_INFO.map(x => ({ label: `${x.g} ${x.ko}`, value: x.g, color: x.col })), G.grade, v => { G.grade = v; saveGen(); });
  seg($('#gStone'), [{ label: '⚫ 흑', value: 'black' }, { label: '⚪ 백', value: 'white' }, { label: '🎲 랜덤', value: 'random' }], G.stone, v => { G.stone = v; saveGen(); });
  seg($('#gCount'), [1, 2, 3, 4, 6].map(n => ({ label: n + '장', value: n })), G.count, v => { G.count = v; saveGen(); });
  renderSkillChips();
  $('#gConcept').value = G.concept; $('#gConcept').oninput = e => { G.concept = e.target.value; saveGen(); };
  $('#gExamples').append(...EXAMPLES.map(x => el('span', { class: 'chip ex', onclick: () => { $('#gConcept').value = x; G.concept = x; saveGen(); } }, x)));
  const S = state.settings;
  const renderEngine = () => {
    seg($('#gEngine'), Object.entries(ENGINES).map(([v, e]) => ({ label: e.label, value: v, color: e.color })), G.engine, v => { G.engine = v; saveGen(); renderEngine(); });
    const e = ENGINES[G.engine], key = e.key && S[e.key];
    $('#gEngineInfo').textContent = e.key ? `${e.desc} · 모델 ${S[e.model]} · ${key ? '키 등록됨 ✓' : '⚠ 키를 아래 설정에 입력하세요'}` : e.desc;
    $('#keyState').textContent = `— 나노바나나 ${S.geminiKey ? '✓' : '✗'} · GPT ${S.openaiKey ? '✓' : '✗'}`;
    $('#proxyState').textContent = AI.proxy ? ' · 로컬 서버 연결 ✓' : ' · ⚠ 로컬 서버 아님 (start.bat 로 실행 권장)';
    $('#proxyState').style.color = AI.proxy ? 'var(--ok)' : 'var(--danger)';
    if (e.key && !key) $('#apiBox').open = true;
  };
  for (const [id, key] of [['sOpenaiKey', 'openaiKey'], ['sOpenaiQuality', 'openaiQuality'], ['sGeminiKey', 'geminiKey'], ['sGeminiModel', 'geminiModel']]) {
    $('#' + id).value = S[key]; $('#' + id).onchange = e => { S[key] = e.target.value.trim(); LS.set('settings', S); renderEngine(); };
  }
  if (!$('#sGeminiModel').value) $('#sGeminiModel').value = S.geminiModel = 'gemini-2.5-flash-image';
  initGptModel(renderEngine);
  if (!ENGINES[G.engine]) G.engine = 'gemini';
  renderEngine();
  $('#gTexture').checked = G.texture !== false; $('#gTexture').onchange = e => { G.texture = e.target.checked; saveGen(); };
  $('#gSubmit').onclick = submitRequest;
  updatePrompt();
}
// GPT 모델: gpt-image-2 이상만 허용 (gpt-image-1 계열은 동작하지 않음)
const gptModelOk = m => { const v = /^gpt-image-(\d+(?:\.\d+)?)(?:-|$)/.exec(m || ''); return !!v && parseFloat(v[1]) >= 2; };
function initGptModel(renderEngine) {
  const S = state.settings, sel = $('#sOpenaiModel'), cus = $('#sOpenaiModelCustom');
  if (!gptModelOk(S.openaiModel)) { S.openaiModel = 'gpt-image-2'; LS.set('settings', S); }
  const known = [...sel.options].some(o => o.value === S.openaiModel);
  sel.value = known ? S.openaiModel : '__custom';
  cus.hidden = known; cus.value = known ? '' : S.openaiModel;
  const save = m => { S.openaiModel = m; LS.set('settings', S); renderEngine(); };
  sel.onchange = () => {
    if (sel.value === '__custom') { cus.hidden = false; cus.focus(); return; }
    cus.hidden = true; save(sel.value);
  };
  cus.onchange = () => {
    const m = cus.value.trim();
    if (!m) return;
    if (!gptModelOk(m)) { toast('⚠ gpt-image-2 이상 모델만 쓸 수 있습니다 (예: gpt-image-2, gpt-image-3)'); cus.value = gptModelOk(S.openaiModel) && S.openaiModel !== 'gpt-image-2' ? S.openaiModel : ''; return; }
    save(m);
  };
}
function renderSkillChips() {
  const G = state.gen, box = $('#gSkills'); box.innerHTML = '';
  for (const s of SKILLS) {
    const idx = G.skills.indexOf(s.id);
    const chip = el('span', { class: 'chip' + (idx >= 0 ? ' on' : ''), style: `color:${s.color}`, title: s.desc,
      onmouseenter: () => $('#gSkillDesc').textContent = `${s.ko} — ${s.desc}`,
      onclick: () => {
        if (idx >= 0) G.skills.splice(idx, 1); else { if (G.skills.length >= 3) { toast('스킬은 최대 3개까지 조합할 수 있어요'); return; } G.skills.push(s.id); }
        renderSkillChips(); saveGen();
      } }, idx >= 0 ? el('i', { class: 'ord' }, idx + 1) : el('i', { style: `background:${s.color}` }), el('span', { style: 'color:var(--text)' }, s.ko));
    box.append(chip);
  }
  $('#gSkillDesc').textContent = G.skills.length ? G.skills.map(id => SKILLS.find(s => s.id === id)).map(s => `${s.ko}: ${s.desc}`).join(' · ') : '스킬을 선택하세요 (선택 안 하면 컨셉만으로 생성)';
}
function updatePrompt() { $('#gPrompt').textContent = buildPrompt(state.gen); }

function updateQueueStatus() {
  const n = $$('.req', $('#queue')).length;
  $('#qStatus').textContent = n ? `요청 ${n}건 · 생성 중 ${state.pending}장` : '비어 있음';
  $('#qBadge').hidden = !state.pending; $('#qBadge').textContent = state.pending;
  if (!n && !$('#queue .empty')) $('#queue').append(el('div', { class: 'empty' }, '대기 중인 요청이 없습니다.'));
  updateHint();
}
function submitRequest() {
  const G = state.gen;
  if (!G.skills.length && !G.concept.trim()) { toast('스킬이나 컨셉 중 하나는 입력해 주세요'); return; }
  const eng = ENGINES[G.engine];
  if (eng.key && !state.settings[eng.key]) { $('#apiBox').open = true; toast(`${eng.label} API 키를 설정에 입력해 주세요`); return; }
  const req = { id: ++state.reqSeq, grade: G.grade, skills: [...G.skills], stone: G.stone, concept: G.concept.trim(), count: G.count, engine: G.engine, texture: G.texture !== false, created: Date.now() };
  $('#queue .empty')?.remove();
  const skillTxt = req.skills.map(id => SKILLS.find(s => s.id === id).ko).join(' + ') || '스킬 없음';
  const timer = el('span', { class: 'tag' }, '0초');
  const slots = el('div', { class: 'slots' });
  const block = el('div', { class: 'req' },
    el('div', { class: 'rh' }, el('span', { class: 'ttl' }, `요청 #${req.id}`), gradeTag(req.grade),
      el('span', { class: 'meta' }, `${skillTxt} · ${req.concept ? '“' + req.concept + '”' : '컨셉 없음'} · ${ENGINES[req.engine].label}${ENGINES[req.engine].model ? ' · ' + state.settings[ENGINES[req.engine].model] : ''}`),
      timer,
      el('button', { class: 'btn sm', onclick: () => $$('.slot.done:not(.saved)', block).forEach(s => s._save()) }, '모두 저장'),
      el('button', { class: 'btn sm danger', onclick: () => { $$('.slot:not(.pending)', block).forEach(s => s._discard(true)); } }, '모두 버리기')),
    slots);
  block._req = req;
  $('#queue').prepend(block);
  const t0 = Date.now();
  const iv = setInterval(() => {
    const live = $$('.slot.pending', block).length;
    timer.textContent = live ? `${Math.round((Date.now() - t0) / 1000)}초 · 대기 ${live}` : `완료 (${Math.round((Date.now() - t0) / 1000)}초)`;
    if (!live || !block.isConnected) clearInterval(iv);
  }, 500);
  for (let i = 0; i < req.count; i++) { const slot = makeSlot(req, i, block); slots.append(slot); runSlot(req, slot); }
  updateQueueStatus();
}
function makeSlot(req, i, block) {
  const slot = el('div', { class: 'slot pending' });
  slot._block = block;
  slot.append(el('div', { class: 'img' }, el('div', { class: 'spinner' }), el('div', { class: 'pmsg' }, `#${req.id}-${i + 1} 생성 중…`)));
  slot._discard = (silent) => {
    slot.remove();
    if (!$$('.slot', block).length) block.remove();
    updateQueueStatus(); if (!silent) toast('🗑 버렸습니다');
  };
  return slot;
}
async function runSlot(req, slot) {
  state.pending++; updateQueueStatus();
  try {
    let canvas;
    if (req.engine !== 'builtin') canvas = await genAiArt(req);
    else { await sleep(150 + Math.random() * 500); canvas = renderArt(req, (Math.random() * 1e9) | 0); }
    fillSlot(req, slot, canvas);
    if (req.texture) slot._runTexture?.();
  } catch (e) {
    console.error(e); slot.className = 'slot err'; slot.innerHTML = '';
    slot.append(el('div', { class: 'img' }, '⚠ 생성 실패\n\n' + String(e.message || e)),
      el('div', { class: 'acts' }, el('button', { class: 'btn', onclick: () => { slot.className = 'slot pending'; slot.innerHTML = ''; slot.append(el('div', { class: 'img' }, el('div', { class: 'spinner' }))); runSlot(req, slot); } }, '↻ 다시'), el('button', { class: 'btn danger', onclick: () => slot._discard(true) }, '닫기')));
  } finally { state.pending--; updateQueueStatus(); }
}
function defaultArtName(req) {
  const sk = req.skills.map(id => SKILLS.find(s => s.id === id).ko).join('');
  const c = (req.concept || '').replace(/\s+/g, ' ').slice(0, 12);
  defaultArtName.n = (defaultArtName.n || state.arts.length) + 1;
  return `${c || sk || '카드'}_${req.grade}_${String(defaultArtName.n).padStart(3, '0')}`;
}
// 편집에 쓸 엔진: 원래 AI 엔진이면 그대로, 내장 엔진 그림이면 키가 있는 AI 엔진
function editEngine(req) {
  if (req.engine !== 'builtin' && state.settings[ENGINES[req.engine].key]) return req.engine;
  return ['gemini', 'openai'].find(e => state.settings[ENGINES[e].key]) || null;
}
function editPrompt(instr) {
  return [
    'Edit the attached collectible-card character artwork (a heroic go stone with skill effects).',
    `Change ONLY this (instruction in Korean): "${instr}".`,
    'Keep everything else — the hero stone, composition, camera angle, art style, colours and lighting — as close to the original as possible.',
    'Vertical 2:3, full-bleed edge to edge, no white margin, no border, no frame, no text, no letters, no logos.',
  ].join(' ');
}
async function editSlot(req, slot, canvas, ctx, instr) {
  const engine = editEngine(req);
  if (!engine) { $('#apiBox').open = true; toast('편집은 AI 엔진이 필요합니다 — 나노바나나나 GPT 키를 입력해 주세요'); return; }
  slot.className = 'slot pending editing'; slot.innerHTML = '';
  const ghost = canvasCopy(canvas);
  slot.append(el('div', { class: 'img' }, ghost, el('div', { class: 'over' }, el('div', { class: 'spinner' }), el('div', { class: 'pmsg', style: 'position:static' }, `✏ ${ENGINES[engine].label} 편집 중…\n“${instr}”`))));
  state.pending++; updateQueueStatus();
  try {
    const img = await aiImage({ engine, prompt: editPrompt(instr), refs: [canvas], aspect: '2:3' });
    fillSlot(req, slot, coverTo(img, W, H), { name: ctx.name, history: [...ctx.history, canvas], edits: [...ctx.edits, instr] });
  } catch (e) {
    fillSlot(req, slot, canvas, { ...ctx, error: e.message || String(e), lastInstr: instr });
  } finally { state.pending--; updateQueueStatus(); }
}
function fillSlot(req, slot, canvas, ctx = {}) {
  ctx = { name: null, history: [], edits: [], ...ctx };
  slot.className = 'slot done'; slot.innerHTML = ''; slot._artId = null;
  const imgBox = el('div', { class: 'img', onclick: () => lightbox(canvasCopy(canvas)) }, canvas);
  if (ctx.edits.length) imgBox.append(el('span', { class: 'editTag', title: ctx.edits.map((x, i) => `${i + 1}. ${x}`).join('\n') }, `✏ 편집 ${ctx.edits.length}회`));
  const nameIn = el('input', { value: ctx.name || defaultArtName(req), title: '저장 이름', oninput: e => ctx.name = e.target.value });
  ctx.name = nameIn.value;
  const editIn = el('input', { class: 'editIn', placeholder: '어떻게 바꿀까요? 입력 후 Enter (예: 배경을 밤하늘로, 알을 더 크게)', value: ctx.lastInstr || '' });
  const editRow = el('div', { class: 'editRow', hidden: !ctx.error }, editIn);
  editIn.onkeydown = e => {
    if (e.key === 'Enter' && !e.isComposing && editIn.value.trim()) editSlot(req, slot, canvas, ctx, editIn.value.trim());
    if (e.key === 'Escape') editRow.hidden = true;
  };
  // 알 텍스처: 이 그림을 참조해 알 윗면(가운데 엠블럼)을 만듦
  slot._canvas = canvas;
  const texRow = el('div', { class: 'texRow' }), texSpot = el('div', { class: 'texSpot' }); // texSpot: 그림 오른쪽 위
  imgBox.append(texSpot);
  const drawTex = () => {
    texRow.innerHTML = ''; texSpot.innerHTML = '';
    if (ctx.texState === 'pending') { texSpot.append(el('div', { class: 'texDisc', title: '알 텍스처 생성 중' }, el('div', { class: 'spinner sm' }))); texRow.append(el('span', { class: 'muted' }, '⚪ 알 텍스처 생성 중…')); return; }
    if (ctx.texture) {
      const tc = canvasCopy(ctx.texture); tc.className = 'texDisc'; tc.title = '알 텍스처 크게 보기';
      tc.onclick = e => { e.stopPropagation(); const b = canvasCopy(ctx.texture); b.className = 'sq'; lightbox(b); };
      texSpot.append(tc);
      texRow.append(el('span', { class: 'muted' }, '⚪ 알 텍스처'),
        el('button', { class: 'btn sm', title: '알 텍스처 다시 만들기', onclick: runTexture }, '↻'),
        el('button', { class: 'btn sm', onclick: () => downloadCanvas(ctx.texture, `stone_${safeName(nameIn.value)}.png`) }, 'PNG'));
      return;
    }
    texRow.append(el('button', { class: 'btn sm', onclick: runTexture }, '⚪ 알 텍스처 만들기'),
      ...(ctx.texErr ? [el('span', { class: 'texErr', title: ctx.texErr }, '⚠ 실패 (마우스를 올려 이유 보기)')] : []));
  };
  const runTexture = async () => {
    ctx.texState = 'pending'; ctx.texErr = null; drawTex();
    try { ctx.texture = await makeTexture(req, canvas, req.engine === 'builtin' ? null : editEngine(req)); }
    catch (e) { ctx.texErr = e.message || String(e); }
    ctx.texState = null;
    if (slot._canvas !== canvas) return; // 그 사이 편집돼 다른 그림이 됨
    drawTex();
    if (slot._artId && ctx.texture) { const a = state.arts.find(x => x.id === slot._artId); if (a) { a.texture = await canvasToBlob(ctx.texture); await DB.put('arts', a); toast('⚪ 저장된 그림에 알 텍스처도 추가했습니다'); } }
  };
  slot._runTexture = runTexture; drawTex();
  slot._save = async () => {
    if (slot.classList.contains('saved')) return;
    const name = nameIn.value.trim() || defaultArtName(req);
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const art = { id: uid(), name, grade: req.grade, skills: req.skills, concept: req.concept, stone: req.stone, engine: req.engine, created: Date.now(), blob, texture: ctx.texture ? await canvasToBlob(ctx.texture) : null, thumb: thumbOf(canvas, 240).toDataURL('image/jpeg', .85) };
    await DB.put('arts', art); state.arts.unshift(art); artBitmaps.set(art.id, canvas);
    slot.classList.add('saved'); slot._artId = art.id; imgBox.append(el('span', { class: 'savedTag' }, '저장됨 ✓'));
    saveBtn.disabled = true; saveBtn.textContent = '저장됨'; nameIn.disabled = true; updateHint(); toast(`💾 “${name}” 보관함에 저장`);
  };
  const saveBtn = el('button', { class: 'btn primary', onclick: () => slot._save() }, '💾 저장');
  slot.append(imgBox,
    ...(ctx.error ? [el('div', { class: 'errMsg editErr' }, '⚠ 편집 실패 — 원래 그림을 유지했습니다\n' + ctx.error)] : []),
    texRow,
    el('div', { class: 'saveRow' }, nameIn),
    editRow,
    el('div', { class: 'acts' }, saveBtn,
      el('button', { class: 'btn', title: '이 그림을 바탕으로 수정 요청', onclick: () => { editRow.hidden = !editRow.hidden; if (!editRow.hidden) editIn.focus(); } }, '✏ 편집'),
      ctx.history.length ? el('button', { class: 'btn', title: '편집 전 그림으로 되돌리기', onclick: () => fillSlot(req, slot, ctx.history.at(-1), { name: ctx.name, history: ctx.history.slice(0, -1), edits: ctx.edits.slice(0, -1) }) }, '↶') : null,
      el('button', { class: 'btn', onclick: () => { if (slot._artId) openCombine({ artId: slot._artId }); else openCombine({ temp: { canvas, skills: req.skills, grade: req.grade, name: nameIn.value } }); } }, '🧩 조합'),
      el('button', { class: 'btn danger', onclick: () => slot._discard() }, '🗑')));
  if (ctx.error) editIn.focus();
}
async function genAiArt(req) { return coverTo(await aiImage({ engine: req.engine, prompt: buildPrompt(req), aspect: '2:3' }), W, H); }

/* =================================================================
   ③ 보관함
   ================================================================= */
function initVault() {
  $('#vGrade').append(...GRADES.map(g => el('option', { value: g }, g)));
  $('#vSkill').append(...SKILLS.map(s => el('option', { value: s.id }, s.ko)));
  for (const id of ['vSearch', 'vGrade', 'vSkill']) $('#' + id).oninput = renderVault;
}
function renderVault() {
  const q = $('#vSearch').value.trim().toLowerCase(), gr = $('#vGrade').value, sk = $('#vSkill').value, box = $('#vault');
  const list = state.arts.filter(a => (!gr || a.grade === gr) && (!sk || a.skills.includes(sk)) && (!q || (a.name + ' ' + a.concept).toLowerCase().includes(q)));
  $('#vCount').textContent = `${list.length} / ${state.arts.length}장`;
  box.innerHTML = '';
  if (!list.length) { box.append(el('div', { class: 'empty', style: 'grid-column:1/-1' }, state.arts.length ? '조건에 맞는 이미지가 없습니다.' : '보관함이 비어 있습니다. ② 이미지 생성에서 만든 이미지를 저장하세요.')); return; }
  for (const a of list) {
    const skills = a.skills.map(id => SKILLS.find(s => s.id === id)?.ko).join(' + ') || '스킬 없음';
    box.append(el('div', { class: 'vcard' },
      el('div', { class: 'imgWrap' }, el('img', { src: a.thumb, loading: 'lazy', onclick: async () => lightbox(canvasCopy(await artCanvas(a.id))) }),
        a.texture ? el('img', { class: 'vtex', src: texUrl(a), title: '알 텍스처 크게 보기', onclick: () => lightbox(el('img', { class: 'sq', src: texUrl(a) })) }) : null),
      el('div', { class: 'vb' }, el('div', { class: 'vn' }, gradeTag(a.grade), ' ', a.name), el('div', { class: 'vm' }, skills), el('div', { class: 'vm' }, a.concept || '')),
      el('div', { class: 'acts' },
        el('button', { class: 'btn sm primary', onclick: () => openCombine({ artId: a.id }) }, '🧩 조합'),
        el('button', { class: 'btn sm', onclick: async () => { const n = prompt('새 이름', a.name); if (!n) return; a.name = n.trim(); await DB.put('arts', a); renderVault(); } }, '이름'),
        el('button', { class: 'btn sm', onclick: async () => downloadCanvas(await artCanvas(a.id), `art_${safeName(a.name)}.png`) }, 'PNG'),
        a.texture ? el('button', { class: 'btn sm', title: '알 텍스처 PNG', onclick: async () => downloadCanvas(await blobCanvas(a.texture), `stone_${safeName(a.name)}.png`) }, '⚪ PNG') : null,
        el('button', { class: 'btn sm', title: a.texture ? '알 텍스처 다시 만들기' : '이 그림으로 알 텍스처 만들기', onclick: e => vaultTexture(a, e.currentTarget) }, a.texture ? '⚪ ↻' : '⚪ 알 만들기'),
        el('button', { class: 'btn sm danger', onclick: async () => { if (!confirm(`“${a.name}”을(를) 보관함에서 삭제할까요?`)) return; await DB.del('arts', a.id); state.arts = state.arts.filter(x => x.id !== a.id); artBitmaps.delete(a.id); if (state.cmb.artId === a.id) state.cmb.artId = null; renderVault(); updateHint(); toast('🗑 삭제했습니다'); } }, '삭제'))));
  }
}
const _texUrls = new Map();
function texUrl(a) { let u = _texUrls.get(a.id); if (!u || u.blob !== a.texture) { u = { blob: a.texture, url: URL.createObjectURL(a.texture) }; _texUrls.set(a.id, u); } return u.url; }
async function vaultTexture(a, btn) {
  btn.disabled = true; btn.textContent = '⚪ 생성 중…';
  try {
    const tex = await makeTexture(a, await artCanvas(a.id), a.engine === 'builtin' ? null : editEngine(a));
    a.texture = await canvasToBlob(tex); await DB.put('arts', a); toast(`⚪ “${a.name}” 알 텍스처 저장`);
  } catch (e) { toast('⚠ 알 텍스처 실패: ' + String(e.message || e).split('\n')[0]); }
  renderVault();
}
async function artCanvas(id) {
  if (artBitmaps.has(id)) return artBitmaps.get(id);
  const a = state.arts.find(x => x.id === id); if (!a) return null;
  const bm = await createImageBitmap(a.blob); artBitmaps.set(id, bm); return bm;
}

/* =================================================================
   ④ 조합
   ================================================================= */
function openCombine({ artId, temp }) {
  const C = state.cmb;
  if (artId) { C.artId = artId; C.temp = null; const a = state.arts.find(x => x.id === artId); if (a) { C.t = GRADES.indexOf(a.grade); C.skills = a.skills; if (!C.nameTouched) C.name = ''; } }
  if (temp) { C.temp = temp; C.artId = '__temp'; C.t = GRADES.indexOf(temp.grade); C.skills = temp.skills; }
  C.zoom = 100; C.ox = 0; C.oy = 0;
  showTab('combine');
}
function cmbOptions(t) {
  const C = state.cmb;
  return { design: currentFrame(C.frameId), t: t ?? C.t, iconSet: C.role ? currentIconSet(C.iconId) : null, role: C.role, name: C.name, showName: C.showName, skills: C.skills || [], showSkills: C.showSkills, zoom: C.zoom / 100, ox: C.ox, oy: C.oy, layout: { ...C.layout, icon: C.layout['icon:' + (t ?? C.t)] }, font: C.font };
}
async function currentArt() { const C = state.cmb; if (C.artId === '__temp') return C.temp?.canvas || null; if (!C.artId) return null; return artCanvas(C.artId); }
function renderCombine() {
  const C = state.cmb;
  const fs = $('#cFrame'); fs.innerHTML = '';
  if (!state.frameGroups.length) fs.append(el('option', { value: '' }, '(미등록) 현재 제안 프레임'));
  state.frameGroups.forEach(f => fs.append(el('option', { value: f.id }, f.name)));
  fs.value = C.frameId && state.frameGroups.some(f => f.id === C.frameId) ? C.frameId : (state.activeFrame || ''); C.frameId = fs.value || null;
  fs.onchange = e => { C.frameId = e.target.value || null; drawCombine(); };
  const is = $('#cIconSet'); is.innerHTML = '';
  if (!state.iconSets.length) is.append(el('option', { value: '' }, '(미등록) 현재 제안 아이콘'));
  state.iconSets.forEach(s => is.append(el('option', { value: s.id }, s.name)));
  is.value = C.iconId && state.iconSets.some(s => s.id === C.iconId) ? C.iconId : (state.activeIcon || ''); C.iconId = is.value || null;
  is.onchange = e => { C.iconId = e.target.value || null; drawCombine(); };
  seg($('#cGrade'), GRADE_INFO.map((x, i) => ({ label: x.g, value: i, color: x.col })), C.t, v => { C.t = v; drawCombine(); });
  seg($('#cRole'), [...ROLES.map(r => ({ label: r.ko, value: r.id, color: r.color })), { label: '없음', value: null }], C.role, v => { C.role = v; drawCombine(); });
  const ap = $('#cArts'); ap.innerHTML = '';
  const pick = (id, node) => { node.onclick = () => { C.artId = id; if (id && id !== '__temp') { const a = state.arts.find(x => x.id === id); C.skills = a.skills; C.t = GRADES.indexOf(a.grade); } else if (id === '__temp') { C.skills = C.temp.skills; } else C.skills = []; C.zoom = 100; C.ox = 0; C.oy = 0; renderCombine(); }; if ((C.artId || null) === id) node.classList.add('on'); ap.append(node); };
  pick(null, el('div', { class: 'ap none' }, '빈 프레임'));
  if (C.temp) { const tn = thumbOf(C.temp.canvas, 64); tn.style.cssText = 'width:100%;display:block'; pick('__temp', el('div', { class: 'ap', title: '대기열에서 가져온 임시 그림 (미저장)' }, tn, el('span', { style: 'position:absolute;top:2px;left:2px;background:#ffc83d;color:#000;font-size:9px;padding:0 4px;border-radius:4px;font-weight:900' }, '임시'))); }
  state.arts.forEach(a => pick(a.id, el('div', { class: 'ap', title: a.name }, el('img', { src: a.thumb }))));
  $('#cName').value = C.name; $('#cName').oninput = e => { C.name = e.target.value; C.nameTouched = true; drawCombine(); };
  $('#cShowName').checked = C.showName; $('#cShowName').onchange = e => { C.showName = e.target.checked; drawCombine(); };
  $('#cShowSkills').checked = C.showSkills; $('#cShowSkills').onchange = e => { C.showSkills = e.target.checked; drawCombine(); };
  for (const [id, key, fmt] of [['cZoom', 'zoom', v => v + '%'], ['cOx', 'ox', v => v], ['cOy', 'oy', v => v]]) {
    $('#' + id).value = C[key]; $('#' + id + 'V').textContent = fmt(C[key]);
    $('#' + id).oninput = e => { C[key] = +e.target.value; $('#' + id + 'V').textContent = fmt(C[key]); drawCombine(true); };
  }
  $('#cDownload').onclick = async () => { const cv = composeCard({ ...cmbOptions(), art: await currentArt() }); downloadCanvas(cv, `card_${safeName(C.name || 'card')}_${GRADES[C.t]}.png`); };
  $('#cDownloadAll').onclick = async () => { const art = await currentArt(); for (let t = 0; t < 5; t++) { downloadCanvas(composeCard({ ...cmbOptions(t), art }), `card_${safeName(C.name || 'card')}_${GRADES[t]}.png`); await sleep(350); } };
  initFontControls();
  drawCombine();
}
let _drawTok = 0;
async function drawCombine(fast) {
  const tok = ++_drawTok, art = await currentArt(); if (tok !== _drawTok) return;
  const boxes = {}, cv = composeCard({ ...cmbOptions(), art, boxes });
  state.cmb.boxes = boxes; renderOverlay();
  const g = $('#cCanvas').getContext('2d'); g.clearRect(0, 0, W, H); g.drawImage(cv, 0, 0);
  $$('#cGrade button').forEach((b, i) => b.classList.toggle('on', i === state.cmb.t));
  if (fast) { clearTimeout(drawCombine._t); drawCombine._t = setTimeout(() => drawStrip(art), 250); } else drawStrip(art);
}
function drawStrip(art) {
  const box = $('#cStrip'); box.innerHTML = '';
  GRADES.forEach((gname, t) => {
    const cv = thumbOf(composeCard({ ...cmbOptions(t), art }), 260);
    cv.onclick = () => { state.cmb.t = t; drawCombine(); };
    box.append(el('div', {}, cv, el('div', {}, `${gname} · ${GRADE_INFO[t].ko}`)));
  });
}

/* ---------------- ④ 조합: 글꼴 · 박스 컨트롤러 ---------------- */
const FONTS = [
  ['"Black Han Sans"', '검은고딕 (굵은 제목)'], ['"Do Hyeon"', '도현'], ['"Jua"', '주아'], ['"Gugi"', '구기'],
  ['"Nanum Myeongjo"', '나눔명조 (굵게)'], ['"Nanum Pen Script"', '나눔손글씨 펜'], ['"Noto Sans KR"', '본고딕'], ['Cinzel', 'Cinzel (영문 장식)'],
];
const LAYER_NAME = { icon: '역할 아이콘', name: '이름', skills: '스킬' };
for (const k of Object.keys(state.cmb.layout)) if (k === 'icon' || /^icon:[a-z]/.test(k)) delete state.cmb.layout[k];
function saveCmbStyle() { LS.set('cmbStyle', { layout: state.cmb.layout, font: state.cmb.font }); }
async function setFont(patch) {
  const F = state.cmb.font; Object.assign(F, patch);
  if (patch.family) { try { await document.fonts.load(`400 40px ${F.family}`, state.cmb.name || '가나다'); } catch { } }
  saveCmbStyle(); syncFontControls(); drawCombine(true);
}
function syncFontControls() {
  const F = state.cmb.font;
  $('#cFont').value = F.family; $('#cFontSize').value = Math.round(F.size); $('#cFontSizeV').textContent = Math.round(F.size) + 'px';
  $('#cFontColor').value = F.color; $('#cStrokeColor').value = F.stroke; $('#cStrokeW').value = F.strokeW;
}
function initFontControls() {
  const fs = $('#cFont');
  if (!fs.options.length) fs.append(...FONTS.map(([v, l]) => el('option', { value: v, style: `font-family:${v}` }, l)));
  fs.onchange = e => setFont({ family: e.target.value });
  $('#cFontSize').oninput = e => setFont({ size: +e.target.value });
  $('#cFontColor').oninput = e => setFont({ color: e.target.value });
  $('#cStrokeColor').oninput = e => setFont({ stroke: e.target.value });
  $('#cStrokeW').oninput = e => setFont({ strokeW: +e.target.value });
  $('#cResetLayout').onclick = () => { state.cmb.layout = {}; state.cmb.sel = null; saveCmbStyle(); drawCombine(); };
  syncFontControls();
}
function renderOverlay() {
  const ov = $('#cOverlay'), C = state.cmb, k = ov.clientWidth / W; ov.innerHTML = '';
  if (!k) return;
  if (C.sel && !C.boxes[C.sel]) C.sel = null;
  for (const [id, b] of Object.entries(C.boxes)) {
    const st = `left:${b.x * k}px;top:${b.y * k}px;width:${b.w * k}px;height:${b.h * k}px`;
    if (id !== C.sel) { ov.append(el('div', { class: 'hov', style: st })); continue; }
    ov.append(el('div', { class: 'sel', style: st, 'data-act': 'move' }, el('span', { class: 'lbl' }, id === 'icon' ? `${LAYER_NAME.icon} · ${GRADES[C.t]} 등급` : LAYER_NAME[id]),
      ...['nw', 'ne', 'sw', 'se'].map(h => el('div', { class: 'hd ' + h, 'data-act': 'resize', style: `left:${h[1] === 'w' ? 0 : 100}%;top:${h[0] === 'n' ? 0 : 100}%` }))));
  }
}
// 역할 아이콘은 프레임 등급마다 위치·크기를 따로 기억함 (layout['icon:0'] = C 등급 …)
const layoutKey = id => id === 'icon' ? 'icon:' + state.cmb.t : id;
function layerOf(id) { const L = state.cmb.layout, k = layoutKey(id); return (L[k] = { dx: 0, dy: 0, s: 1, ...(L[k] || {}) }); }
(function initOverlay() {
  const ov = $('#cOverlay'); let drag = null, raf = 0;
  const toCard = e => { const r = ov.getBoundingClientRect(), k = r.width / W; return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }; };
  const redraw = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; drawCombine(true); }); };
  ov.addEventListener('pointerdown', e => {
    const C = state.cmb, p = toCard(e), act = e.target.dataset.act;
    if (!act) { // 상자 고르기 (위에 그려진 것부터)
      C.sel = ['name', 'skills', 'icon'].find(id => { const b = C.boxes[id]; return b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; }) || null;
      renderOverlay(); ov.focus(); if (!C.sel) return;
    }
    const b = C.boxes[C.sel], l = layerOf(C.sel), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    drag = { mode: act === 'resize' ? 'resize' : 'move', p0: p, l0: { ...l }, size0: C.font.size, d0: Math.max(8, Math.hypot(p.x - cx, p.y - cy)), cx, cy };
    ov.setPointerCapture(e.pointerId); e.preventDefault();
  });
  ov.addEventListener('pointermove', e => {
    if (!drag) return;
    const C = state.cmb, p = toCard(e), l = layerOf(C.sel);
    if (drag.mode === 'move') { l.dx = Math.round(drag.l0.dx + p.x - drag.p0.x); l.dy = Math.round(drag.l0.dy + p.y - drag.p0.y); }
    else {
      const r = Math.max(.2, Math.min(5, Math.hypot(p.x - drag.cx, p.y - drag.cy) / drag.d0));
      if (C.sel === 'name') { C.font.size = Math.max(10, Math.min(160, drag.size0 * r)); syncFontControls(); }
      else l.s = Math.max(.2, Math.min(4, drag.l0.s * r));
    }
    redraw();
  });
  const end = () => { if (drag) { drag = null; saveCmbStyle(); drawCombine(); } };
  ov.addEventListener('pointerup', end); ov.addEventListener('pointercancel', end);
  ov.addEventListener('keydown', e => {
    const C = state.cmb, d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (e.key === 'Escape') { C.sel = null; renderOverlay(); return; }
    if (!C.sel || !d) return;
    const l = layerOf(C.sel), n = e.shiftKey ? 10 : 1; l.dx += d[0] * n; l.dy += d[1] * n; e.preventDefault(); saveCmbStyle(); redraw();
  });
  new ResizeObserver(() => renderOverlay()).observe(ov);
})();

/* ---------------- 시작 ---------------- */
(async function init() {
  try { await Promise.race([Promise.all(['900 40px Cinzel', '400 30px "Black Han Sans"', '700 20px "Noto Sans KR"'].map(f => document.fonts.load(f))), sleep(2500)]); } catch { }
  await detectProxy(); await DB.open();
  [state.iconSets, state.frameGroups, state.arts] = await Promise.all([DB.all('iconSets'), DB.all('frameGroups'), DB.all('arts')]);
  splitBrokenAi();
  try { await loadAiAssets(); } catch (e) { console.warn(e); toast('⚠ AI 프레임·아이콘 그림 일부를 불러오지 못했습니다'); }
  aiEngineSeg($('#aiFrEngine'), 'aiFrEngine'); aiEngineSeg($('#aiIcEngine'), 'aiIcEngine');
  state.iconSets.sort((a, b) => a.created - b.created); state.frameGroups.sort((a, b) => a.created - b.created); state.arts.sort((a, b) => b.created - a.created);
  if (state.activeIcon && !state.iconSets.some(s => s.id === state.activeIcon)) state.activeIcon = state.iconSets[0]?.id || null;
  if (state.activeFrame && !state.frameGroups.some(s => s.id === state.activeFrame)) state.activeFrame = state.frameGroups[0]?.id || null;
  for (const f of [renderIconProposal, renderIconSets, renderFrameProposal, renderFrameGroups, initGenForm, initVault, updateQueueStatus, updateHint]) {
    try { f(); } catch (e) { console.error(f.name, e); toast(`⚠ 화면 일부(${f.name})를 그리지 못했습니다: ${e.message}`); }
  }
})();
