import test from "node:test";
import assert from "node:assert/strict";
import { OpenLoopScheduler } from "../lib/scheduler.ts";

test("queue intervals partition lateness, subject dependency, occupied slots and dispatch with a free slot", async () => {
  let now = 10;
  const finished: any[] = [],
    resolve = new Map<string, () => void>();
  const a = { key: 1, scheduledAt: 0, name: "a" },
    b = { key: 1, scheduledAt: 10, name: "b" },
    c = { key: 2, scheduledAt: 10, name: "c" };
  const s = new OpenLoopScheduler<any>([], {
    maxInFlight: 1,
    deadlineMs: 1000,
    now: () => now,
    observeQueue: true,
    exec: (j) => new Promise<void>((r) => resolve.set(j.name, r)),
    onDone: (r) => {
      finished.push(r);
      now += 2;
    },
  });
  s.inject(a);
  s.inject(b);
  s.inject(c);
  now = 30;
  resolve.get("a")!();
  await new Promise((r) => setImmediate(r));
  now = 50;
  resolve.get("c")!();
  await new Promise((r) => setImmediate(r));
  now = 70;
  resolve.get("b")!();
  await new Promise((r) => setImmediate(r));
  const result = finished.find((r) => r.job === b),
    parts = result.queue;
  assert.equal(parts.find((p: any) => p.cause === "subject").behind, a);
  assert.equal(
    parts
      .filter((p: any) => p.cause === "slot")
      .reduce((n: number, p: any) => n + p.end - p.start, 0),
    18,
  );
  assert.equal(
    parts
      .filter((p: any) => p.cause === "scheduler-dispatch")
      .reduce((n: number, p: any) => n + p.end - p.start, 0),
    4,
  );
  assert.equal(
    parts.reduce((n: number, p: any) => n + p.end - p.start, 0),
    result.waitMs,
  );
  assert.equal(finished.find((r) => r.job === a).queue[0].cause, "scheduler-late");
});

test("an expired predecessor releases subject ordering before its completion callback", async () => {
  let now = 0, complete: (()=>void) | undefined;
  const done: any[] = [];
  const a = { key: 1, scheduledAt: 0, name: "a" }, b = { key: 1, scheduledAt: 0, name: "b" }, c = { key: 1, scheduledAt: 0, name: "c" };
  const s = new OpenLoopScheduler<any>([], { maxInFlight: 1, deadlineMs: 5, now: ()=>now, observeQueue: true,
    exec: ()=>new Promise<void>(r=>{complete=r}), onDone: r=>{done.push(r);now+=2} });
  s.inject(a);s.inject(b);s.inject(c);now=10;complete!();await new Promise(r=>setImmediate(r));
  const last = done.find(r=>r.job===c);
  assert.equal(last.expired,true);
  assert.equal(last.queue.find((q:any)=>q.cause==="subject").behind,b);
  assert.equal(last.queue.find((q:any)=>q.cause==="subject").end,12);
  assert.equal(last.queue.find((q:any)=>q.cause==="scheduler-dispatch").end,14);
});
