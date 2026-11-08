// Karakterler: gözlü misketler, şapkalar, kasabalılar ve labirentlerdeki küçük ayrıntı nesneleri.
import * as THREE from 'three';
import { MARBLE_R as R } from './marble.js';

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...extra });

// Yuvarlanmayan göz grubu: misketin üstünde durur, gittiği yöne bakar (+z ön)
export function makeFace(radius = R) {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.3, 14, 10), white);
    eye.position.set(side * radius * 0.36, radius * 0.38, radius * 0.8);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.15, 10, 8), black);
    pupil.position.set(0, 0, radius * 0.2);
    eye.add(pupil);
    g.add(eye);
    eyes.push(eye);
  }
  g.userData.eyes = eyes;
  return g;
}

// Ara sıra göz kırpma
export function blinkFace(face, t) {
  const closed = (t + face.id * 0.7) % 4 < 0.12;
  for (const e of face.userData.eyes) e.scale.y = closed ? 0.12 : 1;
}

function addHat(g, kind, r) {
  if (kind === 'top') {
    const m = std(0x1d1d27);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r * 0.72, r * 0.07, 24), m);
    brim.position.y = r * 0.93;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, r * 0.65, 24), m);
    crown.position.y = r * 1.28;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.46, r * 0.46, r * 0.12, 24), std(0xc1272d));
    band.position.y = r * 1.03;
    g.add(brim, crown, band);
  } else if (kind === 'bow') {
    const m = std(0xfff0f6);
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(r * 0.2, r * 0.4, 10), m);
      wing.rotation.z = side * Math.PI / 2;
      wing.position.set(side * r * 0.2, r * 1.0, 0);
      g.add(wing);
    }
  } else if (kind === 'antenna') {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.03, r * 0.03, r * 0.5), std(0x3cb43c));
    stalk.position.y = r * 1.2;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(r * 0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffff66 }));
    bulb.position.y = r * 1.5;
    g.add(stalk, bulb);
  }
}

// Bilyelerin kolları ve bacakları: dururken görünür, yuvarlanırken kaybolur
export const LIMB_LIFT = 0.24;
export function makeLimbs(r, color) {
  const g = new THREE.Group();
  const m = std(new THREE.Color(color).multiplyScalar(0.55));
  const foot = std(0x2b2b33);
  const legs = [], arms = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.09, r * 0.09, LIMB_LIFT + r * 0.3), m);
    leg.position.set(side * r * 0.36, (LIMB_LIFT + r * 0.3) / 2, 0);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(r * 0.3, r * 0.14, r * 0.45), foot);
    shoe.position.set(side * r * 0.36, r * 0.07, r * 0.1);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.07, r * 0.07, r * 0.75), m);
    arm.position.set(side * r * 1.08, LIMB_LIFT + r, 0);
    arm.rotation.z = side * 0.5;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(r * 0.13, 10, 8), std(0xffffff));
    hand.position.set(side * r * 1.27, LIMB_LIFT + r * 0.68, 0);
    g.add(leg, shoe, arm, hand);
    legs.push(leg); arms.push(arm);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// k: 1 tam ayakta, 0 yuvarlanıyor. Kol ve bacaklar sıfıra küçülüp kaybolur.
export function setStanding(limbs, k) {
  limbs.visible = k > 0.02;
  limbs.scale.setScalar(Math.max(0.01, k));
}

// Kasabalı bir karakter (y=0 zeminde). spec: CAST içindeki kayıt.
export function makeCharacter(spec, envMap) {
  const g = new THREE.Group();
  const r = R * (spec.scale || 1);
  const skin = new THREE.MeshPhysicalMaterial({ color: spec.color, roughness: 0.22, clearcoat: 0.7, envMap, envMapIntensity: 0.45 });
  const upper = new THREE.Group();   // gövde, yüz ve şapka; ayakta dururken bacakların üstüne çıkar
  const inner = new THREE.Group();
  if (spec.body === 'top') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18), skin);
    body.position.y = r * 1.15;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, r * 0.75, 18), skin);
    tip.rotation.x = Math.PI;
    tip.position.y = r * 0.35;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.1, r * 0.1, r * 0.55, 10), std(0xffd166));
    stem.position.y = r * 2.3;
    inner.add(body, tip, stem);
    inner.userData.spin = true;
  } else if (spec.body === 'button') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 0.42, 28), skin);
    body.rotation.x = Math.PI / 2;
    body.position.y = r;
    inner.add(body);
    const holeMat = std(0x7a3a58);
    for (const [hx, hy] of [[-0.25, 0.25], [0.25, 0.25], [-0.25, -0.25], [0.25, -0.25]]) {
      const hole = new THREE.Mesh(new THREE.CircleGeometry(r * 0.09, 12), holeMat);
      hole.position.set(hx * r, r + hy * r, r * 0.22);
      upper.add(hole);
    }
  } else {
    // Gövde merkezde durur ki yuvarlanırken kendi ekseninde dönsün
    inner.add(new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18), skin));
    inner.position.y = r;
    inner.userData.roll = true;
  }
  upper.add(inner);
  const face = makeFace(r);
  face.position.y = spec.body === 'top' ? r * 1.15 : r;
  upper.add(face);
  const hatHolder = new THREE.Group();
  hatHolder.position.y = spec.body === 'top' ? r * 1.15 : r;
  if (spec.hat) addHat(hatHolder, spec.hat, r);
  upper.add(hatHolder);
  g.add(upper);
  let limbs = null;
  if (!spec.body) {
    // Yalnızca bilyelerin vücudu var; topaç ve düğme kendi biçimindedir
    limbs = makeLimbs(r, spec.color);
    g.add(limbs);
    upper.position.y = LIMB_LIFT;
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData = { face, inner, upper, limbs, height: (spec.body === 'top' ? r * 3 : r * 2.4) + LIMB_LIFT };
  return g;
}

// Lanetli insan formu: tek renk, parlak, kauçuk gibi uzun kollu bacaklı bir beden; başı ise
// hâlâ cam bir misket. Sırtında dönen kurma anahtarı var. Ayakları y=0'dadır, +z önüdür.
function taper(top, bottom, len, mat) {
  // Eklem yerleri yuvarlak, ucu ince uzuv
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, len, 14), mat);
  shaft.position.y = -len / 2;
  const a = new THREE.Mesh(new THREE.SphereGeometry(top, 14, 10), mat);
  const b = new THREE.Mesh(new THREE.SphereGeometry(bottom, 14, 10), mat);
  b.position.y = -len;
  g.add(shaft, a, b);
  return g;
}

export function makeHuman(color = 0x1f8fe0) {
  const g = new THREE.Group();
  const rubber = new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.25 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xd9a93c, metalness: 0.95, roughness: 0.28 });
  const joint = (x, y) => { const p = new THREE.Group(); p.position.set(x, y, 0); g.add(p); return p; };

  const legL = joint(-0.13, 0.82), legR = joint(0.13, 0.82), armL = joint(-0.27, 1.34), armR = joint(0.27, 1.34);
  for (const leg of [legL, legR]) {
    const thigh = taper(0.1, 0.07, 0.4, rubber);
    const knee = new THREE.Group(); knee.position.y = -0.4;
    knee.add(taper(0.07, 0.055, 0.34, rubber));
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), rubber);
    foot.scale.set(1, 0.55, 1.75); foot.position.set(0, -0.36, 0.07);
    knee.add(foot);
    leg.add(thigh, knee);
    leg.userData.knee = knee;
  }
  const hands = [];
  for (const [arm, side] of [[armL, -1], [armR, 1]]) {
    arm.rotation.z = side * 0.2;
    arm.add(taper(0.075, 0.05, 0.38, rubber));
    const elbow = new THREE.Group(); elbow.position.y = -0.38;
    elbow.add(taper(0.05, 0.04, 0.34, rubber));
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), rubber);
    palm.position.y = -0.38; palm.scale.set(0.9, 1.1, 0.7);
    elbow.add(palm);
    arm.add(elbow);
    arm.userData.elbow = elbow;
    hands.push(palm);
  }
  // Armut gövde: omuzdan bele daralır
  const profile = [[0.001, 0.72], [0.15, 0.76], [0.17, 0.86], [0.145, 1.0], [0.165, 1.2], [0.25, 1.33], [0.23, 1.42], [0.09, 1.47], [0.001, 1.48]].map(([x, y]) => new THREE.Vector2(x, y));
  const torso = new THREE.Mesh(new THREE.LatheGeometry(new THREE.SplineCurve(profile).getPoints(24), 22), rubber);
  torso.scale.z = 0.72;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.12, 12), rubber); neck.position.y = 1.5;
  g.add(torso, neck);
  // Baş: içinde renk girdabı olan cam misket
  const head = new THREE.Group(); head.position.y = 1.72; g.add(head);
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const q = c.getContext('2d');
  q.fillStyle = '#' + new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.55).getHexString(); q.fillRect(0, 0, 256, 128);
  ['#e63946', '#ffb703', '#2a9d8f', '#ffffff'].forEach((col, i) => {
    q.strokeStyle = col; q.lineWidth = 9; q.beginPath();
    for (let x = 0; x <= 256; x += 6) { const y = 64 + Math.sin(x / 256 * 12.56 + i * 1.6) * (18 + i * 7); x ? q.lineTo(x, y) : q.moveTo(x, y); }
    q.stroke();
  });
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.235, 28, 20), new THREE.MeshPhysicalMaterial({ map: tx, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.05 })));
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }), dark = new THREE.MeshStandardMaterial({ color: 0x0c0c12, roughness: 0.1 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), white); eye.position.set(side * 0.09, 0.03, 0.195);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), dark); iris.position.set(side * 0.09, 0.03, 0.25);
    head.add(eye, iris);
  }
  // Kurma anahtarı
  const key = new THREE.Group(); key.position.set(0, 1.2, -0.17);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 8), brass); shaft.rotation.x = Math.PI / 2;
  key.add(shaft);
  for (const side of [-1, 1]) {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 16), brass); loop.position.set(side * 0.075, 0, -0.08);
    key.add(loop);
  }
  g.add(key);
  // Elde taşınan eşya sağ elin altına takılır
  const held = new THREE.Group(); held.position.y = -0.4;
  armR.userData.elbow.add(held);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData = { legL, legR, armL, armR, phase: 0, key, head, held, heldKind: null, swing: 0 };
  return g;
}

export function setHeld(h, kind) {
  const u = h.userData;
  if (u.heldKind === kind) return;
  u.heldKind = kind;
  u.held.clear();
  const steel = new THREE.MeshStandardMaterial({ color: 0xd8dde6, metalness: 0.9, roughness: 0.25 });
  const wood = std(0x6b4226);
  if (kind === 'kilic' || kind === 'celik') {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.82, 0.018), kind === 'celik' ? steel : std(0xb08d57));
    blade.position.set(0, 0, 0.5); blade.rotation.x = Math.PI / 2;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.05), wood); guard.position.z = 0.09;
    u.held.add(blade, guard);
  } else if (kind === 'fener') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffc25a, emissiveIntensity: 2.4 }));
    body.position.y = -0.18;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.08, 8), std(0x2b2b33)); cap.position.y = -0.04;
    u.held.add(body, cap);
  } else if (kind === 'kanca') {
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 8, 18, 4.4), steel); hook.position.set(0, -0.06, 0.1);
    u.held.add(hook);
  }
}

// Yürüyüş: bacaklar ve kollar hıza göre sallanır
export function animateHuman(h, speed, dt) {
  const u = h.userData;
  u.phase += speed * dt * 2.2;
  const swing = Math.sin(u.phase) * Math.min(0.95, speed * 0.17);
  u.legL.rotation.x = swing; u.legR.rotation.x = -swing;
  // Dizler adım atarken bükülür
  u.legL.userData.knee.rotation.x = Math.max(0, -Math.sin(u.phase - 0.8)) * Math.min(1.1, speed * 0.2);
  u.legR.userData.knee.rotation.x = Math.max(0, Math.sin(u.phase - 0.8)) * Math.min(1.1, speed * 0.2);
  u.armL.rotation.x = -swing * 0.9;
  u.armL.userData.elbow.rotation.x = -0.35;
  u.armR.userData.elbow.rotation.x = -0.35;
  if (u.swing > 0) {
    // Kılıç savurma
    u.swing = Math.max(0, u.swing - dt);
    u.armR.rotation.x = -2.5 * Math.sin((u.swing / 0.3) * Math.PI);
  } else u.armR.rotation.x = u.heldKind ? -0.75 : swing * 0.9;
  u.key.rotation.z += dt * (1.5 + speed);
  u.head.position.y = 1.72 + Math.abs(Math.sin(u.phase)) * 0.014 * Math.min(speed, 6);
}

// Gece yaratıkları (y=0 zeminde, +z önü)
export function makeMonster(kind) {
  const g = new THREE.Group();
  const eyeMat = new THREE.MeshBasicMaterial({ color: kind === 'saatci' ? 0xff3322 : 0xfff2a8 });
  const eyes = (y, z, gap, r) => { for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), eyeMat); e.position.set(s * gap, y, z); g.add(e); } };
  if (kind === 'oyuncak') {
    // Kırık bebek: solgun, büyük başlı, boynu eğri
    const skin = new THREE.MeshPhysicalMaterial({ color: 0xd8cfc2, roughness: 0.3, clearcoat: 0.6 });
    const dress = std(0x5c2a3a);
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 12), dress); body.position.y = 0.42;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 14), skin); head.position.set(0.08, 0.98, 0); head.rotation.z = -0.5;
    const crack = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.26, 0.02), std(0x1a1414)); crack.position.set(0.17, 1.03, 0.22); crack.rotation.z = 0.5;
    g.add(body, head, crack);
    for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.55), skin); arm.position.set(s * 0.26, 0.55, 0.1); arm.rotation.x = -1.1; g.add(arm); }
    eyes(1.0, 0.25, 0.1, 0.045);
    g.position.y = 0;
  } else if (kind === 'korkuluk') {
    // Çuval başlı korkuluk
    const wood = std(0x4a3320), sack = std(0x8f7a55), coat = std(0x2a2f24);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.2), wood); pole.position.y = 1.1;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8), wood); bar.position.y = 1.6; bar.rotation.z = Math.PI / 2;
    const torso = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.2, 8, 1, true), coat); torso.position.y = 1.15; torso.material.side = THREE.DoubleSide;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), sack); head.position.y = 2.15; head.scale.y = 1.15;
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.5, 10), std(0x1b1b14)); hat.position.y = 2.6; hat.rotation.z = 0.18;
    g.add(pole, bar, torso, head, hat);
    eyes(2.2, 0.27, 0.11, 0.05);
  } else {
    // Saatçi: çok uzun, ince, başının yerinde saat kadranı
    const coat = std(0x12100f, { roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.55, 2.6, 10), coat); body.position.y = 1.3;
    const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), coat); shoulders.position.y = 2.62; shoulders.scale.set(1.3, 0.6, 0.8);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.4), coat); neck.position.y = 2.9;
    g.add(body, shoulders, neck);
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 2.1), coat); arm.position.set(s * 0.46, 1.62, 0.1); arm.rotation.z = s * 0.14;
      g.add(arm);
      for (let i = -1; i <= 1; i++) { const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.006, 0.34), coat); fin.position.set(s * 0.6 + i * 0.03, 0.46, 0.1); g.add(fin); }
    }
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const q = c.getContext('2d');
    q.fillStyle = '#d9d0b6'; q.beginPath(); q.arc(64, 64, 62, 0, 7); q.fill();
    q.strokeStyle = '#1a1412'; q.lineWidth = 5; q.stroke();
    q.fillStyle = '#1a1412';
    for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; q.fillRect(62 + Math.sin(a) * 50, 58 - Math.cos(a) * 50, 4, 9); }
    q.lineWidth = 6; q.beginPath(); q.moveTo(64, 64); q.lineTo(64 + Math.sin(1.7) * 30, 64 - Math.cos(1.7) * 30); q.stroke();
    q.lineWidth = 4; q.beginPath(); q.moveTo(64, 64); q.lineTo(64 + 46, 64); q.stroke();
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    const faceDisc = new THREE.Mesh(new THREE.CircleGeometry(0.42, 28), new THREE.MeshBasicMaterial({ map: tx }));
    faceDisc.position.set(0, 3.32, 0.08);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.14, 28), std(0x6b5a2e, { metalness: 0.8 }));
    rim.rotation.x = Math.PI / 2; rim.position.y = 3.32;
    g.add(rim, faceDisc);
    eyes(3.32, 0.11, 0.13, 0.035);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// Oyuncunun fark etmesi gereken küçücük nesneler. Parlaklık bilerek düşük.
export function makeDetail(kind) {
  const g = new THREE.Group();
  const add = (geo, mat, y = 0.04) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; g.add(m); return m; };
  if (kind === 'track') {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.8), new THREE.MeshStandardMaterial({ color: 0x3b2c1c, transparent: true, opacity: 0.45, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.012;
    g.add(m);
  } else if (kind === 'cloth') {
    const m = add(new THREE.BoxGeometry(0.3, 0.02, 0.26), std(0xfdf0f4), 0.02);
    m.rotation.y = 0.5;
  } else if (kind === 'button') {
    add(new THREE.CylinderGeometry(0.11, 0.11, 0.035, 14), std(0xe88fb8), 0.02);
  } else if (kind === 'glass') {
    const m = add(new THREE.TetrahedronGeometry(0.15), new THREE.MeshStandardMaterial({ color: 0x665c4a, roughness: 0.15, metalness: 0.4 }), 0.1);
    m.rotation.set(0.5, 0.3, 0.2);
  } else if (kind === 'paper') {
    const m = add(new THREE.PlaneGeometry(0.34, 0.26), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, side: THREE.DoubleSide }), 0.03);
    m.rotation.set(-Math.PI / 2, 0, 0.3);
  } else if (kind === 'watch') {
    add(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 16), std(0xc8a24a, { metalness: 0.8 }), 0.02);
  } else if (kind === 'plaque') {
    add(new THREE.BoxGeometry(0.24, 0.16, 0.03), std(0xb8923c, { metalness: 0.7 }), 0.5);
  } else if (kind === 'lantern') {
    add(new THREE.CylinderGeometry(0.2, 0.26, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0xffd98a, emissive: 0x6b4a10, emissiveIntensity: 0.6 }), 0.3);
    add(new THREE.ConeGeometry(0.26, 0.2, 8), std(0x2b2b33), 0.65);
  } else {
    add(new THREE.BoxGeometry(0.2, 0.05, 0.1), std(0x9a8a60), 0.03);
  }
  return g;
}
