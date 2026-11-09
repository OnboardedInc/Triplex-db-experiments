// [CX-VNSR-5-R5] Why: retain source-bound review evidence outside git and read every digest back after execution. Rejected: promoting process exit or a copied checksum list into proof.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root=fs.realpathSync(process.argv[2]);
const sha=b=>createHash('sha256').update(b).digest('hex');
const tools=path.join(root,'reviewer-tools'); fs.mkdirSync(tools,{recursive:true});
for(const name of ['review.mjs','retain.mjs']){
  const bytes=fs.readFileSync(path.join(import.meta.dirname,name));
  fs.writeFileSync(path.join(tools,name),bytes);
  assert.equal(sha(fs.readFileSync(path.join(tools,name))),sha(bytes));
}
const files=[];
function walk(dir){
  for(const name of fs.readdirSync(dir).sort()){
    const full=path.join(dir,name),st=fs.lstatSync(full);
    assert.equal(st.isSymbolicLink(),false,full);
    if(st.isDirectory())walk(full);
    else if(path.relative(root,full)!=='SHA256SUMS'){
      assert.ok(st.isFile(),full);
      files.push({path:path.relative(root,full),size:st.size,hash:sha(fs.readFileSync(full))});
    }
  }
}
walk(root);
const manifest=files.map(f=>f.hash+'  '+f.path).join('\n')+'\n';
fs.writeFileSync(path.join(root,'SHA256SUMS'),manifest);
fs.writeFileSync(path.join(import.meta.dirname,'SHA256SUMS'),manifest);
assert.equal(fs.readFileSync(path.join(root,'SHA256SUMS'),'utf8'),manifest);
for(const row of files)assert.equal(sha(fs.readFileSync(path.join(root,row.path))),row.hash,row.path);
console.log(JSON.stringify({root,files:files.length,bytes:files.reduce((n,f)=>n+f.size,0),manifestSha256:sha(manifest)}));
