#!/usr/bin/env python3
# [XN-S2-PG] Why: decode shipped classfile UTF-8 constants offline before starting containers. Rejected: inferring a log backend from a remote tag name.
import json,pathlib,struct,zipfile
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2')
def constants(b):
    n=struct.unpack_from('>H',b,8)[0]; pos=10; i=1; out=[]
    while i<n:
        tag=b[pos]; pos+=1
        if tag==1:
            size=struct.unpack_from('>H',b,pos)[0]; pos+=2
            out.append(b[pos:pos+size].decode('utf8',errors='replace')); pos+=size
        elif tag in (3,4,9,10,11,12,17,18): pos+=4
        elif tag in (5,6): pos+=8; i+=1
        elif tag in (7,8,16,19,20): pos+=2
        elif tag==15: pos+=3
        else: raise ValueError(tag)
        i+=1
    return out
with zipfile.ZipFile(root/'xtdb.jar') as z:
    names=z.namelist()
    selected=[n for n in names if n.startswith(('xtdb/postgres/','xtdb/api/log/','xtdb/api/storage/')) and n.endswith('.class')]
    records={n:constants(z.read(n)) for n in selected}
    resources=[n for n in names if n.startswith('xtdb/') and n.endswith(('.yaml','.yml','.md','.clj','.edn','.kt')) and ('postgres' in n.lower() or 'log' in n.lower())]
    output=dict(classEntries=selected,constants=records,bundledResources={n:z.read(n).decode('utf8',errors='replace') for n in resources})
    (root/'postgres-log'/'class-constants.json').write_text(json.dumps(output,indent=2)+'\n')
    for n in ['xtdb/postgres/PostgresRemote$Factory.class','xtdb/postgres/PostgresRemote$Factory$$serializer.class','xtdb/postgres/PostgresRemote.class','xtdb/api/log/Log$Factory$Companion.class']:
        print(n, '\n'+'\n'.join(records[n]),'\n')
    print('resources',resources)
