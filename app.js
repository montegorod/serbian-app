'use strict';
// ---------- данные ----------
const KEY = 'srpski_v1', DAY = 864e5, INTERVALS = [0, 1, 2, 4, 7, 14, 30]; // дни по "коробкам"
let S;
function load() {
  try { S = JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { S = null; }
  if (!S) S = { cards: [], streak: 0, lastDay: '', today: 0, todayDay: '' };
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
const dayStr = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
load();

// ---------- текст: нормализация, сравнение ----------
const CYR2LAT = {а:'a',б:'b',в:'v',г:'g',д:'d',ђ:'dj',е:'e',ж:'z',з:'z',и:'i',ј:'j',к:'k',л:'l',љ:'lj',м:'m',н:'n',њ:'nj',о:'o',п:'p',р:'r',с:'s',т:'t',ћ:'c',у:'u',ф:'f',х:'h',ц:'c',ч:'c',џ:'dz',ш:'s',ы:'i',й:'j',э:'e',ю:'ju',я:'ja',ё:'e',щ:'s',ь:'',ъ:''};
const LAT2CYR = { lj:'љ',nj:'њ',dž:'џ',Lj:'Љ',Nj:'Њ',Dž:'Џ',a:'а',b:'б',c:'ц',č:'ч',ć:'ћ',d:'д',đ:'ђ',e:'е',f:'ф',g:'г',h:'х',i:'и',j:'ј',k:'к',l:'л',m:'м',n:'н',o:'о',p:'п',r:'р',s:'с',š:'ш',t:'т',u:'у',v:'в',z:'з',ž:'ж' };
function toCyr(t) { // для озвучки: голос лучше читает кириллицу
  let o = '', i = 0;
  while (i < t.length) {
    const two = t.slice(i, i + 2);
    if (LAT2CYR[two]) { o += LAT2CYR[two]; i += 2; continue; }
    const c = t[i], l = c.toLowerCase();
    if (LAT2CYR[l]) o += c === l ? LAT2CYR[l] : LAT2CYR[l].toUpperCase(); else o += c;
    i++;
  }
  return o;
}
function norm(t) {
  t = t.toLowerCase().replace(/[а-яёђјљњћџ]/g, c => CYR2LAT[c] ?? c);
  t = t.replace(/đ/g, 'dj').replace(/dž/g, 'dz').normalize('NFD').replace(/[̀-ͯ]/g, '');
  t = t.replace(/ije/g, 'e').replace(/([bcdfghklmnprstvz])je/g, '$1e'); // иекавица = екавица при проверке
  return t.replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function sim(a, b) {
  a = norm(a); b = norm(b);
  if (a === b) return 1;
  const m = a.length, n = b.length; if (!m || !n) return 0;
  let p = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const c = [i];
    for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    p = c;
  }
  return 1 - p[n] / Math.max(m, n);
}


// ---------- автоматический подбор эмодзи по словам ----------
const EMO = [
 [['kaf','кофе','espreso','kapu'],'☕'],[['mlijek','mlek','молок'],'🥛'],[['hljeb','hleb','хлеб','pekar','пекар'],'🍞'],
 [['voda','vode','vodu','вод'],'💧'],[['pivo','пиво'],'🍺'],[['vino','вино'],'🍷'],[['sir ','сыр'],'🧀'],[['meso','мяс'],'🥩'],
 [['riba','ribe','рыб'],'🐟'],[['jaj','яйц'],'🥚'],[['jabuk','voće','voce','яблок','фрукт'],'🍎'],[['sok','сок'],'🧃'],[['čaj','caj','чай'],'🍵'],[['supa','суп'],'🍲'],
 [['kartic','карт'],'💳'],[['gotovin','novac','наличн','деньг'],'💵'],
 [['jeftin','dešev','desev','popust','скидк','дешев'],'🏷️'],[['košta','kosta','cijen','cen','стоит','цен','eur','евро','koliko'],'💶'],
 [['kesa','пакет'],'🛍️'],[['račun','racun','счёт','счет','чек'],'🧾'],[['jelovnik','меню'],'📋'],[['slobodan sto','sto ','stol','столик','стол'],'🪑'],
 [['preporuč','preporuc','порекоменд'],'🤔'],[['hvala','спасиб','odlič','odlic','отличн'],'🙏'],
 [['dobar dan','dobro jutro','zdravo','добрый','здравств','привет','jutro','утр'],'👋'],[['doviđ','dovid','ćao','cao','свидан','пока'],'👋'],
 [['izvin','oprost','извин','prostite'],'🙏'],[['gdje','gde ','где'],'📍'],[['autobus','автобус'],'🚌'],[['taksi','такси'],'🚕'],[['voz','poезд','поезд'],'🚆'],
 [['apotek','аптек'],'💊'],[['ljekar','doktor','врач','boli','болит','bolnic'],'🩺'],[['hotel','soba','номер','отел'],'🏨'],
 [['plaž','plaz','пляж'],'🏖️'],[['more','море'],'🌊'],[['auto','машин'],'🚗'],[['benzin','бензин'],'⛽'],[['telefon','телефон'],'📱'],
 [['vrijeme','vreme','погод','kiš','dožd','дожд'],'🌦️'],[['kuć','kuc','dom','дом'],'🏠'],[['porodic','семь'],'👪'],[['posao','работ'],'💼'],
 [['razumij','razumem','понима','govor','говор'],'🗣️'],[['sporije','polako','медленн'],'🐢'],[['pomoć','pomoc','помо'],'🆘'],[['toalet','туалет'],'🚻'],
 [['restoran','jelo','ručak','rucak','večer','ресторан','еда','обед','ужин'],'🍽️'],[['sjedi','sjest','сесть','садит'],'🪑']
].map(([k, e]) => [k.map(x => norm(x)), e]);
function guessEmoji(sr, ru) {
  const t = ' ' + norm(sr + ' ' + ru) + ' ';
  for (const [keys, e] of EMO) for (const k of keys) {
    if (!k) continue;
    if (k.includes(' ') ? t.includes(' ' + k.trim()) : t.includes(' ' + k)) return e;
  }
  return '';
}
function fillEmoji() { let ch = false; for (const c of S.cards) if (!c.em && !c.noEm) { const e = guessEmoji(c.sr, c.ru); if (e) { c.em = e; ch = true; } } if (ch) save(); }

// ---------- озвучка и распознавание ----------
function pickVoice() {
  const v = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
  return v.find(x => /^sr/i.test(x.lang)) || v.find(x => /^(hr|bs)/i.test(x.lang)) || null;
}
function speak(text) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(toCyr(text));
  const v = pickVoice(); u.lang = v ? v.lang : 'sr-RS'; if (v) u.voice = v; u.rate = 0.9;
  speechSynthesis.speak(u);
}
if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => {};
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

// ---------- мелкие помощники ----------
const app = document.getElementById('app');
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const k in (attrs || {})) {
    if (k === 'class') e.className = attrs[k];
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
    else e.setAttribute(k, attrs[k]);
  }
  for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}
function show(...nodes) { app.replaceChildren(...nodes); window.scrollTo(0, 0); }
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const dueCards = () => S.cards.filter(c => c.due <= Date.now());

// ---------- главный экран ----------
function home() {
  const due = dueCards().length, total = S.cards.length;
  const sameDay = S.todayDay === dayStr();
  show(
    h('h1', null, 'Srpski'),
    h('div', { class: 'stats' },
      h('div', null, h('b', null, total), h('span', { class: 'mut' }, 'фраз')),
      h('div', null, h('b', null, due), h('span', { class: 'mut' }, 'к повтору')),
      h('div', null, h('b', null, S.streak), h('span', { class: 'mut' }, 'дней подряд'))),
    h('div', { class: 'card' },
      h('div', { class: 'mut' }, 'Сегодня выполнено заданий: ' + (sameDay ? S.today : 0)),
      h('button', { onclick: () => startSession(false) }, due ? 'Учить (' + Math.min(due, 10) + ')' : 'Повторить всё равно'),
      total < 2 ? h('div', { class: 'mut' }, 'Добавь хотя бы 2 фразы.') : null),
    h('button', { class: 'sec', onclick: addView }, '➕ Добавить фразу'),
    h('button', { class: 'sec', onclick: listView }, '📚 Все фразы'),
    h('button', { class: 'sec', onclick: ioView }, '⇄ Импорт / копия')
  );
}

// ---------- добавить / список / импорт ----------
function addView(editId) {
  const ed = typeof editId === 'string' ? S.cards.find(c => c.id === editId) : null;
  const sr = h('input', { placeholder: 'По-сербски (латиницей)', value: ed ? ed.sr : '', autocapitalize: 'off' });
  const ru = h('input', { placeholder: 'По-русски', value: ed ? ed.ru : '' });
  const em = h('input', { placeholder: 'Эмодзи (не обязательно, подберу сам)', value: ed ? (ed.em || '') : '' });
  const msg = h('div', { class: 'mut' });
  const go = () => {
    const a = sr.value.trim(), b = ru.value.trim();
    if (!a || !b) { msg.textContent = 'Заполни оба поля.'; return; }
    if (ed) { ed.sr = a; ed.ru = b; ed.em = em.value.trim(); ed.noEm = !ed.em; if (!ed.em) { ed.em = guessEmoji(a, b); ed.noEm = false; } save(); return listView(); }
    S.cards.push({ id: uid(), sr: a, ru: b, em: em.value.trim() || guessEmoji(a, b), box: 0, due: 0, ok: 0, bad: 0 }); save();
    sr.value = ''; ru.value = ''; em.value = ''; msg.textContent = '✓ Добавлено (' + S.cards.length + ')'; sr.focus();
  };
  show(h('h1', null, ed ? 'Изменить фразу' : 'Новая фраза'),
    h('div', { class: 'card' }, sr, ru, em, h('button', { onclick: go }, ed ? 'Сохранить' : 'Добавить'), msg),
    h('button', { class: 'sec', onclick: ed ? listView : home }, 'Назад'));
}
function listView() {
  const items = S.cards.length ? S.cards.map(c => h('div', { class: 'item' },
    h('div', { class: 'em' }, c.em || ''), h('div', null, h('div', null, c.sr), h('div', { class: 'mut' }, c.ru)),
    h('button', { class: 'small sec', onclick: () => speak(c.sr) }, '🔊'),
    h('button', { class: 'small sec', onclick: () => addView(c.id) }, '✏️'),
    h('button', { class: 'small sec', onclick: () => { if (confirm('Удалить фразу?')) { (S.deleted = S.deleted || []).push(norm(c.sr)); S.cards = S.cards.filter(x => x !== c); save(); listView(); } } }, '🗑'))) : [h('div', { class: 'mut' }, 'Пока пусто.')];
  show(h('h1', null, 'Все фразы'), h('div', { class: 'card' }, items), h('button', { class: 'sec', onclick: home }, 'Назад'));
}
function ioView() {
  const ta = h('textarea', { rows: 8, placeholder: 'Вставь строки: по-сербски | по-русски | эмодзи\nили копию (JSON)' });
  const out = h('textarea', { rows: 5, readonly: 'readonly' }); out.value = JSON.stringify(S.cards.map(c => ({ sr: c.sr, ru: c.ru, em: c.em || '' })));
  const msg = h('div', { class: 'mut' });
  const imp = () => {
    let list = [];
    const t = ta.value.trim();
    try { const j = JSON.parse(t); list = (Array.isArray(j) ? j : j.cards || []).map(x => [x.sr, x.ru, x.em]); }
    catch (e) { list = t.split('\n').map(l => l.split('|').map(s => s.trim())).filter(p => p.length >= 2 && p[0] && p[1]); }
    let n = 0;
    for (const [a, b, e] of list) { const old = S.cards.find(c => norm(c.sr) === norm(a)); if (old) { if (!old.em) { const g = e || guessEmoji(old.sr, old.ru); if (g) { old.em = g; n++; } } } else if (a && b) { S.cards.push({ id: uid(), sr: a, ru: b, em: e || guessEmoji(a, b), box: 0, due: 0, ok: 0, bad: 0 }); n++; } }
    save(); msg.textContent = 'Добавлено: ' + n; ta.value = '';
  };
  show(h('h1', null, 'Импорт / копия'),
    h('div', { class: 'card' }, h('h2', null, 'Импорт'), ta, h('button', { onclick: imp }, 'Добавить'), msg),
    h('div', { class: 'card' }, h('h2', null, 'Копия всех фраз'), out,
      h('button', { class: 'sec', onclick: () => { out.select(); try { navigator.clipboard.writeText(out.value); } catch (e) {} } }, 'Скопировать'),
      h('div', { class: 'mut' }, 'Фразы хранятся только в этом браузере. Сохрани копию, прежде чем чистить данные или менять телефон.')),
    h('button', { class: 'sec', onclick: home }, 'Назад'));
}

// ---------- занятие ----------
let Q = [], total = 0, done = 0, right = 0;
function startSession(again) {
  if (S.cards.length < 2) { return addView(); }
  let pool = dueCards();
  if (!pool.length) pool = S.cards;
  pool = shuffle(pool).slice(0, 10);
  Q = pool.map(c => ({ card: c, type: pickType(c), retry: false }));
  total = Q.length; done = 0; right = 0;
  next();
}
function pickType(c) {
  const t = ['choice', 'choiceRev'];
  if (c.box >= 1) t.push('type', 'listen');
  if (c.box >= 2 && SR) t.push('speak');
  if (c.box >= 2) t.push('type');
  return t[Math.random() * t.length | 0];
}
function bump(card, ok) {
  if (ok) { card.box = Math.min(card.box + 1, INTERVALS.length - 1); card.ok++; }
  else { card.box = Math.max(card.box - 1, 0); card.bad++; }
  card.due = ok ? Date.now() + INTERVALS[card.box] * DAY : Date.now();
  if (ok && card.box === 0) card.due = Date.now() + 5 * 6e4;
  S.today = (S.todayDay === dayStr() ? S.today : 0) + 1; S.todayDay = dayStr();
  save();
}
function finish() {
  const t = dayStr();
  if (S.lastDay !== t) {
    const y = new Date(Date.now() - DAY).toISOString().slice(0, 10);
    S.streak = S.lastDay === y ? S.streak + 1 : 1; S.lastDay = t; save();
  }
  show(h('h1', null, '🎉 Готово!'),
    h('div', { class: 'card' }, h('div', { class: 'big' }, right + ' из ' + total + ' с первого раза'), h('div', null, 'Дней подряд: ' + S.streak)),
    h('button', { onclick: () => startSession() }, 'Ещё раз'), h('button', { class: 'sec', onclick: home }, 'На главный'));
}
function progress() { return h('div', { class: 'bar' }, h('i', { style: 'width:' + (done / total * 100) + '%' })); }
function next() {
  if (!Q.length) return finish();
  const ex = Q.shift(), c = ex.card;
  const others = shuffle(S.cards.filter(x => x !== c)).slice(0, 3);
  let type = ex.type;
  if ((type === 'choice' || type === 'choiceRev') && !others.length) type = 'type';
  const result = (ok, almost) => {
    if (!ex.retry) { bump(c, ok); if (ok) right++; }
    if (!ok) Q.push({ card: c, type: 'type', retry: true });
    if (ok) done++; // полоска растёт только за верные ответы
    const fb = h('div', { class: 'fb ' + (ok ? 'ok' : 'no') }, ok ? (almost ? '✓ Почти! Правильно: ' + c.sr : '✓ Верно!') : ['✗ Правильно: ', h('b', null, c.sr), ' — ' + c.ru]);
    box.querySelectorAll('button,input').forEach(e => e.disabled = true);
    box.append(fb, h('button', { onclick: () => next() }, 'Дальше'));
    speak(c.sr);
  };
  const box = h('div', { class: 'card' });
  if (c.em) box.append(h('div', { class: 'emb' }, c.em));
  const head = [progress()];
  const optBtns = (correct, label, opts) => shuffle(opts).map(o => h('button', { class: 'opt', onclick: ev => { ev.target.style.borderColor = o === correct ? 'var(--ok)' : 'var(--bad)'; result(o === correct); } }, label(o)));
  if (type === 'choice') {
    box.append(h('div', { class: 'mut' }, 'Что значит по-русски?'), h('div', { class: 'big' }, c.sr, ' ', h('button', { class: 'small sec', onclick: () => speak(c.sr) }, '🔊')),
      ...optBtns(c, x => x.ru, [c, ...others])); speak(c.sr);
  } else if (type === 'choiceRev') {
    box.append(h('div', { class: 'mut' }, 'Как сказать по-сербски?'), h('div', { class: 'big' }, c.ru),
      ...optBtns(c, x => x.sr, [c, ...others]));
  } else if (type === 'type' || type === 'listen') {
    const inp = h('input', { placeholder: 'Напиши по-сербски', autocapitalize: 'off', autocomplete: 'off' });
    const check = () => { const s = sim(inp.value, c.sr); result(s >= 0.85, s < 1 && s >= 0.85); };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
    if (type === 'type') box.append(h('div', { class: 'mut' }, 'Напиши по-сербски:'), h('div', { class: 'big' }, c.ru));
    else { box.append(h('div', { class: 'mut' }, 'Послушай и напиши, что услышал:'), h('button', { class: 'sec', onclick: () => speak(c.sr) }, '🔊 Послушать')); speak(c.sr); }
    box.append(inp, h('button', { onclick: check }, 'Проверить'));
    setTimeout(() => inp.focus(), 50);
  } else { // speak
    const st = h('div', { class: 'mut' }, 'Нажми и произнеси вслух.');
    box.append(h('div', { class: 'mut' }, 'Скажи по-сербски:'), h('div', { class: 'big' }, c.ru),
      h('button', { onclick: () => {
        const r = new SR(); r.lang = 'sr-RS'; r.maxAlternatives = 3;
        st.textContent = '🎤 Слушаю…';
        r.onresult = e => { let best = 0, said = ''; for (const a of e.results[0]) { const s = sim(a.transcript, c.sr); if (s >= best) { best = s; said = a.transcript; } }
          st.textContent = 'Я услышал: ' + said; result(best >= 0.8, best < 1 && best >= 0.8); };
        r.onerror = () => { st.textContent = 'Не расслышал. Попробуй ещё раз.'; };
        r.start();
      } }, '🎤 Говорить'), st,
      h('button', { class: 'sec', onclick: () => { Q.push({ card: c, type: 'type', retry: ex.retry }); next(); } }, 'Не могу говорить — другое задание'));
  }
  show(...head, box, h('button', { class: 'sec', onclick: home }, 'Закончить'));
}

// фразы из общего файла phrases.json: добавляются сами; удалённые тобой не возвращаются
async function syncPhrases() {
  try {
    const r = await fetch('phrases.json?' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    const list = await r.json(); let n = 0; S.deleted = S.deleted || [];
    for (const p of list) {
      if (!p.sr || !p.ru) continue;
      const k = norm(p.sr); if (S.deleted.includes(k)) continue;
      const old = S.cards.find(c => norm(c.sr) === k);
      if (old) { if (!old.em && p.em) { old.em = p.em; n++; } }
      else { S.cards.push({ id: uid(), sr: p.sr, ru: p.ru, em: p.em || guessEmoji(p.sr, p.ru), box: 0, due: 0, ok: 0, bad: 0 }); n++; }
    }
    if (n) { fillEmoji(); save(); if (document.querySelector('.stats')) home(); }
  } catch (e) {}
}
fillEmoji();
home();
syncPhrases();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
