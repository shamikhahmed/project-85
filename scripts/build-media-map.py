#!/usr/bin/env python3
"""Matches every exercise name the app can show (plan, alternatives, Block B, warm-ups,
cool-downs, swap fallbacks) to a Gym visual animation id from PulseCap's exercise library.

usage: build-media-map.py <pulse-db.json> <trainingPlan.json> <out.json>
pulse-db.json = [[name, mediaId, group], ...] exported from PulseCap js/data/exercise-db.js
"""
import json
import re
import sys

db = json.load(open(sys.argv[1]))
plan = json.load(open(sys.argv[2]))

# Plan wording → library wording, checked before fuzzy matching.
ALIASES = {
    'db': 'dumbbell', 'bb': 'barbell', 'ez': 'ez', 'kb': 'kettlebell', 'rdl': 'romanian deadlift',
    'pulldown': 'pulldown', 'pull-down': 'pulldown', 'push-ups': 'push up', 'push-up': 'push up',
    'pushups': 'push up', 'pull-ups': 'pull up', 'pull-up': 'pull up', 'chin-up': 'chin up',
    'tricep': 'triceps', 'bicep': 'biceps', 'flye': 'fly', 'flyes': 'fly', 'flys': 'fly',
    'raises': 'raise', 'curls': 'curl', 'rows': 'row', 'presses': 'press', 'lunges': 'lunge',
    'squats': 'squat', 'extensions': 'extension', 'crunches': 'crunch', 'shrugs': 'shrug',
}
EXACT = {
    # hand-picked where wording differs a lot
    'pec deck': 'Pec Deck',
    
    'hip abductor machine': 'Seated Hip Abduction', 'hip adductor machine': 'Hip Adduction Machine',
    'band pull-apart': 'Band Pull Apart', 'farmer walk': "Farmer's Walk", 'farmer carry': "Farmer's Walk",
    'treadmill or bike': 'Treadmill Incline Walk', 'easy bike or treadmill': 'Stationary Bike',
    'plank / dead bug': 'Dead Bug', 'dead bug': 'Dead Bug',
    'wall push-up': 'Wall Push-Up', 'band external rotation': 'Cable Standing Shoulder External Rotation',
    'barbell squat': 'Back Squat', 'dumbbell flat press': 'Dumbbell Bench Press',
    'db wrist curl': 'Wrist Curl', 'dumbbell hammer curl': 'Hammer Curl',
    'dumbbell overhead extension': 'Overhead Tricep Extension', 'dumbbell overhead extension, light': 'Overhead Tricep Extension',
    'overhead db extension (neutral grip)': 'Overhead Tricep Extension', 'lying leg raise': 'Leg Raises',
    'barbell shrug': 'Shrugs', 'straight-bar pushdown': 'Tricep Pushdown',
    'ez bar skull crusher, light': 'Skull Crushers',
    "captain's chair knee raise": 'Captains Chair Straight Leg Raise', 'step-ups onto a bench': 'Step-Ups',
    'landmine rotation': 'Landmine 180', 'chest-supported row machine': 'Seated Machine Row',
    'machine row, neutral grip': 'Seated Machine Row', 'machine row, one arm at a time': 'Seated Machine Row',
    'single-arm machine row': 'Seated Machine Row', 'leg press, high feet': 'Leg Press', 'hack squat, feet high': 'Hack Squat',
    'pendulum or single-leg press': 'Leg Press', 'pec deck, hands set low': 'Pec Deck',
    'lean-away single-arm lateral raise': 'Cable Lateral Raise', 'single-leg extension': 'Leg Extension',
    '45-degree back extension, weighted': 'Hyperextensions', 
    'neck mobility': 'Neck Side Stretch', 'farmer carry / dead bug': "Farmer's Walk",
    'goblet squat to bench': 'Goblet Squat',
    'dumbbell kickback': 'Tricep Kickback', 'cable glute kickback': 'Cable Kickback', 'side bend with dumbbell': '45° Side Bend',
    'cable front raise': 'Cable Front Raise', 
    'lat pulldown, close grip': 'Close-Grip Lat Pulldown', 'chest press machine, light': 'Machine Chest Press',
    'seated row machine': 'Seated Machine Row', 'rope triceps pushdown': 'Cable Tricep Pushdown — Rope',
    'one-arm dumbbell row': 'Dumbbell Row', 'push-ups on a bench': 'Push-Ups',
    'push-up on a bench': 'Push-Ups', 'single-leg bridge': 'Glute Bridge',
    'straight bar pushdown': 'Tricep Pushdown', 'rope cable hammer curl': 'Cable Hammer Curl (With Rope)',
    'rope hammer curl': 'Cable Hammer Curl (With Rope)', 'seated dumbbell overhead extension': 'Overhead Tricep Extension',
    'treadmill incline walk': 'Treadmill Incline Walk', 'elliptical': 'Elliptical',
    # audit 2026-11-06: corrected after visual review
    'push-up on a bench': 'Incline Push-Up', 'push-ups on a bench': 'Incline Push-Up',
    'side bend with dumbbell': 'Dumbbell Side Bend', 'single-leg bridge': 'Single Leg Bridge with Outstretched Leg',
    'single-leg calf raise': 'One Leg Floor Calf Raise', 'calf raise on a step': 'Standing Calf Raise (On a Staircase)',
    'cable kickback': 'Cable Two Arm Tricep Kickback', 'seated dumbbell overhead extension': 'Dumbbell Seated Triceps Extension',
    'overhead db extension (neutral grip)': 'Dumbbell Seated Triceps Extension', 'dumbbell overhead extension': 'Dumbbell Seated Triceps Extension',
    'dumbbell overhead extension, light': 'Dumbbell Seated Triceps Extension', 'db wrist curl': 'Dumbbell Seated Palms Up Wrist Curl',
    'back extension': 'Hyperextensions', 'v-bar pushdown': 'Cable Triceps Pushdown (V-Bar)',
    'assisted pull-up machine': 'Machine Assisted Chin-Up', 'standing calf raise': 'Bodyweight Standing Calf Raise', 'treadmill or bike': 'Walking on Incline Treadmill',
}
# No good animation in the library: show the video button only (a wrong GIF is worse than none).
NONE = {'ab crunch machine', 'band external rotation', 'bayesian cable curl', 'cable hip abduction',
        'cable reverse fly', 'reverse cable fly', 'good morning, light barbell', 'hanging knee raise', 'incline pec deck',
        'machine shoulder press', 'single-arm cable pulldown', 'single-arm cable row', 'wall scap push-up', 'shoulder press machine', 'db floor press', 'hip thrust machine', 'hip thrust', 'rear delt fly machine', 'reverse pec deck',
        'doorway chest stretch, gentle', 'bodyweight squat to a bench', 'brisk walk', 'standing quad stretch',
        'kneeling hip flexor stretch', 'preacher curl machine', 'band face pull', 'bodyweight squat', 'stability ball leg curl', 'landmine press', 'dead hang',
        'dead hang, 3 x 30 sec', 'cable woodchop', 'meadows row', 'face pull', 'band pull-apart',
        'band pull-apart, 3 x 20', 'cat-cow', "child's pose", 'leg swings', 'arm circles', '90/90 hip opener',
        'side-lying clam / db lateral lunge', 'banded side walks, 3 x 15 steps each way',
        'copenhagen plank on knees, 3 x 20 sec', 'band side walk', 'donkey kick on a mat', 'spanish squat with band',
        'band pulldown', 'crunch on a mat', 'plank on knees', 'side plank on knees', 'suitcase carry, one hand',
        'bodyweight box squat', }
STOP = {'machine', 'the', 'a', 'with', 'on', 'to', 'and', 'or', 'of', 'grip', 'light', 'slow',
        'seated', 'standing', 'leg', 'day', 'only', 'very', 'easy'}
KEEP_EVEN_IF_STOP = {'leg'}


def norm(s):
    s = s.lower()
    s = re.sub(r'\(.*?\)', ' ', s)
    s = re.sub(r'[,/·+]', ' ', s)
    toks = []
    for t in re.split(r'\s+', s):
        t = t.strip(" .'-")
        if not t:
            continue
        toks.extend(ALIASES.get(t, t).split())
    return toks


def tokens(s):
    return {t for t in norm(s) if t not in STOP or t in KEEP_EVEN_IF_STOP}


by_name = {n.lower(): m for n, m, _ in db}
lib = [(n, m, tokens(n), set(norm(n))) for n, m, _ in db]


def match(name):
    key = name.lower().strip()
    if key in NONE:
        return None
    if key in EXACT:
        assert EXACT[key].lower() in by_name, f'alias target missing: {EXACT[key]}'
        return by_name[EXACT[key].lower()], EXACT[key]
    if key in by_name:
        return by_name[key], name
    q = tokens(name)
    qall = set(norm(name))
    if not q:
        return None
    best = None
    for n, m, t, tall in lib:
        if not t:
            continue
        inter = len(q & t)
        if inter == 0:
            continue
        # recall of the query matters most; penalise library names with many extra words
        score = inter / len(q) - 0.15 * len(t - q) / len(t) + 0.05 * len(qall & tall) / len(qall)
        if best is None or score > best[0]:
            best = (score, m, n)
    if best and best[0] >= 0.6:
        return best[1], best[2]
    return None


names = set()
for day in plan['days'].values():
    for e in day:
        names.add(e['name'])
        names.update(e.get('alts') or [])
        if e.get('blockB'):
            names.add(e['blockB'])
for k in ['warmupBase', 'warmupUpper', 'warmupLower', 'cooldownUpper', 'cooldownLower']:
    for row in plan.get(k, []):
        names.add(row[0])
# swap fallbacks (src/domain/exerciseSwap.ts)
names.update(['DB floor press', 'Push-ups', 'Overhead DB extension (neutral grip)', 'Bench dip', 'DB curl',
              'DB wrist curl', 'DB lateral raise', 'DB shrug', 'DB row', 'Band row / DB row',
              'Goblet squat / split squat', 'DB RDL', 'Side-lying clam / DB lateral lunge', 'DB RDL / hip thrust',
              'Single-leg calf raise', 'Plank / dead bug', 'Farmer carry / dead bug'])

out, misses = {}, []
for n in sorted(names):
    r = match(n)
    if r:
        out[n] = r[0]
        print(f'  {n!r:55} → {r[1]}')
    else:
        misses.append(n)
json.dump(out, open(sys.argv[3], 'w'), indent=0, sort_keys=True, ensure_ascii=False)
print(f'\nmatched {len(out)}/{len(names)}; no GIF: {misses}')
