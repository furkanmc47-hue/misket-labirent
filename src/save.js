// Kayıt: açılan bölümler, yıldızlar, en iyi süreler, ayarlar, editör labirentleri.
const KEY = 'misket-labirenti-kayit-v2';

const DEFAULTS = {
  unlocked: 1,
  levels: {},          // id -> { stars, best }
  endlessBest: 0,
  storySeen: false,
  custom: [],          // editörde yapılan labirentler
  coins: 0,
  items: [],           // kalıcı eşyalar: fener, kilic, kanca, bot, celik, pil
  potions: 0,
  nights: 0,           // tamamlanan gece bölümü
  finalChoice: null,
  notebook: [],        // bulunan ayrıntılar ve tanık ifadeleri (kimlikler)
  ending: null,        // Hikâye Analizi'nde ulaşılan en iyi son
  challenges: {},      // id -> { done, best }
  profile: { name: '', color: 0x4cc9f0 },
  lastHost: '',        // en son bağlanılan çok oyunculu adres
  settings: {
    music: 0.5,
    sfx: 0.8,
    tts: true,
    quality: 'high',   // high | low
    camMode: 0,
    mouseSens: 1,
  },
};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw) return { ...DEFAULTS, ...raw, settings: { ...DEFAULTS.settings, ...raw.settings } };
  } catch { /* bozuk kayıt: varsayılana dön */ }
  return structuredClone(DEFAULTS);
}

export const save = load();

export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* depolama kapalı olabilir */ }
}

export function recordLevel(id, stars, time) {
  const prev = save.levels[id] || { stars: 0, best: Infinity };
  save.levels[id] = { stars: Math.max(prev.stars, stars), best: Math.min(prev.best ?? Infinity, time) };
  persist();
}
