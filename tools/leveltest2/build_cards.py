# -*- coding: utf-8 -*-
"""Рисует открытки результата для Telegram-бота: assets/result-cards/<уровень>_<архетип>.png и <уровень>.png (короткие тесты).
Нужен локальный сервер на :8123 (preview york-site) и Chrome."""
import os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
OUT = os.path.join(os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')), 'assets', 'result-cards')
os.makedirs(OUT, exist_ok=True)
jobs = []
for lv in ['A1', 'A2', 'B1', 'B2', 'C1']:
    jobs.append((lv, None))
    for ar in ['RG', 'RV', 'LG', 'LV', 'U']:
        jobs.append((lv, ar))


def run(j):
    lv, ar = j
    name = lv + ('_' + ar if ar else '') + '.png'
    url = 'http://localhost:8123/tools/leveltest2/cards.html?level=' + lv + ('&arch=' + ar if ar else '')
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--window-size=1080,1350',
                    '--virtual-time-budget=9000', '--screenshot=' + os.path.join(OUT, name), url], capture_output=True, timeout=120)
    return name, os.path.getsize(os.path.join(OUT, name)) // 1024


with ThreadPoolExecutor(max_workers=3) as ex:
    for n, kb in ex.map(run, jobs):
        print(n, kb, 'КБ')
