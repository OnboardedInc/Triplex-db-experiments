// [EXP-OBS01] Why: compare the original full HTTP exchange and established nonce RPC on one endpoint/kernel.
// Rejected: declaring offset error from RTT alone or relaxing the acceptance margin.
import http from 'node:http';
import fs from 'node:fs';
import { ClockSampler } from '../bin/observer-clock.mjs';
const port=Number(process.argv[2]),clock=new ClockSampler(port),rows=[];
const now=()=>Number(process.hrtime.bigint())/1e6;
try{
  for(let i=0;i<40;i++){
    const send=now();const reply=await new Promise((resolve,reject)=>{
      const req=http.get({hostname:'127.0.0.1',port,path:'/clock',agent:false},response=>{let body='';response.on('data',data=>body+=data);response.on('end',()=>{try{resolve(JSON.parse(body));}catch(e){reject(e);}});});req.on('error',reject);
    });const receive=now();rows.push({method:'legacy-http',send,receive,observerMono:reply.observerMono,rttMs:receive-send});
    const sample=await clock.sample();rows.push({method:'nonce-tcp',...sample,rttMs:sample.receive-sample.send});
  }
}finally{clock.close();}
const summary={};for(const method of ['legacy-http','nonce-tcp']){const values=rows.filter(r=>r.method===method).map(r=>r.rttMs).sort((a,b)=>a-b);summary[method]={samples:values.length,min:values[0],p50:values[Math.floor(values.length*.5)],p99:values[Math.ceil(values.length*.99)-1],rejected:values.filter(v=>v>2).length};}
fs.writeFileSync(process.argv[3],JSON.stringify({summary,rows},null,2)+'\n');console.log(JSON.stringify(summary));
