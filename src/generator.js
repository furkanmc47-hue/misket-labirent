// Sonsuz Mod için rastgele labirent üretici.
// Tur ilerledikçe labirent büyür, düşman ve tuzak sayısı artar.
import { THEMES } from './levels.js';
import { validateLevel } from './maplogic.js';

// hunt: mücevher avı haritası (kapı ve çıkış yok, bol mücevher, açık koridorlar)
export function generateLevel(round, { hunt = false } = {}) {
  for (let tries = 0; tries < 30; tries++) {
    const def = tryGenerate(round, hunt);
    if (def && validateLevel(def).length === 0) return def;
  }
  throw new Error('Labirent üretilemedi');
}

function tryGenerate(round, hunt) {
  const rand = Math.random;
  const n = Math.min(5 + round, 13);           // hücre sayısı (bir kenar)
  const W = 2 * n + 1, H = W;
  const g = Array.from({ length: H }, () => Array(W).fill('#'));

  // Derinlik öncelikli arama ile kusursuz labirent
  const stack = [[1, 1]];
  g[1][1] = '.';
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const nb = [[2, 0], [-2, 0], [0, 2], [0, -2]]
      .map(([dr, dc]) => [r + dr, c + dc, r + dr / 2, c + dc / 2])
      .filter(([nr, nc]) => nr > 0 && nc > 0 && nr < H - 1 && nc < W - 1 && g[nr][nc] === '#');
    if (!nb.length) { stack.pop(); continue; }
    const [nr, nc, wr, wc] = nb[Math.floor(rand() * nb.length)];
    g[wr][wc] = '.'; g[nr][nc] = '.';
    stack.push([nr, nc]);
  }

  // Başlangıçtan uzaklıklar; çıkış en uzak hücre
  const dist = Array.from({ length: H }, () => Array(W).fill(-1));
  const prev = {};
  const q = [[1, 1]];
  dist[1][1] = 0;
  let far = [1, 1];
  while (q.length) {
    const [r, c] = q.shift();
    if (dist[r][c] > dist[far[0]][far[1]]) far = [r, c];
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc;
      if (g[nr][nc] !== '#' && dist[nr][nc] < 0) { dist[nr][nc] = dist[r][c] + 1; prev[nr * W + nc] = [r, c]; q.push([nr, nc]); }
    }
  }
  const path = [];
  for (let p = far; p; p = prev[p[0] * W + p[1]]) path.unshift(p);
  if (path.length < 10) return null;

  g[1][1] = 'S';
  if (hunt) {
    // Kör koridorları azalt ki oyuncular birbirini kovalayabilsin
    for (let r = 1; r < H - 1; r++) for (let c = 1; c < W - 1; c++) {
      if (g[r][c] === '#' && (r % 2) !== (c % 2) && rand() < 0.22) g[r][c] = '.';
    }
    return huntLevel(g, W, H, round, rand);
  }
  g[far[0]][far[1]] = 'E';

  // Kapı: yolun %65'i civarında, iki komşulu bir geçit hücresinde
  let gate = null;
  for (let i = Math.floor(path.length * 0.65); i < path.length - 2; i++) {
    const [r, c] = path[i];
    if ((r % 2) !== (c % 2)) { gate = [r, c]; break; }
  }
  if (!gate) return null;
  g[gate[0]][gate[1]] = 'G';

  // Kapı kapalıyken ulaşılabilen hücreler
  const before = new Set([W + 1]);
  const bq = [[1, 1]];
  while (bq.length) {
    const [r, c] = bq.shift();
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc;
      if (g[nr][nc] === '.' && !before.has(nr * W + nc)) { before.add(nr * W + nc); bq.push([nr, nc]); }
    }
  }
  const pathSet = new Set(path.map(([r, c]) => r * W + c));
  const free = [], deadEnds = [];
  for (let r = 1; r < H - 1; r++) for (let c = 1; c < W - 1; c++) {
    if (g[r][c] !== '.' || dist[r][c] < 3) continue;
    free.push([r, c]);
    const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dr, dc]) => g[r + dr][c + dc] !== '#').length;
    if (open === 1) deadEnds.push([r, c]);
  }
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const used = new Set();
  const take = (list, filter = () => true) => {
    const p = shuffle([...list]).find(([r, c]) => !used.has(r * W + c) && g[r][c] === '.' && filter(r, c));
    if (p) used.add(p[0] * W + p[1]);
    return p;
  };
  const isBefore = (r, c) => before.has(r * W + c);

  // Kapının anahtar parçaları (kapıdan önce, tercihen çıkmaz sokaklarda)
  for (let i = 0; i < 3; i++) {
    const p = take(deadEnds, isBefore) || take(free, isBefore);
    if (!p) return null;
    g[p[0]][p[1]] = 'k';
  }
  // Mücevherler, kalpler, güçlendirmeler
  for (let i = 0; i < 3; i++) { const p = take(deadEnds) || take(free); if (p) g[p[0]][p[1]] = '*'; }
  for (let i = 0; i < 1 + (round > 3 ? 1 : 0); i++) { const p = take(free); if (p) g[p[0]][p[1]] = '+'; }
  const powerups = [];
  const kinds = ['speed', 'shield', 'magnet', 'freeze'];
  for (let i = 0; i < 1 + Math.floor(round / 3); i++) {
    const p = take(free);
    if (p) powerups.push({ at: p, type: kinds[Math.floor(rand() * kinds.length)] });
  }
  // Dikenler ve çöken zeminler (ana yol üzerinde)
  for (let i = 0; i < Math.min(2 + round, 12); i++) {
    const p = take(free, (r, c) => pathSet.has(r * W + c));
    if (p) g[p[0]][p[1]] = round > 2 && rand() < 0.35 ? 'K' : 'X';
  }
  // Devriyeler: en az 4 hücrelik düz koridorlar
  const runs = [];
  for (let r = 1; r < H - 1; r++) for (let c = 1; c < W - 1; c++) {
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      if (g[r - dr]?.[c - dc] !== '#' || g[r][c] === '#' || g[r][c] === 'G') continue;
      let len = 0;
      while (g[r + dr * len]?.[c + dc * len] && !'#G'.includes(g[r + dr * len][c + dc * len])) len++;
      if (len >= 4 && Math.abs(r - 1) + Math.abs(c - 1) > 4) runs.push({ from: [r, c], to: [r + dr * (len - 1), c + dc * (len - 1)] });
    }
  }
  const patrols = shuffle(runs).slice(0, Math.min(1 + Math.floor(round / 2), 5))
    .map(p => ({ ...p, speed: 2.2 + Math.min(round, 8) * 0.2 }));
  // Uzaylılar
  const chasers = [];
  for (let i = 0; i < (round >= 2 ? 1 + Math.floor(round / 4) : 0); i++) {
    const p = take(deadEnds, (r, c) => dist[r][c] > 10) ;
    if (p) chasers.push({ at: p, speed: 2.6 + Math.min(round, 10) * 0.12, range: 7 + Math.min(round, 8) });
  }

  const theme = THEMES[Math.floor(rand() * THEMES.length)];
  return {
    id: 'sonsuz',
    title: `Sonsuz Labirent · Tur ${round}`,
    goal: 'Rastgele bir labirent! 3 anahtar parçasını bul, kapıyı aç, çukura atla.',
    theme,
    par: 20 + path.length * 1.6,
    grid: g.map(row => row.join('')),
    gates: { G: { type: 'keys', title: 'Anahtar Kapısı', q: 'Bu kapı için 3 anahtar parçası gerekiyor.' } },
    patrols, chasers, powerups,
  };
}

function huntLevel(g, W, H, round, rand) {
  const free = [];
  for (let r = 1; r < H - 1; r++) for (let c = 1; c < W - 1; c++) if (g[r][c] === '.' && r + c > 4) free.push([r, c]);
  for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
  const gems = Math.min(24, Math.floor(free.length / 5));
  for (let i = 0; i < gems; i++) g[free[i][0]][free[i][1]] = '*';
  return {
    id: 'av',
    title: 'Mücevher Avı',
    goal: 'Süre bitmeden en çok mücevheri sen topla! Jokerlerle rakiplerini yavaşlat.',
    theme: THEMES[Math.floor(rand() * THEMES.length)],
    noExit: true,
    par: 120,
    grid: g.map(row => row.join('')),
    powerups: [], patrols: [],
    chasers: free[gems] ? [{ at: free[gems], speed: 2.6 + Math.min(round, 6) * 0.1, range: 8 }] : [],
  };
}
