// [CX-VOBS7-R17] Why: run unchanged R16 assertions while retaining their new outputs separately from committed historical evidence. Rejected: rerunning into round16/ and restoring/discarding the overwritten bytes afterward.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const old=fileURLToPath(new URL('./round16/',import.meta.url)),fresh=fileURLToPath(new URL('./round17/replay16-js/',import.meta.url));
const original=fs.writeFileSync;
fs.writeFileSync=function(file,...args){
 if(file instanceof URL)file=fileURLToPath(file);
 if(typeof file==='string'&&path.resolve(file).startsWith(old)){
  const target=path.join(fresh,path.relative(old,path.resolve(file)));fs.mkdirSync(path.dirname(target),{recursive:true});return original.call(fs,target,...args);
 }
 return original.call(fs,file,...args);
};
