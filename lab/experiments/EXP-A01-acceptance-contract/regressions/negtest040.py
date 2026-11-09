"""CX-A01-040: ruling and re-pin mutations must be rejected for content, never regeneration drift."""
import hashlib
import json
import pathlib
import runpy
import subprocess
import sys

R=pathlib.Path(__file__).resolve().parents[4]
G=R/'lab/acceptance/build_contract.py'
C=runpy.run_path(str(G))
source=G.read_text()
outputs=[R/'lab/acceptance'/n for n in ['ACCEPTANCE.md','obligations.json','load-contract.json','oracle-contract.json','budgets.json','capability-matrix.md']]
before={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in outputs}
tests={}
for rid in C['RULES_040']:
    tests[rid+' literal']=f'RULES_040[{rid!r}]["rule"] = "weakened"'
    dest='FEED_RULES' if rid.startswith('Q98') else 'POSITION_MAPPING_RULES' if rid=='Q101a' else 'NO_REGRESSION_RULES'
    tests[rid+' consumer']=f'{dest}.pop({rid!r})'
for stage in ['QNODELAY','CHECKJS','CHECKJS_FINAL']:
    for i,pin in enumerate(C['PIN_STAGE_'+stage]):
        tests['repin '+pin['path']]=f'PIN_STAGE_{stage}[{i}]["sha256"] = "0" * 64'
tests['repin Datomic image']='DATOMIC_IMAGE_040["imageId"] = "sha256:" + "0" * 64'
tests['Q98 identity-only policy']='FEED_POLICY["identityOnly"] = False'
tests['Q101 mapping consumers']='POSITION_MAPPING_POLICY["consumers"] = []'
tests['Q104 bootstrap test']='NO_REGRESSION_POLICY["p99Alternative"] = "any percentile"'
tests['Q104 insufficient AA']='NO_REGRESSION_POLICY["minAaRounds"] = 1'
mut=G.with_name('_negtest040_tmp.py')
failed=[]
try:
    for name,code in tests.items():
        candidate=source.replace('\ndef main():','\n'+code+'\n\ndef main():')
        candidate=candidate.replace('        (HERE / name).write_text(text)','        pass')
        mut.write_text(candidate)
        result=subprocess.run([sys.executable,'-I','-B',str(mut)],cwd=R,text=True,capture_output=True)
        lines=(result.stdout+result.stderr).strip().splitlines()
        caught=result.returncode!=0 and bool(lines) and lines[0]=='CONTRACT INVALID:'
        print(('CAUGHT ' if caught else 'MISSED ')+name+': '+(' | '.join(lines[1:3])),flush=True)
        if not caught:failed.append(name)
finally:
    mut.unlink(missing_ok=True)
assert before=={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in outputs}, 'mutation run rewrote canonical output'
print(json.dumps({'run':len(tests),'caught':len(tests)-len(failed),'missed':failed,'canonicalOutputsUnchanged':True}))
sys.exit(bool(failed))
