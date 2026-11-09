// [CX-VP4N] Why: exercise threshold dictionaries and request identity independently of W0's small, homogeneous tables.
// Rejected: inferring these guarantees from repeated head pulls of the same fixture.
import path from "node:path";
import { createRequire } from "node:module";
import { Worker } from "node:worker_threads";
import { it, expect } from "vitest";
import { HostLog } from "../../../packages/qlever/src/broker/log.js";
import { wholePullTuples, h1Rows } from "../../../packages/qlever/src/broker/h1.js";
import { sqliteWorker } from "../../../packages/qlever/src/broker/sqlite-worker.js";
import { fresh, append, row } from "../QH1/helpers.js";
const D = createRequire(new URL("../../../packages/qlever/package.json", import.meta.url))(
  "better-sqlite3",
);

it("the committed worker source is identical to both the measured and formatted retained workers", async () => {
  for (const arm of ["sbe", "sbf"]) {
    const retained = await import(
      /* @vite-ignore */ `/Users/sam/Claude/Projects/triplex-db-2/evidence/P4N-R1/arms/${arm}/packages/qlever/dist/broker/sqlite-worker.js`
    );
    expect(sqliteWorker).toBe(retained.sqliteWorker);
  }
});

it("whole-table at max-id 256, cached repeat, and used-entry at 257 give identical full Triples", async () => {
  const dir = fresh();
  const { log } = await HostLog.open(dir, { minFreeBytes: 0 });
  const db = new D(path.join(dir, "broker.db"));
  try {
    await append(log, [
      {
        ...row(1, "root", 2048),
        attribute: ":weird/\ud800",
        created_by: "creator\ud800",
        entity_type: "type\udfff",
        schema_version: 3,
        valid_to: 150,
      },
      { ...row(2, "root/child", 2048), attribute: ":normal", created_by: "writer", valid_to: null },
    ]);
    const pull = async () => {
      const answer = await log.wholePull(2048, ["root"]);
      const w = wholePullTuples(answer);
      return { answer, triples: [...h1Rows(w.tuples, { validAt: 100 }, w.dict).values()].flat() };
    };
    const reference = (await pull()).triples;
    expect(reference).toHaveLength(2);
    for (const table of ["attrs", "strs"]) {
      const id = table === "attrs" ? "aid" : "sid";
      let max = db.prepare(`SELECT max(${id}) FROM ${table}`).pluck().get();
      while (max < 256) {
        max++;
        db.prepare(`INSERT INTO ${table} VALUES (?,?)`).run(max, `unused-${table}-${max}`);
      }
    }
    for (let i = 0; i < 8; i++) {
      const x = await pull();
      expect(JSON.parse(x.answer.parts[0]!.attrs)).toHaveLength(256);
      expect(JSON.parse(x.answer.parts[0]!.strs)).toHaveLength(256);
      expect(x.triples).toEqual(reference);
    }
    db.exec(
      "INSERT INTO attrs VALUES(257,':unused/257'); INSERT INTO strs VALUES(257,'unused-257')",
    );
    for (let i = 0; i < 8; i++) {
      const x = await pull();
      expect(JSON.parse(x.answer.parts[0]!.attrs)).toHaveLength(2);
      expect(JSON.parse(x.answer.parts[0]!.strs)).toHaveLength(3);
      expect(x.triples).toEqual(reference);
    }
    // Follow a known-good decode with concurrent requests whose expected entity and value differ on every request.
    const results = await Promise.all(
      Array.from({ length: 256 }, (_, i) => log.wholePull(2048, [i % 2 ? "root" : "missing"])),
    );
    for (let i = 0; i < results.length; i++) {
      const w = wholePullTuples(results[i]!);
      expect([...h1Rows(w.tuples, { validAt: 100 }, w.dict).values()].flat()).toEqual(
        i % 2 ? reference : [],
      );
    }
  } finally {
    db.close();
    await log.close();
  }
});

// [CX-VP4N] Why: use the actual production Connection class with a deterministic worker that can deliver replies out of order.
// Rejected: reimplementing request correlation in a test double (would test the reviewer rather than the candidate).
async function connection() {
  const { log } = await HostLog.open(fresh(), { minFreeBytes: 0 });
  const C = (log as any).pool[0].constructor;
  await log.close();
  const worker = new Worker(
    `
    const {parentPort}=require('node:worker_threads'); let shared;
    parentPort.on('message', m => {
      if(m.op==='attach'){shared=m.response;return;}
      if(m.op==='crash'){throw Error('controlled worker failure');}
      const reply=()=>shared.postMessage(m.op==='error'?{rid:m.rid,error:'controlled request error'}:{rid:m.rid,result:m.args.value});
      setTimeout(reply,m.args.delay);
    });`,
    { eval: true },
  );
  return { c: new C(worker) as any, worker };
}

it("shared replies correlate under out-of-order concurrency, abandoned waits, and request errors", async () => {
  const { c, worker } = await connection();
  try {
    const calls = Array.from({ length: 300 }, (_, i) =>
      c.requestOnPort(i % 17 ? "echo" : "error", { value: i, delay: (300 - i) % 40 }).then(
        (value: any) => ({ value }),
        (e: Error) => ({ error: e.message }),
      ),
    );
    const abandoned = c.requestOnPort("echo", { value: "abandoned", delay: 70 });
    // A cancelled consumer stops observing this promise; the underlying request still owns its unique rid.
    await Promise.race([abandoned, Promise.resolve("cancelled")]);
    const actual = await Promise.all(calls);
    for (let i = 0; i < actual.length; i++) {
      if (i % 17) expect(actual[i]).toEqual({ value: i });
      else expect(actual[i].error).toContain("controlled request error");
    }
    expect(await c.requestOnPort("echo", { value: "next", delay: 90 })).toBe("next");
    expect(await abandoned).toBe("abandoned");
    expect(c.shared.pending.size).toBe(0);
  } finally {
    await worker.terminate();
    c.shared?.port.close();
  }
});

it("a timed-out rid is retired and its late reply cannot satisfy a later request", async () => {
  const { c, worker } = await connection();
  const original = globalThis.setTimeout;
  try {
    // Shorten only the Connection's timeout; the worker runs in its own isolate with real timers.
    globalThis.setTimeout = ((fn: any, ms: number, ...args: any[]) =>
      original(fn, ms === 30000 ? 15 : ms, ...args)) as any;
    const expired = c
      .requestOnPort("echo", { value: "expired", delay: 80 })
      .catch((e: Error) => e.message);
    globalThis.setTimeout = original;
    expect(await expired).toContain("timed out");
    expect(await c.requestOnPort("echo", { value: "live", delay: 140 })).toBe("live");
    expect(c.shared.pending.size).toBe(0);
  } finally {
    globalThis.setTimeout = original;
    await worker.terminate();
    c.shared?.port.close();
  }
});

it("a worker error rejects all pending requests and refuses subsequent work", async () => {
  const { c, worker } = await connection();
  try {
    const calls = Array.from({ length: 30 }, (_, i) =>
      c.requestOnPort("echo", { value: i, delay: 1000 }),
    );
    calls.push(c.requestOnPort("crash", { value: null, delay: 0 }));
    const outcomes = await Promise.allSettled(calls);
    expect(outcomes.every((x) => x.status === "rejected")).toBe(true);
    expect(c.shared.pending.size).toBe(0);
    await expect(c.requestOnPort("echo", { value: "late", delay: 0 })).rejects.toThrow();
  } finally {
    await worker.terminate();
    c.shared?.port.close();
  }
});
