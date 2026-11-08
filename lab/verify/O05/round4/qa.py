"""Independent common-guard reachability and corrected coverage-edge QA."""
import ast
import copy
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
OLD=HERE.parent/'round2'
sys.path.insert(0,str(OLD))
import review_round2 as r
ORACLE=ROOT/'lab/acceptance/oracle/observe.py'
CONTRACT=ROOT/'lab/acceptance/obligations.json'
COMMON='obligation does not select O-OBS with the matching registered protocol'

def main():
    out=HERE/'qa-evidence'
    if out.exists():raise SystemExit('Retain earlier execution')
    out.mkdir();free=shutil.disk_usage(HERE).free
    if free<5*1024**3:raise SystemExit('Below disk admission floor')
    started=time.time();before=r.sha(ORACLE.read_bytes())
    c=json.loads(CONTRACT.read_bytes());base,inventory,expectations=r.positives(c);results=[];traces=[]

    tree=ast.parse(ORACLE.read_text())
    check=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='check')
    body=next(n for n in check.body if isinstance(n,ast.Try)).body
    guards=[n for n in body if isinstance(n,ast.If) and any(isinstance(x,ast.Constant) and isinstance(x.value,str) and COMMON in x.value for x in ast.walk(n))]
    dispatches=[n for n in body if isinstance(n,ast.Expr) and isinstance(n.value,ast.Call) and isinstance(n.value.func,ast.Call)
        and isinstance(n.value.func.func,ast.Name) and n.value.func.func.id=='getattr']
    passes=[n for n in body if isinstance(n,ast.Assign) and any(isinstance(x,ast.Constant) and x.value=='PASS' for x in ast.walk(n))]
    assert len(guards)==len(dispatches)==len(passes)==1
    guard,dispatch,passed=guards[0],dispatches[0],passes[0]
    assert body.index(guard)<body.index(dispatch)<body.index(passed)
    assert not any(isinstance(n,ast.Return) for statement in body for n in ast.walk(statement))
    assert len([n for n in ast.walk(check) if isinstance(n,ast.Constant) and n.value=='PASS'])==1
    static=dict(commonGuardLine=guard.lineno,dispatchLine=dispatch.lineno,passLine=passed.lineno,
        singleGuard=True,singleDispatch=True,singlePassAssignment=True,noEarlySuccessReturn=True)
    spec=importlib.util.spec_from_file_location('reviewed_observe',ORACLE);subject=importlib.util.module_from_spec(spec);spec.loader.exec_module(subject)

    def build(protocol,label,edit=None,context_edit=None,contract_edit=None,evidence=None,u=0):
        p=out/(protocol+'-'+label);contract=copy.deepcopy(c)
        if contract_edit:contract_edit(contract)
        e=copy.deepcopy(base[protocol] if evidence is None else evidence)
        if edit:edit(e)
        e,ctx=r.encode(p,protocol,e,contract,inventory,expectations)
        b=json.loads((p/'bundle/bundle.json').read_bytes());b['clock']['maxUncertaintyMs']=u
        (p/'bundle/bundle.json').write_bytes(r.raw(b));ctx.update(clockMaxUncertaintyMs=u,bundleSha256=r.sha(r.raw(b)))
        if context_edit:context_edit(ctx,e,contract)
        for fname,obj in [('evidence.json',e),('context.json',ctx),('contract.json',contract)]:
            (p/fname).write_bytes(r.raw(obj))
        return p,e,ctx,contract

    def invoke(protocol,label,expected='REJECT',reason=COMMON,trace=False,**kwargs):
        p,e,ctx,contract=build(protocol,label,**kwargs)
        cmd=[sys.executable,'-I','-B',str(ORACLE),'check','OBS-'+protocol,str(p/'evidence.json'),
            '--contract',str(p/'contract.json'),'--context',str(p/'context.json'),'--bundle',str(p/'bundle'),'--key-file',str(p/'run.key')]
        proc=subprocess.run(cmd,capture_output=True,text=True,timeout=45)
        (p/'stdout.txt').write_text(proc.stdout);(p/'stderr.txt').write_text(proc.stderr)
        try:report=json.loads(proc.stdout)
        except ValueError:report=dict(verdict='CRASH',reasons=[proc.stderr])
        ok=(proc.returncode==0 and report['verdict']=='PASS') if expected=='PASS' else (proc.returncode in [1,2] and report['verdict'] in ['FAIL','REFUSED'])
        intended=reason is None or any(reason in x for x in report.get('reasons',[]))
        if reason==COMMON:ok=ok and proc.returncode==2
        row=dict(id=protocol+'/'+label,path=str(p.relative_to(HERE)),expected=expected,expectedReason=reason,
            code=proc.returncode,result=report,ok=ok,intendedGuard=intended,command=cmd)
        (p/'result.json').write_text(json.dumps(row,sort_keys=True)+'\n');results.append(row)
        if trace:
            seen=[];handler=protocol.lower().replace('-','_')
            # [CX-VO05-R4] Why: observe real control flow without changing the module. Rejected: treating source layout alone as execution proof.
            def tracer(frame,event,arg):
                if frame.f_code.co_filename==str(ORACLE):
                    if event=='line' and frame.f_code.co_name=='check' and frame.f_lineno in [guard.lineno,dispatch.lineno,passed.lineno]:
                        seen.append(dict(event='line',name='check',line=frame.f_lineno))
                    if event=='call' and frame.f_code.co_name==handler:seen.append(dict(event='handler',name=handler,line=frame.f_lineno))
                return tracer
            sys.settrace(tracer)
            try:direct,status=subject.check('OBS-'+protocol,e,contract,ctx,p/'bundle',p/'run.key')
            finally:sys.settrace(None)
            assert (direct,status)==(report,proc.returncode)
            lines=[x['line'] for x in seen if x['event']=='line'];calls=[x for x in seen if x['event']=='handler']
            if expected=='PASS':valid=lines==[guard.lineno,dispatch.lineno,passed.lineno] and len(calls)==1
            else:valid=lines==[guard.lineno] and not calls
            traces.append(dict(id=row['id'],events=seen,expected=expected,ok=valid,code=status))

    for protocol in base:
        invoke(protocol,'positive',expected='PASS',reason=None,trace=True)
        invoke(protocol,'no-delegation',context_edit=lambda ctx,e,c:ctx.update(obligation='G1.found.unchanged44'),trace=True)
        invoke(protocol,'protocol-mismatch',context_edit=lambda ctx,e,c,protocol=protocol:ctx.update(protocol='OBS-CANCEL' if protocol!='CANCEL' else 'OBS-WORK'))
        invoke(protocol,'missing-registration',contract_edit=lambda c,protocol=protocol:c['obsProtocols'].pop('OBS-'+protocol))
        invoke(protocol,'unknown-obligation',context_edit=lambda ctx,e,c:ctx.update(obligation='does-not-exist'))
        invoke(protocol,'duplicate-obligation',contract_edit=lambda c,protocol=protocol:c['obligations'].append(copy.deepcopy(next(o for o in c['obligations'] if o['id']==r.OBLIGATIONS[protocol]))))
        def no_oracle(c,protocol=protocol):
            row=next(o for o in c['obligations'] if o['id']==r.OBLIGATIONS[protocol]);row['oracles']=[]
        invoke(protocol,'empty-oracles',contract_edit=no_oracle)
        def pending(c,protocol=protocol):
            row=next(o for o in c['obligations'] if o['id']==r.OBLIGATIONS[protocol]);row['oracles']=[x for x in row['oracles'] if x!='O-OBS'];row['needsNewOracle']=['O-OBS']
        invoke(protocol,'pending-only',contract_edit=pending)
        def premature(ctx,e,c):
            ctx['obligation']='G1.found.unchanged44';e.clear()
        invoke(protocol,'common-guard-before-source-and-handler',context_edit=premature)

    original=json.loads((OLD/'supplement-evidence/018/evidence.json').read_bytes());original.pop('source');original.pop('corroboration')
    corrected=copy.deepcopy(original)
    corrected['engineActiveSamples']=[dict(t=100+500*i,activeQueryIds=['query-a'] if 100+500*i<2100 else []) for i in range(16)]
    assert {k:v for k,v in corrected.items() if k!='engineActiveSamples'}=={k:v for k,v in original.items() if k!='engineActiveSamples'}
    variants=[
        ('corrected-positive',None,'PASS',None),
        ('drain-one-ms-over',lambda e:e.update(tDrained=2101),'REJECT','drain deadline'),
        ('first-edge-one-ms-short',lambda e:e['engineActiveSamples'][0].update(t=101),'REJECT','cover uncertain'),
        ('last-edge-exact',lambda e:e.update(engineActiveSamples=[dict(t=t,activeQueryIds=['query-a'] if t<2100 else []) for t in list(range(100,7100,500))+[7102]]),'PASS',None),
        ('last-edge-one-ms-short',lambda e:e.update(engineActiveSamples=[dict(t=t,activeQueryIds=['query-a'] if t<2100 else []) for t in list(range(100,7100,500))+[7101]]),'REJECT','cover uncertain'),
        ('cadence-exact',lambda e:e.update(engineActiveSamples=[dict(t=100+998*i,activeQueryIds=['query-a'] if 100+998*i<2100 else []) for i in range(9)]),'PASS',None),
        ('cadence-one-ms-over',lambda e:e.update(engineActiveSamples=[dict(t=100+999*i,activeQueryIds=['query-a'] if 100+999*i<2100 else []) for i in range(9)]),'REJECT','coverage gap'),
    ]
    for label,edit,expected,reason in variants:
        invoke('CANCEL',label,edit=edit,evidence=corrected,u=1,expected=expected,reason=reason)

    summary=dict(start=started,end=time.time(),freeBytes=free,sourceSha256=before,sourceStable=before==r.sha(ORACLE.read_bytes()),
        cliTotal=len(results),cliMatched=sum(x['ok'] and x['intendedGuard'] for x in results),discrepancies=[x for x in results if not x['ok'] or not x['intendedGuard']],
        static=static,traceTotal=len(traces),traceMatched=sum(x['ok'] for x in traces),unchangedCallerDrainReuse=True)
    (out/'results.json').write_text(json.dumps(results,sort_keys=True)+'\n');(out/'traces.json').write_text(json.dumps(traces,sort_keys=True)+'\n')
    (out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))

if __name__=='__main__':main()
