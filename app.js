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
function speak(text, rate) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(toCyr(text));
  const v = pickVoice(); u.lang = v ? v.lang : 'sr-RS'; if (v) u.voice = v; u.rate = rate || 0.9;
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
let Q = [], total = 0, done = 0, right = 0, recent = [];
function startSession() {
  if (S.cards.length < 2) return addView();
  let pool = dueCards(); if (!pool.length) pool = S.cards;
  pool = shuffle(pool).slice(0, 10); recent = [];
  Q = pool.map(c => ({ card: c, type: pickType(c) }));
  total = Q.length; done = 0; right = 0;
  if (S.cards.length >= 4 && total >= 4) Q.splice(Math.ceil(total / 2), 0, { match: true });
  next();
}
function pickType(c) {
  let t = ['listenChooseRu', 'listenChooseSr', 'build', 'choice'];
  if (SR) t.push('repeat', 'repeat');
  if (c.box >= 1) { t.push('listenType', 'choiceRev', 'buildListen'); if (SR) t.push('speak', 'speak'); }
  if (c.box >= 2) t.push('type');
  let f = t.filter(x => !recent.includes(x)); if (!f.length) f = t;
  const r = f[Math.random() * f.length | 0];
  recent.push(r); if (recent.length > 2) recent.shift();
  return r;
}
function bump(card, ok) {
  if (ok) { card.box = Math.min(card.box + 1, INTERVALS.length - 1); card.ok++; }
  else { card.box = Math.max(card.box - 1, 0); card.bad++; }
  card.due = ok ? Date.now() + Math.max(INTERVALS[card.box], 0.003) * DAY : Date.now();
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
const progress = () => h('div', { class: 'bar' }, h('i', { style: 'width:' + (done / total * 100) + '%' }));
const listenBtns = c => h('div', { class: 'row' },
  h('button', { class: 'sec', onclick: () => speak(c.sr) }, '🔊 Послушать'),
  h('button', { class: 'sec', onclick: () => speak(c.sr, 0.55) }, '🐢 Медленно'));

function next() {
  if (!Q.length) return finish();
  const ex = Q.shift();
  if (ex.match) return matchEx();
  const c = ex.card, retry = !!ex.retry;
  let type = ex.type;
  const others = shuffle(S.cards.filter(x => x !== c)).slice(0, 3);
  if (/choose|choice/i.test(type) && !others.length) type = 'build';
  const box = h('div', { class: 'card' });
  let locked = false;
  const result = (ok, almost) => {
    if (locked) return; locked = true;
    if (!retry) { bump(c, ok); if (ok) right++; }
    if (ok) done++; else Q.push({ card: c, type: Math.random() < 0.5 ? 'buildListen' : (SR ? 'speak' : 'listenType'), retry: true });
    box.querySelectorAll('button,input').forEach(e => { if (!e.dataset.keep) e.disabled = true; });
    box.append(
      h('div', { class: 'fb ' + (ok ? 'ok' : 'no') }, ok ? (almost ? '✓ Почти! Правильно: ' + c.sr : '✓ Верно!') : ['✗ Правильно: ', h('b', null, c.sr), ' — ' + c.ru]),
      c.em ? h('div', { class: 'emb' }, c.em) : null,
      h('div', { class: 'mut' }, c.sr + ' — ' + c.ru),
      h('button', { onclick: () => next() }, 'Дальше'));
    speak(c.sr);
  };
  const emo = () => c.em ? h('div', { class: 'emb' }, c.em) : null;
  const options = (correct, label, list) => shuffle(list).map(o => h('button', { class: 'opt', onclick: ev => { ev.currentTarget.style.borderColor = o === correct ? 'var(--ok)' : 'var(--bad)'; result(o === correct); } }, label(o)));
  const typeInput = () => {
    const inp = h('input', { placeholder: 'Напиши по-сербски', autocapitalize: 'off', autocomplete: 'off' });
    const check = () => { const s = sim(inp.value, c.sr); result(s >= 0.85, s < 1 && s >= 0.85); };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
    setTimeout(() => inp.focus(), 50);
    return [inp, h('button', { onclick: check }, 'Проверить')];
  };
  const builder = () => {
    const words = c.sr.split(/\s+/);
    const extra = shuffle(others.flatMap(o => o.sr.split(/\s+/)).filter(w => !words.includes(w))).slice(0, 2);
    const ans = h('div', { class: 'ans' }), bank = h('div', { class: 'chips' });
    const chips = shuffle([...words, ...extra]).map(w => { const b = h('button', { class: 'chip' }, w); b.onclick = () => { if (locked) return; (b.parentNode === bank ? ans : bank).append(b); }; return b; });
    bank.append(...chips);
    const check = () => { const s = sim([...ans.children].map(x => x.textContent).join(' '), c.sr); result(s >= 0.95); };
    return [ans, bank, h('button', { onclick: check }, 'Проверить')];
  };
  const speakBox = (label) => {
    const st = h('div', { class: 'mut' }, 'Нажми и скажи вслух.');
    const mic = h('button', { onclick: () => {
      const r = new SR(); r.lang = 'sr-RS'; r.maxAlternatives = 3; st.textContent = '🎤 Слушаю…';
      r.onresult = e => { let best = 0, said = ''; for (const a of e.results[0]) { const s = sim(a.transcript, c.sr); if (s >= best) { best = s; said = a.transcript; } }
        st.textContent = 'Я услышал: ' + said; result(best >= 0.75, best < 1 && best >= 0.75); };
      r.onerror = () => { st.textContent = 'Не расслышал. Нажми и скажи ещё раз.'; };
      r.start();
    } }, '🎤 ' + label);
    const skip = h('button', { class: 'sec', 'data-keep': '1', onclick: () => { if (locked) return; Q.unshift({ card: c, type: 'buildListen', retry }); next(); } }, 'Не могу говорить — другое задание');
    return [mic, st, skip];
  };

  if (type === 'listenChooseRu') {
    box.append(h('div', { class: 'mut' }, '👂 Послушай. Что это значит?'), listenBtns(c), ...options(c, x => x.ru, [c, ...others])); speak(c.sr);
  } else if (type === 'listenChooseSr') {
    box.append(h('div', { class: 'mut' }, '👂 Послушай. Какая это фраза?'), listenBtns(c), ...options(c, x => x.sr, [c, ...others])); speak(c.sr);
  } else if (type === 'listenType') {
    box.append(h('div', { class: 'mut' }, '👂 Послушай и напиши по-сербски:'), listenBtns(c), ...typeInput()); speak(c.sr);
  } else if (type === 'buildListen') {
    box.append(h('div', { class: 'mut' }, '👂 Послушай и собери фразу из слов:'), listenBtns(c), ...builder()); speak(c.sr);
  } else if (type === 'build') {
    box.append(h('div', { class: 'mut' }, 'Собери фразу по-сербски:'), emo(), h('div', { class: 'big' }, c.ru), ...builder());
  } else if (type === 'choice') {
    box.append(h('div', { class: 'mut' }, 'Что значит по-русски?'), emo(), h('div', { class: 'big' }, c.sr), ...options(c, x => x.ru, [c, ...others]));
  } else if (type === 'choiceRev') {
    box.append(h('div', { class: 'mut' }, 'Как сказать по-сербски?'), emo(), h('div', { class: 'big' }, c.ru), ...options(c, x => x.sr, [c, ...others]));
  } else if (type === 'type') {
    box.append(h('div', { class: 'mut' }, 'Напиши по-сербски:'), emo(), h('div', { class: 'big' }, c.ru), ...typeInput());
  } else if (type === 'repeat') {
    box.append(h('div', { class: 'mut' }, '🗣️ Послушай и повтори вслух:'), h('div', { class: 'big' }, c.sr), listenBtns(c), ...speakBox('Повторить')); speak(c.sr);
  } else { // speak
    box.append(h('div', { class: 'mut' }, '🗣️ Скажи по-сербски вслух:'), emo(), h('div', { class: 'big' }, c.ru), ...speakBox('Говорить'));
  }
  show(progress(), box, h('button', { class: 'sec', onclick: home }, 'Закончить'));
}
function matchEx() {
  const cs = shuffle(S.cards).slice(0, 5);
  const left = shuffle(cs), right_ = shuffle(cs);
  let sel = null, left_n = cs.length;
  const box = h('div', { class: 'card' }, h('div', { class: 'mut' }, 'Соедини пары (сначала сербская, потом русская):'));
  const grid = h('div', { class: 'cols' }), colL = h('div'), colR = h('div');
  const mk = (c, side) => { const b = h('button', { class: 'opt' }, side === 'l' ? c.sr : c.ru);
    b.onclick = () => {
      if (side === 'l') { colL.querySelectorAll('button').forEach(x => { if (!x.disabled) x.style.borderColor = ''; }); sel = { c, b }; b.style.borderColor = 'var(--pr)'; speak(c.sr); return; }
      if (!sel) return;
      if (sel.c === c) { sel.b.disabled = b.disabled = true; sel.b.style.borderColor = b.style.borderColor = 'var(--ok)'; sel = null; if (!--left_n) box.append(h('button', { onclick: () => next() }, 'Дальше')); }
      else { b.style.borderColor = 'var(--bad)'; setTimeout(() => { if (!b.disabled) b.style.borderColor = ''; }, 500); }
    }; return b; };
  left.forEach(c => colL.append(mk(c, 'l'))); right_.forEach(c => colR.append(mk(c, 'r')));
  grid.append(colL, colR); box.append(grid);
  show(progress(), box, h('button', { class: 'sec', onclick: home }, 'Закончить'));
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
