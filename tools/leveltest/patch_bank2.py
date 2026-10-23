# -*- coding: utf-8 -*-
"""Однократно: тексты получают 2 вопроса на понимание + 2 утверждения True/False/Not stated; у записей появляются вступления диктора."""
import os, re

D = os.path.dirname(os.path.abspath(__file__))
p = os.path.join(D, 'bank.py')
s = open(p, encoding='utf-8').read()

NEW_P = '''# ---------- Passages: (уровень, заголовок, текст, [(вопрос, правильный, [неверные]) x2], [(утверждение, ответ 0=True 1=False 2=Not stated) x2]) ----------
# Порядок вопросов к тексту: понимание, True/False/Not stated, понимание, True/False/Not stated
P = [
 (1, "Maria's weekend",
  "On Saturday, Maria usually gets up late. She has a big breakfast with her sister, and then they go to the market to buy fruit and vegetables. In the afternoon, Maria plays tennis with her friend Olga. On Sunday, she visits her grandparents, who live in a small village near the city. They always cook a special lunch for the family. Maria likes Sundays more than Saturdays because she loves her grandmother's apple cake.",
  [("Who does Maria go to the market with?", "Her sister", ["Olga", "Her grandmother", "A friend from work"]),
   ("Why does Maria prefer Sundays?", "She loves her grandmother's cake.", ["She plays tennis.", "She sleeps late.", "She goes shopping."])],
  [("Maria plays tennis on Sunday.", 1), ("Maria's sister plays tennis too.", 2)]),
 (2, "Moving to a new city",
  "When Daniel moved to Manchester for work, he didn't know anyone. The first weeks were difficult: he spent most evenings alone in his flat, watching films. Then a colleague invited him to join a local running club. At first Daniel hesitated, as he hadn't run since school, but he decided to try it. Six months later, he has made several close friends and has even signed up for a half-marathon. 'Running wasn't the point,' he says. 'It was a way to meet people.'",
  [("Why were the first weeks difficult for Daniel?", "He didn't know anyone in the city.", ["He had too much work.", "He didn't like Manchester.", "He was ill."]),
   ("What does Daniel mean by 'Running wasn't the point'?", "Making friends mattered more than the sport.", ["He doesn't enjoy running.", "He wants to win races.", "He only runs for his health."])],
  [("Daniel ran regularly before he moved to Manchester.", 1), ("Daniel's colleague is also training for the half-marathon.", 2)]),
 (2, "A weekend in Lisbon",
  "We arrived in Lisbon on Friday evening and, after checking in, went straight to a small restaurant recommended by the hotel receptionist. The seafood was excellent and surprisingly cheap. On Saturday we took the famous tram up the hills, but it was so crowded that we decided to walk back. That turned out to be the best part of the day, because we found a little cafe with a view over the river. By Sunday, our feet were sore, but we agreed that we would definitely come back.",
  [("Where did they have dinner on Friday?", "At a restaurant the receptionist suggested", ["At the hotel", "At a cafe by the river", "At a friend's house"]),
   ("Why did they walk back on Saturday?", "The tram was too crowded.", ["The tram was too expensive.", "It was raining.", "They were lost."])],
  [("They found a cafe while they were walking back.", 0), ("They visited a museum on Sunday.", 2)]),
 (3, "Sleep and memory",
  "Scientists have long known that sleep is essential, but recent research suggests that its role in memory is even greater than previously thought. During deep sleep, the brain appears to replay the day's events, strengthening important connections while discarding trivial details. This may explain why students who sleep after studying perform better in tests than those who stay up revising all night. However, researchers warn against drawing simple conclusions: the amount of sleep people need varies considerably, and for some individuals, six hours may be perfectly adequate.",
  [("What does recent research suggest about sleep?", "It plays a bigger role in memory than assumed.", ["Memory is unaffected by sleep.", "Everyone needs eight hours.", "Deep sleep is unnecessary."]),
   ("What do the researchers warn?", "Sleep needs differ between people.", ["Six hours is never enough.", "Revising at night is best.", "Conclusions are always simple."])],
  [("The brain seems to replay the day's events during deep sleep.", 0), ("Most adults sleep for less than six hours a night.", 2)]),
 (4, "The attention problem",
  "It is tempting to blame our shrinking attention spans on smartphones, but the argument is less straightforward than it appears. Attention has always been a limited resource, and every era has had its distractions; what has changed is the sheer efficiency with which modern technology competes for it. Apps are engineered by teams of specialists whose express aim is to keep users engaged, and against such sophisticated persuasion, individual willpower is a poor defence. This suggests that the burden of responsibility should not rest solely on the user, but also on the designers who profit from our distraction.",
  [("What is the writer's attitude to blaming smartphones?", "It oversimplifies the issue.", ["It is entirely justified.", "It is outdated.", "It is hypocritical."]),
   ("What does the writer conclude?", "Designers share the responsibility.", ["Users should simply try harder.", "Technology should be banned.", "Willpower is the best defence."])],
  [("The writer claims that attention has become a limited resource only recently.", 1), ("Apps are deliberately designed to keep people engaged.", 0)]),
]

'''

a = s.index('# ---------- Passages')
b = s.index('# ---------- Listening')
s = s[:a] + NEW_P + s[b:]

INTRO = '''
# Вступление диктора перед каждой записью: что вы услышите и что нужно сделать
L_INTRO = {
 "l01": "You will hear a woman introducing herself.",
 "l02": "You will hear two people talking in a shop.",
 "l03": "You will hear two friends talking about a film.",
 "l04": "You will hear a voicemail message.",
 "l05": "You will hear an announcement at a railway station.",
 "l06": "You will hear two people talking about a trip.",
 "l07": "You will hear a weather forecast on the radio.",
 "l08": "You will hear two people talking about work.",
 "l09": "You will hear a man talking about life abroad.",
 "l10": "You will hear part of a talk about exercise.",
 "l11": "You will hear two colleagues discussing a project proposal.",
 "l12": "You will hear part of a lecture about decision making.",
 "l13": "You will hear two people discussing a speech.",
 "l14": "You will hear a speaker commenting on a government policy.",
}
L_TASK = "Listen and choose the correct answer."
'''
if 'L_INTRO' not in s:
    s = s.rstrip() + '\n' + INTRO
open(p, 'w', encoding='utf-8', newline='\n').write(s)

# build_test.py: новая структура P и озвучка с вступлением диктора
t = os.path.join(D, 'build_test.py')
b2 = open(t, encoding='utf-8').read()
old = b2[b2.index("    for l, title, text, qs in B.P:"):b2.index("    for l, f, lines, q, c, w in B.L:")]
new = '''    for l, title, text, qs, tf in B.P:
        items = []
        for k in range(2):
            q, c, w = qs[k]
            o, a = shuf(c, w, rnd, q); items.append([q, o, a, 0])
            st, ans = tf[k]
            items.append([st, ['True', 'False', 'Not stated'], ans, 1])
        out['P'].append([l, title, text, items])
'''
b2 = b2.replace(old, new)
b2 = b2.replace("VOICES = {'F': 'en-GB-SoniaNeural', 'M': 'en-GB-RyanNeural'}",
                "VOICES = {'F': 'en-GB-SoniaNeural', 'M': 'en-GB-RyanNeural', 'A': 'en-GB-LibbyNeural'}")
b2 = b2.replace("        parts = []\n        for i, (v, text) in enumerate(lines):",
                "        parts = []\n        lines = [('A', B.L_INTRO[f] + ' ' + B.L_TASK)] + list(lines)\n        for i, (v, text) in enumerate(lines):")
open(t, 'w', encoding='utf-8', newline='\n').write(b2)
print('ok')
