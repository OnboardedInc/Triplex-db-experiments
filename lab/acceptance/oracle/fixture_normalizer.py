"""Hand-built collector event fixture decoder; not a vendor wire/log parser.

Production contexts must pin the appropriate independently reviewed source parser.
"""
import json
import sys

records = {}
for line in sys.stdin.buffer:
    event = json.loads(line)
    if set(event) != {'field', 'value'} or event['field'] in records:
        raise ValueError('duplicate or malformed fixture event')
    records[event['field']] = event['value']
print(json.dumps(records, sort_keys=True, separators=(',', ':'), allow_nan=False))
