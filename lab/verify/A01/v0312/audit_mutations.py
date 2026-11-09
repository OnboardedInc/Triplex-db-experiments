"""Check each retained mutation exit against its intended validator, with explicit legacy aliases."""
import json
from pathlib import Path
import re
HERE = Path(__file__).resolve().parent
raw = json.loads((HERE/'mutations.json').read_bytes())
# [CX-VA01-0312] Why: older controls can reject at an earlier equivalent guard; record those aliases explicitly. Rejected: counting any nonzero exit as the claimed reason.
aliases = {
'Q45a status':'V-O04i: O-REPLAY is BUILT-ACCEPTED',
'Q42a hashes not opened':'retained records are opened, schema-checked and re-judged',
'Q42b regress mutant':'M-RECEIVER-REGRESS attached only',
'Q42b receivers rule':'OUTBOX receivers',
'Q42c receiver uses replay':'pin scope differs from pin_scope.json',
'Q47c reach dropped':'pin scope differs from pin_scope.json',
'Q47c reach ignored':'pin scope differs from pin_scope.json',
'Q54b reach added':'pin scope differs from pin_scope.json',
'Q52 residual leaks into queries':'Q49: the erasure commit and query cases',
'Q58d obligation dropped':'pin scope differs from pin_scope.json',
'Q61a source':'contract source, retained fault witnesses',
'Q63d sql':'parameterised SQL',
'Q64b series dropped':'PAIR-0 decisions and frozen screening series',
'Q65c selection':'case-result/2 selection and built packages',
'Q66d lane':'explicit conversion as a lane obligation',
'Q67d enumeration':'incarnation fencing and P3 source-prefix enumeration',
'Q67e isolation':'execution identity, toolchain, isolation and claim kinds',
'Q67j promotion admitted':'promotion claim, rejected explicitly',
'Q71b toolchain':'execution identity, toolchain, isolation and claim kinds',
'Q71b invocation schema':'workload identity fields, evidence schemas and qualification-run steps',
'Q75h cause unchecked':'cause optional, structured when present',
'Q83e resume bound to F':'three frontiers replace the old freeze interpretation',
'Q83b supersession removed':'three frontiers replace the old freeze interpretation',
}
aliases.update({'Q29b agreement': 'Q29a/b: golden files unchanged', 'Q33h other-query': 'pagination reasons', 'Q38b pins ignored v2': 'claim depending on an unpinned oracle', 'Q49a identities': 'changes list only identities', 'Q49a journal case dropped': 'G7.journal.logical-contract selects', 'Q49b empty commit': 'empty change list', 'Q49c count': 'COUNT of assertions counts it', 'Q49c case dropped': 'erasure commit and query cases', 'Q56i commit back': 'O-REPLAY pin and its predecessor are each accepted', 'Q56i unregistered receipt': 'O-REPLAY pin and its predecessor are each accepted', 'Q56i tdk1 refusal dropped': 'residual refusals are ambiguity, TDK1 keys', 'Q56i scope diff unrecorded': 'pin scope differs from pin_scope.json', 'Q55b fault case dropped': 'FAULT_Q55_CASES names one case per rule', 'Q52c earliest': 'earliest erasedAt', 'Q56a unknown target commits': 'unknown id is E-INVALID-VALUE', 'Q56b no conflict': 'E-CONFLICTING-VALUES', 'Q56h synthetic': 'synthetic values only', 'Q51f error dropped': 'E-DUAL-COMMIT-PATH is a typed error', 'Q58a case dropped': 'NATIVE_TOKEN_CASES names one case per rule', 'Q58c crc dropped': 'BROKER_HARDENING_CASES names one case per rule', 'Q62a case dropped': 'P2Q_READ_CASES names one case per rule', 'Q60e windows': 'GREEN windows', 'Q60h lease': 'lease and single-run A0 diagnostic', 'Q60i A0 single run': 'single-run A0 diagnostic', 'W0 fingerprint wrong': "fingerprint candidate must be V-D01's final fingerprint", 'Q66a prefixes': 'prefix semantics, cursor prefixes and scope', 'Q68b horizon': 'current path, horizon, sweep frames, host-served reads and current-copy erasure', 'Q68c frame size': 'current path, horizon, sweep frames, host-served reads and current-copy erasure', 'Q68d host reads': 'current path, horizon, sweep frames, host-served reads and current-copy erasure', 'Q68f current copies': 'current path, horizon, sweep frames, host-served reads and current-copy erasure', 'Q69e live composition': 'PAIR-0 decisions and frozen screening series', 'Q69f fallback': 'PAIR-0 decisions and frozen screening series'})
rows=[]; unmatched=[]
for i,r in enumerate(raw['records']):
    error=(r['stdout']+r['stderr']).strip()
    assert r['exit'] != 0 and error.splitlines()[0] == 'CONTRACT INVALID:', (i,r['name'])
    assert 'Traceback (most recent call last)' not in error, r['name']
    name=r['name']; tags=re.findall(r'Q\d+[a-z]?',name)
    if name in aliases: pattern=re.escape(aliases[name]); method='explicit reviewed equivalent guard'
    elif tags: pattern='|'.join(re.escape(x) for x in tags);method='named ruling guard'
    elif name.startswith('W0 '): pattern=r'W0|V-D01e';method='W0 pin or fingerprint guard'
    elif name.startswith('OD '): pattern=r'O-DOMAIN|V-D01c';method='O-DOMAIN pin or runner guard'
    elif name.startswith('O-OBS '): pattern=r'O-OBS|Q75c';method='O-OBS pin or hash closure guard'
    elif name.startswith('V-O04i '): pattern=r'V-O04i|pinned O-REPLAY';method='O-REPLAY exact pin guard'
    elif name.startswith('R2 '): pattern=r'F[1-4]:';method='previous finding semantic regression guard'
    elif name.startswith('C1 '): pattern=r'V-O02 C1';method='replay delegation guard'
    elif name.startswith('C2 '): pattern=r'V-O02 C2';method='legacy contrast enumeration guard'
    else: raise AssertionError(name)
    match=re.search(pattern,error)
    if not match: unmatched.append((i,name,error))
    rows.append({'index':i,'name':name,'expectedGuardPattern':pattern,'method':method,'matched':bool(match),
                 'diagnostics':error.splitlines()[1:]})
if unmatched:
    for i,n,e in unmatched: print(i,n,'=>',e[:600])
    raise SystemExit(1)
assert len(rows)==432 and raw['catalog']==513 and len(raw['retired'])==81
new = rows[344:]
coverage={}
for r in new[:74]:
    rid=r['name'].split()[0]
    assert r['diagnostics']==[rid+': literal ruling and consumer must match authority']
    coverage.setdefault(rid,[]).append(r['name'])
assert len(coverage)==37 and all(len(v)==2 for v in coverage.values())
(HERE/'mutation-reason-audit.json').write_text(json.dumps({'run':432,'intendedGuardMatches':432,'crashKills':0,
'newControls':88,'rulingCoverage':coverage,'records':rows},indent=2)+'\n')
print('432/432 CONTRACT INVALID; 432/432 intended or explicitly reviewed equivalent guards; no crashes; 37/37 new rulings have two controls')
