# -*- coding: utf-8 -*-
"""Однократно: заменяет старую шапку страницы маркерами для sync_header.py. Использование: prep_header_markers.py page.html"""
import os, re, sys

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
for page in sys.argv[1:]:
    p = os.path.join(REPO, page)
    s = open(p, encoding='utf-8').read()
    m = re.search(r'<header class="site-header">.*?</header>', s, re.S)
    assert m, 'старая шапка не найдена в ' + page
    s = s[:m.start()] + '<!--YKH-HTML-START--><!--YKH-HTML-END-->' + s[m.end():]
    # CSS: перед закрытием первого основного <style>
    i = s.index('</style>')
    s = s[:i] + '/*YKH-CSS-START*//*YKH-CSS-END*/\n' + s[i:]
    # JS: перед </body>
    j = s.rindex('</body>')
    s = s[:j] + '<script>/*YKH-JS-START*//*YKH-JS-END*/</script>\n' + s[j:]
    open(p, 'w', encoding='utf-8', newline='\n').write(s)
    print('маркеры добавлены:', page)
