# [DX-B7] Why: catch delimiter mistakes while the JVM slot is occupied. Rejected: treating this as compilation or a semantic gate.
import sys,pathlib
for p in pathlib.Path(sys.argv[1]).glob('*.clj'):
 s=p.read_text();stack=[];i=0
 while i<len(s):
  c=s[i]
  if c==';':
   end=s.find('\n',i);i=len(s) if end<0 else end;continue
  if c=='"':
   i+=1
   while i<len(s):
    if s[i]=='\\':i+=2;continue
    if s[i]=='"':break
    i+=1
  elif c=='\\':
   i+=1
   if i<len(s) and s[i].isalpha():
    while i+1<len(s) and s[i+1].isalnum():i+=1
  elif c in '([{':stack.append((c,i))
  elif c in ')]}':
   assert stack and '([{'.index(stack[-1][0])==')]}'.index(c),(p,s[:i].count('\n')+1,c,stack[-1:] )
   stack.pop()
  i+=1
 assert not stack,(p,stack)
print('Delimiters balanced; not a compiler gate')
