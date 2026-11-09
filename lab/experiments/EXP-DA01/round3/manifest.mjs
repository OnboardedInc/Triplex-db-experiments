// @ts-nocheck -- [EXP-CHECKJS-R2] unannotated local values; unannotated dynamic parameters; initially empty collections. Binding errors remain checked by lab/bin/checkjs.mjs.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
// [EXP-DA01] Why: hash retained evidence only after producers finish, without traversing dependency links or hashing an active generation log. Rejected: a self-changing manifest or vendored dependency cache.
const root=import.meta.dirname,files=[];
function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','npm-cache'].includes(entry.name))continue;const file=path.join(dir,entry.name);if(entry.isDirectory())visit(file);else if(entry.isFile()&&!['FILES.json','manifest.log','collect.log'].includes(entry.name)){const b=fs.readFileSync(file);files.push({path:path.relative(root,file),bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')});}}}
visit(root);fs.writeFileSync(path.join(root,'FILES.json'),JSON.stringify({format:'tx2-evidence-files/1',files:files.sort((a,b)=>a.path.localeCompare(b.path))},null,2)+'\n');console.log(JSON.stringify({files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0)}));
