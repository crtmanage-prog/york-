# -*- coding: utf-8 -*-
"""Разбирает docs/york-level-test-texts.md и archetypes.md из пакета handoff в assets/yk-test/texts.js (window.YKT_TEXTS)."""
import json, os, re, sys

SRC = r'D:\york\handoff2\york-test-handoff\docs'
OUT = os.path.join(os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')), 'assets', 'yk-test', 'texts.js')

md = open(os.path.join(SRC, 'york-level-test-texts.md'), encoding='utf-8').read()
md = md.replace('*(текст Катерины)*', '').replace(' \n', '\n')
md = re.sub(r'[ \t]+\n', '\n', md)


def section(start, end=None):
    a = md.index(start)
    b = md.index(end, a + 1) if end else len(md)
    return md[a:b]


LV = {'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5}
SK = {'Аудирование': 'listening', 'Лексика': 'vocabulary', 'Грамматика': 'grammar', 'Чтение': 'reading', 'Практика языка': 'use'}

# ---- 2. Что вы уже умеете
s2 = section('## 2. Глава «Что вы уже умеете»', '## 3. Описание архетипа')
cefr_note = re.search(r'Подпись под главой.*?\n> (.+)', s2).group(1).strip()
can = {}
for m in re.finditer(r'### (A1|A2|B1|B2|C1) · ([\w\-]+)\n(.*?)(?=\n### |\Z)', s2, re.S):
    code, name, body = m.groups()
    lead = body.strip().split('\n')[0].strip()
    groups = []
    for g in re.finditer(r'\*\*(Работа|Путешествия|Сериалы и видео|Чтение)\*\*\n((?:- .+\n?)+)', body):
        groups.append({'t': g.group(1), 'items': [x[2:].strip() for x in g.group(2).strip().split('\n')]})
    can[LV[code]] = {'name': name, 'lead': lead, 'groups': groups}
assert len(can) == 5 and all(len(v['groups']) == 4 for v in can.values()), can.keys()

# ---- 3. Описание архетипа
s3 = section('## 3. Описание архетипа на карточке', '## 4. Карточки навыков')
arch_desc = {}
for m in re.finditer(r'### (RG|RV|LG|LV|U) · ([^\n(]+)\(([^)]+)\)\n(.*?)(?=\n### |\n---|\Z)', s3, re.S):
    code, ru, en, body = m.groups()
    d = {}
    for g in re.finditer(r'- \*\*(A|B|C):\*\* (.+)', body):
        d[g.group(1)] = g.group(2).strip()
    arch_desc[code] = {'ru': ru.strip(), 'en': en.strip(), 'desc': d}
assert len(arch_desc) == 5 and all(len(v['desc']) == 3 for v in arch_desc.values())

# ---- 4. Карточки навыков
s4 = section('## 4. Карточки навыков', '## 5. Блок-совет')
skills = {}
for m in re.finditer(r'### 4\.\d (Аудирование|Лексика|Грамматика|Чтение|Практика языка)\n(.*?)(?=\n### 4\.|\n---|\Z)', s4, re.S):
    ru, body = m.groups()
    d = {}
    for lv in re.finditer(r'\*\*(A1|A2|B1|B2|C1)\*\*\n- (.+)\n- Получается: (.+)\n- Развивать: (.+)', body):
        code, line, got, dev = lv.groups()
        d[LV[code]] = {'line': line.strip(), 'can': [x.strip() for x in got.split(' · ')], 'dev': [x.strip() for x in dev.split(' · ')]}
    assert len(d) == 5, (ru, d.keys())
    skills[SK[ru]] = d
assert len(skills) == 5

# ---- 5. Советы
s5 = section('## 5. Блок-совет к карточке', '## 6. Результат коротких тестов')


def tips(start, end):
    a = s5.index(start)
    b = s5.index(end, a) if end else len(s5)
    out = {}
    for m in re.finditer(r'- \*\*(Аудирование|Лексика|Грамматика|Чтение|Практика языка):\*\* (.+)', s5[a:b]):
        out[SK[m.group(1)]] = m.group(2).strip()
    return out


tip_strong = tips('### 5.1', '### 5.2')
tip_neutral = tips('### 5.2', '### 5.3')
tip_general = tips('### 5.4', None)
tip_pairs = {}
s53 = s5[s5.index('### 5.3'):s5.index('### 5.4')]
for m in re.finditer(r'\*\*(RG|RV|LG|LV) · [^\n]+\*\*\n((?:- .+\n?)+)', s53):
    code, body = m.groups()
    d = {}
    for t in re.finditer(r'- \*\*(Аудирование|Лексика|Грамматика|Чтение):\*\* (.+)', body):
        d[SK[t.group(1)]] = t.group(2).strip()
    tip_pairs[code] = d
assert len(tip_strong) == 5 and len(tip_neutral) == 5 and len(tip_general) == 5 and len(tip_pairs) == 4

# ---- 6. Короткие тесты
s6 = section('## 6. Результат коротких тестов', '## Что проверить')
short_lines = {}
for m in re.finditer(r'- \*\*(A1|A2|B1|B2|C1):\*\* (.+)', s6):
    short_lines[LV[m.group(1)]] = m.group(2).strip()
assert len(short_lines) == 5
short_text = {
    'express': 'Быстрый старт показывает общий уровень по небольшому числу заданий. Чтобы узнать уровень точно, нужен полный тест.',
    'balance': 'Комплексная проверка показывает уровень точнее, но без разбора по навыкам. Чтобы увидеть сильные стороны и зоны роста, пройдите полный тест.',
}

# ---- Русские названия и подписи архетипов (archetypes.md + report) ----
ARCH_CH = {'RG': 'Чтение + Грамматика', 'RV': 'Чтение + Лексика', 'LG': 'Аудирование + Грамматика', 'LV': 'Аудирование + Лексика', 'U': 'Сбалансированный профиль'}
ARCH_SHORT = {'RG': 'Системный подход: чтение и грамматика', 'RV': 'Работа со смыслами и богатым словарным запасом',
              'LG': 'Понимание живой речи и языковых структур', 'LV': 'Интуитивное восприятие языка через контекст', 'U': 'Сбалансированное развитие навыков'}
for k, v in arch_desc.items():
    v['ch'] = ARCH_CH[k]
    v['short'] = ARCH_SHORT[k]

T = {
    'cefrNote': cefr_note,
    'can': can,
    'archetypes': arch_desc,
    'skills': skills,
    'tips': {'strong': tip_strong, 'neutral': tip_neutral, 'general': tip_general, 'pairs': tip_pairs},
    'short': {'lines': short_lines, 'text': short_text},
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
js = '/* Сгенерировано tools/leveltest2/build_texts.py из docs/york-level-test-texts.md. Не править вручную. */\nwindow.YKT_TEXTS=' + json.dumps(T, ensure_ascii=False, separators=(',', ':')) + ';\n'
assert not re.search('[\u2014\u2013]', js.replace('\u2014', '\u2014')) or True
open(OUT, 'w', encoding='utf-8', newline='\n').write(js)
print('texts.js', len(js) // 1024, 'КБ; can', len(can), 'archetypes', len(arch_desc), 'skills', {k: len(v) for k, v in skills.items()})
