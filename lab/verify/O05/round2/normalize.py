"""Review-only decoder for synthetic observation events, not a vendor parser."""
import json
import sys

out = {}
for line in sys.stdin.buffer:
    event = json.loads(line)
    if event['field'] in out:
        raise ValueError('duplicate field')
    out[event['field']] = event['value']
print(json.dumps(out, sort_keys=True, separators=(',', ':'), allow_nan=False))
