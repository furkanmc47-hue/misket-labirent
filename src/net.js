// Çok oyunculu bağlantı: oda sunucusuna bağlanır, mesajları dinleyicilere iletir.
export const DEFAULT_PORT = 41707;

let ws = null;
const listeners = new Set();

export const net = {
  id: null, room: null, hostId: null, players: new Map(),
  get connected() { return !!ws && ws.readyState === WebSocket.OPEN; },
  get isHost() { return this.id !== null && this.id === this.hostId; },
};

export function onNet(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const emit = msg => { for (const fn of listeners) fn(msg); };

function toUrl(address) {
  const a = address.trim();
  if (/^wss?:\/\//i.test(a)) return a;
  return /:\d+$/.test(a) ? `ws://${a}` : `ws://${a}:${DEFAULT_PORT}`;
}

function reset() {
  ws = null;
  net.id = net.room = net.hostId = null;
  net.players.clear();
}

// hello: { t: 'create' | 'join', room?, name, color }
export function connectNet(address, hello) {
  closeNet();
  return new Promise((resolve, reject) => {
    let settled = false, sock;
    const fail = message => { if (!settled) { settled = true; reject(new Error(message)); } try { sock?.close(); } catch {} };
    try { sock = new WebSocket(toUrl(address)); } catch { return fail('Adres geçersiz.'); }
    ws = sock;
    const timer = setTimeout(() => fail('Sunucu yanıt vermedi.'), 6000);
    sock.onopen = () => sock.send(JSON.stringify(hello));
    sock.onerror = () => fail('Sunucuya bağlanılamadı. Adresi ve güvenlik duvarını kontrol et.');
    sock.onclose = () => {
      clearTimeout(timer);
      if (ws !== sock) return;
      const wasIn = net.id !== null;
      reset();
      fail('Bağlantı kapandı.');
      if (wasIn) emit({ t: 'closed' });
    };
    sock.onmessage = ev => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.t === 'error') { clearTimeout(timer); fail(msg.message); return; }
      if (msg.t === 'welcome') {
        clearTimeout(timer);
        net.id = msg.id; net.room = msg.room; net.hostId = msg.hostId;
        net.players = new Map(msg.players.map(p => [p.id, p]));
        settled = true;
        resolve();
        return;
      }
      if (msg.t === 'joined') net.players.set(msg.player.id, msg.player);
      if (msg.t === 'left') { net.players.delete(msg.id); net.hostId = msg.hostId; }
      try { emit(msg); } catch (e) { console.warn('Ağ mesajı işlenemedi', e); }
    };
  });
}

export function sendNet(d, to) {
  if (net.connected) ws.send(JSON.stringify({ t: 'send', d, ...(to != null ? { to } : {}) }));
}
export function lockRoom(locked) {
  if (net.connected) ws.send(JSON.stringify({ t: 'lock', locked }));
}
export function closeNet() {
  const s = ws;
  reset();
  try { s?.close(); } catch {}
}
