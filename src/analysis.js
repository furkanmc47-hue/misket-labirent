// Hikâye Analizi: meydan kürsüsünde her soru için bir cevap ve bir kanıt seçilir.
import { ANALYSIS, EVIDENCE, ENDINGS, scoreAnalysis } from './story.js';
import { save, persist } from './save.js';
import { sfx } from './audio.js';

const $ = id => document.getElementById(id);
const RANK = { yanlis: 0, kuskulu: 1, gercek: 2 };

// onDone(sonuç): sonuç kapatılınca çağrılır; onLeave: vazgeçilirse
export function openAnalysis({ onDone, onLeave }) {
  const answers = {};
  let index = 0;
  const box = $('anBody');

  const render = () => {
    const q = ANALYSIS[index];
    const a = answers[q.id] ||= { option: null, proof: null };
    box.textContent = '';
    const step = document.createElement('p');
    step.className = 'muted';
    step.textContent = `Soru ${index + 1}/${ANALYSIS.length}`;
    const title = document.createElement('h3');
    title.textContent = q.q;
    box.append(step, title);

    const options = document.createElement('div');
    options.className = 'an-options';
    for (const o of q.options) {
      const b = document.createElement('button');
      b.className = 'ghost' + (a.option === o.id ? ' picked' : '');
      b.textContent = o.t;
      b.onclick = () => { a.option = o.id; sfx.click(); render(); };
      options.appendChild(b);
    }
    box.appendChild(options);

    const label = document.createElement('h3');
    label.textContent = '📓 Kanıtın ne?';
    box.appendChild(label);
    const proofs = document.createElement('div');
    proofs.className = 'an-proofs';
    if (!save.notebook.length) {
      const none = document.createElement('p');
      none.className = 'muted';
      none.textContent = 'Defterin boş. Kanıtsız konuşursan kimse sana inanmaz.';
      proofs.appendChild(none);
    }
    for (const id of save.notebook) {
      const ev = EVIDENCE[id];
      if (!ev) continue;
      const b = document.createElement('button');
      b.className = 'ghost small' + (a.proof === id ? ' picked' : '');
      b.title = ev.text;
      b.textContent = ev.kind === 'ifade' ? `🗣 ${ev.title}: ${ev.text}` : `${ev.kind === 'belge' ? '📄' : ev.kind === 'gunluk' ? '🕯' : '🔍'} ${ev.title}`;
      b.onclick = () => { a.proof = id; sfx.click(); render(); };
      proofs.appendChild(b);
    }
    box.appendChild(proofs);

    const nav = document.createElement('div');
    if (index > 0) {
      const back = document.createElement('button');
      back.className = 'ghost';
      back.textContent = '◀ Önceki';
      back.onclick = () => { index--; render(); };
      nav.appendChild(back);
    }
    const next = document.createElement('button');
    next.disabled = !a.option;
    next.textContent = index < ANALYSIS.length - 1 ? 'Sonraki ▶' : '⚖ Herkesin önünde söyle';
    next.onclick = () => {
      if (index < ANALYSIS.length - 1) { index++; render(); } else finish();
    };
    nav.appendChild(next);
    const leave = document.createElement('button');
    leave.className = 'ghost';
    leave.textContent = 'Henüz hazır değilim';
    leave.onclick = () => { $('analysis').classList.remove('show'); onLeave?.(); };
    nav.appendChild(leave);
    box.appendChild(nav);
  };

  const finish = () => {
    const res = scoreAnalysis(answers);
    if (!save.ending || RANK[res.ending] > RANK[save.ending]) save.ending = res.ending;
    persist();
    $('analysis').classList.remove('show');
    onDone(res, ENDINGS[res.ending]);
  };

  $('analysis').classList.add('show');
  render();
}
