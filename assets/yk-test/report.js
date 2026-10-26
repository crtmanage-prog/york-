/* YORK! Отчёт о тесте на уровень: открытая часть (result.html) и полный отчёт (личный кабинет).
   Зависит от engine.js, texts.js, emblems.js, sprite.js. */
(function(){
'use strict';
var T = window.YKT, C = T.CONFIG, X = window.YKT_TEXTS, EMB = window.YKT_EMBLEMS;
var SITE = 'https://weyork.online';
var BOT = 'https://t.me/weyorkonlinebot';

function esc(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function u(id){ return '<svg class="ic"><use href="#i-' + id + '"/></svg>'; }
function goal(name){ try { if (window.ym) window.ym(111997160, 'reachGoal', name); } catch (e){} }

/* оформление карточек архетипов (из макета) */
var AST = {
  RG: { bg:'linear-gradient(155deg,#F7F6F2,#D9D9D6)', acc:'#3A3A37', accbg:'linear-gradient(150deg,#ECECE8,#D9D9D6)', bar:'linear-gradient(90deg,#8E8E8A,#1E1E1E)' },
  RV: { bg:'linear-gradient(155deg,#FAFCE9,#DDEB86)', acc:'#B2D320', accbg:'linear-gradient(150deg,#F1F8C9,#DDEB86)', bar:'var(--lime-g)' },
  LG: { bg:'linear-gradient(155deg,#F5F9FF,#C6DEFB)', acc:'#7FAEEA', accbg:'linear-gradient(150deg,#E6F1FF,#C6DEFB)', bar:'linear-gradient(90deg,#B7D9FF,#4F7FC4)' },
  LV: { bg:'linear-gradient(155deg,#F8F4FF,#D8C9EF)', acc:'#9B7FD1', accbg:'linear-gradient(150deg,#EFE7FB,#D8C9EF)', bar:'linear-gradient(90deg,#C9B6E6,#6A3DB8)' },
  U:  { bg:'linear-gradient(155deg,#FCF9F5,#F1E6DC 55%,#E3DAF2)', acc:'#C9B6E6', accbg:'linear-gradient(150deg,#F6EFE8,#E6DDF4)', bar:'linear-gradient(90deg,#B7D9FF,#C9B6E6,#D2E739)' }
};
var SK_RU = C.blockRu;
var SK_ICON = { reading:'book', listening:'head', grammar:'layers', vocabulary:'aa', use:'globe' };

/* описания осей (текст для «Ваши навыки»): стороны R, L, G, V и баланс */
var AXIS_TXT = {
  rl: { title: 'Как вы понимаете язык', left: 'Чтение', right: 'Аудирование',
        R: 'Вы лучше понимаете английский глазами, чем на слух. Письменный текст даёт время разобраться в структуре и деталях, а живая речь пока требует больше усилий.',
        L: 'Вы лучше понимаете английский на слух, чем глазами. Живая речь, интонации и контекст помогают вам больше, чем текст на странице.',
        B: 'Чтение и аудирование у вас развиты примерно на одном уровне: вы одинаково уверенно понимаете и текст, и живую речь.' },
  gv: { title: 'На чём держится ваш английский', left: 'Грамматика', right: 'Лексика',
        G: 'Ваш английский держится на правилах и структуре. Вы чувствуете, как устроено предложение, и опираетесь на это, когда подбираете слова.',
        V: 'Ваш английский держится на словах и выражениях. Вы понимаете и строите фразы интуитивно, а правила подключаются позже.',
        B: 'Грамматика и лексика у вас развиты ровно: правила и слова работают вместе, без явного перекоса.' }
};
var LOCK_TITLES = ['Ваш план на 3 месяца', 'Разбор ваших ошибок', null, 'Материалы под ваш профиль'];
var LOCK_TEXT = [
  'Неделя 1–4: грамматика в живой речи. Условные предложения и пассив на примерах из сериалов. Неделя 5–8: длинные тексты и выражения для вашей цели.',
  'Задание 7: выбран вариант «would leave» вместо «would have left». Причина: смешанные условные. Задание 12: пассив в будущем.',
  'Сейчас 65% пути. Ближайшие шаги: грамматика B1 → B2, чтение B1 → B2. Ожидаемый прогресс по каждому навыку.',
  'Подкасты и сериалы для вашего профиля, упражнения на грамматику через аудио, список выражений для вашего уровня.'
];

function fmtName(f){ return (C.formats[f] || {}).name || ''; }
function dateRu(iso){ try { return new Date(iso).toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' }); } catch (e){ return ''; } }

/* ---------- карточка архетипа ---------- */
function archetypeCard(rep){
  var k = rep.archetype, st = AST[k], meta = X.archetypes[k];
  var li = T.levelIndex(rep.overall), lv = T.levelLetter(rep.overall), ln = T.levelName(rep.overall);
  var grp = T.levelGroup(rep.overall);
  var nx = T.nextLetter(rep.overall), pr = T.progressPct(rep.overall);
  var ax = rep.axes || {};
  var tiles;
  if (k === 'U'){
    tiles = [['bal', 'Понимание', 'чтение ≈ аудирование', '≈'], ['bal', 'Основа', 'грамматика ≈ лексика', '≈']];
  } else {
    var rl = ax.rl || { side: 'R', pct: 50 }, gv = ax.gv || { side: 'G', pct: 50 };
    tiles = [
      rl.side === 'R' ? ['book', 'Чтение', rl.balance ? 'баланс с аудированием' : 'сильнее аудирования', rl.pct] : ['head', 'Аудирование', rl.balance ? 'баланс с чтением' : 'сильнее чтения', rl.pct],
      gv.side === 'G' ? ['layers', 'Грамматика', gv.balance ? 'баланс с лексикой' : 'сильнее лексики', gv.pct] : ['aa', 'Лексика', gv.balance ? 'баланс с грамматикой' : 'сильнее грамматики', gv.pct]
    ];
  }
  var prog = nx
    ? '<div class="prow"><div><small>Текущий уровень</small><b>' + lv + '</b></div><span class="mid">' + pr + '% пути до ' + nx + '</span><div style="text-align:right"><small>Следующий шаг</small><b>' + nx + '</b></div></div><div class="tr"><i style="width:' + pr + '%"></i><em style="left:' + pr + '%"></em></div>'
    : '<div class="prow"><div><small>Текущий уровень</small><b>' + lv + '</b></div><span class="mid">Максимальный уровень теста</span><div style="text-align:right"><small>Шкала теста</small><b>A1–C1</b></div></div><div class="tr"><i style="width:100%"></i><em style="left:100%"></em></div>';
  return '<div class="rc gcard fade" style="--acc:' + st.acc + ';--accbg:' + st.accbg + ';--accbar:' + st.bar + '">' +
    '<div class="art" data-code="' + k + '" style="background:' + st.bg + '"><div class="ab">' + (EMB[k] || '') + '</div><div class="ov"><div class="lvb"><small>Ваш уровень</small><b>' + lv + '</b><span>' + ln + '</span></div></div></div>' +
    '<div class="info"><div class="top"><div class="h"><span class="logo">YORK<span>!</span></span><span class="pill">' + lv + '</span></div>' +
    '<div class="code">' + k + '</div><div class="nm">' + meta.ru + '</div><div class="en2">' + meta.en + '</div><span class="chip2"><i></i>' + meta.ch + '</span>' +
    '<p class="ds">' + esc(meta.desc[grp]) + '</p></div>' +
    '<div class="ax2">' + tiles.map(function(t, i){ return '<div class="st2 ' + (i ? 'b' : 'a') + '"><span class="ti">' + u(t[0]) + '</span><div><b>' + t[1] + '</b><small>' + t[2] + '</small></div><span class="pc">' + (typeof t[3] === 'number' ? t[3] + '%' : t[3]) + '</span></div>'; }).join('') + '</div>' +
    '<div class="prog">' + prog + '</div></div></div>';
}

/* ---------- оси ---------- */
function axisItems(rep){
  var ax = rep.axes, k = rep.archetype;
  function one(key){
    var a = ax[key], d = AXIS_TXT[key];
    var bal = k === 'U' || a.balance;
    var winLeft = (key === 'rl' ? a.side === 'R' : a.side === 'G');
    var name = winLeft ? d.left : d.right;
    var pct = a.pct;
    var pos = winLeft ? 100 - pct : pct;     /* маркер: ближе к стороне-победителю */
    return { t: name, p: pct, l: d.left, r: d.right, k: d.title, d: bal ? d.B : d[a.side], pos: pos, bal: bal };
  }
  return [one('rl'), one('gv')];
}

/* ---------- сильные стороны и зоны роста ---------- */
function skillList(rep){
  var order = ['reading', 'listening', 'grammar', 'vocabulary', 'use'];
  return order.filter(function(b){ return typeof rep.skills[b] === 'number'; }).map(function(b){
    var s = rep.skills[b];
    return { b: b, ru: SK_RU[b], score: s, lv: T.levelLetter(s), li: T.levelIndex(s), st: T.skillStatus(s, rep.overall) };
  });
}
function tipFor(rep, sk){
  var tp = X.tips;
  if (sk.st === 'strong') return ['Как использовать эту сильную сторону', tp.strong[sk.b]];
  if (sk.st === 'neutral') return ['Как развивать навык', tp.neutral[sk.b]];
  var pair = tp.pairs[rep.archetype] && tp.pairs[rep.archetype][sk.b];
  return ['Ваш следующий шаг', pair || tp.general[sk.b]];
}
function li(a){ return '<ul class="ul2">' + a.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }
var CHV = '<span class="chev"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></span>';
var LOCK = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
function skillCard(rep, sk, wide){
  var d = X.skills[sk.b][sk.li], tip = tipFor(rep, sk);
  return '<div class="cd ' + (wide ? 'wide' : '') + '" data-t><div class="t"><b>' + sk.ru + '</b><span class="lvp">' + sk.lv + '</span>' + CHV + '</div><p class="s">' + esc(d.line) + '</p>' +
    '<div class="exp"><div><div class="full"><div><h6>Что уже получается</h6>' + li(d.can) + '</div><div><h6>Что развивать дальше</h6>' + li(d.dev) + '</div><div class="tip"><b>' + tip[0] + '</b>' + esc(tip[1]) + '</div></div></div></div></div>';
}
function group(rep, title, dot, list){
  if (!list.length) return '';
  return '<div class="g2"><div class="gh"><i style="background:' + dot + '"></i>' + title + '</div><div class="cds">' +
    list.map(function(s, i){ return skillCard(rep, s, list.length % 2 === 1 && i === list.length - 1 && list.length > 1); }).join('') + '</div></div>';
}

/* ---------- закрытые главы: заглушка (открытая часть) и реальное содержимое (кабинет) ---------- */
function lockedBlocks(rep){
  var nx = T.nextLetter(rep.overall);
  var titles = LOCK_TITLES.slice(); titles[2] = nx ? 'Путь до ' + nx : 'Как поддерживать и углублять уровень';
  var texts = LOCK_TEXT.slice(); if (!nx) texts[2] = 'Как закрепить уровень C1 и расти дальше: тексты, подкасты и практика для вашего профиля. Ближайшие шаги по каждому навыку.';
  return '<div class="lockg">' + titles.map(function(tt, i){
    return '<div class="lk"><div class="bl"><h4>' + tt + '</h4><p>' + texts[i] + '</p><div class="bar" style="width:80%"></div><div class="bar" style="width:55%"></div><p>' + texts[i] + '</p></div>' +
      '<div class="pl"><span class="lc">' + LOCK + '</span><div><b>' + tt + '</b><span>Откроется в личном кабинете после оформления абонемента</span></div></div></div>';
  }).join('') + '</div>';
}

/* полное содержимое (кабинет): план, разбор ошибок, путь до уровня, материалы. qmap: id -> вопрос из questions.json */
var MATERIALS = {
  RG: ['Подкасты и видео с транскриптом: сначала читайте, потом слушайте без текста.', 'Короткие рассказы и статьи с разбором конструкций: выписывайте целые фразы.', 'Аудиокниги с текстом для чтения: следите глазами и слушайте.'],
  RV: ['Аудиоверсии статей и книг: слушайте и следите за текстом.', 'Подборки выражений по темам: возвращайтесь к ним через несколько дней.', 'Упражнения на грамматику через ваши любимые тексты: разбирайте, как построены фразы.'],
  LG: ['Подкасты с транскриптом: выписывайте новые слова и сразу используйте их в знакомых конструкциях.', 'Статьи на любимые темы: читайте то, что вы уже слышали.', 'Списки выражений по темам с примерами в речи.'],
  LV: ['Подкасты и сериалы с английскими субтитрами: сопоставляйте звук с написанием.', 'Грамматические мини-разборы на основе услышанных фраз.', 'Транскрипты знакомых подкастов: читайте и подчёркивайте конструкции.'],
  U:  ['Короткие подкасты, статьи и видео на ваши цели: по 10–15 минут в день.', 'Выберите 2–3 темы и собирайте по ним выражения.', 'Раз в неделю пересказывайте услышанное или прочитанное своими словами.']
};
function fullBlocks(rep, qmap){
  var sl = skillList(rep).slice().sort(function(a, b){ return a.score - b.score; });
  var weak = sl.slice(0, 2), nx = T.nextLetter(rep.overall);
  /* 1. план на 3 месяца */
  var plan = '<ul class="ul2">';
  if (weak.length){
    plan += '<li><b>Недели 1–4.</b> ' + weak[0].ru + ': ' + esc(X.skills[weak[0].b][weak[0].li].dev.join('; ')) + '.</li>';
    if (weak[1]) plan += '<li><b>Недели 5–8.</b> ' + weak[1].ru + ': ' + esc(X.skills[weak[1].b][weak[1].li].dev.join('; ')) + '.</li>';
  }
  plan += '<li><b>Недели 9–12.</b> Перенос в речь: пересказы, обсуждения, закрепление выражений. В конце пройдите тест снова и сравните, как выросли навыки.</li></ul>';
  /* 2. разбор ошибок */
  var errs = [];
  if (rep.answers && qmap){
    Object.keys(rep.answers).forEach(function(id){
      var q = qmap[id], a = rep.answers[id];
      if (!q || a.a === null || a.a === undefined || a.a === -1 || a.a === q.answer) return;
      errs.push({ q: q, a: a.a });
    });
  }
  var errHtml;
  if (!rep.answers || !qmap) errHtml = '<p>Разбор ошибок появится, когда загрузятся ответы.</p>';
  else if (!errs.length) errHtml = '<p>Ошибок в данных ответах нет. Отличный результат.</p>';
  else errHtml = '<ul class="ul2">' + errs.slice(0, 10).map(function(e){
    return '<li><b>' + SK_RU[e.q.block] + '.</b> ' + esc(e.q.prompt) + '<br>Ваш ответ: <i>' + esc(e.q.options[e.a]) + '</i>. Верно: <b>' + esc(e.q.options[e.q.answer]) + '</b>.</li>';
  }).join('') + '</ul>' + (errs.length > 10 ? '<p>И ещё ' + (errs.length - 10) + ' ' + 'заданий с ошибками.</p>' : '');
  var dk = rep.answers ? Object.keys(rep.answers).filter(function(id){ return rep.answers[id].a === -1 || rep.answers[id].a === null; }).length : 0;
  if (dk) errHtml += '<p>Ответов «Не знаю» и пропусков: ' + dk + '. Эти темы стоит повторить в первую очередь.</p>';
  /* 3. путь до следующего уровня */
  var pathHtml = nx
    ? '<p>Сейчас ' + T.progressPct(rep.overall) + '% пути от ' + T.levelLetter(rep.overall) + ' до ' + nx + '. Ближайшие шаги по навыкам:</p><ul class="ul2">' + sl.map(function(s){
        var nxs = T.nextLetter(s.score);
        return '<li><b>' + s.ru + '.</b> ' + (nxs ? s.lv + ' → ' + nxs + ' (' + T.progressPct(s.score) + '% пути): ' + esc(X.skills[s.b][s.li].dev[0]) : s.lv + ': максимальный уровень теста. ' + esc(X.skills[s.b][s.li].dev[0])) + '.</li>';
      }).join('') + '</ul>'
    : '<p>C1 — максимальный уровень теста. Чтобы поддерживать и углублять его:</p><ul class="ul2">' + sl.map(function(s){ return '<li><b>' + s.ru + '.</b> ' + esc(X.skills[s.b][s.li].dev.join('; ')) + '.</li>'; }).join('') + '</ul>';
  /* 4. материалы */
  var mat = '<ul class="ul2">' + (MATERIALS[rep.archetype] || MATERIALS.U).map(function(m){ return '<li>' + esc(m) + '</li>'; }).join('') + '</ul>';
  var titles = LOCK_TITLES.slice(); titles[2] = nx ? 'Путь до ' + nx : 'Как поддерживать и углублять уровень';
  var bodies = [plan, errHtml, pathHtml, mat];
  return '<div class="fullg">' + titles.map(function(tt, i){ return '<div class="fb gcard"><h4>' + tt + '</h4>' + bodies[i] + '</div>'; }).join('') + '</div>';
}

/* ---------- сборка страницы ---------- */
function trialHref(rep){ return 'trial-form.html?result=' + encodeURIComponent(rep.public_code); }
function tgHref(rep){ return BOT + '?start=res_' + encodeURIComponent(rep.public_code); }
function pageUrl(rep){ return SITE + '/result.html?id=' + encodeURIComponent(rep.public_code); }

function tgCard(rep){
  return '<div class="tgc gcard" id="tg"><h4>Сохраните результат</h4><p>Пришлём карточку с вашим уровнем и ссылку на отчёт в Telegram. Ссылка будет работать всегда.</p>' +
    '<label><input type="checkbox" data-agree><span>Я согласен(на) на обработку персональных данных и с <a href="privacy-policy.html" target="_blank" rel="noopener" style="text-decoration:underline">политикой конфиденциальности</a></span></label>' +
    '<a class="btn dk off" href="' + tgHref(rep) + '" target="_blank" rel="noopener" data-tgbtn>' + u('tg') + 'Сохранить в Telegram</a>' +
    '<button class="btn gl" type="button" data-share>' + u('share') + 'Поделиться результатом</button></div>';
}

function shortBlock(rep){
  var li = T.levelIndex(rep.overall), lv = T.levelLetter(rep.overall);
  var txt = X.short.text[rep.format] || X.short.text.express;
  return '<div class="short"><div class="sres gcard"><div class="apx">' + u('clock') + 'Результат приблизительный</div><br><div class="big">' + lv + '</div><div class="nm">' + T.levelName(rep.overall) + '</div>' +
    '<p class="lvl-line">' + esc(X.short.lines[li]) + '</p><p>' + esc(txt) + '</p>' +
    '<a class="btn lm sres-trial" href="' + trialHref(rep) + '" data-trial>Записаться на пробный урок ' + u('arrow') + '</a>' +
    '<div class="srow"><a class="btn dk" href="#tg" data-tgjump>' + u('tg') + 'Сохранить в Telegram</a><button class="btn gl" type="button" data-share>' + u('share') + 'Поделиться</button></div></div>' +
    '<div class="full-inv gcard"><div class="mini3">' + ['RG', 'RV', 'LG', 'LV', 'U'].map(function(k){ return '<span style="background:' + AST[k].bg + '">' + (EMB[k] || '') + '</span>'; }).join('') + '</div>' +
    '<div class="mini-inv"><h4>Ваш английский —<br>больше, чем одна буква и&nbsp;цифра</h4><p>Глубокая диагностика за 25 минут покажет, как устроен ваш английский.</p>' +
    '<div class="pills"><span>Карта навыков</span><span>Точки роста</span><span>Языковой архетип</span></div>' +
    '<a class="btn lm" href="level-test.html?format=deep" data-fulltest>Пройти глубокую диагностику ' + u('arrow') + '</a></div></div></div>';
}

function deepReport(rep, opts){
  var sl = skillList(rep), li = T.levelIndex(rep.overall), lv = T.levelLetter(rep.overall);
  var can = X.can[li], ax = axisItems(rep);
  var st = AST[rep.archetype];
  var strong = sl.filter(function(s){ return s.st === 'strong'; }).sort(function(a, b){ return b.score - a.score; });
  var neutral = sl.filter(function(s){ return s.st === 'neutral'; }).sort(function(a, b){ return b.score - a.score; });
  var growth = sl.filter(function(s){ return s.st === 'growth'; }).sort(function(a, b){ return a.score - b.score; });
  var goodList = strong.concat(neutral);
  var g3 = '';
  if (goodList.length) g3 += group(rep, strong.length ? 'Ваши сильные стороны' : 'Ваши навыки', st.acc, goodList);
  g3 += group(rep, 'Ваши зоны роста', '#E2A72E', growth);
  var sklist = sl.slice().sort(function(a, b){ return b.score - a.score; }).map(function(s){
    return '<div class="skr ' + (s.st === 'growth' ? 'lo' : '') + '"><span>' + s.ru + '</span><div class="tr"><i style="width:' + (s.score / 5 * 100) + '%"></i></div><b>' + s.lv + '</b></div>';
  }).join('');
  var canIcons = { 'Работа': 'users', 'Путешествия': 'globe', 'Сериалы и видео': 'yt', 'Чтение': 'book' };
  var nx = T.nextLetter(rep.overall);
  var chap4Title = opts.full ? 'Полный отчёт' : 'Полный отчёт';
  var chap4Intro = opts.full
    ? 'Это ваш полный отчёт: план, разбор ответов, путь до следующего уровня и материалы под ваш профиль.'
    : 'Эта часть откроется в вашем личном кабинете, когда вы станете учеником YORK!. Результат теста уже сохранён, проходить его заново не нужно.';
  return '<div class="rnav"><a class="ch" href="#s1"><b>1</b>Навыки</a><a class="ch" href="#s2"><b>2</b>Что вы уже умеете</a><a class="ch" href="#s3"><b>3</b>Сильные стороны</a><a class="ch" href="#s4"><b>4</b>Полный отчёт</a><span class="sp"></span>' +
    (opts.full ? '' : '<a class="ib" href="#tg" title="Сохранить в Telegram" data-tgjump>' + u('tg') + '</a>') + '<button class="ib" type="button" title="Поделиться" data-share>' + u('share') + '</button>' +
    (opts.full ? '' : '<a class="btn lm" href="' + trialHref(rep) + '" data-trial>Бесплатный урок ' + u('arrow') + '</a>') + '</div>' +

    '<section class="sec gcard" id="s1"><div class="sh"><span class="no">1</span><h2>Ваши навыки</h2></div>' +
    '<p class="in">Ваш архетип складывается из двух осей. Проценты показывают не «правильность», а насколько один навык сильнее другого. Чем ближе к краю, тем заметнее это в том, как вы учите язык.</p>' +
    '<div class="axw"><div class="axl">' + ax.map(function(a, i){
      return '<div class="ax3 ' + (i ? '' : 'on') + '" data-ax="' + i + '"><div class="pt"><em>' + a.p + '%</em> ' + a.t + '</div><div class="tr"><i style="left:' + a.pos + '%"></i></div><div class="lb"><span>' + a.l + '</span><b>' + a.r + '</b></div></div>';
    }).join('') + '</div><div class="axr" data-axr></div></div>' +
    '<div class="sklist"><h4>Уровень по каждому навыку</h4><div class="scl"><span></span><div class="tk"><span>A1</span><span>A2</span><span>B1</span><span>B2</span><span>C1</span></div><span></span></div>' + sklist +
    '<div class="skr na"><span>Говорение</span><em>Тест не проверяет говорение и письмо.</em></div></div></section>' +

    '<section class="sec gcard" id="s2"><div class="sh"><span class="no">2</span><h2>Что вы уже умеете</h2></div><p class="in">' + esc(can.lead) + '</p>' +
    '<div class="can">' + can.groups.map(function(g){ return '<div class="cn"><span class="ti">' + u(canIcons[g.t] || 'book') + '</span><div><h4>' + g.t + '</h4><ul>' + g.items.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div></div>'; }).join('') +
    '</div><div class="cefr">' + esc(X.cefrNote) + '</div></section>' +

    '<section class="sec gcard" id="s3"><div class="sh"><span class="no">3</span><h2>Сильные стороны и зоны роста</h2></div><p class="in">Нажмите на навык, чтобы увидеть подробный разбор: что уже получается и что поможет двигаться дальше.</p>' + g3 + '</section>' +

    '<section class="sec gcard" id="s4"><div class="sh"><span class="no">4</span><h2>' + chap4Title + '</h2></div><p class="in">' + chap4Intro + '</p>' +
    (opts.full ? fullBlocks(rep, opts.qmap) : lockedBlocks(rep) +
      '<div class="lockcta"><p><b>Результат сохранится в вашем личном кабинете.</b> Кабинет доступен ученикам YORK!. Позже тест можно пройти заново и сравнить, как выросли навыки.</p><a class="btn lm" href="' + trialHref(rep) + '" data-trial>Записаться на пробный урок ' + u('arrow') + '</a></div>') + '</section>' +

    (opts.full ? '' : '<div class="endg"><div class="ctad"><h3>Начните с <em>бесплатного</em> пробного урока</h3><p>Познакомитесь с преподавателем и форматом занятий. Ваш результат теста сохранится в личном кабинете, а позже тест можно будет пройти снова.</p><div class="nt">+ скидка 10% на первый месяц за прохождение теста</div><a class="btn lm" href="' + trialHref(rep) + '" data-trial>Записаться на пробный урок ' + u('arrow') + '</a></div>' + tgCard(rep) + '</div>') +
    '<p class="foot2">Результат ориентировочный, по шкале CEFR. Через 3 месяца занятий пройдите тест снова, чтобы увидеть, какие навыки выросли.</p>';
}

/* публичный API */
function render(el, rep, opts){
  opts = opts || {};
  var deep = rep.format === 'deep' && rep.archetype && rep.skills && Object.keys(rep.skills).length >= 4;
  var html = '';
  if (deep) html += archetypeCard(rep) + deepReport(rep, opts);
  else html += shortBlock(rep) + tgCard(rep);
  el.innerHTML = html;
  if (deep){
    var ax = axisItems(rep), axr = el.querySelector('[data-axr]');
    var draw = function(i){ var a = ax[i]; axr.innerHTML = '<small>' + a.k + '</small><h4>' + a.p + '% ' + a.t + '</h4><p>' + a.d + '</p>'; el.querySelectorAll('[data-ax]').forEach(function(x){ x.classList.toggle('on', +x.dataset.ax === i); }); };
    el.querySelectorAll('[data-ax]').forEach(function(x){ x.addEventListener('mouseenter', function(){ draw(+x.dataset.ax); }); x.addEventListener('click', function(){ draw(+x.dataset.ax); }); });
    draw(0);
    el.querySelectorAll('[data-t]').forEach(function(t){ t.addEventListener('click', function(){ t.classList.toggle('open'); }); });
  }
  /* согласие и Telegram */
  var ag = el.querySelector('[data-agree]'), tb = el.querySelector('[data-tgbtn]');
  if (ag && tb){
    ag.addEventListener('change', function(){ tb.classList.toggle('off', !ag.checked); });
    tb.addEventListener('click', function(e){
      if (!ag.checked){ e.preventDefault(); return; }
      goal('result_tg_click');
      if (opts.onConsent) opts.onConsent(rep.public_code);
    });
  }
  el.querySelectorAll('[data-tgjump]').forEach(function(a){ a.addEventListener('click', function(e){ e.preventDefault(); var t = el.querySelector('#tg'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' }); }); });
  el.querySelectorAll('[data-share]').forEach(function(b){ b.addEventListener('click', function(){ share(rep, b, opts); }); });
  el.querySelectorAll('[data-trial]').forEach(function(a){ a.addEventListener('click', function(){ goal('result_trial_click'); }); });
  el.querySelectorAll('[data-fulltest]').forEach(function(a){ a.addEventListener('click', function(){ goal('result_full_test_click'); }); });
  return { deep: deep };
}

function shareText(rep){
  var base = 'Мой уровень английского: ' + T.levelLetter(rep.overall) + ' (' + T.levelName(rep.overall) + ')';
  if (rep.archetype && X.archetypes[rep.archetype]) base += ', языковой архетип «' + X.archetypes[rep.archetype].ru + '»';
  return base + '. Пройдите тест от YORK!';
}
function share(rep, btn, opts){
  goal('result_share');
  var data = { title: 'Мой уровень английского', text: shareText(rep), url: pageUrl(rep) };
  var shared = function(){ try { if (opts && opts.onEvent) opts.onEvent('share', rep.public_code); } catch (e){} };
  var done = function(msg){ if (btn){ var old = btn.innerHTML; btn.textContent = msg; setTimeout(function(){ btn.innerHTML = old; }, 2200); } };
  if (navigator.share){ navigator.share(data).then(shared, function(){}); return; }
  var txt = data.text + ' ' + data.url;
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function(){ done('Ссылка скопирована'); shared(); }, function(){ window.prompt('Скопируйте ссылку:', txt); });
  else window.prompt('Скопируйте ссылку:', txt);
}

/* история прохождений (кабинет): список отчётов от новых к старым */
function history(list){
  if (!list || list.length < 1) return '';
  var rows = list.map(function(r, i){
    var prev = list[i + 1];
    var delta = '';
    if (prev && r.skills && prev.skills){
      delta = Object.keys(r.skills).filter(function(b){ return typeof prev.skills[b] === 'number'; }).map(function(b){
        var d = Math.round((r.skills[b] - prev.skills[b]) * 100) / 100;
        return '<span class="hd ' + (d > 0 ? 'up' : d < 0 ? 'dn' : '') + '">' + SK_RU[b] + ' ' + (d > 0 ? '+' : '') + d.toFixed(1) + '</span>';
      }).join('');
    }
    return '<button class="hrow" type="button" data-hid="' + esc(r.id) + '"><span class="hl2">' + T.levelLetter(r.overall) + '</span><span class="hm"><b>' + fmtName(r.format) + '</b><small>' + dateRu(r.created_at) + '</small></span><span class="hdl">' + delta + '</span></button>';
  }).join('');
  return '<div class="hist gcard"><h4>История прохождений</h4>' + rows + '</div>';
}

window.YKTReport = { render: render, history: history, shareText: shareText, pageUrl: pageUrl, esc: esc };
})();
