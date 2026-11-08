// Bölüm editörü: labirenti fareyle çiz, test et, kaydet, dışa/içe aktar.
import { THEMES } from './levels.js';
import { validateLevel, reachable } from './maplogic.js';
import { save, persist } from './save.js';

const TOOLS = [
  ['#', 'Duvar', '#4e8f5c'], ['.', 'Zemin', '#e8dcc0'], ['S', 'Başlangıç', '#ffffff'], ['E', 'Çıkış çukuru', '#ffd166'],
  ['O', 'Delik', '#000000'], ['X', 'Diken', '#7a2a2a'], ['K', 'Çöken zemin', '#8a7a60'], ['C', 'Kontrol noktası', '#38d97a'],
  ['+', 'Kalp', '#ff4d6d'], ['*', 'Mücevher', '#ff4fd8'], ['1', 'İpucu 1', '#7ee8ff'], ['2', 'İpucu 2', '#7ee8ff'],
  ['3', 'İpucu 3', '#7ee8ff'], ['G', 'Kilitli kapı', '#c9a227'], ['k', 'Anahtar', '#ffe14d'], ['B', 'Kutu', '#b07a3c'], ['P', 'Plaka', '#888888'],
  ['W', 'Çatlak duvar', '#6d7f5a'], ['A', 'Uzaylı', '#5fe35f'],
];
const ICON = { S: '🔮', E: '🕳', X: '🔪', C: '🚩', '+': '❤', '*': '💎', '1': '1', '2': '2', '3': '3', G: '🔒', k: '🗝', B: '📦', P: '▣', K: '≈', W: '⚡', A: '👽' };
const COLOR = Object.fromEntries(TOOLS.map(([k, , c]) => [k, c]));

let ed = null;        // editör durumu
let hooks = null;

function blank(W, H) {
  return Array.from({ length: H }, (_, r) => Array.from({ length: W }, (_, c) => (r === 0 || c === 0 || r === H - 1 || c === W - 1 ? '#' : '.')));
}

function newState(W = 17, H = 13) {
  const g = blank(W, H);
  g[1][1] = 'S'; g[H - 2][W - 2] = 'E';
  return {
    W, H, grid: g, aliens: [], tool: '#', title: 'Benim Labirentim', theme: 0, editingIndex: -1,
    gateType: 'keys',
    clues: { 1: '', 2: '', 3: '' },
  };
}

export function stateFromDef(def, index = -1) {
  const H = def.grid.length, W = def.grid[0].length;
  const gate = def.gates?.G || {};
  return {
    W, H, grid: def.grid.map(r => [...r]), aliens: (def.chasers || []).map(c => [...c.at]), tool: '#',
    title: def.title, theme: Math.max(0, THEMES.indexOf(def.theme)), editingIndex: index,
    gateType: gate.type === 'plates' ? 'plates' : 'keys',
    clues: { 1: def.clues?.[1] || '', 2: def.clues?.[2] || '', 3: def.clues?.[3] || '' },
  };
}

export function toDef(s) {
  const grid = s.grid.map((row, r) => row.map((ch, c) => (r === 0 || c === 0 || r === s.H - 1 || c === s.W - 1 ? '#' : ch)).join(''));
  const clues = {};
  for (const k of ['1', '2', '3']) if (grid.some(r => r.includes(k))) clues[k] = s.clues[k] || `İpucu ${k}`;
  const gates = {};
  if (grid.some(r => r.includes('G'))) {
    gates.G = s.gateType === 'plates'
      ? { type: 'plates', title: 'Plaka Kapısı', q: 'Kutuları plakaların üstüne it, kapı açılsın.' }
      : { type: 'keys', title: 'Anahtar Kapısı', q: 'Labirentteki bütün anahtarları topla, kapı açılsın.' };
  }
  const def = {
    id: 'ozel', title: s.title || 'Benim Labirentim', goal: 'Kendi yaptığın labirent! Çukura ulaş.',
    theme: THEMES[s.theme] || THEMES[0], grid, clues, gates,
    chasers: s.aliens.map(at => ({ at, speed: 3, range: 10 })),
  };
  def.par = Math.round(30 + reachable(def, ['G']).size * 1.2);
  return def;
}

function build() {
  const root = document.getElementById('editor');
  root.innerHTML = `
    <div class="ed-side panel">
      <h2>🛠 Bölüm Editörü</h2>
      <div class="ed-tools"></div>
      <p class="ed-hint">Sol tık: çiz · Sağ tık: sil<br>Kenarlar her zaman duvardır.</p>
    </div>
    <div class="ed-center"><canvas id="edCanvas"></canvas><div id="edMsg"></div></div>
    <div class="ed-side panel ed-right">
      <label>Ad <input id="edTitle"></label>
      <label>Tema <select id="edTheme">${THEMES.map((t, i) => `<option value="${i}">${['Yeşil Bahçe', 'Tuzak Mağarası', 'Gökkuşağı Tapınağı', 'Rampa Vadisi', 'Lazer Kalesi'][i] || 'Tema ' + (i + 1)}</option>`).join('')}</select></label>
      <div class="ed-row"><label>Genişlik <input id="edW" type="number" min="7" max="35"></label><label>Yükseklik <input id="edH" type="number" min="7" max="35"></label></div>
      <button id="edResize" class="ghost">Boyutu uygula (temizler)</button>
      <h3>Kapı (🔒)</h3>
      <select id="edGateType"><option value="keys">Anahtar parçaları</option><option value="plates">Kutu + plaka</option></select>
      <h3>İpuçları</h3>
      <label>1 <input id="edC1"></label><label>2 <input id="edC2"></label><label>3 <input id="edC3"></label>
      <div class="ed-buttons">
        <button id="edTest">▶ Test et</button>
        <button id="edSave">💾 Kaydet</button>
        <button id="edExport" class="ghost">⬇ Dışa aktar</button>
        <button id="edImport" class="ghost">⬆ İçe aktar</button>
        <button id="edNew" class="ghost">🗋 Yeni</button>
        <button id="edClose" class="ghost">✕ Kapat</button>
      </div>
      <h3>Kayıtlı labirentlerim</h3>
      <ul id="edList"></ul>
      <input id="edFile" type="file" accept=".json,application/json" hidden>
    </div>`;
  const tools = root.querySelector('.ed-tools');
  for (const [k, name] of TOOLS) {
    const b = document.createElement('button');
    b.className = 'ed-tool';
    b.dataset.k = k;
    b.innerHTML = `<span style="background:${COLOR[k]}">${ICON[k] || ''}</span>${name}`;
    b.onclick = () => { ed.tool = k; refreshTools(); };
    tools.appendChild(b);
  }
  const cv = root.querySelector('#edCanvas');
  let painting = 0;
  const paintAt = e => {
    const rect = cv.getBoundingClientRect(), s = cv.width / ed.W;
    const c = Math.floor(((e.clientX - rect.left) / rect.width) * cv.width / s);
    const r = Math.floor(((e.clientY - rect.top) / rect.height) * cv.height / s);
    if (r <= 0 || c <= 0 || r >= ed.H - 1 || c >= ed.W - 1) return;
    const k = painting === 2 ? '.' : ed.tool;
    if (k === 'A') {
      if (painting !== 1 || e.type === 'mousemove') return;
      const i = ed.aliens.findIndex(([ar, ac]) => ar === r && ac === c);
      if (i >= 0) ed.aliens.splice(i, 1); else ed.aliens.push([r, c]);
    } else {
      if (k === 'S' || k === 'E' || /[123]/.test(k)) ed.grid.forEach(row => row.forEach((ch, i) => { if (ch === k) row[i] = '.'; }));
      ed.grid[r][c] = k;
      if (painting === 2) ed.aliens = ed.aliens.filter(([ar, ac]) => ar !== r || ac !== c);
    }
    draw();
  };
  cv.addEventListener('mousedown', e => { painting = e.button === 2 ? 2 : 1; paintAt(e); });
  cv.addEventListener('mousemove', e => { if (painting) paintAt(e); });
  addEventListener('mouseup', () => (painting = 0));
  cv.addEventListener('contextmenu', e => e.preventDefault());

  const bind = (id, key, num) => {
    const el = root.querySelector('#' + id);
    el.oninput = () => { ed[key] = num ? Number(el.value) : el.value; };
  };
  bind('edTitle', 'title'); bind('edTheme', 'theme', true); bind('edGateType', 'gateType');
  for (const k of ['1', '2', '3']) root.querySelector('#edC' + k).oninput = e => { ed.clues[k] = e.target.value; };
  root.querySelector('#edResize').onclick = () => {
    const W = Math.max(7, Math.min(35, Number(root.querySelector('#edW').value) || 17));
    const H = Math.max(7, Math.min(35, Number(root.querySelector('#edH').value) || 13));
    const keep = { ...ed };
    ed = newState(W, H);
    Object.assign(ed, { title: keep.title, theme: keep.theme, gateType: keep.gateType, clues: keep.clues, editingIndex: keep.editingIndex });
    fillForm(); draw();
  };
  root.querySelector('#edTest').onclick = () => {
    const def = toDef(ed), p = validateLevel(def);
    if (p.length) return msg('⚠ ' + p.join(' · '), true);
    hooks.onTest(def);
  };
  root.querySelector('#edSave').onclick = () => {
    const def = toDef(ed), p = validateLevel(def);
    if (p.length) return msg('⚠ Kaydetmeden önce düzelt: ' + p.join(' · '), true);
    if (ed.editingIndex >= 0) save.custom[ed.editingIndex] = def;
    else { save.custom.push(def); ed.editingIndex = save.custom.length - 1; }
    persist(); renderList();
    msg('✅ Kaydedildi! Ana menüdeki "Benim Labirentlerim" bölümünden oynayabilirsin.');
  };
  root.querySelector('#edExport').onclick = () => {
    const blob = new Blob([JSON.stringify(toDef(ed), null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (ed.title || 'labirent').replace(/[^\p{L}\p{N}]+/gu, '-') + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const file = root.querySelector('#edFile');
  root.querySelector('#edImport').onclick = () => file.click();
  file.onchange = async () => {
    try {
      const def = JSON.parse(await file.files[0].text());
      if (!Array.isArray(def.grid)) throw new Error();
      ed = stateFromDef(def); fillForm(); draw();
      msg('📂 Labirent içe aktarıldı.');
    } catch { msg('⚠ Bu dosya bir labirent dosyası değil.', true); }
    file.value = '';
  };
  root.querySelector('#edNew').onclick = () => { ed = newState(); fillForm(); draw(); };
  root.querySelector('#edClose').onclick = () => { root.classList.remove('show'); hooks.onClose(); };
}

function msg(t, bad) {
  const m = document.getElementById('edMsg');
  m.textContent = t;
  m.className = bad ? 'bad' : '';
}

function refreshTools() {
  document.querySelectorAll('.ed-tool').forEach(b => b.classList.toggle('on', b.dataset.k === ed.tool));
}

function fillForm() {
  const q = id => document.getElementById(id);
  q('edTitle').value = ed.title; q('edTheme').value = ed.theme; q('edW').value = ed.W; q('edH').value = ed.H;
  q('edGateType').value = ed.gateType;
  for (const k of ['1', '2', '3']) q('edC' + k).value = ed.clues[k] || '';
  refreshTools();
  msg('');
}

function draw() {
  const cv = document.getElementById('edCanvas');
  const maxW = Math.max(200, innerWidth - 640), maxH = innerHeight - 120;
  const s = Math.max(10, Math.floor(Math.min(maxW / ed.W, maxH / ed.H)));
  cv.width = ed.W * s; cv.height = ed.H * s;
  const g = cv.getContext('2d');
  g.font = `${Math.floor(s * 0.62)}px "Segoe UI Emoji", sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let r = 0; r < ed.H; r++) for (let c = 0; c < ed.W; c++) {
    const ch = ed.grid[r][c];
    g.fillStyle = ch === '#' ? COLOR['#'] : (r + c) % 2 ? '#e8dcc0' : '#ddd0b0';
    g.fillRect(c * s, r * s, s, s);
    if (ch !== '#' && ch !== '.') {
      g.fillStyle = COLOR[ch] || '#999';
      g.globalAlpha = 0.55; g.fillRect(c * s + 2, r * s + 2, s - 4, s - 4); g.globalAlpha = 1;
      g.fillStyle = '#111';
      g.fillText(ICON[ch] || ch, c * s + s / 2, r * s + s / 2 + 1);
    }
  }
  for (const [r, c] of ed.aliens) g.fillText('👽', c * s + s / 2, r * s + s / 2 + 1);
  g.strokeStyle = 'rgba(0,0,0,.12)';
  for (let i = 0; i <= ed.W; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, cv.height); g.stroke(); }
  for (let i = 0; i <= ed.H; i++) { g.beginPath(); g.moveTo(0, i * s); g.lineTo(cv.width, i * s); g.stroke(); }
}

function renderList() {
  const ul = document.getElementById('edList');
  ul.innerHTML = save.custom.length ? '' : '<li class="muted">Henüz kayıtlı labirent yok.</li>';
  save.custom.forEach((def, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${def.title}</span>`;
    const edit = document.createElement('button'); edit.textContent = '✏'; edit.title = 'Düzenle';
    edit.onclick = () => { ed = stateFromDef(def, i); fillForm(); draw(); };
    const del = document.createElement('button'); del.textContent = '🗑'; del.title = 'Sil';
    del.onclick = () => {
      if (!confirm(`"${def.title}" silinsin mi?`)) return;
      save.custom.splice(i, 1); persist();
      if (ed.editingIndex === i) ed.editingIndex = -1;
      renderList();
    };
    li.append(edit, del);
    ul.appendChild(li);
  });
}

export function openEditor(h, keepState = true) {
  hooks = h;
  const root = document.getElementById('editor');
  if (!root.dataset.built) { build(); root.dataset.built = '1'; }
  if (!ed || !keepState) ed = newState();
  fillForm(); draw(); renderList();
  root.classList.add('show');
}
addEventListener('resize', () => { if (ed && document.getElementById('editor')?.classList.contains('show')) draw(); });
