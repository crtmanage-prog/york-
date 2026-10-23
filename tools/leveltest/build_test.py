# -*- coding: utf-8 -*-
"""Проверяет банк, перемешивает варианты (детерминированно) и вставляет BANK в level-test.html между маркерами.
Флаг --audio: озвучивает аудирование (edge-tts + ffmpeg) в assets/leveltest/."""
import asyncio, json, os, random, re, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bank as B

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
HTML = os.path.join(REPO, 'level-test.html')
AUDIO = os.path.join(REPO, 'assets', 'leveltest')
VOICES = {'F': 'en-GB-SoniaNeural', 'M': 'en-GB-RyanNeural', 'A': 'en-GB-LibbyNeural'}
errors = []


def shuf(correct, wrong, rnd, where):
    opts = [correct] + list(wrong)
    if len(set(opts)) != len(opts):
        errors.append(('дубли вариантов', where))
    if any(len(o) > 80 for o in opts):
        errors.append(('длинный вариант', where))
    rnd.shuffle(opts)
    return opts, opts.index(correct)


def build():
    rnd = random.Random(2026)
    out = {'G': [], 'V': [], 'U': [], 'R': [], 'P': [], 'L': []}
    for l, t, c, w in B.G:
        o, a = shuf(c, w, rnd, t); out['G'].append([l, t, o, a])
    for l, t, c, w in B.V:
        o, a = shuf(c, w, rnd, t); out['V'].append([l, t, o, a])
    for l, c, w in B.U:
        o, a = shuf(c, w, rnd, c); out['U'].append([l, 'Which sentence is correct?', o, a])
    for l, p, q, c, w in B.R:
        o, a = shuf(c, w, rnd, q); out['R'].append([l, p, q, o, a])
    for l, title, text, qs, tf in B.P:
        items = []
        for k in range(2):
            q, c, w = qs[k]
            o, a = shuf(c, w, rnd, q); items.append([q, o, a, 0])
            st, ans = tf[k]
            items.append([st, ['True', 'False', 'Not stated'], ans, 1])
        out['P'].append([l, title, text, items])
    for l, f, lines, q, c, w in B.L:
        o, a = shuf(c, w, rnd, q); out['L'].append([l, f, q, o, a])
    # проверки покрытия
    for key in ('G', 'V', 'U', 'R', 'L'):
        per = [0] * 6
        for it in out[key]: per[it[0]] += 1
        print(key, 'по уровням A1..C2:', per)
    print('P (уровни):', [p[0] for p in out['P']])
    # тире нигде нельзя
    blob = json.dumps(out, ensure_ascii=False)
    if re.search('[—–]', blob): errors.append(('тире в банке', ''))
    # распределение позиции верного ответа
    pos = [0] * 4
    for key in ('G', 'V', 'U'):
        for it in out[key]: pos[it[3]] += 1
    print('позиции верного ответа:', pos)
    return out


def inject(bank):
    s = open(HTML, encoding='utf-8').read()
    app = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app.js'), encoding='utf-8').read()
    ma = re.search(r'/\*APP-START\*/.*?/\*APP-END\*/', s, re.S)
    if not ma:
        print('маркеры APP-START/END не найдены'); sys.exit(1)
    s = s[:ma.start()] + '/*APP-START*/\n' + app + '\n/*APP-END*/' + s[ma.end():]
    m = re.search(r'/\*BANK-START\*/.*?/\*BANK-END\*/', s, re.S)
    if not m:
        print('маркеры BANK-START/END не найдены в level-test.html, вставка пропущена'); return
    js = '/*BANK-START*/const BANK=' + json.dumps(bank, ensure_ascii=False, separators=(',', ':')) + ';/*BANK-END*/'
    s = s[:m.start()] + js + s[m.end():]
    open(HTML, 'w', encoding='utf-8', newline='\n').write(s)
    print('BANK вставлен:', len(js) // 1024, 'КБ')


async def audio():
    import edge_tts
    os.makedirs(AUDIO, exist_ok=True)
    tmp = os.path.join(AUDIO, '_tmp'); os.makedirs(tmp, exist_ok=True)
    sil = os.path.join(tmp, 'sil.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', '0.6', '-q:a', '9', sil], check=True)
    for l, f, lines, q, c, w in B.L:
        parts = []
        lines = [('A', B.L_INTRO[f] + ' ' + B.L_TASK)] + list(lines)
        for i, (v, text) in enumerate(lines):
            p = os.path.join(tmp, f'{f}_{i}.mp3')
            await edge_tts.Communicate(text, VOICES[v], rate='-10%' if l <= 1 else '+0%').save(p)
            parts.append(p)
        lst = os.path.join(tmp, 'list.txt')
        with open(lst, 'w', encoding='utf-8') as fh:
            for p in parts:
                fh.write("file '" + p.replace('\\', '/') + "'\nfile '" + sil.replace('\\', '/') + "'\n")
        outp = os.path.join(AUDIO, f + '.mp3')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c:a', 'libmp3lame', '-b:a', '48k', '-ac', '1', outp], check=True)
        print(f, os.path.getsize(outp) // 1024, 'КБ')
    for x in os.listdir(tmp): os.remove(os.path.join(tmp, x))
    os.rmdir(tmp)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    bank = build()
    if errors:
        print('ОШИБКИ:', errors); sys.exit(1)
    if '--audio' in sys.argv:
        asyncio.run(audio())
    inject(bank)
