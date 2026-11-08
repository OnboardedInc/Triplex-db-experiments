"""Fresh replay of the review's exhaustive selector and decimal-clock matrices."""
import importlib.util
import json
from pathlib import Path
import shutil
import time

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
ORACLE=ROOT/'lab/acceptance/oracle/observe.py'
out=HERE/'matrix-evidence'
if out.exists():raise SystemExit('Retain earlier execution')
out.mkdir();free=shutil.disk_usage(HERE).free
if free<5*1024**3:raise SystemExit('Below disk admission floor')
started=time.time()
spec=importlib.util.spec_from_file_location('reviewed_observe',ORACLE);subject=importlib.util.module_from_spec(spec);spec.loader.exec_module(subject)
c=json.loads((ROOT/'lab/acceptance/obligations.json').read_bytes());obligations={o['id']:o for o in c['obligations']}
prior=HERE.parent/'round3/general-evidence'
selector=[]
for original in json.loads((prior/'selector-matrix.json').read_bytes()):
    o=obligations[original['obligation']];bar=original['threshold']
    ctx=dict(selectedThreshold=bar,witnessKind=original['kind'],thresholdIds=sorted(set(o['thresholds']+[bar])))
    try:actual=subject.work_selection(o,ctx)==bar
    except (subject.Refused,subject.Failed):actual=False
    selector.append(dict(obligation=o['id'],threshold=bar,kind=original['kind'],expected=original['expected'],actual=actual,ok=actual==original['expected']))
clock=subject.ClockBounds(0.1);decimal=[]
for original in json.loads((prior/'decimal-clock-matrix.json').read_bytes()):
    actual=getattr(clock,original['op'])(float(original['a']),float(original['b']))
    decimal.append(dict(original,actual=actual,ok=actual==original['expected']))
(out/'selectors.json').write_text(json.dumps(selector,sort_keys=True)+'\n');(out/'decimals.json').write_text(json.dumps(decimal,sort_keys=True)+'\n')
summary=dict(start=started,end=time.time(),freeBytes=free,selectorTotal=len(selector),selectorMatched=sum(x['ok'] for x in selector),
    decimalTotal=len(decimal),decimalMatched=sum(x['ok'] for x in decimal))
(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
