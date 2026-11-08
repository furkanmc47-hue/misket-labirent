// "npm start": VS Code terminalinden gelen ELECTRON_RUN_AS_NODE değişkeni
// Electron'u düz Node olarak çalıştırır ve pencere açılmaz; burada temizlenir.
const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [root], { cwd: root, env, stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
