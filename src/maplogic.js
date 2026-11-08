// Harita yardımcıları: yükseklik/rampa hesabı ve yol bulma.
// Oyun, editör, rastgele üretici ve doğrulama betiği bunu ortak kullanır.

export const CELL = 2;
export const STEP_H = 0.8;
export const CLIMB = 0.3; // misketin tırmanabildiği en yüksek basamak

const RAMP_DIRS = { '>': [0, 1], '<': [0, -1], '^': [-1, 0], 'v': [1, 0] }; // [dr, dc] yükselme yönü

// Her hücre için { flat: h } ya da { ramp: [dr,dc], lo, hi } döndürür.
export function buildHeightInfo(def) {
  const H = def.grid.length, W = def.grid[0].length;
  const hs = def.heights;
  const flat = (r, c) => {
    const ch = hs?.[r]?.[c];
    return ch >= '0' && ch <= '9' ? (ch.charCodeAt(0) - 48) * STEP_H : 0;
  };
  const info = [];
  for (let r = 0; r < H; r++) {
    const row = [];
    for (let c = 0; c < W; c++) {
      const ch = hs?.[r]?.[c];
      if (RAMP_DIRS[ch]) {
        const [dr, dc] = RAMP_DIRS[ch];
        const lo = flat(r - dr, c - dc);
        row.push({ ramp: [dr, dc], lo, hi: lo + STEP_H });
      } else row.push({ flat: flat(r, c) });
    }
    info.push(row);
  }
  return info;
}

// (x, z) dünya konumundaki zemin yüksekliği
export function heightAt(info, x, z) {
  const r = Math.floor(z / CELL), c = Math.floor(x / CELL);
  const cell = info[r]?.[c];
  if (!cell) return 0;
  if (cell.ramp === undefined) return cell.flat;
  const [dr, dc] = cell.ramp;
  const u = dc ? (dc > 0 ? x / CELL - c : 1 - (x / CELL - c)) : (dr > 0 ? z / CELL - r : 1 - (z / CELL - r));
  return cell.lo + (cell.hi - cell.lo) * Math.min(1, Math.max(0, u));
}

// Rampanın eğimi (dh/dx, dh/dz); düz hücrede 0
export function slopeAt(info, x, z) {
  const cell = info[Math.floor(z / CELL)]?.[Math.floor(x / CELL)];
  if (!cell || cell.ramp === undefined) return [0, 0];
  const k = (cell.hi - cell.lo) / CELL;
  return [cell.ramp[1] * k, cell.ramp[0] * k];
}

// Hücrenin bir kenarındaki yükseklik (yol bulma için; rampanın yan kenarı = en yüksek)
function edgeHeight(info, r, c, dr, dc) {
  const cell = info[r][c];
  if (cell.ramp === undefined) return cell.flat;
  const [rr, rc] = cell.ramp;
  if (dr === rr && dc === rc) return cell.hi;
  if (dr === -rr && dc === -rc) return cell.lo;
  return cell.hi;
}

const BLOCK = new Set(['#', 'O', 'L', 'Z', '/', '\\', '=']);

// S'den başlayarak ulaşılabilen hücreler (openGates: açık sayılacak kapı harfleri)
// dash: çatlak duvarlar (W) kırılmış sayılır; climb: tırmanılabilen yükseklik
export function reachable(def, openGates = [], start, { dash = false, climb = CLIMB } = {}) {
  if (def.parkour) return parkourReach(def, openGates, start);
  const g = def.grid, info = buildHeightInfo(def);
  const H = g.length, W = g[0].length;
  if (!start) {
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (g[r][c] === 'S') start = [r, c];
  }
  const seen = new Set();
  if (!start) return seen;
  seen.add(start[0] * W + start[1]);
  const q = [start];
  while (q.length) {
    const [r, c] = q.shift();
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc, ch = g[nr]?.[nc];
      if (!ch || BLOCK.has(ch) || (ch === 'W' && !dash)) continue;
      if ((ch === 'G' || ch === 'H') && !openGates.includes(ch)) continue;
      if (seen.has(nr * W + nc)) continue;
      if (edgeHeight(info, nr, nc, -dr, -dc) > edgeHeight(info, r, c, dr, dc) + climb) continue;
      seen.add(nr * W + nc);
      q.push([nr, nc]);
    }
  }
  return seen;
}

// Parkur: en çok iki boş hücre atlanır, bir basamak yukarı zıplanır; zıplatıcı,
// hareketli platform ve kanca halkası uzak noktaları birbirine bağlar.
function parkourReach(def, openGates, start) {
  const g = def.grid, info = buildHeightInfo(def), H = g.length, W = g[0].length;
  if (!start) for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (g[r][c] === 'S') start = [r, c];
  const seen = new Set();
  if (!start) return seen;
  const solid = (r, c) => {
    const ch = g[r]?.[c];
    return !ch || BLOCK.has(ch) || ((ch === 'G' || ch === 'H') && !openGates.includes(ch));
  };
  const h = (r, c) => info[r][c].flat ?? info[r][c].hi;
  const q = [start];
  seen.add(start[0] * W + start[1]);
  const visit = (r, c) => { const id = r * W + c; if (!solid(r, c) && !seen.has(id)) { seen.add(id); q.push([r, c]); } };
  while (q.length) {
    const [r, c] = q.shift();
    const pad = g[r][c] === 'J';
    const reach = pad ? 6 : 3, up = pad ? 2.6 : 0.9;
    for (let a = -reach; a <= reach; a++) for (let b = -reach; b <= reach; b++) {
      if (Math.abs(a) + Math.abs(b) > reach) continue;
      const nr = r + a, nc = c + b;
      if (solid(nr, nc) || h(nr, nc) > h(r, c) + up) continue;
      visit(nr, nc);
    }
    for (const m of def.movers || []) {
      const near = ([mr, mc]) => Math.abs(mr - r) + Math.abs(mc - c) <= 3 && h(r, c) + 0.9 >= m.h * STEP_H;
      for (const [from, to] of [[m.from, m.to], [m.to, m.from]]) {
        if (!near(from)) continue;
        for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) {
          const nr = to[0] + a, nc = to[1] + b;
          if (Math.abs(a) + Math.abs(b) <= 3 && !solid(nr, nc) && h(nr, nc) <= m.h * STEP_H + 0.9) visit(nr, nc);
        }
      }
    }
    for (const k of def.hooks || []) {
      if (Math.abs(k.at[0] - r) + Math.abs(k.at[1] - c) > 8) continue;
      for (let a = -8; a <= 8; a++) for (let b = -8; b <= 8; b++) if (Math.abs(a) + Math.abs(b) <= 8) visit(k.at[0] + a, k.at[1] + b);
    }
  }
  return seen;
}

export function findAll(def, chars) {
  const out = [];
  def.grid.forEach((row, r) => [...row].forEach((ch, c) => { if (chars.includes(ch)) out.push([r, c, ch]); }));
  return out;
}

// Bir haritanın oynanabilir olup olmadığını kontrol eder; sorunları Türkçe döndürür.
export function validateLevel(def) {
  const problems = [];
  const g = def.grid, W = g[0].length;
  g.forEach((row, r) => { if (row.length !== W) problems.push(`${r + 1}. satırın uzunluğu farklı`); });
  if (def.heights && def.heights.length !== g.length) problems.push('Yükseklik haritası satır sayısı farklı');
  const S = findAll(def, 'S'), E = findAll(def, 'E');
  if (S.length !== 1) problems.push('Tam olarak bir başlangıç (S) olmalı');
  if (!def.noExit && E.length !== 1) problems.push('Tam olarak bir çıkış çukuru (E) olmalı');
  if (problems.length) return problems;
  const gates = Object.keys(def.gates || {});
  const all = reachable(def, gates);
  const has = (set, r, c) => set.has(r * W + c);
  if (!def.noExit && !has(all, E[0][0], E[0][1])) problems.push('Çıkış çukuruna ulaşılamıyor');
  // Gizli yerler yetenek gerektirebilir: atılma ve çift zıplama açık sayılır
  const secret = reachable(def, gates, undefined, { dash: true, climb: 1.7 });
  for (const [r, c, ch] of findAll(def, '123456789*+k$')) {
    if (!has(secret, r, c)) problems.push(`(${r},${c}) konumundaki "${ch}" nesnesine ulaşılamıyor`);
  }
  for (const list of [def.details, def.npcs, def.signs, def.jokers, def.portals, def.pickups, def.cogs, def.crowd, def.scares]) {
    for (const o of list || []) {
      if (!has(secret, o.at[0], o.at[1])) problems.push(`(${o.at[0]},${o.at[1]}) konumundaki "${o.id || o.type || o.to}" ögesine ulaşılamıyor`);
    }
  }
  const closed = reachable(def, []);
  const adj = (set, r, c) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => has(set, r + a, c + b));
  for (const [r, c, ch] of findAll(def, 'GH')) {
    const before = ch === 'G' ? closed : reachable(def, ['G']);
    if (!def.parkour && !adj(before, r, c)) problems.push(`"${ch}" kapısına ulaşılamıyor`);
    const gate = def.gates?.[ch];
    if (!gate) { problems.push(`"${ch}" kapısı tanımlı değil`); continue; }
    if (gate.type === 'keys') {
      // Anahtarların hepsi kapı açılmadan bulunabilmeli
      const need = findAll(def, 'k').filter(([kr, kc]) => !has(before, kr, kc));
      if (need.length) problems.push(`"${ch}" kapısının ${need.length} anahtarı kapının arkasında kalıyor`);
    }
  }
  return problems;
}
