# -*- coding: utf-8 -*-
"""Переводит банк tools/leveltest/bank.py в схему questions.json из HANDOFF (уровни 1=A1 ... 5=C1; C2 переносится в C1).
Когда придёт настоящий questions.json, этот файл не нужен: достаточно заменить assets/yk-test/questions.json."""
import json, os, random, re, subprocess, sys

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
sys.path.insert(0, os.path.join(REPO, 'tools', 'leveltest'))
import bank as B  # noqa: E402

OUT = os.path.join(REPO, 'assets', 'yk-test', 'questions.json')
rnd = random.Random(2026)
LV = lambda l: min(5, l + 1)   # 0..5 -> 1..5


def shuf(c, w):
    o = [c] + list(w); rnd.shuffle(o); return o, o.index(c)


def fmts(level):
    return ['express', 'balance', 'deep']


Q = []
counters = {}


def qid(prefix, level):
    k = (prefix, level); counters[k] = counters.get(k, 0) + 1
    return f"{prefix}-{['A1','A2','B1','B2','C1'][level-1]}-{counters[k]:03d}"


for l, t, c, w in B.G:
    o, a = shuf(c, w); lv = LV(l)
    Q.append({'id': qid('G', lv), 'block': 'grammar', 'level': lv, 'type': 'choice', 'prompt': t, 'options': o, 'answer': a, 'passage_id': None, 'audio': None, 'formats': fmts(lv)})
for l, t, c, w in B.V:
    o, a = shuf(c, w); lv = LV(l)
    Q.append({'id': qid('V', lv), 'block': 'vocabulary', 'level': lv, 'type': 'choice', 'prompt': t, 'options': o, 'answer': a, 'passage_id': None, 'audio': None, 'formats': fmts(lv)})
for l, c, w in B.U:
    o, a = shuf(c, w); lv = LV(l)
    Q.append({'id': qid('U', lv), 'block': 'use', 'level': lv, 'type': 'choice', 'prompt': 'Which sentence is correct?', 'options': o, 'answer': a, 'passage_id': None, 'audio': None, 'formats': fmts(lv)})

passages = []
for i, (l, title, text, qs, tf) in enumerate(B.P, 1):
    lv = LV(l); pid = f'P-{i:02d}'
    passages.append({'id': pid, 'level': lv, 'title': title, 'text': text})
    n = 0
    for k in range(2):
        q, c, w = qs[k]
        o, a = shuf(c, w); n += 1
        Q.append({'id': f'R-{pid}-{n}', 'block': 'reading', 'level': lv, 'type': 'choice', 'prompt': q, 'options': o, 'answer': a, 'passage_id': pid, 'audio': None, 'formats': fmts(lv)})
        st, ans = tf[k]; n += 1
        Q.append({'id': f'R-{pid}-{n}', 'block': 'reading', 'level': lv, 'type': 'tfns', 'prompt': st, 'options': ['True', 'False', 'Not stated'], 'answer': ans, 'passage_id': pid, 'audio': None, 'formats': fmts(lv)})

audios = []
for l, f, lines, q, c, w in B.L:
    lv = LV(l); aid = 'A-' + f
    path = os.path.join(REPO, 'assets', 'leveltest', f + '.mp3')
    try:
        dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout.strip())
    except Exception:
        dur = os.path.getsize(path) * 8 / 48000
    audios.append({'id': aid, 'level': lv, 'src': 'assets/leveltest/' + f + '.mp3', 'duration': round(dur, 1)})
    o, a = shuf(c, w)
    Q.append({'id': qid('L', lv), 'block': 'listening', 'level': lv, 'type': 'choice', 'prompt': q, 'options': o, 'answer': a, 'passage_id': None, 'audio': aid, 'formats': fmts(lv)})

data = {'version': 1, 'note': 'Временный банк (переведён из старого теста). Заменить настоящим questions.json.', 'questions': Q, 'passages': passages, 'audios': audios}
js = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
assert not re.search('[—–]', js)
open(OUT, 'w', encoding='utf-8', newline='\n').write(js)
from collections import Counter
print('вопросов', len(Q), dict(Counter(q['block'] for q in Q)), 'текстов', len(passages), 'записей', len(audios), len(js) // 1024, 'КБ')
for b in ('grammar', 'vocabulary', 'use', 'listening', 'reading'):
    print(b, Counter(q['level'] for q in Q if q['block'] == b))
