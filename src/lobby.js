// Çok oyunculu menü ve lobi: oda kurma/katılma, oyun türü seçimi, maç başlatma ve sonuç.
import { LEVELS, HUB, PARKOUR, EXTRA } from './levels.js';
import { CHALLENGES, BASE_COLORS, challengeDef } from './challenges.js';
import { generateLevel } from './generator.js';
import { net, onNet, connectNet, sendNet, lockRoom, closeNet, DEFAULT_PORT } from './net.js';
import { save, persist } from './save.js';
import { sfx } from './audio.js';

const $ = id => document.getElementById(id);
const MODES = {
  world: { label: '🌍 Serbest Dünya', text: 'Kasabada birlikte dolaşın. Biri ışınlanma kapısına girince herkes o labirente gider.', jokers: 4 },
  race: { label: '🏁 Yarış', text: 'İlk çukura atlayan kazanır. Jokerler serbest.', jokers: 6 },
  hunt: { label: '💎 Mücevher Avı', text: '2 dakikada en çok mücevheri toplayan kazanır. Jokerler serbest.', jokers: 6 },
  challenge: { label: '🎯 Meydan Okuma', text: 'Herkes aynı zorlu kuralla yarışır. Jokerler serbest.', jokers: 4 },
  coop: { label: '🤝 Birlikte Macera', text: 'Kapıları ve kutuları beraber çözün. Jokerler düşmanlara işler.', jokers: 2 },
};

let hooks = null;      // { show, launchMatch, toMenu }
let hosting = false;
let view = null;       // 'menu' | 'lobby' | 'match'
let hostAddress = '';  // ev sahibinin paylaşacağı adres
const choice = { mode: 'world', level: 'random', challenge: 0 };
let currentMode = null;

const colorsAvailable = () => [...BASE_COLORS, ...CHALLENGES.filter(c => save.challenges[c.id]?.done).map(c => c.reward)];

function setError(t) { $('mpError').textContent = t || ''; }

async function stopHosting() {
  if (hosting) { hosting = false; await window.misketHost?.stop(); }
}

function profile() {
  save.profile.name = $('mpName').value.trim().slice(0, 16) || 'Misket';
  persist();
  return { name: save.profile.name, color: save.profile.color };
}

function renderSwatches() {
  const box = $('mpColors');
  box.textContent = '';
  for (const c of colorsAvailable()) {
    const b = document.createElement('button');
    b.className = 'swatch' + (c === save.profile.color ? ' on' : '');
    b.style.background = '#' + c.toString(16).padStart(6, '0');
    b.onclick = () => { save.profile.color = c; persist(); renderSwatches(); };
    box.appendChild(b);
  }
}

export function openMultiplayer() {
  view = 'menu';
  $('mpName').value = save.profile.name;
  $('mpAddress').value = save.lastHost;
  $('mpCode').value = '';
  $('mpHostLan').style.display = window.misketHost ? '' : 'none';
  setError('');
  renderSwatches();
  hooks.show('mpMenu');
}

async function hostLan() {
  setError('');
  try {
    const info = await window.misketHost.start();
    hosting = true;
    await connectNet(`127.0.0.1:${info.port}`, { t: 'create', ...profile() });
    const suffix = info.port === DEFAULT_PORT ? '' : `:${info.port}`;
    hostAddress = info.addresses.length ? info.addresses.map(a => a + suffix).join('  veya  ') : `127.0.0.1${suffix}`;
    openLobby();
  } catch (e) {
    await stopHosting();
    setError(e.message || 'Oda kurulamadı.');
  }
}

async function remote(hello) {
  const address = $('mpAddress').value.trim();
  if (!address) return setError('Önce sunucu adresini yaz.');
  setError('');
  try {
    await connectNet(address, { ...hello, ...profile() });
    save.lastHost = address; persist();
    hostAddress = address;
    openLobby();
  } catch (e) { setError(e.message); }
}

// ------------------------------------------------------------------
// Lobi
// ------------------------------------------------------------------
function openLobby() {
  view = 'lobby';
  if (net.isHost) lockRoom(false);
  renderLobby();
  hooks.show('lobby');
}

function renderLobby() {
  $('lobbyAddress').textContent = `Adres: ${hostAddress}`;
  $('lobbyCode').textContent = `Oda kodu: ${net.room}`;
  const list = $('lobbyPlayers');
  list.textContent = '';
  const players = [...net.players.values()];
  for (let i = 0; i < 5; i++) {
    const p = players[i];
    const li = document.createElement('li');
    const dot = document.createElement('i');
    const name = document.createElement('span');
    if (p) {
      dot.style.background = '#' + p.color.toString(16).padStart(6, '0');
      name.textContent = p.name + (p.id === net.hostId ? ' 👑' : '') + (p.id === net.id ? ' (sen)' : '');
    } else {
      li.className = 'empty';
      name.textContent = 'Boş yer';
    }
    li.append(dot, name);
    list.appendChild(li);
  }

  const host = net.isHost;
  for (const id of ['lobbyMode', 'lobbyLevel', 'lobbyChallenge']) $(id).disabled = !host;
  $('lobbyStart').style.display = host ? '' : 'none';
  $('lobbyWait').style.display = host ? 'none' : '';
  $('lobbyMode').value = choice.mode;
  const usesChallenge = choice.mode === 'challenge', usesLevel = choice.mode === 'race' || choice.mode === 'coop';
  $('lobbyChallengeRow').style.display = usesChallenge ? '' : 'none';
  $('lobbyLevelRow').style.display = usesLevel ? '' : 'none';
  $('lobbyChallenge').value = choice.challenge;
  // Birlikte Macera hikâye labirentlerinde oynanır
  $('lobbyRandom').disabled = choice.mode === 'coop';
  if (choice.mode === 'coop' && choice.level === 'random') choice.level = 0;
  $('lobbyLevel').value = choice.level;
  $('lobbyModeText').textContent = MODES[choice.mode].text;
}

function shareChoice() {
  if (net.isHost) sendNet({ k: 'lobby', ...choice });
  renderLobby();
}

// Haritanın boş hücrelerine joker kutuları dağıtır
function placeJokers(def, count) {
  const free = [];
  const taken = new Set((def.powerups || []).map(p => p.at.join()));
  def.grid.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch === '.' && !def.heights?.[r]?.[c]?.match(/[1-9<>^v]/) && !taken.has(`${r},${c}`)) free.push([r, c]);
  }));
  for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
  return free.slice(0, count).map((at, i) => ({ at, type: i % 2 ? 'electric' : 'ice' }));
}

function buildMatch(c = choice) {
  const mode = c.mode;
  let def, rules = null;
  if (mode === 'world') def = HUB;
  else if (mode === 'hunt') def = generateLevel(4, { hunt: true });
  else if (mode === 'challenge') {
    const ch = CHALLENGES[c.challenge];
    rules = { ...ch.rules };
    // Tek oyunculu koşullar yarışta anlamsız: yalnızca hareketi etkileyenler kalır
    delete rules.lives; delete rules.allGems; delete rules.useJokers; delete rules.swarm;
    def = challengeDef(LEVELS[ch.level], ch.rules);
  } else def = c.level === 'random' ? generateLevel(4) : EXTRA[c.level] || LEVELS[c.level];
  const out = { ...def };
  // Yarışta hikâye ögeleri dikkat dağıtır; birlikte macerada kalır
  if (mode !== 'coop' && mode !== 'world') { delete out.details; delete out.npcs; delete out.signs; }
  out.jokers = placeJokers(out, MODES[mode].jokers);
  // Hafıza kapısı herkeste aynı sırayı göstersin
  if (out.gates) {
    out.gates = Object.fromEntries(Object.entries(out.gates).map(([k, g]) => [k,
      g.type === 'simon' ? { ...g, seq: Array.from({ length: g.length || 4 }, () => 'ryeb'[Math.floor(Math.random() * 4)]) } : g]));
  }
  return { mode, def: out, rules, order: [...net.players.keys()] };
}

function validMatch(d) {
  const g = d.def?.grid;
  return Array.isArray(g) && g.length >= 3 && g.length <= 61 && g.every(row => typeof row === 'string' && row.length <= 61)
    && MODES[d.mode] && d.def.theme && Array.isArray(d.order);
}

// Serbest dünyada kapıya giren oyuncu herkesi o labirente götürür
function portalTo(level) {
  const known = (Number.isInteger(level) && LEVELS[level]) || (PARKOUR.includes(EXTRA[level]) && EXTRA[level]);
  if (!known || currentMode !== 'world') return;
  const match = buildMatch({ mode: 'coop', level });
  sendNet({ k: 'start', ...match });
  startMatch(match);
}

function startMatch(match) {
  view = 'match';
  currentMode = match.mode;
  hooks.launchMatch({
    def: match.def,
    rules: match.rules || undefined,
    goalText: MODES[match.mode].text,
    net: {
      mode: match.mode,
      color: net.players.get(net.id)?.color,
      slot: Math.max(0, match.order.indexOf(net.id)),
      onEnd: ranking => showMatchResult(match.mode, ranking),
      onPortal: to => { if (net.isHost) portalTo(to); else sendNet({ k: 'portal', to }, net.hostId); },
    },
    onQuit: leaveRoom,
    onComplete: () => {},
  });
}

function showMatchResult(mode, ranking) {
  view = 'result';
  hooks.onMatchEnd();
  sfx.win();
  const list = $('mpRanking');
  list.textContent = '';
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const noWinner = mode !== 'hunt' && !ranking.some(r => r.time !== null);
  $('mpWinner').textContent = mode === 'coop'
    ? (noWinner ? 'Süre doldu!' : 'Labirent aşıldı!')
    : noWinner ? 'Kimse bitiremedi!' : `🏆 ${ranking[0].name} kazandı!`;
  (Array.isArray(ranking) ? ranking : []).forEach((r, i) => {
    const li = document.createElement('li');
    const dot = document.createElement('i');
    dot.style.background = '#' + (Number(r.color) || 0).toString(16).padStart(6, '0');
    const name = document.createElement('span');
    name.textContent = `${i + 1}. ${r.name}`;
    const score = document.createElement('b');
    score.textContent = mode === 'hunt' ? `💎 ${r.gems}` : r.time === null ? 'bitiremedi' : `⏱ ${fmt(r.time)}`;
    li.append(dot, name, score);
    list.appendChild(li);
  });
  hooks.show('mpResult');
}

async function leaveRoom() {
  view = null;
  closeNet();
  await stopHosting();
  hooks.toMenu();
}

// ------------------------------------------------------------------
onNet(msg => {
  if (msg.t === 'closed') {
    if (!view || view === 'menu') return;
    stopHosting();
    view = null;
    hooks.toMenu();
    hooks.notify('Bağlantı koptu.');
    return;
  }
  if (msg.t === 'joined' || msg.t === 'left') {
    if (view === 'lobby') {
      renderLobby();
      // Sonradan gelen oyuncu seçili ayarları görsün
      if (msg.t === 'joined' && net.isHost) sendNet({ k: 'lobby', ...choice }, msg.player.id);
    }
    return;
  }
  if (msg.t !== 'msg' || !msg.d) return;
  const d = msg.d;
  if (msg.from === net.hostId) {
    if (d.k === 'lobby' && MODES[d.mode]) {
      Object.assign(choice, { mode: d.mode, level: d.level, challenge: d.challenge });
      if (view === 'lobby') renderLobby();
    } else if (d.k === 'start' && (view === 'lobby' || view === 'result' || view === 'match')) {
      if (validMatch(d)) startMatch(d);
    }
  }
  if (d.k === 'portal' && net.isHost && view === 'match') portalTo(d.to);
});

export function initLobby(h) {
  hooks = h;
  $('lobbyMode').innerHTML = Object.entries(MODES).map(([k, m]) => `<option value="${k}">${m.label}</option>`).join('');
  $('lobbyLevel').innerHTML = '<option value="random" id="lobbyRandom">🎲 Rastgele labirent</option>' +
    LEVELS.map((l, i) => `<option value="${i}">${l.title}</option>`).join('') +
    PARKOUR.map(p => `<option value="${p.id}">🌤 ${p.title}</option>`).join('');
  $('lobbyChallenge').innerHTML = CHALLENGES.map((c, i) => `<option value="${i}">${c.icon} ${c.title}: ${c.text}</option>`).join('');
  $('lobbyMode').onchange = e => { choice.mode = e.target.value; shareChoice(); };
  $('lobbyLevel').onchange = e => { const v = e.target.value; choice.level = v === 'random' || EXTRA[v] ? v : Number(v); shareChoice(); };
  $('lobbyChallenge').onchange = e => { choice.challenge = Number(e.target.value); shareChoice(); };
  $('lobbyStart').onclick = () => {
    const match = buildMatch();
    lockRoom(true);
    sendNet({ k: 'start', ...match });
    startMatch(match);
  };
  $('lobbyLeave').onclick = leaveRoom;
  $('mpHostLan').onclick = hostLan;
  $('mpHostRemote').onclick = () => remote({ t: 'create' });
  $('mpJoin').onclick = () => remote({ t: 'join', room: $('mpCode').value.trim() });
  $('mpBack').onclick = () => hooks.show('mainMenu');
  $('mpToLobby').onclick = openLobby;
  $('mpLeave').onclick = leaveRoom;
}
