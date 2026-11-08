// Oyun çekirdeği: sahne, fizik, labirent kurulumu, düşmanlar, bulmacalar, efektler ve kamera.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CELL, CLIMB, buildHeightInfo, heightAt, slopeAt } from './maplogic.js';
import { createMarbleMesh, marbleTexture, MARBLE_R as R } from './marble.js';
import { makeSky, makeClouds, makeTerrain, makeForest, makeHubGround, buildDecor, makePortalGate, textures } from './scenery.js';
import { makeFace, blinkFace, makeCharacter, makeDetail, makeLimbs, setStanding, makeHuman, animateHuman, setHeld, makeMonster, LIMB_LIFT } from './characters.js';
import { CAST, DIALOGUE, SIGNS, EVIDENCE, ABILITIES, addNote, storyStage } from './story.js';
import { renderNotebook } from './notebook.js';
import { LEVELS, EXTRA, extraLocked } from './levels.js';
import { net, onNet, sendNet } from './net.js';
import { save, persist } from './save.js';
import { sfx, setRolling, playMusic, speak, stopSpeaking } from './audio.js';
import { keys, setInputEnabled, onAction, consumeMouse, pollGamepad, analogMove, padLook } from './input.js';

const WALL_H = 1.6;
const MAXV = 9.5, GRIP = 7, AIR_GRIP = 1.5, BRAKE = 2.6, GRAV = 22, JUMP_V = 7.5, SLOPE_G = 16, TURN = 2.4;
const CRACK_V = 6.5;                 // bu hızın üstündeki çarpmalar duvarı çatlatır
const START_LIVES = 3, MAX_LIVES = 5;
const SPIKE_P = 2.8, SPIKE_WARN = 1.3, SPIKE_UP = 1.8;
export const CAM_NAMES = ['Üstten', '3. şahıs', '1. şahıs'];
const SWITCH_COLORS = { r: [0xff3b3b, 'Kırmızı'], y: [0xffd23b, 'Sarı'], e: [0x2fd16b, 'Yeşil'], b: [0x3b7bff, 'Mavi'] };
const POWERS = {
  speed: { emoji: '⚡', name: 'Hız', color: 0xffd23b, time: 8 },
  shield: { emoji: '🛡️', name: 'Kalkan', color: 0x4cc9f0, time: 25 },
  magnet: { emoji: '🧲', name: 'Mıknatıs', color: 0xff4d6d, time: 10 },
  freeze: { emoji: '❄️', name: 'Dondur', color: 0x9be7ff, time: 6 },
};
const JOKERS = {
  ice: { emoji: '❄️', name: 'Buz Jokeri', color: 0x9be7ff, time: 15 },
  electric: { emoji: '⚡', name: 'Elektrik Jokeri', color: 0xffe14d, time: 5 },
};
export const ITEMS = {
  fener: { emoji: '🏮', name: 'Fener', slot: 1 },
  kilic: { emoji: '🗡', name: 'Tahta Kılıç', slot: 2 },
  kanca: { emoji: '🪝', name: 'Kanca', slot: 3 },
  iksir: { emoji: '🧪', name: 'İksir', slot: 4 },
  bot: { emoji: '🥾', name: 'Yaylı Bot', passive: 'Zıplama artar', cost: 30 },
  celik: { emoji: '⚔️', name: 'Çelik Kılıç', passive: 'Kılıç iki kat vurur', cost: 40 },
  pil: { emoji: '🔋', name: 'Güçlü Fener Fitili', passive: 'Fener daha uzağı aydınlatır', cost: 25 },
};
const POTION_COST = 10;
const SLOTS = ['fener', 'kilic', 'kanca', 'iksir'];
const JOKER_RESPAWN = 20, CHAIN_R = 6;
const DASH_V = 17, DASH_TIME = 0.22, DASH_COOLDOWN = 1.1;
const NET_RATE = 1 / 15, WORLD_RATE = 1 / 10, FINISH_WAIT = { coop: 45, race: 30, challenge: 30 };
const DIRS = { E: [0, 1], W: [0, -1], N: [-1, 0], S: [1, 0] };

const FUNNY_ALIEN = [
  'Uzaylılar misketini Mars\'taki misket koleksiyonlarına ekledi. 🪐',
  'Uzaylı kaptan: "Bip bop! Bu parlak yuvarlak şeker çok lezzetli görünüyor!" 🍬',
  'Misketin artık Plüton\'da uzaylı çocuklarla bilye oynuyor. 🛸',
  'Uzaylılar misketini galaksiler arası bilye turnuvasına götürdü. Üstelik birinci oldu! 🏆',
  'UFO\'dan gelen ses: "Bunu eve götürüp anneme göstereceğim!" 👽',
  'Uzaylılar misketini yeni lunaparklarının dönme dolabına koydu. Misket hâlâ dönüyor. 🎡',
];
const FUNNY_LIVES = [
  'Misketin başı döndü, biraz uzanması lazım. 😵‍💫',
  'Misket: "Bu labirent beni yedi bitirdi!" 🥴',
  'Misket çok yuvarlandı, yuvarlanmaktan yoruldu. 😮‍💨',
];
const NIGHT_LOSE = ['Sırtındaki anahtar bir tur döndü. Sonra karanlık.', 'Gözünü açtığında yine merdivenin başındaydın. Bir kez daha sayılmıştın.', '"Bir daha," dedi bir ses. "Sabrım var. Altmış yıldır var."'];
const FUNNY_TIME = ['Saat tik tak yaptı, misket uyuyakaldı. 😴', 'Süre doldu! Misket hâlâ yolu arıyor... 🧭'];

const $ = id => document.getElementById(id);
const cx = c => c * CELL + CELL / 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const hex = n => '#' + n.toString(16).padStart(6, '0');
const pick = a => a[Math.floor(Math.random() * a.length)];
const esc = t => String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

// ------------------------------------------------------------------
// Sahne ve görüntü işleme
// ------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
$('view').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10131c);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 1000);
const envTex = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = envTex;
scene.environmentIntensity = 0.32;
const hemi = new THREE.HemisphereLight(0xdfefff, 0x6b6250, 0.85);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
sun.shadow.radius = 3;
scene.add(sun, sun.target);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.14, 0.35, 1.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());

export function applyQuality() {
  const hi = save.settings.quality === 'high';
  const pr = hi ? Math.min(devicePixelRatio, 2) : 1;
  renderer.setPixelRatio(pr);
  composer.setPixelRatio(pr);
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  if (renderer.shadowMap.enabled !== hi) {
    renderer.shadowMap.enabled = hi;
    scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => (m.needsUpdate = true)); });
  }
}
applyQuality();
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  applyQuality();
});

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const emojiCache = {};
function emojiTex(e) {
  return (emojiCache[e] ||= canvasTex(128, 128, g => {
    g.font = '100px "Segoe UI Emoji", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(e, 64, 72);
  }));
}
function labelTex(text, bg, fg) {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = fg; g.font = `bold ${text.length > 2 ? 40 : 72}px "Segoe UI Emoji", "Segoe UI", sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 4);
  });
}

// Çatlak dokuları: merkezden dallanan kırık çizgileri
const crackTextures = Array.from({ length: 4 }, () => {
  const t = canvasTex(256, 256, g => {
    const branch = (x, y, ang, len, w) => {
      if (len < 6 || w < 0.6) return;
      const nx = x + Math.cos(ang) * len, ny = y + Math.sin(ang) * len;
      g.strokeStyle = 'rgba(20,14,10,0.9)'; g.lineWidth = w;
      g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = w * 0.4;
      g.beginPath(); g.moveTo(x + 1, y + 1); g.lineTo(nx + 1, ny + 1); g.stroke();
      branch(nx, ny, ang + (Math.random() - 0.5) * 0.9, len * 0.72, w * 0.75);
      if (Math.random() < 0.45) branch(nx, ny, ang + (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.6), len * 0.55, w * 0.6);
    };
    const n = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) branch(128, 128, (i / n) * Math.PI * 2 + Math.random() * 0.5, 22 + Math.random() * 18, 4.5);
    g.fillStyle = 'rgba(20,14,10,0.85)'; g.beginPath(); g.arc(128, 128, 9, 0, Math.PI * 2); g.fill();
  });
  return t;
});

function textSprite(text, color = '#ffffff', scale = 1) {
  const tex = canvasTex(512, 96, (g, w, h) => {
    g.font = 'bold 54px "Segoe UI", "Segoe UI Emoji", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(text, w / 2, h / 2);
    g.fillStyle = color; g.fillText(text, w / 2, h / 2);
  });
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, fog: false }));
  spr.scale.set(3.2 * scale, 0.6 * scale, 1);
  spr.renderOrder = 5;
  return spr;
}

// ------------------------------------------------------------------
// Parçacıklar (toplama, çarpma, toz, iz)
// ------------------------------------------------------------------
class Particles {
  constructor(max = 900) {
    this.max = max; this.i = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max);
    this.base = new Float32Array(max * 3); this.grav = new Float32Array(max);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.16, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.points.frustumCulled = false;
    for (let k = 0; k < max; k++) this.pos[k * 3 + 1] = -999;
  }
  emit(x, y, z, n, color, speed = 3, life = 0.7, grav = 6, up = 1.5) {
    const c = new THREE.Color(color);
    for (let k = 0; k < n; k++) {
      const i = this.i = (this.i + 1) % this.max, j = i * 3;
      const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
      this.pos[j] = x; this.pos[j + 1] = y; this.pos[j + 2] = z;
      this.vel[j] = Math.cos(a) * s; this.vel[j + 1] = up * (0.5 + Math.random()) * (speed / 3); this.vel[j + 2] = Math.sin(a) * s;
      this.life[i] = this.maxLife[i] = life * (0.6 + Math.random() * 0.4);
      this.base[j] = c.r; this.base[j + 1] = c.g; this.base[j + 2] = c.b;
      this.grav[i] = grav;
    }
  }
  update(dt) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      const j = i * 3;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.pos[j + 1] = -999; continue; }
      this.vel[j + 1] -= this.grav[i] * dt;
      this.pos[j] += this.vel[j] * dt; this.pos[j + 1] += this.vel[j + 1] * dt; this.pos[j + 2] += this.vel[j + 2] * dt;
      const f = this.life[i] / this.maxLife[i];
      this.col[j] = this.base[j] * f; this.col[j + 1] = this.base[j + 1] * f; this.col[j + 2] = this.base[j + 2] * f;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}
const particles = new Particles();
scene.add(particles.points);

// ------------------------------------------------------------------
// Misket, kalkan balonu, takipçi arkadaşlar
// ------------------------------------------------------------------
const marbleMesh = createMarbleMesh(envTex);
marbleMesh.visible = false;
scene.add(marbleMesh);
const shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(R * 1.45, 32, 16),
  new THREE.MeshPhysicalMaterial({ color: 0x4cc9f0, emissive: 0x1a6f9a, transparent: true, opacity: 0.28, roughness: 0.1, depthWrite: false }));
shieldMesh.visible = false;
scene.add(shieldMesh);
const hookLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xe8e8ee }));
hookLine.visible = false; hookLine.frustumCulled = false;
scene.add(hookLine);
const faceMesh = makeFace(R);
faceMesh.visible = false;
scene.add(faceMesh);
const makeIce = () => new THREE.Mesh(new THREE.BoxGeometry(R * 2.7, R * 2.7, R * 2.7),
  new THREE.MeshPhysicalMaterial({ color: 0xbdf0ff, emissive: 0x3aa7d8, emissiveIntensity: 0.35, transparent: true, opacity: 0.55, roughness: 0.05, depthWrite: false }));
// İnsan formu: yalnızca bu bilgisayarda çizilir, ağa hiçbir bilgi gitmez
const humanMesh = makeHuman();
humanMesh.visible = false;
scene.add(humanMesh);
const iceMesh = makeIce();
iceMesh.visible = false;
scene.add(iceMesh);
let marbleColor;
function paintMarble(color) {
  if (color === marbleColor) return;
  marbleColor = color;
  marbleMesh.material.map?.dispose();
  marbleMesh.material.map = marbleTexture(color);
  marbleMesh.material.needsUpdate = true;
}

// ------------------------------------------------------------------
// Oyun durumu
// ------------------------------------------------------------------
let run = null;          // { def, mode, onComplete, onQuit, onSettings, friends, timeAttack }
let L = null;            // aktif labirent
let state = 'idle';      // idle | play | fall | exit | abduct | lost | done
let paused = false, modal = null;
let gameTime = 0, enemyTime = 0;
let camMode = save.settings.camMode || 0, yaw = 0, pitch = 0.45, fpPitch = -0.2, zoom = 1, showMap = true, snapCam = true;
let shake = 0;
const pos = new THREE.Vector3(), vel = new THREE.Vector2();
let vy = 0, onGround = true, fallVy = 0, exitT = 0, jumpQueued = false, abduct = null;
const camTarget = new THREE.Vector3(), camDesired = new THREE.Vector3(), camLook = new THREE.Vector3();
const history = [];
let airJumps = 1;
let warp = null, arrive = null;
const WARP_TIME = 1.5, ARRIVE_TIME = 1.0;
// Oyuncunun geçici durumu: joker etkileri ve atılma
const P = { frozen: 0, shock: 0, immune: 0, dash: 0, dashCd: 0, joker: null, human: false, humanCd: 0, tool: null, lamp: false, pull: null, attackCd: 0 };
let N = null;            // çok oyunculu maç durumu (tek oyunculuda null)
const hasItem = id => id === 'iksir' ? save.potions > 0 : save.items.includes(id);
const isOpen = () => !!(L?.def.hub || L?.def.open);
const hasAbility = a => !!run?.net || (L?.stage ?? 0) >= ABILITIES[a].from;
const netEv = o => { if (N) sendNet({ k: 'ev', ...o }); };

export function isPlaying() { return !!L && state !== 'idle'; }

function disposeTree(o) {
  o.traverse(n => {
    n.geometry?.dispose();
    const mats = Array.isArray(n.material) ? n.material : n.material ? [n.material] : [];
    mats.forEach(m => {
      if (m.map && !m.map.userData?.shared && !crackTextures.includes(m.map) && !Object.values(emojiCache).includes(m.map)) m.map.dispose();
      m.dispose();
    });
  });
}

function pitMesh(x, z, color, emissive, intensity) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(CELL - 0.01, 8, CELL - 0.01),
    new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, side: THREE.BackSide })
  );
  m.position.set(x, -4, z);
  return m;
}

// ------------------------------------------------------------------
// Labirent kurulumu
// ------------------------------------------------------------------
function buildLevel(def) {
  if (L) { scene.remove(L.group); disposeTree(L.group); }
  const th = def.theme, grid = def.grid;
  const H = grid.length, W = grid[0].length;
  const group = new THREE.Group();
  scene.add(group);
  scene.background = new THREE.Color(th.bg);
  scene.fog = def.hub ? new THREE.Fog(th.bg, 90, 420) : new THREE.Fog(th.bg, 45, 260);
  hemi.intensity = 0.85; sun.intensity = 2.6;
  const info = buildHeightInfo(def);

  L = {
    def, grid, W, H, info, group, gates: {}, clues: {}, pads: [], seq: 0, simon: null,
    sliders: [], spinners: [], patrols: [], chasers: [], spikes: {}, hearts: [], gems: [], powerups: [],
    crumbles: {}, boxes: [], plates: [], mirrors: {}, emitters: [], receivers: {}, beam: { group: new THREE.Group(), sig: '' },
    checkpoints: [], cp: null, start: null, exit: null, time: 0, lives: run.rules?.lives ?? START_LIVES, livesLost: 0, inv: 0,
    keys: [], keysFound: 0, cracked: {}, details: [], npcs: [], signs: [], portals: [], jokerBoxes: [], jokersUsed: 0,
    fxLines: [], interact: null, stage: storyStage(), lamp: null, tickers: [],
    coins: [], springs: {}, movers: [], hooks: [], monsters: [], cogs: [], pickups: [], scares: [], beat: 0, whisperT: 8, onMover: null,
    gemsFound: 0, decals: [], fx: { speed: 0, shield: 0, magnet: 0, freeze: 0 }, followers: [], wallTop: [],
  };
  group.add(L.beam.group);

  const cellH = (r, c) => {
    const i = info[r]?.[c];
    return !i ? 0 : i.ramp ? (i.lo + i.hi) / 2 : i.flat;
  };
  const cellTop = (r, c) => { const i = info[r]?.[c]; return !i ? 0 : i.ramp ? i.hi : i.flat; };
  L.cellH = cellH;

  const walls = [], floors = [];
  for (let r = 0; r < H; r++) {
    L.wallTop.push([]);
    for (let c = 0; c < W; c++) {
      const ch = grid[r][c];
      const x = cx(c), z = cx(r), h = cellH(r, c);
      if (ch === '#' && (def.hub || def.sky)) { L.wallTop[r][c] = WALL_H; continue; }   // sınırı çit ve orman gösterir
      if (ch === '#') {
        let m = 0;
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (grid[r + a]?.[c + b] && grid[r + a][c + b] !== '#') m = Math.max(m, cellTop(r + a, c + b));
        walls.push([x, z, WALL_H + m]);
        L.wallTop[r][c] = WALL_H + m;
        continue;
      }
      L.wallTop[r][c] = 0;
      if (ch === 'W') {
        // Çatlak duvar: normal duvara çok benzer, sadece yakından çatlağı görülür
        floors.push([x, z, h, (r + c) % 2]);
        const wallTex = canvasTex(256, 256, g => {
          g.fillStyle = hex(def.crackColor ?? th.wall); g.fillRect(0, 0, 256, 256);
          g.globalAlpha = 0.35; g.drawImage(textures.brick().image, 0, 0, 256, 256);
          g.globalAlpha = 0.6; g.drawImage(crackTextures[(r + c) % 4].image, 0, 0);
        });
        const crackH = def.hub ? 3.1 : WALL_H;
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(CELL, crackH + 0.4, CELL), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85 }));
        mesh.position.set(x, (crackH - 0.4) / 2, z);
        mesh.castShadow = mesh.receiveShadow = true;
        group.add(mesh);
        L.cracked[`${r},${c}`] = { mesh, broken: false, x, z };
        L.wallTop[r][c] = WALL_H;
        continue;
      }
      if (ch === 'O') { if (!def.sky) group.add(pitMesh(x, z, 0x0b0b14, 0x000000, 0)); continue; }
      if (ch === 'E') { buildExit(x, z, r, c, th.accent); continue; }
      if (ch === 'K') {
        group.add(pitMesh(x, z, 0x0b0b14, 0x000000, 0));
        const tile = new THREE.Mesh(new THREE.BoxGeometry(CELL - 0.06, 0.4, CELL - 0.06),
          new THREE.MeshStandardMaterial({ color: new THREE.Color(th.floor1).multiplyScalar(0.7), map: crackTextures[(r + c) % 4], roughness: 0.9 }));
        tile.position.set(x, -0.2, z);
        tile.receiveShadow = true;
        group.add(tile);
        L.crumbles[`${r},${c}`] = { mesh: tile, state: 'idle', t: 0, x, z };
        continue;
      }
      const ramp = info[r][c].ramp;
      if (ramp) group.add(rampMesh(r, c, info[r][c], th));
      else floors.push([x, z, h, (r + c) % 2]);

      if (ch === 'S') { L.start = { x, z }; L.cp = { x, z }; }
      else if (ch === 'C') {
        const mat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6 });
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.06, 32), mat);
        pad.position.set(x, h + 0.03, z); pad.receiveShadow = true;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
        pole.position.set(x + 0.7, h + 0.8, z - 0.7);
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.38), new THREE.MeshStandardMaterial({ color: 0x9aa0a6, side: THREE.DoubleSide }));
        flag.position.set(x + 1.0, h + 1.4, z - 0.7);
        group.add(pad, pole, flag);
        L.checkpoints.push({ x, z, mat, flagMat: flag.material, active: false });
      }
      else if (ch === 'G' || ch === 'H') {
        const gd = def.gates?.[ch] || { type: 'keys', title: 'Kapı', q: 'Bu kapı kilitli.' };
        const symbol = { keys: '🗝', switch: '🌈', plates: '⬛', laser: '🔺', simon: '🎵' }[gd.type] || '🗝';
        const side = new THREE.MeshStandardMaterial({ map: labelTex(symbol, '#3a2a12', '#ffd166'), roughness: 0.6 });
        const top = new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.4, roughness: 0.4 });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(CELL - 0.02, WALL_H, CELL - 0.02), [side, side, top, top, side, side]);
        mesh.position.set(x, h + WALL_H / 2, z);
        mesh.castShadow = mesh.receiveShadow = true;
        group.add(mesh);
        L.gates[ch] = { key: ch, def: gd, mesh, open: false, armed: true, x, z, base: h };
      }
      else if (/[1-9]/.test(ch)) {
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.42),
          new THREE.MeshStandardMaterial({ color: 0x7ee8ff, emissive: 0x1fb6e0, emissiveIntensity: 1.3, roughness: 0.2, metalness: 0.3 }));
        crystal.position.set(x, h + 1, z); crystal.castShadow = true;
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 32), new THREE.MeshBasicMaterial({ color: 0x7ee8ff, transparent: true, opacity: 0.6 }));
        ring.rotation.x = -Math.PI / 2; ring.position.set(x, h + 0.02, z);
        group.add(crystal, ring);
        L.clues[ch] = { mesh: crystal, ring, found: false, x, z, h, t: 0 };
      }
      else if (ch === '$') {
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 20), new THREE.MeshStandardMaterial({ color: 0xffc83d, metalness: 0.9, roughness: 0.25, emissive: 0x6b4a00, emissiveIntensity: 0.5 }));
        coin.rotation.x = Math.PI / 2; coin.castShadow = true;
        group.add(coin);
        L.coins.push({ mesh: coin, x, z, h, taken: false });
      }
      else if (ch === 'J') {
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.14, 24), new THREE.MeshStandardMaterial({ color: 0x38414f, metalness: 0.5 }));
        base.position.set(x, h + 0.07, z);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.12, 24), new THREE.MeshStandardMaterial({ color: 0xff5d8f, emissive: 0xc01848, emissiveIntensity: 0.7 }));
        top.position.set(x, h + 0.2, z);
        base.castShadow = top.castShadow = true;
        group.add(base, top);
        L.springs[`${r},${c}`] = { top, h, t: 0 };
      }
      else if (ch === 'k') {
        const key = new THREE.Group();
        const gold = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0x8a5a00, emissiveIntensity: 0.9, metalness: 0.8, roughness: 0.25 });
        const bow = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 10, 22), gold);
        bow.position.y = 0.26;
        const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 0.07), gold);
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.07), gold);
        tooth.position.set(0.1, -0.15, 0);
        key.add(bow, shaft, tooth);
        key.traverse(o => (o.castShadow = true));
        group.add(key);
        L.keys.push({ mesh: key, x, z, h, taken: false });
      }
      else if (ch === '*') {
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.26),
          new THREE.MeshStandardMaterial({ color: 0xff4fd8, emissive: 0xb0128f, emissiveIntensity: 1.2, metalness: 0.4, roughness: 0.15 }));
        gem.scale.y = 1.5;
        gem.position.set(x, h + 0.7, z); gem.castShadow = true;
        group.add(gem);
        L.gems.push({ mesh: gem, x, z, h, taken: false });
      }
      else if (ch === 'X') {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(CELL * 0.94, 0.04, CELL * 0.94),
          new THREE.MeshStandardMaterial({ color: 0x3a3a40, emissive: 0xff2020, emissiveIntensity: 0, metalness: 0.6, roughness: 0.4 }));
        plate.position.set(x, h + 0.02, z); plate.receiveShadow = true;
        const spikes = new THREE.Group();
        const coneGeo = new THREE.ConeGeometry(0.17, 0.65, 8);
        const coneMat = new THREE.MeshStandardMaterial({ color: 0xd0d4dc, metalness: 0.8, roughness: 0.25 });
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
          const cone = new THREE.Mesh(coneGeo, coneMat);
          cone.position.set(a * 0.55, 0.32, b * 0.55);
          cone.castShadow = true;
          spikes.add(cone);
        }
        spikes.position.set(x, h - 0.7, z);
        group.add(plate, spikes);
        L.spikes[`${r},${c}`] = { plate, spikes, h, off: (r * 0.7 + c * 0.45) % SPIKE_P, up: false };
      }
      else if (ch === '+') {
        const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex('❤️') }));
        spr.scale.setScalar(0.9);
        spr.position.set(x, h + 0.9, z);
        group.add(spr);
        L.hearts.push({ mesh: spr, x, z, h, taken: false });
      }
      else if (ch === 'B') {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.76, 1.76, 1.76), [0, 1, 2, 3, 4, 5].map(() =>
          new THREE.MeshStandardMaterial({ map: crateTexture(), roughness: 0.8 })));
        mesh.position.set(x, h + 0.88, z);
        mesh.castShadow = mesh.receiveShadow = true;
        group.add(mesh);
        L.boxes.push({ mesh, r, c, x, z, h, home: [r, c], moving: null });
      }
      else if (ch === 'P') {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 1.7),
          new THREE.MeshStandardMaterial({ color: 0x777777, emissive: th.accent, emissiveIntensity: 0.35 }));
        mesh.position.set(x, h + 0.04, z);
        group.add(mesh);
        L.plates.push({ mesh, r, c, pressed: false });
      }
      else if (ch === '/' || ch === '\\') {
        const g = new THREE.Group();
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.3, 24), new THREE.MeshStandardMaterial({ color: 0x555b66, metalness: 0.6 }));
        base.position.y = 0.15;
        const panel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.3, 0.12),
          new THREE.MeshStandardMaterial({ color: 0xdfe9ff, metalness: 1, roughness: 0.05, envMap: envTex }));
        panel.position.y = 0.95;
        g.add(base, panel);
        g.traverse(o => (o.castShadow = true));
        g.position.set(x, h, z);
        g.rotation.y = ch === '/' ? Math.PI / 4 : -Math.PI / 4;
        group.add(g);
        L.mirrors[`${r},${c}`] = { mesh: g, ch, armed: true, x, z };
      }
      else if (ch === 'L') {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.6), new THREE.MeshStandardMaterial({ color: 0x2b2d33, metalness: 0.7, roughness: 0.3 }));
        mesh.position.set(x, h + 0.7, z);
        mesh.castShadow = true;
        group.add(mesh);
        L.emitters.push({ r, c, mesh, dir: null });
      }
      else if (ch === 'Z') {
        const mat = new THREE.MeshStandardMaterial({ color: 0x2b2d33, emissive: 0xff2050, emissiveIntensity: 0.3, metalness: 0.5 });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.6), mat);
        mesh.position.set(x, h + 0.7, z);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 10, 30), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff2050, emissiveIntensity: 1 }));
        ring.position.set(x, h + 0.7, z);
        ring.rotation.y = Math.PI / 2;
        group.add(mesh, ring);
        L.receivers[`${r},${c}`] = { mesh, ring, hit: false };
      }
      else if (SWITCH_COLORS[ch] && (def.switches || Object.values(def.gates || {}).some(g => g.type === 'simon'))) {
        const [col] = SWITCH_COLORS[ch];
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.9, 0.12, 32), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        base.position.set(x, h + 0.06, z);
        const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.22, 32),
          new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.15 }));
        btn.position.set(x, h + 0.2, z); btn.castShadow = true;
        group.add(base, btn);
        L.pads.push({ key: ch, mesh: btn, pressed: false, inside: false, flash: 0, x, z, h, idx: 'ryeb'.indexOf(ch) });
      }
    }
  }
  L.emitters.forEach((e, i) => { e.dir = DIRS[def.lasers?.[i]?.dir || 'E']; });
  buildStoryObjects(def, cellH);

  // Zemin ve duvarlar (instanced); yüksek zemin daha açık renkte
  const m4 = new THREE.Matrix4(), col = new THREE.Color(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
  // Kasabada yalnızca yüksek taşlar kutu olarak çizilir; düz zemin çimdir
  const grassy = def.hub || def.sky;
  const blocks = def.hub ? floors.filter(f => f[2] > 0) : floors;
  const groundTop = new THREE.MeshStandardMaterial({ map: grassy ? textures.grass() : textures.tile(), roughness: 0.92 });
  const groundSide = grassy ? new THREE.MeshStandardMaterial({ map: textures.rock(), roughness: 1 }) : groundTop;
  const floorMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), [groundSide, groundSide, groundTop, groundSide, groundSide, groundSide], Math.max(1, blocks.length));
  blocks.forEach(([x, z, h, alt], k) => {
    const under = def.sky ? 2.6 : 0.4;   // gökyüzü adalarının altı kalın kaya
    floorMesh.setMatrixAt(k, m4.compose(v.set(x, (h - under) / 2, z), q, s.set(CELL, h + under, CELL)));
    floorMesh.setColorAt(k, grassy ? col.setRGB(0.9, 0.95, 0.8) : col.set(alt ? th.floor1 : th.floor2).multiplyScalar(1.12 + h * 0.18));
  });
  floorMesh.count = blocks.length;
  floorMesh.receiveShadow = true;
  floorMesh.castShadow = true;

  const sideMat = new THREE.MeshStandardMaterial({ map: textures.brick(), color: th.wall, roughness: 0.92 });
  const topMat = new THREE.MeshStandardMaterial({ map: textures.rock(), color: new THREE.Color(th.top).multiplyScalar(1.5), roughness: 0.95 });
  const wallMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), [sideMat, sideMat, topMat, sideMat, sideMat, sideMat], walls.length);
  walls.forEach(([x, z, top], k) => {
    wallMesh.setMatrixAt(k, m4.compose(v.set(x, (top - 0.4) / 2, z), q, s.set(CELL, top + 0.4, CELL)));
    wallMesh.setColorAt(k, col.setScalar(0.85 + Math.random() * 0.15));
  });
  wallMesh.castShadow = wallMesh.receiveShadow = true;
  group.add(floorMesh, wallMesh);

  buildSurroundings(def, th, W, H);

  for (const sl of def.sliders || []) {
    const half = (sl.len * CELL) / 2;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sl.len * CELL - 0.1, 1.0, 1.5),
      new THREE.MeshStandardMaterial({ color: 0xff6b35, emissive: 0x7a1e00, emissiveIntensity: 0.4, roughness: 0.5 }));
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.position.set(0, 0.5, cx(sl.row));
    group.add(mesh);
    L.sliders.push({ ...sl, mesh, xa: sl.from * CELL + half, xb: (sl.to + 1) * CELL - half, z: cx(sl.row), hx: half - 0.05, hz: 0.75, x: 0, vx: 0 });
  }
  for (const sp of def.spinners || []) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xd62828, emissive: 0x550000, emissiveIntensity: 0.5, metalness: 0.3, roughness: 0.4 });
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.3, 20), mat);
    hub.position.y = 0.65;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(sp.len * 2, 0.5, 0.5), mat);
    bar.position.y = 0.6;
    hub.castShadow = bar.castShadow = true;
    g.add(hub, bar);
    g.position.set(cx(sp.col), 0, cx(sp.row));
    group.add(g);
    L.spinners.push({ ...sp, mesh: g, x: cx(sp.col), z: cx(sp.row), a: 0 });
  }
  for (const p of def.patrols || []) {
    const ball = spikeBall();
    group.add(ball);
    const ax = cx(p.from[1]), az = cx(p.from[0]), bx = cx(p.to[1]), bz = cx(p.to[0]);
    L.patrols.push({ mesh: ball, ax, az, bx, bz, len: Math.max(0.1, Math.hypot(bx - ax, bz - az)), speed: p.speed, x: ax, z: az, h: cellH(p.from[0], p.from[1]) });
  }
  for (const a of def.chasers || []) {
    const u = makeUfo();
    const x = cx(a.at[1]), z = cx(a.at[0]);
    u.group.position.set(x, 1.5, z);
    group.add(u.group);
    L.chasers.push({ ...u, x, z, home: a.at, speed: a.speed, range: a.range, next: null, timer: 0, hunting: false });
  }
  for (const p of def.powerups || []) {
    const pw = POWERS[p.type];
    if (!pw) continue;
    const x = cx(p.at[1]), z = cx(p.at[0]), h = cellH(p.at[0], p.at[1]);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(pw.emoji) }));
    spr.scale.setScalar(0.95);
    spr.position.set(x, h + 0.95, z);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.06, 8, 32), new THREE.MeshStandardMaterial({ color: pw.color, emissive: pw.color, emissiveIntensity: 1.4 }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, h + 0.08, z);
    group.add(spr, ring);
    L.powerups.push({ mesh: spr, ring, x, z, h, type: p.type, taken: false });
  }
  // Kurtarılan arkadaşlar misketin peşinden gelir
  (run.friends || []).forEach(color => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(R * 0.62, 24, 16),
      new THREE.MeshPhysicalMaterial({ color, roughness: 0.1, clearcoat: 1, envMap: envTex }));
    m.castShadow = true;
    group.add(m);
    L.followers.push(m);
  });

  buildAdventure(def, cellH);

  const midX = (W * CELL) / 2, midZ = (H * CELL) / 2, span = Math.max(W, H) * CELL;
  sun.target.position.set(midX, 0, midZ);
  sun.position.set(midX - span * 0.35, span * 0.9, midZ + span * 0.25);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -span * 0.8; sc.right = sc.top = span * 0.8;
  sc.near = 1; sc.far = span * 3;
  sc.updateProjectionMatrix();

  const ms = Math.floor(170 / Math.max(W, H));
  $('minimap').width = W * ms + 10; $('minimap').height = H * ms + 10;
  L.mapScale = ms;
  L.beamDirty = true;
  renderClues();
}

// Hikâye nesneleri: karakterler, tabelalar, gizli ayrıntılar, kapılar, joker kutuları, süsler
function buildStoryObjects(def, cellH) {
  const group = L.group;
  const stage = L.stage;
  for (const n of def.npcs || []) {
    if ((n.from || 0) > stage || !CAST[n.id]) continue;
    const mesh = makeCharacter(CAST[n.id], envTex);
    const x = cx(n.at[1]), z = cx(n.at[0]), h = cellH(n.at[0], n.at[1]);
    mesh.position.set(x, h, z);
    const label = textSprite(CAST[n.id].name, '#ffe9a8', 0.75);
    label.position.y = mesh.userData.height + 0.45;
    mesh.add(label);
    group.add(mesh);
    L.npcs.push({ id: n.id, mesh, label, x, z, h, r: R * (CAST[n.id].scale || 1), home: [x, z], wander: !!n.wander, wx: x, wz: z, wait: Math.random() * 3, lift: 1 });
  }
  for (const n of def.signs || []) {
    const x = cx(n.at[1]), z = cx(n.at[0]), h = cellH(n.at[0], n.at[1]);
    const sign = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.9 });
    wood.map = textures.wood();
    wood.color.set(0xffffff);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.0), wood);
    post.position.y = 0.5;
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 0.06), wood);
    board.position.y = 1.05;
    sign.add(post, board);
    sign.traverse(o => (o.castShadow = true));
    sign.position.set(x, h, z);
    group.add(sign);
    L.signs.push({ id: n.id, x, z, h });
  }
  for (const n of def.details || []) {
    if (!EVIDENCE[n.id]) continue;
    const x = cx(n.at[1]), z = cx(n.at[0]), h = cellH(n.at[0], n.at[1]);
    const mesh = makeDetail(n.kind);
    // Levha duvara asılı: hücrenin kuzey kenarına yaslanır
    mesh.position.set(x, h, n.kind === 'plaque' ? z - CELL / 2 + 0.03 : z);
    group.add(mesh);
    const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex('✨'), transparent: true, opacity: 0, depthWrite: false }));
    glint.scale.setScalar(0.4);
    glint.position.set(x, h + (n.kind === 'plaque' ? 0.7 : 0.3), z);
    group.add(glint);
    L.details.push({ id: n.id, mesh, glint, x, z, h, phase: Math.random() * 7, humanOnly: !!n.humanOnly });
  }
  for (const p of def.portals || []) {
    if (p.to === 'court' && (run.net || stage < LEVELS.length)) continue;
    const x = cx(p.at[1]), z = cx(p.at[0]), h = cellH(p.at[0], p.at[1]);
    if (p.human && run.net) continue;
    const extra = EXTRA[p.to];
    const locked = !run.net && (extra ? extraLocked(p.to, stage, save.nights) : p.to !== 'court' && p.to >= save.unlocked);
    const lvlDef = extra || LEVELS[p.to];
    const color = p.to === 'court' ? 0xffd166 : locked ? 0x667085 : p.human ? 0x8a2be2 : lvlDef.theme.accent;
    const gate = makePortalGate(color, locked);
    gate.position.set(x, h, z);
    group.add(gate);
    const ring = gate.userData.vortex;
    if (!locked) {
      const light = new THREE.PointLight(color, 7, 9);
      light.position.set(x, h + 1.8, z + 1);
      group.add(light);
    }
    const name = p.to === 'court' ? '⚖ Meydan Kürsüsü' : `${locked ? '🔒 ' : ''}${lvlDef.title}`;
    const rec = p.to !== 'court' && save.levels[lvlDef.id];
    const label = textSprite(rec ? `${name} ${'★'.repeat(rec.stars)}` : name, locked ? '#aab3c5' : '#ffffff', 0.85);
    label.position.set(x, h + 3.9, z);
    group.add(label);
    L.portals.push({ to: p.to, x, z, h, ring, gate, label, locked, armed: true, human: !!p.human });
  }
  for (const j of def.jokers || []) {
    const J = JOKERS[j.type];
    if (!J) continue;
    const x = cx(j.at[1]), z = cx(j.at[0]), h = cellH(j.at[0], j.at[1]);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8),
      new THREE.MeshStandardMaterial({ color: J.color, emissive: J.color, emissiveIntensity: 0.5, transparent: true, opacity: 0.45, roughness: 0.2 }));
    mesh.position.set(x, h + 0.8, z);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(J.emoji), transparent: true }));
    spr.scale.setScalar(0.62);
    spr.position.set(x, h + 0.8, z);
    group.add(mesh, spr);
    L.jokerBoxes.push({ mesh, spr, x, z, h, type: j.type, taken: false, back: 0, claimAt: -9 });
  }
  for (const d of def.decor || []) {
    const at = d.at || d.from;
    const x = cx(at[1]), z = cx(at[0]), h = cellH(at[0], at[1]);
    if (d.kind !== 'statue') {
      buildDecor(d, group, h, L.tickers);
    } else if (d.kind === 'statue') {
      const statue = makeCharacter({ ...CAST.tombul, color: 0xd4af37, scale: 2.2 }, envTex);
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 1.8), new THREE.MeshStandardMaterial({ color: 0x8b8f99 }));
      base.position.set(x, h + 0.3, z);
      base.castShadow = true;
      statue.position.set(x, h + 0.6, z);
      group.add(base, statue);
    }
  }
}

// Parkur ve gece nesneleri, konuşmayan kalabalık
function buildAdventure(def, cellH) {
  const group = L.group;
  for (const c of def.crowd || []) {
    const spec = { name: '', color: c.color, scale: c.scale };
    const mesh = makeCharacter(spec, envTex);
    const x = cx(c.at[1]), z = cx(c.at[0]);
    mesh.position.set(x, 0, z);
    group.add(mesh);
    L.npcs.push({ id: null, mesh, label: null, x, z, h: 0, r: R * c.scale, home: [x, z], wander: true, wx: x, wz: z, wait: Math.random() * 4, lift: 1, roam: 5 });
  }
  for (const m of def.movers || []) {
    const w = (m.size || 3) * CELL * 0.8;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, w), new THREE.MeshStandardMaterial({ map: textures.wood(), roughness: 0.8 }));
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    const ax = cx(m.from[1]), az = cx(m.from[0]), bx = cx(m.to[1]), bz = cx(m.to[0]), top = m.h * 0.8;
    L.movers.push({ mesh, ax, az, bx, bz, len: Math.hypot(bx - ax, bz - az), speed: m.speed, half: w / 2, top, x: ax, z: az, dx: 0, dz: 0 });
  }
  for (const k of def.hooks || []) {
    const x = cx(k.at[1]), z = cx(k.at[0]);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.07, 10, 24), new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xd9972b, emissiveIntensity: 1.6, metalness: 0.7 }));
    ring.position.set(x, k.y, z);
    group.add(ring);
    L.hooks.push({ mesh: ring, x, y: k.y, z });
  }
  for (const c of def.cogs || []) {
    const x = cx(c.at[1]), z = cx(c.at[0]), h = cellH(c.at[0], c.at[1]);
    const cog = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xb8923c, metalness: 0.9, roughness: 0.35, emissive: 0x4a2a00, emissiveIntensity: 0.6 });
    cog.add(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.22, 24), mat));
    for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283; const t = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.26), mat); t.position.set(Math.cos(a) * 0.85, 0, Math.sin(a) * 0.85); t.rotation.y = -a; cog.add(t); }
    cog.rotation.x = Math.PI / 2;
    cog.position.set(x, h + 1.15, z);
    cog.traverse(o => (o.castShadow = true));
    group.add(cog);
    L.cogs.push({ mesh: cog, x, z, h, hp: 3, dead: false });
  }
  for (const it of def.pickups || []) {
    const I = ITEMS[it.id];
    if (!I) continue;
    const owned = it.id !== 'iksir' && save.items.includes(it.id);
    if (owned) continue;
    const x = cx(it.at[1]), z = cx(it.at[0]), h = cellH(it.at[0], it.at[1]);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(I.emoji), transparent: true }));
    spr.scale.setScalar(0.85);
    spr.position.set(x, h + 1, z);
    group.add(spr);
    const glow = new THREE.PointLight(0xffd9a0, 4, 5);
    glow.position.set(x, h + 1, z);
    group.add(glow);
    L.pickups.push({ id: it.id, mesh: spr, glow, x, z, h, taken: false });
  }
  for (const s of def.scares || []) L.scares.push({ ...s, x: cx(s.at[1]), z: cx(s.at[0]), done: false });
  for (const m of def.monsters || []) {
    const mesh = makeMonster(m.kind);
    const x = cx(m.at[1]), z = cx(m.at[0]);
    mesh.position.set(x, cellH(m.at[0], m.at[1]), z);
    group.add(mesh);
    const asleep = m.wakeOn && !save.items.includes(m.wakeOn) ? m.wakeOn : null;
    if (asleep) mesh.visible = false;
    L.monsters.push({ ...m, mesh, x, z, home: [x, z], hp: m.hp, stun: 0, next: null, timer: 0, dead: false, asleep, hunting: false });
  }
}

function rampMesh(r, c, cell, th) {
  const geo = new THREE.BoxGeometry(CELL, 1, CELL);
  const p = geo.attributes.position;
  const [dr, dc] = cell.ramp;
  for (let i = 0; i < p.count; i++) {
    const lx = p.getX(i), lz = p.getZ(i);
    if (p.getY(i) < 0) { p.setY(i, -0.4); continue; }
    const u = dc ? (dc > 0 ? lx / CELL + 0.5 : 0.5 - lx / CELL) : (dr > 0 ? lz / CELL + 0.5 : 0.5 - lz / CELL);
    p.setY(i, cell.lo + (cell.hi - cell.lo) * u);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: new THREE.Color(th.accent).lerp(new THREE.Color(th.floor1), L.def.hub ? 1 : 0.55), roughness: 0.9,
  }));
  mesh.position.set(cx(c), 0, cx(r));
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

let crateTex = null;
function crateTexture() {
  return (crateTex ||= canvasTex(128, 128, (g) => {
    g.fillStyle = '#b07a3c'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#6b4520'; g.lineWidth = 10; g.strokeRect(5, 5, 118, 118);
    g.beginPath(); g.moveTo(10, 10); g.lineTo(118, 118); g.moveTo(118, 10); g.lineTo(10, 118); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = 2;
    for (let y = 20; y < 128; y += 18) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
  }));
}

function spikeBall() {
  const ball = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x2b2b33, metalness: 0.7, roughness: 0.3 });
  const spikeMat = new THREE.MeshStandardMaterial({ color: 0xff3030, emissive: 0x801010, emissiveIntensity: 0.8 });
  ball.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), mat));
  const ico = new THREE.IcosahedronGeometry(0.38, 0).attributes.position;
  const coneGeo = new THREE.ConeGeometry(0.09, 0.32, 6);
  const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
  for (let k = 0; k < ico.count; k += 3) {
    dir.fromBufferAttribute(ico, k).normalize();
    const cone = new THREE.Mesh(coneGeo, spikeMat);
    cone.position.copy(dir).multiplyScalar(0.44);
    cone.quaternion.setFromUnitVectors(up, dir);
    ball.add(cone);
  }
  ball.traverse(o => (o.castShadow = true));
  return ball;
}

// Uzaylı UFO'su: kubbenin içinde yeşil bir uzaylı, altında çekici ışın
function makeUfo() {
  const group = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 16), new THREE.MeshStandardMaterial({ color: 0xaab4c3, metalness: 0.9, roughness: 0.25, envMap: envTex }));
  hull.scale.set(1, 0.26, 1);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ color: 0x9fffe0, transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false }));
  dome.position.y = 0.12;
  const green = new THREE.MeshStandardMaterial({ color: 0x5fe35f, emissive: 0x1f8f1f, emissiveIntensity: 0.4 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), green);
  head.scale.set(1, 1.15, 1); head.position.y = 0.3;
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.05, metalness: 0.5 });
  const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), eyeMat);
  e1.scale.set(1.3, 0.7, 0.6); e1.position.set(-0.08, 0.33, -0.17); e1.rotation.z = 0.4;
  const e2 = e1.clone(); e2.position.x = 0.08; e2.rotation.z = -0.4;
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18), green);
  antenna.position.set(0, 0.55, 0);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffff66 }));
  bulb.position.set(0, 0.65, 0);
  group.add(hull, dome, head, e1, e2, antenna, bulb);
  const lights = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: [0xff5d8f, 0xffd166, 0x4cc9f0, 0x7cff7c][i % 4] }));
    l.position.set(Math.cos(a) * 0.72, -0.02, Math.sin(a) * 0.72);
    group.add(l); lights.push(l);
  }
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.5, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x9cff9c, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = -0.8;
  group.add(beam);
  hull.castShadow = true;
  return { group, beam, lights };
}

function buildSurroundings(def, th, W, H) {
  const g = L.group, mw = W * CELL, mh = H * CELL;
  g.add(makeSky(th.bg, mw / 2, mh / 2));
  if (def.sky) {
    // Adalar bulutların üstünde: aşağıda uzak bir dünya
    const sub = new THREE.Group();
    makeTerrain(sub, th, mw, mh);
    sub.position.y = -70;
    g.add(sub);
    makeClouds(g, L.tickers, mw / 2, mh / 2);
    return;
  }
  const heightFn = makeTerrain(g, th, mw, mh);
  if (!def.night) makeForest(g, mw, mh, heightFn, def.hub ? 520 : 240);
  if (def.hub) {
    makeClouds(g, L.tickers, mw / 2, mh / 2);
    makeHubGround(g, def, (r, c) => {
      const ch = def.grid[r]?.[c];
      return ch === undefined || ch === '=' || ch === '#';
    }, save.settings.quality === 'high');
  }
}

function buildExit(x, z, r, c, accent) {
  const g = L.group;
  g.add(pitMesh(x, z, 0x111122, accent, 0.35));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.09, 12, 48),
    new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 2 }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.05, z);
  const light = new THREE.PointLight(accent, 8, 7);
  light.position.set(x, 0.6, z);
  const N = 50, p = new Float32Array(N * 3);
  for (let k = 0; k < N; k++) {
    const a = Math.random() * Math.PI * 2, rr = Math.random() * 0.8;
    p.set([x + Math.cos(a) * rr, -3 + Math.random() * 5, z + Math.sin(a) * rr], k * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const parts = new THREE.Points(geo, new THREE.PointsMaterial({ color: accent, size: 0.12, transparent: true, opacity: 0.85 }));
  g.add(ring, light, parts);
  L.exit = { x, z, r, c, ring, parts };
}

// ------------------------------------------------------------------
// Hücre sorguları
// ------------------------------------------------------------------
const cellAt = (x, z) => L.grid[Math.floor(z / CELL)]?.[Math.floor(x / CELL)];
function isSolidCell(r, c) {
  const ch = L.grid[r]?.[c];
  if (ch === undefined || ch === '#' || ch === '=' || ch === 'L' || ch === 'Z' || ch === '/' || ch === '\\') return true;
  if (ch === 'G' || ch === 'H') return !L.gates[ch]?.open;
  if (ch === 'W') return !L.cracked[`${r},${c}`]?.broken;
  return false;
}
function isHole(r, c) {
  const ch = L.grid[r]?.[c];
  return ch === 'O' || (ch === 'K' && L.crumbles[`${r},${c}`].state === 'gone');
}
const boxAt = (r, c) => L.boxes.find(b => b.r === r && b.c === c);
// Hareketli platform, üstünden düşülebilen bir zemindir
function moverAt(x, z, feet) {
  for (const m of L.movers) {
    if (Math.abs(x - m.x) < m.half + R * 0.3 && Math.abs(z - m.z) < m.half + R * 0.3 && feet >= m.top - 0.45) return m;
  }
  return null;
}
function groundAt(x, z, feet = Infinity) {
  const base = heightAt(L.info, x, z);
  const m = L.movers.length ? moverAt(x, z, feet) : null;
  return m ? Math.max(base, m.top) : base;
}

// ------------------------------------------------------------------
// Fizik
// ------------------------------------------------------------------
function bounce(nx, nz, restitution, ovx = 0, ovz = 0) {
  const vn = (vel.x - ovx) * nx + (vel.y - ovz) * nz;
  if (vn < 0) {
    vel.x -= (1 + restitution) * vn * nx;
    vel.y -= (1 + restitution) * vn * nz;
    if (-vn > 2.5) sfx.bump(-vn);
    return -vn;
  }
  return 0;
}

function collideCells() {
  const c0 = Math.floor(pos.x / CELL), r0 = Math.floor(pos.z / CELL), bottom = pos.y - R;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const r = r0 + dr, c = c0 + dc;
    const qx = clamp(pos.x, c * CELL, c * CELL + CELL), qz = clamp(pos.z, r * CELL, r * CELL + CELL);
    let solid = isSolidCell(r, c), ledge = false;
    if (!solid) {
      const gh = heightAt(L.info, clamp(qx, c * CELL + 0.001, c * CELL + CELL - 0.001), clamp(qz, r * CELL + 0.001, r * CELL + CELL - 0.001));
      if (gh > bottom + CLIMB) solid = ledge = true;
    }
    if (!solid) continue;
    let nx = pos.x - qx, nz = pos.z - qz;
    const d = Math.hypot(nx, nz);
    if (d >= R) continue;
    if (d < 1e-6) { nx = -dc; nz = -dr; } else { nx /= d; nz /= d; }
    pos.x = qx + nx * R; pos.z = qz + nz * R;
    const impact = bounce(nx, nz, 0.35);
    const ch = L.grid[r]?.[c];
    if (impact > CRACK_V && (ch === '#' || ledge)) {
      const top = ch === '#' ? L.wallTop[r][c] : L.cellH(r, c);
      addCrack(qx, clamp(pos.y, 0.35, top - 0.3), qz, nx, nz, impact, false);
    }
    if (ch === 'G' || ch === 'H') touchGate(L.gates[ch]);
    if (ch === 'W' && P.dash > 0) breakWall(`${r},${c}`);
    if (ch === '/' || ch === '\\') touchMirror(L.mirrors[`${r},${c}`]);
  }
}

function breakWall(key, fromNet) {
  const w = L.cracked[key];
  if (!w || w.broken) return;
  w.broken = true;
  L.group.remove(w.mesh);
  w.mesh.geometry.dispose(); w.mesh.material.map.dispose(); w.mesh.material.dispose();
  sfx.crack();
  shake = Math.max(shake, 0.5);
  particles.emit(w.x, 0.8, w.z, 50, 0xbfae8f, 5, 0.9, 8, 1.5);
  L.beamDirty = true;
  if (!fromNet) { toast('💥 Duvar yıkıldı!', 1800); netEv({ e: 'wall', key }); }
}

// Dairesel engellere (kasabalılar, diğer oyuncular) yumuşak çarpma
function bumpCircle(x, z, r, ovx = 0, ovz = 0, yields = true) {
  let nx = pos.x - x, nz = pos.z - z;
  const d = Math.hypot(nx, nz);
  if (d >= R + r) return;
  if (d < 1e-5) { nx = 1; nz = 0; } else { nx /= d; nz /= d; }
  if (yields) { pos.x = x + nx * (R + r); pos.z = z + nz * (R + r); }
  bounce(nx, nz, 0.6, ovx, ovz);
}

function collideObstacles() {
  const bottom = pos.y - R;
  for (const n of L.npcs) if (bottom < n.h + n.r * 2) bumpCircle(n.x, n.z, n.r);
  // Çakışan iki oyuncudan yalnızca biri geri çekilir. İkisi de çekilirse ağ gecikmesi
  // yüzünden birbirini arkasında görüp sonsuza kadar birlikte kayarlar.
  if (N) for (const o of N.remotes.values()) {
    if (o.seen && !o.hidden && Math.abs(o.ty - pos.y) < R * 2) bumpCircle(o.tx, o.tz, R, o.vx, o.vz, net.id > o.id && P.frozen <= 0);
  }
  for (const s of L.sliders) {
    if (bottom > 1.0) continue;
    const qx = clamp(pos.x, s.x - s.hx, s.x + s.hx), qz = clamp(pos.z, s.z - s.hz, s.z + s.hz);
    let nx = pos.x - qx, nz = pos.z - qz;
    const d = Math.hypot(nx, nz);
    if (d >= R) continue;
    if (d < 1e-6) { nx = Math.sign(s.vx) || 1; nz = 0; } else { nx /= d; nz /= d; }
    pos.x = qx + nx * R; pos.z = qz + nz * R;
    bounce(nx, nz, 0.8, s.vx, 0);
    vel.x += nx * 2; vel.y += nz * 2;
    shake = Math.max(shake, 0.15);
  }
  for (const s of L.spinners) {
    if (bottom > 0.85) continue;
    const dx = Math.cos(s.a), dz = Math.sin(s.a);
    const t = clamp((pos.x - s.x) * dx + (pos.z - s.z) * dz, -s.len, s.len);
    const qx = s.x + dx * t, qz = s.z + dz * t;
    let nx = pos.x - qx, nz = pos.z - qz;
    const d = Math.hypot(nx, nz), rr = R + 0.25;
    if (d >= rr) continue;
    if (d < 1e-6) { nx = -dz; nz = dx; } else { nx /= d; nz /= d; }
    pos.x = qx + nx * rr; pos.z = qz + nz * rr;
    const w = L.fx.freeze > 0 ? 0 : s.speed;
    bounce(nx, nz, 1.0, -w * (qz - s.z), w * (qx - s.x));
    vel.x += nx * 2.5; vel.y += nz * 2.5;
    shake = Math.max(shake, 0.2);
    particles.emit(qx, pos.y, qz, 6, 0xffaa55, 3, 0.3, 4);
  }
  for (const b of L.boxes) {
    if (bottom > b.h + 1.76) continue;
    const bx = b.mesh.position.x, bz = b.mesh.position.z;
    const qx = clamp(pos.x, bx - 0.88, bx + 0.88), qz = clamp(pos.z, bz - 0.88, bz + 0.88);
    let nx = pos.x - qx, nz = pos.z - qz;
    const d = Math.hypot(nx, nz);
    if (d >= R) continue;
    if (d < 1e-6) { nx = 0; nz = 1; } else { nx /= d; nz /= d; }
    pos.x = qx + nx * R; pos.z = qz + nz * R;
    const impact = bounce(nx, nz, 0.2);
    if (impact > 1.2 && !b.moving) tryPushBox(b, -nx, -nz);
  }
}

function physicsStep(h) {
  // Girdi: klavye + gamepad/dokunmatik
  let f = 0, s = 0;
  if (keys.KeyW || keys.ArrowUp) f += 1;
  if (keys.KeyS || keys.ArrowDown) f -= 1;
  if (keys.KeyA) s -= 1;
  if (keys.KeyD) s += 1;
  if (camMode === 0) { if (keys.ArrowLeft) s -= 1; if (keys.ArrowRight) s += 1; }
  const [axp, ayp] = analogMove();
  s += axp; f += ayp;
  let ix, iz;
  if (camMode === 0) { ix = s; iz = -f; }
  else {
    const fx = Math.sin(yaw), fz = -Math.cos(yaw);
    ix = fx * f + Math.cos(yaw) * s;
    iz = fz * f + Math.sin(yaw) * s;
  }
  const locked = P.frozen > 0 || P.shock > 0 || !!P.pull;
  if (locked) ix = iz = 0;
  L.moveDir = [ix, iz];
  if (P.frozen > 0) vel.set(0, 0);
  if (P.shock > 0 && Math.random() < h * 7) {
    // Elektrik çarpması: misket kontrolsüz sıçrar
    vel.x += (Math.random() - 0.5) * 12; vel.y += (Math.random() - 0.5) * 12;
    shake = Math.max(shake, 0.25);
    particles.emit(pos.x, pos.y, pos.z, 8, 0xffe14d, 4, 0.3, 1, 1);
  }
  if (P.dash > 0) P.dash -= h;
  const mag = Math.min(1, Math.hypot(ix, iz));
  const vmax = MAXV * (L.fx.speed > 0 ? 1.55 : 1) * (P.human ? 0.68 : 1);
  if (P.pull) {
    // Kanca: halkaya doğru çekilir
    const dx = P.pull.x - pos.x, dy = P.pull.y - pos.y, dz = P.pull.z - pos.z, dist = Math.hypot(dx, dy, dz);
    P.pull.t -= h;
    if (dist < 1.2 || P.pull.t <= 0) { vy = 4.5; P.pull = null; hookLine.visible = false; }
    else { vel.set((dx / dist) * 17, (dz / dist) * 17); vy = (dy / dist) * 17; onGround = false; }
  }
  if (P.dash > 0) {
    // Atılırken hız korunur
  } else if (mag > 0.01) {
    // İnsan yürür: anında döner, kaymaz
    const k = 1 - Math.exp(-(onGround ? (P.human ? 18 : GRIP) : (P.human ? 5 : AIR_GRIP)) * h);
    const l = Math.hypot(ix, iz);
    vel.x += ((ix / l) * vmax * mag - vel.x) * k;
    vel.y += ((iz / l) * vmax * mag - vel.y) * k;
  } else if (onGround) {
    vel.multiplyScalar(Math.exp(-(P.human ? 16 : BRAKE) * h));
  }
  if (onGround && !P.human) {
    const [gx, gz] = slopeAt(L.info, pos.x, pos.z);
    vel.x -= gx * SLOPE_G * h; vel.y -= gz * SLOPE_G * h;
  }
  if (onGround && cellAt(pos.x, pos.z) === 'E') {
    vel.x += (L.exit.x - pos.x) * 40 * h;
    vel.y += (L.exit.z - pos.z) * 40 * h;
  }

  if (onGround) airJumps = 1;
  if (jumpQueued && !locked && !run.rules?.noJump) {
    if (onGround) {
      vy = (P.human ? JUMP_V * 1.1 : JUMP_V) * (P.human && save.items.includes('bot') ? 1.2 : 1); onGround = false; sfx.hop();
      particles.emit(pos.x, pos.y - R, pos.z, 10, 0xd8d0c0, 2, 0.4, 3, 0.4);
    } else if (airJumps > 0 && hasAbility('doubleJump')) {
      vy = JUMP_V * 0.9; airJumps = 0; sfx.hop();
      particles.emit(pos.x, pos.y - R, pos.z, 14, 0xfff3b0, 2.5, 0.4, 3, 0.2);
    }
  }
  jumpQueued = false;

  const sp = vel.length();
  if (sp > 18) vel.multiplyScalar(18 / sp);
  pos.x += vel.x * h; pos.z += vel.y * h;
  collideObstacles();
  collideCells();

  // Dikey hareket ve zemin
  const wasGround = onGround;
  const gliding = vy < 0 && keys.Space && !locked && hasAbility('glide');
  if (!P.pull) vy -= GRAV * (gliding ? 0.22 : 1) * h;
  pos.y += vy * h;
  const gh = groundAt(pos.x, pos.z, pos.y - R);
  L.onMover = L.movers.length && vy <= 0 && pos.y - R <= gh + 0.05 ? moverAt(pos.x, pos.z, pos.y - R) : null;
  if (pos.y - R <= gh) {
    if (vy < -8) {
      const v = -vy;
      addCrack(pos.x, gh + 0.012, pos.z, 0, 0, v, true);
      shake = Math.max(shake, Math.min(0.6, v * 0.04));
      sfx.land(v);
      particles.emit(pos.x, gh + 0.05, pos.z, 18, 0xd8d0c0, 3, 0.5, 4, 0.6);
    }
    pos.y = gh + R; vy = 0; onGround = true;
  } else if (wasGround && vy <= 0 && pos.y - R - gh < 0.3) {
    pos.y = gh + R; vy = 0; onGround = true;   // rampadan inerken zemine yapış
  } else onGround = false;

  if (!P.human) roll(vel.x * h, vel.y * h);
  if (P.frozen > 0) vel.set(0, 0);   // buzdaki misketi çarpışmalar da oynatamaz
}

const qTmp = new THREE.Quaternion(), axis = new THREE.Vector3();
function roll(dx, dz) {
  const d = Math.hypot(dx, dz);
  if (d < 1e-6) return;
  axis.set(dz / d, 0, -dx / d);
  qTmp.setFromAxisAngle(axis, d / R);
  marbleMesh.quaternion.premultiply(qTmp);
}

// ------------------------------------------------------------------
// Çatlaklar (duvar ve zemin)
// ------------------------------------------------------------------
function addCrack(x, y, z, nx, nz, impact, floor) {
  const size = clamp(0.5 + impact * 0.09, 0.6, 1.8);
  const mat = new THREE.MeshStandardMaterial({
    map: pick(crackTextures), transparent: true, depthWrite: false, roughness: 1,
    polygonOffset: true, polygonOffsetFactor: -4,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  m.position.set(x + nx * 0.012, y, z + nz * 0.012);
  if (floor) { m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * Math.PI * 2; }
  else { m.lookAt(x + nx, y, z + nz); m.rotateZ(Math.random() * Math.PI * 2); }
  L.group.add(m);
  L.decals.push({ mesh: m, t: 0 });
  if (L.decals.length > 24) { const old = L.decals.shift(); L.group.remove(old.mesh); old.mesh.geometry.dispose(); old.mesh.material.dispose(); }
  sfx.crack();
  shake = Math.max(shake, Math.min(0.7, impact * 0.05));
  particles.emit(x + nx * 0.2, y, z + nz * 0.2, 16, 0xbfae8f, 3.5, 0.6, 9, 1);
}

// ------------------------------------------------------------------
// Kutular, plakalar, aynalar ve lazer
// ------------------------------------------------------------------
function tryPushBox(b, dx, dz) {
  let dr = 0, dc = 0;
  if (Math.abs(dx) > Math.abs(dz) * 1.4) dc = Math.sign(dx);
  else if (Math.abs(dz) > Math.abs(dx) * 1.4) dr = Math.sign(dz);
  else return;
  const r = b.r + dr, c = b.c + dc, ch = L.grid[r]?.[c];
  if (!ch || '#OEGHLZW/\\'.includes(ch) || isHole(r, c) || boxAt(r, c)) return;
  const inf = L.info[r][c];
  if (inf.ramp || Math.abs(inf.flat - b.h) > 0.01) return;
  moveBox(b, r, c);
  netEv({ e: 'box', i: L.boxes.indexOf(b), r, c });
}

function moveBox(b, r, c) {
  b.moving = { fx: b.mesh.position.x, fz: b.mesh.position.z, tx: cx(c), tz: cx(r), t: 0 };
  b.r = r; b.c = c;
  sfx.boxPush();
  L.beamDirty = true;
}

function updateBoxes(dt) {
  let changed = false;
  for (const b of L.boxes) {
    if (!b.moving) continue;
    const m = b.moving;
    m.t = Math.min(1, m.t + dt / 0.28);
    const e = m.t * m.t * (3 - 2 * m.t);
    b.mesh.position.x = m.fx + (m.tx - m.fx) * e;
    b.mesh.position.z = m.fz + (m.tz - m.fz) * e;
    if (m.t >= 1) { b.moving = null; changed = true; particles.emit(m.tx, b.h + 0.1, m.tz, 10, 0xc9a66b, 2, 0.4, 3, 0.3); }
  }
  if (changed) updatePlates();
}

function updatePlates() {
  for (const p of L.plates) {
    const was = p.pressed;
    p.pressed = L.boxes.some(b => !b.moving && b.r === p.r && b.c === p.c);
    p.mesh.material.emissiveIntensity = p.pressed ? 1.5 : 0.35;
    if (p.pressed && !was) sfx.click();
  }
  const gate = Object.values(L.gates).find(g => g.def.type === 'plates');
  if (gate && !gate.open && L.plates.length && L.plates.every(p => p.pressed)) {
    openGate(gate);
    toast('⬛ Bütün plakalar basılı! Kapı açılıyor.');
  }
}

function resetBoxes(fromNet) {
  if (L.boxes.some(b => b.moving)) return;
  if (!fromNet) netEv({ e: 'resetBoxes' });
  for (const b of L.boxes) {
    [b.r, b.c] = b.home;
    b.mesh.position.set(cx(b.c), b.h + 0.88, cx(b.r));
  }
  updatePlates();
  L.beamDirty = true;
  toast('📦 Kutular yerine döndü.');
}

function touchMirror(m, fromNet) {
  if (!m || (!m.armed && !fromNet)) return;
  m.armed = false;
  m.ch = m.ch === '/' ? '\\' : '/';
  if (!fromNet) netEv({ e: 'mirror', key: Object.keys(L.mirrors).find(k => L.mirrors[k] === m) });
  sfx.mirror();
  particles.emit(m.x, 1, m.z, 12, 0xdfe9ff, 2.5, 0.4, 2);
  L.beamDirty = true;
}

function traceBeam(e) {
  const pts = [[cx(e.c), cx(e.r)]];
  let [dr, dc] = e.dir, r = e.r, c = e.c, hit = null;
  for (let i = 0; i < 300; i++) {
    r += dr; c += dc;
    const ch = L.grid[r]?.[c];
    if (!ch || ch === '#' || ch === 'L' || ((ch === 'G' || ch === 'H') && !L.gates[ch].open) || (ch === 'W' && isSolidCell(r, c)) || boxAt(r, c)) {
      pts.push([cx(c) - dc * CELL / 2, cx(r) - dr * CELL / 2]);
      break;
    }
    if (ch === 'Z') { pts.push([cx(c), cx(r)]); hit = `${r},${c}`; break; }
    const m = L.mirrors[`${r},${c}`];
    if (m) {
      pts.push([cx(c), cx(r)]);
      [dr, dc] = m.ch === '/' ? [-dc, -dr] : [dc, dr];
    }
  }
  return { pts, hit };
}

function updateBeams() {
  if (!L.emitters.length || !L.beamDirty) return;
  L.beamDirty = false;
  const results = L.emitters.map(traceBeam);
  const sig = JSON.stringify(results);
  if (sig === L.beam.sig) return;
  L.beam.sig = sig;
  const g = L.beam.group;
  while (g.children.length) { const o = g.children.pop(); o.geometry.dispose(); }
  const core = new THREE.MeshBasicMaterial({ color: 0xff2a5a });
  const glow = new THREE.MeshBasicMaterial({ color: 0xff2a5a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const { pts } of results) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
      const len = Math.hypot(x1 - x0, z1 - z0);
      if (len < 0.01) continue;
      for (const [rad, mat] of [[0.05, core], [0.16, glow]]) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len, 8), mat);
        m.position.set((x0 + x1) / 2, 0.75, (z0 + z1) / 2);
        m.rotation.z = Math.PI / 2;
        m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
        g.add(m);
      }
    }
  }
  for (const [k, rc] of Object.entries(L.receivers)) {
    const hit = results.some(res => res.hit === k);
    rc.ring.material.emissive.set(hit ? 0x30ff70 : 0xff2050);
    rc.mesh.material.emissive.set(hit ? 0x30ff70 : 0xff2050);
    if (hit && !rc.hit) {
      rc.hit = true;
      sfx.laser();
      const gate = Object.values(L.gates).find(gg => gg.def.type === 'laser');
      if (gate && !gate.open) { openGate(gate); toast('🔺 Lazer alıcıya ulaştı! Kapı açılıyor.'); }
    }
  }
}

// ------------------------------------------------------------------
// Düşmanlar
// ------------------------------------------------------------------
function walkable(r, c) {
  const ch = L.grid[r]?.[c];
  if (!ch || isSolidCell(r, c) || ch === 'O' || ch === 'E' || boxAt(r, c)) return false;
  return true;
}
function bfsStep(r0, c0, r1, c1, maxLen) {
  if (r0 === r1 && c0 === c1) return null;
  const W = L.W, prev = new Map([[r0 * W + c0, -1]]);
  let frontier = [[r0, c0]];
  for (let depth = 0; depth < maxLen && frontier.length; depth++) {
    const nextF = [];
    for (const [r, c] of frontier) for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc, id = nr * W + nc;
      if (prev.has(id) || !walkable(nr, nc)) continue;
      prev.set(id, r * W + c);
      if (nr === r1 && nc === c1) {
        let cur = id;
        while (prev.get(cur) !== r0 * W + c0) cur = prev.get(cur);
        return [Math.floor(cur / W), cur % W];
      }
      nextF.push([nr, nc]);
    }
    frontier = nextF;
  }
  return null;
}

function updateEnemies(dt) {
  const frozen = L.fx.freeze > 0;
  for (const p of L.patrols) {
    const s = (enemyTime * p.speed) / p.len, u = s % 2 < 1 ? s % 2 : 2 - (s % 2);
    const nx = p.ax + (p.bx - p.ax) * u, nz = p.az + (p.bz - p.az) * u;
    const dx = nx - p.x, dz = nz - p.z, d = Math.hypot(dx, dz);
    if (d > 1e-5) {
      qTmp.setFromAxisAngle(axis.set(dz / d, 0, -dx / d), d / 0.5);
      p.mesh.quaternion.premultiply(qTmp);
    }
    p.x = nx; p.z = nz;
    p.mesh.position.set(nx, p.h + 0.5, nz);
  }
  for (const a of L.chasers) {
    a.lights.forEach((l, i) => (l.visible = frozen || Math.floor(gameTime * 6 + i) % 2 === 0));
    a.group.position.y = 1.5 + Math.sin(gameTime * 3 + a.x) * 0.12 + (L.cellH(Math.floor(a.z / CELL), Math.floor(a.x / CELL)) || 0);
    a.beam.material.opacity = a.hunting ? 0.22 + Math.sin(gameTime * 10) * 0.06 : 0.06;
    if (N && !net.isHost) {
      // Çok oyunculuda uzaylıları ev sahibi yönetir; burada yalnızca izlenir
      if (a.wx !== undefined) { a.x += (a.wx - a.x) * Math.min(1, 10 * dt); a.z += (a.wz - a.z) * Math.min(1, 10 * dt); }
      a.group.position.x = a.x; a.group.position.z = a.z;
      a.group.rotation.y += dt * 1.5;
      continue;
    }
    if (frozen || (!N && state === 'abduct')) continue;
    a.group.rotation.y += dt * 1.5;
    const cr = Math.floor(a.z / CELL), cc = Math.floor(a.x / CELL);
    // Hedef: en yakın oyuncu
    let prey = state === 'play' ? pos : null, best = prey ? Math.hypot(pos.x - a.x, pos.z - a.z) : Infinity;
    if (N) for (const o of N.remotes.values()) {
      const d = Math.hypot(o.x - a.x, o.z - a.z);
      if (!o.hidden && d < best) { best = d; prey = o; }
    }
    const mr = prey ? Math.floor(prey.z / CELL) : -1, mc = prey ? Math.floor(prey.x / CELL) : -1;
    a.timer -= dt;
    if (a.timer <= 0 || !a.next) {
      a.timer = 0.25;
      const hunt = prey ? bfsStep(cr, cc, mr, mc, a.range) : null;
      a.hunting = !!hunt || (cr === mr && cc === mc);
      a.next = hunt || (a.hunting ? [mr, mc] : bfsStep(cr, cc, a.home[0], a.home[1], 80));
    }
    let tx, tz;
    if (a.hunting && cr === mr && cc === mc) { tx = prey.x; tz = prey.z; }
    else if (a.next) { tx = cx(a.next[1]); tz = cx(a.next[0]); }
    else continue;
    const dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
    const step = a.speed * (a.hunting ? 1 : 0.6) * dt;
    if (d <= step) { a.x = tx; a.z = tz; a.next = null; }
    else { a.x += (dx / d) * step; a.z += (dz / d) * step; }
    a.group.position.x = a.x; a.group.position.z = a.z;
  }
  for (const s of Object.values(L.spikes)) {
    const ph = (enemyTime + s.off) % SPIKE_P;
    s.up = ph >= SPIKE_UP;
    const target = s.h + (s.up ? 0 : ph >= SPIKE_WARN ? -0.42 : -0.7);
    s.spikes.position.y += (target - s.spikes.position.y) * Math.min(1, 18 * dt);
    s.plate.material.emissiveIntensity = s.up ? 0.6 : ph >= SPIKE_WARN ? (Math.sin(gameTime * 30) > 0 ? 0.9 : 0) : 0;
  }
}

// ------------------------------------------------------------------
// Oyun olayları
// ------------------------------------------------------------------
function clueText(k) { const c = L.def.clues?.[k]; return typeof c === 'string' ? c : c?.text || ''; }
function playClue(k) {
  const c = L.def.clues?.[k];
  speak(clueText(k));
  if (c?.beeps) sfx.beep(c.beeps);
}

function checkCell() {
  const ch = cellAt(pos.x, pos.z);
  const r = Math.floor(pos.z / CELL), c = Math.floor(pos.x / CELL);
  if (onGround && isHole(r, c) && !L.onMover) { state = 'fall'; fallVy = 0; sfx.fall(); return; }
  if (ch === 'E' && onGround && Math.hypot(pos.x - L.exit.x, pos.z - L.exit.z) < 0.55 && exitAllowed()) {
    state = 'exit'; exitT = 0; sfx.jumpHole();
    particles.emit(L.exit.x, 0.3, L.exit.z, 40, L.def.theme.accent, 4, 1, 2, 2);
    return;
  }
  if (ch === 'J' && onGround && pos.y - R < L.cellH(r, c) + 0.4) {
    vy = 15.5; onGround = false; airJumps = 1;
    L.springs[`${r},${c}`].t = 0.25;
    sfx.spring();
    particles.emit(pos.x, pos.y - R, pos.z, 16, 0xff5d8f, 3, 0.4, 3, 1);
  }
  if (ch === 'K' && onGround) {
    const k = L.crumbles[`${r},${c}`];
    if (k.state === 'idle') { k.state = 'shaking'; k.t = 0.7; sfx.crumble(); }
  }

  // Tehlikeler
  const bottom = pos.y - R;
  if (L.inv <= 0 && P.frozen <= 0) {
    if (ch === 'X' && bottom < L.cellH(r, c) + 0.45 && L.spikes[`${r},${c}`].up) return hit('🔪 Dikenlere takıldın!');
    for (const p of L.patrols) {
      if (bottom < p.h + 0.8 && Math.hypot(pos.x - p.x, pos.z - p.z) < R + 0.55) return hit('💥 Dikenli topa çarptın!');
    }
    for (const a of L.chasers) {
      if (L.fx.freeze <= 0 && Math.hypot(pos.x - a.x, pos.z - a.z) < 0.85) {
        if (L.fx.shield > 0) { popShield(); a.x = cx(a.home[1]); a.z = cx(a.home[0]); a.next = null; return; }
        startAbduction(a);
        return;
      }
    }
  }

  const near = (o, d = 1.0) => Math.hypot(pos.x - o.x, pos.z - o.z) < d && Math.abs(pos.y - R - o.h) < 1.2;
  for (const cp of L.checkpoints) {
    if (!cp.active && Math.hypot(pos.x - cp.x, pos.z - cp.z) < 0.9) {
      L.checkpoints.forEach(o => { o.active = false; o.mat.color.set(0x9aa0a6); o.mat.emissive.set(0); o.flagMat.color.set(0x9aa0a6); });
      cp.active = true; cp.mat.color.set(0x38d97a); cp.mat.emissive.set(0x0f6b32); cp.flagMat.color.set(0x38d97a);
      L.cp = { x: cp.x, z: cp.z };
      toast('🚩 Kontrol noktası kaydedildi!');
      sfx.click();
      particles.emit(cp.x, 0.5, cp.z, 20, 0x38d97a, 3, 0.7, 4, 2);
    }
  }
  for (const ht of L.hearts) {
    if (!ht.taken && near(ht)) {
      ht.taken = true; ht.mesh.visible = false;
      L.lives = Math.min(MAX_LIVES, L.lives + 1);
      toast('❤️ +1 can!');
      sfx.heart();
      particles.emit(ht.x, ht.h + 0.9, ht.z, 24, 0xff4d6d, 3, 0.7, 2, 2);
    }
  }
  for (let i = 0; i < L.keys.length; i++) if (!L.keys[i].taken && near(L.keys[i])) takeKey(i);
  for (const co of L.coins) {
    if (co.taken || !near(co, 1.1)) continue;
    co.taken = true; co.mesh.visible = false;
    save.coins++; persist();
    sfx.coin();
    particles.emit(co.x, co.h + 0.8, co.z, 12, 0xffc83d, 2.5, 0.5, 3, 1.5);
  }
  for (const it of L.pickups) {
    if (it.taken || !near(it, 1.1)) continue;
    it.taken = true; it.mesh.visible = false; it.glow.visible = false;
    if (it.id === 'iksir') save.potions++;
    else if (!save.items.includes(it.id)) save.items.push(it.id);
    persist();
    sfx.power();
    toast(`${ITEMS[it.id].emoji} ${ITEMS[it.id].name} aldın! ${ITEMS[it.id].slot} tuşuyla kullan.`, 3500);
    if (it.id !== 'iksir') { selectTool(it.id); if (it.id === 'fener') P.lamp = true; }
    for (const m of L.monsters) if (m.asleep === it.id) wakeMonster(m);
    renderHotbar();
  }
  for (const sc of L.scares) {
    if (sc.done || Math.hypot(pos.x - sc.x, pos.z - sc.z) > 1.8) continue;
    sc.done = true;
    toast(sc.text, 4200);
    if (sc.jump) jumpScare(); else sfx.whisper();
  }
  for (let i = 0; i < L.jokerBoxes.length; i++) {
    const b = L.jokerBoxes[i];
    if (b.taken || P.joker || !near(b)) continue;
    if (!N) { b.taken = true; b.back = JOKER_RESPAWN; hideBox(b); gainJoker(b.type); }
    else if (N.clock - b.claimAt > 1) { b.claimAt = N.clock; claim('joker', i); }
  }
  for (const p of L.portals) {
    const d = Math.hypot(pos.x - p.x, pos.z - p.z);
    if (!p.armed) { if (d > 2) p.armed = true; continue; }
    if (p.human && !P.human) continue;
    if (d < 1) {
      p.armed = false;
      if (p.locked) { toast('🔒 Bu kapı henüz kapalı. Önceki labirenti bitir.', 2200); sfx.wrong(); continue; }
      startWarp(p);
      return;
    }
  }
  for (let i = 0; i < L.gems.length; i++) {
    const gm = L.gems[i];
    if (!gm.taken && near(gm)) {
      if (N?.mode === 'hunt') {
        // Avda mücevher ortak: kimin aldığına ev sahibi karar verir
        if (N.clock - (gm.claimAt ?? -9) > 1) { gm.claimAt = N.clock; claim('gem', i); }
        continue;
      }
      gm.taken = true; gm.mesh.visible = false; L.gemsFound++;
      toast(`💎 Gizli mücevher! (${L.gemsFound}/${L.gems.length})`, 1800);
      sfx.gem();
      particles.emit(gm.x, gm.h + 0.7, gm.z, 30, 0xff4fd8, 3.5, 0.8, 2, 2);
    }
  }
  for (const pw of L.powerups) {
    if (!pw.taken && near(pw)) {
      pw.taken = true; pw.mesh.visible = false; pw.ring.visible = false;
      const pwr = POWERS[pw.type];
      L.fx[pw.type] = pwr.time;
      if (pw.type === 'freeze') netEv({ e: 'freeze', t: pwr.time });
      toast(`${pwr.emoji} ${pwr.name} gücü aktif! (${pwr.time} sn)`);
      sfx.power();
      particles.emit(pw.x, pw.h + 0.9, pw.z, 30, pwr.color, 4, 0.8, 2, 2);
    }
  }
  for (const [k, cl] of Object.entries(L.clues)) {
    if (!cl.found && near(cl)) {
      cl.found = true;
      toast(`💡 İpucu: ${clueText(k)}`, 7000);
      sfx.clue();
      playClue(k);
      particles.emit(cl.x, cl.h + 1, cl.z, 30, 0x7ee8ff, 3, 0.8, 2, 2);
      renderClues();
    }
  }
  for (const pad of L.pads) {
    const d = Math.hypot(pos.x - pad.x, pos.z - pad.z);
    if (!pad.inside && d < 0.85 && onGround) { pad.inside = true; onPad(pad); }
    else if (pad.inside && d > 1.15) pad.inside = false;
  }
  for (const g of Object.values(L.gates)) if (!g.armed && Math.hypot(pos.x - g.x, pos.z - g.z) > 2.4) g.armed = true;
  for (const m of Object.values(L.mirrors)) if (!m.armed && Math.hypot(pos.x - m.x, pos.z - m.z) > 2.2) m.armed = true;
}

function takeKey(i, fromNet) {
  const key = L.keys[i];
  if (key.taken) return;
  key.taken = true; key.mesh.visible = false; L.keysFound++;
  sfx.gem();
  particles.emit(key.x, key.h + 0.8, key.z, 30, 0xffd166, 3.5, 0.8, 2, 2);
  toast(`🗝 Anahtar parçası (${L.keysFound}/${L.keys.length})`, 1800);
  if (!fromNet) netEv({ e: 'key', i });
  if (L.keysFound === L.keys.length) {
    const gate = Object.values(L.gates).find(g => g.def.type === 'keys');
    if (gate) { openGate(gate, fromNet); toast('🗝 Bütün parçalar tamam! Kapı açılıyor.'); }
  }
}

// Işınlanma: misket kapının içine çekilir, ekran beyaza döner, labirent açılır
function startWarp(p) {
  state = 'warp';
  warp = { p, t: 0, fx: pos.x, fz: pos.z, fy: pos.y, sent: false };
  vel.set(0, 0);
  unlockPointer(); setRolling(0, false);
  sfx.warp();
}
function updateWarp(dt) {
  const w = warp, p = w.p;
  w.t += dt;
  const k = Math.min(1, w.t / WARP_TIME), e = k * k * (3 - 2 * k);
  const ang = e * 9, rad = (1 - e) * 0.9;
  pos.x = w.fx + (p.x - w.fx) * e + Math.cos(ang) * rad * Math.sin(k * Math.PI);
  pos.z = w.fz + (p.z - w.fz) * e + Math.sin(ang) * rad * Math.sin(k * Math.PI);
  pos.y = w.fy + e * e * 1.4;
  marbleMesh.scale.setScalar(Math.max(0.05, 1 - e * e));
  humanMesh.scale.setScalar(Math.max(0.05, 1 - e * e));
  roll(dt * 6, dt * 4);
  p.ring.rotation.z -= dt * 8 * (1 + e * 3);
  p.ring.scale.setScalar(1 + e * 0.4);
  shake = Math.max(shake, e * 0.12);
  camera.fov += ((camMode === 2 ? 75 : 62) + e * 34 - camera.fov) * Math.min(1, 6 * dt);
  camera.updateProjectionMatrix();
  particles.emit(p.x, p.h + 1.7, p.z, 3, L.def.theme.accent, 3.5 * (1 - e) + 0.6, 0.5, -2, 0.5);
  const f = $('fade');
  f.classList.add('white');
  f.style.transition = 'none';
  f.style.opacity = Math.max(0, (k - 0.55) / 0.45);
  if (k >= 1 && !w.sent) {
    w.sent = true;
    if (run.net) {
      // Serbest dünyada herkes birlikte ışınlanır; maçı ev sahibi başlatır
      run.net.onPortal?.(p.to);
      setTimeout(() => { if (state === 'warp' && warp === w) endWarpFail(); }, 3000);
    } else {
      state = 'done'; paused = true;
      setInputEnabled(false);
      run?.onPortal?.(p.to);
    }
  }
}
function endWarpFail() {
  state = 'play';
  marbleMesh.scale.setScalar(1); humanMesh.scale.setScalar(1);
  warp.p.ring.scale.setScalar(1);
  const f = $('fade'); f.style.transition = 'opacity .4s'; f.style.opacity = 0;
  setCamMode(camMode, true, false);
}

function playIntroLines(lines, i) {
  if (i >= lines.length) return;
  const who = lines[i].who === 'Saatçi' ? CAST.saatci : { name: lines[i].who, emoji: '🫥', color: 0x1f8fe0 };
  openDialog(who, [{ t: lines[i].t }], () => playIntroLines(lines, i + 1));
}

// Yeni yere iniş: misket gökten süzülür, beyaz perde açılır
function startArrive() {
  state = 'warpIn';
  arrive = { t: 0, x: pos.x, y: pos.y, z: pos.z };
  sfx.warpIn();
  const f = $('fade');
  f.classList.add('white');
  f.style.transition = 'none';
  f.style.opacity = 1;
  requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = 'opacity .9s'; f.style.opacity = 0; }));
}
function updateArrive(dt) {
  arrive.t += dt;
  const k = Math.min(1, arrive.t / ARRIVE_TIME), e = 1 - (1 - k) * (1 - k);
  pos.set(arrive.x, arrive.y + (1 - e) * 9, arrive.z);
  const sc = 0.25 + 0.75 * e;
  marbleMesh.scale.setScalar(sc); humanMesh.scale.setScalar(sc);
  roll(dt * 4, dt * 3);
  if (Math.random() < 0.8) particles.emit(pos.x, pos.y, pos.z, 2, 0xffffff, 1, 0.5, 1, 0.2);
  if (k >= 1) {
    pos.set(arrive.x, arrive.y, arrive.z);
    marbleMesh.scale.setScalar(1); humanMesh.scale.setScalar(1);
    state = 'play';
    $('fade').classList.remove('white');
    shake = Math.max(shake, 0.3);
    sfx.land(9);
    particles.emit(pos.x, pos.y - R + 0.05, pos.z, 44, 0xe8e0c8, 4.5, 0.7, 4, 0.5);
    lockPointer();
    renderHotbar();
    // Gece bölümleri kısa bir konuşmayla açılır
    if (L.def.intro && !N) playIntroLines(L.def.intro, 0);
  }
}

// Meydan okuma kuralı karşılanmadan çukura girilemez
function exitAllowed() {
  const rules = run.rules || {};
  let why = '';
  if (rules.allGems && L.gemsFound < L.gems.length) why = `💎 Önce bütün mücevherler! (${L.gemsFound}/${L.gems.length})`;
  if (rules.useJokers && L.jokersUsed < rules.useJokers) why = `🃏 Önce ${rules.useJokers} joker kullan! (${L.jokersUsed}/${rules.useJokers})`;
  if (!why) return true;
  if (!L.exitWarned) { L.exitWarned = true; toast(why); setTimeout(() => { if (L) L.exitWarned = false; }, 2500); }
  return false;
}

function onPad(pad, fromNet) {
  if (L.def.switches) {
    if (pad.pressed) return;
    const order = L.def.switches.order;
    if (L.def.switches.any || pad.key === order[L.seq]) {
      if (!fromNet) netEv({ e: 'pad', key: pad.key });
      pad.pressed = true; L.seq++;
      pad.mesh.position.y = pad.h + 0.1; pad.mesh.material.emissiveIntensity = 1.4;
      sfx.pad(pad.idx);
      particles.emit(pad.x, pad.h + 0.3, pad.z, 16, SWITCH_COLORS[pad.key][0], 2.5, 0.5, 3, 1.5);
      if (L.seq === order.length) {
        openGate(L.gates[L.def.switches.gate], fromNet);
        toast('🌈 Bütün düğmeler basıldı! Kapı açılıyor.');
      } else toast(`${SWITCH_COLORS[pad.key][1]} düğme basıldı (${L.seq}/${order.length})`, 1600);
    } else {
      L.pads.forEach(o => { o.pressed = false; o.mesh.position.y = o.h + 0.2; o.mesh.material.emissiveIntensity = 0.15; });
      L.seq = 0;
      toast('❌ Yanlış sıra! Bütün düğmeler sıfırlandı.');
      sfx.wrong();
    }
    renderClues();
    return;
  }
  const sm = L.simon;
  if (!sm || sm.phase !== 'input') return;
  pad.flash = 0.35;
  sfx.pad(pad.idx);
  if (pad.key === sm.seq[sm.idx]) {
    sm.idx++;
    if (sm.idx === sm.seq.length) {
      sm.phase = 'done';
      openGate(sm.gate);
      toast('🎵 Mükemmel hafıza! Kapı açılıyor.');
    }
  } else {
    sm.phase = 'idle';
    sfx.wrong();
    toast('❌ Yanlış düğme! Sırayı tekrar görmek için kapıya dokun.');
  }
  renderClues();
}

function startSimon(gate) {
  const keysAvail = L.pads.map(p => p.key);
  if (!L.simon || L.simon.phase === 'idle' && !L.simon.seq.length) {
    L.simon = { gate, seq: gate.def.seq || Array.from({ length: gate.def.length || 4 }, () => pick(keysAvail)), idx: 0, phase: 'idle', t: 0, step: 0 };
  }
  const sm = L.simon;
  sm.phase = 'show'; sm.idx = 0; sm.step = 0; sm.t = 0.8;
  toast('👀 Sırayı izle...', 2500);
}

function updateSimon(dt) {
  for (const p of L.pads) {
    if (p.flash > 0) p.flash -= dt;
    if (!L.def.switches) p.mesh.material.emissiveIntensity = p.flash > 0 ? 2.2 : 0.15;
  }
  const sm = L.simon;
  if (!sm || sm.phase !== 'show') return;
  sm.t -= dt;
  if (sm.t > 0) return;
  if (sm.step >= sm.seq.length) {
    sm.phase = 'input';
    toast('🎮 Şimdi sıra sende! Düğmelerin üstünden aynı sırayla geç.', 3500);
    renderClues();
    return;
  }
  const pad = L.pads.find(p => p.key === sm.seq[sm.step]);
  pad.flash = 0.45;
  sfx.pad(pad.idx);
  particles.emit(pad.x, pad.h + 0.4, pad.z, 12, SWITCH_COLORS[pad.key][0], 2, 0.5, 2, 2);
  sm.step++;
  sm.t = 0.75;
}

function touchGate(g) {
  if (!g || g.open || !g.armed) return;
  g.armed = false;
  const t = g.def.type;
  if (t === 'simon') {
    if (!L.simon || L.simon.phase === 'idle' || L.simon.phase === 'input') startSimon(g);
    return;
  }
  // Eski kayıtlı labirentlerdeki bilmeceli kapılar anahtar kapısı gibi davranır
  if (!['switch', 'plates', 'laser', 'cogs'].includes(t) && L.keysFound >= L.keys.length) return openGate(g);
  toast(`🔒 ${g.def.q}`, 5000);
  speak(g.def.q);
}

function openGate(g, fromNet) {
  if (!g || g.open) return;
  g.open = true;
  if (!fromNet) netEv({ e: 'gate', key: g.key });
  sfx.open();
  shake = Math.max(shake, 0.35);
  particles.emit(g.x, 0.3, g.z, 40, 0xbfae8f, 4, 0.9, 6, 1);
  L.beamDirty = true;
}

function hit(msg) {
  if (L.fx.shield > 0) { popShield(); return; }
  loseLife(msg, 'normal');
}

function popShield() {
  L.fx.shield = 0;
  L.inv = 1.2;
  sfx.shieldPop();
  particles.emit(pos.x, pos.y, pos.z, 40, 0x4cc9f0, 5, 0.6, 2, 1);
  toast('🛡️ Kalkan seni korudu!');
}

function respawnAtCheckpoint() {
  pos.set(L.cp.x, groundAt(L.cp.x, L.cp.z) + R, L.cp.z);
  vel.set(0, 0);
  vy = 0; onGround = true;
  state = 'play';
  marbleMesh.scale.setScalar(1);
  history.length = 0;
  flash();
}

function hurtFlash() {
  const h = $('hurt');
  h.style.transition = 'none'; h.style.opacity = 1;
  requestAnimationFrame(() => { h.style.transition = 'opacity .8s'; h.style.opacity = 0; });
  shake = Math.max(shake, 0.6);
}

function loseLife(msg, kind) {
  L.lives--; L.livesLost++;
  sfx.hurt();
  hurtFlash();
  particles.emit(pos.x, pos.y, pos.z, 30, 0xff3030, 4, 0.6, 6, 1);
  if (N) {
    // Çok oyunculuda maç durmaz: canı biten oyuncu en baştan devam eder
    if (L.lives <= 0) { L.lives = START_LIVES; L.cp = L.start; msg += ' Canın bitti, başa döndün.'; }
    respawnAtCheckpoint();
    L.inv = 2;
    toast(msg);
    return;
  }
  if (L.lives <= 0) return showLose(kind === 'alien' ? 'alien' : 'lives', false, msg);
  if (kind === 'alien') return showLose('alien', true, msg);
  respawnAtCheckpoint();
  L.inv = 1.6;
  toast(`${msg} Kalan can: ${L.lives}`);
}

function startAbduction(a) {
  state = 'abduct';
  abduct = { a, t: 0, from: pos.clone() };
  vel.set(0, 0);
  sfx.alien();
  toast('👽 Uzaylılar seni yakaladı!', 2000);
}

// ------------------------------------------------------------------
// Arayüz
// ------------------------------------------------------------------
let toastTimer = 0;
export function toast(msg, ms = 3500) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}
function flash() {
  const f = $('fade');
  f.style.transition = 'none'; f.style.opacity = 0.7;
  requestAnimationFrame(() => { f.style.transition = 'opacity .5s'; f.style.opacity = 0; });
}

function renderClues() {
  const entries = Object.keys(L.def.clues || {});
  $('clues').style.display = entries.length || L.pads.length ? 'block' : 'none';
  const found = entries.filter(k => L.clues[k]?.found).length;
  $('clueCount').textContent = `(${found}/${entries.length})`;
  $('clueList').innerHTML = entries.map(k => L.clues[k]?.found
    ? `<li data-k="${esc(k)}" title="Tekrar dinlemek için tıkla">${esc(clueText(k))} 🔊</li>` : '<li class="unk">❔ Henüz bulunmadı</li>').join('');
  $('clueList').querySelectorAll('li[data-k]').forEach(li => (li.onclick = () => playClue(li.dataset.k)));
  if (L.def.switches) {
    $('seq').textContent = 'Düğmeler: ' + L.def.switches.order.map((_, i) => (i < L.seq ? '●' : '○')).join(' ');
  } else if (L.simon && L.simon.phase === 'input') {
    $('seq').textContent = 'Hafıza: ' + L.simon.seq.map((_, i) => (i < L.simon.idx ? '●' : '○')).join(' ');
  } else $('seq').textContent = '';
}

function renderHud() {
  const limit = N ? netTimeLeft() : timeLimit() ? timeLimit() - L.time : null;
  const timeTxt = limit !== null ? `⏳ <span class="${limit < 15 ? 'danger' : ''}">${fmt(Math.max(0, limit))}</span>` : `⏱ ${fmt(N ? N.clock : L.time)}`;
  const pw = Object.entries(L.fx).filter(([k, v]) => v > 0).map(([k, v]) => `${POWERS[k].emoji}${Math.ceil(v)}`).join(' ');
  $('hud').innerHTML = `<b>${esc(L.def.title)}</b><br>` + (L.def.hub ? `📓 ${save.notebook.length}/${Object.keys(EVIDENCE).length}` : `${'❤️'.repeat(Math.max(0, L.lives))} &nbsp; ${timeTxt}`) +
    (L.keys.length ? ` &nbsp; 🗝 ${L.keysFound}/${L.keys.length}` : '') +
    (L.cogs.length ? ` &nbsp; ⚙ ${L.cogs.filter(c => !c.dead).length}` : '') +
    (L.coins.length || L.def.hub ? ` &nbsp; 🪙 ${save.coins}` : '') +
    (L.gems.length && N?.mode !== 'hunt' ? ` &nbsp; 💎 ${L.gemsFound}/${L.gems.length}` : '') +
    `<br><small>🎥 ${CAM_NAMES[camMode]}${pw ? ' &nbsp; ' + pw : ''}</small>`;
}

const mctx = $('minimap').getContext('2d');
function drawMinimap() {
  const mm = $('minimap');
  const visible = showMap && !run.rules?.noMap;
  mm.style.display = visible && state !== 'idle' ? 'block' : 'none';
  if (!visible) return;
  const th = L.def.theme, s = L.mapScale, g = mctx;
  g.clearRect(0, 0, mm.width, mm.height);
  g.save(); g.translate(5, 5);
  for (let r = 0; r < L.H; r++) for (let c = 0; c < L.W; c++) {
    const ch = L.grid[r][c];
    let color = hex(th.floor2);
    const inf = L.info[r][c];
    if (inf.ramp) color = hex(th.accent);
    else if (inf.flat > 0) color = '#' + new THREE.Color(th.floor1).multiplyScalar(1 + inf.flat * 0.35).getHexString();
    if (ch === '#' || ch === '=' || (ch === 'W' && isSolidCell(r, c))) color = hex(th.wall);
    else if (isHole(r, c)) color = '#000';
    else if (ch === 'E') color = hex(th.accent);
    else if (ch === 'X') color = '#7a2a2a';
    else if ((ch === 'G' || ch === 'H') && !L.gates[ch]?.open) color = '#ffd166';
    else if ('LZ/\\'.includes(ch)) color = '#c8d0e0';
    else if (ch === 'P') color = '#888';
    g.fillStyle = color; g.fillRect(c * s, r * s, s, s);
  }
  const dot = (x, z, rad, color) => { g.fillStyle = color; g.beginPath(); g.arc((x / CELL) * s, (z / CELL) * s, rad, 0, Math.PI * 2); g.fill(); };
  for (const cl of Object.values(L.clues)) if (!cl.found) dot(cl.x, cl.z, s * 0.35, '#7ee8ff');
  for (const ht of L.hearts) if (!ht.taken) dot(ht.x, ht.z, s * 0.35, '#ff4d6d');
  for (const gm of L.gems) if (!gm.taken) dot(gm.x, gm.z, s * 0.3, '#ff4fd8');
  for (const pw of L.powerups) if (!pw.taken) dot(pw.x, pw.z, s * 0.35, hex(POWERS[pw.type].color));
  for (const k of L.keys) if (!k.taken) dot(k.x, k.z, s * 0.38, '#ffd166');
  for (const b of L.jokerBoxes) if (!b.taken) dot(b.x, b.z, s * 0.42, hex(JOKERS[b.type].color));
  for (const n of L.npcs) if (n.id) dot(n.x, n.z, s * 0.42, '#ffe9a8');
  for (const p of L.portals) if (!p.human || P.human) dot(p.x, p.z, s * 0.5, p.locked ? '#667085' : p.human ? '#b070ff' : '#4cc9f0');
  for (const c of L.coins) if (!c.taken) dot(c.x, c.z, s * 0.25, '#ffc83d');
  if (N) for (const o of N.remotes.values()) if (!o.hidden) dot(o.x, o.z, s * 0.5, hex(o.color));
  for (const p of L.pads) dot(p.x, p.z, s * 0.38, p.pressed ? '#fff' : hex(SWITCH_COLORS[p.key][0]));
  for (const b of L.boxes) { g.fillStyle = '#b07a3c'; g.fillRect((b.mesh.position.x / CELL - 0.4) * s, (b.mesh.position.z / CELL - 0.4) * s, s * 0.8, s * 0.8); }
  for (const p of L.patrols) dot(p.x, p.z, s * 0.35, '#ff3030');
  for (const a of L.chasers) dot(a.x, a.z, s * 0.45, '#5fe35f');
  dot(pos.x, pos.z, s * 0.45, '#fff');
  if (camMode !== 0) {
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath();
    g.moveTo((pos.x / CELL) * s, (pos.z / CELL) * s);
    g.lineTo((pos.x / CELL) * s + Math.sin(yaw) * s * 1.4, (pos.z / CELL) * s - Math.cos(yaw) * s * 1.4);
    g.stroke();
  }
  g.restore();
}

let bannerTimer = 0;
function banner(title, sub) {
  $('bTitle').textContent = title; $('bSub').textContent = sub;
  $('banner').classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => $('banner').classList.remove('show'), 3400);
}

function lockPointer() {
  if (isOpen()) return;   // labirent dışında fare görünür kalır, kamera sağ tıkla döner
  if (camMode !== 0 && state === 'play' && !paused && !modal) renderer.domElement.requestPointerLock?.()?.catch?.(() => {});
}
function unlockPointer() { if (document.pointerLockElement) document.exitPointerLock(); }
renderer.domElement.addEventListener('click', lockPointer);

// Labirent dışında yalnızca gözden veya arkadan görüş vardır.
// remember=false: tercih kaydedilmez (kasabadaki geçici değişim)
export function setCamMode(m, quiet, remember = true) {
  if (remember) { save.settings.camMode = m; persist(); }
  if (isOpen() && m === 0) m = 1;
  camMode = m;
  camera.fov = [50, 62, 75][m];
  camera.updateProjectionMatrix();
  snapCam = true;
  $('cross').style.display = m === 2 && state !== 'idle' ? 'block' : 'none';
  if (m === 0 || isOpen()) unlockPointer(); else lockPointer();
  if (!quiet) toast(`🎥 Kamera: ${CAM_NAMES[m]}${isOpen() ? ' — sağ tuşa basılı tutarak çevir' : m ? ' — fareyle dön, Esc ile fareyi bırak' : ''}`, 2400);
}

// ------------------------------------------------------------------
// Konuşma penceresi, tabelalar, ayrıntılar ve defter
// ------------------------------------------------------------------
let dialog = null, dialogTimer = 0;
function openDialog(who, lines, onDone) {
  dialog = { who, lines, i: 0, typing: false, onDone };
  vel.set(0, 0);
  setModal('dialog');
  showDialogLine();
}
function showDialogLine() {
  const line = dialog.lines[dialog.i];
  $('dName').textContent = dialog.who.name;
  $('dPortrait').textContent = dialog.who.emoji;
  $('dPortrait').style.background = hex(dialog.who.color ?? 0x667085);
  if (line.note) addNote(line.note);   // sessizce deftere işlenir, önemini oyuncu çıkarır
  speak(line.t);
  clearInterval(dialogTimer);
  const el = $('dText');
  let i = 0;
  el.textContent = '';
  dialog.typing = true;
  dialogTimer = setInterval(() => {
    el.textContent = line.t.slice(0, ++i);
    if (i >= line.t.length) { clearInterval(dialogTimer); dialog.typing = false; }
  }, 18);
}
function advanceDialog() {
  if (!dialog) return;
  if (dialog.typing) {
    clearInterval(dialogTimer);
    dialog.typing = false;
    $('dText').textContent = dialog.lines[dialog.i].t;
    return;
  }
  dialog.i++;
  if (dialog.i < dialog.lines.length) return showDialogLine();
  const done = dialog.onDone;
  dialog = null;
  stopSpeaking();
  setModal(null);
  lockPointer();
  done?.();
}
$('dialog').addEventListener('click', advanceDialog);

// Yakındaki konuşulabilir şey: F tuşunun ne yapacağını belirler
function updateInteract() {
  let best = null, bestD = 1e9;
  const consider = (kind, o, range) => {
    const d = Math.hypot(pos.x - o.x, pos.z - o.z);
    if (d < range && d < bestD && Math.abs(pos.y - R - o.h) < 1.4) { best = { kind, o }; bestD = d; }
  };
  for (const n of L.npcs) if (n.id) consider('npc', n, 2.0 + n.r);
  for (const n of L.signs) consider('sign', n, 1.8);
  for (const d of L.details) if (!save.notebook.includes(d.id) && (!d.humanOnly || P.human)) consider('detail', d, 1.35);
  L.interact = best;
  const text = !best ? '' : best.kind === 'npc' ? `<kbd>F</kbd> ${esc(CAST[best.o.id].name)} ile konuş`
    : best.kind === 'sign' ? '<kbd>F</kbd> Tabelayı oku' : '<kbd>F</kbd> 🔍 Bir şey var, incele';
  if ($('prompt').dataset.t !== text) { $('prompt').dataset.t = text; $('prompt').innerHTML = text; }
  $('prompt').classList.toggle('show', !!best && state === 'play');
}

function interact(it) {
  if (it.kind === 'npc') {
    const spec = CAST[it.o.id];
    const opts = (DIALOGUE[it.o.id] || []).filter(d => d.from <= L.stage);
    if (!opts.length) return;
    // Önce en güncel söz; yeniden konuşunca önceki söyledikleri de sırayla gelir
    L.talkTurn = L.talkTurn || {};
    const turn = L.talkTurn[it.o.id] = (L.talkTurn[it.o.id] || 0) + 1;
    openDialog(spec, opts[(opts.length - turn % opts.length) % opts.length].lines, it.o.id === 'topac' ? openShop : undefined);
  } else if (it.kind === 'sign') {
    const [title, text] = SIGNS[it.o.id];
    openDialog({ name: title, emoji: '🪧', color: 0x8a5a2b }, [{ t: text }]);
  } else {
    const ev = EVIDENCE[it.o.id];
    addNote(it.o.id);
    sfx.clue();
    it.o.mesh.visible = false; it.o.glint.visible = false;
    openDialog({ name: `🔍 ${ev.title}`, emoji: '📓', color: 0x3a3f55 }, [{ t: `${ev.text} (Deftere yazıldı: N)` }]);
  }
}

// Topaç Usta'nın dükkânı
function openShop() {
  const box = $('shopBody');
  box.textContent = '';
  const row = (emoji, name, note, cost, owned, buy) => {
    const b = document.createElement('button');
    b.className = 'ghost shop-row';
    b.disabled = owned || save.coins < cost;
    b.textContent = `${emoji} ${name}: ${note} ${owned ? '(sende)' : `🪙 ${cost}`}`;
    b.onclick = () => { save.coins -= cost; buy(); persist(); sfx.coin(); renderHotbar(); openShop(); };
    box.appendChild(b);
  };
  $('shopCoins').textContent = `🪙 ${save.coins}`;
  row(ITEMS.iksir.emoji, ITEMS.iksir.name, '1 can verir', POTION_COST, false, () => save.potions++);
  for (const id of ['bot', 'celik', 'pil']) row(ITEMS[id].emoji, ITEMS[id].name, ITEMS[id].passive, ITEMS[id].cost, save.items.includes(id), () => save.items.push(id));
  setModal('shop');
}
$('shopClose').onclick = () => { setModal(null); lockPointer(); };

// Eşya çubuğu: yalnızca insan formunda kullanılır
function selectTool(id) {
  if (!P.human || !hasItem(id)) return;
  if (id === 'iksir') {
    if (L.lives >= MAX_LIVES) return toast('Canın dolu.', 1500);
    save.potions--; persist();
    L.lives++;
    sfx.heart();
    particles.emit(pos.x, pos.y + 0.6, pos.z, 26, 0x7cff9c, 3, 0.7, 1, 2);
    return renderHotbar();
  }
  if (id === 'fener' && P.tool === 'fener') { P.lamp = !P.lamp; sfx.click(); return renderHotbar(); }
  P.tool = id;
  if (id === 'fener') P.lamp = true;
  sfx.click();
  renderHotbar();
}

function renderHotbar() {
  const el = $('hotbar');
  const show = P.human && state !== 'idle' && !N;
  el.classList.toggle('show', show);
  if (!show) return;
  const coins = `<span class="coins">🪙 ${save.coins}</span>`;
  el.innerHTML = SLOTS.map((id, i) => {
    const I = ITEMS[id], has = hasItem(id);
    const on = P.tool === id ? ' on' : '';
    const lamp = id === 'fener' && P.lamp ? ' lit' : '';
    const count = id === 'iksir' ? `<small>${save.potions}</small>` : '';
    return `<div class="slot${on}${lamp}${has ? '' : ' none'}"><kbd>${i + 1}</kbd>${has ? I.emoji : '·'}${count}</div>`;
  }).join('') + coins;
  setHeld(humanMesh, P.tool === 'kilic' && save.items.includes('celik') ? 'celik' : P.tool);
}

// Sol tık: elindeki eşyayı kullan
function attack() {
  if (state !== 'play' || !P.human || P.attackCd > 0 || N) return;
  if (P.tool === 'kilic') swingSword();
  else if (P.tool === 'kanca') fireHook();
}
function swingSword() {
  P.attackCd = 0.42;
  humanMesh.userData.swing = 0.3;
  sfx.swing();
  const dmg = save.items.includes('celik') ? 2 : 1;
  const fx = Math.sin(humanMesh.rotation.y), fz = Math.cos(humanMesh.rotation.y);
  const inArc = (x, z, reach) => {
    const dx = x - pos.x, dz = z - pos.z, d = Math.hypot(dx, dz);
    return d < reach && (d < 0.8 || (dx * fx + dz * fz) / d > 0.2);
  };
  for (const m of L.monsters) {
    if (m.dead || m.asleep || !inArc(m.x, m.z, 2.3)) continue;
    m.stun = m.kind === 'saatci' ? 2.2 : 0.8;
    particles.emit(m.x, 1.2, m.z, 22, 0xd8cfc2, 4, 0.5, 6, 1.5);
    shake = Math.max(shake, 0.3);
    sfx.smash();
    if (m.kind === 'saatci') { toast('Saatçi sendeliyor. Kırılmıyor.', 1500); continue; }
    m.hp -= dmg;
    if (m.hp <= 0) { m.dead = true; m.mesh.visible = false; particles.emit(m.x, 1, m.z, 50, 0x8f7a55, 5, 0.9, 7, 2); }
  }
  for (const c of L.cogs) {
    if (c.dead || !inArc(c.x, c.z, 2.6)) continue;
    c.hp -= dmg;
    sfx.smash();
    shake = Math.max(shake, 0.4);
    particles.emit(c.x, c.h + 1.1, c.z, 26, 0xffc83d, 5, 0.6, 7, 2);
    if (c.hp <= 0) {
      c.dead = true; c.mesh.visible = false;
      const left = L.cogs.filter(o => !o.dead).length;
      toast(left ? `⚙ Bir dişli kırıldı. ${left} kaldı. Kule titriyor.` : '⚙ Son dişli de kırıldı. Kapı açılıyor.', 3000);
      jumpScare(true);
      if (!left) openGate(Object.values(L.gates).find(g => g.def.type === 'cogs'));
    }
  }
}
function fireHook() {
  let best = null, bestD = 15;
  for (const k of L.hooks) {
    const d = Math.hypot(k.x - pos.x, k.y - pos.y, k.z - pos.z);
    if (d < bestD) { best = k; bestD = d; }
  }
  if (!best) return toast('🪝 Yakında kanca halkası yok.', 1400);
  P.attackCd = 0.6;
  P.pull = { x: best.x, y: best.y, z: best.z, t: 1.6 };
  hookLine.visible = true;
  sfx.hookShot();
}

// Gece atmosferi ve yaratıklar
function jumpScare(soft) {
  if (soft) { sfx.smash(); return; }
  sfx.scare();
  shake = Math.max(shake, 0.9);
  const el = $('scare');
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function wakeMonster(m) {
  m.asleep = null;
  m.mesh.visible = true;
  jumpScare();
  toast('Tık. Tık. Tık. Arkanda.', 3500);
}
function lampOn() { return P.lamp && P.human && hasItem('fener'); }

function updateMonsters(dt) {
  if (!L.monsters.length) return;
  let nearest = 99, saatci = 99;
  const lit = lampOn(), lightR = save.items.includes('pil') ? 11 : 8;
  for (const m of L.monsters) {
    if (m.dead || m.asleep) continue;
    const d = Math.hypot(pos.x - m.x, pos.z - m.z);
    nearest = Math.min(nearest, d);
    if (m.kind === 'saatci') saatci = Math.min(saatci, d);
    if (m.stun > 0) { m.stun -= dt; m.mesh.rotation.z = Math.sin(gameTime * 30) * 0.05; continue; }
    m.mesh.rotation.z = 0;
    // Korkuluk ışıkta donar; Saatçi ışığa hızlanır
    const inLight = lit && d < lightR;
    if (m.kind === 'korkuluk' && inLight) continue;
    m.mesh.rotation.y = Math.atan2(pos.x - m.x, pos.z - m.z);
    if (d > m.range || state !== 'play') continue;
    m.timer -= dt;
    const cr = Math.floor(m.z / CELL), cc = Math.floor(m.x / CELL), pr = Math.floor(pos.z / CELL), pc = Math.floor(pos.x / CELL);
    if (m.timer <= 0 || !m.next) { m.timer = 0.25; m.next = bfsStep(cr, cc, pr, pc, 90) || (cr === pr && cc === pc ? [pr, pc] : null); }
    let tx, tz;
    if (cr === pr && cc === pc) { tx = pos.x; tz = pos.z; }
    else if (m.next) { tx = cx(m.next[1]); tz = cx(m.next[0]); }
    else continue;
    const dx = tx - m.x, dz = tz - m.z, dl = Math.hypot(dx, dz);
    const sp = m.speed * (m.kind === 'saatci' && inLight ? 1.35 : 1) * dt;
    if (dl <= sp) { m.x = tx; m.z = tz; m.next = null; } else { m.x += (dx / dl) * sp; m.z += (dz / dl) * sp; }
    m.mesh.position.x = m.x; m.mesh.position.z = m.z;
    m.mesh.position.y = Math.abs(Math.sin(gameTime * (m.kind === 'oyuncak' ? 9 : 4) + m.x)) * 0.08;
    if (d < 1 && L.inv <= 0 && state === 'play') {
      m.stun = 1.4;
      jumpScare();
      hit(m.kind === 'saatci' ? '🕰 "Kurman bitti, kızım."' : m.kind === 'korkuluk' ? '🌾 Korkuluk seni yakaladı.' : '🧸 Küçük eller seni yakaladı.');
      if (!L) return;
    }
  }
  // Yakınlık sesi: kalp atışı hızlanır, Saatçi yaklaşınca tıkırtı
  L.beat -= dt;
  if (nearest < 12 && L.beat <= 0) { L.beat = 0.45 + nearest * 0.09; sfx.heartbeat(); }
  L.tickT = (L.tickT || 0) - dt;
  if (saatci < 22 && L.tickT <= 0) { L.tickT = Math.max(0.16, saatci * 0.05); sfx.tick(); }
  $('dread').style.opacity = clamp(1 - nearest / 10, 0, 0.85);
}

// Gece fısıltıları
const WHISPERS = ['Tık.', '"Elif?"', 'Birisi adını saydı.', 'Arkana bakma.', 'Üçü çeyrek geçiyor.', '"Geç kaldın."', 'Eller. Eller. Eller.', 'Kar kokusu.'];
function updateNightMood(dt) {
  if (!L.def.night) return;
  L.whisperT -= dt;
  if (L.whisperT <= 0) {
    L.whisperT = 14 + Math.random() * 18;
    sfx.whisper();
    toast(pick(WHISPERS), 2200);
  }
}

function openNotebook() {
  renderNotebook($('nbBody'));
  setModal('notebook');
}
$('nbClose').onclick = () => { if (modal === 'notebook') { setModal(null); lockPointer(); } else $('notebook').classList.remove('show'); };

// Pencereler (konuşma, defter, duraklatma, kaybetme) tek yerden yönetilir
function setModal(name) {
  modal = name;
  for (const id of ['dialog', 'notebook', 'pause', 'lose', 'shop']) $(id).classList.toggle('show', id === name);
  if (name) unlockPointer();
  setInputEnabled(!name && !paused && state !== 'idle');
}

export function pauseGame() {
  if (state === 'idle' || modal) return;
  paused = true;
  setModal('pause');
}
function resumeGame() {
  paused = false;
  setModal(null);
  lockPointer();
}
$('resumeBtn').onclick = resumeGame;
$('pauseNotebook').onclick = () => { paused = false; openNotebook(); };
$('restartBtn').onclick = () => { paused = false; setModal(null); startRun(run); };
$('settingsBtn').onclick = () => run.onSettings?.();
$('menuBtn').onclick = () => quitToMenu();

function showLose(kind, canContinue, msg) {
  state = 'lost';
  paused = true;
  sfx.wahwah();
  const alien = kind === 'alien';
  $('lose').classList.toggle('alien', alien);
  $('loseTitle').textContent = L.def.night ? 'ÜÇÜ ÇEYREK GEÇİYOR' : alien ? 'KAYBETTİNİZ! 👽' : kind === 'time' ? 'SÜRE DOLDU! ⏰' : 'KAYBETTİNİZ! 💔';
  $('loseText').textContent = L.def.night ? pick(NIGHT_LOSE) : alien ? pick(FUNNY_ALIEN) : kind === 'time' ? pick(FUNNY_TIME) : pick(FUNNY_LIVES);
  $('loseSub').textContent = canContinue ? `Kalan can: ${L.lives}` : (msg && !alien ? msg : 'Canın kalmadı, labirent baştan başlıyor.');
  $('loseContinue').style.display = canContinue ? '' : 'none';
  setModal('lose');
}
$('loseContinue').onclick = () => {
  paused = false;
  setModal(null);
  for (const a of L.chasers) { a.x = cx(a.home[1]); a.z = cx(a.home[0]); a.next = null; a.group.position.set(a.x, 1.5, a.z); }
  respawnAtCheckpoint();
  L.inv = 2;
  lockPointer();
};
$('loseRestart').onclick = () => { paused = false; setModal(null); startRun(run); };
$('loseMenu').onclick = () => quitToMenu();

function quitToMenu() {
  paused = false;
  setModal(null);
  endRun();
  run?.onQuit?.();
}

// ------------------------------------------------------------------
// Akış
// ------------------------------------------------------------------
export function startRun(r) {
  clearNet();
  run = r;
  buildLevel(r.def);
  // Gece bölümleri yalnızca insan formunda oynanır; kasabadaki biçim sonraki bölüme taşınmaz
  Object.assign(P, { frozen: 0, shock: 0, immune: 0, dash: 0, dashCd: 0, joker: null, human: !!r.def.night, humanCd: 0, pull: null, attackCd: 0, lamp: r.def.night ? save.items.includes('fener') : false, tool: r.def.night && save.items.includes('fener') ? 'fener' : null });
  hookLine.visible = false;
  $('curseOverlay').classList.toggle('show', P.human);
  $('dread').style.opacity = 0;
  airJumps = 1;
  paintMarble(r.net?.color);
  if (r.rules?.dark || r.def.dark) {
    scene.background = new THREE.Color(0x030308);
    scene.fog = new THREE.Fog(0x030308, 2, r.def.night ? 15 : 13);
    hemi.intensity = r.def.night ? 0.05 : 0.12; sun.intensity = r.def.night ? 0.02 : 0.1;
    scene.environmentIntensity = r.def.night ? 0.03 : 0.1;
    L.lamp = new THREE.PointLight(0xffdca8, r.def.night ? 0 : 26, 16);
    L.group.add(L.lamp);
  } else scene.environmentIntensity = 0.32;
  // Oyuncular başlangıçta üst üste doğmasın
  const slot = r.net?.slot ?? 1;
  const sx = r.spawn ? cx(r.spawn[1]) : L.start.x, sz = r.spawn ? cx(r.spawn[0]) : L.start.z;
  // Açık dünyada yer bol; labirent koridorunda üst üste binen misketler birbirini iter
  const gap = L.def.hub ? 1.4 : 0.5;
  pos.set(sx + ((slot % 3) - 1) * gap, groundAt(sx, sz) + R, sz + (slot > 2 ? gap : 0));
  if (r.net) initNet(r.net);
  vel.set(0, 0);
  vy = 0; onGround = true;
  yaw = openYaw(); pitch = 0.45; fpPitch = -0.2;
  marbleMesh.scale.setScalar(1);
  marbleMesh.visible = true;
  history.length = 0;
  snapCam = true;
  state = 'play';
  paused = false;
  marbleMesh.scale.setScalar(1); humanMesh.scale.setScalar(1);
  stopSpeaking();
  ['hud', 'help', 'view'].forEach(id => $(id).classList.add('on'));
  $('restartBtn').style.display = r.net ? 'none' : '';
  renderJokerSlot();
  setModal(null);
  setCamMode(save.settings.camMode || 0, true, false);
  startArrive();
  banner(L.def.title, (r.goalText || L.def.goal) + (r.timeAttack ? ' ⏳ Zamana karşı!' : ''));
  playMusic(L.def.theme.music || { root: 60, scale: 'major', tempo: 110 });
}

// Başlangıçta kamera en uzun açık yola baksın (duvara değil)
function openYaw() {
  const r0 = Math.floor(L.start.z / CELL), c0 = Math.floor(L.start.x / CELL);
  let best = [-1, 0], bestLen = -1;
  for (const [dr, dc] of [[-1, 0], [0, 1], [1, 0], [0, -1]]) {
    let n = 0;
    while (!isSolidCell(r0 + dr * (n + 1), c0 + dc * (n + 1)) && n < 30) n++;
    if (n > bestLen) { bestLen = n; best = [dr, dc]; }
  }
  return Math.atan2(best[1], -best[0]);
}

export function endRun() {
  clearNet();
  dialog = null; clearInterval(dialogTimer);
  P.joker = null; P.frozen = P.shock = 0; P.human = false;
  $('curseOverlay').classList.remove('show');
  humanMesh.visible = false;
  hookLine.visible = false;
  $('hotbar').classList.remove('show');
  $('dread').style.opacity = 0;
  $('prompt').classList.remove('show');
  renderJokerSlot();
  state = 'idle';
  setInputEnabled(false);
  unlockPointer();
  stopSpeaking();
  setRolling(0, false);
  ['hud', 'help', 'clues', 'minimap', 'cross'].forEach(id => { $(id).classList.remove('on'); $(id).style.display = ''; });
  $('clues').style.display = 'none';
  $('minimap').style.display = 'none';
  $('cross').style.display = 'none';
  marbleMesh.visible = false;
  shieldMesh.visible = false;
  faceMesh.visible = false;
  iceMesh.visible = false;
}

function timeLimit() {
  return run.rules?.limit ?? (run.timeAttack && L.def.par ? Math.round(L.def.par * 1.3) : 0);
}

function levelComplete() {
  if (N) return netFinish();
  state = 'done';
  paused = true;
  setInputEnabled(false);
  unlockPointer();
  setRolling(0, false);
  const timeOk = L.time <= L.def.par;
  const third = L.gems.length ? L.gemsFound === L.gems.length : L.livesLost === 0;
  const stars = 1 + (timeOk ? 1 : 0) + (third ? 1 : 0);
  sfx.win();
  run.onComplete?.({ time: L.time, stars, gems: L.gemsFound, gemsTotal: L.gems.length, livesLost: L.livesLost, par: L.def.par, timeOk, third });
}

// Girdi eylemleri
onAction(act => {
  if (state === 'idle') return;
  if (modal === 'dialog') {
    if (['jump', 'use', 'confirm'].includes(act)) advanceDialog();
    if (act === 'pause') { dialog.i = dialog.lines.length; dialog.typing = false; advanceDialog(); }
    return;
  }
  if (modal === 'notebook') {
    if (act === 'pause' || act === 'notebook') { setModal(null); lockPointer(); }
    return;
  }
  if (modal === 'shop') {
    if (act === 'pause') { setModal(null); lockPointer(); }
    return;
  }
  if (act === 'pause') {
    if (modal === 'pause') return resumeGame();
    if (!modal && state === 'play') return pauseGame();
    return;
  }
  if (modal || paused) return;
  if (act === 'jump') jumpQueued = true;
  if (act === 'notebook' && (!N || N.mode === 'coop' || N.mode === 'world')) openNotebook();
  if (act === 'dash') startDash();
  if (act === 'target') cycleTarget();
  if (act === 'use' && state === 'play') { if (L.interact) interact(L.interact); else useJoker(); }
  if (act === 'camera') {
    if (isOpen()) setCamMode(camMode === 1 ? 2 : 1, false, false);
    else setCamMode((camMode + 1) % 3);
  }
  if (act === 'human') toggleHuman();
  if (act === 'attack') attack();
  if (act.startsWith('slot')) selectTool(SLOTS[Number(act[4]) - 1]);
  if (act === 'map') showMap = !showMap;
  if (act === 'respawn' && state === 'play') respawnAtCheckpoint();
  if (act === 'resetBoxes') resetBoxes();
});

// Lanet: R ile insana dönüşülür. Bu durum hiçbir şekilde ağa gönderilmez;
// diğer oyuncular ve kasabalılar her zaman misket görür.
function toggleHuman() {
  if (state !== 'play' || P.humanCd > 0 || P.frozen > 0 || P.shock > 0) return;
  if (L.def.night) return toast('Burada dönemezsin. Lanet tam üstünde.', 1800);
  P.human = !P.human;
  if (!P.human) { P.pull = null; hookLine.visible = false; }
  renderHotbar();
  P.humanCd = 0.8;
  sfx.curse();
  particles.emit(pos.x, pos.y, pos.z, 50, 0xa44dff, 3.5, 0.8, -1, 1.2);
  $('curseOverlay').classList.toggle('show', P.human);
  if (P.human && !save.curseSeen) {
    save.curseSeen = true; persist();
    toast('🌑 Lanet... Bunu kimse görmemeli. Onlar seni hâlâ misket sanıyor.', 5000);
  }
}

function startDash() {
  if (state !== 'play' || P.dashCd > 0 || P.frozen > 0 || P.shock > 0 || P.human || !hasAbility('dash')) return;
  let [dx, dz] = L.moveDir || [0, 0];
  if (Math.hypot(dx, dz) < 0.1) { dx = vel.x; dz = vel.y; }
  if (Math.hypot(dx, dz) < 0.1) { dx = Math.sin(yaw); dz = -Math.cos(yaw); }
  const l = Math.hypot(dx, dz);
  vel.set((dx / l) * DASH_V, (dz / l) * DASH_V);
  P.dash = DASH_TIME; P.dashCd = DASH_COOLDOWN;
  sfx.dash();
  particles.emit(pos.x, pos.y, pos.z, 18, 0xbfefff, 3, 0.4, 0, 0.2);
}

// ------------------------------------------------------------------
// Jokerler: ❄️ 15 sn dondurur, ⚡ çarpar ve yakındakilere sıçrar
// ------------------------------------------------------------------
function gainJoker(type) {
  P.joker = type;
  sfx.power();
  const J = JOKERS[type];
  toast(`${J.emoji} ${J.name} aldın! F ile kullan.`, 2600);
  renderJokerSlot();
}
function hideBox(b) { b.mesh.visible = b.spr.visible = false; }

const rivals = () => (N && N.mode !== 'coop' ? [...N.remotes.values()].filter(o => !o.hidden) : []);
function currentTarget() {
  const list = rivals();
  if (!list.length) return null;
  const chosen = list.find(o => o.id === N.target);
  if (chosen) return chosen;
  return list.reduce((a, b) => (Math.hypot(a.x - pos.x, a.z - pos.z) <= Math.hypot(b.x - pos.x, b.z - pos.z) ? a : b));
}
function cycleTarget() {
  const list = rivals();
  if (!list.length) return;
  const cur = currentTarget();
  N.target = list[(list.indexOf(cur) + 1) % list.length].id;
  sfx.click();
  renderJokerSlot();
}

function renderJokerSlot() {
  const el = $('jokerSlot');
  const status = P.frozen > 0 ? `<b class="ice">🧊 Dondun! ${Math.ceil(P.frozen)} sn</b>`
    : P.shock > 0 ? `<b class="zap">⚡ Çarpıldın! ${Math.ceil(P.shock)} sn</b>` : '';
  let text = status;
  if (P.joker) {
    const J = JOKERS[P.joker], t = currentTarget();
    const aim = t ? ` → 🎯 ${esc(t.name)} <small>(Tab)</small>` : ' → <small>düşmanlara</small>';
    text += `${status ? ' &nbsp; ' : ''}${J.emoji} ${J.name} <kbd>F</kbd>${aim}`;
  }
  if (el.dataset.t !== text) { el.dataset.t = text; el.innerHTML = text; }
  el.classList.toggle('show', !!text);
  $('iceOverlay').classList.toggle('show', P.frozen > 0);
  $('shockOverlay').classList.toggle('show', P.shock > 0);
}

function useJoker() {
  const type = P.joker;
  if (!type || P.frozen > 0 || P.shock > 0) return;
  P.joker = null;
  L.jokersUsed++;
  const J = JOKERS[type], target = currentTarget();
  if (target) {
    sendNet({ k: 'use', type, target: target.id });
    jokerArc(net.id, target.id, type);
    toast(`${J.emoji} ${target.name} hedef alındı!`, 1800);
  } else {
    // Rakip yoksa joker düşmanlara işler
    L.fx.freeze = Math.max(L.fx.freeze, J.time);
    netEv({ e: 'freeze', t: L.fx.freeze });
    if (type === 'electric') for (const a of L.chasers) { a.x = cx(a.home[1]); a.z = cx(a.home[0]); a.next = null; }
    toast(type === 'ice' ? `${J.emoji} Bütün düşmanlar ${J.time} sn dondu!` : `${J.emoji} Uzaylılar çarpıldı, üslerine kaçtılar!`);
    particles.emit(pos.x, pos.y, pos.z, 60, J.color, 7, 0.8, 1, 1.5);
  }
  type === 'ice' ? sfx.freeze() : sfx.zap();
  renderJokerSlot();
}

// Bana gelen joker
function receiveJoker(type, fromName, chained) {
  if (state === 'exit' || state === 'spect') return;
  if (P.immune > 0 || (type === 'ice' && P.frozen > 0)) return;
  if (L.fx.shield > 0) { popShield(); return; }
  const J = JOKERS[type];
  if (type === 'ice') {
    P.frozen = J.time;
    sfx.freeze();
    toast(`❄️ ${fromName} seni ${J.time} saniye dondurdu!`);
    particles.emit(pos.x, pos.y, pos.z, 60, J.color, 4, 1, 2, 2);
  } else {
    P.shock = J.time;
    sfx.zap();
    hurtFlash();
    toast(`⚡ ${fromName} seni çarptı!`);
    if (!chained) for (const o of rivals()) {
      if (Math.hypot(o.x - pos.x, o.z - pos.z) < CHAIN_R) {
        sendNet({ k: 'use', type, target: o.id, chain: 1 });
        jokerArc(net.id, o.id, type);
      }
    }
  }
  renderJokerSlot();
}

const playerPos = id => (id === net.id ? pos : N?.remotes.get(id));
function jokerArc(fromId, toId, type) {
  const a = playerPos(fromId), b = playerPos(toId);
  if (!a || !b) return;
  const pts = [];
  const steps = type === 'electric' ? 9 : 1;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps, jit = type === 'electric' && i > 0 && i < steps ? 0.45 : 0;
    pts.push(new THREE.Vector3(a.x + (b.x - a.x) * u + (Math.random() - 0.5) * jit, a.y + (b.y - a.y) * u + 0.2 + (Math.random() - 0.5) * jit, a.z + (b.z - a.z) * u + (Math.random() - 0.5) * jit));
  }
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: JOKERS[type].color }));
  L.group.add(line);
  L.fxLines.push({ line, t: 0.45 });
  particles.emit(b.x, b.y, b.z, 40, JOKERS[type].color, 4, 0.6, 2, 1.5);
}

// ------------------------------------------------------------------
// Çok oyunculu: herkes kendi misketini sürer ve konumunu yayınlar.
// Uzaylıların konumu, süre ve paylaşılan nesneler ev sahibinde hesaplanır.
// ------------------------------------------------------------------
function initNet(cfg) {
  N = {
    mode: cfg.mode, onEnd: cfg.onEnd, remotes: new Map(), clock: 0, sendT: 0, worldT: 0, panelT: 0,
    finishes: new Map(), scores: new Map(), firstFinish: null, ended: false, target: null,
  };
  document.body.classList.add('mp');
  for (const p of net.players.values()) if (p.id !== net.id) addRemote(p);
  $('players').classList.add('show');
}

function addRemote(p) {
  const mesh = createMarbleMesh(envTex, R, p.color);
  const face = makeFace(R);
  const label = textSprite(p.name, hex(p.color), 0.8);
  const ice = makeIce();
  ice.visible = false;
  const limbs = makeLimbs(R, p.color);
  L.group.add(mesh, face, label, ice, limbs);
  N.remotes.set(p.id, { id: p.id, name: p.name, color: p.color, mesh, face, label, ice, limbs, lift: 1, x: L.start.x, y: R, z: L.start.z, vx: 0, vz: 0, tx: L.start.x, ty: R, tz: L.start.z, frozen: 0, shock: 0, hidden: false });
}

function removeRemote(id) {
  const o = N.remotes.get(id);
  if (!o) return;
  for (const part of [o.mesh, o.face, o.label, o.ice, o.limbs]) { L.group.remove(part); disposeTree(part); }
  N.remotes.delete(id);
  if (N.target === id) N.target = null;
}

function clearNet() {
  if (!N) return;
  for (const id of [...N.remotes.keys()]) removeRemote(id);
  N = null;
  document.body.classList.remove('mp');
  $('players').classList.remove('show');
}

function netTimeLeft() {
  if (N.mode === 'hunt') return L.def.par - N.clock;
  if (run.rules?.limit) return run.rules.limit - N.clock;
  if (N.firstFinish !== null) return FINISH_WAIT[N.mode] - (N.clock - N.firstFinish);
  return null;
}

function claim(kind, i) {
  if (net.isHost) hostClaim(net.id, kind, i);
  else sendNet({ k: 'claim', kind, i }, net.hostId);
}
function hostClaim(to, kind, i) {
  const item = kind === 'gem' ? L.gems[i] : L.jokerBoxes[i];
  if (!item || item.taken) return;
  const msg = { k: 'grant', kind, i, to };
  sendNet(msg);
  applyGrant(msg);
}
function applyGrant({ kind, i, to }) {
  if (kind === 'gem') {
    const gm = L.gems[i];
    if (!gm) return;
    gm.taken = true; gm.mesh.visible = false; L.gemsFound++;
    N.scores.set(to, (N.scores.get(to) || 0) + 1);
    particles.emit(gm.x, gm.h + 0.7, gm.z, 24, 0xff4fd8, 3.5, 0.7, 2, 2);
    if (to === net.id) sfx.gem();
  } else {
    const b = L.jokerBoxes[i];
    if (!b) return;
    b.taken = true; b.back = JOKER_RESPAWN; hideBox(b);
    if (to === net.id) gainJoker(b.type);
  }
}

function netEvent(d) {
  switch (d.e) {
    case 'gate': return openGate(L.gates[d.key], true);
    case 'key': return L.keys[d.i] && takeKey(d.i, true);
    case 'wall': return breakWall(d.key, true);
    case 'box': { const b = L.boxes[d.i]; if (b) moveBox(b, d.r, d.c); return; }
    case 'resetBoxes': return resetBoxes(true);
    case 'mirror': return touchMirror(L.mirrors[d.key], true);
    case 'pad': { const p = L.pads.find(o => o.key === d.key); if (p) onPad(p, true); return; }
    case 'freeze': L.fx.freeze = Math.max(L.fx.freeze, Number(d.t) || 0); return;
  }
}

onNet(msg => {
  if (!N || !L) return;
  if (msg.t === 'left') {
    const o = N.remotes.get(msg.id);
    if (o) toast(`👋 ${o.name} oyundan ayrıldı.`, 2500);
    removeRemote(msg.id);
    return;
  }
  if (msg.t !== 'msg' || !msg.d) return;
  const d = msg.d, o = N.remotes.get(msg.from);
  switch (d.k) {
    case 's':
      if (!o) return;
      o.tx = d.x; o.ty = d.y; o.tz = d.z; o.vx = d.vx; o.vz = d.vz;
      o.frozen = d.fr; o.shock = d.sh; o.hidden = !!d.hid; o.seen = true;
      return;
    case 'world':
      if (msg.from !== net.hostId || net.isHost) return;
      enemyTime = Math.abs(d.et - enemyTime) > 0.5 ? d.et : enemyTime + (d.et - enemyTime) * 0.15;
      d.c.forEach((c, i) => {
        const a = L.chasers[i];
        if (!a) return;
        a.wx = c[0]; a.wz = c[1]; a.hunting = !!c[2];
      });
      return;
    case 'ev': return netEvent(d);
    case 'claim': if (net.isHost) hostClaim(msg.from, d.kind, d.i); return;
    case 'grant': return applyGrant(d);
    case 'use':
      jokerArc(msg.from, d.target, d.type);
      if (d.target === net.id && JOKERS[d.type]) receiveJoker(d.type, o?.name || 'Biri', !!d.chain);
      return;
    case 'finish':
      recordFinish(msg.from, d.time);
      return;
    case 'end':
      if (!N.ended) { N.ended = true; N.onEnd(d.ranking); }
      return;
  }
});

function recordFinish(id, time) {
  if (N.finishes.has(id)) return;
  N.finishes.set(id, time);
  if (N.firstFinish === null) N.firstFinish = N.clock;
  const name = id === net.id ? 'Sen' : N.remotes.get(id)?.name;
  if (name && id !== net.id) toast(`🏁 ${name} çukura ulaştı!`, 2500);
  sfx.click();
}

function netFinish() {
  state = 'spect';
  setRolling(0, false);
  $('fade').style.transition = 'opacity .5s'; $('fade').style.opacity = 0;
  sendNet({ k: 'finish', time: N.clock });
  recordFinish(net.id, N.clock);
  toast('🏁 Çukura ulaştın! Diğerlerini izliyorsun.', 3000);
}

function hostCheckEnd() {
  if (N.ended || N.mode === 'world') return;
  const everyone = [net.id, ...N.remotes.keys()];
  const left = netTimeLeft();
  let over = left !== null && left <= 0;
  if (N.mode === 'hunt') over ||= L.gems.length > 0 && L.gems.every(g => g.taken);
  else over ||= everyone.every(id => N.finishes.has(id));
  if (!over) return;
  N.ended = true;
  const entry = id => {
    const p = net.players.get(id);
    return { id, name: p?.name || '?', color: p?.color ?? 0xffffff, time: N.finishes.get(id) ?? null, gems: N.scores.get(id) || 0 };
  };
  const ranking = everyone.map(entry).sort((a, b) => (N.mode === 'hunt'
    ? b.gems - a.gems
    : (a.time ?? Infinity) - (b.time ?? Infinity)));
  sendNet({ k: 'end', ranking });
  N.onEnd(ranking);
}

function netUpdate(dt) {
  N.clock += dt;
  const wasLocked = P.frozen > 0 || P.shock > 0;
  if (P.frozen > 0 && (P.frozen -= dt) <= 0) { P.frozen = 0; P.immune = 6; sfx.crack(); particles.emit(pos.x, pos.y, pos.z, 40, 0xbdf0ff, 5, 0.6, 8, 2); }
  if (P.shock > 0 && (P.shock -= dt) <= 0) { P.shock = 0; P.immune = 3; }
  if (P.immune > 0) P.immune -= dt;
  if (wasLocked || P.joker) renderJokerSlot();

  N.sendT -= dt;
  if (N.sendT <= 0) {
    N.sendT = NET_RATE;
    const r3 = n => Math.round(n * 1000) / 1000;
    sendNet({ k: 's', x: r3(pos.x), y: r3(pos.y), z: r3(pos.z), vx: r3(vel.x), vz: r3(vel.y), fr: P.frozen > 0 ? 1 : 0, sh: P.shock > 0 ? 1 : 0, hid: state === 'spect' ? 1 : 0 });
  }
  for (const o of N.remotes.values()) {
    const k = Math.min(1, 14 * dt);
    const px = o.x, pz = o.z;
    o.x += (o.tx + o.vx * 0.05 - o.x) * k; o.y += (o.ty - o.y) * k; o.z += (o.tz + o.vz * 0.05 - o.z) * k;
    const dx = o.x - px, dz = o.z - pz, d = Math.hypot(dx, dz);
    if (d > 1e-5) {
      qTmp.setFromAxisAngle(axis.set(dz / d, 0, -dx / d), d / R);
      o.mesh.quaternion.premultiply(qTmp);
      o.face.rotation.y = Math.atan2(dx, dz);
    }
    // Dururken kol ve bacak çıkar, yuvarlanırken kaybolur
    const rolling = Math.hypot(o.vx, o.vz) > 0.5 || d / Math.max(dt, 1e-3) > 1.5 || Math.abs(o.ty - o.y) > 0.05;
    o.lift += ((rolling ? 0 : 1) - o.lift) * Math.min(1, 9 * dt);
    const up = o.lift * LIMB_LIFT;
    setStanding(o.limbs, o.hidden ? 0 : o.lift);
    o.limbs.position.set(o.x, o.y - R, o.z);
    o.limbs.rotation.y = o.face.rotation.y;
    o.mesh.position.set(o.x, o.y + up, o.z);
    o.face.position.set(o.x, o.y + up, o.z);
    o.label.position.set(o.x, o.y + 1.05 + up, o.z);
    o.ice.position.set(o.x, o.y, o.z);
    o.ice.visible = !!o.frozen && !o.hidden;
    o.mesh.visible = o.face.visible = o.label.visible = !o.hidden;
    blinkFace(o.face, gameTime);
    if (o.shock && Math.random() < 0.5) particles.emit(o.x, o.y, o.z, 3, 0xffe14d, 4, 0.25, 1, 1);
  }
  if (state === 'spect') {
    // Bitiren oyuncu hâlâ yarışanı izler
    const watch = [...N.remotes.values()].find(o => !o.hidden);
    if (watch) pos.set(watch.x, watch.y, watch.z);
  }
  if (net.isHost) {
    N.worldT -= dt;
    if (N.worldT <= 0) {
      N.worldT = WORLD_RATE;
      sendNet({ k: 'world', et: enemyTime, c: L.chasers.map(a => [Math.round(a.x * 100) / 100, Math.round(a.z * 100) / 100, a.hunting ? 1 : 0]) });
    }
    hostCheckEnd();
    if (!N) return;
  }
  N.panelT -= dt;
  if (N.panelT <= 0) {
    N.panelT = 0.25;
    renderPlayers();
  }
}

function renderPlayers() {
  const hunt = N.mode === 'hunt';
  const row = (id, name, color, fr, sh) => {
    const status = N.finishes.has(id) ? '🏁' : fr ? '🧊' : sh ? '⚡' : '';
    return `<li><i style="background:${hex(color)}"></i><span>${esc(name)}${id === net.id ? ' (sen)' : ''}</span><b>${status}${hunt ? ` 💎${N.scores.get(id) || 0}` : ''}</b></li>`;
  };
  const me = net.players.get(net.id);
  const rows = [row(net.id, me?.name || 'Sen', me?.color ?? 0xffffff, P.frozen > 0, P.shock > 0)];
  for (const o of N.remotes.values()) rows.push(row(o.id, o.name, o.color, o.frozen, o.shock));
  $('players').innerHTML = rows.join('');
}

addEventListener('wheel', e => { zoom = clamp(zoom + Math.sign(e.deltaY) * 0.1, 0.6, 1.8); }, { passive: true });

// ------------------------------------------------------------------
// Ana döngü
// ------------------------------------------------------------------
function update(dt) {
  pollGamepad();
  if (!L || state === 'idle') return;

  // Bakış: fare, gamepad sağ çubuk, ok tuşları / Q-E
  const [mx, my] = consumeMouse();
  if (!paused && !modal && camMode !== 0) {
    const sens = save.settings.mouseSens || 1;
    const [rx, ry] = padLook();
    let turn = rx * 2.6 * dt;
    if (keys.ArrowLeft || keys.KeyQ) turn -= TURN * dt;
    if (keys.ArrowRight || keys.KeyE) turn += TURN * dt;
    yaw += mx * 0.0025 * sens + turn;
    const dp = my * 0.002 * sens + ry * 1.8 * dt;
    if (camMode === 1) pitch = clamp(pitch + dp, 0.08, 1.25);
    else fpPitch = clamp(fpPitch - dp, -1.1, 0.7);
  }
  if (P.humanCd > 0) P.humanCd -= dt;
  if (N) { netUpdate(dt); if (!N || !L) return; }
  if (paused || modal) {
    // Çok oyunculuda dünya duraklamaz: ev sahibi düşmanları sürmeye devam eder
    if (N && net.isHost && L.fx.freeze <= 0) { enemyTime += dt; updateEnemies(dt); }
    return;
  }

  L.time += dt;
  gameTime += dt;
  if (P.dashCd > 0) P.dashCd -= dt;
  if (L.inv > 0) L.inv -= dt;
  for (const k of Object.keys(L.fx)) if (L.fx[k] > 0) L.fx[k] = Math.max(0, L.fx[k] - dt);
  if (L.fx.freeze <= 0) enemyTime += dt;

  if (!N && timeLimit() && state === 'play' && L.time > timeLimit()) { showLose('time', false); return; }
  for (const tick of L.tickers) tick(dt);
  if (P.attackCd > 0) P.attackCd -= dt;
  for (const m of L.movers) {
    const s = (enemyTime * m.speed) / Math.max(0.1, m.len), u = s % 2 < 1 ? s % 2 : 2 - (s % 2);
    const nx = m.ax + (m.bx - m.ax) * u, nz = m.az + (m.bz - m.az) * u;
    m.dx = nx - m.x; m.dz = nz - m.z;
    m.x = nx; m.z = nz;
    m.mesh.position.set(nx, m.top - 0.25, nz);
    if (L.onMover === m && state === 'play') { pos.x += m.dx; pos.z += m.dz; }
  }
  updateMonsters(dt);
  if (!L) return;
  updateNightMood(dt);
  for (const line of L.fxLines) line.t -= dt;
  L.fxLines = L.fxLines.filter(l => { if (l.t > 0) return true; L.group.remove(l.line); l.line.geometry.dispose(); l.line.material.dispose(); return false; });

  for (const s of L.sliders) {
    const ph = enemyTime * s.speed + s.phase;
    s.x = s.xa + (s.xb - s.xa) * (0.5 - 0.5 * Math.cos(ph));
    s.vx = L.fx.freeze > 0 ? 0 : (s.xb - s.xa) * 0.5 * Math.sin(ph) * s.speed;
    s.mesh.position.x = s.x;
  }
  for (const s of L.spinners) { s.a = enemyTime * s.speed; s.mesh.rotation.y = -s.a; }
  updateEnemies(dt);
  updateBoxes(dt);
  updateSimon(dt);
  for (const k of Object.values(L.crumbles)) {
    if (k.state === 'shaking') {
      k.t -= dt;
      k.mesh.position.x = k.x + (Math.random() - 0.5) * 0.08;
      k.mesh.position.z = k.z + (Math.random() - 0.5) * 0.08;
      if (k.t <= 0) { k.state = 'gone'; k.t = 5; particles.emit(k.x, 0, k.z, 20, 0x8a7a60, 2, 0.6, 6, 0.5); }
    } else if (k.state === 'gone') {
      k.t -= dt;
      k.mesh.position.y = Math.max(-6, k.mesh.position.y - dt * 8);
      if (k.t <= 0) { k.state = 'idle'; k.mesh.position.set(k.x, -0.2, k.z); }
    }
  }

  if (state === 'play') {
    const n = Math.ceil(dt / (1 / 120));
    for (let k = 0; k < n && state === 'play'; k++) {
      physicsStep(dt / n);
      checkCell();
    }
    if (state === 'play') updateInteract();
    else { L.interact = null; $('prompt').classList.remove('show'); }
  } else if (state === 'warp') {
    updateWarp(dt);
  } else if (state === 'warpIn') {
    updateArrive(dt);
  } else if (state === 'fall') {
    const hx = cx(Math.floor(pos.x / CELL)), hz = cx(Math.floor(pos.z / CELL));
    pos.x += (hx - pos.x) * Math.min(1, 6 * dt);
    pos.z += (hz - pos.z) * Math.min(1, 6 * dt);
    fallVy -= 30 * dt;
    pos.y += fallVy * dt;
    if (pos.y < -7) {
      if (L.fx.shield > 0) { popShield(); respawnAtCheckpoint(); }
      else loseLife('🕳 Deliğe düştün!', 'normal');
      if (!L) return;
    }
  } else if (state === 'exit') {
    exitT += dt;
    pos.x += (L.exit.x - pos.x) * Math.min(1, 8 * dt);
    pos.z += (L.exit.z - pos.z) * Math.min(1, 8 * dt);
    pos.y = R - exitT * exitT * 9;
    roll(0, -dt * 6);
    marbleMesh.scale.setScalar(Math.max(0.3, 1 - exitT * 0.4));
    $('fade').classList.remove('white');
    $('fade').style.transition = 'none';
    $('fade').style.opacity = clamp((exitT - 0.5) * 1.5, 0, 1);
    if (exitT > 1.4) levelComplete();
  } else if (state === 'abduct') {
    const ab = abduct, a = ab.a;
    ab.t += dt;
    const k = Math.min(1, ab.t / 1.6);
    a.beam.material.opacity = 0.55 + Math.sin(gameTime * 25) * 0.15;
    pos.x = ab.from.x + (a.x - ab.from.x) * k;
    pos.z = ab.from.z + (a.z - ab.from.z) * k;
    pos.y = ab.from.y + (a.group.position.y - 0.2 - ab.from.y) * k * k;
    marbleMesh.rotateY(dt * 12);
    marbleMesh.scale.setScalar(1 - k * 0.6);
    if (Math.random() < 0.5) particles.emit(pos.x, pos.y, pos.z, 2, 0x9cff9c, 1, 0.5, -2, 0.5);
    if (ab.t > 1.8) { marbleMesh.scale.setScalar(1); loseLife('👽 Uzaylılar seni kaçırdı!', 'alien'); }
  }

  animate(dt);
  updateBeams();
  if (L) renderHud();
}

function animate(dt) {
  const fly = (o) => {
    if (L.fx.magnet > 0 && !o.taken && !o.found) {
      const dx = pos.x - o.x, dz = pos.z - o.z, d = Math.hypot(dx, dz);
      if (d < 6 && d > 0.1) { o.x += (dx / d) * 9 * dt; o.z += (dz / d) * 9 * dt; o.h += (pos.y - R - o.h) * Math.min(1, 4 * dt); }
    }
  };
  for (const cl of Object.values(L.clues)) {
    fly(cl);
    if (!cl.found) {
      cl.mesh.rotation.y += dt * 1.5;
      cl.mesh.position.set(cl.x, cl.h + 1 + Math.sin(gameTime * 2.5 + cl.x) * 0.15, cl.z);
      cl.ring.position.set(cl.x, cl.h + 0.02, cl.z);
    } else if (cl.mesh.visible) {
      cl.t += dt;
      cl.mesh.scale.setScalar(Math.max(0.01, 1 - cl.t * 3));
      cl.mesh.position.y += dt * 3;
      if (cl.t > 0.35) { cl.mesh.visible = false; cl.ring.visible = false; }
    }
  }
  for (const co of L.coins) if (!co.taken) { co.mesh.rotation.z += dt * 3.5; co.mesh.position.set(co.x, co.h + 0.8 + Math.sin(gameTime * 3 + co.x) * 0.08, co.z); }
  for (const sp of Object.values(L.springs)) {
    if (sp.t > 0) sp.t -= dt;
    sp.top.position.y = sp.h + 0.2 + (sp.t > 0 ? 0.3 : 0);
  }
  for (const c of L.cogs) if (!c.dead) c.mesh.rotation.z += dt * 2.2;
  for (const it of L.pickups) if (!it.taken) it.mesh.position.y = it.h + 1 + Math.sin(gameTime * 3) * 0.1;
  if (P.pull) {
    const q = hookLine.geometry.attributes.position;
    q.setXYZ(0, pos.x, pos.y + 0.5, pos.z); q.setXYZ(1, P.pull.x, P.pull.y, P.pull.z);
    q.needsUpdate = true;
  }
  // Fener titrer
  if (L.lamp && L.def.night) {
    const flicker = 0.86 + Math.sin(gameTime * 17) * 0.06 + Math.sin(gameTime * 41) * 0.05 + (Math.random() < 0.01 ? -0.5 : 0);
    L.lamp.intensity = lampOn() ? 34 * flicker : 1.1;
    L.lamp.distance = lampOn() ? (save.items.includes('pil') ? 22 : 16) : 4;
    scene.fog.far = lampOn() ? (save.items.includes('pil') ? 21 : 15) : 5;
  }
  for (const k of L.keys) {
    if (k.taken) continue;
    fly(k);
    k.mesh.rotation.y += dt * 2;
    k.mesh.position.set(k.x, k.h + 0.85 + Math.sin(gameTime * 3 + k.x) * 0.1, k.z);
  }
  for (const b of L.jokerBoxes) {
    if (b.taken) {
      b.back -= dt;
      if (b.back <= 0) { b.taken = false; b.mesh.visible = b.spr.visible = true; }
      continue;
    }
    b.mesh.rotation.y += dt * 1.6; b.mesh.rotation.x += dt * 0.7;
    b.mesh.position.y = b.h + 0.8 + Math.sin(gameTime * 2.5 + b.x) * 0.1;
    b.spr.position.y = b.mesh.position.y;
  }
  for (const n of L.npcs) {
    const u = n.mesh.userData;
    const playerNear = Math.hypot(pos.x - n.x, pos.z - n.z) < 4;
    let rolling = false, faceAng = Math.atan2(pos.x - n.x, pos.z - n.z);
    if (n.wander && !playerNear) {
      // Arkadaşlar meydanda yuvarlanır, durunca kolları ve bacakları çıkar
      const dx = n.wx - n.x, dz = n.wz - n.z, dist = Math.hypot(dx, dz);
      if (dist > 0.05 && n.wait <= 0) {
        const step = Math.min(dist, 3.2 * dt);
        n.x += (dx / dist) * step; n.z += (dz / dist) * step;
        n.mesh.position.x = n.x; n.mesh.position.z = n.z;
        rolling = true;
        faceAng = Math.atan2(dx, dz);
        if (u.inner.userData.roll) {
          qTmp.setFromAxisAngle(axis.set(1, 0, 0), step / n.r);
          u.inner.quaternion.premultiply(qTmp);
        }
      } else if (n.wait > 0) n.wait -= dt;
      else {
        n.wait = 1.5 + Math.random() * 3;
        const a = Math.random() * Math.PI * 2, rr = 1 + Math.random() * (n.roam || 2.5);
        const tx = n.home[0] + Math.cos(a) * rr, tz = n.home[1] + Math.sin(a) * rr;
        const midx = (tx + n.x) / 2, midz = (tz + n.z) / 2;
        if (!isSolidCell(Math.floor(tz / CELL), Math.floor(tx / CELL)) && !isSolidCell(Math.floor(midz / CELL), Math.floor(midx / CELL))) { n.wx = tx; n.wz = tz; }
      }
    }
    let dy = faceAng - n.mesh.rotation.y;
    n.mesh.rotation.y += Math.atan2(Math.sin(dy), Math.cos(dy)) * Math.min(1, 4 * dt);
    n.lift += ((rolling ? 0 : 1) - n.lift) * Math.min(1, 9 * dt);
    if (u.limbs) {
      setStanding(u.limbs, n.lift);
      u.upper.position.y = n.lift * LIMB_LIFT;
    }
    n.mesh.position.y = n.h + (rolling ? 0 : Math.abs(Math.sin(gameTime * 2 + n.x)) * 0.04);
    if (u.inner.userData.spin) u.inner.rotation.y += dt * 9;
    blinkFace(u.face, gameTime);
    if (n.label) n.label.visible = Math.hypot(pos.x - n.x, pos.z - n.z) < 16;
  }
  // Küçük ayrıntılar: arada bir belli belirsiz parlar; büyüteçle yakındayken belirginleşir
  const lens = hasAbility('lens');
  for (const d of L.details) {
    if (d.humanOnly) d.mesh.visible = P.human && !save.notebook.includes(d.id);
    if (save.notebook.includes(d.id) || (d.humanOnly && !P.human)) { d.glint.material.opacity = 0; continue; }
    const near = lens && Math.hypot(pos.x - d.x, pos.z - d.z) < 9;
    d.glint.material.opacity = near ? 0.55 + Math.sin(gameTime * 4) * 0.25 : (gameTime + d.phase) % 7 < 0.3 ? 0.35 : 0;
  }
  for (const p of L.portals) {
    p.ring.rotation.z += dt * (p.locked ? 0.2 : 1.6);
    if (p.human) p.gate.visible = p.label.visible = P.human;
  }
  if (L.lamp) L.lamp.position.set(pos.x, pos.y + 1.2, pos.z);
  for (const ht of L.hearts) { fly(ht); ht.mesh.position.set(ht.x, ht.h + 0.9 + Math.sin(gameTime * 3 + ht.x) * 0.12, ht.z); }
  for (const gm of L.gems) { fly(gm); gm.mesh.rotation.y += dt * 2.5; gm.mesh.position.set(gm.x, gm.h + 0.7 + Math.sin(gameTime * 3 + gm.z) * 0.1, gm.z); }
  for (const pw of L.powerups) {
    fly(pw);
    pw.mesh.position.set(pw.x, pw.h + 0.95 + Math.sin(gameTime * 3 + pw.x) * 0.12, pw.z);
    pw.ring.position.set(pw.x, pw.h + 0.08, pw.z);
    pw.ring.rotation.z += dt * 2;
  }
  for (const g of Object.values(L.gates)) {
    if (g.open && g.mesh.position.y > g.base - WALL_H) {
      g.mesh.position.y -= dt * 1.6;
      if (Math.random() < 0.3) particles.emit(g.x, g.base + 0.1, g.z, 2, 0xbfae8f, 2, 0.5, 4, 0.5);
    }
  }
  for (const m of Object.values(L.mirrors)) {
    const target = m.ch === '/' ? Math.PI / 4 : -Math.PI / 4;
    m.mesh.rotation.y += (target - m.mesh.rotation.y) * Math.min(1, 10 * dt);
  }
  if (L.exit) {
    L.exit.ring.scale.setScalar(1 + Math.sin(gameTime * 4) * 0.05);
    const p = L.exit.parts.geometry.attributes.position;
    for (let k = 0; k < p.count; k++) {
      let y = p.getY(k) + dt * 1.2;
      if (y > 2) y = -3;
      p.setY(k, y);
    }
    p.needsUpdate = true;
  }
  // Çatlaklar birkaç saniye sonra solar
  for (let i = L.decals.length - 1; i >= 0; i--) {
    const d = L.decals[i];
    d.t += dt;
    if (d.t > 3.5) d.mesh.material.opacity = Math.max(0, 1 - (d.t - 3.5) / 1.5);
    if (d.t > 5) { L.group.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); L.decals.splice(i, 1); }
  }
  // Hız izi
  const speed = vel.length();
  if (state === 'play' && !P.human && speed > 5.5 && Math.random() < 0.7) {
    particles.emit(pos.x, pos.y, pos.z, 1, L.fx.speed > 0 ? 0xffd23b : 0x9fd8ff, 0.3, 0.45, 0, 0);
  }
  // Takipçi arkadaşlar
  const last = history[history.length - 1];
  if (!last || last.distanceToSquared(pos) > 0.04) { history.push(pos.clone()); if (history.length > 200) history.shift(); }
  L.followers.forEach((m, i) => {
    const hp = history[Math.max(0, history.length - 1 - (i + 1) * 14)];
    if (!hp) { m.position.set(pos.x, -50, pos.z); return; }
    m.position.lerp(new THREE.Vector3(hp.x, hp.y - R * 0.38, hp.z), Math.min(1, 10 * dt));
  });
  shieldMesh.visible = L.fx.shield > 0 && state !== 'idle';
  shieldMesh.position.copy(pos);
  shieldMesh.material.opacity = 0.22 + Math.sin(gameTime * 6) * 0.06;
  setRolling(state === 'play' && !P.human ? speed : 0, onGround);
}

// Büyük haritada gölgeler keskin kalsın diye güneş kamerası oyuncuyu izler
function followSun() {
  if (!L.def.hub) return;
  sun.target.position.set(pos.x, 0, pos.z);
  sun.position.set(pos.x - 28, 62, pos.z + 22);
  const sc = sun.shadow.camera;
  if (sc.right !== 42) {
    sc.left = sc.bottom = -42; sc.right = sc.top = 42; sc.near = 1; sc.far = 170;
    sc.updateProjectionMatrix();
  }
}

function updateCamera(dt) {
  followSun();
  const k = snapCam ? 1 : 1 - Math.exp(-(camMode === 0 ? 5 : 9) * dt);
  const fx = Math.sin(yaw), fz = -Math.cos(yaw);
  if (camMode === 0) {
    camLook.copy(pos);
    if (state === 'fall') camLook.y = 0;
    camTarget.lerp(camLook, k);
    camDesired.set(camTarget.x, camTarget.y + 15 * zoom, camTarget.z + 10 * zoom);
    camera.position.lerp(camDesired, k);
    camera.lookAt(camTarget);
  } else if (camMode === 1) {
    const baseY = (state === 'play' ? pos.y : R) + (P.human ? 0.95 : 0.5);
    const d = 5 * zoom;
    // Duvar arkasında kalmasın: arkadaki duvarların üstünü görecek kadar yükseğe çık
    let p = pitch;
    for (let t = 0.3; t < d; t += 0.25) {
      const r = Math.floor((pos.z - fz * t) / CELL), c = Math.floor((pos.x - fx * t) / CELL);
      const ch = L.grid[r]?.[c];
      if (ch === undefined) break;
      if (ch === '#' && !L.def.hub && !L.def.sky) p = Math.max(p, Math.atan2(L.wallTop[r][c] + 0.35 - baseY, t));
    }
    p = Math.min(p, 1.35);
    camDesired.set(pos.x - fx * d * Math.cos(p), baseY + d * Math.sin(p), pos.z - fz * d * Math.cos(p));
    camera.position.lerp(camDesired, k);
    camLook.set(pos.x + fx * 1.5, pos.y + 0.4, pos.z + fz * 1.5);
    camTarget.lerp(camLook, k);
    camera.lookAt(camTarget);
  } else {
    const eye = P.human ? 0.8 : 0.35;
    camera.position.set(pos.x, pos.y + eye, pos.z);
    camera.lookAt(pos.x + fx * Math.cos(fpPitch) * 5, pos.y + eye + Math.sin(fpPitch) * 5, pos.z + fz * Math.cos(fpPitch) * 5);
    camTarget.copy(pos);
  }
  if (shake > 0.001) {
    camera.position.x += (Math.random() - 0.5) * shake * 0.6;
    camera.position.y += (Math.random() - 0.5) * shake * 0.6;
    camera.position.z += (Math.random() - 0.5) * shake * 0.6;
    shake *= Math.exp(-8 * dt);
  }
  snapCam = false;
}

let lastT = performance.now();
let menuSpin = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastT) / 1000, 1 / 30);
  lastT = now;
  update(dt);
  particles.update(dt);
  if (L && state !== 'idle') {
    marbleMesh.position.copy(pos);
    const blink = L.inv > 0 && Math.floor(L.inv * 10) % 2 === 0;
    const visibleBody = camMode !== 2 && !blink && state !== 'done' && state !== 'spect';
    marbleMesh.visible = visibleBody && !P.human;
    faceMesh.visible = marbleMesh.visible;
    humanMesh.visible = visibleBody && P.human;
    if (humanMesh.visible) {
      humanMesh.position.set(pos.x, pos.y - R, pos.z);
      if (vel.length() > 0.4) {
        const dh = Math.atan2(vel.x, vel.y) - humanMesh.rotation.y;
        humanMesh.rotation.y += Math.atan2(Math.sin(dh), Math.cos(dh)) * Math.min(1, 14 * dt);
      }
      animateHuman(humanMesh, onGround ? vel.length() : 3, dt);
    }
    if (faceMesh.visible) {
      faceMesh.position.copy(pos);
      if (vel.length() > 0.6) {
        const want = Math.atan2(vel.x, vel.y);
        let dy = want - faceMesh.rotation.y;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        faceMesh.rotation.y += dy * Math.min(1, 10 * dt);
      }
      blinkFace(faceMesh, gameTime);
    }
    iceMesh.visible = P.frozen > 0 && state === 'play';
    iceMesh.position.copy(pos);
    updateCamera(dt);
    drawMinimap();
    $('clues').style.display = Object.keys(L.def.clues || {}).length || L.pads.length ? 'block' : 'none';
  } else {
    // Menü arka planı: misket yavaşça döner
    menuSpin += dt * 0.6;
    if (L) {
      const cxm = (L.W * CELL) / 2, czm = (L.H * CELL) / 2, rad = Math.max(L.W, L.H) * CELL * 0.75;
      camera.position.set(cxm + Math.cos(menuSpin * 0.3) * rad, rad * 0.7, czm + Math.sin(menuSpin * 0.3) * rad);
      camera.lookAt(cxm, 0, czm);
    }
  }
  if (save.settings.quality === 'high') composer.render(dt);
  else renderer.render(scene, camera);
}
requestAnimationFrame(frame);

// Otomatik testler için küçük kanca (oyuncuyu etkilemez)
window.__game = {
  get L() { return L; }, get state() { return state; }, get N() { return N; }, get modal() { return modal; }, pos, vel, P,
  useJoker, gainJoker, cycleTarget, startDash, advanceDialog, interact, toggleHuman, selectTool, attack, renderHotbar, openShop,
  get camMode() { return camMode; }, get yaw() { return yaw; }, set yaw(v) { yaw = v; }, get human() { return humanMesh; },
  teleport(r, c) { pos.set(cx(c), groundAt(cx(c), cx(r)) + R, cx(r)); vel.set(0, 0); vy = 0; onGround = true; },
};

// Menü arka planı için bir labirenti sadece göster
export function showBackdrop(def) {
  run = { def, friends: [] };
  buildLevel(def);
  state = 'idle';
  $('clues').style.display = 'none';
  const f = $('fade'); f.style.transition = 'opacity .8s'; f.style.opacity = 0;
}
