// Giriş noktası: menüler, hikâye akışı, sonsuz mod, editör ve ayarlar.
import { LEVELS, HUB, EXTRA, NIGHT, FINAL_CHOICES } from './levels.js';
import { STORY_INTRO, ENDINGS, EVIDENCE, ABILITIES, storyStage } from './story.js';
import { CHALLENGES, challengeDef } from './challenges.js';
import { renderNotebook } from './notebook.js';
import { openAnalysis } from './analysis.js';
import { initLobby, openMultiplayer } from './lobby.js';
import { save, persist, recordLevel } from './save.js';
import { initAudio, applyVolumes, playMusic, stopMusic, sfx } from './audio.js';
import { setupTouch } from './input.js';
import { generateLevel } from './generator.js';
import { openEditor } from './editor.js';
import { startRun, endRun, showBackdrop, applyQuality, setCamMode, toast, CAM_NAMES } from './game.js';

const $ = id => document.getElementById(id);
const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const SCREENS = ['mainMenu', 'levelSelect', 'story', 'result', 'settings', 'howto', 'customList', 'ending', 'challengeList', 'mpMenu', 'lobby', 'mpResult'];
const MENU_MUSIC = { root: 60, scale: 'major', tempo: 88 };

function show(id) {
  for (const s of SCREENS) $(s).classList.toggle('show', s === id);
}

// Ses, tarayıcı kuralı gereği ilk tıklama/tuşla başlar
let audioReady = false;
function ensureAudio() {
  if (audioReady) return;
  audioReady = true;
  initAudio();
  if (!inGame) playMusic(MENU_MUSIC);
}
addEventListener('pointerdown', ensureAudio);
addEventListener('keydown', ensureAudio);

let inGame = false;
let timeAttack = false;
let endlessRound = 1;
let lastRun = null;   // tekrar oynamak için

// ------------------------------------------------------------------
// Ana menü
// ------------------------------------------------------------------
function toMenu() {
  inGame = false;
  endRun();
  showBackdrop(LEVELS[Math.floor(Math.random() * LEVELS.length)]);
  if (audioReady) playMusic(MENU_MUSIC);
  renderMenu();
  show('mainMenu');
}

function renderMenu() {
  $('continueBtn').textContent = save.storySeen ? '▶ Misket Kasabası\'na dön' : '▶ Hikâyeye başla';
  const stars = LEVELS.reduce((a, l) => a + (save.levels[l.id]?.stars || 0), 0);
  const ending = save.ending ? `  ·  ${ENDINGS[save.ending].art} ${ENDINGS[save.ending].title}` : '';
  $('menuStats').textContent = `⭐ ${stars}/${LEVELS.length * 3}  ·  📓 ${save.notebook.length}/${Object.keys(EVIDENCE).length}  ·  ♾ ${save.endlessBest || 0}${ending}`;
  $('timeAttack').checked = timeAttack;
}

$('continueBtn').onclick = () => {
  if (!save.storySeen) return playIntro(() => startHub());
  startHub();
};
$('multiBtn').onclick = openMultiplayer;
$('challengeBtn').onclick = () => { renderChallenges(); show('challengeList'); };
$('notebookBtn').onclick = () => { renderNotebook($('nbBody')); $('notebook').classList.add('show'); };
$('selectBtn').onclick = () => { renderLevelSelect(); show('levelSelect'); };
$('endlessBtn').onclick = () => { endlessRound = 1; startEndless(); };
$('editorBtn').onclick = () => { show(null); openEditor({ onTest: testCustom, onClose: toMenu }); };
$('customBtn').onclick = () => { renderCustomList(); show('customList'); };
$('settingsMenuBtn').onclick = () => openSettings(() => show('mainMenu'));
$('helpBtn').onclick = () => show('howto');
$('quitBtn').onclick = () => window.close();
$('timeAttack').onchange = e => { timeAttack = e.target.checked; };
document.querySelectorAll('[data-back]').forEach(b => (b.onclick = () => show('mainMenu')));

// ------------------------------------------------------------------
// Bölüm seçimi
// ------------------------------------------------------------------
function renderLevelSelect() {
  const box = $('levelCards');
  box.innerHTML = '';
  LEVELS.forEach((l, i) => {
    const rec = save.levels[l.id];
    const locked = i >= save.unlocked;
    const card = document.createElement('button');
    card.className = 'level-card' + (locked ? ' locked' : '');
    card.style.setProperty('--c', '#' + l.theme.accent.toString(16).padStart(6, '0'));
    card.innerHTML = `<b>${i + 1}. ${l.title}</b>
      <span class="stars">${[0, 1, 2].map(k => (k < (rec?.stars || 0) ? '★' : '☆')).join('')}</span>
      <small>${locked ? '🔒 Kilitli' : rec ? `En iyi süre: ${fmt(rec.best)}` : 'Henüz oynanmadı'}</small>`;
    card.disabled = locked;
    card.onclick = () => startStory(i);
    box.appendChild(card);
  });
}

// ------------------------------------------------------------------
// Hikâye
// ------------------------------------------------------------------
function playIntro(then) {
  let page = 0;
  show('story');
  const render = () => {
    typeText($('storyText'), STORY_INTRO[page]);
    $('storyNext').textContent = page < STORY_INTRO.length - 1 ? 'Devam ▶' : 'Maceraya başla! 🔮';
  };
  $('storyNext').onclick = () => {
    page++;
    if (page >= STORY_INTRO.length) { save.storySeen = true; persist(); then(); }
    else render();
  };
  render();
}

let typeTimer = 0;
function typeText(el, text) {
  clearInterval(typeTimer);
  el.textContent = '';
  let i = 0;
  typeTimer = setInterval(() => {
    el.textContent = text.slice(0, ++i);
    if (i % 3 === 0) sfx.click?.();
    if (i >= text.length) clearInterval(typeTimer);
  }, 28);
}

// Kasaba: hikâyenin merkezi. Labirentlere buradaki kapılardan inilir.
function startHub(spawn) {
  launch({
    def: HUB, mode: 'hub', friends: [], spawn: Array.isArray(spawn) ? spawn : undefined,
    onPortal: to => {
      if (to === 'court') return openCourt();
      if (EXTRA[to]) return startExtra(EXTRA[to]);
      startStory(to);
    },
  });
}

function startStory(i) {
  const friends = LEVELS.slice(0, i).map(l => l.friend);
  launch({
    def: LEVELS[i], mode: 'story', index: i, friends, timeAttack,
    onComplete: res => {
      const before = storyStage();
      recordLevel(LEVELS[i].id, res.stars, res.time);
      save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, i + 2));
      persist();
      const last = storyStage() === LEVELS.length && before < LEVELS.length;
      const gained = Object.values(ABILITIES).find(a => a.from === storyStage() && before < a.from);
      const story = LEVELS[i].story + (gained ? ` Yeni yetenek: ${gained.name}. ${gained.hint}` : '');
      showResult(`${LEVELS[i].title} tamamlandı!`, res, story,
        last ? '⚖ Meydan kürsüsüne çık' : '🏘 Kasabaya dön ▶',
        () => {
          if (last) return openCourt();
          const portal = HUB.portals.find(p => p.to === i);
          startHub([portal.at[0] + 1, portal.at[1]]);   // geldiği kapının yanına ışınlanır
        });
    },
  });
}

// Parkurlar ve gece bölümleri
const portalSpawn = id => {
  const p = HUB.portals.find(o => o.to === id);
  return p ? [p.at[0] + 1, p.at[1]] : undefined;
};
function startExtra(def) {
  launch({
    def, mode: def.night ? 'night' : 'parkour', friends: [],
    onComplete: res => {
      recordLevel(def.id, res.stars, res.time);
      const isLastNight = def.id === NIGHT[NIGHT.length - 1].id;
      if (def.night) { save.nights = Math.max(save.nights, NIGHT.indexOf(def) + 1); persist(); }
      if (isLastNight) return openFinalChoice();
      showResult(`${def.title} tamamlandı!`, res, def.story, '🏘 Kasabaya dön ▶', () => startHub(portalSpawn(def.id)));
    },
  });
}

// Son gecenin sonu: kararı oyuncu verir
function openFinalChoice() {
  inGame = false;
  endRun();
  showBackdrop(HUB);
  show(null);
  $('finalChoice').classList.add('show');
  typeText($('finalText'), 'Dişliler kırıldı. Saatçi yerde, kadranı çatlamış; artık konuşmuyor, yalnızca tıklıyor. Önünde iki kol var. Biri makineyi sonsuza dek durdurur; kimse uyanmaz, kimse ölmez. Öteki saati ileri kurar; altmış yıl önceki kış kaldığı yerden devam eder. Sırtındaki anahtar seni bekliyor.');
  const finish = key => {
    $('finalChoice').classList.remove('show');
    save.finalChoice = key; persist();
    const c = FINAL_CHOICES[key];
    sfx.win();
    show('ending');
    $('endingArt').textContent = c.art;
    $('endingTitle').textContent = c.title;
    typeText($('endingText'), c.text);
    $('endingScore').textContent = 'Kasabaya dönüp bakabilirsin. Kürsüdeki soruların biri artık sana da soruluyor.';
    $('endingFriends').innerHTML = '';
    $('endingHub').style.display = '';
  };
  $('finalStop').textContent = '🕰 Saati sonsuza dek durdur';
  $('finalWind').textContent = '❄️ Anahtarı çevir, kışı geri getir';
  $('finalStop').onclick = () => finish('durdur');
  $('finalWind').onclick = () => finish('kur');
}

// Hikâye Analizi: kanıtlar kürsüde ortaya konur, son ona göre belirlenir
function openCourt() {
  inGame = false;
  endRun();
  showBackdrop(HUB);
  show(null);
  openAnalysis({ onDone: showEnding, onLeave: () => startHub() });
}

function showEnding(res, ending) {
  sfx.win();
  show('ending');
  $('endingArt').textContent = ending.art;
  $('endingTitle').textContent = ending.title;
  typeText($('endingText'), ending.text);
  $('endingScore').textContent = `Doğru cevap: ${res.right}/${res.total}  ·  Doğru kanıt: ${res.proved}/${res.total}`;
  $('endingFriends').innerHTML = LEVELS.map(l => `<span style="background:#${l.friend.toString(16).padStart(6, '0')}"></span>`).join('');
  $('endingHub').style.display = res.ending === 'gercek' ? 'none' : '';
}
$('endingBtn').onclick = toMenu;
$('endingHub').onclick = () => startHub();

// ------------------------------------------------------------------
// Meydan okumalar
// ------------------------------------------------------------------
function renderChallenges() {
  const box = $('challengeCards');
  box.innerHTML = '';
  CHALLENGES.forEach(c => {
    const rec = save.challenges[c.id];
    const card = document.createElement('button');
    card.className = 'level-card';
    card.style.setProperty('--c', rec?.done ? '#' + c.reward.toString(16).padStart(6, '0') : 'rgba(255,255,255,.25)');
    card.innerHTML = `<b>${c.icon} ${c.title} ${rec?.done ? '✅' : ''}</b><small>${c.text}</small>
      <small>${rec?.done ? `En iyi: ${fmt(rec.best)}` : '🎁 Ödül: yeni misket rengi'}</small>`;
    card.onclick = () => startChallenge(c);
    box.appendChild(card);
  });
}

function startChallenge(c) {
  const lvl = LEVELS[c.level];
  launch({
    def: challengeDef(lvl, c.rules), rules: c.rules, mode: 'challenge', friends: [], goalText: c.text,
    onComplete: res => {
      const first = !save.challenges[c.id]?.done;
      save.challenges[c.id] = { done: true, best: Math.min(save.challenges[c.id]?.best ?? Infinity, res.time) };
      persist();
      showResult(`${c.icon} ${c.title} başarıldı!`, res, first ? '🎁 Yeni misket rengi açıldı! Çok oyunculu menüsünde seçebilirsin.' : '',
        'Listeye dön', () => { toMenu(); renderChallenges(); show('challengeList'); });
    },
  });
}

// ------------------------------------------------------------------
// Sonsuz mod
// ------------------------------------------------------------------
function startEndless() {
  const def = generateLevel(endlessRound);
  launch({
    def, mode: 'endless', friends: [], timeAttack,
    onComplete: res => {
      save.endlessBest = Math.max(save.endlessBest || 0, endlessRound);
      persist();
      showResult(`Tur ${endlessRound} tamamlandı!`, res, 'Bir sonraki labirent daha büyük ve daha tehlikeli olacak...',
        `Tur ${endlessRound + 1} ▶`, () => { endlessRound++; startEndless(); });
    },
  });
}

// ------------------------------------------------------------------
// Kendi labirentlerim + editör testi
// ------------------------------------------------------------------
function renderCustomList() {
  const ul = $('customItems');
  ul.innerHTML = '';
  if (!save.custom.length) ul.innerHTML = '<li class="muted">Henüz kayıtlı labirent yok. Bölüm Editörü ile bir tane yap!</li>';
  save.custom.forEach(def => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.textContent = `▶ ${def.title}`;
    b.onclick = () => launch({
      def, mode: 'custom', friends: [], timeAttack,
      onComplete: res => showResult(`${def.title} tamamlandı!`, res, '', 'Listeye dön', () => { toMenu(); renderCustomList(); show('customList'); }),
    });
    li.appendChild(b);
    ul.appendChild(li);
  });
}

function testCustom(def) {
  $('editor').classList.remove('show');
  const back = () => { inGame = false; endRun(); show(null); openEditor({ onTest: testCustom, onClose: toMenu }); };
  launch({
    def, mode: 'test', friends: [], timeAttack: false,
    onComplete: res => showResult('Test tamamlandı!', res, 'Labirentin çözülebilir. Editöre dönüp kaydedebilirsin.', 'Editöre dön', back),
    onQuit: back,
  });
}

// ------------------------------------------------------------------
// Oyunu başlatma ve sonuç ekranı
// ------------------------------------------------------------------
function launch(r) {
  inGame = true;
  lastRun = r;
  show(null);
  startRun({ onQuit: toMenu, onSettings: () => openSettings(() => show(null)), ...r });
}

function showResult(title, res, story, nextLabel, next) {
  show('result');
  $('resTitle').textContent = title;
  const starEls = [...$('resStars').children];
  starEls.forEach(s => s.classList.remove('on'));
  for (let k = 0; k < res.stars; k++) setTimeout(() => { starEls[k].classList.add('on'); sfx.gem(); }, 350 + k * 380);
  $('resCriteria').innerHTML = [
    '⭐ Labirenti bitirdin',
    `${res.timeOk ? '⭐' : '☆'} Hedef süre (${fmt(res.par)}) — senin süren: ${fmt(res.time)}`,
    res.gemsTotal
      ? `${res.third ? '⭐' : '☆'} Gizli mücevherler: ${res.gems}/${res.gemsTotal}`
      : `${res.third ? '⭐' : '☆'} Hiç can kaybetmeden bitir (kaybedilen: ${res.livesLost})`,
  ].map(t => `<li>${t}</li>`).join('');
  $('resStory').textContent = story || '';
  $('resStory').style.display = story ? '' : 'none';
  $('resNext').textContent = nextLabel;
  $('resNext').onclick = next;
  $('resRetry').onclick = () => launch(lastRun);
  $('resMenu').onclick = toMenu;
}

// ------------------------------------------------------------------
// Ayarlar
// ------------------------------------------------------------------
let settingsBack = null;
function openSettings(back) {
  settingsBack = back;
  const s = save.settings;
  $('setMusic').value = s.music; $('setSfx').value = s.sfx; $('setSens').value = s.mouseSens;
  $('setTts').checked = s.tts; $('setQuality').value = s.quality; $('setCam').value = s.camMode;
  $('settings').classList.add('show');
  if (!inGame) show('settings');
}
$('setMusic').oninput = e => { save.settings.music = Number(e.target.value); applyVolumes(); persist(); };
$('setSfx').oninput = e => { save.settings.sfx = Number(e.target.value); applyVolumes(); persist(); sfx.click(); };
$('setSens').oninput = e => { save.settings.mouseSens = Number(e.target.value); persist(); };
$('setTts').onchange = e => { save.settings.tts = e.target.checked; persist(); };
$('setQuality').onchange = e => { save.settings.quality = e.target.value; persist(); applyQuality(); };
$('setCam').innerHTML = CAM_NAMES.map((n, i) => `<option value="${i}">${n}</option>`).join('');
$('setCam').onchange = e => { setCamMode(Number(e.target.value), true); };
$('setReset').onclick = () => {
  if (!confirm('Bütün ilerleme (yıldızlar, açılan bölümler) silinsin mi? Kendi labirentlerin kalır.')) return;
  Object.assign(save, { unlocked: 1, levels: {}, endlessBest: 0, storySeen: false, notebook: [], ending: null, challenges: {}, coins: 0, items: [], potions: 0, nights: 0, finalChoice: null });
  persist();
  renderMenu();
};
$('settingsClose').onclick = () => { $('settings').classList.remove('show'); settingsBack?.(); };

// ------------------------------------------------------------------
setupTouch();
applyQuality();
initLobby({
  show,
  toMenu,
  notify: msg => toast(msg, 4000),
  launchMatch: launch,
  onMatchEnd: () => { inGame = false; endRun(); show(null); },
});
toMenu();
