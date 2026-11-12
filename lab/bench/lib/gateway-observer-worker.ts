import { performance } from "node:perf_hooks";
import { parentPort as port, workerData as cfg } from "node:worker_threads";
import { CaptureQueue } from "./capture-queue.ts";
import { openPositionGateway } from "./position-gateway.ts";
import { readObservation } from "./read-observation.ts";
import { Histogram } from "./hist.ts";
import { httpCounts, countHttp } from "./http-counts.ts";
// [DX-R3-P9] Why: the read gateway's position fence provides exactness while this worker owns all fallback decoding/checking.
// Rejected: returning a receipt ACK only after the follower catches up, or transferring mutable public row objects to the writer.
try {
  const gateway = await openPositionGateway(cfg.scope, cfg.endpoint);
  const checks = new Histogram(), queue = new CaptureQueue(4), errors: Record<string,number> = {};
  let captures=0;
  const elu=performance.eventLoopUtilization();
  port!.on("message", m => {
    if (m.type === "close") {
      void queue.drain().then(() => {
        gateway.close(); port!.postMessage({id:m.id,value:{captures,check:checks.summary(),elu:performance.eventLoopUtilization(elu).utilization,http:httpCounts(),queue:queue.stats,errors}}); port!.close();
      });
      return;
    }
    void queue.run(async () => {
      try {
        const result = await countHttp("receipt-fallback", () => gateway.pull(m.root,m.basis));
        const start=performance.now();
        const observed=readObservation({...result,route:"fallback",waitedMs:m.waitedMs,replicaFallbackReason:m.reason});
        checks.recordMs(performance.now()-start); captures++;
        port!.postMessage({id:m.id,value:observed});
      } catch(error) {
        // [DX-R3-P9] Why: retain first source failure reasons without an unbounded per-position diagnostic map.
        // Rejected: discarding the reason again, or retaining every unique error string in a long failed run.
        const message=String(error), key=message in errors || Object.keys(errors).length<32 ? message : "other errors";
        errors[key]=(errors[key]??0)+1; port!.postMessage({id:m.id,error:message});
      }
    });
  });
  port!.postMessage({type:"ready"});
} catch(error) { port!.postMessage({type:"error",error:String(error)}); port!.close(); }
