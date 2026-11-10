#!/usr/bin/env python3
# [XN-S2] Why: inspect every shipped jar, including nested dependency names and ServiceLoader entries. Rejected: filename-only absence as proof of missing classes.
import json, pathlib, zipfile
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2')
records=[]
for p in sorted(root.rglob('*.jar')):
    with zipfile.ZipFile(p) as z:
        names=z.namelist()
        registrations={n:z.read(n).decode('utf8',errors='replace') for n in names if n.startswith('META-INF/services/') and ('xtdb' in n or 'kafka' in n.lower())}
        relevant=[n for n in names if 'kafka' in n.lower() or 'objectstore' in n.lower() or n.endswith('Log$Registration') or n.endswith('Remote$Registration')]
        records.append(dict(path=str(p.relative_to(root)),entries=len(names),relevant=relevant,registrations=registrations))
(root/'jar-inspection.json').write_text(json.dumps(records,indent=2)+'\n')
print(json.dumps(records,indent=2))
