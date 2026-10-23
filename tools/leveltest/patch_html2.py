# -*- coding: utf-8 -*-
"""Однократно: разметка и стили под блоки, навигацию, итоги по заданиям, пояснение расчёта и кнопку «Поделиться»."""
import os, re

HTML = os.path.join(os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')), 'level-test.html')
s = open(HTML, encoding='utf-8').read()

CSS = """
/* блоки теста: полоса из сегментов */
.pbar{display:flex;gap:5px;height:auto;background:none;overflow:visible;border-radius:0}
.pseg{height:6px;border-radius:4px;background:rgba(255,255,255,.12);overflow:hidden;position:relative}
.pseg i{display:block;height:100%;width:0;background:#D7EF42;border-radius:4px;transition:width .3s ease}
.pseg.cur{box-shadow:0 0 0 1.5px rgba(215,239,66,.55)}
.passage-info{font-size:12.5px;font-weight:600;color:#D7EF42;margin:0 0 10px;line-height:1.5}
.qhint{font-size:13.5px;line-height:1.55;color:#aaa;margin:-10px 0 18px}

/* навигация по заданиям */
.nav-row{display:flex;gap:10px;align-items:center}
.nav-arrow{flex:none;width:52px;height:52px;border-radius:50%;border:1.5px solid rgba(255,255,255,.28);background:rgba(255,255,255,.03);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}
.nav-arrow:hover:not(:disabled){border-color:#D7EF42;color:#D7EF42}
.nav-arrow:disabled{opacity:.3;cursor:default}
.nav-row .btn-lime{flex:1}
.btn-lime.skip{background:rgba(255,255,255,.08);color:#fff;border:1.5px solid rgba(255,255,255,.28)}
.btn-lime.skip:hover{background:rgba(255,255,255,.14)}

/* введение в блок */
.intro-card{background:rgba(255,255,255,.04);border:1.5px solid rgba(255,255,255,.14);border-radius:24px;padding:26px 22px;margin:8px 0 22px}
.intro-tag{display:inline-block;font-family:Unbounded,sans-serif;font-weight:600;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#0a0a09;background:#D7EF42;border-radius:999px;padding:6px 12px;margin-bottom:14px}
.intro-card h2{font-family:Unbounded,sans-serif;font-weight:700;font-size:22px;line-height:1.25;letter-spacing:-.01em;margin:0 0 6px}
.intro-meta{font-size:13px;color:#8a8b82;margin:0 0 18px}
.intro-h{font-family:Unbounded,sans-serif;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#D7EF42;margin:0 0 6px}
.intro-card p.intro-p{font-size:15px;line-height:1.65;color:#d8d9d2;margin:0 0 16px}

/* итоги по заданиям */
.rv-summary{font-size:15px;line-height:1.6;color:#d8d9d2;margin:0 0 20px}
.rv-summary b{color:#fff}
.rv-block{font-family:Unbounded,sans-serif;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#8a8b82;margin:14px 0 8px}
.rv-row{display:flex;flex-wrap:wrap;gap:8px}
.rv-tile{width:44px;height:44px;border-radius:12px;font-family:Unbounded,sans-serif;font-weight:600;font-size:13px;cursor:pointer;border:1.5px solid rgba(255,255,255,.2);background:rgba(255,255,255,.03);color:#fff}
.rv-tile.ok{background:rgba(215,239,66,.18);border-color:rgba(215,239,66,.6)}
.rv-tile.dk{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.35);color:#c9cac5}
.rv-tile.un{background:rgba(255,196,60,.12);border-color:#ffd36b;color:#ffd36b}
.rv-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:#8a8b82;margin:16px 0 22px}
.rv-legend i{display:inline-block;width:11px;height:11px;border-radius:4px;margin-right:6px;vertical-align:-1px;border:1.5px solid}
.rv-legend .ok i{background:rgba(215,239,66,.3);border-color:#D7EF42}.rv-legend .dk i{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.4)}.rv-legend .un i{background:rgba(255,196,60,.2);border-color:#ffd36b}
.rv-actions{display:flex;flex-direction:column;gap:10px;margin-top:auto}

/* как рассчитан результат и «поделиться» */
.how-calc{border-radius:20px;padding:6px 20px;margin-bottom:16px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1)}
.how-calc summary{cursor:pointer;font-family:Unbounded,sans-serif;font-size:14px;font-weight:600;padding:14px 0;list-style:none;display:flex;justify-content:space-between;align-items:center}
.how-calc summary::-webkit-details-marker{display:none}
.how-calc summary::after{content:'+';font-size:20px;color:#D7EF42}
.how-calc[open] summary::after{content:'−'}
.how-calc .how-body{font-size:13.5px;line-height:1.6;color:#b9bab3;padding:0 0 12px}
.how-calc .how-body p{margin:0 0 10px}
.how-calc .how-body b{color:#fff}
.share-msg{font-size:12.5px;color:#8a8b82;text-align:center;margin:-6px 0 14px;min-height:0}
"""
marker = '@media (prefers-reduced-motion: reduce){'
assert marker in s
s = s.replace(marker, CSS + marker, 1)

# полоса блоков
s = s.replace('<div class="pbar"><i id="pfill"></i></div>', '<div class="pbar" id="pbar"></div>', 1)

# экран задания: заново
m = re.search(r'<div class="screen" id="quiz">.*?</div>\s*\n\s*<!-- PROMO SCREEN', s, re.S)
assert m
quiz = '''<div class="screen" id="quiz">
    <div class="stay-note">Не переключайтесь на другие вкладки: тест сбросится.</div>
    <div class="qcount" id="qcount"></div>
    <div class="passage-info" id="passageInfo" style="display:none"></div>
    <div class="passage" id="passage" style="display:none"></div>
    <div class="audio-box" id="audioBox">
      <button class="audio-btn" id="audioBtn" type="button" onclick="playAudio()" aria-label="Прослушать запись">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <div class="audio-label" id="audioLabel"></div>
    </div>
    <div class="qtext" id="qtext"></div>
    <div class="qhint" id="qhint" style="display:none"></div>
    <div class="options" id="options"></div>
    <button class="dk-btn" id="dkBtn" type="button">Не знаю</button>
    <div class="quiz-foot nav-row">
      <button class="nav-arrow" id="backBtn" type="button" onclick="goBack()" aria-label="Предыдущее задание">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
      </button>
      <button class="btn-lime" id="nextBtn" type="button" onclick="nextQuestion()">Далее</button>
      <button class="nav-arrow" id="fwdBtn" type="button" onclick="goForward()" aria-label="Следующее задание">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </button>
    </div>
  </div>

  <!-- PROMO SCREEN'''
s = s[:m.start()] + quiz + s[m.end():]

# введение и итоги: после промо-экрана
promo_end = s.index('<!-- RESULT SCREEN -->')
extra = '''<!-- BLOCK INTRO SCREEN -->
  <div class="screen" id="intro">
    <div class="stay-note">Не переключайтесь на другие вкладки: тест сбросится.</div>
    <div class="intro-card">
      <span class="intro-tag" id="introTag"></span>
      <h2 id="introH"></h2>
      <p class="intro-meta" id="introMeta"></p>
      <div class="intro-h">Что вас ждёт</div>
      <p class="intro-p" id="introDo"></p>
      <div id="introTipWrap">
        <div class="intro-h">Как подготовиться</div>
        <p class="intro-p" id="introTip"></p>
      </div>
    </div>
    <div class="quiz-foot">
      <button class="btn-lime" id="introNext" type="button" onclick="introStart()">Начать блок</button>
    </div>
  </div>

  <!-- REVIEW SCREEN -->
  <div class="screen" id="review">
    <div class="kicker">Проверка перед результатом</div>
    <h1 class="display" style="margin-top:14px;font-size:clamp(22px,4.4vw,28px)">Все ли задания пройдены?</h1>
    <p class="rv-summary" id="rvSummary"></p>
    <div id="rvGrid"></div>
    <div class="rv-legend"><span class="ok"><i></i>есть ответ</span><span class="dk"><i></i>«Не знаю»</span><span class="un"><i></i>нет ответа</span></div>
    <div class="rv-actions">
      <button class="btn-ghost" id="rvBack" type="button" onclick="reviewFirstUnanswered()" style="display:none">Вернуться к заданиям без ответа</button>
      <button class="btn-lime" type="button" onclick="finishQuiz()">Завершить тест и узнать уровень</button>
    </div>
  </div>

  '''
s = s[:promo_end] + extra + s[promo_end:]

# результат: пояснение расчёта и поделиться
s = s.replace('<div class="discount-card">',
'''<details class="how-calc" id="howCalc">
      <summary>Как мы определили ваш уровень</summary>
      <div class="how-body">
        <p><b>Тест адаптивный.</b> Каждое задание привязано к уровню от A1 до C2, а следующее подбирается по вашим предыдущим ответам: уверенные ответы ведут к более сложным заданиям, ошибки к более простым.</p>
        <p><b>Мы не считаем баллы.</b> Количество «правильных ответов» само по себе уровня не показывает, потому что задания разной сложности. Мы находим уровень, который лучше всего объясняет все ваши ответы сразу: верный ответ на сложное задание повышает оценку, ошибка на простом понижает.</p>
        <p><b>Угадывание учтено.</b> В заданиях с выбором ответа можно попасть наугад (шанс 1 из 4, в True / False / Not stated 1 из 3), поэтому один случайный успех уровень не поднимет. Ответ «Не знаю» считается как честное «не знаю», а не как угадывание. Задания без ответа тоже считаются как «Не знаю».</p>
        <p><b>Уровень по навыкам</b> считается так же, но отдельно по каждому блоку. Заданий в блоке меньше, поэтому такая оценка менее точная.</p>
        <p><b>Шкала CEFR:</b> A1 и A2 базовый уровень, B1 и B2 средний, C1 и C2 продвинутый. Результат ориентировочный: точный уровень преподаватель определит на пробном уроке.</p>
      </div>
    </details>

    <div class="discount-card">''', 1)

s = s.replace('<div class="follow-row">',
'''<button class="btn-ghost" type="button" id="shareBtn" onclick="shareResult()" style="margin-bottom:14px">Поделиться результатом</button>
    <div class="share-msg" id="shareMsg"></div>

    <div class="follow-row">''', 1)

# мелкий текст на старте
s = s.replace('Тест подстраивается под ваши ответы: чем увереннее отвечаете, тем сложнее становятся задания.',
              'Тест разбит на блоки и подстраивается под ваши ответы. Можно возвращаться к заданиям и пропускать их.', 1)

open(HTML, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
