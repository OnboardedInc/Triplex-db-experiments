// [CX-VNSR-5] Why: index durable raw evidence with actual-byte readback after all review children exit. Rejected: putting raw layouts, keys or large logs into git or trusting a copied checksum list.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root=fs.realpathSync(process.argv[2]);
const digest=b=>createHash('sha256').update(b).digest('hex');
const tools=path.join(root,'reviewer-tools'); fs.mkdirSync(tools,{recursive:true});
for(const name of ['review.mjs','opens.c','round3-cases.mjs','retain.mjs']) {
  const bytes=fs.readFileSync(path.join(import.meta.dirname,name));
  fs.writeFileSync(path.join(tools,name),bytes);
  assert.equal(digest(fs.readFileSync(path.join(tools,name))),digest(bytes));
}
const files=[];
function walk(dir) {
  for(const name of fs.readdirSync(dir).sort()) {
    const full=path.join(dir,name),stat=fs.lstatSync(full);
    assert.equal(stat.isSymbolicLink(),false,full);
    if(stat.isDirectory()) walk(full);
    else if(path.relative(root,full)!=='SHA256SUMS') {
      assert.equal(stat.isFile(),true,full);
      files.push({path:path.relative(root,full),size:stat.size,hash:digest(fs.readFileSync(full))});
    }
  }
}
walk(root);
const manifest=files.map(x=>x.hash+'  '+x.path).join('\n')+'\n';
fs.writeFileSync(path.join(root,'SHA256SUMS'),manifest);
fs.writeFileSync(path.join(import.meta.dirname,'SHA256SUMS'),manifest);
assert.equal(fs.readFileSync(path.join(root,'SHA256SUMS'),'utf8'),manifest);
for(const row of files) assert.equal(digest(fs.readFileSync(path.join(root,row.path))),row.hash,row.path);
console.log(JSON.stringify({root,files:files.length,bytes:files.reduce((n,x)=>n+x.size,0),manifestSha256:digest(manifest)}));
