#!/usr/bin/env python3
# [DX-S4] Why: show redundant cell bytes separately from measured engine allocation. Rejected: assigning raw JSON character savings directly to compressed database savings.
import json,pathlib,collections
p=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S4/input');summary=json.loads((p/'summary.json').read_text());fields=summary['fields'];stats={k:collections.Counter() for k in fields};types=collections.Counter();n=0
for line in (p/'rows.jsonl').open():
 r=json.loads(line);n+=1;types[r[4]]+=1
 for k,x in zip(fields,r):
  stats[k]['json_cell_bytes']+=len(json.dumps(x,ensure_ascii=True,separators=(',',':')).encode())
  stats[k]['nonnull']+=int(x is not None)
  stats[k]['utf8_string_bytes']+=len(x.encode()) if isinstance(x,str) else 0
out={'rows':n,'fields':stats,'value_types':types,'raw_header_bytes':summary['lengths']['row_text_utf8']-summary['lengths']['compact_utf8']}
(p/'cell-anatomy.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out))
