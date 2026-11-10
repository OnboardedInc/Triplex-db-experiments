import fs from "node:fs";
import {isMainThread} from "node:worker_threads";
import {DatomicClient} from "../../../../packages/datomic/dist/index.js";
// [DX-B4-T4] Why: retain actual gateway/transactor headers for writer request attribution.
// Rejected: timing only the public command (cannot separate HTTP, gateway and engine time).
if(isMainThread && process.env.DX_B4_HTTP_OBSERVATIONS) {
 const fd=fs.openSync(process.env.DX_B4_HTTP_OBSERVATIONS,"a");let pending="";let count=0;
 const flush=()=>{if(pending){fs.writeSync(fd,pending);pending="";count=0;}};
 process.on("exit",()=>{flush();fs.closeSync(fd);});
 const installed=new WeakSet(),request=DatomicClient.prototype.request;
 DatomicClient.prototype.request=function(...args) {
  if(!installed.has(this)) {
   installed.add(this);const prior=this.onRequest;
   this.onRequest=sample=>{
    prior?.(sample);
    const route=sample.path.includes("/operation/")?"operation":sample.path.split("/").at(-1);
    pending+=JSON.stringify({route,atMs:performance.timeOrigin+sample.started,wallMs:sample.finished-sample.started,
     gatewayMicros:sample.gatewayMicros,transactMicros:sample.transactMicros,serializeMicros:sample.serializeMicros,
     parseMicros:sample.parseMicros,requestBytes:sample.requestBytes,responseBytes:sample.responseBytes,position:sample.position})+"\n";
    if(++count>=100)flush();
   };
  }
  return request.apply(this,args);
 };
}
