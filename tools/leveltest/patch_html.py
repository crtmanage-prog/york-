# -*- coding: utf-8 -*-
"""Однократная правка разметки level-test.html под новый тест (CSS, экраны, маркеры APP-START/END)."""
import os, re

HTML = os.path.join(os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')), 'level-test.html')
s = open(HTML, encoding='utf-8').read()

CSS = """
/* progress (непрерывная полоса) */
.pbar{height:6px;border-radius:4px;background:rgba(255,255,255,.12);overflow:hidden;margin-bottom:26px}
.pbar i{display:block;height:100%;width:0;background:#D7EF42;border-radius:4px;transition:width .3s ease}

/* текст для чтения и аудио */
.passage{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.13);border-radius:16px;padding:16px 18px;margin:0 0 18px}
.passage-title{font-family:Unbounded,sans-serif;font-size:13px;font-weight:600;margin:0 0 8px;color:#D7EF42}
.passage-text{font-size:15px;line-height:1.65;color:#e4e5df}
.audio-box{display:none;align-items:center;gap:14px;background:rgba(215,239,66,.08);border:1.5px solid rgba(215,239,66,.4);border-radius:16px;padding:14px 16px;margin:0 0 18px}
.audio-btn{flex:none;width:52px;height:52px;border-radius:50%;border:0;background:#D7EF42;color:#0a0a09;cursor:pointer;display:flex;align-items:center;justify-content:center}
.audio-btn:disabled{opacity:.5;cursor:default}
.audio-btn.playing{animation:ypulse 1s ease-in-out infinite}
@keyframes ypulse{50%{transform:scale(.92)}}
.audio-label{font-size:13.5px;line-height:1.45;color:#c9cac5}
.options.locked{opacity:.45;pointer-events:none}
.dk-btn{align-self:flex-start;background:none;border:0;color:#8a8b82;font-size:13.5px;text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:6px 2px;margin:-6px 0 14px}
.dk-btn.picked{color:#D7EF42}

/* маркетинговые вставки */
.promo-card{background:linear-gradient(160deg,rgba(215,239,66,.16),rgba(215,239,66,.04));border:1.5px solid rgba(215,239,66,.45);border-radius:24px;padding:26px 22px;margin:8px 0 22px}
.promo-tag{display:inline-block;font-family:Unbounded,sans-serif;font-weight:600;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#0a0a09;background:#D7EF42;border-radius:999px;padding:6px 12px;margin-bottom:16px}
.promo-card h2{font-family:Unbounded,sans-serif;font-weight:700;font-size:21px;line-height:1.25;letter-spacing:-.01em;margin:0 0 12px}
.promo-card p{font-size:15px;line-height:1.65;color:#d2d3cc;margin:0 0 20px}
.promo-card .btn-ghost{text-decoration:none;margin-bottom:0}

/* результат: навыки и скидка */
.result-meta{font-size:13px;color:#8a8b82;margin:-10px 0 20px}
.skills-card{border-radius:20px;padding:20px;margin-bottom:16px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1)}
.skills-card h3{font-family:Unbounded,sans-serif;font-size:15px;font-weight:700;margin:0 0 14px}
.skill-row{display:grid;grid-template-columns:118px 1fr 34px;align-items:center;gap:12px;margin-bottom:11px;font-size:13.5px;color:#c9cac5}
.skill-row b{color:#fff;font-family:Unbounded,sans-serif;font-size:12.5px;text-align:right}
.skill-bar{height:8px;border-radius:5px;background:rgba(255,255,255,.1);overflow:hidden}
.skill-bar i{display:block;height:100%;background:#D7EF42;border-radius:5px}
.discount-card{border-radius:20px;padding:22px 20px;margin-bottom:16px;background:#D7EF42;color:#0a0a09}
.discount-card h3{font-family:Unbounded,sans-serif;font-size:17px;font-weight:700;margin:0 0 8px;color:#0a0a09}
.discount-card p{font-size:14px;line-height:1.55;margin:0 0 16px;color:#262618}
.discount-card .btn-dark{display:flex;align-items:center;justify-content:center;padding:16px 22px;border-radius:999px;background:#0a0a09;color:#fff;font-family:Unbounded,sans-serif;font-weight:700;font-size:14px;text-decoration:none}
.express-note{display:none}
.follow-row{display:flex;gap:10px;margin-bottom:16px}
.follow-row a{flex:1;text-decoration:none;font-size:13px;padding:13px 10px}
@media(max-width:380px){.skill-row{grid-template-columns:96px 1fr 30px}}
"""
s = s.replace('@media (prefers-reduced-motion: reduce){ .btn-lime{transition:none} }',
              CSS + '\n@media (prefers-reduced-motion: reduce){ .btn-lime{transition:none} .pbar i{transition:none} .audio-btn.playing{animation:none} }', 1)

s = s.replace('<div class="progress" id="progressBar"></div>', '<div class="pbar"><i id="pfill"></i></div>', 1)

# старт
s = re.sub(r'<p class="lead">От базовой грамматики.*?</p>',
           '<p class="lead">От A1 до C2: грамматика, словарь, чтение и аудирование. Тест подстраивается под ваши ответы: чем увереннее отвечаете, тем сложнее становятся задания. Результат покажем в конце, бесплатно.</p>', s, count=1, flags=re.S)
s = re.sub(r'<div class="format-options" id="formatOptions">.*?</div>\s*\n\s*<div class="spacer"></div>',
 '''<div class="format-options" id="formatOptions">
      <button type="button" class="format-card picked" data-type="express" onclick="pickFormat('express', this)">
        <h3>⚡ Экспресс-тест</h3>
        <p>15 заданий, около 5 минут. Грамматика, словарь, чтение и аудирование. Быстро понять примерный уровень.</p>
      </button>
      <button type="button" class="format-card" data-type="full" onclick="pickFormat('full', this)">
        <h3>🌊 Полный тест</h3>
        <p>50 заданий, около 25 минут. Пять блоков: Grammar, Vocabulary, Reading, Listening, Use of English. Точный уровень и оценка по каждому навыку.</p>
      </button>
    </div>
    <p class="lead" style="font-size:13px;margin:-6px 0 18px">Для аудирования нужны наушники или звук на устройстве. Можно отвечать «Не знаю»: так результат точнее, чем угадывание.</p>

    <div class="spacer"></div>''', s, count=1, flags=re.S)
s = s.replace('onclick="startQuiz()">Начать тест', 'onclick="startQuiz()">Начать тест', 1)

# экран вопроса + промо
s = re.sub(r'<div class="screen" id="quiz">.*?</div>\s*\n\s*<!-- RESULT SCREEN -->',
'''<div class="screen" id="quiz">
    <div class="qcount" id="qcount"></div>
    <div class="passage" id="passage" style="display:none"></div>
    <div class="audio-box" id="audioBox">
      <button class="audio-btn" id="audioBtn" type="button" onclick="playAudio()" aria-label="Прослушать запись">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <div class="audio-label" id="audioLabel"></div>
    </div>
    <div class="qtext" id="qtext"></div>
    <div class="options" id="options"></div>
    <button class="dk-btn" id="dkBtn" type="button">Не знаю</button>
    <div class="quiz-foot">
      <button class="btn-lime" id="nextBtn" onclick="nextQuestion()" disabled>Далее</button>
    </div>
  </div>

  <!-- PROMO SCREEN (маркетинговые вставки между заданиями) -->
  <div class="screen" id="promo">
    <div class="promo-card">
      <span class="promo-tag" id="promoTag"></span>
      <h2 id="promoH"></h2>
      <p id="promoP"></p>
      <a class="btn-ghost" id="promoCta" href="#" target="_blank" rel="noopener"></a>
    </div>
    <div class="quiz-foot">
      <button class="btn-lime" type="button" onclick="promoContinue()">Продолжить тест</button>
    </div>
  </div>

  <!-- RESULT SCREEN -->''', s, count=1, flags=re.S)

# результат
s = s.replace('<p class="result-copy" id="levelCopy"></p>',
'''<p class="result-copy" id="levelCopy"></p>
    <p class="result-meta" id="resultMeta"></p>

    <div class="skills-card" id="skills" style="display:none">
      <h3>Уровень по навыкам</h3>
      <div id="skillRows"></div>
    </div>

    <div class="lead-card express-note" id="expressNote">
      <h3>Хотите точнее?</h3>
      <p>Экспресс-тест показывает ориентир. Полный тест на 25 минут определяет уровень точнее и оценивает каждый навык отдельно.</p>
      <button class="btn-ghost" type="button" onclick="startQuiz('full')">Пройти полный тест</button>
    </div>

    <div class="discount-card">
      <h3>Ваша награда: скидка 10%</h3>
      <p>На первый месяц обучения в YORK!. Запишитесь на бесплатный пробный урок, и преподаватель подскажет, с чего начать при вашем уровне.</p>
      <a class="btn-dark" href="trial-form.html" target="_blank" rel="noopener">Записаться на бесплатный урок</a>
    </div>

    <div class="follow-row">
      <a class="btn-ghost" href="https://t.me/weyorkonline" target="_blank" rel="noopener">Telegram-канал</a>
      <a class="btn-ghost" href="https://www.youtube.com/@weyorkonline" target="_blank" rel="noopener">YouTube</a>
    </div>''', 1)

# скрипт целиком
m = re.search(r'<script>\n/\* =+\n\s+QUESTION BANK.*?</script>', s, re.S)
assert m, 'блок скрипта не найден'
s = s[:m.start()] + '<script>\n/*APP-START*/\n/*APP-END*/\n</script>' + s[m.end():]

open(HTML, 'w', encoding='utf-8', newline='\n').write(s)
print('ok', len(s) // 1024, 'КБ')
