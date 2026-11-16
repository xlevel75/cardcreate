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
    ...LS.get('cmbStyle', { layout: {}, font: { family: '"Black Han Sans"', size: 36, color: '#ffffff', stroke: '#000000', strokeW: 6 } }), ...LS.get('cmbView', {}), sel: null, boxes: {} },
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
  G.fx = fxList(G); renderFxChips();
  seg($('#gCount'), [1, 2, 3, 4, 6].map(n => ({ label: n + '장', value: n })), G.count, v => { G.count = v; saveGen(); });
  renderSkillChips();
  $('#gConcept').value = G.concept; $('#gConcept').oninput = e => { G.concept = e.target.value; saveGen(); renderFxChips(); };
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
  $('#gKing').checked = !!G.king; $('#gKing').onchange = e => { G.king = e.target.checked; saveGen(); };
  $('#gEngrave').checked = !!G.engrave; $('#gEngrave').onchange = e => { G.engrave = e.target.checked; saveGen(); };
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
// 알 주위 기본 이펙트: 여러 개 조합. [] = 자동, ['none'] = 없음
function renderFxChips() {
  const G = state.gen, box = $('#gFx'); box.innerHTML = '';
  for (const f of BASE_FX) {
    const on = f.id === 'auto' ? !G.fx.length : G.fx.includes(f.id);
    box.append(el('span', { class: 'chip' + (on ? ' on' : ''), onclick: () => {
      if (f.id === 'auto') G.fx = [];
      else if (f.id === 'none') G.fx = G.fx.includes('none') ? [] : ['none'];
      else { const cur = G.fx.filter(x => x !== 'none'); G.fx = cur.includes(f.id) ? cur.filter(x => x !== f.id) : [...cur, f.id]; }
      saveGen(); renderFxChips();
    } }, f.label));
  }
  const cf = G.fx[0] === 'none' ? [] : conceptFx(G.concept).filter(id => !G.fx.includes(id)), lab = id => BASE_FX.find(f => f.id === id)?.label;
  $('#gFxInfo').textContent = (!G.fx.length ? (cf.length ? '' : '자동: 등급에 맞는 기본 이펙트가 들어갑니다') : G.fx[0] === 'none' ? '이펙트 없이 알만 깔끔하게' : '조합: ' + G.fx.map(lab).join(' + '))
    + (cf.length ? `${G.fx.length ? ' · ' : ''}컨셉 글에서 더함: ${cf.map(lab).join(' + ')}` : '');
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
  const req = { id: ++state.reqSeq, grade: G.grade, skills: [...new Set([...G.skills, ...conceptSkills(G.concept)])], stone: G.stone, concept: G.concept.trim(), count: G.count, engine: G.engine, texture: G.texture !== false, engrave: !!G.engrave, king: !!G.king, fx: [...fxList(G)], created: Date.now() };
  $('#queue .empty')?.remove();
  const skillTxt = req.skills.map(id => SKILLS.find(s => s.id === id).ko).join(' + ') || '스킬 없음';
  const timer = el('span', { class: 'tag' }, '0초');
  const slots = el('div', { class: 'slots' });
  const block = el('div', { class: 'req' },
    el('div', { class: 'rh' }, el('span', { class: 'ttl' }, `요청 #${req.id}`), gradeTag(req.grade),
      el('span', { class: 'meta' }, `${req.king ? '👑왕알 · ' : ''}${skillTxt}${req.engrave && req.skills.length ? ' · 🔱각인' : ''}${effFx(req).length ? ' · ' + effFx(req).map(id => BASE_FX.find(f => f.id === id)?.label || '').join('+') : ''} · ${req.concept ? '“' + req.concept + '”' : '컨셉 없음'} · ${ENGINES[req.engine].label}${ENGINES[req.engine].model ? ' · ' + state.settings[ENGINES[req.engine].model] : ''}`),
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
// 같은 요청(등급·스킬·컨셉)으로 그림을 처음부터 다시 만듦. 이전 그림은 ↶ 로 되돌릴 수 있음
async function regenSlot(req, slot, canvas, ctx) {
  if (req.engine !== 'builtin' && !state.settings[ENGINES[req.engine].key]) { $('#apiBox').open = true; toast(`${ENGINES[req.engine].label} API 키를 먼저 입력해 주세요`); return; }
  slot.className = 'slot pending editing'; slot.innerHTML = '';
  slot.append(el('div', { class: 'img' }, canvasCopy(canvas), el('div', { class: 'over' }, el('div', { class: 'spinner' }), el('div', { class: 'pmsg', style: 'position:static' }, `🔄 ${ENGINES[req.engine].label} 새로 만드는 중…`))));
  state.pending++; updateQueueStatus();
  try {
    const nc = req.engine !== 'builtin' ? await genAiArt(req) : (await sleep(200), renderArt(req, (Math.random() * 1e9) | 0));
    fillSlot(req, slot, nc, { name: ctx.name, history: [...ctx.history, canvas], edits: [...ctx.edits, '🔄 새로 만들기'] });
    if (req.texture) slot._runTexture?.();
  } catch (e) {
    fillSlot(req, slot, canvas, { ...ctx, error: e.message || String(e), errTitle: '⚠ 새로 만들기 실패 — 원래 그림을 유지했습니다' });
  } finally { state.pending--; updateQueueStatus(); }
}
function fillSlot(req, slot, canvas, ctx = {}) {
  ctx = { name: null, history: [], edits: [], ...ctx };
  slot.className = 'slot done'; slot.innerHTML = ''; slot._artId = null;
  const imgBox = el('div', { class: 'img', onclick: () => lightbox(canvasCopy(canvas)) }, canvas);
  if (ctx.edits.length) imgBox.append(el('span', { class: 'editTag', title: ctx.edits.map((x, i) => `${i + 1}. ${x}`).join('\n') }, `✏ 변경 ${ctx.edits.length}회`));
  const nameIn = el('input', { value: ctx.name || defaultArtName(req), title: '저장 이름', oninput: e => ctx.name = e.target.value });
  ctx.name = nameIn.value;
  const editIn = el('input', { class: 'editIn', placeholder: '어떻게 바꿀까요? 입력 후 Enter (예: 배경을 밤하늘로, 알을 더 크게)', value: ctx.lastInstr || '' });
  const editRow = el('div', { class: 'editRow', hidden: !ctx.error || !!ctx.errTitle }, editIn);
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
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', .92)); // 카드 원본 그림은 투명 영역이 없어 JPG로 보관 (알 텍스처는 투명이 필요해 PNG 유지)
    const art = { id: uid(), name, grade: req.grade, skills: req.skills, concept: req.concept, stone: req.stone, fx: fxList(req), king: !!req.king, engine: req.engine, created: Date.now(), blob, texture: ctx.texture ? await canvasToBlob(ctx.texture) : null, thumb: thumbOf(canvas, 240).toDataURL('image/jpeg', .85) };
    await DB.put('arts', art); state.arts.unshift(art); artBitmaps.set(art.id, canvas);
    slot.classList.add('saved'); slot._artId = art.id; imgBox.append(el('span', { class: 'savedTag' }, '저장됨 ✓'));
    saveBtn.disabled = true; saveBtn.textContent = '저장됨'; nameIn.disabled = true; updateHint(); toast(`💾 “${name}” 보관함에 저장`);
  };
  const saveBtn = el('button', { class: 'btn primary', onclick: () => slot._save() }, '💾 저장');
  slot.append(imgBox,
    ...(ctx.error ? [el('div', { class: 'errMsg editErr' }, (ctx.errTitle || '⚠ 편집 실패 — 원래 그림을 유지했습니다') + '\n' + ctx.error)] : []),
    texRow,
    el('div', { class: 'saveRow' }, nameIn),
    editRow,
    el('div', { class: 'acts' }, saveBtn,
      el('button', { class: 'btn', title: '같은 등급·스킬·컨셉으로 그림을 처음부터 새로 만들기 (↶ 로 되돌리기 가능)', onclick: () => regenSlot(req, slot, canvas, ctx) }, '🔄 새로 만들기'),
      el('button', { class: 'btn', title: '이 그림을 바탕으로 수정 요청', onclick: () => { editRow.hidden = !editRow.hidden; if (!editRow.hidden) editIn.focus(); } }, '✏ 편집'),
      ctx.history.length ? el('button', { class: 'btn', title: '편집 전 그림으로 되돌리기', onclick: () => fillSlot(req, slot, ctx.history.at(-1), { name: ctx.name, history: ctx.history.slice(0, -1), edits: ctx.edits.slice(0, -1) }) }, '↶') : null,
      el('button', { class: 'btn', onclick: () => { if (slot._artId) openCombine({ artId: slot._artId }); else openCombine({ temp: { canvas, skills: req.skills, grade: req.grade, king: !!req.king, name: nameIn.value, concept: req.concept, stone: req.stone, fx: fxList(req) } }); } }, '🧩 조합'),
      el('button', { class: 'btn danger', onclick: () => slot._discard() }, '🗑')));
  if (ctx.error && !ctx.errTitle) editIn.focus();
}
// 왕알: 모양 참고 그림(ref/king_stone.png)을 함께 보냄 — 모양만 참고, 색·배경·이펙트는 따라 하지 않게 문구로 지시
async function kingRef() { const img = await loadImage('ref/king_stone.png'); const c = mk(img.width, img.height); c.getContext('2d').drawImage(img, 0, 0); return c; }
async function genAiArt(req) { return coverTo(await aiImage({ engine: req.engine, prompt: buildPrompt(req), refs: req.king ? [await kingRef()] : [], aspect: '2:3' }), W, H); }

/* =================================================================
   ③ 보관함
   ================================================================= */
function initVault() {
  $('#vGrade').append(...GRADES.map(g => el('option', { value: g }, g)));
  $('#vSkill').append(...SKILLS.map(s => el('option', { value: s.id }, s.ko)));
  for (const id of ['vSearch', 'vGrade', 'vSkill']) $('#' + id).oninput = renderVault;
}
// ④ 조합에서 카드로 저장한 기록: 그림마다 최대 4개 (등급 + 이름 앞 4글자), 최근 것이 위
const MAX_CARD_SAVES = 4;
function cardSaves(a) {
  if (a && a.saved && !a.saves) { a.saves = [a.saved]; } // 예전 기록(하나) → 목록
  if (a) delete a.saved;
  return a?.saves || [];
}
async function postApi(path, body) {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error?.message || r.status); return j;
}
function rerenderSaves() { renderVault(); if ($('#tab-combine').classList.contains('on')) renderCombine(); }
async function deleteCardSave(a, s) {
  if (!confirm(`저장한 카드 “${s.grade} ${s.name || '(이름 없음)'}”을(를) 삭제하시겠습니까?\n(card · cardonly 폴더의 그림 파일과 jpg 폴더의 JPG도 함께 지웁니다)`)) return;
  try {
    const paths = [s.card, s.only].filter(Boolean);
    const j = paths.length ? await postApi('/api/delete-files', { paths }) : { removed: [] };
    a.saves = cardSaves(a).filter(x => x !== s); await DB.put('arts', a);
    toast(`🗑 저장 카드 삭제 (파일 ${j.removed.length}장)`); rerenderSaves();
  } catch (e) { toast('⚠ 삭제 실패: ' + e.message); }
}
function savedTag(a) {
  const list = cardSaves(a); if (!list.length) return null;
  return el('div', { class: 'cardSaves' }, ...[...list].reverse().map(s => {
    const short = [...(s.name || '').replace(/\s+/g, '')].slice(0, 4).join('');
    return el('div', { class: 'cardSave', title: `카드 저장됨 · ${s.grade} ${s.name || '(이름 없음)'}${s.at ? ' · ' + new Date(s.at).toLocaleString() : ''}\n클릭하면 삭제`, onclick: e => { e.stopPropagation(); deleteCardSave(a, s); } }, gradeTag(s.grade), short || '저장됨');
  }));
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
        a.texture ? el('img', { class: 'vtex', src: texUrl(a), title: '알 텍스처 크게 보기', onclick: () => lightbox(el('img', { class: 'sq', src: texUrl(a) })) }) : null, savedTag(a)),
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
  if (artId) { C.artId = artId; C.temp = null; const a = state.arts.find(x => x.id === artId); if (a) { C.skills = a.skills; if (!C.nameTouched) C.name = ''; } }
  if (temp) { C.temp = temp; C.artId = '__temp'; C.skills = temp.skills; }
  state.cmbRefreshSuffix?.(); // 확대·좌우·상하는 그림을 바꿔도 마지막 설정 유지
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
  fs.onchange = e => { C.frameId = e.target.value || null; saveCmbView(); drawCombine(); };
  const is = $('#cIconSet'); is.innerHTML = '';
  if (!state.iconSets.length) is.append(el('option', { value: '' }, '(미등록) 현재 제안 아이콘'));
  state.iconSets.forEach(s => is.append(el('option', { value: s.id }, s.name)));
  is.value = C.iconId && state.iconSets.some(s => s.id === C.iconId) ? C.iconId : (state.activeIcon || ''); C.iconId = is.value || null;
  is.onchange = e => { C.iconId = e.target.value || null; saveCmbView(); drawCombine(); };
  seg($('#cGrade'), GRADE_INFO.map((x, i) => ({ label: x.g, value: i, color: x.col })), C.t, v => { C.t = v; saveCmbView(); drawCombine(); });
  seg($('#cRole'), [...ROLES.map(r => ({ label: r.ko, value: r.id, color: r.color })), { label: '없음', value: null }], C.role, v => { C.role = v; saveCmbView(); drawCombine(); });
  const ap = $('#cArts'); ap.innerHTML = '';
  const pick = (id, node) => { node.onclick = () => { C.artId = id; if (id && id !== '__temp') { const a = state.arts.find(x => x.id === id); C.skills = a.skills; } else if (id === '__temp') { C.skills = C.temp.skills; } else C.skills = []; renderCombine(); state.cmbRefreshSuffix?.(); }; if ((C.artId || null) === id) node.classList.add('on'); ap.append(node); };
  pick(null, el('div', { class: 'ap none' }, '빈 프레임'));
  if (C.temp) { const tn = thumbOf(C.temp.canvas, 64); tn.style.cssText = 'width:100%;display:block'; pick('__temp', el('div', { class: 'ap', title: '대기열에서 가져온 임시 그림 (미저장)' }, tn, el('span', { style: 'position:absolute;top:2px;left:2px;background:#ffc83d;color:#000;font-size:9px;padding:0 4px;border-radius:4px;font-weight:900' }, '임시'))); }
  state.arts.forEach(a => pick(a.id, el('div', { class: 'ap', title: a.name }, el('img', { src: a.thumb }), savedTag(a))));
  $('#cName').value = C.name; $('#cName').oninput = e => { C.name = e.target.value; C.nameTouched = true; $('#cNameStyle').textContent = ''; drawCombine(); };
  $('#cNameGen').onclick = () => {
    const art = C.artId === '__temp' ? C.temp : state.arts.find(a => a.id === C.artId);
    const g = autoCardName({ concept: art?.concept || '', skills: C.skills || [], t: C.t, king: cmbKing(), role: C.role, stone: art?.stone, fx: effFx(art) }, [C.name]);
    const ko = id => NAME_MOOD_KO[id] || SKILLS.find(s => s.id === id)?.ko || ROLES.find(r => r.id === id)?.ko || id;
    C.name = g.name; C.nameTouched = true; $('#cName').value = g.name; $('#cNameStyle').textContent = `스타일: ${g.style} · 등급: ${g.grade} · 분위기: ${g.moods.map(ko).join('·')} · 핵심: ${g.cores.map(ko).join('·')}`; drawCombine();
  };
  $('#cShowName').checked = C.showName; $('#cShowName').onchange = e => { C.showName = e.target.checked; drawCombine(); };
  $('#cShowSkills').checked = C.showSkills; $('#cShowSkills').onchange = e => { C.showSkills = e.target.checked; drawCombine(); };
  for (const [id, key, fmt] of [['cZoom', 'zoom', v => v + '%'], ['cOx', 'ox', v => v], ['cOy', 'oy', v => v]]) {
    $('#' + id).value = C[key]; $('#' + id + 'V').textContent = fmt(C[key]);
    $('#' + id).oninput = e => { C[key] = +e.target.value; $('#' + id + 'V').textContent = fmt(C[key]); saveCmbView(); drawCombine(true); };
  }
  initFontControls();
  initSaveBox();
  drawCombine();
}
/* ---- 카드 이름 자동 생성 (LLM 없이 단어장 조합) ----
   분위기 단어(컨셉 주제·기본 이펙트·알 색·고귀함) + 핵심 단어(스킬 전부·역할)를 섞고,
   최근에 나온 이름·저장한 카드 이름은 피해서 매번 다른 이름이 나오게 함 */
// 분위기 단어장: en 영어식, gr 그리스 신화, la 라틴어, ko 한글 명사, ka 한글 꾸밈말
const NAME_MOOD = {
  ice: { en: ['프로스트', '아이스', '블리자드', '글래셜', '크리스탈', '폴라', '윈터', '스노우', '프리즘'], gr: ['크리오스', '키오네', '보레아스', '킬레네'], la: ['글라키에스', '니베우스', '프리고르', '히엠스', '크리스탈룸'], ko: ['빙결', '서리', '설원', '얼음꽃', '눈보라', '빙하', '한기', '수정'], ka: ['얼어붙은', '차가운', '시린', '맑은'] },
  fire: { en: ['블레이즈', '인페르노', '플레어', '버닝', '스칼렛', '이그나이트', '애쉬', '마그마', '솔라'], gr: ['헬리오스', '파이로스', '헤파이스토스', '프로메테우스', '히페리온'], la: ['이그니스', '플라마', '아르덴스', '칼로르', '판빌라'], ko: ['업화', '화염', '홍련', '불꽃', '용암', '잿불', '열화', '태양'], ka: ['타오르는', '불타는', '이글거리는', '뜨거운'] },
  nature: { en: ['그린', '블룸', '와일드', '리프', '에메랄드', '버던트', '그로브', '스프링'], gr: ['가이아', '데메테르', '드리아스', '페르세포네', '판'], la: ['테라', '플로라', '실바', '비타', '비리디스'], ko: ['초록', '생명', '새싹', '치유', '풀잎', '봄빛', '대지', '이슬'], ka: ['푸르른', '싱그러운', '자라나는', '따스한'] },
  divine: { en: ['홀리', '세이크리드', '골든', '글로리', '헤일로', '셀레스티얼', '에테르', '래디언트'], gr: ['제우스', '아폴론', '아테나', '올림포스', '헤라', '니케', '아레스'], la: ['디비누스', '루멘', '솔', '아우레우스', '글로리아', '상투스'], ko: ['천상', '황금', '영광', '성역', '신성', '후광', '영웅', '광휘'], ka: ['성스러운', '찬란한', '눈부신', '영광스러운'] },
  dark: { en: ['섀도우', '다크', '나이트', '커스드', '보이드', '그림', '헥스', '둠', '나이트메어'], gr: ['하데스', '타나토스', '닉스', '에레보스', '헤카테', '케르베로스'], la: ['움브라', '녹스', '모르스', '테네브라', '말룸', '오브스쿠라'], ko: ['암흑', '그림자', '칠흑', '심연', '저주', '흑요', '망령', '어스름'], ka: ['저주받은', '어두운', '불길한', '잠식하는'] },
  storm: { en: ['썬더', '스톰', '볼트', '테슬라', '스파크', '템페스트', '플래시', '볼티지'], gr: ['제우스', '브론테스', '아스트라페', '케라우노스', '아이올로스'], la: ['풀구르', '토니트루스', '템페스타스', '풀멘'], ko: ['뇌전', '폭풍', '번개', '천둥', '섬광', '뇌광', '전격'], ka: ['번뜩이는', '요동치는', '내리꽂는'] },
  deep: { en: ['어비스', '딥', '타이달', '아비살', '크라켄', '다이브', '리바이어선'], gr: ['포세이돈', '오케아노스', '트리톤', '카리브디스', '스킬라'], la: ['아비수스', '프로푼두스', '마리스', '파토스'], ko: ['심해', '심연', '해류', '물밑', '해저', '청흑'], ka: ['깊은', '고요한', '신비로운', '가라앉은'] },
  sea: { en: ['오션', '웨이브', '타이드', '마린', '코럴', '스프레이', '아쿠아'], gr: ['포세이돈', '네레우스', '테티스', '암피트리테'], la: ['아쿠아', '마레', '운다', '플루크투스'], ko: ['파도', '바다', '물결', '물보라', '해일', '조류'], ka: ['출렁이는', '푸른', '밀려오는'] },
  cosmic: { en: ['스타', '코스믹', '노바', '아스트랄', '메테오', '갤럭시', '오빗', '퀘이사', '스텔라'], gr: ['우라노스', '아스트라이아', '크로노스', '헬리오스', '셀레네', '오리온'], la: ['스텔라', '코스모스', '시데리스', '루나', '오르비스', '카엘룸'], ko: ['별빛', '성운', '우주', '유성', '혜성', '은하', '월광'], ka: ['별이 된', '빛나는', '아득한', '영원한'] },
  arcane: { en: ['아케인', '미스틱', '룬', '오리진', '에코', '레거시', '이클립스'], gr: ['헤카테', '헤르메스', '아이온', '카오스'], la: ['아르카나', '마기아', '프리무스', '오리고'], ko: ['신비', '마력', '태초', '비전', '운명', '전설'], ka: ['신비로운', '오래된', '잊혀진'] },
  metal: { en: ['스틸', '아이언', '크롬', '티타늄', '메탈', '코발트', '실버', '블레이드'], gr: ['헤파이스토스', '탈로스', '키클롭스'], la: ['페룸', '아르겐툼', '칼립스', '메탈룸'], ko: ['강철', '무쇠', '은빛', '철벽', '쇳빛', '청강'], ka: ['단단한', '번쩍이는', '세련된', '차가운'] },
  arena: { en: ['아레나', '그리드', '챔피언', '매치', '스트라이크', '골드컵', '빅토리'], gr: ['니케', '아곤', '올림피아'], la: ['아레나', '빅토리아', '코로나', '루두스'], ko: ['결투', '승부', '경기장', '판', '격전', '승리'], ka: ['당당한', '거침없는', '노련한'] },
  humble: { en: ['그레이', '스톤', '퓨어', '심플', '애쉬', '더스크', '모스'], gr: ['헤스티아', '데미오스'], la: ['푸루스', '시플렉스', '그리세우스', '파우페르'], ko: ['잿빛', '돌', '고요', '소박', '바위', '이끼', '묵향'], ka: ['담담한', '조용한', '소박한', '꾸밈없는', '겸손한'] },
  wind: { en: ['게일', '윈드', '스위프트', '제피르', '에어', '스트림', '사이클론', '스톰라이더'], gr: ['아이올로스', '제피로스', '보레아스', '노토스'], la: ['벤투스', '아우라', '켈레르', '플라투스'], ko: ['질풍', '바람', '돌풍', '회오리', '순풍', '선풍'], ka: ['날렵한', '스치는', '빠른', '휘몰아치는'] },
  light: { en: ['화이트', '샤인', '브라이트', '퓨어', '루미너스', '오로라', '던'], gr: ['에오스', '헤메라', '포이베'], la: ['알부스', '룩스', '칸디두스', '아우로라'], ko: ['백광', '여명', '새벽', '순백', '눈부심', '햇살'], ka: ['새하얀', '밝은', '순결한', '맑은'] },
  sparkle: { en: ['글리터', '트윙클', '스파클', '샤인', '스타더스트', '지르콘'], gr: ['아스트라이아', '이리스'], la: ['스킨틸라', '미칸스', '스텔룰라'], ko: ['반짝임', '별가루', '윤슬', '광채', '빛가루'], ka: ['반짝이는', '영롱한', '눈부신'] },
  aura: { en: ['오라', '헤일로', '래디언스', '글로우', '스피릿', '에센스'], gr: ['프시케', '아이테르'], la: ['아니마', '스피리투스', '아우라', '눔멘'], ko: ['기운', '투기', '영기', '광륜', '혼'], ka: ['감도는', '일렁이는', '타오르는'] },
  heavy: { en: ['타이탄', '골렘', '모놀리스', '헤비', '그래나이트', '보울더', '퀘이크'], gr: ['아틀라스', '타이탄', '기가스', '크로노스'], la: ['그라비스', '몰레스', '삭숨', '포데루스'], ko: ['반석', '거암', '무게', '지진', '태산', '굉음'], ka: ['묵직한', '거대한', '흔들림 없는', '단단한'] },
  black: { en: ['블랙', '오닉스', '오브시디언', '젯', '미드나잇'], gr: ['닉스', '에레보스'], la: ['니게르', '아테르', '녹스'], ko: ['흑요', '먹빛', '칠흑', '흑진주', '흑요석'], ka: ['검은', '새까만', '깊은'] },
  white: { en: ['화이트', '펄', '아이보리', '스노우', '문스톤'], gr: ['셀레네', '레우코스'], la: ['알부스', '니베우스', '마르가리타'], ko: ['진주', '설백', '백옥', '순백', '흰눈'], ka: ['하얀', '새하얀', '희디흰'] },
  brown: { en: ['브라운', '오크', '월넛', '앰버', '어스', '코퍼'], gr: ['가이아', '데메테르'], la: ['브루누스', '테라', '쿠프룸'], ko: ['갈빛', '밤빛', '흙빛', '고목', '호박', '구릿빛'], ka: ['따스한', '묵묵한', '오래된', '포근한'] },
  noble: { en: ['로열', '골든', '노블', '임페리얼', '그레이스'], gr: ['헤라', '아테나'], la: ['노빌리스', '아우레우스', '레갈리스'], ko: ['황금', '귀족', '기품', '왕관'], ka: ['고귀한', '기품 있는', '황금빛'] },
  gray: { en: ['그레이', '애쉬', '실버', '스모크', '더스크', '미스트'], gr: ['헤스티아', '모이라'], la: ['그리세우스', '키네레우스', '네불라'], ko: ['잿빛', '은회색', '안개', '연기', '먹구름', '회색빛'], ka: ['잿빛', '희뿌연', '차분한', '은은한'] },
  navy: { en: ['네이비', '미드나잇', '사파이어', '인디고', '딥블루', '애드미럴'], gr: ['닉스', '오케아노스', '우라노스'], la: ['카이룰레우스', '녹스', '인디쿠스'], ko: ['남빛', '감청', '군청', '한밤', '쪽빛', '심청'], ka: ['짙푸른', '깊은', '고요한', '단정한'] },
  gold: { en: ['골드', '골든', '오리', '선라이즈', '길디드', '앰버'], gr: ['헬리오스', '크리세오스', '미다스'], la: ['아우룸', '아우레우스', '플라부스', '솔'], ko: ['금빛', '황금', '금결', '노을', '햇금', '호박빛'], ka: ['금빛', '눈부신', '찬란한', '황금빛'] },
  dragon: { en: ['드래곤', '와이번', '드레이크', '스케일', '팽'], gr: ['라돈', '피톤', '티폰'], la: ['드라코', '세르펜스', '스콰마'], ko: ['용', '비룡', '용린', '역린', '용아'], ka: ['용맹한', '포효하는', '비늘 돋친'] },
  beast: { en: ['울프', '팽', '타이거', '레오', '하울', '클로', '비스트'], gr: ['케르베로스', '네메아', '리카온'], la: ['루푸스', '레오', '티그리스', '페라'], ko: ['늑대', '맹수', '호랑이', '사자', '야수', '발톱', '송곳니'], ka: ['굶주린', '사나운', '울부짖는', '야성의'] },
  bird: { en: ['이글', '호크', '팔콘', '레이븐', '윙', '페더', '스카이'], gr: ['피닉스', '그리핀', '아이톤'], la: ['아퀼라', '코르부스', '알라', '아비스'], ko: ['매', '독수리', '날개', '깃털', '까마귀', '봉황'], ka: ['날아오르는', '비상하는', '하늘을 가르는'] },
  serpent: { en: ['서펀트', '바이퍼', '코브라', '히드라', '베놈'], gr: ['히드라', '메두사', '에키드나'], la: ['앙귀스', '베네눔', '세르펜스'], ko: ['뱀', '독사', '맹독', '이무기'], ka: ['독을 품은', '휘감는', '서늘한'] },
  blossom: { en: ['블로섬', '로즈', '로터스', '페탈', '사쿠라', '릴리'], gr: ['클로리스', '안테아'], la: ['로사', '플로스', '로투스', '릴리움'], ko: ['벚꽃', '장미', '연꽃', '꽃잎', '꽃비', '매화'], ka: ['흩날리는', '피어나는', '향기로운'] },
  moon: { en: ['문', '루나', '크레센트', '이클립스', '나이트폴'], gr: ['셀레네', '아르테미스', '닉스'], la: ['루나', '녹스', '크레스켄스'], ko: ['달빛', '초승달', '보름달', '월광', '밤'], ka: ['달빛 어린', '고요한', '은은한'] },
  blade: { en: ['블레이드', '소드', '엣지', '세이버', '카타나', '슬래시'], gr: ['아레스', '아킬레우스', '아이아스'], la: ['글라디우스', '엔시스', '아키에스'], ko: ['검', '칼날', '검무', '일섬', '무사', '검기'], ka: ['예리한', '벼려진', '번뜩이는'] },
  gem: { en: ['루비', '사파이어', '다이아', '에메랄드', '오팔', '토파즈', '쥬얼'], gr: ['아다마스', '크리스탈로스'], la: ['겜마', '아다만투스', '루베우스'], ko: ['보석', '홍옥', '청옥', '금강', '보옥', '진주'], ka: ['영롱한', '빛나는', '값진'] },
  machine: { en: ['메카', '사이버', '네온', '기어', '코어', '넥서스', '프로토'], gr: ['탈로스', '헤파이스토스'], la: ['마키나', '메카니카', '누클레우스'], ko: ['기계', '태엽', '강철심장', '동력', '회로'], ka: ['정밀한', '가동하는', '차가운'] },
};
NAME_MOOD.simple = NAME_MOOD.humble; NAME_MOOD.diamond = NAME_MOOD.gem;
const NAME_MOOD_KO = { ice: '얼음', fire: '불꽃', nature: '자연', divine: '신화', dark: '어둠', storm: '번개', deep: '심해', sea: '바다', cosmic: '우주', arcane: '신비', metal: '메탈', arena: '경기장', humble: '소박', wind: '바람', light: '빛', sparkle: '반짝', aura: '오라', heavy: '묵직', black: '흑돌', white: '백돌', noble: '고귀', brown: '갈색', simple: '심플', diamond: '다이아몬드', gray: '회색빛', navy: '네이비빛', gold: '금빛', dragon: '용', beast: '야수', bird: '새', serpent: '뱀', blossom: '꽃', moon: '달', blade: '검', gem: '보석', machine: '기계', none: '기본' };
// 컨셉 글에서 주제 찾기 (render.js 의 그림 주제 + 이름 전용 주제)
const NAME_KW = {
  metal: ['메탈', '매탈', '금속', '강철', '철', '쇠', '크롬', '은색', 'metal', 'steel'],
  arena: ['경기장', '그리드', '알까기판', '대결', '승부', 'arena'],
  humble: ['심플', '겸손', '평범', '회색', '소박', '수수', '단순', 'simple', 'gray', 'grey'],
  wind: ['바람', '가속', '질주', '속도', '돌풍', 'wind', 'speed'],
  light: ['밝은', '흰색', '하얀', '빛', '백색', 'white', 'light', 'bright'],
  dragon: ['용', '드래곤', '비룡', '와이번', 'dragon'],
  beast: ['늑대', '호랑이', '사자', '야수', '맹수', '곰', '여우', '표범', 'wolf', 'tiger', 'lion', 'beast'],
  bird: ['독수리', '까마귀', '봉황', '날개', '깃털', '그리핀', 'bird', 'eagle', 'wing'],
  serpent: ['뱀', '독사', '히드라', '이무기', '코브라', 'snake', 'serpent'],
  blossom: ['벚꽃', '장미', '연꽃', '꽃잎', '매화', 'blossom', 'rose', 'sakura', 'lotus'],
  moon: ['달빛', '초승달', '보름', '월광', '밤하늘', 'moon', 'lunar'],
  blade: ['검객', '검사', '장검', '칼', '무사', '사무라이', '기사', '검객', 'sword', 'blade', 'knight'],
  gem: ['보석', '루비', '사파이어', '다이아', '에메랄드', '오팔', '진주', 'gem', 'jewel', 'ruby'],
  machine: ['기계', '로봇', '사이버', '네온', '메카', '미래', '태엽', 'robot', 'cyber', 'neon', 'mecha'],
};
// 컨셉 글에 직접 쓴 낱말 (예: '얼음 용' → 얼음·용) — 한글 1~4자, 조사·흔한 말은 뺌
const NAME_STOP = new Set(['느낌', '스타일', '배경', '이펙트', '효과', '모양', '알', '돌', '카드', '이미지', '그림', '같은', '있는', '그리고', '많이', '조금', '아주', '매우', '색', '색깔', '주위', '위', '아래', '컨셉', '속', '안', '밖', '옆', '앞', '뒤', '것', '등', '때', '중']);
function conceptWords(concept) {
  return [...new Set((concept || '').split(/[\s,·.!?/()\[\]~"'“”]+/).filter(w => !(w.length > 1 && /(는|운|한|던|된|른|얀|란|은|ㄴ)$/.test(w))).map(w => w.length > 1 ? w.replace(/(의|을|를|이|가|은|는|에|와|과|로|으로|처럼|같은)$/, '') : w)
    .filter(w => /^[가-힣]{1,4}$/.test(w) && !NAME_STOP.has(w)))];
}
// 핵심 단어장: 스킬·역할
const NAME_CORE = {
  pierce: { en: ['피어서', '랜서', '스피어', '드릴', '애로우', '니들', '스팅어'], la: ['하스타', '쿠스피스', '사기타', '필룸'], ko: ['관통자', '창', '꿰뚫는 자', '화살', '창끝', '일격'] },
  accel: { en: ['블리츠', '대셔', '러너', '제트', '로켓', '스프린터', '코멧'], la: ['벨록스', '켈레르', '쿠르소르'], ko: ['질주자', '바람', '섬광', '유성', '총알', '쾌속'] },
  explode: { en: ['버스터', '블라스트', '봄버', '노바', '버스트', '쇼크', '디토네이터'], la: ['프라고르', '루프투라', '엑스플로시오'], ko: ['폭렬', '파괴자', '폭군', '폭풍', '충격', '굉음'] },
  shield: { en: ['가디언', '이지스', '월', '센티널', '바스티온', '포트리스', '워든'], la: ['스쿠툼', '쿠스토스', '무루스', '프라이시디움'], ko: ['수호자', '방패', '방벽', '성벽', '파수꾼', '보루'] },
  thorns: { en: ['쏜', '스파이크', '리벤저', '브램블', '로즈', '레이저'], la: ['스피나', '울토르', '로사', '아쿨레우스'], ko: ['가시', '응징자', '가시덤불', '가시장미', '보복자'] },
  revive: { en: ['피닉스', '리버스', '이터널', '라자루스', '세컨드라이프'], la: ['레낙투스', '이모르탈리스', '레수르겐스'], ko: ['불사조', '부활자', '영원', '환생', '불멸'] },
  split: { en: ['트윈', '스플리터', '미러', '제미니', '에코', '도플'], la: ['게미누스', '디비시오', '스페쿨룸'], ko: ['쌍둥이', '분신', '분열자', '거울', '쌍성'] },
  magnet: { en: ['매그넷', '그래비티', '보텍스', '폴라리스', '어트랙터'], la: ['마그네스', '트락투스', '그라비타스'], ko: ['인력', '자력', '소용돌이', '중력', '끌개'] },
  mark: { en: ['헥서', '커스', '실러', '브랜드', '스티그마'], la: ['시길룸', '말레딕투스', '스티그마'], ko: ['낙인', '봉인자', '저주', '각인', '주술사'] },
  cloak: { en: ['팬텀', '고스트', '베일', '셰이드', '미라주', '스펙터'], la: ['라텐스', '움브라', '팔리둠', '스펙트룸'], ko: ['유령', '은둔자', '그림자', '신기루', '환영'] },
  scout: { en: ['오라클', '워처', '시커', '아이', '레이더', '스카우트'], la: ['오쿨루스', '스페쿨라토르', '비덴스'], ko: ['천리안', '감시자', '눈', '파수꾼', '예언자'] },
  support: { en: ['세이지', '커맨더', '바드', '헤럴드', '캡틴', '케어러'], la: ['두크스', '아욱실리움', '사나토르'], ko: ['인도자', '지휘관', '축복', '수호천사', '치유사'] },
  atk: { en: ['워리어', '버서커', '슬레이어', '헌터', '스트라이커', '브레이커', '레이더', '챔피언'], la: ['벨라토르', '글라디우스', '빅토르', '페르쿠소르'], ko: ['전사', '투사', '사냥꾼', '검객', '돌격대장', '파괴자', '선봉', '정복자'] },
  def: { en: ['나이트', '팔라딘', '키퍼', '워든', '홀더', '가드', '타워', '바리케이드'], la: ['데펜소르', '쿠스토스', '카스텔룸', '프로텍토르'], ko: ['기사', '수문장', '수호기사', '철벽', '방패병', '성채', '버팀목', '보루'] },
  dis: { en: ['트릭스터', '조커', '일루저니스트', '로그', '위치', '팬텀', '퍼펫티어', '미믹'], la: ['돌루스', '프락스', '말레피쿠스', '일루시오'], ko: ['책략가', '마술사', '교란자', '여우', '요술사', '도깨비', '꼭두각시', '훼방꾼'] },
  sup: { en: ['힐러', '세인트', '프리스트', '뮤즈', '엔젤', '오라클', '가이드', '서포터'], la: ['사나토르', '안겔루스', '사케르도스', '아우실리아'], ko: ['치유사', '성자', '사제', '천사', '조력자', '길잡이', '등불', '수호령'] },
  king: { en: ['킹', '로드', '소버린', '모나크', '엠페러'], la: ['렉스', '임페라토르', '도미누스', '레기나'], ko: ['왕', '제왕', '군주', '패왕', '대왕'] },
  none: { en: ['챔피언', '나이트', '워리어', '히어로'], la: ['빅토르', '헤로스', '파틴'], ko: ['전사', '용사', '영웅', '도전자'] },
};
// 역할 꾸밈말: 분위기 단어에 섞어 역할 성격이 이름에 묻어나게
const NAME_ROLE_KA = {
  atk: { ka: ['맹렬한', '거침없는', '날카로운', '사나운', '돌진하는'], en: ['레이지', '퓨리', '스트라이크', '크림슨', '블러드'] },
  def: { ka: ['굳건한', '흔들림 없는', '든든한', '버티는', '꺾이지 않는'], en: ['아이언', '스톤월', '스테디', '포트리스', '불워크'] },
  dis: { ka: ['교활한', '변덕스러운', '알 수 없는', '장난스러운', '뒤틀린'], en: ['트릭', '미스트', '카오스', '퍼즐', '와일드카드'] },
  sup: { ka: ['다정한', '따스한', '헌신적인', '온화한', '빛을 나누는'], en: ['그레이스', '블레스', '하모니', '케어', '헤븐리'] },
  king: { ka: ['위대한', '군림하는', '고귀한', '절대적인'], en: ['로열', '임페리얼', '소버린', '그랜드'] },
};
// 등급 단어: C(일반)는 소박·풋풋하게, SS(전설)로 갈수록 웅장하게. pre = 앞에 붙는 확률
const NAME_GRADE = [
  { ka: ['작은', '새내기', '풋내기', '어린', '수수한', '꼬마'], en: ['리틀', '루키', '주니어', '미니', '베이비'], pre: .4, mood: 'humble' },
  { ka: ['씩씩한', '다부진', '재빠른', '숙련된', '당찬'], en: ['브레이브', '에이스', '스마트', '볼드'], pre: .3 },
  { ka: ['빛나는', '명예로운', '뛰어난', '이름난', '드높은'], en: ['엘리트', '프라임', '노블', '하이'], pre: .3 },
  { ka: ['영웅의', '불굴의', '용맹한', '위대한', '천하무적'], en: ['히어로', '그랜드', '슈프림', '마스터'], pre: .35 },
  { ka: ['전설의', '신화 속', '태초의', '불멸의', '절대'], en: ['레전드', '얼티밋', '이터널', '레전더리', '디바인'], pre: .45 },
];
const NAME_TITLE = { 2: ['프라임', '알파', '마크 II'], 3: ['렉스', '오메가', '아르케', '엑스'], 4: ['렉스', '엠페러', '오메가', '임페라토르', '아스트라', '제로'] };
const NAME_KING = { en: ['킹', '로열', '임페리얼', '소버린'], la: ['렉스', '임페라토르', '도미누스'], ko: ['왕', '제왕', '군주', '패왕'], ka: ['위대한', '고귀한'], title: ['킹', '렉스', '엠페러', '임페라토르', '로드', '소버린'] };
const NAME_STYLES = [
  { ko: '영어식', make: (M, K, p) => p([`${p(M.en)} ${p(K.en)}`, `${p(K.en)} 오브 ${p(M.en)}`]) },
  { ko: '그리스 신화풍', make: (M, K, p) => p([`${p(M.gr || M.en)}의 ${p(K.ko)}`, `${p(M.gr || M.en)} ${p(K.en)}`, `${p(K.en)} ${p(M.gr || M.en)}`]) },
  { ko: '라틴어 섞기', make: (M, K, p) => p([`${p(M.la)} ${p(K.en)}`, `${p(K.la)} ${p(M.la)}`, `${p(M.en)} ${p(K.la)}`]) },
  { ko: '한글 시적 표현', plain: true, make: (M, K, p) => p([`${p(M.ko)}의 ${p(K.ko)}`, `${p(M.ka || M.ko)} ${p(K.ko)}`, `${p(M.ko)} ${p(K.ko)}`]) },
  { ko: '신화 + 한글', plain: true, make: (M, K, p) => `${p(M.gr || M.en)}, ${p(M.ko)}의 ${p(K.ko)}` },
  { ko: '한글 + 영어', make: (M, K, p) => p([`${p(M.ka || M.ko)} ${p(K.en)}`, `${p(M.ko)}의 ${p(K.en)}`]) },
];
// 카드 정보에서 분위기·핵심 단어장 고르기
function namePools({ concept = '', skills = [], role, stone, fx = [], king, t = 0 }) {
  const s = concept.toLowerCase(), moods = [];
  for (const th of pickThemes(concept)) if (th.kw.length) moods.push(th.id);              // 그림 주제 (얼음·불꽃·…)
  for (const [id, kw] of Object.entries(NAME_KW)) if (kw.some(k => s.includes(k))) moods.push(id); // 이름 전용 주제
  for (const f of fx) if (NAME_MOOD[f]) moods.push(f); else if (f === 'spark') moods.push('storm');
  if (isNoble(concept)) moods.push('noble');
  if (!moods.length) moods.push('arcane');
  if (t === 0 && !moods.includes('humble')) moods.push('humble');                           // 일반 등급은 소박한 단어도 가끔
  if (stone === 'black' || stone === 'white') moods.push(stone);                            // 알 색은 보조로
  const cores = [...skills.filter(id => NAME_CORE[id]), ...(role && NAME_CORE[role] ? [role] : []), ...conceptSkills(concept).filter(id => NAME_CORE[id]), ...conceptRoles(concept).filter(id => NAME_CORE[id])];
  if (king && !cores.includes('king')) cores.push('king');
  if (!cores.length) cores.push('none');
  return { moods: [...new Set(moods)], cores: [...new Set(cores)], words: conceptWords(concept) };
}
const NAME_HIST_MAX = 300;
function autoCardName(info, avoid = []) {
  const r = Math.random, p = a => a[Math.floor(r() * a.length)], t = info.t ?? 0, king = !!info.king;
  const { moods, cores, words } = namePools(info), role = info.role, RK = NAME_ROLE_KA[king ? 'king' : role || conceptRoles(info.concept)[0]], GR = NAME_GRADE[Math.min(4, Math.max(0, t))];
  const used = new Set([...LS.get('nameHist', []), ...state.arts.flatMap(a => cardSaves(a).map(s => s.name)).filter(Boolean), ...avoid]);
  let out;
  for (let tries = 0; tries < 40; tries++) {
    // 분위기: 컨셉 주제가 앞쪽이라 조금 더 자주, 알 색 같은 보조 단어도 가끔
    const M = { ...NAME_MOOD[r() < .5 ? moods[0] : p(moods)] };
    // 컨셉에 직접 쓴 낱말을 가끔 그대로 씀 (예: '얼음 용' → '용의 관통자')
    if (words.length && r() < .35) M.ko = words;
    // 역할·등급 꾸밈말을 분위기 단어에 섞음
    if (RK) { M.ka = [...(M.ka || []), ...RK.ka]; M.en = [...M.en, ...RK.en]; }
    M.ka = [...(M.ka || []), ...GR.ka];
    // 핵심: 스킬·역할 중 하나 (역할은 조금 더 자주, 왕이면 왕 단어가 꼭 들어가게)
    const kc = king && r() < .5 ? 'king' : role && NAME_CORE[role] && cores.length > 1 && r() < .4 ? role : p(cores), K = NAME_CORE[kc];
    if (king && kc !== 'king') { M.en = [...M.en, ...NAME_KING.en]; M.ka = [...(M.ka || []), ...NAME_KING.ka]; } // 왕 단어가 두 번 겹치지 않게
    const st = p(NAME_STYLES);
    let name = st.make(M, K, p);
    // 등급 말머리: C는 '새내기·리틀', SS는 '전설의·레전드' 같은 말을 앞에 (한글 이름엔 한글, 외래어 이름엔 외래어)
    const pre = r() < GR.pre ? p(st.plain ? GR.ka : r() < .5 ? GR.ka : GR.en) : '';
    // 이미 꾸밈말로 시작하거나 '~의'가 겹치면 말머리는 생략 (작은 어린 …, 태초의 …의 … 방지)
    if (pre && !name.includes(pre) && !(M.ka || []).some(k => name.startsWith(k)) && !(pre.endsWith('의') && name.includes('의 '))) name = `${pre} ${name}`;
    if (king) { if (!NAME_KING.title.concat(NAME_KING.en, NAME_KING.la, NAME_KING.ko, NAME_CORE.king.en, NAME_CORE.king.ko, NAME_CORE.king.la).some(w => name.includes(w))) name += ' ' + p(NAME_KING.title); }
    else if (!pre && !st.plain && t >= 2 && r() < [0, 0, .3, .45, .6][t]) name += ' ' + p(NAME_TITLE[t]);
    out = { name, style: st.ko, moods, cores, grade: GRADE_INFO[t]?.ko || '' };
    if (!used.has(name)) break;
  }
  LS.set('nameHist', [out.name, ...LS.get('nameHist', []).filter(x => x !== out.name)].slice(0, NAME_HIST_MAX));
  return out;
}
/* ---- 폴더에 저장: 등급_역할_컨셉_스킬_이름(+덧붙인 이름) ---- */
// 왕 카드 여부(이름 자동 생성용): 왕알 그림이거나 역할이 왕
function cmbKing() { const C = state.cmb, art = C.artId === '__temp' ? C.temp : state.arts.find(a => a.id === C.artId); return !!art?.king || C.role === 'king'; }
function cmbFileName() {
  const C = state.cmb, art = C.artId === '__temp' ? C.temp : state.arts.find(a => a.id === C.artId);
  const role = ROLES.find(r => r.id === C.role)?.ko, concept = (art?.concept || '').trim().slice(0, 24);
  const skills = (C.skills || []).map(id => SKILLS.find(s => s.id === id)?.ko).filter(Boolean).join('+');
  // 왕은 역할 칸에서만 나옴 (같은 항목이 두 번 연달아 들어가지 않게 함: 왕_왕 방지)
  return [GRADES[C.t], role, concept, skills, C.name.trim(), ...(C.saveExtras || []).map(x => x.trim()), C.saveNum ? String(C.saveNum) : '', C.savePlus ? 'plus' : ''].filter(Boolean).map(x => x.replace(/[\\/:*?"<>|]+/g, '').replace(/[\s_]+/g, ' ').trim()).filter((x, i, a) => x && x !== a[i - 1]).join('_');
}
function initSaveBox() {
  const C = state.cmb; C.saveExtras ??= [];
  let recent = LS.get('saveFolders', []);
  const showName = () => { $('#svName').textContent = cmbFileName() + '.png'; };
  const renderExtras = () => {
    const box = $('#svExtras'); box.innerHTML = '';
    C.saveExtras.forEach((v, i) => {
      const inp = el('input', { value: v, placeholder: `추가 이름 ${i + 1}` }); inp.oninput = e => { C.saveExtras[i] = e.target.value; showName(); };
      box.append(el('div', { class: 'extra' }, inp, el('button', { class: 'btn sm', type: 'button', title: '빼기', onclick: () => { C.saveExtras.splice(i, 1); renderExtras(); } }, '✕')));
    });
    $('#svAddExtra').hidden = C.saveExtras.length >= 3; showName();
  };
  const renderRecent = () => {
    const sel = $('#svRecent'); sel.innerHTML = '';
    sel.append(el('option', { value: '' }, recent.length ? `최근 저장 폴더 (${recent.length})` : '최근 저장 폴더 없음'));
    recent.forEach(f => sel.append(el('option', { value: f }, f)));
    sel.value = '';
  };
  const remember = f => { recent = [f, ...recent.filter(x => x.toLowerCase() !== f.toLowerCase())].slice(0, 5); LS.set('saveFolders', recent); renderRecent(); };
  const renderSuffix = () => {
    $('#svPlus').classList.toggle('on', !!C.savePlus); $('#svPlus').textContent = C.savePlus ? '✓ _plus 붙음' : 'plus 덧붙이기';
    $('#svNum').classList.toggle('on', !!C.saveNum); $('#svNum').textContent = C.saveNum ? `숫자 ${C.saveNum} → ${C.saveNum + 1}` : '숫자 덧붙이기';
    $('#svNumReset').hidden = !C.saveNum; showName();
  };
  $('#svPlus').onclick = () => { C.savePlus = !C.savePlus; renderSuffix(); };
  $('#svNum').onclick = () => { C.saveNum = (C.saveNum || 0) + 1; renderSuffix(); };
  $('#svNumReset').onclick = () => { C.saveNum = 0; renderSuffix(); };
  renderSuffix(); state.cmbRefreshSuffix = renderSuffix;
  $('#svAddExtra').onclick = () => { if (C.saveExtras.length < 3) { C.saveExtras.push(''); renderExtras(); $('#svExtras').lastChild?.querySelector('input').focus(); } };
  $('#svFolder').value ||= recent[0] || '';
  $('#svRecent').onchange = e => { if (e.target.value) $('#svFolder').value = e.target.value; renderRecent(); };
  const api = async (path, body) => { const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error?.message || r.status); return j; };
  $('#svPick').onclick = async () => { try { const j = await api('/api/pick-folder', { start: $('#svFolder').value }); if (j.folder) $('#svFolder').value = j.folder; } catch (e) { toast('⚠ ' + e.message); } };
  $('#svOpen').onclick = async () => { const f = $('#svFolder').value.trim(); if (!f) return toast('저장 폴더를 먼저 정해 주세요'); try { await api('/api/open-folder', { folder: f }); } catch (e) { toast('⚠ ' + e.message); } };
  const sub = (f, d) => f.replace(/[\\/]+$/, '') + (f.includes('/') && !f.includes('\\') ? '/' : '\\') + d;
  // 저장: card(프레임 조합, 이름 위 스킬 표시는 빼고 저장 — 화면 미리보기에는 그대로 보임) + cardonly(프레임 없는 그림, 같은 위치·확대)
  $('#svSave').onclick = async () => {
    const f = $('#svFolder').value.trim(); if (!f) return toast('저장 폴더를 먼저 정해 주세요');
    const art = await currentArt(); if (!art) return toast('카드 그림을 먼저 고르세요');
    const rec = state.arts.find(x => x.id === C.artId);
    if (rec && cardSaves(rec).length >= MAX_CARD_SAVES) return alert(`이 그림은 이미 카드로 ${MAX_CARD_SAVES}번 저장했습니다.\n더 이상 저장할 수 없습니다. 저장 표시를 눌러 하나를 지운 뒤 다시 저장하세요.`);
    const o = cmbOptions(), name = cmbFileName(), png = cv => cv.toDataURL('image/png').split(',')[1];
    const only = mk(), z = o.zoom || 1; only.getContext('2d').drawImage(art, (W - W * z) / 2 + (o.ox || 0), (H - H * z) / 2 + (o.oy || 0), W * z, H * z);
    try {
      const a = await api('/api/save-file', { folder: sub(f, 'card'), name, data: png(composeCard({ ...o, art, showSkills: false })) });
      const b = await api('/api/save-file', { folder: sub(f, 'cardonly'), name, data: png(only) });
      remember(f); toast('💾 저장했습니다: ' + a.path.split(/[\\/]/).pop() + ' (card + cardonly)');
      if (rec) { // 보관함 그림에 '카드 저장됨' 표시 추가 (지울 때 쓰려고 두 파일 경로도 기록)
        rec.saves = [...cardSaves(rec), { grade: GRADES[C.t], name: C.name.trim(), at: Date.now(), folder: f, card: a.path, only: b.path }];
        DB.put('arts', rec).catch(() => { }); rerenderSaves();
      }
    } catch (e) { toast('⚠ 저장 실패: ' + e.message); }
  };
  // 클리어: 저장 폴더 밑 card · cardonly 의 PNG 전부 삭제 + 모든 그림의 저장 표시 초기화
  $('#svClear').onclick = async () => {
    const f = $('#svFolder').value.trim(); if (!f) return toast('저장 폴더를 먼저 정해 주세요');
    if (!confirm(`정말 클리어할까요?\n\n${sub(f, 'card')}\n${sub(f, 'cardonly')}\n${sub(f, 'jpg')}\n\n위 세 폴더의 카드 그림(PNG · JPG)을 모두 지우고, 보관함 그림의 저장 표시도 모두 초기화합니다.\n되돌릴 수 없습니다.`)) return;
    try {
      const j = await postApi('/api/clear-cards', { folder: f });
      const marked = state.arts.filter(x => cardSaves(x).length);
      for (const x of marked) { x.saves = []; await DB.put('arts', x); }
      toast(`🧹 카드 그림 ${j.count}장 삭제 · 저장 표시 ${marked.length}개 그림 초기화`); rerenderSaves();
    } catch (e) { toast('⚠ 클리어 실패: ' + e.message); }
  };
  // JPG로 전환: cardonly 그림 → 투명한 테두리를 잘라 내고 JPG로 jpg 폴더에 저장 (크기는 4의 배수로 자름, 원본은 그대로)
  $('#svJpg').onclick = async () => {
    const f = $('#svFolder').value.trim(); if (!f) return toast('저장 폴더를 먼저 정해 주세요');
    if (!confirm(`cardonly 그림을 JPG로 전환할까요?

${sub(f, 'cardonly')}
→ ${sub(f, 'jpg')}

· 둘레의 투명한 테두리를 잘라 내고 카드 그림 부분만 JPG로 저장합니다.
· 크기가 4의 배수가 아니면 4의 배수로 맞게 조금 더 잘라 냅니다.
· cardonly 원본은 그대로 두고, jpg 폴더의 같은 이름 파일은 새로 덮어씁니다.`)) return;
    const btn = $('#svJpg'), label = btn.textContent; btn.disabled = true; btn.textContent = '전환 중…';
    try {
      const j = await postApi('/api/convert-cards', { folder: f });
      const mb = n => (n / 1048576).toFixed(1) + 'MB', sizes = Object.entries(j.sizes || {}).map(([k, n]) => `${k}${Object.keys(j.sizes).length > 1 ? ` ${n}장` : ''}`).join(', ');
      toast(`🗜 jpg 폴더에 ${j.count}장 저장${sizes ? ` (${sizes})` : ''} · ${mb(j.before)} → ${mb(j.after)}${j.errors.length ? ` · ⚠ 실패 ${j.errors.length}장` : ''}`);
      if (j.errors.length) console.warn('JPG 전환 실패', j.errors);
    } catch (e) { toast('⚠ JPG 전환 실패: ' + e.message); }
    finally { btn.disabled = false; btn.textContent = label; }
  };
  // 프레임 저장: 지금 프레임 × 등급 5 × 역할 5 = 25장 (그림·이름·스킬 없이)
  $('#svFrames').onclick = async () => {
    const f = $('#svFolder').value.trim(); if (!f) return toast('저장 폴더를 먼저 정해 주세요');
    const C = state.cmb, base = cmbOptions(), fname = (state.frameGroups.find(x => x.id === C.frameId)?.name || 'frame').replace(/[\\/:*?"<>|]+/g, '').replace(/[\s_]+/g, ' ').trim();
    const btn = $('#svFrames'), label = btn.textContent; btn.disabled = true; let n = 0;
    try {
      for (let t = 0; t < 5; t++) for (const r of ROLES) {
        const cv = composeCard({ ...cmbOptions(t), art: null, role: r.id, iconSet: currentIconSet(C.iconId), showName: false, showSkills: false, layout: { ...base.layout, icon: C.layout['icon:' + t] } });
        await api('/api/save-file', { folder: sub(f, 'frame'), name: `${fname}_${GRADES[t]}_${r.ko}`, data: cv.toDataURL('image/png').split(',')[1], overwrite: true });
        btn.textContent = `저장 중… ${++n}/25`;
      }
      remember(f); toast(`🖼 프레임 ${n}장을 frame 폴더에 저장했습니다`);
    } catch (e) { toast('⚠ 프레임 저장 실패: ' + e.message); }
    finally { btn.disabled = false; btn.textContent = label; }
  };
  renderExtras(); renderRecent();
}
let _drawTok = 0;
async function drawCombine(fast) {
  const tok = ++_drawTok, art = await currentArt(); if (tok !== _drawTok) return;
  const boxes = {}, cv = composeCard({ ...cmbOptions(), art, boxes });
  state.cmb.boxes = boxes; renderOverlay(); if ($('#svName')) $('#svName').textContent = cmbFileName() + '.png';
  const g = $('#cCanvas').getContext('2d'); g.clearRect(0, 0, W, H); g.drawImage(cv, 0, 0);
  $$('#cGrade button').forEach((b, i) => b.classList.toggle('on', i === state.cmb.t));
  if (fast) { clearTimeout(drawCombine._t); drawCombine._t = setTimeout(() => drawStrip(art), 250); } else drawStrip(art);
}
function drawStrip(art) {
  const box = $('#cStrip'); box.innerHTML = '';
  GRADES.forEach((gname, t) => {
    const cv = thumbOf(composeCard({ ...cmbOptions(t), art }), 260);
    cv.onclick = () => { state.cmb.t = t; saveCmbView(); drawCombine(); };
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
// 다른 그림을 골라도 마지막에 쓴 프레임 그룹·등급·역할 아이콘·확대·위치를 유지 (새로고침해도 남음)
function saveCmbView() { const C = state.cmb; LS.set('cmbView', { frameId: C.frameId, t: C.t, iconId: C.iconId, role: C.role, zoom: C.zoom, ox: C.ox, oy: C.oy }); }
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
