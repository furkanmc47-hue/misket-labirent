// ------------------------------------------------------------------
// Labirent haritaları
//  #  duvar          .  zemin           S  başlangıç       E  çıkış çukuru
//  O  tuzak deliği   C  kontrol noktası 1-9 ipucu kristali  *  gizli mücevher
//  X  diken tuzağı   +  can (kalp)      K  çöken zemin
//  B  itilebilir kutu   P  basınç plakası
//  /  \  döner ayna (çarpınca 90° döner)   L  lazer kaynağı   Z  lazer alıcısı
//  G/H kilitli kapı (türü gates içinde: keys, switch, plates, simon, laser)
//  k  anahtar parçası   W  çatlak duvar (atılmayla kırılır)
//  r y e b  renkli düğmeler (kırmızı, sarı, yeşil, mavi)
//
// heights (isteğe bağlı, grid ile aynı boyutta):
//  0-4  düz zemin yüksekliği (her basamak 0.8 birim)
//  > < ^ v  rampa: o yöne doğru bir basamak yükselir
//
// patrols:  iki hücre arasında gidip gelen dikenli toplar
// chasers:  misketi kovalayan gölgeler
// powerups: speed (hız), shield (kalkan), magnet (mıknatıs), freeze (dondur)
// jokers:   ❄️ ice (buz), ⚡ electric (elektrik) joker kutuları
// details:  gizli ayrıntılar (deftere işlenir, haritada görünmez)
// npcs:     konuşulabilen karakterler, signs: okunabilen tabelalar
// par:      3 yıldız için hedef süre (saniye)
// ------------------------------------------------------------------

export { PARKOUR, NIGHT, EXTRA, extraLocked, FINAL_CHOICES } from './adventures.js';

export const LEVELS = [
  {
    id: 'bahce',
    title: 'Yeşil Bahçe',
    goal: 'Dikenlere ve bekçi topa dikkat! Anahtarı bul, kapıyı aç, çukura atla.',
    story: 'Çukurun dibinde kırmızı misket Kızıl seni bekliyordu! Sana havada ikinci kez zıplamayı öğretti. "Kasabaya dön, anlatacaklarım var," dedi.',
    friend: 0xe63946,
    par: 75,
    theme: { bg: 0x9fd8ef, floor1: 0xeadfc4, floor2: 0xddd0b0, wall: 0x4e8f5c, top: 0x7cc68a, accent: 0xffd166,
             music: { root: 60, scale: 'major', tempo: 104 } },
    grid: [
      '#############',
      '#S....#..*..#',
      '###.#.#.###.#',
      '#...#.X.#...#',
      '#.#######.###',
      '#.#.k.1.#.*.#',
      '#.#.###.###.#',
      '#...###.....#',
      '###########G#',
      '#..X..#..X..#',
      '#.###.#.###.#',
      '#E#.....#.*.#',
      '###W#########',
      '#...........#',
      '#############',
    ],
    clues: {
      1: 'Kapı anahtarla açılır. Bazı duvarlar da sandığın kadar sağlam değil: yetenek kazanınca bu bahçeye geri dön.',
    },
    gates: {
      G: { type: 'keys', title: 'Bahçe Kapısı', q: 'Bu kapı bir anahtar istiyor. Bahçede bir yerlerde olmalı.' },
    },
    details: [
      { id: 'iz', at: [11, 3], kind: 'track' },
      { id: 'plan', at: [13, 9], kind: 'paper' },
    ],
    patrols: [{ from: [7, 7], to: [7, 11], speed: 2.6 }],
    powerups: [{ at: [9, 1], type: 'magnet' }],
  },
  {
    id: 'magara',
    title: 'Tuzak Mağarası',
    goal: 'Deliklere ve çöken zemine dikkat, uzaylıdan kaç! 3 anahtar parçasını topla.',
    story: 'Mağaranın çukurunda sarı misket Limon hapşırıyordu. Sana atılmayı öğretti: Shift\'e bas, çatlak duvarlar dayanmaz.',
    friend: 0xffb703,
    par: 150,
    theme: { bg: 0x2b2440, floor1: 0x8a8fa8, floor2: 0x7b8098, wall: 0x6b4fa0, top: 0x9b7fd4, accent: 0x4cc9f0,
             music: { root: 57, scale: 'minor', tempo: 96 } },
    grid: [
      '#####################',
      '#S..#.....#.......k.#',
      '###.#.###.#.#######.#',
      '#...#.*.#...#.....#.#',
      '#.#####.#####.###.#.#',
      '#.....#..+..#...#...#',
      '#####.#####.###.#####',
      '#..1........C.......#',
      '#.OO..O..OO...O..OO.#',
      '#..O..O.KKO*.OO..O..#',
      '#.O..O..O.KK.O....O.#',
      '#..k...O..O.O...O...#',
      '#################.###',
      '#...................#',
      '#...................#',
      '#...................#',
      '#.*.................#',
      '##########.##########',
      '#k..X..X...G.X..X..E#',
      '#####################',
    ],
    clues: {
      1: 'Üç anahtar parçası mağaraya dağılmış. Biri en kuzeyde, biri deliklerin ötesinde, biri de kapıya giden koridorun dibinde.',
    },
    gates: {
      G: { type: 'keys', title: 'Mağara Kapısı', q: 'Bu kapı üç anahtar parçası istiyor.' },
    },
    details: [
      { id: 'mendil', at: [3, 7], kind: 'cloth' },
      { id: 'pembe_dugme', at: [5, 19], kind: 'button' },
    ],
    sliders: [
      { row: 14, from: 1, to: 19, len: 3, speed: 1.8, phase: 0 },
      { row: 15, from: 1, to: 19, len: 3, speed: 1.4, phase: Math.PI },
      { row: 16, from: 1, to: 19, len: 4, speed: 1.0, phase: 1.5 },
    ],
    patrols: [
      { from: [7, 8], to: [11, 8], speed: 2.4 },
      { from: [7, 15], to: [11, 15], speed: 2.0 },
      { from: [13, 1], to: [13, 19], speed: 3.2 },
    ],
    chasers: [{ at: [3, 15], speed: 3.0, range: 12 }],
    powerups: [{ at: [7, 1], type: 'shield' }, { at: [5, 14], type: 'freeze' }],
  },
  {
    id: 'tapinak',
    title: 'Gökkuşağı Tapınağı',
    goal: 'Dört renkli düğmenin hepsine bas, uzaylılardan kaç, dönen çubukları aş, anahtarları topla!',
    story: 'Tapınağın derinliklerinde yeşil misket Nane\'yi buldun. Sana bir büyüteç verdi: artık küçük ayrıntılar yakındayken hafifçe parlıyor.',
    friend: 0x2a9d8f,
    par: 210,
    theme: { bg: 0xf3c08e, floor1: 0x2f6f73, floor2: 0x296367, wall: 0xd9a441, top: 0xf3cf78, accent: 0xff5d8f,
             music: { root: 62, scale: 'dorian', tempo: 112 } },
    grid: [
      '#######################',
      '#S......#.....#.*....r#',
      '#.#####.#.###.#.####.##',
      '#.#..1#.#.#y#.#.......#',
      '#.#.###.#.#.#.#.#####.#',
      '#.#..+..#...#.........#',
      '#.##.########.#########',
      '#.........#...#......e#',
      '###.#####.#.###.#######',
      '#b..............#.....#',
      '#######.#####.###.###.#',
      '#.....#...........#...#',
      '#.###.###.#####.###.###',
      '#.+.#.....#..*........#',
      '###############G#######',
      '#OO......O...O.......O#',
      '#O...........C.......O#',
      '#.k.......O...........#',
      '#O...................O#',
      '#OO*.....O.O.....OO..O#',
      '##########.############',
      '#k..X..X...H..X..X...E#',
      '#######################',
    ],
    clues: {
      1: 'Taş kapı dört renkli düğmeye de basılınca açılır. Sıra önemli değil. Çok oyunculuda herkes bir düğmeye koşabilir.',
    },
    gates: {
      G: { type: 'switch', title: 'Taş Kapı', q: 'Bu kapı dört renkli düğmenin hepsine basılınca açılır.' },
      H: { type: 'keys', title: 'Tapınak Kapısı', q: 'Bu kapı iki anahtar parçası istiyor.' },
    },
    switches: { order: ['r', 'y', 'e', 'b'], gate: 'G', any: true },
    details: [{ id: 'fener_cam', at: [11, 1], kind: 'glass' }],
    jokers: [{ at: [9, 8], type: 'ice' }, { at: [18, 5], type: 'electric' }],
    spinners: [
      { row: 17, col: 16, len: 4.2, speed: 1.8 },
      { row: 17, col: 9, len: 4.2, speed: -2.2 },
    ],
    patrols: [
      { from: [9, 2], to: [9, 9], speed: 3.2 },
      { from: [7, 1], to: [7, 9], speed: 2.8 },
    ],
    chasers: [
      { at: [11, 10], speed: 3.0, range: 6 },
      { at: [5, 18], speed: 2.6, range: 5 },
    ],
    powerups: [{ at: [7, 5], type: 'magnet' }, { at: [11, 12], type: 'freeze' }],
  },
  {
    id: 'vadi',
    title: 'Rampa Vadisi',
    goal: 'Rampadan sırta tırman, düşmeden ilerle! Kutuları plakaların üstüne it (T: kutuları sıfırla).',
    story: 'Vadinin dibinde mavi misket Gök seni görünce sevinçle zıpladı. Sana süzülmeyi öğretti. "Son arkadaşımız kalede, Bilye!"',
    friend: 0x3a86ff,
    par: 150,
    theme: { bg: 0xb7e4c7, floor1: 0xc9b38c, floor2: 0xbba57d, wall: 0x8d6e4a, top: 0xb08d63, accent: 0xff9f1c,
             music: { root: 59, scale: 'mixolydian', tempo: 118 } },
    grid: [
      '#####################',
      '#S.......+.1.......*#',
      '#...................#',
      '#.........*..X......#',
      '#..................*#',
      '#...................#',
      '#...................#',
      '##################.##',
      '#...................#',
      '#...B...............#',
      '#.....P.......P.....#',
      '#...............B...#',
      '#...................#',
      '##########G##########',
      '#*.................E#',
      '#####################',
    ],
    heights: [
      '000000000000000000000',
      '000000000000000000000',
      '000000000000000000000',
      '000>111111111111>2200',
      '000000000000000000200',
      '000200000000000000200',
      '000000000000000000200',
      '000000000000000000200',
      '000000000000000000000',
      '000000000000000000000',
      '000000000000000000000',
      '000000000000000000000',
      '000000000000000000000',
      '000000000000000000000',
      '000000000000000000000',
      '000000000000000000000',
    ],
    clues: {
      1: 'Sırta rampadan çık ve sağdaki kuleden aşağı atla. Aşağıda iki kutuyu parlayan plakalara itince kapı açılır.',
    },
    gates: {
      G: { type: 'plates', title: 'Plaka Kapısı', q: 'Bu kapı, iki basınç plakasının üstünde de kutu olunca açılır.' },
    },
    details: [{ id: 'sozlesme', at: [5, 3], kind: 'paper' }],
    patrols: [{ from: [12, 1], to: [12, 19], speed: 3.0 }],
    powerups: [{ at: [1, 5], type: 'speed' }, { at: [8, 10], type: 'shield' }],
  },
  {
    id: 'kale',
    title: 'Lazer Kalesi',
    goal: 'Hafıza kapısının sırasını tekrarla, aynaları çevirip lazeri alıcıya ulaştır!',
    story: 'Kalenin çukurunda mor misket Erik özgür kaldı. Lazerler söndü ama taht odasında Gölge Kral\'dan iz yoktu. Gerçekten kimse yoktu.',
    friend: 0x9b5de5,
    par: 240,
    theme: { bg: 0x1d2b3a, floor1: 0x4a5568, floor2: 0x3f4a5c, wall: 0x2d3748, top: 0x718096, accent: 0xf72585,
             music: { root: 55, scale: 'phrygian', tempo: 126 } },
    grid: [
      '#######################',
      '#S....#.........#.....#',
      '#.....#..r...y..#..*..#',
      '#..1..+.........#.....#',
      '#.....#..e...b..#.....#',
      '#.....#.........#.....#',
      '###########G#######.###',
      '#.....................#',
      '#L....../.............#',
      '#.....................#',
      '#...2..........\\.....Z#',
      '#.....................#',
      '#......./......\\......#',
      '#.....................#',
      '###########H###########',
      '#*...X.....C...X..X..E#',
      '#######################',
    ],
    clues: {
      1: 'Altın kapıya dokun: düğmeler bir sıra gösterecek. Aynı sırayla düğmelerin üstünden geç.',
      2: 'Aynalara çarpınca dönerler. Lazer ışınını sağdaki alıcıya ulaştırırsan son kapı açılır.',
    },
    gates: {
      G: { type: 'simon', title: 'Hafıza Kapısı', q: 'Düğmelerin yanış sırasını izle ve tekrarla!', length: 5 },
      H: { type: 'laser', title: 'Lazer Kapısı', q: 'Bu kapı lazer alıcısına ışın ulaşınca açılır.' },
    },
    lasers: [{ dir: 'E' }],
    details: [
      { id: 'zarf', at: [2, 20], kind: 'paper' },
      { id: 'cep_saati', at: [13, 1], kind: 'watch' },
      { id: 'lanet_kale', at: [4, 2], kind: 'paper', humanOnly: true },
    ],
    jokers: [{ at: [9, 10], type: 'ice' }],
    patrols: [{ from: [15, 2], to: [15, 20], speed: 3.5 }],
    chasers: [
      { at: [11, 18], speed: 3.6, range: 12 },
      { at: [7, 3], speed: 3.2, range: 10 },
    ],
    powerups: [{ at: [13, 11], type: 'freeze' }, { at: [4, 19], type: 'shield' }, { at: [1, 10], type: 'magnet' }],
  },
];

export const THEMES = LEVELS.map(l => l.theme);

// Misket Kasabası: labirent olmayan açık dünya. Labirentlere yalnızca ışınlanma kapılarından gidilir.
//  =  görünmez katı hücre (ev, ağaç, gölet; görünümü decor ile çizilir)
// npcs.from: karakter o kadar arkadaş kurtarıldıktan sonra görünür
function buildHub() {
  const H = 45, W = 61;
  const grid = Array.from({ length: H }, (_, r) => Array.from({ length: W }, (_, c) => (r === 0 || c === 0 || r === H - 1 || c === W - 1 ? '#' : '.')));
  const heights = Array.from({ length: H }, () => Array(W).fill('0'));
  const decor = [];
  const fill = (r0, c0, rows, cols, ch = '=') => { for (let r = r0; r < r0 + rows; r++) for (let c = c0; c < c0 + cols; c++) grid[r][c] = ch; };
  const house = (r, c, rows, cols, color, roof) => { fill(r, c, rows, cols); decor.push({ kind: 'house', at: [r, c], size: [rows, cols], color, roof }); };
  const stone = (r, c, rows, cols) => { fill(r, c, rows, cols); decor.push({ kind: 'stone', at: [r, c], size: [rows, cols] }); };

  // Belediye binası: içine yalnızca doğu duvarının çatlak yerinden girilir
  stone(6, 24, 1, 13); stone(12, 24, 1, 13); stone(7, 24, 5, 1); stone(7, 36, 2, 1); stone(10, 36, 2, 1);
  grid[9][36] = 'W';
  decor.push({ kind: 'hallfront', at: [13, 30] });
  // Evler
  house(16, 6, 3, 4, 0xf1e2c4, 0xc1503a);
  house(25, 6, 3, 3, 0xcfe8f5, 0x3b6ea5);
  house(16, 48, 3, 4, 0xf7d9c4, 0x8a5a2b);
  house(27, 50, 3, 3, 0xe8e0a8, 0xc1503a);
  house(38, 30, 3, 4, 0xe6d3f0, 0x6b4fa0);
  // Gölet
  fill(29, 15, 5, 6);
  decor.push({ kind: 'pond', at: [29, 15], size: [5, 6] });
  // Saat kulesi: yerden iki basamak yüksek taş; ancak çift zıplamayla çıkılır
  for (let r = 8; r <= 10; r++) for (let c = 8; c <= 10; c++) heights[r][c] = '2';
  grid[9][9] = '=';
  // Kuzeydoğu tepesi: güneyindeki rampadan çıkılır
  for (let r = 5; r <= 14; r++) for (let c = 46; c <= 58; c++) heights[r][c] = '1';
  for (let c = 50; c <= 54; c++) heights[15][c] = '^';

  const portals = [
    { at: [36, 10], to: 0 }, { at: [40, 22], to: 1 }, { at: [34, 40], to: 2 }, { at: [36, 54], to: 3 }, { at: [9, 52], to: 4 },
    { at: [16, 30], to: 'court' },
    { at: [6, 14], to: 'p0' }, { at: [40, 34], to: 'p1' }, { at: [24, 54], to: 'p2' },
    // Yalnızca insan formundayken görünür
    { at: [18, 18], to: 'n0', human: true }, { at: [3, 44], to: 'n1', human: true }, { at: [41, 46], to: 'n2', human: true }, { at: [4, 22], to: 'n3', human: true },
  ];
  const npcs = [
    { id: 'tombul', at: [20, 34] },
    { id: 'topac', at: [20, 46] },
    { id: 'dugme', at: [20, 12] },
    { id: 'kizil', at: [26, 24], from: 1, wander: true },
    { id: 'limon', at: [28, 30], from: 2, wander: true },
    { id: 'nane', at: [26, 36], from: 3, wander: true },
    { id: 'gok', at: [31, 26], from: 4, wander: true },
    { id: 'erik', at: [31, 34], from: 5, wander: true },
    { id: 'bip', at: [38, 44], from: 3 },
  ];
  const signs = [
    { id: 'hosgeldin', at: [23, 27] },
    { id: 'uyari', at: [14, 22] },
    { id: 'kuzey', at: [3, 30] },
    { id: 'kule', at: [12, 9] },
    { id: 'labirent', at: [24, 33] },
    { id: 'lanet', at: [40, 5] },
  ];
  const details = [
    { id: 'muhur_levha', at: [13, 27], kind: 'plaque' },
    { id: 'fener', at: [9, 30], kind: 'lantern' },
    { id: 'kule_anahtar', at: [8, 10], kind: 'tag' },
    { id: 'lanet_kasaba', at: [42, 4], kind: 'paper', humanOnly: true },
  ];
  decor.push({ kind: 'clock', at: [9, 9] }, { kind: 'statue', at: [19, 26] });

  // Patikalar: meydandan her kapıya
  const paths = [
    [[22, 30], [15, 30]],
    [[22, 30], [28, 20], [36, 10]],
    [[22, 30], [33, 26], [40, 22]],
    [[22, 30], [28, 36], [34, 40]],
    [[22, 30], [28, 46], [36, 54]],
    [[22, 30], [20, 44], [16, 52], [9, 52]],
    [[22, 30], [20, 16], [13, 9]],
  ];
  const nearPath = (r, c, m) => paths.some(p => p.some((pt, i) => {
    if (i === p.length - 1) return false;
    const dr = p[i + 1][0] - pt[0], dc = p[i + 1][1] - pt[1];
    const t = Math.max(0, Math.min(1, ((r - pt[0]) * dr + (c - pt[1]) * dc) / (dr * dr + dc * dc)));
    return Math.hypot(r - pt[0] - dr * t, c - pt[1] - dc * t) < m;
  }));

  // Ağaçlar, çalılar ve taşlar: sabit tohumla dağılır, yollar ve kapı çevreleri boş kalır
  const keep = [...portals, ...npcs, ...signs, ...details, { at: [22, 30] }];
  const clear = (r, c, m) => keep.every(o => Math.abs(o.at[0] - r) > m || Math.abs(o.at[1] - c) > m);
  let seed = 1907;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const spot = () => {
    const r = 2 + Math.floor(rnd() * (H - 4)), c = 2 + Math.floor(rnd() * (W - 4));
    const free = grid[r][c] === '.' && heights[r][c] === '0' && clear(r, c, 2) && !nearPath(r, c, 2.2);
    const nearPlaza = Math.abs(r - 22) < 8 && Math.abs(c - 30) < 13;
    const nearHall = Math.abs(r - 10) < 7 && Math.abs(c - 30) < 11;
    return free && !nearPlaza && !nearHall ? [r, c] : null;
  };
  for (let i = 0; i < 110; i++) {
    const at = spot();
    if (!at) continue;
    grid[at[0]][at[1]] = '=';
    decor.push({ kind: 'tree', at, scale: 0.9 + rnd() * 0.65, color: [0x5ea24a, 0x4f9a55, 0x76ae4a, 0x8db451][Math.floor(rnd() * 4)] });
  }
  for (let i = 0; i < 40; i++) {
    const at = spot();
    if (!at) continue;
    grid[at[0]][at[1]] = '=';
    decor.push(i % 2 ? { kind: 'rock', at, scale: 0.7 + rnd() * 0.8 } : { kind: 'bush', at });
  }
  // Konuşmayan kasabalılar: meydanda ve yollarda yuvarlanıp dururlar
  const crowd = [];
  const colors = [0xd97b5f, 0x6fb3d2, 0xc9a0dc, 0x88c070, 0xe0c060, 0x8e8e9e, 0xe08fa0, 0x70c0b0, 0xb08050, 0x9090d0];
  for (let i = 0; i < 36; i++) {
    const near = i < 22;
    const r = near ? 16 + Math.floor(rnd() * 15) : 3 + Math.floor(rnd() * 38), c = near ? 18 + Math.floor(rnd() * 25) : 3 + Math.floor(rnd() * 54);
    if (grid[r][c] !== '.' || heights[r][c] !== '0' || !clear(r, c, 1)) continue;
    crowd.push({ at: [r, c], color: colors[i % colors.length], scale: 0.7 + rnd() * 0.5 });
  }
  // Meydan lambaları ve sınır çitleri
  for (const at of [[17, 25], [17, 35], [27, 25], [27, 35]]) { grid[at[0]][at[1]] = '='; decor.push({ kind: 'lamp', at }); }
  decor.push({ kind: 'fence', from: [1, 1], to: [1, 59] }, { kind: 'fence', from: [43, 1], to: [43, 59] }, { kind: 'fence', from: [1, 1], to: [43, 1] }, { kind: 'fence', from: [1, 59], to: [43, 59] });
  grid[22][30] = 'S';
  return { grid: grid.map(r => r.join('')), heights: heights.map(r => r.join('')), decor, portals, npcs, signs, details, paths, crowd };
}

export const HUB = {
  id: 'kasaba',
  hub: true,
  noExit: true,
  title: 'Misket Kasabası',
  goal: 'Dolaş, kasabalılarla konuş (F). Işık sütunları seni labirentlere ışınlar.',
  theme: { bg: 0xc9e6f5, floor1: 0x7fae56, floor2: 0x74a44e, wall: 0x4a7c3c, top: 0x7fae56, accent: 0x4cc9f0,
           music: { root: 65, scale: 'major', tempo: 92 } },
  crackColor: 0xd8c7a6,
  ...buildHub(),
};
