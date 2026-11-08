// Electron ana süreci: oyunu tek pencerede açar, çok oyunculu oda sunucusunu yönetir.
const { app, BrowserWindow, ipcMain } = require('electron');
const os = require('os');
const path = require('path');
const { createRelay, DEFAULT_PORT } = require('./server/relay.cjs');

let relay = null;

function lanAddresses() {
  return Object.values(os.networkInterfaces()).flat()
    .filter(n => n && n.family === 'IPv4' && !n.internal)
    .map(n => n.address);
}

async function stopRelay() {
  const r = relay;
  relay = null;
  if (r) await r.close();
}

ipcMain.handle('host:start', async () => {
  await stopRelay();
  // Port doluysa işletim sisteminin verdiği boş bir porta geç
  relay = await createRelay({ port: DEFAULT_PORT, singleRoom: true })
    .catch(() => createRelay({ port: 0, singleRoom: true }));
  return { port: relay.port, addresses: lanAddresses() };
});
ipcMain.handle('host:stop', stopRelay);

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#111111',
    title: 'Misket Labirenti',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, backgroundThrottling: false, preload: path.join(__dirname, 'preload.cjs') },
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  // F11 tam ekran
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    }
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { stopRelay(); });
