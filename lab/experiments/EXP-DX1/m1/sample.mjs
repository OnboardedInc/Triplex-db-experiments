import fs from 'node:fs';
// [DX-M1] Why: read all container counters on one VM clock every second. Rejected: repeated Docker exec polling that wakes each JVM's CPUs.
const paths=process.env.TX2_ENGINE_CGROUPS.split(',').map(x=>x.split('='));
function sample(){const r={at:new Date().toISOString(),epochMs:Date.now(),containers:{}};for(const [n,p] of [...paths,['driver','/sys/fs/cgroup'+fs.readFileSync('/proc/self/cgroup','utf8').trim().split(':').at(-1)]]){r.containers[n]={};for(const f of ['cpu.stat','memory.stat','memory.events','memory.current','io.stat','cpu.pressure','memory.pressure','io.pressure'])try{r.containers[n][f]=fs.readFileSync(p+'/'+f,'utf8')}catch(e){r.containers[n][f]=String(e)}}r.vm={};for(const f of ['meminfo','vmstat','pressure/cpu','pressure/memory','pressure/io'])r.vm[f]=fs.readFileSync('/proc/'+f,'utf8');fs.appendFileSync('/driver/counters.jsonl',JSON.stringify(r)+'\n')}
sample();setInterval(sample,1000);
