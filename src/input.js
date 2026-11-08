// Girdi: klavye, fare (işaretçi kilidi), gamepad ve dokunmatik sanal kol.
// Oyun, hareket için move()/turn() okur; tek seferlik eylemler onAction ile gelir.

export const keys = {};
let enabled = false;
let actionHandler = () => {};
let mouseDX = 0, mouseDY = 0;
const touch = { x: 0, y: 0, active: false, id: null };
const padPrev = {};

export function setInputEnabled(v) {
  enabled = v;
  if (!v) for (const k in keys) keys[k] = false;
}
export function onAction(fn) { actionHandler = fn; }

const KEY_ACTIONS = {
  Space: 'jump', KeyC: 'camera', KeyM: 'map', KeyR: 'human', KeyK: 'respawn', KeyT: 'resetBoxes', KeyP: 'pause', Escape: 'pause',
  Digit1: 'slot1', Digit2: 'slot2', Digit3: 'slot3', Digit4: 'slot4', KeyF: 'use', Tab: 'target', ShiftLeft: 'dash', ShiftRight: 'dash', KeyN: 'notebook', Enter: 'confirm',
};

addEventListener('keydown', e => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
  if (e.code.startsWith('Arrow') || e.code === 'Space' || e.code === 'Tab') e.preventDefault();
  if (KEY_ACTIONS[e.code] && !e.repeat) actionHandler(KEY_ACTIONS[e.code]);
  if (enabled) keys[e.code] = true;
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// Fare: işaretçi kilitliyken hareket miktarı birikir, oyun her karede okur
// Labirent dışında fare serbesttir: kamera sağ tuş basılıyken döner (Roblox gibi)
let rightHeld = false;
addEventListener('mousedown', e => {
  if (!(e.target instanceof HTMLCanvasElement)) return;
  if (e.button === 2) rightHeld = true;
  if (e.button === 0) actionHandler('attack');
});
addEventListener('mouseup', e => { if (e.button === 2) rightHeld = false; });
addEventListener('blur', () => { rightHeld = false; });
addEventListener('contextmenu', e => { if (e.target instanceof HTMLCanvasElement) e.preventDefault(); });
addEventListener('mousemove', e => {
  if (document.pointerLockElement || rightHeld) { mouseDX += e.movementX; mouseDY += e.movementY; }
});
export function consumeMouse() {
  const d = [mouseDX, mouseDY];
  mouseDX = mouseDY = 0;
  return d;
}

// ------------------------------------------------------------------
// Gamepad: sol çubuk hareket, sağ çubuk bakış,
// A zıpla, Y kamera, X kontrol noktası, Start duraklat, Select harita
// ------------------------------------------------------------------
const PAD_BUTTONS = { 0: 'jump', 3: 'camera', 2: 'respawn', 9: 'pause', 8: 'map', 1: 'resetBoxes', 5: 'use', 4: 'dash', 7: 'target' };
let pad = { x: 0, y: 0, rx: 0, ry: 0 };
const dz = v => (Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82);

export function pollGamepad() {
  pad = { x: 0, y: 0, rx: 0, ry: 0 };
  const gp = [...(navigator.getGamepads?.() || [])].find(Boolean);
  if (!gp) return;
  pad.x = dz(gp.axes[0] || 0); pad.y = -dz(gp.axes[1] || 0);
  pad.rx = dz(gp.axes[2] || 0); pad.ry = dz(gp.axes[3] || 0);
  // D-pad de hareket eder
  if (gp.buttons[12]?.pressed) pad.y = 1;
  if (gp.buttons[13]?.pressed) pad.y = -1;
  if (gp.buttons[14]?.pressed) pad.x = -1;
  if (gp.buttons[15]?.pressed) pad.x = 1;
  for (const [i, act] of Object.entries(PAD_BUTTONS)) {
    const p = !!gp.buttons[i]?.pressed;
    if (p && !padPrev[i]) actionHandler(act);
    padPrev[i] = p;
  }
}

// Analog hareket (gamepad + dokunmatik): x sağ, y ileri; uzunluğu en fazla 1
export function analogMove() {
  if (!enabled) return [0, 0];
  let x = pad.x, y = pad.y;
  if (touch.active) { x += touch.x; y += touch.y; }
  const l = Math.hypot(x, y);
  return l > 1 ? [x / l, y / l] : [x, y];
}
export function padLook() { return enabled ? [pad.rx, pad.ry] : [0, 0]; }

// ------------------------------------------------------------------
// Dokunmatik kontroller (dokunmatik ekran algılanınca görünür)
// ------------------------------------------------------------------
export function setupTouch() {
  const root = document.getElementById('touch');
  const base = root.querySelector('.stick'), knob = root.querySelector('.knob');
  const show = () => root.classList.add('show');
  if (matchMedia('(pointer: coarse)').matches) show();
  addEventListener('touchstart', show, { once: true, passive: true });

  const R = 55;
  const move = t => {
    const b = base.getBoundingClientRect();
    let dx = t.clientX - (b.left + b.width / 2), dy = t.clientY - (b.top + b.height / 2);
    const l = Math.hypot(dx, dy);
    if (l > R) { dx = (dx / l) * R; dy = (dy / l) * R; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    touch.x = dx / R; touch.y = -dy / R;
  };
  base.addEventListener('touchstart', e => {
    const t = e.changedTouches[0];
    touch.id = t.identifier; touch.active = true; move(t);
    e.preventDefault();
  }, { passive: false });
  addEventListener('touchmove', e => {
    for (const t of e.changedTouches) if (t.identifier === touch.id) move(t);
  }, { passive: true });
  const end = e => {
    for (const t of e.changedTouches) if (t.identifier === touch.id) {
      touch.active = false; touch.x = touch.y = 0; touch.id = null;
      knob.style.transform = '';
    }
  };
  addEventListener('touchend', end); addEventListener('touchcancel', end);
  root.querySelectorAll('[data-act]').forEach(btn => {
    btn.addEventListener('touchstart', e => { actionHandler(btn.dataset.act); e.preventDefault(); }, { passive: false });
  });
}
