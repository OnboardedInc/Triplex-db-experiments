// @ts-nocheck -- [EXP-CHECKJS-R2] runtime-populated records, option bags, or branch-specific union members. Binding errors remain checked by lab/bin/checkjs.mjs.
// [EXP-P2X2] Why: reuse X05's worker-thread, four-query 40-entity pinned pull and cap 16.
// Rejected: readers on the writer event loop (confounds client delay and server contention).
// The R16-shaped read domain is immutable: this is contention load, not full writer-linked P1 acceptance.
import { Worker } from "node:worker_threads";
import path from "node:path";
import { ROOT, sha, save } from "./observe.mjs";
import {
  connect,
  txt,
  i8,
  sid,
  ref,
  intVal,
  strVal,
  parseMicros,
  encodeSnapshotToken,
  microsIso,
  absNow,
} from "../EXP-X05-xtdb-read-follower/common.mjs";
export async function seedReaders() {
  const c = connect("postgres://xtdb:xtdb@127.0.0.1:5471/xtdb");
  const table = "p2x2_read_domain",
    n = 10000;
  try {
    let exists = false;
    try {
      exists = Number((await c.unsafe(`SELECT COUNT(*) AS n FROM ${table}`))[0]?.n) === n;
    } catch {}
    if (!exists) {
      const cols = [
        "_id",
        ...Array.from({ length: 16 }, (_, k) => `a${k}`),
        "r0",
        "r1",
        "r2",
        "r3",
        "pos",
      ];
      const sql = `INSERT INTO ${table} (${cols.join(",")}) VALUES ${Array.from({ length: 200 }, (_, r) => `(${cols.map((_, k) => `$${r * cols.length + k + 1}`).join(",")})`).join(",")}`;
      for (let b = 0; b < n; b += 200) {
        const params = [];
        for (let i = b; i < b + 200; i++) {
          params.push(txt(c, sid(i)));
          for (let k = 0; k < 8; k++) params.push(i8(c, intVal(i, 0, k)));
          for (let k = 8; k < 16; k++) params.push(txt(c, strVal(i, 0, k)));
          for (let k = 0; k < 4; k++) params.push(txt(c, sid(ref(i, k, n))));
          params.push(i8(c, 0));
        }
        await c.unsafe("BEGIN READ WRITE");
        await c.unsafe(sql, params);
        await c.unsafe("COMMIT SYNC");
      }
    }
    const [r] = await c.unsafe("SHOW LATEST_SUBMITTED_TX"),
      t = parseMicros(r.system_time);
    return {
      table,
      n,
      seedBasis: {
        rid: -1,
        t: t.toString(),
        snapshotToken: encodeSnapshotToken(t),
        awaitToken: r.await_token,
        clock: microsIso(t),
      },
    };
  } finally {
    await c.end({ timeout: 5 });
  }
}
export async function readers(count, seed, dir) {
  if (!count)
    return {
      start() {},
      receipt() {},
      async done() {
        return [];
      },
      async close() {},
    };
  const inputs = ["reader-worker.mjs", "common.mjs"].map((f) =>
    path.join(ROOT, "lab/experiments/EXP-X05-xtdb-read-follower", f),
  );
  save(path.join(dir, "reader-inputs.json"), Object.fromEntries(inputs.map((f) => [f, sha(f)])));
  const workers = [];
  for (let w = 0; w < 4; w++) {
    const worker = new Worker(inputs[0], {
      workerData: { worker: w, subjects: 10000, seed: "EXP-P2X2-v1" },
    });
    const slot = { worker };
    workers.push(slot);
    slot.boot = new Promise((resolve, reject) => {
      slot.bootResolve = resolve;
      slot.reject = reject;
    });
    slot.ready = new Promise((resolve, reject) => {
      slot.readyResolve = resolve;
      slot.readyReject = reject;
    });
    slot.result = new Promise((resolve, reject) => {
      slot.resultResolve = resolve;
      slot.resultReject = reject;
    });
    // Mark rejections handled immediately while the driver is still offering the trace.
    slot.result.catch(() => {});
    slot.ready.catch(() => {});
    worker.on("message", (m) => {
      if (m.type === "booted") slot.bootResolve();
      if (m.type === "ready") slot.readyResolve();
      if (m.type === "result") slot.resultResolve(m.result);
      if (m.type === "error") {
        const e = new Error(m.message);
        slot.reject(e);
        slot.readyReject(e);
        slot.resultReject(e);
      }
    });
    worker.on("error", (e) => {
      slot.reject(e);
      slot.readyReject(e);
      slot.resultReject(e);
    });
  }
  try {
    await Promise.all(workers.map((w) => w.boot));
    for (const s of workers)
      s.worker.postMessage({
        type: "level",
        level: {
          name: `F8-${count}`,
          url: "postgres://xtdb:xtdb@127.0.0.1:5471/xtdb",
          table: seed.table,
          splitShare: 0,
          seedBasis: seed.seedBasis,
          trace: [],
          readers: Math.floor(count / 4),
          conns: 4,
          cap: 4,
        },
      });
    await Promise.all(workers.map((w) => w.ready));
  } catch (error) {
    await Promise.all(workers.map((w) => w.worker.terminate()));
    throw error;
  }
  return {
    start(start, end) {
      for (const s of workers) s.worker.postMessage({ type: "go", start, end });
    },
    receipt(event, result, rid) {
      const stamp = BigInt(Math.floor(result.position / 8)) + 1577836800000000n;
      const r = {
        rid,
        t: stamp.toString(),
        snapshotToken: encodeSnapshotToken(stamp),
        awaitToken: seed.seedBasis.awaitToken,
        clock: microsIso(stamp),
        ackAt: absNow(),
        subj: event.subject,
        pos: 0,
      };
      for (const s of workers) s.worker.postMessage({ type: "receipt", r });
    },
    async done() {
      return await Promise.all(workers.map((w) => w.result));
    },
    async close() {
      await Promise.all(workers.map((w) => w.worker.terminate()));
    },
  };
}
