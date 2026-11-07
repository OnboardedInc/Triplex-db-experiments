import random, os, sys, subprocess, glob, json
sys.path.insert(0,"/tmp/w")
from lib import start_index
random.seed(7)
N=200000
alpha="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789"
texts=set()
while len(texts)<N:
    L=random.randint(8,40)
    texts.add(''.join(random.choice(alpha) for _ in range(L)))
texts=sorted(texts); random.shuffle(texts)
b36="0123456789abcdefghijklmnopqrstuvwxyz"
def hex6(s): return ''.join("%06x"%ord(c) for c in s)
def b36k(s):
    out=[]
    for c in s:
        n=ord(c); d=[]
        for _ in range(4): d.append(b36[n%36]); n//=36
        out.append(''.join(reversed(d)))
    return ''.join(out)
def build(name, keyfn):
    path=f"/tmp/w/{name}.nt"
    with open(path,"w") as f:
        for i,t in enumerate(texts):
            f.write(f'<urn:a:{i}> <urn:f:value_string> "{t}" .\n')
            f.write(f'<urn:a:{i}> <urn:f:entity_id> "e{i%5000}" .\n')
            if keyfn: f.write(f'<urn:a:{i}> <urn:f:value_string_order> "{keyfn(t)}" .\n')
    r=start_index(name,path)
    d=f"/tmp/w/{name}"
    tot=sum(os.path.getsize(p) for p in glob.glob(d+"/triplex*") if "resource-usage" not in p and os.path.isfile(p))
    voc=sum(os.path.getsize(p) for p in glob.glob(d+"/triplex.vocabulary*") if os.path.isfile(p))
    perm=sum(os.path.getsize(p) for p in glob.glob(d+"/triplex.*index.*") if os.path.isfile(p))
    os.remove(path)
    return r.returncode, tot, voc, perm
res={}
for name,fn in (("st_none",None),("st_hex6",hex6),("st_b36",b36k)):
    res[name]=build(name,fn); print(name,res[name],flush=True)
base=res["st_none"][1]
for k in ("st_hex6","st_b36"):
    print(k,"extra bytes total",res[k][1]-base,"per assertion",(res[k][1]-base)/N, "| avg text len ~24 codepoints")
