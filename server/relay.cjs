// Çok oyunculu oda sunucusu: oyuncuları odalara ayırır, mesajları dağıtır.
// Oyunu kuran bilgisayarda Electron içinden çalışır; internet üzerinden oynamak için
// tek başına da başlatılabilir: node server/relay.cjs [port]
const { WebSocketServer, WebSocket } = require('ws');

const MAX_PLAYERS = 5;
const MAX_ROOMS = 200;
const DEFAULT_PORT = 41707;
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function newCode(rooms) {
  for (;;) {
    const code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
    if (!rooms.has(code)) return code;
  }
}

const cleanName = n => String(n ?? '').replace(/\s+/g, ' ').trim().slice(0, 16) || 'Misket';
const cleanColor = c => (Number.isInteger(c) && c >= 0 && c <= 0xffffff ? c : 0x4cc9f0);

// singleRoom: adres yeterli olsun, oda kodu sorulmasın (ev sahibinin kendi sunucusu)
function createRelay({ port = DEFAULT_PORT, singleRoom = false } = {}) {
  const rooms = new Map();
  let nextId = 1;

  const send = (ws, msg) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); };
  const listPlayers = room => [...room.players.values()].map(({ id, name, color }) => ({ id, name, color }));
  const broadcast = (room, msg, except) => {
    const text = JSON.stringify(msg);
    for (const p of room.players.values()) if (p !== except && p.ws.readyState === WebSocket.OPEN) p.ws.send(text);
  };

  function enter(ws, room, msg) {
    if (room.players.size >= MAX_PLAYERS) return send(ws, { t: 'error', message: `Oda dolu (en fazla ${MAX_PLAYERS} kişi).` });
    if (room.locked) return send(ws, { t: 'error', message: 'Bu odada oyun başladı. Bitince tekrar dene.' });
    const player = { id: nextId++, ws, name: cleanName(msg.name), color: cleanColor(msg.color), room };
    room.players.set(player.id, player);
    room.hostId ??= player.id;
    ws.player = player;
    send(ws, { t: 'welcome', id: player.id, room: room.code, hostId: room.hostId, players: listPlayers(room) });
    broadcast(room, { t: 'joined', player: { id: player.id, name: player.name, color: player.color } }, player);
  }

  function leave(player) {
    const room = player.room;
    room.players.delete(player.id);
    if (!room.players.size) { rooms.delete(room.code); return; }
    if (room.hostId === player.id) room.hostId = room.players.keys().next().value;
    broadcast(room, { t: 'left', id: player.id, hostId: room.hostId });
  }

  const onMessage = (ws, raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const me = ws.player;
    if (!me) {
      if (msg.t === 'create') {
        if (rooms.size >= MAX_ROOMS) return send(ws, { t: 'error', message: 'Sunucu dolu.' });
        if (singleRoom && rooms.size) return enter(ws, rooms.values().next().value, msg);
        const room = { code: newCode(rooms), players: new Map(), hostId: null, locked: false };
        rooms.set(room.code, room);
        return enter(ws, room, msg);
      }
      if (msg.t === 'join') {
        const code = String(msg.room ?? '').trim().toUpperCase();
        const room = code ? rooms.get(code) : singleRoom ? rooms.values().next().value : null;
        if (!room) return send(ws, { t: 'error', message: code ? 'Bu kodla bir oda bulunamadı.' : 'Oda kodu gerekli.' });
        return enter(ws, room, msg);
      }
      return;
    }
    if (msg.t === 'send') {
      const out = { t: 'msg', from: me.id, d: msg.d };
      if (msg.to != null) { const p = me.room.players.get(msg.to); if (p) send(p.ws, out); }
      else broadcast(me.room, out, me);
    } else if (msg.t === 'lock' && me.room.hostId === me.id) {
      me.room.locked = !!msg.locked;
    }
  };

  return new Promise((resolve, reject) => {
    const wss = new WebSocketServer({ port, maxPayload: 256 * 1024 });
    const beat = setInterval(() => {
      for (const ws of wss.clients) {
        if (ws.dead) { ws.terminate(); continue; }
        ws.dead = true;
        ws.ping();
      }
    }, 15000);
    wss.on('connection', ws => {
      ws.on('pong', () => { ws.dead = false; });
      ws.on('message', raw => onMessage(ws, raw));
      ws.on('close', () => { if (ws.player) leave(ws.player); });
      ws.on('error', () => {});
    });
    wss.on('error', reject);
    wss.on('listening', () => {
      wss.removeListener('error', reject);
      resolve({
        port: wss.address().port,
        close: () => new Promise(done => {
          clearInterval(beat);
          for (const ws of wss.clients) ws.terminate();
          wss.close(() => done());
        }),
      });
    });
  });
}

module.exports = { createRelay, MAX_PLAYERS, DEFAULT_PORT };

if (require.main === module) {
  createRelay({ port: Number(process.argv[2]) || DEFAULT_PORT })
    .then(r => console.log(`Misket Labirenti oda sunucusu ${r.port} portunda çalışıyor.`))
    .catch(e => { console.error(e.message); process.exit(1); });
}
