// Electron ile logo sayfasını açar, misket görüntüsünü build/icon.png olarak kaydeder.
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 600, height: 600, show: false, transparent: true, webPreferences: { offscreen: false } });
  await win.loadFile(path.join(__dirname, 'icon.html'));
  let data = null;
  for (let i = 0; i < 50 && !data; i++) {
    data = await win.webContents.executeJavaScript('window.__png || null');
    if (!data) await new Promise(r => setTimeout(r, 100));
  }
  const out = path.join(__dirname, '..', '..', 'build', 'icon.png');
  fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
  console.log('Logo kaydedildi:', out);
  app.quit();
});
