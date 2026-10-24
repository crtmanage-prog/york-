# -*- coding: utf-8 -*-
"""Собирает боевой index.html из утверждённого york-site-redesign.html (пакет handoff).
Шаги: картинки base64 -> images/*.webp, служебный <head> и Метрика из index-old.html,
статичный пререндер #page (Chrome --dump-dom), FAQPage JSON-LD из реального FAQ."""
import base64, html, json, os, re, shutil, subprocess, sys, tempfile

SRC = r'D:\york\handoff\york-handoff'
REPO = r'D:\york\github'
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

src = open(os.path.join(SRC, 'york-site-redesign.html'), encoding='utf-8').read()
old = open(os.path.join(REPO, 'index-old.html'), encoding='utf-8').read()

# ---------- 1. картинки ----------
FILES = {
    'GIMG': {'me': 'goal-for-me', 'kids': 'goal-kids', 'travel': 'goal-travel', 'study': 'goal-study'},
    'TCARD': {'kat': 'teacher-ekaterina', 'sof': 'teacher-sofya', 'dsr': 'teacher-darya-lyrics', 'dtr': 'teacher-darya-accelerator'},
}
os.makedirs(os.path.join(REPO, 'images'), exist_ok=True)
for const, mp in FILES.items():
    m = re.search(r'<script>const %s=\{(.*?)\};</script>' % const, src, re.S)
    assert m, const
    body = m.group(1)
    pairs = dict(re.findall(r'(\w+):"data:image/webp;base64,([A-Za-z0-9+/=]+)"', body))
    assert set(pairs) == set(mp), (const, set(pairs))
    out = []
    for k, b64 in pairs.items():
        raw = base64.b64decode(b64)
        fname = mp[k] + '.webp'
        ref = open(os.path.join(SRC, 'images', fname), 'rb').read()
        assert raw == ref, 'base64 != файл: ' + fname
        shutil.copyfile(os.path.join(SRC, 'images', fname), os.path.join(REPO, 'images', fname))
        out.append('%s:"images/%s"' % (k, fname))
    src = src.replace(m.group(0), '<script>const %s={%s};</script>' % (const, ','.join(out)))

# блок цен: крупно стоимость урока в абонементе, ниже стоимость самого абонемента
OLD_PRICE = '<div class="price"><b>${p[1]} ₽</b><span>${p[0]} ₽ за урок</span></div><div class="tot">${PN[n]} · потом <s>${p[2]} ₽</s></div>'
NEW_PRICE = '<div class="price"><b>${p[0]} ₽</b><span>за урок в абонементе</span></div><div class="tot">Абонемент, ${PN[n]}: <b>${p[1]} ₽</b> · потом <s>${p[2]} ₽</s></div>'
assert OLD_PRICE in src
src = src.replace(OLD_PRICE, NEW_PRICE, 1)

# Talk Club на главной: крупно цена встречи, ниже стоимость абонемента
OLD_TC = r'<div class="price gw"><div><b>1 990 ₽<\/b><\/div><span>первые<br>4 встречи<\/span><span class="sep"><\/span><div><b>2 490 ₽<\/b><\/div><span>в месяц<br>дальше<\/span><\/div>'
NEW_TC = r'<div class="price gw"><div><b>497,5 ₽<\/b><\/div><span>за встречу<br>первые 4 встречи<\/span><span class="sep"><\/span><div><b>622,5 ₽<\/b><\/div><span>за встречу<br>дальше<\/span><\/div><p class="pnote2">Абонемент: <b>1 990 ₽<\/b> за 4 встречи, затем <b>2 490 ₽<\/b> в месяц<\/p>'
assert OLD_TC in src, 'Talk Club price strip not found'
src = src.replace(OLD_TC, NEW_TC, 1)

# a11y/SEO картинок
src = src.replace('<img class="cimg" alt=', '<img class="cimg" loading="lazy" decoding="async" alt=')
src = src.replace("const IMGD=g=>g.img?`<div class=\"img\" style=",
                  "const IMGD=g=>g.img?`<div class=\"img\" role=\"img\" aria-label=\"${g.k}: ${g.h}\" style=")
assert 'role=\\"img\\"' not in src and 'role="img" aria-label="${g.k}' in src
# мёртвая константа со вторым h1 (нигде не используется)
assert len(re.findall(r'\bH1\b', src.split('</style>')[1])) == 1
src = src.replace('const H1=`<h1 class="h">Не ещё один курс. <em>Английский для жизни.</em></h1>`;\n', '')

# ---------- 2. head ----------
def grab(pat, text, flags=re.S):
    m = re.search(pat, text, flags)
    assert m, pat
    return m.group(0)

title = grab(r'<title>.*?</title>', old)
desc = grab(r'<meta name="description"[^>]*>', old)
head_extra = grab(r'<meta name="robots".*?<meta name="theme-color"[^>]*>', old)
org_ld = grab(r'<script type="application/ld\+json">\s*\{\s*"@context": "https://schema.org",\s*"@type": "EducationalOrganization".*?</script>', old)
metrika = grab(r'<!-- Yandex\.Metrika counter -->.*?</noscript>', old)
fonts = grab(r'<link href="https://fonts\.googleapis\.com/css2[^>]*>', src)
style = grab(r'<style>.*?</style>', src)
# меню «Направления» закрывалось при движении мыши вниз: между кнопкой и меню был зазор 8px без hover.
# Невидимый мостик над меню и открытие по фокусу с клавиатуры.
style = style.replace('</style>', '.nav .menu::before{content:"";position:absolute;left:0;right:0;top:-14px;height:14px}\n'
                      '.nav .dd:focus-within .menu{display:block}\n'
                      '.blk5 .tot b{color:#fff;font-weight:600}\n'
                      '#talk .pnote2{margin:10px 0 0;font-size:13.5px;line-height:1.45;opacity:.75}\n'
                      '#talk .pnote2 b{font-weight:600}\n</style>')

# ---------- 3. тело ----------
body = src.split('<body>', 1)[1].rsplit('</body>', 1)[0]
# гайд «Watch & Speak» убран с сайта по решению владельца
body = re.sub(r'[ \t]*<li><a href="https://crtmanage-prog\.github\.io/york-/guide/watch_and_speak_final\.html"[^>]*>[^<]*</a></li>\n', '', body)
assert 'watch_and_speak' not in body

def build(page_inner, faq_ld):
    return ('<!DOCTYPE html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            + title + '\n' + desc + '\n' + head_extra + '\n' + org_ld + '\n' + faq_ld + '\n'
            '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
            '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
            + fonts + '\n' + style + '\n</head>\n<body>\n' + metrika + '\n'
            + body.replace('<div id="page"></div>', '<div id="page">' + page_inner + '</div>', 1).rstrip()
            + '\n<script>/* карточки карусели ленивые, но после загрузки страницы подгружаем все, иначе боковые карточки пустые */'
            + "addEventListener('load',function(){document.querySelectorAll('img.cimg[loading=lazy]').forEach(function(i){i.loading='eager'})});</script>"
            + '\n</body>\n</html>\n')

# ---------- 4. пререндер ----------
SNAP = ("<script>(function(){var p=document.getElementById('page'),h=document.querySelector('body>.hdr-cap'),t=document.getElementById('top');"
        "if(h&&t){var c=h.cloneNode(true);c.classList.remove('fixed');t.insertBefore(c,t.firstChild)}"
        "var o=document.createElement('textarea');o.id='snap';o.textContent=p.innerHTML;document.body.innerHTML='';document.body.appendChild(o)})();</script>")
tmp = build('', '')
cut = tmp.index("<script>(function(){const t=document.getElementById('teachers'),rv=document.getElementById('reviews')")
cut_end = tmp.index('</script>', cut) + len('</script>')
snap_html = tmp[:cut_end] + '\n' + SNAP + '\n</body></html>'
# метрику в снимке не грузим
snap_html = snap_html.replace(metrika, '')
tdir = tempfile.mkdtemp()
sp = os.path.join(tdir, 'snap.html')
open(sp, 'w', encoding='utf-8').write(snap_html)
# картинки по относительным путям
shutil.copytree(os.path.join(REPO, 'images'), os.path.join(tdir, 'images'))
dom = subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--no-sandbox', '--window-size=1440,900',
                      '--virtual-time-budget=4000', '--dump-dom', 'file:///' + sp.replace('\\', '/')],
                     capture_output=True, timeout=120).stdout.decode('utf-8')
m = re.search(r'<textarea id="snap">(.*?)</textarea>', dom, re.S)
assert m, dom[:500]
page_inner = html.unescape(m.group(1))
print('снимок #page:', len(page_inner), 'байт')

# ---------- 5. FAQPage из реального FAQ ----------
faq_sec = re.search(r'<section id="faq".*?</section>', page_inner, re.S).group(0)
def text_of(x):
    x = re.sub(r'<svg.*?</svg>', '', x, flags=re.S)
    x = re.sub(r'<[^>]+>', ' ', x)
    return re.sub(r'\s+', ' ', html.unescape(x)).strip().replace(' ,', ',').replace(' .', '.')

faq = []
for chunk in faq_sec.split('<div class="qa')[1:]:
    q = re.search(r'<span class="qt">(.*?)</span>', chunk, re.S).group(1)
    ans = chunk.split('<div class="a">', 1)[1]
    paras = re.findall(r'<p>(.*?)</p>', ans, re.S)
    faq.append((text_of(q), ' '.join(text_of(x) for x in paras)))
print('FAQ вопросов:', len(faq))
for q, an in faq:
    print(' -', q, '|', an[:70])
assert len(faq) == 12 and all(q and a for q, a in faq), 'FAQ разобран неверно'
ld = {'@context': 'https://schema.org', '@type': 'FAQPage',
      'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faq]}
faq_ld = ('<!-- FAQPage: 12 вопросов из блока #faq (3 вкладки по 4), тексты дословно -->\n<script type="application/ld+json">\n'
          + json.dumps(ld, ensure_ascii=False, indent=2) + '\n</script>')

out = build(page_inner, faq_ld)
open(os.path.join(REPO, 'index.html'), 'w', encoding='utf-8', newline='\n').write(out)
print('index.html:', len(out.encode('utf-8')) // 1024, 'КБ')
