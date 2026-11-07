import random, json, itertools, sys
random.seed(20261107)
def nt_lit(s):
    out=[]
    for ch in s:
        cp=ord(ch)
        if cp < 0x80 and (ch.isalnum() or ch in " _-.,:;!?()[]{}<>/@#$%^&*+=~|'`"):
            out.append(ch)
        elif cp <= 0xFFFF:
            out.append("\\u%04X"%cp)
        else:
            out.append("\\U%08X"%cp)
    return '"'+''.join(out)+'"'
def hexkey(s): return ''.join("%06x"%ord(c) for c in s)
triples=[]
# tiny fixture from qualification/native-controls/qlever-collation-tiny-v1
tiny={"ascii-A":"A","ascii-E":"E","ascii-c":"c","ascii-z":"z","nfd-e-acute":"é","nfc-e-acute":"é","private-use":"","astral-10000":"\U00010000","emoji":"\U0001F600"}
for k,v in tiny.items():
    triples.append(f"<urn:triplex-sort:{k}> <urn:triplex-sort:label> {nt_lit(v)} .")
    triples.append(f"<urn:triplex-sort:{k}> <urn:triplex-sort:key> {nt_lit(hexkey(v))} .")
# IRIs for STR(?s) ordering (the page-sample shape: c then E)
for n in ["A1","E1","c1","z1","cE","cc","ce"]:
    triples.append(f"<urn:triplex:s:{n}> <urn:triplex:p> \"x\" .")
# exhaustive hex strings len 1..3
hexd="0123456789abcdef"
allhex=[]
for L in (1,2,3):
    for t in itertools.product(hexd,repeat=L): allhex.append(''.join(t))
for i,h in enumerate(allhex):
    triples.append(f"<urn:h:{i}> <urn:p:hex> \"{h}\" .")
# random unicode strings
pool=list("ABCDEZabcdez019_-. ~")+[chr(c) for c in (0xe0,0xe9,0xc9,0x301,0x3b1,0x3a3,0x4e2d,0xff21,0xe000,0xfffd,0x10000,0x1f600,0x1d400,0x2c)]
rnd=set()
while len(rnd)<400:
    L=random.randint(0,5)
    rnd.add(''.join(random.choice(pool) for _ in range(L)))
rnd=sorted(rnd)
random.shuffle(rnd)
rmap={}
for i,s in enumerate(rnd):
    rmap[i]=s
    triples.append(f"<urn:r:{i}> <urn:p:text> {nt_lit(s)} .")
    triples.append(f"<urn:r:{i}> <urn:p:key> {nt_lit(hexkey(s))} .")
# revision data for correlated shape
rev=[("r1","A","01"),("r2","A","02"),("r3","B","01"),("r4","A","02"),("r5","C","07"),("r6","C","03")]
for r,o,ordv in rev:
    triples.append(f"<urn:rev:{r}> <urn:rev:obj> \"{o}\" .")
    triples.append(f"<urn:rev:{r}> <urn:rev:ord> \"{ordv}\" .")
open("d1.nt","w",encoding="ascii").write("\n".join(triples)+"\n")
json.dump({"rnd":rmap,"allhex":allhex,"tiny":tiny},open("meta.json","w"))
# delta keys for update test: new hex keys not in index
newkeys=set()
while len(newkeys)<150:
    s=''.join(random.choice(pool) for _ in range(random.randint(1,4)))
    k=hexkey(s)
    if s not in rnd: newkeys.add(s)
newkeys=sorted(newkeys)
json.dump(newkeys,open("newkeys.json","w"))
print(len(triples),"triples", len(rnd),"random", len(allhex),"hex", len(newkeys),"delta")
