/* YORK! Тест на уровень: экраны, подбор заданий, прогресс, сохранение результата.
   Зависит от engine.js, texts.js (не нужен тесту), questions.json, sprite.js. */
(function(){
'use strict';
var T = window.YKT, C = T.CONFIG;
var SUPABASE_URL = 'https://uuwtarchkltdmaddndgm.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_jlcvNafksQ0WhrYCY08anw_ju194-I9';
var LS_KEY = 'ykt_progress_v1';
var QJSON = 'assets/yk-test/questions.json';

var QB = null, Qm = {}, Pm = {}, Am = {};
var S = null;                 /* состояние теста */
var root = null;
var fmtPick = 'balance';
var audio = null, audioTick = null;

/* ---------- вспомогательное ---------- */
function esc(s){ return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function u(id){ return '<svg class="ic"><use href="#i-' + id + '"/></svg>'; }
function plural(n, a, b, c){ var m = n % 10, h = n % 100; return (m === 1 && h !== 11) ? a : (m >= 2 && m <= 4 && (h < 10 || h >= 20)) ? b : c; }
function goal(name){ try { if (window.ym) window.ym(111997160, 'reachGoal', name); } catch (e){} }
function lsGet(){ try { var r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; } catch (e){ return null; } }
function lsSet(v){ try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch (e){} }
function lsDel(){ try { localStorage.removeItem(LS_KEY); } catch (e){} }
function qs(name){ try { return new URLSearchParams(location.search).get(name); } catch (e){ return null; } }

var BLK = C.blocks, BRU = C.blockRu, BEN = C.blockEn;

/* ---------- тексты введения в блоки ---------- */
var INTRO = {
  grammar:    { wait:'В каждом предложении пропущено слово или часть предложения. Выберите вариант, который подходит грамматически. <b>Задания подстраиваются под ваши ответы:</b> чем увереннее вы отвечаете, тем сложнее становятся вопросы.',
                prep:'Готовиться не нужно. Не пользуйтесь переводчиком и подсказками: так мы точнее определим ваш уровень. Не уверены? <b>Нажмите «Не знаю»,</b> это лучше, чем угадывать.' },
  vocabulary: { wait:'Выберите слово или выражение, которое подходит по смыслу: слова в контексте, фразовые глаголы, устойчивые сочетания.',
                prep:'Если слово вам незнакомо, это нормально. <b>Нажмите «Не знаю»</b> или выберите самый вероятный вариант.' },
  reading:    { wait:'Вы прочитаете тексты разной сложности. К каждому по четыре задания: два вопроса на понимание и два утверждения в формате True / False / Not stated.',
                prep:'<b>True</b>: в тексте так и сказано. <b>False</b>: в тексте сказано обратное. <b>Not stated</b>: в тексте об этом ничего нет, даже если в жизни это так. Опирайтесь только на текст.' },
  listening:  { wait:'Вы услышите короткие записи: диалоги, объявления, фрагменты лекций. Перед каждой диктор объявит, что вы услышите и что нужно сделать. <b>Каждую запись можно прослушать два раза.</b>',
                prep:'Включите звук или наденьте наушники и найдите тихое место. Нажмите кнопку воспроизведения, когда будете готовы.' },
  use:        { wait:'В каждом задании четыре предложения, и только одно из них без ошибок. Выберите его. Это последний блок, дальше результат.',
                prep:'Читайте предложения целиком: ошибка может быть в любом слове, например в форме глагола, артикле или порядке слов.' }
};

/* ---------- состояние ---------- */
function newState(fmt){
  return { v: 1, format: fmt, startedAt: Date.now(), hist: [], pos: -1, stage: 'intro', curBlock: 0, introDone: {}, finishDone: false, usedQ: [], usedP: [], rd: null, ret: false };
}
function counts(){ return BLK.map(function(b){ return C.formats[S.format].per[b]; }); }
function total(){ return C.formats[S.format].n; }
function blockStart(bi){ var c = counts(), s = 0; for (var i = 0; i < bi; i++) s += c[i]; return s; }
function blockOf(idx){ var c = counts(), s = 0; for (var i = 0; i < c.length; i++){ s += c[i]; if (idx < s) return i; } return c.length - 1; }
function blockMinutes(bi){ var f = C.formats[S.format]; return Math.max(1, Math.round(f.min * counts()[bi] / f.n)); }
function save(){ if (S) lsSet(S); }
function item(h){ return Qm[h.id]; }

/* ---------- подбор заданий (лесенка внутри блока) ---------- */
function answeredList(){
  return S.hist.filter(function(h){ return h.a !== null; }).map(function(h){ var q = item(h); return { block: h.block, level: q.level, correct: h.a === q.answer, dk: h.a === -1, n: q.options.length }; });
}
function targetLevel(block){
  var bh = S.hist.filter(function(h){ return h.block === block; });
  if (!bh.length){
    var a = answeredList();
    if (!a.length) return C.startLevel;
    return T.clamp(Math.round(T.scoreAnswers(a).overall), 1, 5);
  }
  var last = bh[bh.length - 1], q = item(last);
  if (last.a === null) return q.level;
  return T.clamp(q.level + (last.a === q.answer ? 1 : -1), 1, 5);
}
function pickBy(list, level){
  var c = list.map(function(x){ return { x: x, d: Math.abs(x.level - level) + Math.random() * 0.5 }; });
  c.sort(function(a, b){ return a.d - b.d; });
  return c.length ? c[0].x : null;
}
function nextItemId(bi){
  var block = BLK[bi], fmt = S.format, tgt = targetLevel(block);
  if (block === 'reading'){
    if (S.rd && S.rd.queue.length) return S.rd.queue.shift();
    var left = counts()[bi] - S.hist.filter(function(h){ return h.block === 'reading'; }).length;
    if (left <= 0) return null;
    var ps = QB.passages.filter(function(p){ return S.usedP.indexOf(p.id) < 0; });
    var p = pickBy(ps, tgt);
    if (!p) return null;
    S.usedP.push(p.id);
    var ids = QB.questions.filter(function(q){ return q.passage_id === p.id && q.formats.indexOf(fmt) >= 0; }).map(function(q){ return q.id; }).slice(0, left);
    S.rd = { pid: p.id, queue: ids.slice(1), total: ids.length, no: S.usedP.length };
    return ids[0];
  }
  var pool = QB.questions.filter(function(q){ return q.block === block && q.formats.indexOf(fmt) >= 0 && S.usedQ.indexOf(q.id) < 0; });
  var q = pickBy(pool, tgt);
  return q ? q.id : null;
}

/* ---------- каркас страницы ---------- */
var BL = '<span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span>';
function hdr(){
  return '<div class="hdr"><a class="logo" href="index.html">YORK<span>!</span></a><div class="hr">' +
    '<a class="hback" href="index.html">' + u('left') + '<span>На главную</span></a>' +
    '<a class="cir" href="login.html" aria-label="Войти">' + u('login') + '</a>' +
    '<button class="cir" type="button" data-act="menu" aria-label="Меню">' + u('menu') + '</button></div></div>';
}
function pg(cls, body){ return '<div class="pg ' + cls + '">' + BL + '<div class="wrap">' + hdr() + body + '</div></div>'; }
function hst(cur, allDone){
  return '<div class="hsteps">' + BLK.map(function(b, i){
    var st = allDone || i < cur ? 'done' : i === cur ? 'cur' : '';
    return '<div class="hs ' + st + '"><span class="n">' + (st === 'done' ? u('check') : i + 1) + '</span>' + BRU[b] + '</div>';
  }).join('') + '</div>';
}
function render(html){
  stopAudio(); closeSheet();
  root.innerHTML = html;
  window.scrollTo(0, 0);
}
function menuHtml(){
  return '<div class="ytmenu" data-menu-box><div class="ytm-bg" data-act="menu"></div><div class="ytm-card"><button class="cir" type="button" data-act="menu" aria-label="Закрыть">' +
    '<svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
    '<a href="index.html">Главная</a><a href="index.html#how">Как это работает</a><a href="index.html#formats">Цены</a><a href="talk-club.html">Talk Club</a><a href="index.html#faq">Вопросы</a>' +
    '<a href="login.html">Войти в кабинет</a><a class="btn lm" href="trial-form.html">Записаться на пробный урок ' + u('arrow') + '</a></div></div>';
}

/* ---------- 1. выбор формата ---------- */
var FMT_ROWS = [
  { k:'express', icon:'bolt', desc:'Быстро понять примерный уровень.', acc:40 },
  { k:'balance', icon:'bal',  desc:'Уровень точнее, без долгого теста. Результат без разбора по навыкам.', acc:70 },
  { k:'deep',    icon:'deep', desc:'Точный уровень, оценка по каждому навыку и языковой архетип.', acc:100 }
];
function renderFormat(){
  S = null;
  var saved = lsGet();
  var resume = '';
  if (saved && saved.format && saved.hist && C.formats[saved.format]){
    var f = C.formats[saved.format];
    resume = '<div class="warn rsm"><span class="wi">' + u('clock') + '</span><div><b>Вы не закончили тест.</b> ' + esc(f.name) + ': пройдено ' + saved.hist.filter(function(h){ return h.a !== null; }).length + ' из ' + f.n + ' заданий.' +
      '<div class="rsm-b"><button class="btn dk" type="button" data-act="resume">Продолжить тест ' + u('arrow') + '</button><button class="btn gl" type="button" data-act="restart">Начать заново</button></div></div></div>';
  }
  var rows = FMT_ROWS.map(function(r, i){
    var f = C.formats[r.k];
    return '<button class="row" type="button" data-k="' + r.k + '"><span class="dot"></span><span class="wire"></span><span class="chk">' + u('check') + '</span>' +
      '<span class="rn"><span class="ti">' + u(r.icon) + '</span>' + f.name + '</span>' +
      '<span class="rd">' + f.n + ' ' + plural(f.n, 'задание', 'задания', 'заданий') + ' · ' + r.desc + '</span>' +
      '<span class="rt"><b>' + f.min + '</b><span>минут</span></span>' +
      '<span class="acc">Точность<span class="bar"><i style="width:' + r.acc + '%"></i></span></span></button>';
  }).join('');
  var body = '<div class="lay"><div class="left"><div class="eye">Тест на уровень</div>' +
    '<h1>Выберите <em>формат</em> теста</h1>' +
    '<p class="lead">Определите свой уровень английского от A1 до C1. Выберите формат проверки, а мы поможем разобраться в ваших сильных сторонах и зонах роста.</p>' + resume +
    '<div class="cta"><button class="btn lm" type="button" data-act="start"></button>' +
    '<div class="note">' + u('head') + '<span>Нужны наушники или звук. Можно отвечать «Не знаю».</span></div></div></div>' +
    '<div class="meter" data-meter>' + rows + '</div></div>';
  render(pg('s3', body));
  setFormatPick(fmtPick);
}
function setFormatPick(k){
  fmtPick = k;
  root.querySelectorAll('.row').forEach(function(r){ r.classList.toggle('on', r.dataset.k === k); });
  var cta = root.querySelector('[data-act="start"]');
  if (cta) cta.innerHTML = 'Начать: ' + C.formats[k].name.toLowerCase() + ' ' + u('arrow');
}

/* ---------- ход теста ---------- */
function startTest(){
  S = newState(fmtPick);
  S.stage = 'intro'; S.curBlock = 0;
  save();
  goal('test_start'); goal('test_format_' + fmtPick);
  renderIntro(0);
}
function resumeTest(){
  var saved = lsGet();
  if (!saved){ renderFormat(); return; }
  S = saved;
  fmtPick = S.format;
  if (S.stage === 'saving' && S.result) trySave(S.result);
  else if (S.stage === 'q' && S.pos >= 0 && S.hist[S.pos]) renderQuestion();
  else if (S.stage === 'finish') renderFinish();
  else if (S.stage === 'review') showReview();
  else renderIntro(S.curBlock || 0);
}
function touchTime(){
  if (!S || S.pos < 0 || !S.hist[S.pos] || !S._t0) return;
  var h = S.hist[S.pos]; h.ms = (h.ms || 0) + (Date.now() - S._t0); S._t0 = 0;
}

/* следующее новое задание (после последнего показанного) */
function advanceNew(){
  var idx = S.hist.length;
  if (idx >= total()){ showReview(); return; }
  var bi = blockOf(idx);
  S.curBlock = bi;
  if (idx === blockStart(bi) && !S.introDone[bi]){
    if (bi === BLK.length - 1 && !S.finishDone){ S.stage = 'finish'; save(); renderFinish(); return; }
    S.stage = 'intro'; save(); renderIntro(bi); return;
  }
  var id = nextItemId(bi);
  if (!id){ showReview(); return; }
  S.usedQ.push(id);
  S.hist.push({ id: id, block: BLK[bi], a: null, plays: 0, ms: 0 });
  S.pos = S.hist.length - 1;
  S.stage = 'q'; save();
  renderQuestion();
}

function renderIntro(bi){
  var b = BLK[bi], c = counts()[bi];
  var info = INTRO[b];
  var chips = '<span class="chip">' + u('list') + c + ' ' + plural(c, 'задание', 'задания', 'заданий') + '</span><span class="chip">' + u('clock') + 'около ' + blockMinutes(bi) + ' ' + plural(blockMinutes(bi), 'минуты', 'минут', 'минут') + '</span>';
  var EYE = '<svg class="ic aeye" viewBox="0 0 24 24"><g class="lid"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><g class="pup"><circle cx="12" cy="12" r="3"/><circle cx="13" cy="11" r=".8" fill="currentColor" stroke="none"/></g></g></svg>';
  var BULB = '<svg class="ic abulb" viewBox="0 0 24 24"><g class="rays"><path d="M12 1.2v1.3M4.6 4.3l.9.9M19.4 4.3l-.9.9M2.2 10.5h1.3M20.5 10.5h1.3"/></g><g class="sw"><path d="M9 18h6M10 21h4"/><path d="M12 4.5a5.5 5.5 0 0 0-3.2 10c.5.4.9 1 .9 1.7V16h4.6v-.1c0-.7.4-1.3.9-1.7A5.5 5.5 0 0 0 12 4.5z"/><path class="fil" d="M11 13.5l1-2.2 1 2.2" /></g></svg>';
  var card = '<div class="info"><div class="ih"><span class="ti ti-eye">' + EYE + '</span>Что вас ждёт</div><p>' + info.wait + '</p></div>' +
    '<div class="info"><div class="ih"><span class="ti ti-bulb">' + BULB + '</span>Как подготовиться</div><p>' + info.prep + '</p></div>' +
    '<button class="btn lm" type="button" data-act="block-go">Начать блок ' + u('arrow') + '</button>';
  render(pg('v2', hst(bi) + '<div class="split"><div><div class="num">' + String(bi + 1).padStart(2, '0') + '</div><h2 class="word">' + BEN[b] + '</h2><span class="ru">' + BRU[b] + '</span><div class="chips">' + chips + '</div></div><div class="card glass">' + card + '</div></div>'));
}

function renderFinish(){
  var deep = S.format === 'deep';
  var p = deep ? 'Пройдите тест до конца, и мы покажем ваш уровень отдельно по грамматике, лексике, чтению и аудированию.' : 'Пройдите тест до конца, и мы покажем ваш уровень по шкале от A1 до C1.';
  var body = hst(BLK.length - 1) + '<div class="poster gcard"><div><span class="tagd">Финишная прямая</span><h2 class="fh">Последний блок, и&nbsp;вы у&nbsp;цели</h2><p class="fp">' + p + '</p>' +
    '<div class="btns"><button class="btn lm" type="button" data-act="finish-go">Продолжить тест ' + u('arrow') + '</button><a class="btn gl" href="index.html#formats" target="_blank" rel="noopener">Посмотреть цены ' + u('ext') + '</a></div></div>' +
    '<div class="perk"><div class="big">−10%</div><p>на первый месяц обучения ждут вас в конце теста</p><div class="dots"><i></i><i></i><i></i><i></i><i class="u"></i></div><small>4 из 5 блоков пройдено</small></div></div>';
  render(pg('f3', body));
}

/* ---------- вопрос ---------- */
function timeline(h){
  var bi = BLK.indexOf(h.block), n = counts()[bi], k = S.hist.indexOf(h) - blockStart(bi) + 1;
  var segs = '';
  for (var i = 0; i < n; i++) segs += '<i class="' + (i < k - 1 ? 'd' : i === k - 1 ? 'c' : '') + '"></i>';
  return '<div class="tline"><div class="lbl">Задание ' + k + ' <span>из ' + n + '</span></div><div class="segs">' + segs + '</div></div>';
}
function nav(h){
  var back = S.hist.indexOf(h) > blockStart(BLK.indexOf(h.block)) && !S.ret;
  var answered = h.a !== null;
  var label = S.ret ? 'К проверке' : (answered ? 'Далее' : 'Пропустить');
  return '<div class="nav"><button class="cir' + (back ? '' : ' off') + '" type="button" data-act="back" aria-label="Назад">' + u('left') + '</button>' +
    '<button class="btn ' + (answered || S.ret ? 'lm' : 'skip') + '" type="button" data-main data-act="next">' + label + '</button>' +
    '<button class="cir' + (answered ? '' : ' off') + '" type="button" data-next data-act="next" aria-label="Вперёд">' + u('arrow') + '</button></div>';
}
function optsHtml(q, h, tf){
  if (tf){
    var sub = ['верно', 'неверно', 'не сказано'];
    return '<div class="opts tf' + (h.a !== null && h.a >= 0 ? ' picked' : '') + '">' + q.options.map(function(o, i){
      return '<button class="opt' + (h.a === i ? ' on' : '') + '" type="button" data-opt="' + i + '"><span class="l"><span class="lt">' + 'ABC'[i] + '</span><b>' + esc(o) + '</b></span><small>' + sub[i] + '</small></button>';
    }).join('') + '</div>';
  }
  return '<div class="opts' + (h.a !== null && h.a >= 0 ? ' picked' : '') + '">' + q.options.map(function(o, i){
    return '<button class="opt' + (h.a === i ? ' on' : '') + '" type="button" data-opt="' + i + '"><span class="lt">' + 'ABCD'[i] + '</span>' + esc(o) + '</button>';
  }).join('') + '</div>';
}
function idkHtml(h){ return '<button class="idk' + (h.a === -1 ? ' on' : '') + '" type="button" data-idk><span>?</span>Не знаю</button>'; }

function renderQuestion(){
  var h = S.hist[S.pos], q = item(h), bi = BLK.indexOf(h.block);
  S.curBlock = bi; S.stage = 'q'; S._t0 = Date.now(); save();
  var foot = '<div class="foot">' + idkHtml(h) + '<span>Честное «не знаю» лучше, чем угадывание</span></div>';
  var html;
  if (h.block === 'reading'){
    var p = Pm[q.passage_id];
    foot = '<div class="foot">' + idkHtml(h) + '</div>';
    var idxIn = S.hist.filter(function(x){ return item(x).passage_id === p.id; }).indexOf(h) + 1;
    var nIn = QB.questions.filter(function(z){ return z.passage_id === p.id && z.formats.indexOf(S.format) >= 0; }).length;
    var tno = S.usedP.indexOf(p.id) + 1, tTotal = Math.ceil(counts()[bi] / 4);
    var tags = '<div class="tags"><span class="tag">Текст ' + tno + ' из ' + tTotal + '</span><span class="chip">к нему ' + Math.min(4, nIn) + ' ' + plural(Math.min(4, nIn), 'вопрос', 'вопроса', 'вопросов') + '</span></div>';
    var tf = q.type === 'tfns';
    var stmt = tf
      ? '<div class="eye">Утверждение</div><div class="q">' + esc(q.prompt) + '</div><p class="pr">Согласно тексту это утверждение верно (True), неверно (False) или в тексте об этом не сказано (Not stated)?</p>' + optsHtml(q, h, true)
      : '<div class="eye">Вопрос к тексту</div><div class="q">' + esc(q.prompt) + '</div>' + optsHtml(q, h, false);
    html = pg('r3', hst(bi) + timeline(h) + '<div class="two"><div class="paper"><div class="ln" data-ln></div><div class="body"><div class="tags" style="margin-bottom:14px">' + tags + '</div><h3>' + esc(p.title) + '</h3><div class="src">Текст для чтения</div><p data-p>' + esc(p.text) + '</p></div></div>' +
      '<div class="side3"><div class="stmt gcard" data-q>' + stmt + foot + '</div>' + nav(h) + '</div></div>');
  } else if (h.block === 'listening'){
    var au = Am[q.audio];
    var dur = au ? au.duration : 0;
    var PLAY = '<button class="play" type="button" data-play aria-label="Слушать"><svg class="pi" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg><svg class="pa" viewBox="0 0 24 24"><rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="13.5" y="5" width="3.5" height="14" rx="1"/></svg></button>';
    var PLAYS = '<span class="plays" data-plays>Прослушиваний: <i class="' + (h.plays >= 1 ? 'u' : '') + '"></i><i class="' + (h.plays >= 2 ? 'u' : '') + '"></i></span>';
    html = pg('l1', hst(bi) + '<div class="box">' + timeline(h) + '<div class="card gcard"><div class="player">' + PLAY + '<div><div class="wave" data-wave></div><div class="pmeta"><span data-ptime>0:00 / ' + fmtTime(dur) + '</span>' + PLAYS + '</div></div></div>' +
      '<div class="instr">' + u('head') + '<span>Нажмите кнопку воспроизведения. Диктор объявит, что вы услышите и что нужно сделать. Запись можно прослушать 2 раза.</span></div><div style="height:22px"></div>' +
      '<p class="qq">' + esc(q.prompt) + '</p>' + optsHtml(q, h, false) + foot + '</div>' + nav(h) + '</div>');
  } else {
    var gapped = esc(q.prompt).replace(/_{2,}/g, '<span class="gap"></span>');
    html = pg('q1', hst(bi) + '<div class="box">' + timeline(h) + '<div class="card gcard" data-q><p class="qtext">' + gapped + '</p>' + optsHtml(q, h, false) + foot + '</div>' + nav(h) + '</div>');
  }
  render(html);
  if (h.block === 'reading') enhanceReading();
  if (h.block === 'listening') setupAudio(h, q);
}
function fmtTime(s){ s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

/* ---------- чтение: номера строк, сворачивание текста, шторка на телефоне ---------- */
var sheetEls = [];
function closeSheet(){ sheetEls.forEach(function(e){ if (e.parentNode) e.parentNode.removeChild(e); }); sheetEls = []; }
function enhanceReading(){
  var pp = root.querySelector('.paper'), st = root.querySelector('.stmt'), txt = root.querySelector('[data-p]'), ln = root.querySelector('[data-ln]');
  if (!pp || !st || !txt) return;
  var draw = function(){
    var lh = parseFloat(getComputedStyle(txt).lineHeight); if (!lh) return;
    var n = Math.round(txt.offsetHeight / lh); ln.style.paddingTop = '0px';
    ln.style.paddingTop = (txt.getBoundingClientRect().top - ln.getBoundingClientRect().top) + 'px';
    var h = ''; for (var i = 0; i < n; i++) h += '<span>' + ((i + 1) % 5 === 0 || i === 0 ? '<em>' + (i + 1) + '</em>' : '') + '</span>';
    ln.innerHTML = h;
  };
  draw();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  var body = pp.querySelector('.body');
  var w = document.createElement('div'); w.className = 'clipw'; txt.parentNode.insertBefore(w, txt); w.appendChild(txt);
  var CH = '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>';
  var t = document.createElement('button'); t.type = 'button'; t.className = 'mtx'; t.innerHTML = '<span>Свернуть текст</span>' + CH; body.appendChild(t);
  t.addEventListener('click', function(){ var c = pp.classList.toggle('clip'); t.querySelector('span').textContent = c ? 'Развернуть текст' : 'Свернуть текст'; if (c) st.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  var b = document.createElement('button'); b.type = 'button'; b.className = 'showtx';
  b.innerHTML = '<span><svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M4 19a2 2 0 0 1 2-2h13"/></svg></span>Посмотреть текст';
  st.insertBefore(b, st.firstChild);
  var bg = document.createElement('div'); bg.className = 'sheet-bg'; var sh = document.createElement('div'); sh.className = 'sheet';
  var h3 = pp.querySelector('h3');
  sh.innerHTML = '<div class="grab"></div><div class="sh2"><b>' + (h3 ? h3.textContent : 'Текст') + '</b><button type="button" aria-label="Закрыть"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><div class="sb">' + txt.innerHTML + '</div>';
  document.body.appendChild(bg); document.body.appendChild(sh); sheetEls = [bg, sh];
  var open = function(o){ sh.classList.toggle('on', o); bg.classList.toggle('on', o); };
  b.addEventListener('click', function(){ open(true); });
  bg.addEventListener('click', function(){ open(false); });
  sh.querySelector('.sh2 button').addEventListener('click', function(){ open(false); });
  var y0 = null;
  sh.addEventListener('touchstart', function(e){ y0 = e.touches[0].clientY; }, { passive: true });
  sh.addEventListener('touchend', function(e){ if (y0 !== null && e.changedTouches[0].clientY - y0 > 80) open(false); y0 = null; });
}

/* ---------- аудирование: настоящий плеер ---------- */
function stopAudio(){
  if (audioTick){ clearInterval(audioTick); audioTick = null; }
  if (audio){ try { audio.pause(); } catch (e){} audio = null; }
}
function setupAudio(h, q){
  var w = root.querySelector('[data-wave]'), N = 60;
  w.innerHTML = Array.from({ length: N }, function(_, i){ return '<i style="height:' + (18 + Math.abs(Math.sin(i * 1.7) * 60 + Math.sin(i * 0.6) * 30) % 82) + '%"></i>'; }).join('');
  var bars = Array.prototype.slice.call(w.children), btn = root.querySelector('[data-play]'), dots = root.querySelectorAll('[data-plays] i'), tm = root.querySelector('[data-ptime]');
  var au = Am[q.audio]; var dur = au ? au.duration : 0;
  if (h.plays >= 2) btn.classList.add('done');
  function paint(){
    var cur = audio ? audio.currentTime : 0, d = (audio && audio.duration && isFinite(audio.duration)) ? audio.duration : dur;
    var p = d ? Math.floor(cur / d * N) : 0;
    bars.forEach(function(b, i){ b.classList.toggle('p', i < p); });
    tm.textContent = fmtTime(cur) + ' / ' + fmtTime(d);
  }
  function stopRun(){ btn.classList.remove('run'); if (audioTick){ clearInterval(audioTick); audioTick = null; } }
  btn.addEventListener('click', function(){
    if (audio && !audio.paused){ audio.pause(); stopRun(); return; }
    if (!audio){
      if (h.plays >= 2) return;
      audio = new Audio(au ? au.src : '');
      audio.addEventListener('ended', function(){
        stopRun(); audio = null; paintReset();
        if (h.plays >= 2) btn.classList.add('done');
      });
      audio.addEventListener('error', function(){
        stopRun(); audio = null; h.plays = Math.max(0, h.plays - 1); updateDots();
        tm.textContent = 'Не удалось загрузить запись. Нажмите ещё раз.';
      });
      h.plays++; updateDots(); save();
    }
    btn.classList.add('run');
    audio.play().catch(function(){ stopRun(); tm.textContent = 'Браузер не включил звук. Нажмите ещё раз.'; });
    if (!audioTick) audioTick = setInterval(paint, 120);
  });
  function paintReset(){ bars.forEach(function(b){ b.classList.remove('p'); }); tm.textContent = '0:00 / ' + fmtTime(dur); }
  function updateDots(){ dots.forEach(function(d, i){ d.classList.toggle('u', i < h.plays); }); }
}

/* ---------- ответы и навигация ---------- */
function choose(i){
  var h = S.hist[S.pos]; if (!h) return;
  h.a = i; save();
  var opts = root.querySelector('.opts');
  opts.querySelectorAll('.opt').forEach(function(o){ o.classList.toggle('on', +o.dataset.opt === i); });
  opts.classList.toggle('picked', i >= 0);
  var idk = root.querySelector('[data-idk]'); if (idk) idk.classList.toggle('on', i === -1);
  syncNav(true);
}
function toggleIdk(){
  var h = S.hist[S.pos]; if (!h) return;
  if (h.a === -1){ h.a = null; save(); var o = root.querySelectorAll('.opt'); o.forEach(function(x){ x.classList.remove('on'); });
    root.querySelector('[data-idk]').classList.remove('on'); root.querySelector('.opts').classList.remove('picked'); syncNav(false); }
  else choose(-1);
}
function syncNav(on){
  var main = root.querySelector('[data-main]'), next = root.querySelector('[data-next]');
  if (!main) return;
  if (!S.ret) main.textContent = on ? 'Далее' : 'Пропустить';
  main.classList.toggle('lm', on || S.ret); main.classList.toggle('skip', !on && !S.ret);
  if (next) next.classList.toggle('off', !on);
}
function goNext(){
  touchTime();
  var h = S.hist[S.pos];
  if (S.ret){ S.ret = false; showReview(); return; }
  if (S.pos < S.hist.length - 1){ S.pos++; S.curBlock = BLK.indexOf(S.hist[S.pos].block); save(); renderQuestion(); return; }
  /* конец блока: следующий блок или проверка */
  var idx = S.hist.length, bi = blockOf(Math.min(idx, total() - 1));
  if (idx >= total()){ goal('test_block_done_' + (BLK.indexOf(h.block) + 1)); showReview(); return; }
  if (blockOf(idx) !== BLK.indexOf(h.block)) goal('test_block_done_' + (BLK.indexOf(h.block) + 1));
  advanceNew();
}
function goBack(){
  touchTime();
  var bi = BLK.indexOf(S.hist[S.pos].block);
  if (S.pos <= blockStart(bi)) return;
  S.pos--; save(); renderQuestion();
}

/* ---------- проверка пропущенных ---------- */
function showReview(){
  stopAudio();
  var missing = S.hist.map(function(h, i){ return { h: h, i: i }; }).filter(function(x){ return x.h.a === null; });
  /* не показанные задания (пул исчерпан) тоже считаются пропущенными, но их нет в списке */
  if (!missing.length){ finishTest(); return; }
  S.stage = 'review'; S.ret = false; save();
  var CN = missing.length, CK = S.hist.filter(function(h){ return h.a === -1; }).length, CA = S.hist.length - CN - CK, N = total();
  var cp = 'Вы пропустили несколько заданий. Можно вернуться к ним или сразу перейти к результату. Если завершить тест сейчас, они будут считаться как «Не знаю».';
  var list = missing.map(function(x){
    var bi = BLK.indexOf(x.h.block);
    return '<button class="m" type="button" data-act="goto" data-i="' + x.i + '"><span class="cell n">' + (x.i + 1) + '</span><span><b>' + BRU[x.h.block] + '</b><small>Задание ' + (x.i - blockStart(bi) + 1) + ' из ' + counts()[bi] + '</small></span><span class="go">Вернуться ' + u('arrow') + '</span></button>';
  }).join('');
  var html = hst(0, true) + '<div class="box"><div class="card gcard">' +
    '<div class="top"><div><span class="tag">Проверка перед результатом</span><h2 class="ch2">Все ли задания <em class="hl">пройдены?</em></h2><p class="cp">' + cp + '</p></div>' +
    '<div style="text-align:right"><div class="bigc">' + CN + '</div><div style="font-size:13px;font-weight:600;color:#B57A00;margin-top:8px">без ответа</div></div></div>' +
    '<div class="pbar"><i style="width:' + (CA / N * 100) + '%;background:var(--lime-g)"></i><i style="width:' + (CK / N * 100) + '%;background:#fff"></i><i style="width:' + (CN / N * 100) + '%;background:#E2A72E"></i></div>' +
    '<div class="legend" style="margin-bottom:22px"><span><i style="background:var(--lime)"></i>ответ дан: ' + CA + '</span><span><i style="background:#fff;box-shadow:inset 0 0 0 1px rgba(20,20,18,.15)"></i>«Не знаю»: ' + CK + '</span><span><i style="background:#FFF4D6;box-shadow:inset 0 0 0 2px #E2A72E"></i>без ответа: ' + CN + '</span></div>' +
    '<div class="miss">' + list + '</div>' +
    '<div class="btns"><button class="btn gl" type="button" data-act="review-back">' + u('left') + 'Назад к тесту</button><button class="btn lm" type="button" data-act="finish">Показать результат ' + u('arrow') + '</button></div></div></div>';
  render(pg('c3', html));
}

/* ---------- результат и сохранение ---------- */
function buildResult(){
  var answers = S.hist.map(function(h){ var q = item(h); return { id: h.id, block: h.block, level: q.level, correct: h.a !== null && h.a === q.answer, dk: h.a === null || h.a === -1, n: q.options.length }; });
  var sc = T.scoreAnswers(answers);
  var deep = S.format === 'deep';
  var skills = {};
  if (deep) BLK.forEach(function(b){ if (typeof sc.skills[b] === 'number') skills[b] = sc.skills[b]; });
  var arch = deep ? T.archetype(sc.skills, T.tieBreaker(answers)) : null;
  var ans = {};
  S.hist.forEach(function(h){ ans[h.id] = { a: h.a, t: Math.round((h.ms || 0) / 1000) }; });
  var right = answers.filter(function(a){ return a.correct; }).length;
  return {
    _compat: { right: right, total: answers.length },
    public_code: T.newCode(), format: S.format, overall: sc.overall, level: T.levelLetter(sc.overall),
    skills: skills, archetype: arch ? arch.code : null, axes: arch ? arch.axes : null, answers: ans,
    duration_sec: Math.min(86399, Math.round((Date.now() - S.startedAt) / 1000))
  };
}
function finishTest(){
  touchTime();
  S.stage = 'saving'; save();
  var res = buildResult();
  S.result = res; save();
  goal('test_finish');
  trySave(res);
}
function cabinetSession(){
  try {
    var raw = localStorage.getItem('sb-uuwtarchkltdmaddndgm-auth-token');
    if (!raw) return null;
    var x = JSON.parse(raw);
    if (x && x.currentSession) x = x.currentSession;
    if (!x || !x.access_token || !x.user || !x.user.id) return null;
    if ((x.expires_at || 0) * 1000 < Date.now() + 30000) return null;
    return { token: x.access_token, uid: x.user.id };
  } catch (e){ return null; }
}
function trySave(res){
  render(pg('c3', '<div class="box"><div class="card gcard"><span class="tag">Результат</span><h2 class="ch2">Считаем <em class="hl">ваш уровень</em></h2><p class="cp" data-save-msg>Сохраняем результат, это займёт пару секунд.</p></div></div>'));
  var ses = cabinetSession();
  var headers = { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + (ses ? ses.token : SUPABASE_ANON_KEY), 'Content-Type': 'application/json', Prefer: 'return=minimal' };
  var payload = Object.assign({}, res); delete payload._compat;
  if (ses) payload.student_id = ses.uid;    /* вошедший ученик: результат сразу в его кабинет */
  fetch(SUPABASE_URL + '/rest/v1/level_test_reports', { method: 'POST', headers: headers, body: JSON.stringify(payload) })
    .then(function(r){
      if (!r.ok) return r.text().then(function(t){ throw new Error(t || ('HTTP ' + r.status)); });
      lsDel();
      try { localStorage.setItem('ykt_last_code', res.public_code); } catch (e){}
      /* старая таблица level_test_results: общая статистика и блок «было → стало» в кабинете */
      try {
        var old = { test_type: res.format === 'deep' ? 'full' : 'express', score: res._compat ? res._compat.right : 0, max_score: res._compat ? res._compat.total : 0,
                    level: res.level, level_name: C.levelNames[T.levelIndex(res.overall) - 1] };
        if (ses) old.student_id = ses.uid;
        fetch(SUPABASE_URL + '/rest/v1/level_test_results', { method: 'POST', keepalive: true, headers: headers, body: JSON.stringify(old) }).catch(function(){});
      } catch (e){}
      location.href = 'result.html?id=' + encodeURIComponent(res.public_code);
    })
    .catch(function(){
      render(pg('c3', '<div class="box"><div class="card gcard"><span class="tag">Не удалось сохранить</span><h2 class="ch2">Результат <em class="hl">посчитан</em>, но не сохранился</h2>' +
        '<p class="cp">Проверьте интернет и попробуйте ещё раз. Ответы не потеряются: они сохранены в этом браузере.</p>' +
        '<div class="btns"><button class="btn lm" type="button" data-act="retry-save">Попробовать ещё раз ' + u('arrow') + '</button></div></div></div>'));
    });
}

/* ---------- события ---------- */
function onClick(e){
  var t = e.target;
  var a = t.closest('[data-act]');
  var opt = t.closest('[data-opt]');
  if (opt && S && S.stage === 'q'){ choose(+opt.dataset.opt); return; }
  if (t.closest('[data-idk]') && S && S.stage === 'q'){ toggleIdk(); return; }
  var row = t.closest('.row[data-k]');
  if (row){ setFormatPick(row.dataset.k); return; }
  if (!a) return;
  var act = a.dataset.act;
  if (act === 'menu'){ toggleMenu(); return; }
  if (act === 'start') startTest();
  else if (act === 'resume') resumeTest();
  else if (act === 'restart'){ lsDel(); renderFormat(); }
  else if (act === 'block-go'){ S.introDone[S.curBlock] = true; S.stage = 'q'; save(); advanceNew(); }
  else if (act === 'finish-go'){ S.finishDone = true; save(); advanceNew(); }
  else if (act === 'next') goNext();
  else if (act === 'back') goBack();
  else if (act === 'goto'){ touchTime(); S.pos = +a.dataset.i; S.ret = true; save(); renderQuestion(); }
  else if (act === 'review-back'){ S.pos = S.hist.length - 1; S.ret = false; save(); renderQuestion(); }
  else if (act === 'finish') finishTest();
  else if (act === 'retry-save') trySave(S.result || buildResult());
}
function toggleMenu(){
  var ex = document.querySelector('[data-menu-box]');
  if (ex){ ex.parentNode.removeChild(ex); document.body.classList.remove('ytm-open'); return; }
  var d = document.createElement('div'); d.innerHTML = menuHtml(); document.body.appendChild(d.firstChild); document.body.classList.add('ytm-open');
}

/* ---------- старт ---------- */
function init(){
  root = document.getElementById('app');
  document.body.insertAdjacentHTML('afterbegin', window.YKT_SPRITE || '');
  root.addEventListener('click', onClick);
  document.addEventListener('click', function(e){ if (document.querySelector('[data-menu-box]') && e.target.closest('[data-menu-box] [data-act="menu"]')) toggleMenu(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && document.querySelector('[data-menu-box]')) toggleMenu(); });
  var pre = qs('format'); if (pre && C.formats[pre]) fmtPick = pre;
  fetch(QJSON + '?v=1').then(function(r){ return r.json(); }).then(function(d){
    QB = d;
    d.questions.forEach(function(q){ Qm[q.id] = q; });
    d.passages.forEach(function(p){ Pm[p.id] = p; });
    d.audios.forEach(function(a){ Am[a.id] = a; });
    renderFormat();
  }).catch(function(){
    root.innerHTML = '<div class="pg s3"><div class="wrap">' + hdr() + '<p class="lead" style="margin:40px 0">Не удалось загрузить задания. Проверьте интернет и обновите страницу.</p></div></div>';
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
