# -*- coding: utf-8 -*-
"""Однократная правка: защита от переключения вкладок во время теста (разметка, CSS, app.js)."""
import os

D = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(D, '..', '..', 'level-test.html')
APP = os.path.join(D, 'app.js')

h = open(HTML, encoding='utf-8').read()
a = open(APP, encoding='utf-8').read()

# ---- CSS ----
css = """
/* защита от переключения вкладок */
.rules-card{display:flex;gap:12px;align-items:flex-start;background:rgba(255,196,60,.08);border:1.5px solid rgba(255,196,60,.5);border-radius:16px;padding:14px 16px;margin:0 0 18px;font-size:13.5px;line-height:1.55;color:#e7dcc0}
.rules-card b{color:#ffd36b}
.rules-ic{flex:none;width:22px;height:22px;border-radius:50%;background:#ffd36b;color:#0a0a09;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;margin-top:1px}
.reset-note{display:none;background:rgba(255,92,92,.1);border:1.5px solid rgba(255,92,92,.55);border-radius:16px;padding:14px 16px;margin:0 0 18px;font-size:14px;line-height:1.55;color:#ffd0d0}
.stay-note{font-size:12px;color:#8a8b82;margin:-8px 0 14px}
"""
marker = '@media (prefers-reduced-motion: reduce){'
assert marker in h
h = h.replace(marker, css + marker, 1)

# ---- старт: сообщение о сбросе и правила ----
old = '<div class="format-options" id="formatOptions">'
assert old in h
h = h.replace(old, '<div class="reset-note" id="resetNote"><b>Тест сброшен.</b> Вы покинули страницу во время прохождения, поэтому ответы удалены. Начните заново, это займёт всего несколько минут.</div>\n\n    ' + old, 1)

old2 = '<p class="lead" style="font-size:13px;margin:-6px 0 18px">Для аудирования'
assert old2 in h
rules = ('<div class="rules-card"><span class="rules-ic">!</span><div><b>Важно: не покидайте страницу.</b> '
         'Если во время теста вы переключитесь на другую вкладку или приложение, тест и все ответы сбросятся, придётся начать заново. '
         'Так результат получится честным и покажет ваш настоящий уровень. Время на тест не ограничено.</div></div>\n    ')
h = h.replace(old2, rules + old2, 1)

# ---- напоминание на экранах теста ----
h = h.replace('<div class="qcount" id="qcount"></div>', '<div class="stay-note">Не переключайтесь на другие вкладки: тест сбросится.</div>\n    <div class="qcount" id="qcount"></div>', 1)
h = h.replace('<div class="promo-card">', '<div class="stay-note">Ссылка из карточки откроется в новой вкладке, это можно. Остальные переходы сбросят тест.</div>\n    <div class="promo-card">', 1)

# ---- app.js ----
a = a.replace("Откройте его в соседней вкладке, а мы подождём: тест не ограничен по времени.",
              "Нажмите кнопку ниже, загляните в канал и возвращайтесь: тест вас подождёт.")
assert 'возвращайтесь: тест вас подождёт' in a

a = a.replace("let audioEl = null, audioPlays = 0, audioStarted = false;",
              "let audioEl = null, audioPlays = 0, audioStarted = false;\nlet inTest = false, leaveOk = false, leaveTimer = null;")
a = a.replace("  startedAt = Date.now();\n  showScreen('quiz');",
              "  startedAt = Date.now();\n  inTest = true; leaveOk = false;\n  document.getElementById('resetNote').style.display = 'none';\n  showScreen('quiz');")
a = a.replace("function finishQuiz(){\n  stopAudio();", "function finishQuiz(){\n  inTest = false;\n  stopAudio();")
a = a.replace("  a.target = '_blank'; a.rel = 'noopener';",
              "  a.target = '_blank'; a.rel = 'noopener';\n  a.onclick = () => { leaveOk = true; clearTimeout(leaveTimer); leaveTimer = setTimeout(() => { leaveOk = false; }, 120000); };")
a = a.replace("function restart(){ stopAudio(); showScreen('start');", "function restart(){ inTest = false; stopAudio(); showScreen('start');")

guard = """
/* ---------- защита: уход со страницы во время теста сбрасывает тест ---------- */
function testActive(){
  return inTest && (document.getElementById('quiz').classList.contains('active') || document.getElementById('promo').classList.contains('active'));
}
function abortTest(){
  if (!testActive() || leaveOk) return;
  inTest = false; stopAudio();
  plan = []; queue = []; answers = []; used = {}; cur = null; picked = null; doneQ = 0; pendingResult = null;
  document.getElementById('pfill').style.width = '0%';
  document.getElementById('resetNote').style.display = 'block';
  showScreen('start');
}
document.addEventListener('visibilitychange', () => { if (document.hidden) abortTest(); else leaveOk = false; });
window.addEventListener('blur', () => setTimeout(() => { if (!document.hasFocus()) abortTest(); }, 150));
window.addEventListener('focus', () => { leaveOk = false; });
window.addEventListener('beforeunload', e => { if (testActive()){ e.preventDefault(); e.returnValue = ''; } });
"""
a = a.rstrip() + "\n" + guard

open(HTML, 'w', encoding='utf-8', newline='\n').write(h)
open(APP, 'w', encoding='utf-8', newline='\n').write(a)
print('ok')
