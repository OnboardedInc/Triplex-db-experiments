import { Worker } from "node:worker_threads";
import type { BrokerFeedPage, BrokerFeedRequest } from "./Adapters.js";

// [EXP-FD01] Why: R25's feed ReadRequest must execute synchronous LogFeed IO on a reader thread.
// Rejected: Promise.resolve(LogFeed.poll(...)) (still blocks the server's event loop).
export function openBrokerFeedReader(moduleUrl: string, dir: string) {
  const worker = new Worker(
    `
    const {parentPort,workerData}=require('node:worker_threads');
    let feed;
    const ready=import(workerData.moduleUrl).then(m=>{feed=new m.LogFeed(workerData.dir)});
    parentPort.on('message',async({id,request})=>{
      try { await ready; if(request.kind!=='feed')throw Error('Unknown reader request');
        parentPort.postMessage({id,page:feed.poll(request.cursor,{maxBytes:request.maxBytes})});
      } catch(e){parentPort.postMessage({id,error:String(e)})}
    });
  `,
    { eval: true, workerData: { moduleUrl, dir } },
  );
  let sequence = 0;
  let stopped: Error | undefined;
  const pending = new Map<
    number,
    { resolve: (page: BrokerFeedPage) => void; reject: (error: Error) => void }
  >();
  const fail = (error: Error) => {
    stopped ??= error;
    for (const p of pending.values()) p.reject(error);
    pending.clear();
  };
  worker.on("error", fail);
  worker.on("exit", (code) => fail(new Error(`Feed reader exited ${code}`)));
  worker.on("message", (m: { id: number; page: BrokerFeedPage; error?: string }) => {
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    if (m.error) p.reject(new Error(m.error));
    else p.resolve(m.page);
  });
  return {
    transport: "reader-worker" as const,
    request: (request: BrokerFeedRequest): Promise<BrokerFeedPage> => {
      if (stopped) return Promise.reject(stopped);
      return new Promise((resolve, reject) => {
        const id = ++sequence;
        pending.set(id, { resolve, reject });
        worker.postMessage({ id, request });
      });
    },
    close: async () => {
      fail(new Error("Feed reader closed"));
      await worker.terminate();
    },
  };
}
