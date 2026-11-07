import json, sys, itertools, os
sys.path.insert(0,"/tmp/w")
from lib import *
b36="0123456789abcdefghijklmnopqrstuvwxyz"
b62=b36+"ABCDEFGHIJKLMNOPQRSTUVWXYZ"
s36=[''.join(t) for L in (1,2,3) for t in itertools.product(b36,repeat=L)]
s62=[''.join(t) for L in (1,2) for t in itertools.product(b62,repeat=L)]
lines=[]
for i,s in enumerate(s36): lines.append(f'<urn:a:{i}> <urn:p:b36> "{s}" .')
for i,s in enumerate(s62): lines.append(f'<urn:b:{i}> <urn:p:b62> "{s}" .')
# revision data for S6 variants
for r,o,ordv in [("r1","A","01"),("r2","A","02"),("r3","B","01"),("r4","A","02"),("r5","C","07"),("r6","C","03")]:
    lines.append(f'<urn:rev:{r}> <urn:rev:obj> "{o}" .'); lines.append(f'<urn:rev:{r}> <urn:rev:ord> "{ordv}" .')
open("/tmp/w/d3.nt","w").write("\n".join(lines)+"\n")
r=start_index("alpha","/tmp/w/d3.nt"); print("index rc",r.returncode)
p=start_server("alpha")
try:
    rows=sel("SELECT ?x WHERE { ?s <urn:p:b36> ?x } ORDER BY ?x")
    got=[x[0] for x in rows]; print("base36 [0-9a-z] len1..3 n=%d ORDER BY == bytewise sorted:"%len(got), got==sorted(s36))
    rows=sel("SELECT ?x WHERE { ?s <urn:p:b62> ?x } ORDER BY ?x")
    got=[x[0] for x in rows]; exp=sorted(s62); mism=sum(1 for a,b in zip(got,exp) if a!=b)
    print("base62 [0-9a-zA-Z] len1..2 n=%d ORDER BY == bytewise sorted:"%len(got), got==exp, "| mismatching positions:", mism, "| first 8 actual:", got[:8], "| first 8 expected:", exp[:8])
    base="?r <urn:rev:obj> ?o . ?r <urn:rev:ord> ?ord ."
    for k,qq in {
     "S6 OPTIONAL aggregate + FILTER(!BOUND||>=) (expected r2,r3,r4,r5)": f"SELECT ?r WHERE {{ {base} OPTIONAL {{ SELECT ?o (MAX(?m) AS ?mx) WHERE {{ ?x <urn:rev:obj> ?o . ?x <urn:rev:ord> ?m }} GROUP BY ?o }} FILTER(!BOUND(?mx) || ?ord >= ?mx) }}",
     "S7 NOT EXISTS where inner restricted to ord<'05' via re-bind (expected: every row whose obj has no later row below 05): r2,r3,r4,r5,r6? -> see note": f"SELECT ?r WHERE {{ {base} FILTER NOT EXISTS {{ ?r <urn:rev:ord> ?ord . ?r2 <urn:rev:obj> ?o . ?r2 <urn:rev:ord> ?ord2 . FILTER(?ord2 > ?ord && ?ord2 < \"05\") }} }}",
     "S8 same shape as S7 but filter-only correlation (wrong)": f"SELECT ?r WHERE {{ {base} FILTER NOT EXISTS {{ ?r2 <urn:rev:obj> ?o . ?r2 <urn:rev:ord> ?ord2 . FILTER(?ord2 > ?ord && ?ord2 < \"05\") }} }}",
     "N4b positive EXISTS flat (expected one)": "SELECT ?revision WHERE { VALUES (?revision ?order) { (\"one\" \"01\") (\"two\" \"02\") } FILTER EXISTS { VALUES ?laterOrder { \"01\" \"02\" } FILTER(?laterOrder > ?order) } }",
     "N4c positive EXISTS re-bound (expected one)": "SELECT ?revision WHERE { VALUES (?revision ?order) { (\"one\" \"01\") (\"two\" \"02\") } FILTER EXISTS { VALUES (?revision ?order) { (\"one\" \"01\") (\"two\" \"02\") } VALUES ?laterOrder { \"01\" \"02\" } FILTER(?laterOrder > ?order) } }",
    }.items():
        rr=sel(qq); print(k,"->", rr if isinstance(rr,dict) else sorted(x[0].rsplit(":",1)[-1] for x in rr))
    print("note S7: r1(A,01): later A rows below 05 exist (r2,r4 ord 02)=>excluded; r2/r4 none >02 below 05 => kept; r3 kept; r5(C,07): r6 03<07 => not greater => kept; r6(C,03): r5 07 not <05 => kept")
finally: stop(p)
