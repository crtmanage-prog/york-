/* ============================================================
   ТЕСТ НА УРОВЕНЬ: адаптивный подбор заданий, оценка по шкале CEFR.
   Банк заданий вставляется между маркерами BANK-START / BANK-END (tools/leveltest/build_test.py).
   Уровни: 0=A1 ... 5=C2. Оценка уровня: байесовская (MAP) по модели с угадыванием.
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
const SKILL_TITLE = { G:'Грамматика', V:'Словарь', R:'Чтение', L:'Аудирование', U:'Use of English' };

/* ---------- маркетинговые вставки между заданиями ---------- */
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
        p:'Мы разбираем необычные слова и идиомы с озвучкой в Telegram-канале YORK!. Откройте его в соседней вкладке, а мы подождём: тест не ограничен по времени.',
        cta:{ t:'Открыть Telegram-канал', u:TG_URL } },
  F3: { tag:'Дальше аудирование', h:'Включите звук или наденьте наушники',
        p:'Каждую запись можно прослушать два раза. А если хочется слушать английский больше, заходите на наш YouTube: живая речь, разборы и советы по обучению.',
        cta:{ t:'Смотреть на YouTube', u:YT_URL } },
  F4: { tag:'Финишная прямая', h:'Последний блок, и вы у цели',
        p:'Пройдите тест до конца и заберите 10% скидку на первый месяц обучения. Мы покажем ваш уровень отдельно по грамматике, словарю, чтению и аудированию.',
        cta:{ t:'Посмотреть цены', u:'index.html#formats' } }
};

/* ---------- состояние ---------- */
const SUPABASE_URL = 'https://uuwtarchkltdmaddndgm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_jlcvNafksQ0WhrYCY08anw_ju194-I9';

let selectedFormat = 'express';
let plan = [];            // шаги: {k:'Q', s:'G'} | {k:'P'} | {k:'promo', id}
let stepIdx = 0;
let queue = [];           // подготовленные вопросы (например, 3 вопроса одного текста)
let answers = [];         // {skill, level, correct, dk, n}
let used = {};            // {G:Set, ...}
let cur = null;           // текущий вопрос
let picked = null;        // индекс варианта, -1 = «не знаю»
let totalQ = 0, doneQ = 0;
let startedAt = 0;
let pendingResult = null;
let audioEl = null, audioPlays = 0, audioStarted = false;

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
function targetLevel(){
  const th = answers.length ? estimate(answers) : -0.4;
  return Math.max(0, Math.min(5, Math.round(th + 2.4)));
}

/* ---------- построение теста ---------- */
function buildPlan(fmt){
  const rep = (k, n) => Array.from({ length: n }, () => ({ k:'Q', s:k }));
  if (fmt === 'express'){
    const seq = 'G G V G R G L V G U G R L V G'.split(' ');
    const steps = [];
    seq.forEach((s, i) => {
      steps.push({ k:'Q', s });
      if (i === 4) steps.push({ k:'promo', id:'E1' });
      if (i === 9) steps.push({ k:'promo', id:'E2' });
    });
    return steps;
  }
  return [].concat(rep('G', 15), [{ k:'promo', id:'F1' }], rep('V', 10), [{ k:'promo', id:'F2' }],
    [{ k:'P' }, { k:'P' }, { k:'P' }], [{ k:'promo', id:'F3' }], rep('L', 8), [{ k:'promo', id:'F4' }], rep('U', 8));
}

function startQuiz(fmt){
  if (fmt) selectedFormat = fmt;
  plan = buildPlan(selectedFormat);
  totalQ = selectedFormat === 'express' ? 15 : 50;
  stepIdx = 0; queue = []; answers = []; used = {}; cur = null; doneQ = 0;
  startedAt = Date.now();
  showScreen('quiz');
  advance();
}

function takeFrom(skill, target){
  const pool = BANK[skill];
  used[skill] = used[skill] || new Set();
  let cands = [];
  pool.forEach((it, i) => { if (!used[skill].has(i)) cands.push({ i, d: Math.abs(it[0] - target) + Math.random() * 0.5 }); });
  if (!cands.length) return null;
  cands.sort((a, b) => a.d - b.d);
  used[skill].add(cands[0].i);
  return { it: pool[cands[0].i], i: cands[0].i };
}

function makeQuestion(skill, tgt){
  const t = takeFrom(skill, tgt);
  if (!t) return null;
  const it = t.it;
  if (skill === 'G' || skill === 'V' || skill === 'U') return { skill, level:it[0], text:it[1], options:it[2], answer:it[3] };
  if (skill === 'R') return { skill, level:it[0], passage:it[1], text:it[2], options:it[3], answer:it[4] };
  if (skill === 'L') return { skill, level:it[0], audio:'assets/leveltest/' + it[1] + '.mp3', text:it[2], options:it[3], answer:it[4] };
}

function nextFromPlan(){
  while (stepIdx < plan.length){
    const st = plan[stepIdx++];
    if (st.k === 'promo') return { promo: st.id };
    if (st.k === 'Q'){ const q = makeQuestion(st.s, targetLevel()); if (q) return { q }; continue; }
    if (st.k === 'P'){
      const tgt = targetLevel();
      used.P = used.P || new Set();
      const c = BANK.P.map((p, i) => ({ i, d: Math.abs(p[0] - tgt) + Math.random() * 0.4 })).filter(x => !used.P.has(x.i)).sort((a, b) => a.d - b.d);
      if (!c.length) continue;
      used.P.add(c[0].i);
      const p = BANK.P[c[0].i];
      p[3].forEach(qq => queue.push({ skill:'R', level:p[0], passage:p[2], passageTitle:p[1], text:qq[0], options:qq[1], answer:qq[2] }));
      return { q: queue.shift() };
    }
  }
  return null;
}

function advance(){
  let nx = null;
  if (queue.length) nx = { q: queue.shift() };
  else nx = nextFromPlan();
  if (!nx){ finishQuiz(); return; }
  if (nx.promo){ renderPromo(nx.promo); return; }
  renderQuestion(nx.q);
}

/* ---------- экраны ---------- */
function renderPromo(id){
  const p = PROMOS[id];
  document.getElementById('promoTag').textContent = p.tag;
  document.getElementById('promoH').textContent = p.h;
  document.getElementById('promoP').textContent = p.p;
  const a = document.getElementById('promoCta');
  a.textContent = p.cta.t + ' →';
  a.href = p.cta.u;
  const ext = /^https?:/.test(p.cta.u);
  a.target = '_blank'; a.rel = 'noopener';
  showScreen('promo');
}
function promoContinue(){ showScreen('quiz'); advance(); }

function stopAudio(){ if (audioEl){ try { audioEl.pause(); } catch(e){} audioEl = null; } }

function renderQuestion(q){
  stopAudio();
  cur = q; picked = null; audioPlays = 0; audioStarted = !q.audio;
  document.getElementById('qcount').textContent = `ЗАДАНИЕ ${doneQ + 1} ИЗ ${totalQ} · ${SKILL_TITLE[q.skill].toUpperCase()}`;
  document.getElementById('pfill').style.width = Math.round(doneQ / totalQ * 100) + '%';

  const pass = document.getElementById('passage');
  if (q.passage){
    pass.style.display = 'block';
    pass.innerHTML = (q.passageTitle ? '<div class="passage-title"></div>' : '') + '<div class="passage-text"></div>';
    if (q.passageTitle) pass.querySelector('.passage-title').textContent = q.passageTitle;
    pass.querySelector('.passage-text').textContent = q.passage;
  } else { pass.style.display = 'none'; pass.innerHTML = ''; }

  const au = document.getElementById('audioBox');
  if (q.audio){
    au.style.display = 'flex';
    const btn = document.getElementById('audioBtn');
    btn.disabled = false;
    btn.classList.remove('playing');
    document.getElementById('audioLabel').textContent = 'Нажмите, чтобы прослушать (можно 2 раза)';
  } else au.style.display = 'none';

  document.getElementById('qtext').textContent = q.text;
  const wrap = document.getElementById('options');
  wrap.innerHTML = '';
  wrap.classList.toggle('locked', !audioStarted);
  q.options.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'opt'; b.textContent = o;
    b.onclick = () => selectOption(i, b);
    wrap.appendChild(b);
  });
  document.getElementById('dkBtn').onclick = () => selectOption(-1, document.getElementById('dkBtn'));
  document.getElementById('dkBtn').classList.remove('picked');
  document.getElementById('nextBtn').disabled = true;
  document.getElementById('nextBtn').textContent = (doneQ === totalQ - 1) ? 'Показать результат' : 'Далее';
}

function playAudio(){
  if (!cur || !cur.audio || audioPlays >= 2) return;
  stopAudio();
  audioEl = new Audio(cur.audio);
  const btn = document.getElementById('audioBtn'), lab = document.getElementById('audioLabel');
  audioPlays++;
  btn.classList.add('playing'); btn.disabled = true;
  lab.textContent = 'Звучит запись…';
  const unlock = () => { audioStarted = true; document.getElementById('options').classList.remove('locked'); };
  audioEl.addEventListener('playing', unlock);
  audioEl.addEventListener('ended', () => {
    btn.classList.remove('playing');
    if (audioPlays < 2){ btn.disabled = false; lab.textContent = 'Прослушать ещё раз (осталась 1 попытка)'; }
    else lab.textContent = 'Запись прослушана 2 раза';
  });
  audioEl.addEventListener('error', () => {
    unlock(); btn.classList.remove('playing'); btn.disabled = false; audioPlays--;
    lab.textContent = 'Не удалось загрузить запись. Проверьте звук и интернет, нажмите ещё раз.';
  });
  audioEl.play().catch(() => {
    unlock(); btn.classList.remove('playing'); btn.disabled = false; audioPlays--;
    lab.textContent = 'Браузер не дал включить звук. Нажмите ещё раз.';
  });
}

function selectOption(i, el){
  if (document.getElementById('options').classList.contains('locked')) return;
  picked = i;
  document.querySelectorAll('#options .opt').forEach(o => o.classList.remove('picked'));
  document.getElementById('dkBtn').classList.remove('picked');
  el.classList.add('picked');
  document.getElementById('nextBtn').disabled = false;
}

function nextQuestion(){
  if (picked === null || !cur) return;
  const dk = picked === -1;
  answers.push({ skill:cur.skill, level:cur.level, correct: !dk && picked === cur.answer, dk, n:cur.options.length });
  doneQ++;
  stopAudio();
  advance();
}

/* ---------- результат ---------- */
function finishQuiz(){
  stopAudio();
  document.getElementById('pfill').style.width = '100%';
  const th = estimate(answers);
  const lvl = levelOf(th);
  const skills = {};
  if (selectedFormat === 'full'){
    Object.keys(SKILL_NAME).forEach(k => {
      const rs = answers.filter(a => a.skill === k);
      if (rs.length >= 2) skills[k] = levelOf(estimate(rs, th, 0.9));
    });
  }
  const right = answers.filter(a => a.correct).length;
  pendingResult = { right, total: answers.length, lvl, skills, sec: Math.round((Date.now() - startedAt) / 1000) };
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
  document.getElementById('resultMeta').textContent = `Правильных ответов: ${r.right} из ${r.total}. Время: ${Math.max(1, Math.round(r.sec / 60))} мин.`;
  showScreen('result');
}

function restart(){ stopAudio(); showScreen('start'); document.getElementById('pfill').style.width = '0%'; }
