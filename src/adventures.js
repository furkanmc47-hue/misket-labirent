// Labirent dışı bölümler: gökyüzü parkurları ve insan formuyla oynanan gece bölümleri.
//  $  sikke        J  zıplatıcı
// sky:      adalar boşlukta durur, düşen başa döner
// movers:   hareketli platformlar   hooks: kanca halkaları
// monsters: yaratıklar   cogs: kılıçla kırılan dişliler   pickups: eşyalar   scares: ani korkular
const THEMES = {
  sky: { bg: 0x9fd4f5, floor1: 0x7fae56, floor2: 0x74a44e, wall: 0x4a7c3c, top: 0x7fae56, accent: 0xffd166, music: { root: 67, scale: 'major', tempo: 126 } },
  sun: { bg: 0xf7c59f, floor1: 0xd9a066, floor2: 0xcf9559, wall: 0x9c5b34, top: 0xd9a066, accent: 0xff7b54, music: { root: 62, scale: 'mixolydian', tempo: 134 } },
  storm: { bg: 0x7f8fa6, floor1: 0x6d8c7a, floor2: 0x628071, wall: 0x46525f, top: 0x6d8c7a, accent: 0x4cc9f0, music: { root: 57, scale: 'dorian', tempo: 140 } },
  cellar: { bg: 0x050507, floor1: 0x3a3632, floor2: 0x332f2c, wall: 0x2b2522, top: 0x1c1816, accent: 0xb33a3a, music: { root: 45, scale: 'phrygian', tempo: 58 } },
  field: { bg: 0x06080a, floor1: 0x3b3a26, floor2: 0x35341f, wall: 0x2f3a1e, top: 0x46562a, accent: 0xc9a227, music: { root: 43, scale: 'minor', tempo: 54 } },
  work: { bg: 0x070506, floor1: 0x40352c, floor2: 0x382e26, wall: 0x332a24, top: 0x1f1a16, accent: 0xd97c2b, music: { root: 41, scale: 'phrygian', tempo: 64 } },
  tower: { bg: 0x05040a, floor1: 0x34323f, floor2: 0x2d2b37, wall: 0x2a2835, top: 0x191822, accent: 0x8a5cf0, music: { root: 40, scale: 'phrygian', tempo: 72 } },
};

// Boş bir harita ve üstüne oyma yardımcıları
function canvas(W, H, fillCh) {
  const grid = Array.from({ length: H }, (_, r) => Array.from({ length: W }, (_, c) => (r === 0 || c === 0 || r === H - 1 || c === W - 1 ? '#' : fillCh)));
  const heights = Array.from({ length: H }, () => Array(W).fill('0'));
  return {
    grid, heights,
    plat(r, c, rows, cols, h = 0, ch = '.') {
      for (let a = r; a < r + rows; a++) for (let b = c; b < c + cols; b++) { grid[a][b] = ch; heights[a][b] = String(h); }
    },
    put(r, c, ch) { grid[r][c] = ch; },
    out() { return { grid: grid.map(x => x.join('')), heights: heights.map(x => x.join('')) }; },
  };
}

// ------------------------------------------------------------------
// Parkurlar
// ------------------------------------------------------------------
function cloudGarden() {
  const m = canvas(50, 13, 'O');
  m.plat(5, 1, 3, 5);
  m.put(6, 2, 'S');
  m.plat(5, 8, 3, 3, 1); m.put(6, 9, '$');
  m.plat(5, 13, 3, 3, 2); m.put(6, 14, '$');
  m.plat(5, 25, 3, 4, 2); m.put(6, 26, 'C');
  m.plat(2, 26, 2, 2, 2); m.put(2, 26, '$'); m.put(2, 27, '$');
  m.plat(5, 31, 3, 3, 1); m.put(6, 32, 'J');
  m.plat(5, 36, 3, 3, 3); m.put(6, 37, '$');
  m.plat(9, 36, 2, 3, 3); m.put(10, 37, '*');
  m.plat(5, 41, 3, 3, 2); m.put(6, 42, '$');
  m.plat(5, 45, 3, 4); m.put(6, 47, 'E');
  return {
    id: 'p0', parkour: true, sky: true, open: true,
    title: 'Bulut Bahçesi', goal: 'Adadan adaya zıpla, hareketli platforma bin, sikkeleri topla!',
    story: 'Bulutların üstünde bir yere vardın. Aşağı baktığında kasabanın saat kulesini gördün: buradan bakınca bile saat üçü çeyrek geçiyor.',
    par: 70, theme: THEMES.sky, ...m.out(),
    movers: [{ from: [6, 17], to: [6, 22], h: 2, speed: 3, size: 3 }],
    npcs: [{ id: 'kizil', at: [5, 3] }],
  };
}

function sunRuins() {
  const m = canvas(52, 15, 'O');
  m.plat(6, 1, 3, 5); m.put(7, 2, 'S');
  m.plat(6, 8, 3, 8);
  for (const c of [10, 12, 14]) m.put(7, c, 'X');
  m.plat(5, 8, 1, 8); m.put(5, 11, '$');
  m.plat(6, 18, 3, 7, 0, 'K');
  m.plat(6, 27, 3, 4, 1); m.put(7, 28, 'C');
  m.plat(2, 27, 3, 4, 1); m.put(3, 28, '$'); m.put(3, 29, '$');
  m.plat(6, 33, 3, 3, 2); m.put(7, 34, 'J');
  m.plat(6, 38, 3, 8, 4); m.put(7, 40, '$'); m.put(7, 43, '$');
  m.plat(11, 41, 2, 3, 4); m.put(11, 42, '*');
  m.plat(6, 47, 3, 4); m.put(7, 49, 'E');
  return {
    id: 'p1', parkour: true, sky: true, open: true,
    title: 'Çöken Tapınak', goal: 'Dikenlerden geç, çöken zeminde durma, bekçi toplardan kaç!',
    story: 'Harabelerin ortasında duvara kazınmış binlerce küçük çentik gördün. Biri gün saymış. Sonra sayıyı bırakmış.',
    par: 90, theme: THEMES.sun, ...m.out(),
    patrols: [{ from: [5, 8], to: [5, 15], speed: 3 }, { from: [8, 39], to: [8, 44], speed: 4 }],
  };
}

function stormTower() {
  const m = canvas(36, 25, 'O');
  m.plat(20, 1, 3, 5); m.put(21, 2, 'S');
  m.plat(20, 8, 3, 3, 1); m.put(21, 9, '$');
  m.plat(20, 13, 3, 3, 2); m.put(21, 14, 'J');
  m.plat(15, 13, 3, 4, 4); m.put(16, 14, 'C');
  m.plat(15, 25, 3, 4, 4); m.put(16, 26, '$');
  m.plat(10, 25, 3, 3, 5); m.put(11, 26, 'J');
  m.plat(5, 25, 3, 3, 7); m.put(6, 26, '$');
  m.plat(5, 12, 3, 7, 7); m.put(6, 15, 'C');
  m.plat(5, 7, 3, 4, 5); m.put(6, 8, '*');
  m.plat(5, 2, 3, 3, 3); m.put(6, 3, 'E');
  m.grid[6][3] = 'E'; m.heights[6][3] = '0';
  return {
    id: 'p2', parkour: true, sky: true, open: true,
    title: 'Fırtına Kulesi', goal: 'Rüzgârın içinde yukarı tırman. Zıplatıcılar seni fırlatır!',
    story: 'Kulenin tepesinde şimşek çaktığında bir an uzakta ikinci bir kasaba gördün. Aynısı. Ama orada kimse yoktu ve bütün evlerin ışığı yanıyordu.',
    par: 110, theme: THEMES.storm, ...m.out(),
    movers: [{ from: [16, 18], to: [16, 23], h: 4, speed: 3.2, size: 3 }, { from: [6, 20], to: [6, 23], h: 7, speed: 2.6, size: 2 }],
    patrols: [{ from: [5, 14], to: [7, 18], speed: 3 }],
  };
}

export const PARKOUR = [cloudGarden(), sunRuins(), stormTower()];

// ------------------------------------------------------------------
// Gece bölümleri: yalnızca insan formunda, yalnızca insanken görünen kapılardan
// ------------------------------------------------------------------
function cellar() {
  return {
    id: 'n0', night: true, open: true, dark: true,
    title: 'Birinci Gece: Bodrumun Altı', goal: 'Karanlıkta bir şey var. Feneri bul.',
    intro: [
      { who: 'Bilye', t: 'Ellerim var. Saydım: beş parmak. Bunu nereden biliyorum? Hiç elim olmadı ki.' },
      { who: 'Bilye', t: 'Belediyenin bodrumunun altında bir kapak daha varmış. Aşağıdan bir tıkırtı geliyor. Tık. Tık. Tık.' },
    ],
    story: 'Merdivenden çıktığında elinde küçük bir defter vardı. Kapağında çocuk yazısıyla bir ad yazıyordu: Elif. Adı okuyunca sırtındaki anahtar kendiliğinden bir tur döndü.',
    par: 150, theme: THEMES.cellar,
    grid: [
      '#####################',
      '#S..#.......#.......#',
      '#...#.#####.#.#####.#',
      '#.....#...#...#...#.#',
      '#####.#.#.#####.#.#.#',
      '#.....#.#.......#...#',
      '#.#####.#########.###',
      '#.#.......#.......#.#',
      '#.#.#####.#.#####.#.#',
      '#...#...#...#...#...#',
      '###.#.#.#####.#.###.#',
      '#.....#.......#....E#',
      '#####################',
    ],
    pickups: [{ id: 'fener', at: [3, 8] }],
    details: [
      { id: 'g_ilk', at: [1, 18], kind: 'paper' },
      { id: 'g_liste', at: [9, 6], kind: 'paper' },
    ],
    monsters: [
      { kind: 'oyuncak', at: [7, 14], speed: 2.4, range: 9, hp: 2 },
      { kind: 'oyuncak', at: [9, 18], speed: 2.8, range: 8, hp: 2 },
    ],
    scares: [
      { at: [5, 11], text: 'Az önce arkanda biri "bir" diye saydı.' },
      { at: [11, 11], text: 'Duvarın içinden küçük eller geçiyor. Hayır. Bakma.', jump: true },
    ],
  };
}

function field() {
  const m = canvas(33, 21, '.');
  // Mısır sıraları: araları koridor, arada boşluk
  for (let r = 3; r < 19; r += 3) for (let c = 2; c < 31; c++) if ((c + r * 2) % 9 > 1) m.put(r, c, '#');
  m.put(1, 1, 'S');
  m.put(19, 31, 'E');
  m.put(10, 16, 'C');
  return {
    id: 'n1', night: true, open: true, dark: true, cornWalls: true,
    title: 'İkinci Gece: Kuzey Tarlaları', goal: 'Korkuluklar ışığa bakarken kımıldamaz. Fenerini söndürme.',
    intro: [
      { who: 'Bilye', t: 'Muhtarın sattığı tarlalar. Gündüz bomboş. Gece mısır bitmiş; boyumu aşıyor. Burada mısır ekilmez ki.' },
      { who: 'Bilye', t: 'Direklerde korkuluklar var. Az önce sayıları altıydı. Şimdi yedi.' },
    ],
    story: 'Kazı çukurlarının dibinde tahta sandıklar gördün. Üstlerinde numara yok, ad vardı. Birinin üstünde Kızıl yerine başka bir ad yazıyordu: Hasan, 9 yaşında.',
    par: 170, theme: THEMES.field, ...m.out(),
    pickups: [{ id: 'kilic', at: [10, 2] }],
    details: [
      { id: 'g_sandik', at: [13, 30], kind: 'paper' },
      { id: 'g_harita', at: [16, 4], kind: 'paper' },
    ],
    monsters: [
      { kind: 'korkuluk', at: [5, 12], speed: 4.2, range: 16, hp: 3 },
      { kind: 'korkuluk', at: [8, 25], speed: 4.2, range: 16, hp: 3 },
      { kind: 'korkuluk', at: [14, 8], speed: 4.2, range: 16, hp: 3 },
      { kind: 'korkuluk', at: [17, 22], speed: 4.6, range: 18, hp: 3 },
    ],
    scares: [
      { at: [7, 16], text: 'Rüzgâr yok. Mısırlar yine de sallanıyor.' },
      { at: [16, 27], text: 'Bir korkuluğun yüzü senin yüzün.', jump: true },
    ],
  };
}

function workshop() {
  const m = canvas(27, 13, '#');
  m.plat(1, 1, 11, 7); m.put(2, 2, 'S');
  m.put(6, 8, '.');
  m.plat(1, 9, 11, 3);
  m.plat(1, 12, 11, 7, 0, 'O');
  m.plat(1, 19, 11, 7); m.put(6, 24, 'E');
  m.put(10, 21, 'C');
  return {
    id: 'n2', night: true, open: true, dark: true, parkour: true,
    title: 'Üçüncü Gece: Kırık Atölye', goal: 'Kancayı al ve uçurumu geç. O seni duyuyor. Fener onu çeker.',
    intro: [
      { who: 'Bilye', t: 'Tarlanın altı bir atölyeymiş. Yüzlerce saat, hepsi üçü çeyrek geçiyor. Masada yarım kalmış bir oyuncak bebek var. Bana bakıyor.' },
      { who: 'Saatçi', t: 'Elif. Geç kaldın kızım. Kurman bitmek üzere, gel babana.' },
    ],
    story: 'Atölyeden çıkarken masadaki bebeği hatırladın. Onu sen adlandırmıştın. Nasıl hatırlıyorsun, bilmiyorsun. Ama artık Elif adını duyunca dönüp bakıyorsun.',
    par: 130, theme: THEMES.work, ...m.out(),
    pickups: [{ id: 'kanca', at: [9, 3] }],
    hooks: [{ at: [6, 15], y: 3.4 }],
    details: [
      { id: 'g_makine', at: [1, 7], kind: 'paper' },
      { id: 'g_baba', at: [1, 25], kind: 'paper' },
    ],
    monsters: [{ kind: 'saatci', at: [10, 10], speed: 3.5, range: 60, hp: 999, wakeOn: 'kanca' }],
    scares: [{ at: [6, 8], text: 'Bütün saatler aynı anda bir kere tıkladı.' }],
  };
}

function towerInside() {
  const m = canvas(23, 19, '#');
  m.plat(1, 1, 13, 21); m.put(12, 11, 'S');
  for (const [r, c] of [[4, 5], [4, 17], [9, 5], [9, 17], [6, 11]]) m.plat(r, c, 2, 1, 0, '#');
  m.put(14, 11, 'G');
  m.plat(15, 1, 3, 21); m.put(16, 19, 'E');
  return {
    id: 'n3', night: true, open: true, dark: true,
    title: 'Son Gece: Kulenin İçi', goal: 'Üç ana dişliyi kılıçla kır. O kırılmaz, yalnızca sersemler.',
    intro: [
      { who: 'Saatçi', t: 'Altmış yıldır o kışın içindeyiz, kızım. Herkesi kurtardım. Herkesi, ama seni tam yapamadım.' },
      { who: 'Saatçi', t: 'Makine geri dönecek. Hepsinin ömrü senin bedenine akacak. Sen yaşayacaksın. Yalnızca bunu istedim. Gel.' },
      { who: 'Bilye', t: 'Peki onlar? Kızıl, Limon, Nane, Gök, Erik? Hasan?' },
      { who: 'Saatçi', t: 'Onlar cam, Elif. Cam kırılır.' },
    ],
    par: 200, theme: THEMES.tower, ...m.out(),
    gates: { G: { type: 'cogs', title: 'Kule Kapısı', q: 'Ana dişliler dönerken bu kapı açılmaz.' } },
    cogs: [{ at: [3, 3] }, { at: [3, 19] }, { at: [11, 3] }],
    details: [{ id: 'g_son', at: [16, 3], kind: 'paper' }],
    monsters: [
      { kind: 'saatci', at: [2, 11], speed: 3.7, range: 80, hp: 999 },
      { kind: 'oyuncak', at: [11, 19], speed: 3, range: 12, hp: 2 },
    ],
    pickups: [{ id: 'iksir', at: [1, 11] }],
    scares: [{ at: [8, 11], text: 'Saat ilk kez altmış yılda bir ileri gitti.', jump: true }],
  };
}

export const NIGHT = [cellar(), field(), workshop(), towerInside()];

export const EXTRA = Object.fromEntries([...PARKOUR, ...NIGHT].map(d => [d.id, d]));

// Serbest kapılar: parkur her zaman açık; gece, bir önceki gece ve o kadar arkadaş kurtarılınca açılır
export function extraLocked(id, stage, nightsDone) {
  if (id[0] === 'n') { const i = Number(id[1]); return nightsDone < i || stage < i + 1; }
  return false;
}

// Son karar
export const FINAL_CHOICES = {
  durdur: {
    art: '🕰', title: 'Durmuş Saat',
    text: 'Makineyi durdurdun. Saat üçü çeyrek geçe kaldı. Kışın sonunu kimse görmeyecek ama kimse ölmeyecek de. Ertesi sabah Kızıl sana seslendi, sen döndün. Elif adını bir daha kimse söylemedi. Geceleri elini tutan yok; yine de bazen beş parmağını sayıyorsun.',
  },
  kur: {
    art: '❄️', title: 'Kırk Beş Saniye',
    text: 'Anahtarı son kez sen çevirdin. Saat üçü on altı geçti. Kasabaya kar yağmaya başladı; misketler tek tek kırıldı ve kırılan her camdan biri çıktı. Hasan dokuz yaşındaydı. Altmış yıl önceki kış hâlâ oradaydı. Kırk beş saniye boyunca herkes birbirinin yüzünü gördü. Bu kadarını, ister miydin diye kimse sormadı.',
  },
};
