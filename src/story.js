// Hikâye: karakterler, diyaloglar, defter (kanıtlar) ve Hikâye Analizi.
//
// Gizemin çözümü oyuncuya hiçbir yerde söylenmez; küçük ayrıntılardan çıkarılır:
//  - Gölge Kral yoktur: Muhtar Tombul'un taç oyuklu feneriyle duvara düşürdüğü bir gölgedir.
//  - Muhtar, kasabanın arazisini Zıpzıp Lunaparkı'na satmıştır; arkadaşlar bunu fark edenlerdir.
//  - "Bütün gece evdeydim" der, sonra gölgeyi kuleden gördüğünü söyleyerek kendini ele verir.
import { save, persist } from './save.js';

export const STORY_INTRO = [
  'Misket Kasabası\'nda Bilye adında küçük, cesur bir cam misket yaşardı.',
  'Büyük Yuvarlanma Şenliği\'nin gecesi kule saati çaldı ve duvarlara taçlı dev bir gölge düştü. Sabah olduğunda Bilye\'nin beş arkadaşı yoktu.',
  'Herkes aynı şeyi söylüyor: "Gölge Kral yaptı." Peki hiç gören var mı? Kasabada dolaş, herkesle konuş, labirentlerde yerdeki izlere bile bak. Ayrıntılar yalan söylemez.',
];

export const CAST = {
  bilye: { name: 'Bilye', color: 0xa9d6ff, emoji: '🔮' },
  tombul: { name: 'Muhtar Tombul', color: 0xa8743f, emoji: '🎩', hat: 'top', scale: 1.7 },
  topac: { name: 'Topaç Usta', color: 0x3fa7a0, emoji: '🌀', body: 'top' },
  dugme: { name: 'Nine Düğme', color: 0xe88fb8, emoji: '🧶', body: 'button', hat: 'bow' },
  saatci: { name: 'Saatçi', color: 0x1a1412, emoji: '🕰' },
  bip: { name: 'Bip', color: 0x5fe35f, emoji: '👽', hat: 'antenna', scale: 0.8 },
  kizil: { name: 'Kızıl', color: 0xe63946, emoji: '🔴' },
  limon: { name: 'Limon', color: 0xffb703, emoji: '🟡' },
  nane: { name: 'Nane', color: 0x2a9d8f, emoji: '🟢' },
  gok: { name: 'Gök', color: 0x3a86ff, emoji: '🔵' },
  erik: { name: 'Erik', color: 0x9b5de5, emoji: '🟣' },
};

// Kurtarılan arkadaşların öğrettiği kalıcı yetenekler: kaç arkadaş kurtarılınca açıldığı
export const ABILITIES = {
  doubleJump: { from: 1, name: 'Çift Zıplama', hint: 'Havadayken bir kez daha Boşluk\'a bas.' },
  dash: { from: 2, name: 'Atılma', hint: 'Shift ile atıl. Çatlak duvarları kırar.' },
  lens: { from: 3, name: 'Büyüteç', hint: 'Yakındaki küçük ayrıntılar artık hafifçe parlar.' },
  glide: { from: 4, name: 'Süzülme', hint: 'Düşerken Boşluk\'u basılı tut.' },
};

export const STORY_LEVEL_IDS = ['bahce', 'magara', 'tapinak', 'vadi', 'kale'];
export function storyStage() {
  return STORY_LEVEL_IDS.filter(id => save.levels[id]).length;
}

// ------------------------------------------------------------------
// Diyaloglar: from = bu kadar arkadaş kurtarılınca geçerli olur (en yükseği seçilir).
// note = bu sözü söyleyen satır deftere tanık ifadesi olarak işlenir.
// ------------------------------------------------------------------
export const DIALOGUE = {
  tombul: [
    { from: 0, lines: [
      { t: 'Ah, Bilye! Ne korkunç bir gece! Gölge Kral arkadaşlarını kaçırdı. Ben mi? Erkenden yattım, sabaha kadar evimden çıkmadım.', note: 't_tombul_ev' },
      { t: 'Güneydeki kapılardan labirentlere inebilirsin. Sen arkadaşlarını kurtar, ben de... kasabayı yönetirim. Çok önemli bir iş.' },
      { t: 'Heykelime toz konmasın diye günde üç kez siliyorum. Bu da çok önemli bir iş.' },
    ] },
    { from: 2, lines: [
      { t: 'Harikasın, Bilye! Kasaba seninle gurur duyuyor. Bizzat ben duyuyorum, ben kasabayım sayılırım.' },
      { t: 'O dev gölgeyi saat kulesinden kendi gözlerimle gördüm! Saat tam üçü çeyrek geçiyordu, duvarda tacı titriyordu. Çok korkutucuydu!', note: 't_tombul_kule' },
    ] },
    { from: 4, lines: [
      { t: 'Az kaldı! Hazır gelmişken, kuzey tarlalarına hiç bakma. Orada görülecek bir şey yok. Hiç. Kesinlikle.' },
    ] },
    { from: 5, lines: [
      { t: 'Bitti işte! Gölge Kral yok oldu, kim olduğu da önemli değil. Şenliğe bakalım, olur mu? Kürsüye çıkıp bir şey söylemene gerek yok.' },
    ] },
  ],
  topac: [
    { from: 0, lines: [
      { t: 'Yuvarlanmak ne ilkel bir yöntem! Bak ben sivri ucumun üstünde dönerim; gittiğim yere nokta nokta iz bırakırım.', note: 't_topac_iz' },
      { t: 'Nine Düğme kenarının üstünde yuvarlanır, ince bir çizgi çizer. Uzaylılar zaten uçar, iz ne gezer. Bir tek siz toparlaklar yeri süpürürsünüz. Ne kadar tombulsanız o kadar geniş.' },
    ] },
    { from: 2, lines: [
      { t: 'Çatlak duvar mı gördün? O duvarlar benim işçiliğim değil, aceleyle örülmüş. Atılarak vur, dayanmaz.' },
      { t: 'Labirent işini soruyorsan evet, planlarını ben çizdim. Sipariş geldi, yaptım. Müşterinin adını ifşa etmem; zanaatın kuralı. Ama kâğıdın üstünde yazıyordur.' },
    ] },
    { from: 3, lines: [
      { t: 'Eski ustamın dükkânı tarlaların altındaydı derler. İhsan Usta. Bana dönmeyi o öğretti. Bir kış gecesi kapısını kilitledi. Onu sorma. Ben de sormadım.', note: 't_topac_usta' },
      { t: 'Kimsenin ellerine bakma diye öğretti bana. Ben de bakmıyorum. Şimdi, sikken varsa alışverişe bakalım.' },
    ] },
  ],
  dugme: [
    { from: 0, lines: [
      { t: 'Gözlerim görmez olduysa burnum hâlâ keskin evladım. Herkesi kokusundan tanırım: Muhtar karanfil kolonyasına banyo yapar, Topaç makine yağı kokar, siz çocuklar çamur.', note: 't_dugme_koku' },
      { t: 'Saat kulesinin anahtarı yıllardır tek kişide, biliyor musun? Muhtar bize kuleyi temizletmez bile.' },
    ] },
    { from: 1, lines: [
      { t: 'Geçen yıl pazarda pembe bir düğmemi düşürdüm. Fare mi aldı, karga mı aldı, nereden bilirim. Bulursan bana getirme, yenisini diktim.', note: 't_dugme_kayip' },
    ] },
    { from: 2, lines: [
      { t: 'Bazı geceler kar kokusu alıyorum evladım. Bu kasabaya hiç kar yağmadı. Peki ben kar kokusunu nereden biliyorum?', note: 't_dugme_kar' },
      { t: 'Bir de ninni. Kimden öğrendiğimi bilmediğim bir ninni var dilimde: "Uyu kızım, kurdum seni, üçü çeyrek geçene dek."' },
    ] },
  ],
  bip: [
    { from: 3, lines: [
      { t: 'Bip bop! Kötü değilim, ben maaşlı çalışanım. UFO benzini pahalı.' },
      { t: 'Patronu hiç görmedim. Ücreti karanfil kokan zarfla gönderir, zarfta "Lunapark açılana kadar misketleri oyalayın" yazar.', note: 't_bip' },
    ] },
  ],
  kizil: [
    { from: 1, lines: [
      { t: 'Kaçırıldığım an kule saati çalıyordu. Gölgenin tacı duvarda mum alevi gibi titriyordu. Krallar titrer mi, Bilye?', note: 't_kizil' },
      { t: 'Sana iki kere zıplamayı öğrettim, unutma. Yüksek çıkıntılara ve kulenin tepesine böyle varılır.' },
    ] },
  ],
  limon: [
    { from: 2, lines: [
      { t: 'Kaçıran hiç konuşmadı. Ama mağarayı öyle bir karanfil kokusu sardı ki hapşırmaktan korkudan titremeye vakit bulamadım.', note: 't_limon' },
      { t: 'Atılmayı kullan. Bazı duvarlar sandığın kadar sağlam değil, Belediye\'ninkiler bile.' },
    ] },
  ],
  nane: [
    { from: 3, lines: [
      { t: 'Ben kasaba defterlerini tutarım, biliyorsun. Şenlikten önce baktım: kuzey tarlaları defterde artık "satıldı" yazıyor. Kim sattı diye sorunca ertesi gece kendimi tapınakta buldum.', note: 't_nane' },
    ] },
  ],
  gok: [
    { from: 4, lines: [
      { t: 'Vadide uzaylı pilotları dinledim. Sürekli "dönme dolap buraya, atlıkarınca şuraya" diyorlardı, ellerinde bir arazi planı vardı.', note: 't_gok' },
      { t: 'Süzülmeyi de öğren. Düşerken Boşluk\'u bırakma, yeter.' },
    ] },
  ],
  erik: [
    { from: 5, lines: [
      { t: 'Kalenin taht odasını gördüm. Tahtın üstünde parmak kalınlığında toz vardı. O tahta hiç kimse oturmamış, Bilye.', note: 't_erik' },
      { t: 'Yetişirsen meydandaki kürsüye çık. Yeterince kanıtın varsa herkesin önünde konuşursun.' },
    ] },
  ],
};

// Tabelalar (F ile okunur); bazıları sadece şakadır, bazıları değil.
export const SIGNS = {
  hosgeldin: ['MİSKET KASABASI', 'Nüfus: 11. Yuvarlanma hızı: 20. Belediye her ikisinden de memnundur.'],
  uyari: ['BELEDİYE DUYURUSU', 'Bu tabelayı okuyan vatandaşlarımıza teşekkür ederiz. Okumayanlara da.'],
  kuzey: ['KUZEY TARLALARI', 'Yakında: Burada hiçbir şey olmayacak. Sormayın.'],
  kule: ['SAAT KULESİ', 'Saat durmuştur. Tamir için anahtarı olana başvurunuz.'],
  lanet: ['ÇOK ESKİ BİR TABELA', 'Rivayet edilir ki bu topraklarda bir lanet dolaşır. Adının ilk harfini kimse yüksek sesle söylemez: R.'],
  labirent: ['DİKKAT', 'Labirentlerde küçük şeyleri ezmeden geçin. Belki birileri onları görmenizi istemiyordur.'],
};

// ------------------------------------------------------------------
// Defter: bulunan ayrıntılar ve tanık ifadeleri
// ------------------------------------------------------------------
export const EVIDENCE = {
  // Labirentlerde ve kasabada gizli küçük nesneler
  // Gece bölümlerindeki günlük sayfaları
  g_ilk: { kind: 'gunluk', title: 'Günlük: 3 Aralık', where: 'Bodrumun Altı', text: 'Kuyular dondu. Kasabada odun bitti. Hekim, yolların ancak baharda açılacağını söyledi. Elif\'in öksürüğü geceleri artıyor. Saat kulesinin makinesini onarmam istendi. Kimse saate bakacak durumda değil ama onarıyorum. Elim boş kalırsa düşünüyorum.' },
  g_liste: { kind: 'gunluk', title: 'Günlük: 19 Aralık', where: 'Bodrumun Altı', text: 'Bu hafta altı kişi gömüldü, toprak kazılmıyor. Hasan da öldü sanmıştık, sabah nefes aldı. Bir şey fark ettim: Cam, soğuğu içine almıyor. Çocuklar bilye oynuyor hâlâ; elleri titriyor, bilyeleri titremiyor.' },
  g_sandik: { kind: 'gunluk', title: 'Sandık etiketi', where: 'Kuzey Tarlaları', text: 'Altmış sandık, altmış etiket. "Hasan, 9. Ayşe, 34. Halil, 61. Yusuf, 11." Sandıkların içi boş değil. Ama sandıklardaki kimse nefes almıyor, kimse de bozulmuyor. Bir etiket sonradan silinmiş: "Tahsin. Muhtar."' },
  g_harita: { kind: 'gunluk', title: 'Lunapark kazı planı', where: 'Kuzey Tarlaları', text: 'Üstünde Muhtar\'ın el yazısı: "Burayı kazmayın diyen eski belgeler yok edildi. Sandıklar çıkarsa hepsini beton altına alın. Kimse dedesini tanımaz, kimsede dede yok zaten." Altına titrek harflerle eklemiş: "Benimki de orada mı?"' },
  g_makine: { kind: 'gunluk', title: 'Günlük: 24 Aralık', where: 'Kırık Atölye', text: 'Yaptım. Ruh diyemem, bilmiyorum ne olduğunu. Ama kurmalı bir mekanizmayla insanın kendini bildiği şeyi cama taşıyabiliyorum. Halil ihtiyar gönüllü oldu. Şimdi masada yuvarlanıyor, beni tanımıyor ama gülüyor. Bu iyi bir şey mi?' },
  g_baba: { kind: 'gunluk', title: 'Günlük: 31 Aralık, saat 3', where: 'Kırık Atölye', text: 'Bütün kasaba kuleye geldi. Hepsine anlattım. Hiçbiri hatırlamayacak, hepsi kabul etti. Saat üçü çeyrek geçe kolu çekeceğim, sonra zaman duracak, bahar bekleyecek. Elif en sona kaldı, çok zayıf. Onu yarım aktardım. Bedeni hâlâ yarı yarıya onda. Bedeni arar. Kim olduğunu bir gün hatırlarsa diye sırtına bir anahtar taktım. Onu ben kuracağım. Ben cama geçmeyeceğim. Biri saati beklemeli.' },
  g_son: { kind: 'gunluk', title: 'Son sayfa', where: 'Kulenin İçi', text: 'Altmış yıl geçti sanırım. Ellerim tahtaya döndü, yüzüm saate döndü. Geçen gün aynaya baktım, kadran gördüm. Tek bir çare kaldı: makineyi tersine çalıştırırsam herkesin zamanı tek bedene akar. Elif yaşar. Onlar ölür ama zaten ölmüşlerdi, değil mi? Değil mi? Bunu yazan kim, hatırlamıyorum. Tık. Tık. Tık.' },
  iz: { kind: 'iz', title: 'Geniş yuvarlanma izi', where: 'Yeşil Bahçe', text: 'Çukurun yakınında, köşede iki misket genişliğinde tek parça bir iz. Bunu kim bırakmış olabilir?' },
  plan: { kind: 'belge', title: 'Labirent planı', where: 'Yeşil Bahçe, gizli oda', text: 'Çizen: Topaç Usta. Köşede küçük harflerle: "Sipariş eden: Belediye. Ödeme nakit, sessizce."' },
  mendil: { kind: 'iz', title: 'Karanfil kokulu mendil', where: 'Tuzak Mağarası', text: 'Kuytuya düşmüş ipek bir mendil. Karanfil kokusu hâlâ çok keskin.' },
  pembe_dugme: { kind: 'iz', title: 'Pembe düğme', where: 'Tuzak Mağarası', text: 'Küçük, tozlu, pembe bir düğme. Üstünde örümcek ağı var; çok uzun zamandır burada.' },
  fener_cam: { kind: 'iz', title: 'İsli fener camı', where: 'Gökkuşağı Tapınağı', text: 'İs tutmuş bir fener camı parçası. Kenarına taç biçiminde bir oyuk açılmış.' },
  sozlesme: { kind: 'belge', title: 'Yırtık sözleşme', where: 'Rampa Vadisi, yüksek taş', text: '"...kuzey tarlalarının tamamı ZIPZIP LUNAPARK A.Ş.\'ye devredilmiştir. Mühür No: 1907." İmza kısmı yırtılmış.' },
  zarf: { kind: 'belge', title: 'Karanfil kokulu zarf', where: 'Lazer Kalesi', text: 'Boş bir ödeme zarfı. Parası alınmış, kokusu kalmış. Üstünde "pilotlara" yazıyor.' },
  cep_saati: { kind: 'iz', title: 'Durmuş cep saati', where: 'Lazer Kalesi', text: 'Duvar dibine atılmış. Üçü çeyrek geçe durmuş; arkasında "Kule Bakım" yazıyor.' },
  muhur_levha: { kind: 'belge', title: 'Belediye levhası', where: 'Kasaba, Belediye duvarı', text: 'Pirinç bir levha, epey küçük: "Bu binanın resmî mührü: No 1907."' },
  fener: { kind: 'iz', title: 'Taç oyuklu fener', where: 'Belediye bodrumu', text: 'Kocaman bir fener. Camında taç biçiminde bir oyuk var, bir parçası kırık. Duvara tutunca dev bir gölge düşüyor.' },
  kule_anahtar: { kind: 'iz', title: 'Kule anahtarı etiketi', where: 'Saat kulesi tepesi', text: 'Yere düşmüş bir etiket: "Kule anahtarı. Zimmet: Muhtar. Son kullanım: Şenlik gecesi."' },
  // Yalnızca insan formundayken görülür
  lanet_kasaba: { kind: 'iz', title: 'Ağaca kazınmış yazı', where: 'Kasaba, eski ağaçlar', text: 'Eli olan birinin ancak okuyabileceği yükseklikte: "Geceleri insan olan misket, gördüğünü kimseye gösteremez."' },
  lanet_kale: { kind: 'iz', title: 'Duvar dibindeki not', where: 'Lazer Kalesi', text: 'Küçücük bir el yazısı: "Lanetin ilacı aranıyor. Yuvarlanmayı özledim."' },
  // Tanık ifadeleri (kim, ne dedi; yorumu oyuncunun)
  t_topac_usta: { kind: 'ifade', title: 'Topaç Usta', where: 'Kasaba', text: '"Ustam İhsan\'ın dükkânı tarlaların altındaydı. Bir kış gecesi kapısını kilitledi."' },
  t_dugme_kar: { kind: 'ifade', title: 'Nine Düğme', where: 'Kasaba', text: '"Bu kasabaya hiç kar yağmadı. Peki ben kar kokusunu nereden biliyorum?"' },
  t_tombul_ev: { kind: 'ifade', title: 'Muhtar Tombul', where: 'Kasaba', text: '"Erkenden yattım, sabaha kadar evimden çıkmadım."' },
  t_tombul_kule: { kind: 'ifade', title: 'Muhtar Tombul', where: 'Kasaba', text: '"O dev gölgeyi saat kulesinden kendi gözlerimle gördüm! Saat tam üçü çeyrek geçiyordu."' },
  t_topac_iz: { kind: 'ifade', title: 'Topaç Usta', where: 'Kasaba', text: '"Ben nokta nokta iz bırakırım. Nine ince çizgi çizer. Uzaylılar iz bırakmaz. Toparlaklar ne kadar tombulsa iz o kadar geniş."' },
  t_dugme_koku: { kind: 'ifade', title: 'Nine Düğme', where: 'Kasaba', text: '"Muhtar karanfil kolonyasına banyo yapar, Topaç makine yağı kokar."' },
  t_dugme_kayip: { kind: 'ifade', title: 'Nine Düğme', where: 'Kasaba', text: '"Geçen yıl pazarda pembe bir düğmemi düşürdüm."' },
  t_bip: { kind: 'ifade', title: 'Bip', where: 'Kasaba', text: '"Ücreti karanfil kokan zarfla gönderir. \'Lunapark açılana kadar misketleri oyalayın\' yazar."' },
  t_kizil: { kind: 'ifade', title: 'Kızıl', where: 'Kasaba', text: '"Gölgenin tacı duvarda mum alevi gibi titriyordu. Krallar titrer mi?"' },
  t_limon: { kind: 'ifade', title: 'Limon', where: 'Kasaba', text: '"Kaçıran hiç konuşmadı ama mağarayı karanfil kokusu sardı."' },
  t_nane: { kind: 'ifade', title: 'Nane', where: 'Kasaba', text: '"Kuzey tarlaları defterde artık \'satıldı\' yazıyor. Kim sattı diye sorunca kaçırıldım."' },
  t_gok: { kind: 'ifade', title: 'Gök', where: 'Kasaba', text: '"Uzaylı pilotlar \'dönme dolap buraya\' diyordu, ellerinde arazi planı vardı."' },
  t_erik: { kind: 'ifade', title: 'Erik', where: 'Kasaba', text: '"Tahtın üstünde parmak kalınlığında toz vardı. O tahta hiç kimse oturmamış."' },
};

export function addNote(id) {
  if (!EVIDENCE[id] || save.notebook.includes(id)) return false;
  save.notebook.push(id);
  persist();
  return true;
}

// ------------------------------------------------------------------
// Hikâye Analizi: her soru için bir cevap ve onu destekleyen bir kanıt seçilir.
// ------------------------------------------------------------------
export const ANALYSIS = [
  {
    id: 'kral', q: 'Gölge Kral gerçekte neydi?', answer: 'golge',
    options: [
      { id: 'kral', t: 'Yeraltında yaşayan gerçek bir kral' },
      { id: 'golge', t: 'Duvara düşürülen bir gölge oyunu' },
      { id: 'robot', t: 'Uzaylıların yaptığı dev bir robot' },
      { id: 'hayal', t: 'Kasabanın gördüğü toplu bir kâbus' },
    ],
    proof: ['fener_cam', 'fener', 't_kizil', 't_erik'],
  },
  {
    id: 'kim', q: 'Fenerin arkasında kim vardı?', answer: 'tombul',
    options: [
      { id: 'topac', t: 'Topaç Usta' },
      { id: 'dugme', t: 'Nine Düğme' },
      { id: 'bip', t: 'Bip ve uzaylılar' },
      { id: 'tombul', t: 'Muhtar Tombul' },
    ],
    proof: ['iz', 't_topac_iz', 'mendil', 't_dugme_koku', 't_limon', 'zarf'],
  },
  {
    id: 'neden', q: 'Arkadaşlar neden kaçırıldı?', answer: 'arazi',
    options: [
      { id: 'hazine', t: 'Şenlik hazinesinin yerini bildikleri için' },
      { id: 'arazi', t: 'Kuzey tarlalarının gizlice satıldığını fark ettikleri için' },
      { id: 'fidye', t: 'Kasabadan fidye almak için' },
      { id: 'koleksiyon', t: 'Uzaylıların misket koleksiyonu için' },
    ],
    proof: ['sozlesme', 'muhur_levha', 't_nane', 't_gok', 't_bip'],
  },
  {
    id: 'yalan', q: 'Suçlunun yalanını ele veren neydi?', answer: 'kule',
    options: [
      { id: 'kule', t: 'Evden çıkmadığını söyleyip olayı kuleden gördüğünü anlatması' },
      { id: 'ucus', t: 'Uçamadığı hâlde labirentlere girip çıkması' },
      { id: 'dugme', t: 'Düğmesini kaybettiğini söylemesi' },
      { id: 'plan', t: 'Labirent planlarını çizdiğini saklaması' },
    ],
    proof: ['t_tombul_ev', 't_tombul_kule', 'kule_anahtar', 'cep_saati'],
  },
  {
    id: 'gercek', q: 'Bu kasabanın misketleri aslında kim?', answer: 'insan',
    options: [
      { id: 'oyuncak', t: 'Birinin kurduğu sıradan oyuncaklar' },
      { id: 'uzayli', t: 'Dünyaya gönderilmiş uzaylı canlılar' },
      { id: 'insan', t: 'Altmış yıl önceki kıştan cama sığınmış insanlar' },
      { id: 'ruya', t: 'Bilye\'nin gördüğü bir rüya' },
    ],
    proof: ['g_sandik', 'g_makine', 'g_baba', 'g_liste', 't_dugme_kar', 'lanet_kasaba', 't_topac_usta'],
  },
];

// answers: { [soruId]: { option, proof } } -> { right, proved, ending }
export function scoreAnalysis(answers) {
  let right = 0, proved = 0;
  for (const q of ANALYSIS) {
    const a = answers[q.id];
    if (a?.option !== q.answer) continue;
    right++;
    if (q.proof.includes(a.proof)) proved++;
  }
  const n = ANALYSIS.length;
  const ending = right === n && proved === n ? 'gercek' : right === n ? 'kuskulu' : 'yanlis';
  return { right, proved, total: n, ending };
}

export const ENDINGS = {
  gercek: {
    art: '🏆', title: 'Gerçek Son',
    text: 'Bilye feneri kürsüye koydu ve duvara taçlı gölgeyi düşürdü. Meydan sustu. Muhtar Tombul yavaşça arkasına yuvarlanmaya başladı; yerde iki misket genişliğinde bir iz bıraktı. Sözleşme iptal edildi, kuzey tarlalarında şenlik yapıldı. Heykelin yerine artık beş küçük misket var. Bip, tarla bekçisi oldu; maaşı aynı.',
  },
  kuskulu: {
    art: '🧐', title: 'Kuşkulu Son',
    text: 'Bilye her şeyi doğru anlattı ama kalabalık kanıt istedi. "İftira!" diye bağırdı Muhtar Tombul, karanfil kokusu meydana yayıldı. Olay kapandı, kimse ceza almadı. Yine de o gece kuzey tarlalarından bir hafriyat sesi geliyordu. Elinde daha sağlam kanıtlar olsaydı...',
  },
  yanlis: {
    art: '🎡', title: 'Yanlış Son',
    text: 'Kasaba suçluyu yakaladığına inandı. Muhtar Tombul uzun bir konuşma yaptı ve Bilye\'ye madalya taktı. Bir ay sonra kuzey tarlalarında dönme dolap yükseldi; bileti herkes için çok pahalıydı. Madalyanın arkasında küçücük bir yazı vardı: "Mühür No: 1907." Bir şeyi gözden kaçırmış olmalısın.',
  },
};
