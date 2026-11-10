// [DX-N1] Why: matched commit and read phases need the same cumulative CPU denominator in each arm.
// Rejected: host %CPU (includes unrelated work) and allocation-based cores for native processes.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
export function totals(){
 const roots=JSON.parse(process.env.TX2_NATIVE_PIDS||'{}');
 if(Object.keys(roots).length){
  const rows=execFileSync('ps',['-axo','pid=,ppid=,time=,lstart='],{encoding:'utf8'}).trim().split('\n').map(line=>{
   const m=/^\s*(\d+)\s+(\d+)\s+([\d:.\-]+)\s+(.+)$/.exec(line);if(!m)throw Error('bad ps CPU row');
   const [days,time]=m[3].includes('-')?m[3].split('-'):['0',m[3]];
   return {pid:Number(m[1]),ppid:Number(m[2]),us:(time.split(':').map(Number).reduce((s,n)=>s*60+n,0)+Number(days)*86400)*1e6,birth:m[4]};
  });
  return Object.fromEntries(Object.entries(roots).map(([name,pid])=>{
   const root=rows.find(r=>r.pid===pid);if(!root)throw Error('native root gone '+name);
   const owned=new Set([pid]);for(let changed=true;changed;){changed=false;for(const r of rows)if(owned.has(r.ppid)&&!owned.has(r.pid)){owned.add(r.pid);changed=true;}}
   return [name,{us:rows.filter(r=>owned.has(r.pid)).reduce((s,r)=>s+r.us,0),identity:`${pid}:${root.birth}`}];
  }));
 }
 return Object.fromEntries((process.env.TX2_ENGINE_CGROUPS||'').split(',').filter(Boolean).map(s=>{const i=s.indexOf('='),name=s.slice(0,i),dir=s.slice(i+1);return [name,{us:Number(/^usage_usec (\d+)$/m.exec(fs.readFileSync(dir+'/cpu.stat','utf8'))[1]),identity:dir}];}));
}
export function delta(before,after,wallMs){
 const seconds=Object.fromEntries(Object.entries(before).map(([name,a])=>{const b=after[name];if(!b||a.identity!==b.identity)throw Error('CPU identity changed');return [name,(b.us-a.us)/1e6];}));
 return {seconds,usedCores:Object.values(seconds).reduce((s,n)=>s+n,0)/(wallMs/1000),denominator:process.env.TX2_NATIVE_PIDS?'used native process cores (live descendants; exited worker CPU may be missed)':'used Linux cgroup cores'};
}
