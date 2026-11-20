"""Calls the independent W0 interpreter on the author's full census, without the candidate index."""
import sys
from pathlib import Path
lab = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(lab / 'oracles/domain'))
sys.path.insert(0, str(lab / 'experiments/EXP-DX1/actv-delta'))
import jsontok
import w0
from oracle import projection
releases = w0.Releases(str(lab / 'world/W0'))
ledgers, receivers = {}, {}
for line in sys.stdin.buffer:
    msg = jsontok.parse_bytes(line)
    arg = msg['input']
    new = w0.Release(arg['document'])
    old = w0.Release(arg['old']) if arg['old'] else None
    b = arg['basis']
    tx = jsontok.int_token_value(b['tx'])
    result = []
    for world in arg['worlds']:
        subject = world['subject']
        ix = w0.validate_world(world, tx)
        o = w0.evaluate_indexed(ix, new, tx, b['validTime'])
        a = projection(w0.evaluate_indexed(ix, old, tx, b['validTime'])) if old else {}
        z = projection(o)
        diff = [[k,a.get(k),z.get(k)] for k in sorted(a.keys() | z.keys()) if a.get(k)!=z.get(k)]
        deliveries = []
        if arg['fold']:
            record = {k:o[k] for k in ('basis','subject','release','workItems')}
            pub = w0.run_op('publish', {'state':{'items':ledgers.get(subject, []),'subjects':[],'pending':[]},'evaluations':[record]},releases)
            ledgers[subject]=pub['state']['items']
            deliveries=pub['deliveries']
            recv=w0.run_op('receive',{'state':receivers.get(subject,{'effects':[],'projection':[]}),'deliveries':deliveries},releases)
            assert recv['applied']['effects']==deliveries
            receivers[subject]=recv['state']
        result.append({'subject':subject,'json':jsontok.canonical(o),'rows':diff,'deliveries':deliveries,'items':ledgers.get(subject,[]),'receiver':receivers.get(subject,{'effects':[],'projection':[]})})
    print(jsontok.canonical(result),flush=True)
