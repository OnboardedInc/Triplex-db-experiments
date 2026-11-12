import assert from "node:assert/strict";
import { test } from "node:test";
import { CaptureQueue } from "../../../bench/lib/capture-queue.ts";
// [DX-R3-P9] Why: a queued capture must not start an HTTP deadline until it has a serving slot; closing must retain every capture.
// Rejected: a throughput-only test that misses dropped or concurrently over-issued reads.
test("capture slots bound requests, retain queued work, and drain after rejection", async () => {
  const queue = new CaptureQueue(2), release: (() => void)[] = [], started: number[] = [];
  const jobs = [0,1,2,3].map(i => queue.run(async () => {
    started.push(i); await new Promise<void>(resolve => release[i]=resolve);
    if (i===0) throw Error("source refusal");
    return i;
  }));
  const results=Promise.allSettled(jobs);
  await Promise.resolve(); assert.deepEqual(started,[0,1]);
  let drained=false; const closing=queue.drain().then(()=>{drained=true;});
  release[0]!(); await new Promise<void>(resolve=>setImmediate(resolve));
  assert.deepEqual(started,[0,1,2]); assert.equal(drained,false);
  release[1]!(); await new Promise<void>(resolve=>setImmediate(resolve));
  assert.deepEqual(started,[0,1,2,3]); assert.equal(queue.stats.peakActive,2);
  release[2]!(); release[3]!(); await closing;
  assert.deepEqual((await results).map(x=>x.status),['rejected','fulfilled','fulfilled','fulfilled']);
  assert.equal(queue.stats.outstanding,0); assert.equal(queue.stats.active,0);
  assert.equal(await queue.run(async()=>7),7);
});
