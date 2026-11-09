import {createInterface} from 'node:readline';
import cp from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import {parentPort,workerData} from 'node:worker_threads';
import './hook.mjs';
const role=workerData?.role ?? process.argv[2];
const file=workerData?.file ?? process.argv[3];
const key={source:'generic/source',stream:'s',epoch:'1',position:'1'};
// [CX-VFD01-R3] Why: simulate a reboot identity in a separate process without changing the host.
// Rejected: changing the OS boot state or relabelling only an already captured observation.
if(role==='reboot'){
  const original=cp.execFileSync;
  cp.execFileSync=(cmd,args,options)=>cmd==='/usr/sbin/sysctl'&&args?.includes('kern.bootsessionuuid')?'review-fixture-new-boot':original(cmd,args,options);
  syncBuiltinESMExports();
}
const host=await import('@triplex-build/triplex-host/feed');
const clock=host.openHostFeedClock();
if(parentPort){
  let clonedClockError;
  try{host.captureFeedInstant(workerData.clock,key);}catch(e){clonedClockError=String(e);}
  parentPort.postMessage({known:host.captureFeedInstant(clock,key),clonedClockError});
}else{
  const writer=role==='producer'||role==='reboot'?host.openPublicationWriter(file,key.source,key.stream,clock):null;
  process.stdout.write('ready\n');
  for await(const line of createInterface({input:process.stdin})){
    const publication=writer?writer.publish(key,'native-publication-1'):undefined;
    process.stdout.write(JSON.stringify({role,publication,known:host.captureFeedInstant(clock,key),relativeMs:performance.now(),originMs:performance.timeOrigin,simulatedReboot:role==='reboot'})+'\n');
  }
  writer?.close();
}
