# -*- coding: utf-8 -*-
"""Собирает assets/yk-test/: emblems.js (SVG «Абстракции») и test.css (слитый CSS экранов дизайна без дублей)."""
import collections, json, os, re, sys

SRC = r'D:\york\handoff2\york-test-handoff\screens'
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
OUT = os.path.join(REPO, 'assets', 'yk-test')
os.makedirs(OUT, exist_ok=True)

FILES_ALL = ['york-level-test-final.html','york-level-test-block-intro-final.html','york-level-test-question-final.html','york-level-test-reading-final.html','york-level-test-listening-final.html','york-level-test-finish-final.html','york-level-test-review-final.html','york-level-test-report.html']
# ---------------- эмблемы ----------------
rep = open(os.path.join(SRC, 'york-level-test-report.html'), encoding='utf-8').read()
m = re.search(r'^const ABS=(\{.*?\});$', rep, re.M)
assert m, 'ABS не найден'
ABS = json.loads(m.group(1))
assert set(ABS) == {'RG', 'RV', 'LG', 'LV', 'U'}
# id градиентов уникальны внутри одной эмблемы; при нескольких экземплярах на странице id совпадают, но визуально одинаковы
open(os.path.join(OUT, 'emblems.js'), 'w', encoding='utf-8', newline='\n').write(
    '/* Эмблемы архетипов (режим «Абстракции»). Сгенерировано tools/leveltest2/build_assets.py */\nwindow.YKT_EMBLEMS=' + json.dumps(ABS, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('emblems.js', sum(len(v) for v in ABS.values()) // 1024, 'КБ')


# ---------------- CSS ----------------
def split_blocks(css):
    out, i, n = [], 0, len(css)
    while i < n:
        j = css.find('{', i)
        if j < 0: break
        pre = css[i:j].strip(); d, k = 1, j + 1
        while k < n and d:
            if css[k] == '{': d += 1
            elif css[k] == '}': d -= 1
            k += 1
        out.append((pre, css[j + 1:k - 1])); i = k
    return out


FILES = ['york-level-test-final.html', 'york-level-test-block-intro-final.html', 'york-level-test-question-final.html',
         'york-level-test-reading-final.html', 'york-level-test-listening-final.html', 'york-level-test-finish-final.html',
         'york-level-test-review-final.html', 'york-level-test-report.html']
base = []      # (selector, body), порядок слоёв сохранён
media = collections.OrderedDict()   # media query -> [(selector, body)]


def add(lst, sel, body):
    # если точно такое правило уже есть и после него не было другого с тем же селектором, повтор не нужен
    for i in range(len(lst) - 1, -1, -1):
        s, b = lst[i]
        if s == sel:
            if b == body: return
            break
    lst.append((sel, body))


for f in FILES:
    s = open(os.path.join(SRC, f), encoding='utf-8').read()
    css = ''.join(re.findall(r'<style[^>]*>(.*?)</style>', s, re.S))
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    for pre, body in split_blocks(css):
        if pre.startswith('@media'):
            lst = media.setdefault(re.sub(r'\s+', ' ', pre), [])
            for p2, b2 in split_blocks(body): add(lst, p2, b2)
        elif pre.startswith('@keyframes'):
            # одинаковое имя: побеждает последнее определение
            base[:] = [(a, b) for a, b in base if a != pre]
            base.append((pre, body))
        else:
            add(base, pre, body)

parts = []
for sel, body in base:
    parts.append(sel + '{' + body.strip() + '}')
for q, rules in media.items():
    parts.append(q + '{' + ''.join(sel + '{' + body.strip() + '}' for sel, body in rules) + '}')
css = '\n'.join(parts)
# в макете страница — серый холст с рамками .pg; в продукте это сама страница
css += """
/* ---- продакшн: страница вместо макетной рамки ---- */
html,body{background:var(--bg)}
body{margin:0;min-height:100vh}
.vlabel{display:none!important}
.pg{margin:0 auto;max-width:none;border-radius:0;min-height:100vh;padding:14px 0 64px}
.yt-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
"""
open(os.path.join(OUT, 'test.css'), 'w', encoding='utf-8', newline='\n').write('/* Слито из экранов дизайна: tools/leveltest2/build_assets.py */\n' + css + '\n')
print('test.css', len(css) // 1024, 'КБ; base', len(base), 'media', {k: len(v) for k, v in media.items()})

# ---------------- спрайт иконок ----------------
syms = collections.OrderedDict()
for f in FILES_ALL:
    t = open(os.path.join(SRC, f), encoding='utf-8').read()
    for m2 in re.finditer(r'<symbol id="(i-[\w-]+)"[^>]*>.*?</symbol>', t, re.S):
        syms.setdefault(m2.group(1), m2.group(0).strip())
sprite = '<svg width="0" height="0" style="position:absolute" aria-hidden="true">' + ''.join(syms.values()) + '</svg>'
open(os.path.join(OUT, 'sprite.js'), 'w', encoding='utf-8', newline='\n').write('/* Иконки (спрайт). Сгенерировано build_assets.py */\nwindow.YKT_SPRITE=' + json.dumps(sprite, ensure_ascii=False) + ';\n')
print('sprite', len(syms), 'иконок')
