// src/ klasörünü tek bir app/game.js dosyasına paketler (Three.js dahil).
// Böylece oyun internetsiz çalışır ve index.html tarayıcıda çift tıklayarak da açılabilir.
import { build } from 'esbuild';
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'app');
mkdirSync(out, { recursive: true });

await build({
  entryPoints: [join(root, 'src', 'main.js')],
  bundle: true,
  format: 'iife',
  target: 'es2022',
  outfile: join(out, 'game.js'),
  legalComments: 'none',
  logLevel: 'warning',
});
for (const f of ['index.html', 'style.css']) cpSync(join(root, 'src', f), join(out, f));
cpSync(join(root, 'build', 'icon.png'), join(out, 'icon.png'));
console.log('app/ hazır');
