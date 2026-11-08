#!/usr/bin/env python3
"""CX-VX02: retain exact input identities and summarize existing evidence without upgrading its status."""
import hashlib
import json
from pathlib import Path
from datetime import datetime, timezone

here = Path(__file__).resolve().parent
root = here.parents[2]
main = Path('/Users/sam/projects/triplex-db-2')
old = Path('/Users/sam/Claude/Projects/triplex-db-2/V-X02')
files = list(old.glob('*')) + [main / 'lab/verify/X02/BRIEF.md', main / 'lab/agents/handoffs/V-X02.md', main / 'lab/experiments/EXP-X02-xtql-parity/REPORT.md']
for gate, name in [('G0','G0-xtdb-20261107T193510Z-12a4a5'), ('G1','G1-xtdb-20261107T194910Z-96d758'), ('G2','G2-xtdb-20261107T200907Z-245d69'), ('G2','G2-xtdb-20261107T191535Z-6a787d'), ('G2','G2-xtdb-20261107T195430Z-b7a17d'), ('G2','G2-xtdb-20261107T201247Z-f3ac1c')]:
    files.append(main / 'lab/runs' / gate / (name+'.json'))
files += [root / 'qualification/workloads/temporal-workloads.json', root / 'pnpm-lock.yaml', root / 'package.json', main / 'lab/config/slots.json']
for package in ['core', 'qualification', 'xtdb']:
    files.append(root / 'packages' / package / 'package.json')
files += [p for p in here.iterdir() if p.is_file() and p.name not in ['evidence-manifest.json', 'evidence-summary.json', 'sample-table.md']]
manifest = []
for p in sorted(set(files)):
    if not p.is_file(): continue
    b=p.read_bytes()
    manifest.append(dict(path=str(p), bytes=len(b), sha256=hashlib.sha256(b).hexdigest()))
(here/'evidence-manifest.json').write_text(json.dumps(dict(at=datetime.now(timezone.utc).isoformat(), files=manifest), indent=2)+'\n')

compare = json.loads((here/'comparison-independent.json').read_text())
author = json.loads((here/'comparison-author-sql.json').read_text())
def matches(r):
    paired=[x for x in r['table'] if x['xtqlEqualsMine'] and x['sqlEqualsMine']]
    return dict(executions=len(paired), logicalTasks=len({x['task'] for x in paired}), builders=sorted({x['task'].split('/')[0] for x in paired}))
summary=dict(retainedIndependent=compare['summary'], retainedAuthorSql=author['summary'], pairedIndependent=matches(compare), pairedAuthorSql=matches(author))
xt=set(compare['summary']['xtqlTimeouts']); sql=set(compare['summary']['sqlTimeouts'])
summary['retainedTimeoutOverlap']=dict(both=sorted(xt&sql), xtqlOnly=sorted(xt-sql), sqlOnly=sorted(sql-xt))
summary['sourceSums']=[{k:c[k] for k in ['name','id','language','expected','rows','error','isDefect','pass']} for c in json.loads((here/'source-sums.json').read_text())['controls']]

def audit(report):
    totals={}; bad=[]; answered=0; positions=set()
    for w in report['workloads']:
        for c in w['cases']:
            totals[c['status']]=totals.get(c['status'],0)+1
            qs=[t for t in c.get('queryTrace',[]) if t.get('operation')=='public-native-query']
            cuts={q['basis']['recordedPosition'] for q in qs}
            positions.update(cuts)
            if len(cuts)>1: bad.append([c['logicalTaskId'],c['reopen'],'multiple cuts'])
            for q in qs:
                answered+=1
                for s in [q]+q.get('steps',[]):
                    text=s.get('query','').lstrip(); lang=s.get('language')
                    if text and lang=='xtql' and not text.startswith('XTQL ('): bad.append([c['logicalTaskId'],s.get('phase'),'XTQL shape',text[:100]])
                    if text and lang=='xtdb-sql' and text.startswith('XTQL ('): bad.append([c['logicalTaskId'],s.get('phase'),'SQL shape',text[:100]])
    return dict(status=report['status'], language=report.get('nativeLanguage'), statuses=totals, tracedCalls=answered, shapeOrCutFailures=bad)
summary['traceAudits']={}
for name,p in [('retainedXtql',old/'g2-xtql-report.json'), ('retainedSql',old/'g2-sql-report.json'), ('retainedAuthorSql',old/'author-sql-245d69-report.json'), ('freshShared',here/'shared-xtql-r2-report.json')]:
    if p.exists(): summary['traceAudits'][name]=audit(json.loads(p.read_text()))
if (here/'writer-report.json').exists():
    r=json.loads((here/'writer-report.json').read_text())
    summary['writer']=r['summary']
summary['runnerChanges'] = 'Copy of original runner; only public export resolution, authorized outputRoot and explanatory header differ.'
original=(root/'packages/qualification/workloads/runner.ts').read_text()
copy=(here/'packet-runner.ts').read_text()
copy=copy[copy.index('/** Execute'):]
copy=copy.replace('import { loadQualificationBackend } from "../../../packages/qualification/dist/index.js";', 'import { loadQualificationBackend } from "@triplex-build/triplex-qualification";')
copy=copy.replace('? path.join(root, "lab/verify/X02")','? path.join(root, "runs")')
assert copy==original, 'Unexpected semantic runner copy change'
(here/'evidence-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
rows=['# Retained equivalence sample: independent Python expectations, verifier XTQL, author SQL', '', 'This is historical execution evidence, recomputed by CX-VX02. It is not a fresh candidate gate.', '', '| Logical task | Independent expected rows | XTQL modes matching | SQL modes matching |', '| --- | --- | --- | --- |']
for task in sorted({x['task'] for x in author['table']}):
    rs=[x for x in author['table'] if x['task']==task]
    expected=json.dumps([json.loads(r) for r in rs[0]['mine']],separators=(',',':'))
    mode=lambda lang: ', '.join('reopen' if x['reopen'] else 'current' for x in rs if x[lang+'EqualsMine']) or 'none (timeouts)'
    rows.append(f'| {task} | `{expected}` | {mode("xtql")} | {mode("sql")} |')
(here/'sample-table.md').write_text('\n'.join(rows)+'\n')
# [CX-VX02] Why: hash the final derived outputs after writing them, never a previous partial generation.
# Rejected: a self-referential manifest hash; mutable pool observations are retained in environment-snapshot.json.
for name in ['evidence-summary.json', 'sample-table.md']:
    p=here/name; b=p.read_bytes()
    manifest.append(dict(path=str(p), bytes=len(b), sha256=hashlib.sha256(b).hexdigest()))
(here/'evidence-manifest.json').write_text(json.dumps(dict(at=datetime.now(timezone.utc).isoformat(), files=manifest), indent=2)+'\n')
print(json.dumps(dict(pairedIndependent=summary['pairedIndependent'],pairedAuthorSql=summary['pairedAuthorSql'], traceAudits=summary['traceAudits']),indent=2))
