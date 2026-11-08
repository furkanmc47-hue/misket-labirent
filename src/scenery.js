// Dünya görünümü: gökyüzü, arazi, dağlar, çim, patikalar, binalar ve ışınlanma kapıları.
// Yalnızca görüntüdür; çarpışmalar hâlâ hücre haritasından gelir.
import * as THREE from 'three';
import { CELL } from './maplogic.js';

const cx = c => c * CELL + CELL / 2;

// Sabit tohumlu değer gürültüsü
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), u = x - xi, v = y - yi;
  const f = t => t * t * (3 - 2 * t);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * f(u) + (c - a) * f(v) + (a - b - c + d) * f(u) * f(v);
}
function fbm(x, y, n = 4) { let s = 0, a = 0.5, k = 1; for (let i = 0; i < n; i++) { s += a * noise(x * k, y * k); a *= 0.5; k *= 2.03; } return s; }

// Paylaşılan dokular labirent değişince silinmez (disposeTree userData.shared'e bakar)
const cache = {};
function sharedTex(name, size, draw, repeat = 1) {
  if (cache[name]) return cache[name];
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  t.userData.shared = true;
  return (cache[name] = t);
}
function speckle(g, s, n, colors, min, max) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    const r = min + Math.random() * (max - min);
    g.beginPath(); g.arc(Math.random() * s, Math.random() * s, r, 0, 7); g.fill();
  }
}
export const textures = {
  grass: () => sharedTex('grass', 512, (g, s) => {
    g.fillStyle = '#6fa64a'; g.fillRect(0, 0, s, s);
    speckle(g, s, 500, ['rgba(90,145,55,.35)', 'rgba(130,180,75,.3)', 'rgba(70,120,50,.3)'], 8, 34);
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      g.strokeStyle = ['#5c9440', '#7fb757', '#4e8438', '#94c566'][i % 4];
      g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 5, y - 4 - Math.random() * 7); g.stroke();
    }
  }),
  rock: () => sharedTex('rock', 512, (g, s) => {
    g.fillStyle = '#8a8378'; g.fillRect(0, 0, s, s);
    speckle(g, s, 900, ['rgba(60,55,50,.25)', 'rgba(170,165,150,.25)', 'rgba(100,92,80,.3)'], 3, 26);
    g.strokeStyle = 'rgba(40,36,32,.5)'; g.lineWidth = 2;
    for (let i = 0; i < 26; i++) {
      let x = Math.random() * s, y = Math.random() * s;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 60; y += Math.random() * 30; g.lineTo(x, y); }
      g.stroke();
    }
  }),
  brick: () => sharedTex('brick', 512, (g, s) => {
    g.fillStyle = '#6f6a63'; g.fillRect(0, 0, s, s);
    const rows = 8, h = s / rows, w = s / 4;
    for (let r = 0; r < rows; r++) for (let c = -1; c < 5; c++) {
      const v = 190 + Math.random() * 55;
      g.fillStyle = `rgb(${v},${v * 0.97},${v * 0.92})`;
      g.fillRect(c * w + (r % 2) * w / 2 + 2, r * h + 2, w - 4, h - 4);
    }
    speckle(g, s, 500, ['rgba(40,35,30,.14)', 'rgba(255,255,255,.08)'], 2, 11);
  }),
  tile: () => sharedTex('tile', 512, (g, s) => {
    g.fillStyle = '#d9d5cc'; g.fillRect(0, 0, s, s);
    speckle(g, s, 1100, ['rgba(70,65,55,.1)', 'rgba(255,255,255,.14)', 'rgba(120,110,95,.13)'], 2, 22);
    g.strokeStyle = 'rgba(40,36,30,.55)'; g.lineWidth = 7; g.strokeRect(0, 0, s, s);
    g.strokeStyle = 'rgba(40,36,30,.22)'; g.lineWidth = 2;
    for (let i = 0; i < 7; i++) { let x = Math.random() * s, y = Math.random() * s; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (Math.random() - 0.5) * 70; y += (Math.random() - 0.5) * 70; g.lineTo(x, y); } g.stroke(); }
  }),
  plaster: () => sharedTex('plaster', 256, (g, s) => {
    g.fillStyle = '#efefe9'; g.fillRect(0, 0, s, s);
    speckle(g, s, 500, ['rgba(120,110,95,.07)', 'rgba(255,255,255,.2)'], 1, 12);
  }),
  shingle: () => sharedTex('shingle', 256, (g, s) => {
    g.fillStyle = '#7d7d7d'; g.fillRect(0, 0, s, s);
    const rows = 8, h = s / rows, w = s / 6;
    for (let r = 0; r < rows; r++) for (let c = -1; c < 7; c++) {
      const v = 175 + Math.random() * 70;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(c * w + (r % 2) * w / 2 + 1, r * h + 1, w - 2, h - 2);
    }
  }),
  wood: () => sharedTex('wood', 256, (g, s) => {
    g.fillStyle = '#8a5f38'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(${50 + Math.random() * 40},${30 + Math.random() * 25},15,.35)`; g.lineWidth = 1 + Math.random() * 2; const y = Math.random() * s; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(s * 0.3, y + 5, s * 0.6, y - 5, s, y); g.stroke(); }
  }),
  bark: () => sharedTex('bark', 128, (g, s) => {
    g.fillStyle = '#5e4128'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 70; i++) { g.strokeStyle = i % 2 ? 'rgba(30,20,10,.55)' : 'rgba(130,100,70,.3)'; g.lineWidth = 2; const x = Math.random() * s; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (Math.random() - 0.5) * 12, s); g.stroke(); }
  }),
  leaves: () => sharedTex('leaves', 256, (g, s) => {
    g.fillStyle = '#b9c9a8'; g.fillRect(0, 0, s, s);
    speckle(g, s, 1500, ['rgba(255,255,255,.3)', 'rgba(40,60,30,.28)', 'rgba(110,130,90,.3)'], 2, 7);
  }),
  dirt: () => sharedTex('dirt', 256, (g, s) => {
    const noiseFill = g.createImageData(s, s);
    for (let i = 0; i < s; i++) for (let k = 0; k < s; k++) {
      // Yanlara doğru saydamlaşan patika şeridi (u: enine)
      const edge = Math.min(1, Math.min(k, s - k) / (s * 0.24));
      const v = 0.8 + Math.random() * 0.28, p = (i * s + k) * 4;
      noiseFill.data[p] = 168 * v; noiseFill.data[p + 1] = 134 * v; noiseFill.data[p + 2] = 92 * v;
      noiseFill.data[p + 3] = 255 * edge * (0.75 + Math.random() * 0.25);
    }
    g.putImageData(noiseFill, 0, 0);
  }),
};

// ------------------------------------------------------------------
// Gökyüzü ve bulutlar
// ------------------------------------------------------------------
export function makeSky(bottom, cx0, cz0, radius = 460) {
  const top = new THREE.Color(bottom).lerp(new THREE.Color(0x2f77c9), 0.72);
  const geo = new THREE.SphereGeometry(radius, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: top }, bottom: { value: new THREE.Color(bottom) }, sun: { value: new THREE.Vector3(-0.35, 0.8, 0.3).normalize() } },
    vertexShader: 'varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform vec3 sun; varying vec3 d;
      void main(){ float h = clamp(d.y * 1.6 + 0.08, 0.0, 1.0); vec3 c = mix(bottom, top, pow(h, 0.7));
      float s = max(dot(normalize(d), sun), 0.0); c += vec3(1.0,0.92,0.75) * (pow(s, 600.0) * 1.5 + pow(s, 24.0) * 0.14);
      gl_FragColor = vec4(c, 1.0); }`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(cx0, 0, cz0);
  m.frustumCulled = false;
  m.renderOrder = -10;
  return m;
}

export function makeClouds(group, tickers, midX, midZ) {
  const tex = sharedTex('cloud', 256, (g, s) => {
    g.clearRect(0, 0, s, s);
    for (let i = 0; i < 26; i++) {
      const x = s * (0.18 + Math.random() * 0.64), y = s * (0.4 + Math.random() * 0.22), r = s * (0.07 + Math.random() * 0.13);
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(255,255,255,.75)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
  });
  const clouds = [];
  for (let i = 0; i < 16; i++) {
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85, fog: false, depthWrite: false }));
    const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 240, sc = 50 + Math.random() * 70;
    spr.scale.set(sc, sc * 0.5, 1);
    spr.position.set(midX + Math.cos(a) * d, 55 + Math.random() * 45, midZ + Math.sin(a) * d);
    group.add(spr);
    clouds.push(spr);
  }
  tickers.push(dt => { for (const c of clouds) { c.position.x += dt * 1.1; if (c.position.x > midX + 340) c.position.x = midX - 340; } });
}

// ------------------------------------------------------------------
// Harita çevresindeki doğal arazi: düzlükten tepelere, dağlara uzanır
// ------------------------------------------------------------------
export function makeTerrain(group, th, mw, mh, { mountains = true } = {}) {
  const S = 860, N = 190;
  const geo = new THREE.PlaneGeometry(S, S, N, N);
  geo.rotateX(-Math.PI / 2);
  const midX = mw / 2, midZ = mh / 2;
  geo.translate(midX, 0, midZ);
  const p = geo.attributes.position, col = new Float32Array(p.count * 3);
  const low = new THREE.Color(th.floor1).multiplyScalar(0.72), mid = new THREE.Color(th.wall), rock = new THREE.Color(0x7c776e), snow = new THREE.Color(0xf4f6f8), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const dx = Math.max(0, -x, x - mw), dz = Math.max(0, -z, z - mh), d = Math.hypot(dx, dz);
    let h = -0.08;
    if (d > 2) {
      const ramp = Math.min(1, (d - 2) / 60);
      h = ramp * ramp * 16 * fbm(x * 0.022, z * 0.022) + ramp * 3 * fbm(x * 0.09, z * 0.09);
      if (mountains && d > 70) h += Math.pow(Math.min(1, (d - 70) / 170), 1.5) * 125 * fbm(x * 0.009 + 7, z * 0.009 + 3, 5);
    }
    p.setY(i, h);
    if (h > 62) c.copy(rock).lerp(snow, Math.min(1, (h - 62) / 12));
    else if (h > 30) c.copy(mid).lerp(rock, Math.min(1, (h - 30) / 24));
    else c.copy(low).lerp(mid, Math.min(1, h / 22));
    c.multiplyScalar(0.92 + hash(i, 3) * 0.14);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo.toNonIndexed(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }));
  m.receiveShadow = true;
  group.add(m);
  return (x, z) => {
    const dx = Math.max(0, -x, x - mw), dz = Math.max(0, -z, z - mh), d = Math.hypot(dx, dz);
    if (d <= 2) return 0;
    const ramp = Math.min(1, (d - 2) / 60);
    return ramp * ramp * 16 * fbm(x * 0.022, z * 0.022) + ramp * 3 * fbm(x * 0.09, z * 0.09);
  };
}

// Harita dışındaki orman: tek çizimde yüzlerce çam
export function makeForest(group, mw, mh, heightFn, count = 420) {
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 2, 6);
  const crownGeo = new THREE.ConeGeometry(1.6, 4.6, 8);
  crownGeo.translate(0, 2.1, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ map: textures.bark(), roughness: 1 }), count);
  const crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ map: textures.leaves(), roughness: 0.95, flatShading: true }), count);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color();
  let n = 0;
  for (let i = 0; i < count * 5 && n < count; i++) {
    const x = -70 + Math.random() * (mw + 140), z = -70 + Math.random() * (mh + 140);
    if (x > -1.5 && x < mw + 1.5 && z > -1.5 && z < mh + 1.5) continue;
    const sc = 0.9 + Math.random() * 1.1, y = heightFn(x, z);
    q.setFromAxisAngle(v.set(0, 1, 0), Math.random() * 6.28);
    m4.compose(v.set(x, y + sc, z), q, s.set(sc, sc, sc));
    trunks.setMatrixAt(n, m4);
    m4.compose(v.set(x, y + sc * 2.4, z), q, s.set(sc, sc, sc));
    crowns.setMatrixAt(n, m4);
    crowns.setColorAt(n, col.setHSL(0.3 + Math.random() * 0.05, 0.42, 0.26 + Math.random() * 0.1));
    n++;
  }
  trunks.count = crowns.count = n;
  crowns.castShadow = true;
  group.add(trunks, crowns);
}

// ------------------------------------------------------------------
// Kasaba zemini: çim, patikalar, çim öbekleri, çiçekler, taşlar
// ------------------------------------------------------------------
export function makeHubGround(group, def, solid, dense) {
  const H = def.grid.length, W = def.grid[0].length, mw = W * CELL, mh = H * CELL;
  const N = 110, geo = new THREE.PlaneGeometry(mw + 4, mh + 4, N, Math.round(N * mh / mw));
  geo.rotateX(-Math.PI / 2);
  geo.translate(mw / 2, 0, mh / 2);
  const p = geo.attributes.position, uv = geo.attributes.uv, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    uv.setXY(i, x / 7, z / 7);
    // Büyük ölçekli renk değişimi tekrar eden dokuyu gizler
    const n = fbm(x * 0.05, z * 0.05);
    c.setRGB(0.82 + n * 0.42, 0.9 + n * 0.3, 0.72 + n * 0.3);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: textures.grass(), vertexColors: true, roughness: 0.98 }));
  ground.receiveShadow = true;
  group.add(ground);

  // Patikalar
  const dirt = new THREE.MeshStandardMaterial({ map: textures.dirt(), transparent: true, roughness: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const path of def.paths || []) {
    for (let i = 0; i < path.length - 1; i++) {
      const [r0, c0] = path[i], [r1, c1] = path[i + 1];
      const x0 = cx(c0), z0 = cx(r0), x1 = cx(c1), z1 = cx(r1), len = Math.hypot(x1 - x0, z1 - z0);
      const seg = new THREE.PlaneGeometry(2.8, len + 2.8);
      const suv = seg.attributes.uv;
      for (let k = 0; k < suv.count; k++) suv.setY(k, suv.getY(k) * (len + 2.8) / 2.8);
      seg.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(seg, dirt);
      m.position.set((x0 + x1) / 2, 0.025 + i * 0.0006, (z0 + z1) / 2);
      m.rotation.y = Math.atan2(x1 - x0, z1 - z0);
      m.receiveShadow = true;
      group.add(m);
    }
  }

  // Çim öbekleri ve çiçekler (tek çizim)
  const blade = new THREE.BufferGeometry();
  const bladePos = [], bladeNor = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * 6.28 + i, lean = 0.05 + (i % 3) * 0.05, h = 0.2 + (i % 2) * 0.09, w = 0.035;
    const ox = Math.cos(a) * 0.09, oz = Math.sin(a) * 0.09, tx = -Math.sin(a) * w, tz = Math.cos(a) * w;
    bladePos.push(ox - tx, 0, oz - tz, ox + tx, 0, oz + tz, ox + Math.cos(a) * lean, h, oz + Math.sin(a) * lean);
    for (let k = 0; k < 3; k++) bladeNor.push(0, 1, 0);   // zeminle aynı ışığı alsın
  }
  blade.setAttribute('position', new THREE.Float32BufferAttribute(bladePos, 3));
  blade.setAttribute('normal', new THREE.Float32BufferAttribute(bladeNor, 3));
  const count = dense ? 9000 : 2200;
  const grass = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide }), count);
  const petals = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshStandardMaterial({ roughness: 0.7 }), 420);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
  const onPath = (x, z) => (def.paths || []).some(path => path.some((pt, i) => {
    if (i === path.length - 1) return false;
    const ax = cx(pt[1]), az = cx(pt[0]), bx = cx(path[i + 1][1]), bz = cx(path[i + 1][0]);
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(x - ax - dx * t, z - az - dz * t) < 1.6;
  }));
  let g = 0, f = 0;
  const palette = [0xff8fab, 0xffd166, 0xffffff, 0xb388ff, 0xff7b54];
  for (let i = 0; i < count * 2 && g < count; i++) {
    const x = Math.random() * mw, z = Math.random() * mh, r = Math.floor(z / CELL), k = Math.floor(x / CELL);
    if (solid(r, k) || def.heights?.[r]?.[k] !== '0' || onPath(x, z)) continue;
    e.set(0, Math.random() * 6.28, 0);
    const sc = 0.8 + Math.random() * 1.1;
    m4.compose(v.set(x, 0, z), q.setFromEuler(e), s.set(sc, sc, sc));
    grass.setMatrixAt(g, m4);
    grass.setColorAt(g, c.setHSL(0.25 + Math.random() * 0.05, 0.48, 0.28 + Math.random() * 0.12));
    g++;
    if (f < 420 && fbm(x * 0.12, z * 0.12) > 0.56 && Math.random() < 0.3) {
      m4.compose(v.set(x, 0.36, z), q.identity(), s.setScalar(1));
      petals.setMatrixAt(f, m4);
      petals.setColorAt(f, c.set(palette[f % palette.length]));
      f++;
    }
  }
  grass.count = g; petals.count = f;
  group.add(grass, petals);
}

// ------------------------------------------------------------------
// Tek tek süs nesneleri
// ------------------------------------------------------------------
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
function shadowed(o) { o.traverse(n => { if (n.isMesh) n.castShadow = n.receiveShadow = true; }); return o; }
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; }

function blobGeometry(rx, rz, seed) {
  const pts = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2, k = 0.86 + noise(Math.cos(a) * 1.7 + seed, Math.sin(a) * 1.7) * 0.28;
    pts.push(new THREE.Vector2(Math.cos(a) * rx * k, Math.sin(a) * rz * k));
  }
  const g = new THREE.ShapeGeometry(new THREE.Shape(pts));
  g.rotateX(-Math.PI / 2);
  return g;
}

function makeTree(d) {
  const g = new THREE.Group(), sc = d.scale || 1;
  const trunk = mesh(new THREE.CylinderGeometry(0.17 * sc, 0.32 * sc, 2 * sc, 8), new THREE.MeshStandardMaterial({ map: textures.bark(), roughness: 1 }), 0, sc, 0);
  g.add(trunk);
  const leaf = new THREE.MeshStandardMaterial({ map: textures.leaves(), color: d.color ?? 0x5ea24a, roughness: 0.9 });
  const seed = (d.at[0] * 13 + d.at[1] * 7) % 11;
  // Yuvarlak, öbek öbek taç
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05 + seed, rr = i === 0 ? 0 : 0.75 * sc, s = (i === 0 ? 1.28 : 0.9) * sc;
    const geo = new THREE.IcosahedronGeometry(s, 1);
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) { const n = 1 + (hash(p.getX(k) * 9 + i, p.getZ(k) * 9) - 0.5) * 0.16; p.setXYZ(k, p.getX(k) * n, p.getY(k) * n, p.getZ(k) * n); }
    geo.computeVertexNormals();
    g.add(mesh(geo, leaf, Math.cos(a) * rr, (2.5 + (i ? (i % 3) * 0.32 : 0.45)) * sc, Math.sin(a) * rr));
  }
  return shadowed(g);
}

function gableRoof(w, dep, h, mat) {
  const shape = new THREE.Shape();
  const over = 0.35;
  shape.moveTo(-w / 2 - over, 0); shape.lineTo(0, h); shape.lineTo(w / 2 + over, 0); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: dep + over * 2, bevelEnabled: false });
  g.translate(0, 0, -dep / 2 - over);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + p.getZ(i)) * 0.45, p.getY(i) * 0.9);
  return new THREE.Mesh(g, mat);
}

function makeHouse(d) {
  const g = new THREE.Group();
  const [rows, cols] = d.size, w = cols * CELL, dep = rows * CELL, wallH = 2.7;
  const wall = new THREE.MeshStandardMaterial({ map: textures.plaster(), color: d.color ?? 0xf1e2c4, roughness: 0.9 });
  g.add(mesh(new THREE.BoxGeometry(w, wallH, dep), wall, 0, wallH / 2, 0));
  const foundation = new THREE.MeshStandardMaterial({ map: textures.rock(), roughness: 1 });
  g.add(mesh(new THREE.BoxGeometry(w + 0.16, 0.42, dep + 0.16), foundation, 0, 0.21, 0));
  const roof = gableRoof(w, dep, 1.9, new THREE.MeshStandardMaterial({ map: textures.shingle(), color: d.roof ?? 0xc1503a, roughness: 0.85 }));
  roof.position.y = wallH;
  g.add(roof);
  const wood = new THREE.MeshStandardMaterial({ map: textures.wood(), roughness: 0.85 });
  // Kapı, çerçeve, basamak
  const fz = dep / 2;
  g.add(mesh(new THREE.BoxGeometry(1.06, 1.76, 0.08), std(0x4a3020), 0, 0.88, fz + 0.03));
  g.add(mesh(new THREE.BoxGeometry(0.86, 1.6, 0.08), wood, 0, 0.82, fz + 0.07));
  g.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), std(0xd4af37, { metalness: 0.9, roughness: 0.3 }), 0.28, 0.85, fz + 0.13));
  g.add(mesh(new THREE.BoxGeometry(1.4, 0.14, 0.5), foundation, 0, 0.07, fz + 0.25));
  // Pencereler: akşam ışığı gibi hafif parlar
  const glass = new THREE.MeshStandardMaterial({ color: 0x9ccbe0, emissive: 0xffd28a, emissiveIntensity: 0.28, roughness: 0.1, metalness: 0.2 });
  const frame = std(0xf7f3e8);
  const windowAt = (x, y, z, rot) => {
    const f = mesh(new THREE.BoxGeometry(0.82, 0.82, 0.05), frame, x, y, z); f.rotation.y = rot;
    const pane = mesh(new THREE.BoxGeometry(0.66, 0.66, 0.07), glass, x, y, z); pane.rotation.y = rot;
    const bar = mesh(new THREE.BoxGeometry(0.05, 0.66, 0.09), frame, x, y, z); bar.rotation.y = rot;
    const bar2 = mesh(new THREE.BoxGeometry(0.66, 0.05, 0.09), frame, x, y, z); bar2.rotation.y = rot;
    g.add(f, pane, bar, bar2);
  };
  if (w > 3.5) { windowAt(-w / 2 + 0.95, 1.65, fz + 0.03, 0); windowAt(w / 2 - 0.95, 1.65, fz + 0.03, 0); }
  windowAt(-w / 2 - 0.03, 1.65, 0, Math.PI / 2); windowAt(w / 2 + 0.03, 1.65, 0, Math.PI / 2);
  // Baca
  g.add(mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), new THREE.MeshStandardMaterial({ map: textures.brick(), color: 0xb0654a }), w * 0.22, wallH + 1.25, -dep * 0.2));
  g.position.set(d.at[1] * CELL + w / 2, 0, d.at[0] * CELL + dep / 2);
  return shadowed(g);
}

function makeStoneWall(d) {
  const [rows, cols] = d.size, w = cols * CELL, dep = rows * CELL, h = 3.1;
  const tex = textures.brick().clone();
  tex.userData = {};
  tex.repeat.set(Math.max(w, dep) / 3, h / 3);
  tex.needsUpdate = true;
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(w, h, dep), new THREE.MeshStandardMaterial({ map: tex, color: d.color ?? 0xd8c7a6, roughness: 0.92 }), 0, h / 2, 0));
  g.add(mesh(new THREE.BoxGeometry(w + 0.22, 0.22, dep + 0.22), std(0x8a8378), 0, h + 0.11, 0));
  g.position.set(d.at[1] * CELL + w / 2, 0, d.at[0] * CELL + dep / 2);
  return shadowed(g);
}

// Belediye önü: sütunlar, üçgen alınlık, bayrak
function makeHallFront(d, tickers) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ map: textures.plaster(), color: 0xe9e2d0, roughness: 0.7 });
  for (let i = 0; i < 6; i++) {
    const x = -7.5 + i * 3;
    g.add(mesh(new THREE.CylinderGeometry(0.28, 0.34, 3.5, 16), stone, x, 1.75, 0));
    g.add(mesh(new THREE.BoxGeometry(0.85, 0.2, 0.85), stone, x, 3.55, 0));
    g.add(mesh(new THREE.BoxGeometry(0.9, 0.2, 0.9), stone, x, 0.1, 0));
  }
  g.add(mesh(new THREE.BoxGeometry(17.4, 0.45, 2.2), stone, 0, 3.85, -0.5));
  const tri = new THREE.Shape(); tri.moveTo(-8.7, 0); tri.lineTo(0, 2); tri.lineTo(8.7, 0); tri.closePath();
  const ped = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 2.2, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: 0xc1503a, roughness: 0.8 }));
  ped.position.set(0, 4.07, -1.6);
  g.add(ped);
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2), std(0xdedede, { metalness: 0.7 }), 0, 7.4, -0.5));
  const flagGeo = new THREE.PlaneGeometry(1.5, 0.9, 12, 4);
  const flag = mesh(flagGeo, new THREE.MeshStandardMaterial({ color: 0xe63946, side: THREE.DoubleSide, roughness: 0.8 }), 0.8, 8.4, -0.5);
  g.add(flag);
  const base = flagGeo.attributes.position.array.slice();
  let t = 0;
  tickers.push(dt => {
    t += dt * 3.5;
    const p = flagGeo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(t + base[i * 3] * 3) * 0.12 * (base[i * 3] + 0.75));
    p.needsUpdate = true;
  });
  g.position.set(cx(d.at[1]), 0, cx(d.at[0]));
  return shadowed(g);
}

function makeClockTower(d, h) {
  const g = new THREE.Group();
  const tex = textures.brick().clone(); tex.userData = {}; tex.repeat.set(1.2, 3); tex.needsUpdate = true;
  g.add(mesh(new THREE.BoxGeometry(2, 8, 2), new THREE.MeshStandardMaterial({ map: tex, color: 0xcabd9e, roughness: 0.95 }), 0, 4, 0));
  g.add(mesh(new THREE.BoxGeometry(2.4, 0.3, 2.4), std(0x7c776e), 0, 8.15, 0));
  const roof = mesh(new THREE.ConeGeometry(1.9, 2.6, 4), new THREE.MeshStandardMaterial({ map: textures.shingle(), color: 0x6b4fa0, flatShading: true }), 0, 9.6, 0);
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  // Saat hep üçü çeyrek geçeyi gösterir
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const q = c.getContext('2d');
  q.fillStyle = '#f7efd8'; q.beginPath(); q.arc(128, 128, 124, 0, 7); q.fill();
  q.strokeStyle = '#2a2018'; q.lineWidth = 9; q.stroke(); q.fillStyle = '#2a2018';
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; q.fillRect(124 + Math.sin(a) * 100, 120 - Math.cos(a) * 100, 8, 16); }
  const hand = (ang, len, w) => { q.lineWidth = w; q.beginPath(); q.moveTo(128, 128); q.lineTo(128 + Math.sin(ang) * len, 128 - Math.cos(ang) * len); q.stroke(); };
  hand((3.25 / 12) * Math.PI * 2, 62, 11); hand(Math.PI / 2, 96, 7);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  for (const [x, z, ry] of [[0, 1.02, 0], [1.02, 0, Math.PI / 2], [0, -1.02, Math.PI], [-1.02, 0, -Math.PI / 2]]) {
    const f = mesh(new THREE.CircleGeometry(0.8, 32), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.5 }), x, 6.7, z);
    f.rotation.y = ry;
    g.add(f);
  }
  g.position.set(cx(d.at[1]), h, cx(d.at[0]));
  return shadowed(g);
}

function makePond(d, tickers) {
  const [rows, cols] = d.size, w = cols * CELL, dep = rows * CELL;
  const g = new THREE.Group();
  const sand = mesh(blobGeometry(w * 0.68, dep * 0.68, 2), new THREE.MeshStandardMaterial({ color: 0xc9b98a, roughness: 1 }), 0, 0.04, 0);
  sand.receiveShadow = true;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const q = c.getContext('2d');
  q.fillStyle = '#3f8fbc'; q.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 180; i++) { q.strokeStyle = `rgba(190,235,255,${0.08 + Math.random() * 0.2})`; q.lineWidth = 1 + Math.random() * 2; const x = Math.random() * 256, y = Math.random() * 256; q.beginPath(); q.moveTo(x, y); q.quadraticCurveTo(x + 18, y + (Math.random() - 0.5) * 8, x + 40, y); q.stroke(); }
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  const geo = blobGeometry(w * 0.58, dep * 0.58, 2);
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 5, p.getZ(i) / 5);
  const water = mesh(geo, new THREE.MeshPhysicalMaterial({ map: tx, roughness: 0.08, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.95 }), 0, 0.11, 0);
  g.add(sand, water);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * 6.28, k = 0.6 + hash(i, 5) * 0.08;
    const rock = mesh(new THREE.DodecahedronGeometry(0.2 + hash(i, 9) * 0.28, 0), new THREE.MeshStandardMaterial({ map: textures.rock(), flatShading: true }), Math.cos(a) * w * k, 0.12, Math.sin(a) * dep * k);
    rock.scale.y = 0.65; rock.castShadow = true;
    g.add(rock);
  }
  tickers.push(dt => { tx.offset.x += dt * 0.025; tx.offset.y += dt * 0.012; });
  g.position.set(d.at[1] * CELL + w / 2, 0, d.at[0] * CELL + dep / 2);
  return g;
}

function makeFence(d) {
  // from/to: [satır, sütun]; yan yana ahşap çit
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ map: textures.wood(), roughness: 0.9 });
  const ax = cx(d.from[1]), az = cx(d.from[0]), bx = cx(d.to[1]), bz = cx(d.to[0]);
  const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 2));
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    g.add(mesh(new THREE.BoxGeometry(0.16, 1.05, 0.16), wood, ax + (bx - ax) * u, 0.52, az + (bz - az) * u));
  }
  for (const y of [0.42, 0.82]) {
    const rail = mesh(new THREE.BoxGeometry(len, 0.09, 0.05), wood, (ax + bx) / 2, y, (az + bz) / 2);
    rail.rotation.y = -Math.atan2(bz - az, bx - ax);
    g.add(rail);
  }
  return shadowed(g);
}

function makeLamp(d, tickers) {
  const g = new THREE.Group();
  const iron = std(0x2b2b33, { metalness: 0.7, roughness: 0.4 });
  g.add(mesh(new THREE.CylinderGeometry(0.06, 0.1, 2.5, 8), iron, 0, 1.25, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.34, 6), new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffd58a, emissiveIntensity: 1 }), 0, 2.67, 0));
  g.add(mesh(new THREE.ConeGeometry(0.26, 0.2, 6), iron, 0, 2.94, 0));
  g.position.set(cx(d.at[1]), 0, cx(d.at[0]));
  return shadowed(g);
}

function makeRock(d) {
  const sc = d.scale || 1;
  const m = mesh(new THREE.DodecahedronGeometry(0.85 * sc, 1), new THREE.MeshStandardMaterial({ map: textures.rock(), roughness: 1, flatShading: true }), cx(d.at[1]), 0.5 * sc, cx(d.at[0]));
  m.scale.y = 0.72; m.rotation.y = d.at[0];
  m.castShadow = m.receiveShadow = true;
  return m;
}

function makeBush(d) {
  const g = new THREE.Group();
  const leaf = new THREE.MeshStandardMaterial({ map: textures.leaves(), color: 0x4f9140, roughness: 0.95 });
  for (let i = 0; i < 4; i++) g.add(mesh(new THREE.IcosahedronGeometry(0.42 + hash(i, d.at[0]) * 0.2, 1), leaf, (i - 1.5) * 0.36, 0.38, hash(d.at[1], i) * 0.4 - 0.2));
  g.position.set(cx(d.at[1]), 0, cx(d.at[0]));
  return shadowed(g);
}

export function buildDecor(d, group, h, tickers) {
  switch (d.kind) {
    case 'tree': { const t = makeTree(d); t.position.set(cx(d.at[1]), h, cx(d.at[0])); group.add(t); break; }
    case 'house': group.add(makeHouse(d)); break;
    case 'stone': group.add(makeStoneWall(d)); break;
    case 'hallfront': group.add(makeHallFront(d, tickers)); break;
    case 'clock': group.add(makeClockTower(d, h)); break;
    case 'pond': group.add(makePond(d, tickers)); break;
    case 'fence': group.add(makeFence(d)); break;
    case 'lamp': group.add(makeLamp(d, tickers)); break;
    case 'rock': group.add(makeRock(d)); break;
    case 'bush': group.add(makeBush(d)); break;
  }
}

// Işınlanma kapısı: taş kemer ve dönen girdap. vortex döndürülür.
export function makePortalGate(color, locked) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ map: textures.rock(), roughness: 1 });
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.27, 12, 40, Math.PI), stone);
  arch.position.y = 1.95;
  g.add(arch);
  for (const side of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.62, 2, 0.62), stone, side * 1.5, 1, 0));
  g.add(mesh(new THREE.CylinderGeometry(2, 2.2, 0.12, 40), stone, 0, 0.06, 0));
  shadowed(g);
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const q = c.getContext('2d');
  const col = '#' + new THREE.Color(color).getHexString();
  const grd = q.createRadialGradient(128, 128, 6, 128, 128, 128);
  grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.4, col); grd.addColorStop(1, 'rgba(0,0,0,0)');
  q.fillStyle = grd; q.fillRect(0, 0, 256, 256);
  q.strokeStyle = 'rgba(255,255,255,.65)'; q.lineWidth = 5;
  for (let k = 0; k < 5; k++) { q.beginPath(); for (let a = 0; a < 7; a += 0.1) { const r = a * 17, t = a + (k / 5) * 6.28; q.lineTo(128 + Math.cos(t) * r, 128 + Math.sin(t) * r); } q.stroke(); }
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  const vortex = mesh(new THREE.CircleGeometry(1.42, 40), new THREE.MeshBasicMaterial({ map: tx, transparent: true, opacity: locked ? 0.12 : 0.92, side: THREE.DoubleSide, depthWrite: false, blending: locked ? THREE.NormalBlending : THREE.AdditiveBlending }), 0, 1.75, 0);
  g.add(vortex);
  g.userData.vortex = vortex;
  return g;
}
