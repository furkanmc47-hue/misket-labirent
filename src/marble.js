// Oyundaki misket: renkli girdaplı cam bilye. Logo üretici de bunu kullanır.
import * as THREE from 'three';

export const MARBLE_R = 0.55;

// color verilirse (çok oyunculu) misket o rengin tonlarında girdaplanır
export function marbleTexture(color) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  const tint = color === undefined ? null : new THREE.Color(color);
  const css = (k, l) => '#' + tint.clone().multiplyScalar(k).lerp(new THREE.Color(0xffffff), l).getHexString();
  grd.addColorStop(0, tint ? css(1, 0.55) : '#bcdcf2'); grd.addColorStop(1, tint ? css(1, 0.25) : '#6ea9d6');
  g.fillStyle = grd; g.fillRect(0, 0, 512, 256);
  (tint ? [css(1, 0), css(0.6, 0), css(1, 0.25), css(0.8, 0)] : ['#e63946', '#ffb703', '#2a9d8f', '#3a86ff']).forEach((col, i) => {
    g.strokeStyle = col; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath();
    for (let x = 0; x <= 512; x += 8) {
      const y = 128 + Math.sin((x / 512) * Math.PI * 4 + i * 1.6) * (40 + i * 12);
      x ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createMarbleMesh(envMap, radius = MARBLE_R, color) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 48, 32),
    new THREE.MeshPhysicalMaterial({
      map: marbleTexture(color), envMap, envMapIntensity: 0.3,
      roughness: 0.28, metalness: 0.0, clearcoat: 0.8, clearcoatRoughness: 0.12,
    })
  );
  mesh.castShadow = true;
  return mesh;
}
