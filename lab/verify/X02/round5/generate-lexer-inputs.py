# [CX-VX02-5] Why: generate witnesses from every pinned lexer production and vary lexical neighbors.
# Rejected: treating this bounded input generator as an expected lexer; the resident's ANTLR class is the oracle.
from pathlib import Path
import re,json,itertools,random,hashlib
r=Path(__file__).resolve().parent
source=(r/'SqlLexer.g4').read_text()
rules={m[2]:m[3].split(' -> ')[0].split(' {')[0].strip() for m in re.finditer(r'^(fragment )?([A-Z_]+)\s*:\s*([\s\S]*?);[ \t]*$',source,re.M)}
fragments=set(m[1] for m in re.finditer(r'^fragment ([A-Z_]+)',source,re.M))
class Parser:
 def __init__(self,s):self.s=s;self.i=0
 def ws(self):
  while self.i<len(self.s)and self.s[self.i].isspace():self.i+=1
 def atom(self):
  self.ws();c=self.s[self.i];self.i+=1
  if c=="'":
   v=''
   while self.i<len(self.s):
    c=self.s[self.i];self.i+=1
    if c=="'":return('lit',v)
    if c=='\\':
     c=self.s[self.i];self.i+=1;v+={'n':'\n','r':'\r','t':'\t'}.get(c,c)
    else:v+=c
   raise ValueError('literal')
  if c=='[':
   start=self.i-1
   while self.s[self.i]!=']':self.i+=1
   self.i+=1;return('class',self.s[start:self.i])
  if c=='(':
   a=self.expr();self.ws();assert self.s[self.i]==')';self.i+=1;return a
  if c=='~':return('not',self.atom())
  if c=='.':return('any',)
  m=re.match(r'[A-Z_][A-Z_0-9]*',self.s[self.i-1:]);assert m,(self.s,self.i,c)
  self.i+=len(m[0])-1;return('ref',m[0])
 def expr(self):
  alts=[];seq=[]
  while True:
   self.ws()
   if self.i>=len(self.s)or self.s[self.i]==')':break
   if self.s[self.i]=='|':alts.append(('seq',seq));seq=[];self.i+=1;continue
   a=self.atom();self.ws()
   if self.i<len(self.s)and self.s[self.i]in'*+?':
    op=self.s[self.i];self.i+=1;a=('repeat',a,op)
    if self.i<len(self.s)and self.s[self.i]=='?':self.i+=1
   seq.append(a)
  alts.append(('seq',seq));return('alt',alts)
asts={}
for name,body in rules.items():
 if name in ['BLOCK_COMMENT','LINE_COMMENT','DM_END_TAG','DM_TEXT']:continue
 p=Parser(body);asts[name]=p.expr();p.ws();assert p.i==len(body),(name,body[p.i:])
chars=['a','Z','0','9','_','$',"'",'"','`','\\','/','*',';','(',')',' ','\t','\r','\n','\x00','Σ','雪','😀']
def uniq(xs):return list(dict.fromkeys(xs))[:64]
def accepts(node,c):
 kind=node[0]
 if kind=='lit':return c==node[1]
 if kind=='class':return bool(re.fullmatch(node[1],c))
 if kind=='alt':return any(accepts(x,c)for x in node[1])
 if kind=='seq':return len(node[1])==1 and accepts(node[1][0],c)
 if kind=='ref':return accepts(asts[node[1]],c)
 return False
cache={}
def gen(n):
 k=n[0]
 if k=='lit':return[n[1]]
 if k=='class':return uniq([c for c in chars+list('abcdef0123456789')if re.fullmatch(n[1],c)])
 if k=='not':return uniq(c for c in chars if not accepts(n[1],c))
 if k=='any':return chars
 if k=='ref':
  if n[1]not in cache:cache[n[1]]=gen(asts[n[1]])
  return cache[n[1]]
 if k=='alt':return uniq(x for a in n[1]for x in gen(a))
 if k=='repeat':
  vs=gen(n[1]);counts={'*':[0,1,2,4],'+':[1,2,4],'?':[0,1]}[n[2]]
  return uniq(v*count for count in counts for v in vs)
 if k=='seq':
  vs=[gen(x)for x in n[1]]
  if not vs:return['']
  base=[v[0]for v in vs];out=[''.join(base)]
  for i,choices in enumerate(vs):
   for v in choices[1:]:
    a=base.copy();a[i]=v;out.append(''.join(a))
  for row in itertools.islice(itertools.product(*(v[:3]for v in vs)),32):out.append(''.join(row))
  return uniq(out)
 raise ValueError(n)
records=[];seen={}
def add(text,group,rule=None):
 if text in seen:
  records[seen[text]]['groups'].append(group)
  if rule:records[seen[text]]['rules'].append(rule)
  return
 seen[text]=len(records);records.append({'id':str(len(records)),'sql':text,'groups':[group],'rules':[rule]if rule else[]})
for name in asts:
 if name in fragments:continue
 for s in gen(asts[name]):
  add(s,'rule',name)
  for neighbor in [('a',s), (s,'$x'),(s,'1'),('SELECT ',s+' FROM t')]:add(''.join(neighbor),'neighbor',name)
  if re.fullmatch('[A-Za-z_]+',s):
   add(s.lower(),'case',name);add(''.join(c.lower()if i%2 else c.upper()for i,c in enumerate(s)),'case',name)
for tag in ['','a','A','x1','_tag','a_9']:
 d='$'+tag+'$'
 for payload in ['',"' ; DELETE ) /*",'Σ雪😀','\n\r\t','$$ $a$ $A$','$not_same$ a$$b','x'+d+'z']:
  add(d+payload+d,'dollar-mode','DOLLAR_TAG');add('SELECT '+d+payload+d+' AS v','dollar-context','DM_END_TAG')
 for suffix in ['',d[:-1],'$'+tag.swapcase()+'$']:
  add(d+'unterminated'+suffix,'dollar-mode-edge','DM_TEXT')
for depth in [1,2,3,4,8,16,64,257,1024,4096]:
 for payload in [' x ',' " \" -- ) ; DELETE ',' 雪😀 ']:
  comment='/*'*depth+payload+'*/'*depth
  add(comment+' SELECT 1','nested-comment','BLOCK_COMMENT')
  add(comment[:-2]+' SELECT 1','comment-edge','BLOCK_COMMENT')
for s in ['/* /* */ SELECT 1','/*/SELECT 1','/**/SELECT 1','--x\rSELECT 1','--x\nSELECT 1','--x\r\nSELECT 1','--x\u2028DELETE','/* a /* b */ SELECT 1','/* a */ */ SELECT 1']:
 add(s,'comment-edge','LINE_COMMENT'if s.startswith('--')else'BLOCK_COMMENT')
spaces=[' ','\n','\r','\t','\v','\f','\u0085','\u00a0','\u1680',*map(chr,range(0x2000,0x200b)),'\u2028','\u2029','\u202f','\u205f','\u3000','\ufeff','\u200b','\u200c','\u200d']
for s in spaces:
 add('SELECT'+s+'1','whitespace','WHITESPACE');add('a'+s+'DELETE','whitespace-boundary','WHITESPACE')
for s in ['a$tag$','a$$','a$1','_a9','a$tag$;DELETE;z$tag$b','"a""UNION"','`a``UNION`','"Σ雪😀"','`Σ雪😀`','"a/b"','`a/b`','ſOME','K','Δ','é','aé','aΣ','١','１']:
 add(s,'identifier-edge','REGULAR_IDENTIFIER');add('SELECT '+s+' AS v','identifier-context','DELIMITED_IDENTIFIER')
for s in ["'a''b'","'a\nb'","'a\rb'","E'\\a'","E'\\8'","E'\\7777'","e'\\x01'","E'\\u0000'","E'\\U0001F600'","X('aB09')",'1e','1e+','1e-3','1.0E+12','12.','0x12','.5','01e+02','1_000']:
 add(s,'string-number-edge');add('SELECT '+s+' AS v','string-number-context')
for a in ['-','/','!','<','>','|','#',':','~']:
 for b in ['-','/','*','!','<','>','|','#',':','~','=']:
  add(a+b,'operator-adjacency');add('1'+a+b+'2','operator-context')
for rule in ['BLOCK_COMMENT','LINE_COMMENT','WHITESPACE','DOLLAR_TAG','DM_TEXT','DM_END_TAG']:
 assert any(rule in x['rules']for x in records),rule
(r/'lexer-cases.json').write_text(json.dumps(records,ensure_ascii=True,indent=2)+'\n')
(r/'lexer-inputs.json').write_text(json.dumps([[x['id'],x['sql']]for x in records],ensure_ascii=True)+'\n')
(r/'lexer-generation.json').write_text(json.dumps({'fixtureSha256':hashlib.sha256(source.encode()).hexdigest(),'rules':list(rules),'fragments':sorted(fragments),'defaultRulesGenerated':[x for x in asts if x not in fragments],'cases':len(records),'commentDepths':[1,2,3,4,8,16,64,257,1024,4096]},indent=2)+'\n')
print(len(records),'unique cases;',len(rules)-len(fragments),'nonfragment rules')
