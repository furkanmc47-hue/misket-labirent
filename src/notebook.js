// Defter: bulunan ayrıntılar ve tanık ifadeleri. Oyuncu burada kendi sonucunu çıkarır.
import { EVIDENCE } from './story.js';
import { save } from './save.js';

const GROUPS = [
  ['iz', '🔍 İzler'],
  ['belge', '📄 Belgeler'],
  ['ifade', '🗣 Tanık ifadeleri'],
  ['gunluk', '🕯 Günlük sayfaları'],
];

export function renderNotebook(root) {
  root.textContent = '';
  const total = Object.keys(EVIDENCE).length;
  const count = document.createElement('p');
  count.className = 'muted';
  count.textContent = `Bulunan: ${save.notebook.length}/${total}. Defter sana ne olduğunu söylemez, yalnızca ne gördüğünü ve kimin ne dediğini tutar.`;
  root.appendChild(count);
  for (const [kind, title] of GROUPS) {
    const ids = save.notebook.filter(id => EVIDENCE[id]?.kind === kind);
    const h = document.createElement('h3');
    h.textContent = `${title} (${ids.length})`;
    root.appendChild(h);
    if (!ids.length) {
      const empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = 'Henüz bir şey yok.';
      root.appendChild(empty);
    }
    for (const id of ids) {
      const ev = EVIDENCE[id];
      const row = document.createElement('div');
      row.className = 'nb-entry';
      const b = document.createElement('b');
      b.textContent = ev.title;
      const where = document.createElement('small');
      where.textContent = ` · ${ev.where}`;
      const text = document.createElement('p');
      text.textContent = ev.text;
      row.append(b, where, text);
      root.appendChild(row);
    }
  }
}
