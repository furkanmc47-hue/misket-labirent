// Meydan okumalar: bir labirenti özel kurallarla bitir, ödül olarak yeni misket rengi kazan.
//  rules.lives    başlangıç canı
//  rules.limit    süre sınırı (saniye)
//  rules.noJump   zıplamak yasak
//  rules.noMap    harita kapalı
//  rules.dark     zifiri karanlık
//  rules.allGems  bütün mücevherleri toplamadan çukur saymaz
//  rules.useJokers kaç joker kullanılmalı
//  rules.swarm    uzaylı sayısı ve hızı için çarpan
export const CHALLENGES = [
  { id: 'kusursuz', level: 0, icon: '💔', title: 'Tek Can', text: 'Yeşil Bahçe\'yi tek canla bitir.', rules: { lives: 1 }, reward: 0xff8fab },
  { id: 'simsek', level: 0, icon: '⏱', title: 'Şimşek', text: 'Yeşil Bahçe\'yi 45 saniyede bitir.', rules: { limit: 45 }, reward: 0xffe14d },
  { id: 'yerde', level: 1, icon: '🚫', title: 'Ayaklar Yerde', text: 'Tuzak Mağarası\'nı hiç zıplamadan bitir.', rules: { noJump: true }, reward: 0x80ed99 },
  { id: 'istila', level: 1, icon: '🛸', title: 'UFO İstilası', text: 'Mağaradaki uzaylılar üç katına çıktı. Kurtulabilirsen.', rules: { swarm: 3 }, reward: 0x5fe35f },
  { id: 'kor', level: 2, icon: '🗺', title: 'Haritasız', text: 'Gökkuşağı Tapınağı\'nı haritasız bitir.', rules: { noMap: true }, reward: 0xff5d8f },
  { id: 'buzcu', level: 2, icon: '❄️', title: 'Buz Ustası', text: 'Tapınakta iki joker kullanmadan çıkma.', rules: { useJokers: 2 }, reward: 0x9be7ff },
  { id: 'avci', level: 3, icon: '💎', title: 'Mücevher Avcısı', text: 'Rampa Vadisi\'nde bütün mücevherleri topla, sonra çukura atla.', rules: { allGems: true }, reward: 0xff4fd8 },
  { id: 'karanlik', level: 4, icon: '🌑', title: 'Zifiri Karanlık', text: 'Lazer Kalesi\'ni karanlıkta bitir.', rules: { dark: true, noMap: true }, reward: 0x7b2cbf },
];

export const BASE_COLORS = [0x4cc9f0, 0xe63946, 0xffb703, 0x2a9d8f, 0x9b5de5, 0xf77f00];

// Kuralları uygulanmış bölüm kopyası
export function challengeDef(def, rules) {
  const copy = { ...def };
  if (rules.swarm && def.chasers?.length) {
    copy.chasers = def.chasers.flatMap(c => Array.from({ length: rules.swarm }, () => ({ ...c, speed: c.speed * 1.1 })));
  }
  return copy;
}
