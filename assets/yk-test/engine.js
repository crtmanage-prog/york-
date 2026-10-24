/* YORK! Тест на уровень: настройки, оценка уровня и навыков, архетип.
   Чистые функции без доступа к странице: их же использует отчёт (result.html, кабинет).
   Все пороги и веса собраны в YKT.CONFIG: их можно менять после первых реальных результатов. */
(function(){
'use strict';

var CONFIG = {
  /* порядок блоков в тесте */
  blocks: ['grammar', 'vocabulary', 'reading', 'listening', 'use'],
  blockRu: { grammar:'Грамматика', vocabulary:'Лексика', reading:'Чтение', listening:'Аудирование', use:'Практика языка' },
  blockEn: { grammar:'Grammar', vocabulary:'Vocabulary', reading:'Reading', listening:'Listening', use:'Language in Use' },
  /* форматы: заданий по блокам (Глубокая диагностика 13 · 10 · 12 · 8 · 7, остальные пропорционально) */
  formats: {
    express: { name:'Быстрый старт',        n:15, min:5,  per:{ grammar:4,  vocabulary:3,  reading:4,  listening:2, use:2 } },
    balance: { name:'Комплексная проверка', n:30, min:12, per:{ grammar:8,  vocabulary:6,  reading:7,  listening:5, use:4 } },
    deep:    { name:'Глубокая диагностика', n:50, min:25, per:{ grammar:13, vocabulary:10, reading:12, listening:8, use:7 } }
  },
  /* шкала: A1=1 ... C1=5 (максимум), C2 не присваивается */
  levels: ['A1', 'A2', 'B1', 'B2', 'C1'],
  levelNames: ['Beginner', 'Elementary', 'Intermediate', 'Upper-Intermediate', 'Advanced'],
  /* оценка: модель Раша с поправкой на угадывание, MAP-оценка на сетке */
  slope: 1.3,            /* крутизна кривой: чем больше, тем резче граница между «знаю» и «не знаю» */
  priorMean: 3,          /* априорный уровень (B1) */
  priorSd: 1.3,          /* неопределённость до первого ответа */
  skillPriorSd: 0.9,     /* для навыка: насколько он может отличаться от общего уровня */
  gridMin: 1, gridMax: 5, gridStep: 0.01,
  startLevel: 3,         /* первое задание блока (B1), если общий уровень ещё не оценён */
  /* статусы навыков */
  strongGap: 0.5,        /* навык выше общего уровня на столько и больше: сильная сторона */
  weakGap: 0.5,          /* ниже на столько и больше: зона роста */
  /* архетип */
  polymorphSpread: 1.0,  /* разница между сильнейшим и слабейшим из 4 навыков меньше: Полиморф */
  axisBase: 50, axisPerLevel: 25, axisCap: 90,
  tieDiff: 0.25,         /* разница меньше: на оси баланс */
  hardLevel: 4           /* «сложные» задания для ничьей: уровень B2 и выше */
};

function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }
function roundHalfUp(x){ return Math.floor(x + 0.5); }

/* ответ: {level:1..5, correct:bool, dk:bool, n:число вариантов} */
function logLik(th, r){
  var p = 1 / (1 + Math.exp(-CONFIG.slope * (th - r.level)));
  var c = r.dk ? 0 : 1 / r.n;               /* «Не знаю» и пропуск: без поправки на угадывание */
  var P = c + (1 - c) * p;
  return Math.log(Math.max(1e-9, r.correct ? P : 1 - P));
}

function estimate(rs, mu, sd){
  mu = (mu === undefined) ? CONFIG.priorMean : mu;
  sd = sd || CONFIG.priorSd;
  var best = -Infinity, bt = mu;
  for (var th = CONFIG.gridMin; th <= CONFIG.gridMax + 1e-9; th += CONFIG.gridStep){
    var s = -((th - mu) * (th - mu)) / (2 * sd * sd);
    for (var i = 0; i < rs.length; i++) s += logLik(th, rs[i]);
    if (s > best){ best = s; bt = th; }
  }
  return Math.round(clamp(bt, CONFIG.gridMin, CONFIG.gridMax) * 100) / 100;
}

/* число 1.00..5.00 -> номер уровня 1..5 */
function levelIndex(score){ return clamp(Math.floor(score + 1e-9), 1, 5); }
function levelLetter(score){ return CONFIG.levels[levelIndex(score) - 1]; }
function levelName(score){ return CONFIG.levelNames[levelIndex(score) - 1]; }
/* доля пути до следующего уровня, 0..99; для C1 нет следующего */
function progressPct(score){
  var li = levelIndex(score);
  if (li >= 5) return null;
  return clamp(Math.round((score - li) * 100), 0, 99);
}
function nextLetter(score){ var li = levelIndex(score); return li >= 5 ? null : CONFIG.levels[li]; }

/* все ответы -> общий уровень и навыки.
   answers: [{block, level, correct, dk}] (n по умолчанию 4, у True/False/Not stated 3) */
function scoreAnswers(answers){
  var rs = answers.map(function(a){ return { block:a.block, level:a.level, correct:!!a.correct, dk:!!a.dk, n:a.n || 4 }; });
  var overall = estimate(rs);
  var skills = {};
  CONFIG.blocks.forEach(function(b){
    var part = rs.filter(function(r){ return r.block === b; });
    if (part.length >= 2) skills[b] = estimate(part, overall, CONFIG.skillPriorSd);
  });
  return { overall: overall, skills: skills };
}

/* ось: две стороны a и b (ключи навыков). Возвращает сторону-победителя и процент */
function axis(skills, a, b, tieBreakFn){
  var d = skills[a] - skills[b], side, balance = false;
  if (Math.abs(d) < CONFIG.tieDiff){
    balance = true;
    side = tieBreakFn ? tieBreakFn(a, b) : (d >= 0 ? a : b);
  } else side = d > 0 ? a : b;
  var pct = Math.min(CONFIG.axisCap, roundHalfUp(CONFIG.axisBase + Math.abs(d) * CONFIG.axisPerLevel));
  return { side: side, other: side === a ? b : a, pct: pct, diff: Math.abs(d), balance: balance };
}

/* архетип по 4 навыкам (Чтение, Аудирование, Грамматика, Лексика): docs/york-level-test-archetypes.md */
function archetype(skills, tieBreakFn){
  var keys = ['reading', 'listening', 'grammar', 'vocabulary'];
  for (var i = 0; i < keys.length; i++) if (typeof skills[keys[i]] !== 'number') return null;
  var vals = keys.map(function(k){ return skills[k]; });
  var spread = Math.max.apply(null, vals) - Math.min.apply(null, vals);
  var rl = axis(skills, 'reading', 'listening', tieBreakFn);
  var gv = axis(skills, 'grammar', 'vocabulary', tieBreakFn);
  var code;
  if (spread < CONFIG.polymorphSpread) code = 'U';
  else code = (rl.side === 'reading' ? 'R' : 'L') + (gv.side === 'grammar' ? 'G' : 'V');
  return { code: code, spread: Math.round(spread * 100) / 100,
    axes: { rl: { side: rl.side === 'reading' ? 'R' : 'L', pct: rl.pct, balance: rl.balance },
            gv: { side: gv.side === 'grammar' ? 'G' : 'V', pct: gv.pct, balance: gv.balance } } };
}

/* ничья на оси: сторона с большим числом верных ответов на сложных заданиях (answers как в scoreAnswers) */
function tieBreaker(answers){
  return function(a, b){
    function hard(k){ return answers.filter(function(x){ return x.block === k && x.level >= CONFIG.hardLevel && x.correct; }).length; }
    var ha = hard(a), hb = hard(b);
    if (ha === hb) return a;
    return ha > hb ? a : b;
  };
}

/* группы навыков для главы 3 */
function skillStatus(skill, overall){
  var d = skill - overall;
  if (d >= CONFIG.strongGap - 1e-9) return 'strong';
  if (d <= -CONFIG.weakGap + 1e-9) return 'growth';
  return 'neutral';
}

/* уровень -> группа описания архетипа: A=A1,A2; B=B1,B2; C=C1 */
function levelGroup(score){ var li = levelIndex(score); return li <= 2 ? 'A' : li <= 4 ? 'B' : 'C'; }

/* короткий код результата для публичной ссылки: 12 символов [A-Za-z0-9] */
function newCode(){
  var al = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789', out = '';
  var buf = new Uint8Array(12);
  (window.crypto || window.msCrypto).getRandomValues(buf);
  for (var i = 0; i < 12; i++) out += al[buf[i] % al.length];
  return out;
}

window.YKT = { CONFIG: CONFIG, estimate: estimate, scoreAnswers: scoreAnswers, archetype: archetype, tieBreaker: tieBreaker,
  levelIndex: levelIndex, levelLetter: levelLetter, levelName: levelName, progressPct: progressPct, nextLetter: nextLetter,
  skillStatus: skillStatus, levelGroup: levelGroup, newCode: newCode, clamp: clamp, roundHalfUp: roundHalfUp };
})();
