import json, sys, glob
sys.path.insert(0,"/tmp/w")
from lib import *
meta=json.load(open("/tmp/w/meta.json"))
tiny=meta["tiny"]; rnd={int(k):v for k,v in meta["rnd"].items()}
def run(name, loc):
    print("=== locale", loc)
    settings={"locale":{"language":loc[0],"country":loc[1],"ignore-punctuation":loc[2]}}
    r=start_index(name,"/tmp/w/d1.nt",settings)
    print("index rc",r.returncode, (r.stderr or r.stdout).strip().splitlines()[-2:] if r.returncode else "")
    if r.returncode: return
    cfgf=glob.glob(f"/tmp/w/{name}/triplex.meta-data.json")[0]
    print("recorded locale:", json.load(open(cfgf))["locale"])
    p=start_server(name)
    try:
        L="<urn:triplex-sort:label>"
        ids=lambda rows:[x[0].rsplit(":",1)[1] for x in rows]
        rows=sel(f"SELECT ?e ?l WHERE {{ ?e {L} ?l }} ORDER BY STR(?l) STR(?e)")
        exp=["ascii-A","ascii-E","ascii-c","nfd-e-acute","ascii-z","nfc-e-acute","private-use","astral-10000","emoji"]
        print("tiny order:", ids(rows)); print("tiny PASS" if ids(rows)==exp else "tiny FAIL (expected %s)"%exp)
        rows=sel("SELECT ?v WHERE { VALUES ?v { \"A\" \"E\" \"c\" \"z\" \"0\" \"_\" \"~\" \"B\" \"a\" } } ORDER BY ?v")
        print("ASCII local-vocab VALUES order:", [x[0] for x in rows], "(codepoint: 0 A B E _ a c z ~)")
        rows=sel("SELECT ?t ?s WHERE { ?s <urn:p:text> ?t } ORDER BY ?t")
        got=[int(x[1].rsplit(":",1)[1]) for x in rows]
        expect=sorted(rnd,key=lambda i:rnd[i])
        mism=sum(1 for a,b in zip(got,expect) if a!=b)
        ascii_ids=[i for i in rnd if all(ord(c)<128 for c in rnd[i])]
        gotA=[i for i in got if i in set(ascii_ids)]; expA=sorted(ascii_ids,key=lambda i:rnd[i])
        print("400 random strings positions mismatching codepoint order:", mism, "of", len(got), "| ASCII-only subset (n=%d) exact:"%len(ascii_ids), gotA==expA)
        rows=sel("SELECT ?s WHERE { ?s <urn:p:text> ?t FILTER(?t > \"E\") }")
        got=sorted(int(x[0].rsplit(":",1)[1]) for x in rows); exp=sorted(i for i,s in rnd.items() if s>"E")
        print("?t > \"E\" matches codepoint semantics:", got==exp, len(got), len(exp))
    finally: stop(p)
run("posix",("en","US_POSIX",False))
run("root",("",  "",False))
run("und",("und","",False))
