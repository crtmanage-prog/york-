/* ============================================================
   ТЕСТ НА УРОВЕНЬ: адаптивный подбор заданий, оценка по шкале CEFR.
   Банк заданий вставляется между маркерами BANK-START / BANK-END (tools/leveltest/build_test.py).
   Уровни: 0=A1 ... 5=C2. Оценка уровня: байесовская (MAP) по модели с угадыванием.
   Тест состоит из блоков (Grammar, Vocabulary, Reading, Listening, Use of English); перед блоком идёт введение,
   между блоками бывают маркетинговые вставки. Можно ходить назад и вперёд по уже показанным заданиям,
   пропускать задания и в конце проверить, на что ещё нет ответа.
   ============================================================ */
/*BANK-START*/const BANK={};/*BANK-END*/

const LV = ['A1','A2','B1','B2','C1','C2'];
const LNAME = ['Beginner','Elementary','Intermediate','Upper-Intermediate','Advanced','Proficiency'];
const LCOPY = [
  "Вы только начинаете путь в английском, и это отличная точка старта. <b>Курс Starter в YORK!</b> поможет уверенно заговорить на базовые темы уже через пару месяцев.",
  "Базовая грамматика и лексика уже есть, но им не хватает уверенности. <b>Курс Elementary в YORK!</b> закрепит основы и снимет страх говорить.",
  "Вы можете общаться на знакомые темы, но сложные конструкции пока «плавают». <b>Курс Intermediate в YORK!</b> прокачает грамматику и словарный запас.",
  "Уверенный разговорный уровень: осталось отточить нюансы и беглость. <b>Курс Upper-Intermediate в YORK!</b> подготовит к свободному общению и работе на английском.",
  "Продвинутый уровень: свободно понимаете сложные тексты и разговоры. <b>Курс Advanced в YORK!</b> отшлифует стиль и профессиональную лексику.",
  "Это уровень, близкий к носителю языка, поздравляем! На занятиях с нами можно шлифовать стиль, идиомы и тонкости речи."
];
const DIFF = [-2.4, -1.4, -0.4, 0.6, 1.6, 2.6];   // трудность задания по уровню
const SLOPE = 1.3;
const SKILL_NAME = { G:'Грамматика', V:'Словарь', R:'Чтение', L:'Аудирование', U:'Use of English' };
const BLK = {
  G:{ ru:'Грамматика', en:'Grammar' }, V:{ ru:'Словарь', en:'Vocabulary' }, R:{ ru:'Чтение', en:'Reading' },
  L:{ ru:'Аудирование', en:'Listening' }, U:{ ru:'Use of English', en:'Use of English' }
};

/* блоки теста: s=навык, n=число заданий, min=ориентировочные минуты */
const BLOCK_DEF = {
  express: [ {s:'G',n:6,min:2}, {s:'V',n:3,min:1}, {s:'R',n:2,min:1,short:true}, {s:'L',n:2,min:1}, {s:'U',n:2,min:1} ],
  full:    [ {s:'G',n:13,min:5}, {s:'V',n:9,min:3}, {s:'R',n:12,min:8,texts:3}, {s:'L',n:8,min:5}, {s:'U',n:8,min:3} ]
};

/* введение перед блоком */
const BLOCK_INTRO = {
  G: { full:'В каждом задании в предложении пропущено слово или часть предложения. Выберите вариант, который подходит грамматически. Задания подстраиваются под ваши ответы: чем увереннее вы отвечаете, тем сложнее становятся вопросы.',
       short:'Выберите вариант, который подходит грамматически. Вопросы подстраиваются под ваши ответы.',
       tip:'Готовиться не нужно. Не пользуйтесь переводчиком и подсказками: так мы точнее определим ваш уровень. Не уверены? Нажмите «Не знаю», это лучше, чем угадывать.' },
  V: { full:'Выберите слово или выражение, которое подходит по смыслу: слова в контексте, фразовые глаголы, устойчивые сочетания.',
       short:'Выберите слово или выражение, которое подходит по смыслу.',
       tip:'Если слова вы не знаете, это нормально. Нажмите «Не знаю» или выберите самый вероятный вариант.' },
  R: { full:'Три текста разной сложности, к каждому по 4 вопроса: 2 на понимание и 2 в формате True / False / Not stated. True: в тексте так и сказано. False: в тексте сказано обратное. Not stated: в тексте об этом ничего нет, даже если в жизни это так.',
       short:'Два коротких текста (сообщения и объявления), к каждому по одному вопросу. Ответ всегда есть в тексте.',
       tip:'Читайте внимательно и опирайтесь только на текст, а не на свои знания. Текст остаётся на экране, пока вы отвечаете на вопросы к нему.' },
  L: { full:'{n} записей, к каждой один вопрос. Перед записью диктор объявит, что вы услышите и что нужно сделать. Каждую запись можно прослушать два раза.',
       short:'{n} записи, каждую можно прослушать два раза. Перед записью диктор объявит, что нужно сделать.',
       tip:'Включите звук или наденьте наушники и найдите тихое место. Варианты ответов откроются, когда вы запустите запись.' },
  U: { full:'В каждом задании четыре предложения, и только одно из них без ошибок. Выберите его.',
       short:'Выберите предложение без ошибок. Это последний блок, дальше результат.',
       tip:'Читайте предложения целиком: ошибка может быть в любом слове, например в форме глагола, артикле или порядке слов. Это последний блок, дальше результат.' }
};

/* ---------- маркетинговые вставки между блоками ---------- */
const TG_URL = 'https://t.me/weyorkonline', YT_URL = 'https://www.youtube.com/@weyorkonline';
const PROMOS = {
  E1: { tag:'Пока вы проходите тест', h:'Английский лучше учится каждый день понемногу',
        p:'В нашем Telegram-канале каждую неделю выходит «Слово недели» с озвучкой и квизы, которые можно решать за чашкой кофе. Загляните, пока тест ждёт вас здесь.',
        cta:{ t:'Открыть Telegram-канал', u:TG_URL } },
  E2: { tag:'Уже больше половины', h:'Осталось совсем немного',
        p:'Пройдите тест до конца и заберите 10% скидку на первый месяц обучения. А ещё мы покажем, какие навыки стоит подтянуть в первую очередь.',
        cta:{ t:'Как проходят занятия', u:'index.html#how' } },
  F1: { tag:'Грамматика позади', h:'Теперь самое интересное: говорить',
        p:'Правила оживают в разговоре. В нашем Talk Club небольшие группы встречаются каждую неделю и болтают на живые темы: от кино до путешествий. Без экзаменов и страха ошибиться.',
        cta:{ t:'Узнать про Talk Club', u:'talk-club.html' } },
  F2: { tag:'Отличная работа', h:'Слова запоминаются в контексте',
        p:'Мы разбираем необычные слова и идиомы с озвучкой в Telegram-канале YORK!. Нажмите кнопку ниже, загляните в канал и возвращайтесь: тест вас подождёт.',
        cta:{ t:'Открыть Telegram-канал', u:TG_URL } },
  F3: { tag:'Дальше аудирование', h:'Включите звук или наденьте наушники',
        p:'Каждую запись можно прослушать два раза. А если хочется слушать английский больше, заходите на наш YouTube: живая речь, разборы и советы по обучению.',
        cta:{ t:'Смотреть на YouTube', u:YT_URL } },
  F4: { tag:'Финишная прямая', h:'Последний блок, и вы у цели',
        p:'Пройдите тест до конца и заберите 10% скидку на первый месяц обучения. Мы покажем ваш уровень отдельно по грамматике, словарю, чтению и аудированию.',
        cta:{ t:'Посмотреть цены', u:'index.html#formats' } }
};
const PROMO_BEFORE = { express:{ 1:'E1', 3:'E2' }, full:{ 1:'F1', 2:'F2', 3:'F3', 4:'F4' } };

/* ---------- состояние ---------- */
const SUPABASE_URL = 'https://uuwtarchkltdmaddndgm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_jlcvNafksQ0WhrYCY08anw_ju194-I9';

let selectedFormat = 'express';
let blocks = [];          // {s,n,min,start,short,texts}
let total = 0;
let hist = [];            // показанные задания (с ответами): {skill,level,text,options,answer,picked,...}
let pos = -1;             // текущее задание в hist
let queue = [];           // вопросы текущего текста (блок Reading в полном тесте)
let used = {};            // использованные задания по навыкам
let textNo = 0;
let pending = [];         // экраны перед блоком: вставка, введение
let introDone = {};
let curBlock = 0;
let retReview = false;    // задание открыто из экрана итогов
let startedAt = 0;
let pendingResult = null;
let audioEl = null;
let inTest = false, leaveOk = false, leaveTimer = null;

function pickFormat(type, el){
  selectedFormat = type;
  document.querySelectorAll('#formatOptions .format-card').forEach(c => c.classList.remove('picked'));
  el.classList.add('picked');
}

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'auto' });
}

/* ---------- оценка уровня ---------- */
function logL(th, r){
  const p = 1 / (1 + Math.exp(-SLOPE * (th - DIFF[r.level])));
  const c = r.dk ? 0 : 1 / r.n;                 // «не знаю» исключает угадывание
  const P = c + (1 - c) * p;
  return Math.log(Math.max(1e-6, r.correct ? P : 1 - P));
}
function estimate(rs, mu, sd){
  mu = (mu === undefined) ? -0.4 : mu; sd = sd || 1.5;
  let best = -1e9, bt = mu;
  for (let th = -4; th <= 4.0001; th += 0.05){
    let s = -((th - mu) * (th - mu)) / (2 * sd * sd);
    for (const r of rs) s += logL(th, r);
    if (s > best){ best = s; bt = th; }
  }
  return bt;
}
function levelOf(th){ return th < -1.9 ? 0 : th < -0.9 ? 1 : th < 0.1 ? 2 : th < 1.1 ? 3 : th < 2.1 ? 4 : 5; }
function answeredList(){
  return hist.filter(h => h.picked !== null).map(h => ({ skill:h.skill, level:h.level, correct:h.picked === h.answer, dk:h.picked === -1, n:h.options.length }));
}
function targetLevel(){
  const a = answeredList();
  const th = a.length ? estimate(a) : -0.4;
  return Math.max(0, Math.min(5, Math.round(th + 2.4)));
}

/* ---------- построение теста ---------- */
function blockIndexOf(i){ for (let b = blocks.length - 1; b >= 0; b--) if (i >= blocks[b].start) return b; return 0; }

function startQuiz(fmt){
  if (fmt) selectedFormat = fmt;
  let st = 0;
  blocks = BLOCK_DEF[selectedFormat].map(b => { const o = Object.assign({}, b, { start: st }); st += b.n; return o; });
  total = st;
  hist = []; pos = -1; queue = []; used = {}; textNo = 0; pending = []; introDone = {}; curBlock = 0; retReview = false;
  startedAt = Date.now();
  inTest = true; leaveOk = false;
  document.getElementById('resetNote').style.display = 'none';
  buildBar();
  advanceNew();
}

function takeFrom(skill, target){
  const pool = BANK[skill];
  used[skill] = used[skill] || new Set();
  const cands = [];
  pool.forEach((it, i) => { if (!used[skill].has(i)) cands.push({ i, d: Math.abs(it[0] - target) + Math.random() * 0.5 }); });
  if (!cands.length) return null;
  cands.sort((a, b) => a.d - b.d);
  used[skill].add(cands[0].i);
  return pool[cands[0].i];
}

function makeQuestion(skill, tgt){
  const it = takeFrom(skill, tgt);
  if (!it) return null;
  const base = { skill, level: it[0], picked: null, plays: 0, started: false };
  if (skill === 'G' || skill === 'V' || skill === 'U') return Object.assign(base, { text:it[1], options:it[2], answer:it[3] });
  if (skill === 'R') return Object.assign(base, { passage:it[1], text:it[2], options:it[3], answer:it[4] });
  if (skill === 'L') return Object.assign(base, { audio:'assets/leveltest/' + it[1] + '.mp3', text:it[2], options:it[3], answer:it[4] });
}

function makeNext(bi){
  const b = blocks[bi], tgt = targetLevel();
  if (b.texts){                                    // Reading в полном тесте: текст и 4 вопроса к нему
    if (!queue.length){
      used.P = used.P || new Set();
      const c = BANK.P.map((p, i) => ({ i, d: Math.abs(p[0] - tgt) + Math.random() * 0.4 })).filter(x => !used.P.has(x.i)).sort((a, z) => a.d - z.d);
      if (!c.length) return null;
      used.P.add(c[0].i);
      const p = BANK.P[c[0].i];
      textNo++;
      p[3].forEach((qq, k) => queue.push({ skill:'R', level:p[0], picked:null, plays:0, started:false, passage:p[2], passageTitle:p[1],
        text:qq[0], options:qq[1], answer:qq[2], fmt: qq[3] ? 'tfns' : 'mcq', textNo, textTotal:b.texts, qNo:k + 1, qTotal:p[3].length }));
    }
    return queue.shift();
  }
  const q = makeQuestion(b.s, tgt);
  if (q && b.short){ q.textNo = (hist.length - b.start) + 1; q.textTotal = b.n; q.qNo = 1; q.qTotal = 1; q.short = true; }
  return q;
}

/* новое задание: на границе блока сначала вставка и введение */
function advanceNew(){
  stopAudio();
  const idx = hist.length, bi = blockIndexOf(idx);
  curBlock = bi;
  if (idx === blocks[bi].start && !introDone[bi]){
    pending = [];
    const pid = PROMO_BEFORE[selectedFormat][bi];
    if (pid) pending.push({ promo: pid });
    pending.push({ intro: bi });
    nextInterlude();
    return;
  }
  produceAndShow();
}
function nextInterlude(){
  const s = pending.shift();
  if (!s){ introDone[curBlock] = true; produceAndShow(); return; }
  if (s.promo) renderPromo(s.promo); else renderIntro(s.intro);
}
function produceAndShow(){
  const q = makeNext(curBlock);
  if (!q){ showReview(); return; }
  q.block = curBlock;
  hist.push(q); pos = hist.length - 1;
  renderQuestion();
}

/* ---------- экраны: введение, вставка ---------- */
function plural(n, a, b, c){ const m = n % 10, h = n % 100; return (m === 1 && h !== 11) ? a : (m >= 2 && m <= 4 && (h < 10 || h >= 20)) ? b : c; }

function renderIntro(bi){
  const b = blocks[bi], info = BLOCK_INTRO[b.s], k = BLK[b.s];
  document.getElementById('introTag').textContent = `Блок ${bi + 1} из ${blocks.length}`;
  document.getElementById('introH').textContent = k.ru === k.en ? k.en : `${k.en}: ${k.ru.toLowerCase()}`;
  const nTxt = b.texts ? `${b.texts} текста, ${b.n} ${plural(b.n, 'вопрос', 'вопроса', 'вопросов')}` : `${b.n} ${plural(b.n, 'задание', 'задания', 'заданий')}`;
  document.getElementById('introMeta').textContent = `${nTxt} · около ${b.min} ${plural(b.min, 'минуты', 'минут', 'минут')}`;
  const doTxt = (selectedFormat === 'express' ? info.short : info.full).replace('{n}', b.n);
  document.getElementById('introDo').textContent = doTxt;
  const tipWrap = document.getElementById('introTipWrap');
  if (selectedFormat === 'express'){ tipWrap.style.display = 'none'; }
  else { tipWrap.style.display = 'block'; document.getElementById('introTip').textContent = info.tip; }
  document.getElementById('introNext').textContent = (bi === blocks.length - 1) ? 'Начать последний блок' : 'Начать блок';
  buildBar(bi);
  showScreen('intro');
}

function renderPromo(id){
  const p = PROMOS[id];
  document.getElementById('promoTag').textContent = p.tag;
  document.getElementById('promoH').textContent = p.h;
  document.getElementById('promoP').textContent = p.p;
  const a = document.getElementById('promoCta');
  a.textContent = p.cta.t + ' →';
  a.href = p.cta.u;
  a.target = '_blank'; a.rel = 'noopener';
  a.onclick = () => { leaveOk = true; clearTimeout(leaveTimer); leaveTimer = setTimeout(() => { leaveOk = false; }, 120000); };
  buildBar(curBlock);
  showScreen('promo');
}
function promoContinue(){ nextInterlude(); }
function introStart(){ nextInterlude(); }

/* ---------- полоса блоков ---------- */
function buildBar(curIdx){
  const bar = document.getElementById('pbar');
  bar.innerHTML = '';
  blocks.forEach((b, i) => {
    const seg = document.createElement('div');
    seg.className = 'pseg'; seg.style.flex = String(b.n); seg.title = BLK[b.s].ru;
    seg.innerHTML = '<i></i>';
    bar.appendChild(seg);
  });
  updateBar(curIdx === undefined ? curBlock : curIdx);
}
function updateBar(curIdx){
  const segs = document.querySelectorAll('#pbar .pseg');
  blocks.forEach((b, i) => {
    const done = hist.filter(h => h.block === i && h.picked !== null).length;
    if (segs[i]){ segs[i].firstChild.style.width = Math.round(done / b.n * 100) + '%'; segs[i].classList.toggle('cur', i === curIdx); }
  });
}

/* ---------- задание ---------- */
function stopAudio(){ if (audioEl){ try { audioEl.pause(); } catch(e){} audioEl = null; } }

function renderQuestion(){
  stopAudio();
  const q = hist[pos], b = blocks[q.block];
  curBlock = q.block;
  const inBlock = pos - b.start + 1;
  document.getElementById('qcount').textContent = `БЛОК ${q.block + 1} ИЗ ${blocks.length} · ${BLK[b.s].ru.toUpperCase()} · ЗАДАНИЕ ${inBlock} ИЗ ${b.n}`;
  updateBar(q.block);

  const pass = document.getElementById('passage'), pinfo = document.getElementById('passageInfo');
  if (q.passage){
    pass.style.display = 'block';
    pass.innerHTML = (q.passageTitle ? '<div class="passage-title"></div>' : '') + '<div class="passage-text"></div>';
    if (q.passageTitle) pass.querySelector('.passage-title').textContent = q.passageTitle;
    pass.querySelector('.passage-text').textContent = q.passage;
    pinfo.style.display = 'block';
    pinfo.textContent = q.short
      ? `Короткий текст ${q.textNo} из ${q.textTotal} · один вопрос к тексту`
      : `Текст ${q.textNo} из ${q.textTotal} · к нему ${q.qTotal} ${plural(q.qTotal, 'вопрос', 'вопроса', 'вопросов')} · сейчас вопрос ${q.qNo} из ${q.qTotal}`;
  } else { pass.style.display = 'none'; pass.innerHTML = ''; pinfo.style.display = 'none'; }

  const au = document.getElementById('audioBox');
  if (q.audio){
    au.style.display = 'flex';
    const btn = document.getElementById('audioBtn');
    btn.disabled = q.plays >= 2; btn.classList.remove('playing');
    document.getElementById('audioLabel').textContent = q.plays === 0
      ? 'Нажмите ▶. Диктор объявит, что вы услышите и что нужно сделать. Запись можно прослушать 2 раза.'
      : (q.plays >= 2 ? 'Запись прослушана 2 раза' : 'Можно прослушать ещё раз (осталась 1 попытка)');
  } else au.style.display = 'none';

  const hint = document.getElementById('qhint');
  if (q.fmt === 'tfns'){
    document.getElementById('qtext').textContent = '«' + q.text + '»';
    hint.style.display = 'block';
    hint.textContent = 'Согласно тексту это утверждение верно (True), неверно (False) или в тексте об этом не сказано (Not stated)?';
  } else { document.getElementById('qtext').textContent = q.text; hint.style.display = 'none'; }

  const locked = !!q.audio && !q.started;
  const wrap = document.getElementById('options');
  wrap.innerHTML = '';
  wrap.classList.toggle('locked', locked);
  q.options.forEach((o, i) => {
    const bt = document.createElement('button');
    bt.className = 'opt' + (q.picked === i ? ' picked' : ''); bt.textContent = o;
    bt.onclick = () => selectOption(i);
    wrap.appendChild(bt);
  });
  const dk = document.getElementById('dkBtn');
  dk.classList.toggle('picked', q.picked === -1);
  dk.onclick = () => selectOption(-1);
  updateNav();
  showScreen('quiz');
}

function updateNav(){
  const q = hist[pos];
  document.getElementById('backBtn').disabled = pos <= 0;
  document.getElementById('fwdBtn').disabled = pos >= hist.length - 1;
  const nb = document.getElementById('nextBtn');
  if (retReview) nb.textContent = 'К итогам';
  else if (pos === hist.length - 1 && hist.length >= total) nb.textContent = 'К итогам';
  else nb.textContent = q.picked !== null ? 'Далее' : 'Пропустить';
  nb.classList.toggle('skip', !retReview && q.picked === null);
}

function playAudio(){
  const q = hist[pos];
  if (!q || !q.audio || q.plays >= 2) return;
  stopAudio();
  audioEl = new Audio(q.audio);
  const btn = document.getElementById('audioBtn'), lab = document.getElementById('audioLabel');
  q.plays++;
  btn.classList.add('playing'); btn.disabled = true;
  lab.textContent = 'Звучит запись…';
  const unlock = () => { q.started = true; if (hist[pos] === q) document.getElementById('options').classList.remove('locked'); };
  audioEl.addEventListener('playing', unlock);
  audioEl.addEventListener('ended', () => {
    if (hist[pos] !== q) return;
    btn.classList.remove('playing');
    if (q.plays < 2){ btn.disabled = false; lab.textContent = 'Можно прослушать ещё раз (осталась 1 попытка)'; }
    else lab.textContent = 'Запись прослушана 2 раза';
  });
  audioEl.addEventListener('error', () => {
    unlock(); btn.classList.remove('playing'); btn.disabled = false; q.plays--;
    lab.textContent = 'Не удалось загрузить запись. Проверьте звук и интернет, нажмите ещё раз.';
  });
  audioEl.play().catch(() => {
    unlock(); btn.classList.remove('playing'); btn.disabled = false; q.plays--;
    lab.textContent = 'Браузер не дал включить звук. Нажмите ещё раз.';
  });
}

function selectOption(i){
  const q = hist[pos];
  if (document.getElementById('options').classList.contains('locked')) return;
  q.picked = i;
  document.querySelectorAll('#options .opt').forEach((o, k) => o.classList.toggle('picked', k === i));
  document.getElementById('dkBtn').classList.toggle('picked', i === -1);
  updateBar(q.block);
  updateNav();
}

/* ---------- навигация: назад, вперёд, дальше ---------- */
function goBack(){ if (pos <= 0) return; retReview = false; pos--; renderQuestion(); }
function goForward(){ if (pos >= hist.length - 1) return; retReview = false; pos++; renderQuestion(); }
function nextQuestion(){
  stopAudio();
  if (retReview){ showReview(); return; }
  if (pos < hist.length - 1){ pos++; renderQuestion(); return; }
  if (hist.length >= total){ showReview(); return; }
  advanceNew();
}

/* ---------- итоги: что отвечено, что пропущено ---------- */
function showReview(){
  stopAudio(); retReview = false;
  const un = hist.filter(h => h.picked === null).length;
  const dk = hist.filter(h => h.picked === -1).length;
  document.getElementById('rvSummary').innerHTML = un
    ? `Отвечено на <b>${hist.length - un}</b> из ${total}. Без ответа: <b>${un}</b>. Вернитесь к ним сейчас или завершите тест: задания без ответа будут считаться как «Не знаю».`
    : `Вы ответили на все ${total} ${plural(total, 'задание', 'задания', 'заданий')}. ${dk ? `Ответов «Не знаю»: ${dk}.` : ''} Можно вернуться к любому заданию или завершить тест.`;
  const grid = document.getElementById('rvGrid');
  grid.innerHTML = '';
  blocks.forEach((b, bi) => {
    const h = document.createElement('div'); h.className = 'rv-block'; h.textContent = BLK[b.s].ru; grid.appendChild(h);
    const row = document.createElement('div'); row.className = 'rv-row';
    hist.forEach((q, i) => {
      if (q.block !== bi) return;
      const t = document.createElement('button');
      t.type = 'button';
      t.className = 'rv-tile ' + (q.picked === null ? 'un' : q.picked === -1 ? 'dk' : 'ok');
      t.textContent = String(i + 1);
      t.setAttribute('aria-label', `Задание ${i + 1}: ` + (q.picked === null ? 'нет ответа' : q.picked === -1 ? 'не знаю' : 'есть ответ'));
      t.onclick = () => openFromReview(i);
      row.appendChild(t);
    });
    grid.appendChild(row);
  });
  document.getElementById('rvBack').style.display = un ? 'flex' : 'none';
  buildBar(-1);
  showScreen('review');
}
function openFromReview(i){ retReview = true; pos = i; renderQuestion(); }
function reviewFirstUnanswered(){ const i = hist.findIndex(h => h.picked === null); if (i >= 0) openFromReview(i); }

/* ---------- результат ---------- */
function finishQuiz(){
  inTest = false;
  stopAudio();
  const all = hist.map(h => ({ skill:h.skill, level:h.level, correct:h.picked !== null && h.picked === h.answer, dk:h.picked === null || h.picked === -1, n:h.options.length }));
  const th = estimate(all);
  const lvl = levelOf(th);
  const skills = {};
  if (selectedFormat === 'full'){
    Object.keys(SKILL_NAME).forEach(k => {
      const rs = all.filter(a => a.skill === k);
      if (rs.length >= 2) skills[k] = levelOf(estimate(rs, th, 0.9));
    });
  }
  const answered = hist.filter(h => h.picked !== null).length;
  pendingResult = { right: all.filter(a => a.correct).length, total: hist.length, answered, lvl, skills, sec: Math.round((Date.now() - startedAt) / 1000) };
  saveResultQuietly();
  revealResult();
}

function cabinetSession(){
  try {
    const raw = localStorage.getItem('sb-uuwtarchkltdmaddndgm-auth-token');
    if (!raw) return null;
    let s = JSON.parse(raw);
    if (s && s.currentSession) s = s.currentSession;
    if (!s || !s.access_token || !s.user || !s.user.id) return null;
    if ((s.expires_at || 0) * 1000 < Date.now() + 30000) return null;
    return { token: s.access_token, uid: s.user.id };
  } catch (e){ return null; }
}

async function saveResultQuietly(){
  try {
    const sess = cabinetSession();
    const sk = {};
    Object.keys(pendingResult.skills).forEach(k => sk[k] = LV[pendingResult.skills[k]]);
    const body = {
      test_type: selectedFormat,
      score: pendingResult.right,
      max_score: pendingResult.total,
      level: LV[pendingResult.lvl],
      level_name: LNAME[pendingResult.lvl],
      duration_sec: Math.min(pendingResult.sec, 86399)
    };
    if (Object.keys(sk).length) body.skills = sk;
    if (sess) body.student_id = sess.uid;
    await fetch(`${SUPABASE_URL}/rest/v1/level_test_results`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + (sess ? sess.token : SUPABASE_ANON_KEY),
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(body)
    });
  } catch (e){ /* статистика необязательна: результат уже показан */ }
}

function revealResult(){
  const r = pendingResult;
  document.getElementById('levelLetters').textContent = LV[r.lvl];
  document.getElementById('levelName').textContent = LNAME[r.lvl];
  document.getElementById('levelCopy').innerHTML = LCOPY[r.lvl];

  const sk = document.getElementById('skills');
  const keys = Object.keys(r.skills);
  if (keys.length){
    sk.style.display = 'block';
    document.getElementById('skillRows').innerHTML = keys.map(k =>
      `<div class="skill-row"><span>${SKILL_NAME[k]}</span><div class="skill-bar"><i style="width:${Math.round((r.skills[k] + 1) / 6 * 100)}%"></i></div><b>${LV[r.skills[k]]}</b></div>`).join('');
  } else sk.style.display = 'none';

  document.getElementById('expressNote').style.display = selectedFormat === 'express' ? 'block' : 'none';
  document.getElementById('resultMeta').textContent = `Заданий в тесте: ${r.total}. Ответов дано: ${r.answered}. Время: ${Math.max(1, Math.round(r.sec / 60))} мин.`;
  document.getElementById('howCalc').open = false;
  document.getElementById('shareMsg').textContent = '';
  buildBar(-1);
  showScreen('result');
}

/* Поделиться результатом: системное меню «Поделиться», запасной вариант: копирование текста.
   Дизайн карточки для публикации подключается здесь. */
function shareText(){
  const r = pendingResult;
  return `Мой уровень английского: ${LV[r.lvl]} (${LNAME[r.lvl]}). Пройдите тест от YORK! и узнайте свой: https://weyork.online/level-test.html`;
}
async function shareResult(){
  if (!pendingResult) return;
  const msg = document.getElementById('shareMsg');
  const data = { title: 'Мой уровень английского', text: shareText(), url: 'https://weyork.online/level-test.html' };
  try {
    if (navigator.share){ await navigator.share(data); msg.textContent = ''; return; }
    await navigator.clipboard.writeText(data.text);
    msg.textContent = 'Текст скопирован, вставьте его в сообщение.';
  } catch (e){
    if (e && e.name === 'AbortError') return;
    msg.textContent = 'Не удалось поделиться. Скопируйте результат вручную: ' + data.text;
  }
}

function restart(){ inTest = false; stopAudio(); showScreen('start'); }

/* ---------- защита: уход со страницы во время теста сбрасывает тест ---------- */
function testActive(){
  return inTest && ['quiz', 'promo', 'intro', 'review'].some(id => document.getElementById(id).classList.contains('active'));
}
function abortTest(){
  if (!testActive() || leaveOk) return;
  inTest = false; stopAudio();
  hist = []; pos = -1; queue = []; used = {}; pending = []; introDone = {}; pendingResult = null; retReview = false;
  document.getElementById('resetNote').style.display = 'block';
  showScreen('start');
}
document.addEventListener('visibilitychange', () => { if (document.hidden) abortTest(); else leaveOk = false; });
window.addEventListener('blur', () => setTimeout(() => { if (!document.hasFocus()) abortTest(); }, 150));
window.addEventListener('focus', () => { leaveOk = false; });
window.addEventListener('beforeunload', e => { if (testActive()){ e.preventDefault(); e.returnValue = ''; } });
