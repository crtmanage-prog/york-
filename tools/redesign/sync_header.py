# -*- coding: utf-8 -*-
"""Переносит шапку новой главной (index.html) на другие страницы: CSS (изолированный префиксом .ykh), разметку,
мобильное меню и скрипт. Блоки на странице ограничены маркерами YKH-CSS / YKH-HTML / YKH-JS.
Использование: python tools/redesign/sync_header.py level-test.html [ещё страницы]"""
import os, re, sys

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
IDX = open(os.path.join(REPO, 'index.html'), encoding='utf-8').read()

# ---------------- CSS ----------------
style = re.search(r'<style>(.*?)</style>', IDX, re.S).group(1)
style = re.sub(r'/\*.*?\*/', '', style, flags=re.S)


def split_blocks(css):
    """Верхнеуровневые блоки: [(prelude, body)]"""
    out, i, n = [], 0, len(css)
    while i < n:
        j = css.find('{', i)
        if j < 0: break
        prelude = css[i:j].strip()
        depth, k = 1, j + 1
        while k < n and depth:
            if css[k] == '{': depth += 1
            elif css[k] == '}': depth -= 1
            k += 1
        out.append((prelude, css[j + 1:k - 1]))
        i = k
    return out


SCOPED = ('.hdr-cap', '.hdr-dk', '.nav', '.hright', '.login', '.burger')        # внутри .ykh
SHARED = ('.btn', '.ic', '.logo')                                                  # внутри .ykh и #mnav
OWN = ('#mnav', '#mcta')                                                           # как есть
BODYCLS = ('body.mopen',)


def conv_selector(sel):
    sel = sel.strip()
    if sel.startswith(OWN): return sel
    if sel.startswith(BODYCLS): return sel
    if re.match(r'^(%s)(?![\w-])' % '|'.join(re.escape(x) for x in SCOPED), sel): return '.ykh ' + sel
    if re.match(r'^(%s)(?![\w-])' % '|'.join(re.escape(x) for x in SHARED), sel): return '.ykh %s,#mnav %s' % (sel, sel)
    return None


def convert_rule(prelude, body):
    parts = [p for p in re.split(r',(?![^(]*\))', prelude)]
    kept = [c for c in (conv_selector(p) for p in parts) if c]
    return (','.join(kept) + '{' + body + '}') if kept else ''


rules = []
for prelude, body in split_blocks(style):
    if prelude.startswith('@media'):
        inner = ''.join(convert_rule(p, b) for p, b in split_blocks(body))
        if inner: rules.append(prelude + '{' + inner + '}')
    elif prelude.startswith('@'):
        continue
    elif prelude.startswith(':root'):
        rules.append(prelude + '{' + body + '}')
    else:
        r = convert_rule(prelude, body)
        if r: rules.append(r)
CSS = '\n'.join(rules)

# ---------------- HTML ----------------
def balanced_div(s, start):
    depth, i = 0, start
    for m in re.finditer(r'<div\b|</div>', s[start:]):
        depth += 1 if m.group(0) == '<div' else -1
        if depth == 0: return s[start:start + m.end()]
    raise SystemExit('div не закрыт')


hs = IDX.index('<div class="hdr-cap hdr-dk">')
HEADER = balanced_div(IDX, hs)
ms = IDX.index('<div id="mnav"')
MNAV = IDX[ms:IDX.index('<a id="mcta"', ms)].strip()


def fix_links(h):
    h = h.replace('href="#top"', 'href="/"').replace('href="#final"', 'href="/trial-form.html"').replace('href="#talk"', 'href="/talk-club.html"')
    h = re.sub(r'href="#(how|teachers|formats|faq)"', r'href="/#\1"', h)
    h = h.replace(' data-mgo', '')
    return h


HEADER = fix_links(HEADER).replace('class="hdr-cap hdr-dk"', 'class="hdr-cap hdr-dk fixed"', 1)
MNAV = fix_links(MNAV)

JS = """(function(){var M=document.getElementById('mnav');if(!M)return;
function open(v){M.classList.toggle('on',v);document.body.classList.toggle('mopen',v);if(v)M.querySelectorAll('.ml a').forEach(function(a,i){a.style.transitionDelay=(.04*i+.05)+'s'})}
document.addEventListener('click',function(e){if(e.target.closest('.ykh .burger')){e.preventDefault();open(true)}});
M.querySelector('.x').onclick=function(){open(false)};
M.addEventListener('click',function(e){if(e.target.closest('a'))open(false)});
document.addEventListener('keydown',function(e){if(e.key==='Escape')open(false)});
})();"""

BLOCKS = {
    'css': ('/*YKH-CSS-START*/', '/*YKH-CSS-END*/', CSS),
    'html': ('<!--YKH-HTML-START-->', '<!--YKH-HTML-END-->', '<div class="ykh">' + HEADER + '</div>\n' + MNAV),
    'js': ('/*YKH-JS-START*/', '/*YKH-JS-END*/', JS),
}

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    for page in sys.argv[1:]:
        p = os.path.join(REPO, page)
        s = open(p, encoding='utf-8').read()
        for key, (a, b, content) in BLOCKS.items():
            pat = re.compile(re.escape(a) + r'.*?' + re.escape(b), re.S)
            if not pat.search(s):
                print(page, ': маркер', a, 'не найден'); sys.exit(1)
            s = pat.sub(lambda m: a + '\n' + content + '\n' + b, s, count=1)
        open(p, 'w', encoding='utf-8', newline='\n').write(s)
        print(page, 'шапка обновлена, CSS', len(CSS) // 1024, 'КБ')
