import json, sys
sys.path.insert(0,"/tmp/w")
from lib import *
meta=json.load(open("/tmp/w/meta.json"))
tiny=meta["tiny"]; rnd={int(k):v for k,v in meta["rnd"].items()}; allhex=meta["allhex"]
def hexkey(s): return ''.join("%06x"%ord(c) for c in s)
out=[]
def log(*a):
    line=' '.join(str(x) for x in a); print(line); out.append(line)
r=start_index("icu","/tmp/w/d1.nt")
log("INDEX rc",r.returncode)
log("\n".join(r.stdout.splitlines()[-3:] + r.stderr.splitlines()[-3:]))
cfg=json.load(open("/tmp/w/icu/triplex.meta-data.json")) if os.path.exists("/tmp/w/icu/triplex.meta-data.json") else None
import glob
log("index files:", sorted(os.path.basename(f) for f in glob.glob("/tmp/w/icu/triplex*"))[:20])
for f in glob.glob("/tmp/w/icu/*configuration*")+glob.glob("/tmp/w/icu/triplex.meta*"):
    try: log("CONFIG",f, open(f).read()[:600])
    except Exception as e: pass
p=start_server("icu")
try:
    L="<urn:triplex-sort:label>"
    # T1 tiny fixture
    ids=lambda rows:[show(x[0].rsplit(":",1)[1]) for x in rows]
    exp=["ascii-A","ascii-E","ascii-c","nfd-e-acute","ascii-z","nfc-e-acute","private-use","astral-10000","emoji"]
    rows=sel(f"SELECT ?e ?l WHERE {{ ?e {L} ?l }} ORDER BY STR(?l) STR(?e)")
    log("T1a ORDER BY STR(?l) actual :", ids(rows))
    log("T1a oracle expected       :", exp, "PASS" if ids(rows)==exp else "FAIL")
    rows=sel(f"SELECT ?e ?l WHERE {{ ?e {L} ?l }} ORDER BY ?l ?e")
    log("T1b ORDER BY ?l ?e actual   :", ids(rows))
    rows=sel(f"SELECT ?e ?l WHERE {{ ?e {L} ?l  FILTER(STR(?l) > \"E\") }} ORDER BY STR(?e)")
    log("T1c STR(?l)>\"E\" (expect ascii-c,nfd,z,nfc,pu,astral,emoji):", sorted(ids(rows)))
    rows=sel(f"SELECT ?e ?l WHERE {{ ?e {L} ?l  FILTER(?l > \"E\") }} ORDER BY STR(?e)")
    log("T1d ?l>\"E\" :", sorted(ids(rows)))
    rows=sel(f"SELECT ?e ?l WHERE {{ ?e {L} ?l  FILTER(STR(?l) < \"c\") }} ORDER BY STR(?e)")
    log("T1e STR(?l)<\"c\" (expect ascii-A, ascii-E):", sorted(ids(rows)))
    rows=sel("SELECT ?v WHERE { VALUES ?v { \"A\" \"E\" \"c\" \"z\" } } ORDER BY ?v")
    log("T1f VALUES(local vocab) ORDER BY ?v :", [show(x[0]) for x in rows])
    rows=sel(f"SELECT ?v WHERE {{ {{ ?e {L} ?v }} UNION {{ VALUES ?v {{ \"D\" \"b\" }} }} FILTER(STRLEN(?v)=1) }} ORDER BY ?v")
    log("T1g stored+local mix ORDER BY ?v (codepoint: A D E b c z):", [show(x[0]) for x in rows])
    rows=sel("SELECT ?s WHERE { ?s <urn:triplex:p> ?o } ORDER BY STR(?s)")
    log("T1h ORDER BY STR(?s) IRIs  :", [x[0].rsplit(":",1)[1] for x in rows], "(codepoint: A1 E1 cE cc ce c1 z1)")
    rows=sel("SELECT ?s WHERE { ?s <urn:triplex:p> ?o } ORDER BY ?s")
    log("T1i ORDER BY ?s IRIs       :", [x[0].rsplit(":",1)[1] for x in rows])
    # equality canonical-equivalence hazard
    rows=sel(f"SELECT ?e WHERE {{ ?e {L} ?l FILTER(?l = \"\\u00e9\") }}")
    log("T1j ?l = NFC e-acute matches:", sorted(ids(rows)))
    rows=sel(f"SELECT ?e WHERE {{ ?e {L} ?l FILTER(STR(?l) = \"\\u00e9\") }}")
    log("T1k STR(?l) = NFC e-acute matches:", sorted(ids(rows)))
    # T2 hex-key exhaustive
    rows=sel("SELECT ?h WHERE { ?s <urn:p:hex> ?h } ORDER BY ?h")
    act=[x[0] for x in rows]; log("T2a exhaustive hex len1-3 n=",len(act),"ORDER BY ?h == sorted()?", act==sorted(allhex))
    rows=sel("SELECT ?h WHERE { ?s <urn:p:hex> ?h } ORDER BY STR(?h)")
    act=[x[0] for x in rows]; log("T2b same with ORDER BY STR(?h)?", act==sorted(allhex))
    rows=sel("SELECT ?h WHERE { ?s <urn:p:hex> ?h } ORDER BY DESC(?h)")
    act=[x[0] for x in rows]; log("T2c DESC?", act==sorted(allhex,reverse=True))
    # random unicode keys
    texts=list(rnd.values()); keys={i:hexkey(s) for i,s in rnd.items()}
    expect=sorted(rnd, key=lambda i: rnd[i])  # codepoint order of text
    rows=sel("SELECT ?s ?k WHERE { ?s <urn:p:key> ?k } ORDER BY ?k")
    got=[int(x[0].rsplit(":",1)[1]) for x in rows]
    log("T2d 400 random-unicode keys ORDER BY ?k == codepoint order of text?", got==expect, "n=",len(got))
    rows=sel("SELECT ?s ?k WHERE { ?s <urn:p:key> ?k } ORDER BY STR(?k)")
    got=[int(x[0].rsplit(":",1)[1]) for x in rows]
    log("T2e ... ORDER BY STR(?k)?", got==expect)
    rows=sel("SELECT ?s ?t WHERE { ?s <urn:p:text> ?t } ORDER BY ?t")
    got=[int(x[0].rsplit(":",1)[1]) for x in rows]
    log("T2f raw text ORDER BY ?t == codepoint order?", got==expect, " (baseline ICU on raw text)")
    # first mismatches of raw text
    mism=[(i,j) for i,j in zip(got,expect) if i!=j][:3]
    log("   first raw-text mismatches (actual id, expected id):", [(show(rnd[a]),show(rnd[b])) for a,b in mism])
    # ranges
    import random
    random.seed(1)
    bounds=[rnd[i] for i in random.sample(list(rnd),12)]+["E","c","D","\u00e9","zz"]
    ok=True; nchk=0; bad=[]
    for b in bounds:
        hb=hexkey(b)
        for op,f in ((">",lambda s:s>b),(">=",lambda s:s>=b),("<",lambda s:s<b),("<=",lambda s:s<=b)):
            for form in ("?k","STR(?k)"):
                rows=sel(f"SELECT ?s WHERE {{ ?s <urn:p:key> ?k FILTER({form} {op} \"{hb}\") }}")
                got=sorted(int(x[0].rsplit(":",1)[1]) for x in rows)
                exp=sorted(i for i,s in rnd.items() if f(s))
                nchk+=1
                if got!=exp: ok=False; bad.append((show(b),op,form,len(got),len(exp)))
    log("T2g range filters via hex keys: checks=",nchk,"all match codepoint semantics?",ok, bad[:5])
    # pagination
    pages=[]; off=0
    while True:
        rows=sel(f"SELECT ?s ?k WHERE {{ ?s <urn:p:key> ?k }} ORDER BY ?k ?s LIMIT 37 OFFSET {off}")
        if not rows: break
        pages+= [int(x[0].rsplit(":",1)[1]) for x in rows]; off+=37
    log("T2h pagination LIMIT 37 concatenation == codepoint order?", pages==expect)
    # T3 delta/local vocab inserts
    nk=json.load(open("/tmp/w/newkeys.json"))
    ins=" ".join(f"<urn:n:{i}> <urn:p:key> \"{hexkey(s)}\" ." for i,s in enumerate(nk))
    log("T3a UPDATE insert", len(nk), upd("INSERT DATA { "+ins+" }"))
    allk={f"o{i}":s for i,s in rnd.items()}; allk.update({f"n{i}":s for i,s in enumerate(nk)})
    exp2=sorted(allk, key=lambda k: allk[k])
    rows=sel("SELECT ?s ?k WHERE { ?s <urn:p:key> ?k } ORDER BY ?k")
    got=[("o"+x[0].rsplit(":",1)[1]) if x[0].startswith("urn:r:") else ("n"+x[0].rsplit(":",1)[1]) for x in rows]
    log("T3b vocab+delta(local) keys ORDER BY ?k == codepoint order?", got==exp2, "n=",len(got))
    rows=sel("SELECT ?s ?k WHERE { ?s <urn:p:key> ?k } ORDER BY STR(?k)")
    got=[("o"+x[0].rsplit(":",1)[1]) if x[0].startswith("urn:r:") else ("n"+x[0].rsplit(":",1)[1]) for x in rows]
    log("T3c ... ORDER BY STR(?k)?", got==exp2)
    ok=True; nchk=0
    for b in bounds[:10]:
        hb=hexkey(b)
        for op,f in ((">",lambda s:s>b),("<=",lambda s:s<=b)):
            rows=sel(f"SELECT ?s WHERE {{ ?s <urn:p:key> ?k FILTER(?k {op} \"{hb}\") }}")
            got=sorted(("o"+x[0].rsplit(":",1)[1]) if x[0].startswith("urn:r:") else ("n"+x[0].rsplit(":",1)[1]) for x in rows)
            exp=sorted(k for k,s in allk.items() if f(s)); nchk+=1
            if got!=exp: ok=False
    log("T3d range filters over vocab+delta keys: checks=",nchk,"all match?",ok)
    # T4 NOT EXISTS controls
    V="VALUES (?revision ?order) { (\"one\" \"01\") (\"two\" \"02\") }"
    LO="VALUES ?laterOrder { \"01\" \"02\" }"
    qs={
     "N1 flat NOT EXISTS (expected two)": f"SELECT ?revision WHERE {{ {V} FILTER NOT EXISTS {{ {LO} FILTER(?laterOrder > ?order) }} }}",
     "N2 nested subselect NOT EXISTS (expected two)": f"SELECT ?revision WHERE {{ {{ SELECT ?revision ?order WHERE {{ {V} }} }} FILTER NOT EXISTS {{ {{ SELECT ?laterOrder WHERE {{ {LO} }} }} FILTER(?laterOrder > ?order) }} }}",
     "N3 NOT EXISTS, inner has NO filter, no shared var (spec: inner non-empty => all excluded => empty)": f"SELECT ?revision WHERE {{ {V} FILTER NOT EXISTS {{ {LO} }} }}",
     "N4 positive EXISTS flat (expected one)": f"SELECT ?revision WHERE {{ {V} FILTER EXISTS {{ {LO} FILTER(?laterOrder > ?order) }} }}",
     "N5 NOT EXISTS with outer var re-bound in inner (expected two)": f"SELECT ?revision WHERE {{ {V} FILTER NOT EXISTS {{ {V} {LO} FILTER(?laterOrder > ?order) }} }}",
     "N6 MINUS filter-correlated (spec/expected two)": f"SELECT ?revision WHERE {{ {V} MINUS {{ {LO} FILTER(?laterOrder > ?order) }} }}",
     "N7 MINUS with outer var re-bound (expected two)": f"SELECT ?revision WHERE {{ {V} MINUS {{ {V} {LO} FILTER(?laterOrder > ?order) }} }}",
     "N8 OPTIONAL+!BOUND filter-correlated (spec two)": f"SELECT ?revision WHERE {{ {V} OPTIONAL {{ {LO} FILTER(?laterOrder > ?order) }} FILTER(!BOUND(?laterOrder)) }}",
     "N9 OPTIONAL+!BOUND with outer var re-bound (expected two)": f"SELECT ?revision WHERE {{ {V} OPTIONAL {{ {V} {LO} FILTER(?laterOrder > ?order) }} FILTER(!BOUND(?laterOrder)) }}",
     "N10 positive grouping MAX join-back (expected two)": f"SELECT ?revision WHERE {{ {V} {{ SELECT (MAX(?lo) AS ?maxOrder) WHERE {{ VALUES ?lo {{ \"01\" \"02\" }} }} }} FILTER(?order = ?maxOrder) }}",
    }
    for k,qq in qs.items():
        rr=sel(qq); log(k,"->", rr if isinstance(rr,dict) else sorted(x[0] for x in rr))
    # triple-store shaped latest-revision
    R="<urn:rev:"
    base="?r <urn:rev:obj> ?o . ?r <urn:rev:ord> ?ord ."
    inner="?r2 <urn:rev:obj> ?o . ?r2 <urn:rev:ord> ?ord2 . FILTER(?ord2 > ?ord)"
    qs2={
     "S1 triple-shaped flat NOT EXISTS (expected r2,r4,r3,r5)": f"SELECT ?r WHERE {{ {base} FILTER NOT EXISTS {{ {inner} }} }}",
     "S2 same, ?r <ord> ?ord re-bound inside (expected r2,r3,r4,r5)": f"SELECT ?r WHERE {{ {base} FILTER NOT EXISTS {{ ?r <urn:rev:ord> ?ord . {inner} }} }}",
     "S3 MINUS with re-bound": f"SELECT ?r WHERE {{ {base} MINUS {{ ?r <urn:rev:ord> ?ord . {inner} }} }}",
     "S4 MAX-per-object join-back": f"SELECT ?r WHERE {{ {base} {{ SELECT ?o (MAX(?m) AS ?ord) WHERE {{ ?x <urn:rev:obj> ?o . ?x <urn:rev:ord> ?m }} GROUP BY ?o }} }}",
     "S5 OPTIONAL+!BOUND re-bound": f"SELECT ?r WHERE {{ {base} OPTIONAL {{ ?r <urn:rev:ord> ?ord . {inner} }} FILTER(!BOUND(?r2)) }}",
    }
    for k,qq in qs2.items():
        rr=sel(qq); log(k,"->", rr if isinstance(rr,dict) else sorted(x[0].rsplit(":",1)[1] for x in rr))
    log("expected latest per object: A->r2,r4 (tie on '02'), B->r3, C->r5")
finally:
    stop(p)
open("/tmp/w/probe1.out","w").write("\n".join(out))
