import hashlib
import json
from pathlib import Path
import re

# [CX-VC8] Why: derive historical counts from source-bound raw runner artifacts. Rejected: trusting report prose or copying receipt summaries.
root = Path.cwd()
records = []
for receipt_path in sorted(root.glob('lab/runs/G[12]/*.json')):
    receipt = json.loads(receipt_path.read_text())
    if receipt.get('experiment') != 'EXP-C8':
        continue
    record = {'receipt': str(receipt_path.relative_to(root)), 'runId': receipt['runId'], 'verdict': receipt['verdict']}
    record['counts'] = receipt.get('counts')
    step = next((s for s in receipt.get('steps', []) if s.get('name') == 'native-runner'), None)
    if not step:
        # Receipt format names this command list `commands` in some revisions.
        for value in receipt.values():
            if isinstance(value, list):
                step = next((s for s in value if isinstance(s, dict) and s.get('name') == 'native-runner'), None)
                if step:
                    break
    match = re.search(r'--output (\S+)', step['command']) if step else None
    if not match:
        record['status'] = 'NO_NATIVE_COUNTER_WINDOW_G1_OR_PRE_COUNTER'
    else:
        raw_path = Path(match[1])
        record['rawPath'] = str(raw_path)
        if not raw_path.exists():
            record['status'] = 'MISSING_RAW'
        else:
            data = raw_path.read_bytes()
            digest = hashlib.sha256(data).hexdigest()
            raw = json.loads(data)
            counter = raw.get('readPathEngineWrites')
            bound = next((o for o in receipt.get('objects', []) if o.get('path', '').endswith('g2-report.json')), None)
            record.update(rawBytes=len(data), rawSha256=digest, receiptObject=bound,
                          objectHashMatches=bound is not None and bound['sha256'] == digest,
                          rawCounter=counter, matchesReceipt=counter == receipt.get('readPathEngineWrites'))
            record['status'] = 'NO_RAW_COUNTER' if counter is None else 'RAW_COUNTER_RECOMPUTED'
            if counter is not None:
                record['zeroWrites'] = sum(counter[k] for k in ['writes', 'commits', 'unparsed']) == 0
            out = root / 'lab/verify/C8' / f"raw-counter-{receipt['runId']}.json"
            out.write_text(json.dumps(record, indent=2) + '\n')
    records.append(record)
(root / 'lab/verify/C8/receipt-audit.json').write_text(json.dumps(records, indent=2) + '\n')
for r in records:
    print(r['runId'], r['status'], r.get('rawCounter'), 'hash-match', r.get('objectHashMatches'), 'receipt-match', r.get('matchesReceipt'))
