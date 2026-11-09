// [EXP-P2B-R3] Why: establish the SQLite snapshot after reading the publication witness.
// Rejected: a newer witness joined to an older snapshot (observed false mismatch under maintenance).
import { expect, it } from "vitest";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { Worker, MessageChannel } from "node:worker_threads";
import { HostBroker } from "../src/broker.js";
import { sqliteWorker } from "../src/sqlite-worker.js";
it("a publication arriving at the witness-read boundary belongs to the following SQL snapshot", async () => {
  const dir = path.resolve(import.meta.dirname, "../../../runs/EXP-P2B", randomUUID()),
    broker = await HostBroker.open({
      dir,
      scopeKey: "witness-race",
      requireFullFsync: false,
      autoApply: false,
      minFreeBytes: 5 * 1024 ** 3,
    });
  const race = new SharedArrayBuffer(4),
    state = new Int32Array(race);
  const hook = `const originalRead=fs.readFileSync;fs.readFileSync=(file,...args)=>{if(String(file).endsWith('/ACKED')&&Atomics.compareExchange(new Int32Array(workerData.race),0,1,2)===1){parentPort.postMessage({race:true});Atomics.wait(new Int32Array(workerData.race),0,2,5000);}return originalRead(file,...args);};`;
  const worker = new Worker(
    sqliteWorker.replace("const fs = require('node:fs');", "const fs = require('node:fs');" + hook),
    {
      eval: true,
      execArgv: [],
      workerData: {
        file: broker.segmentPath,
        role: "reader",
        seed: 0,
        driver: createRequire(import.meta.url).resolve("better-sqlite3"),
        gateBuffer: new SharedArrayBuffer(12),
        race,
      },
    },
  );
  const request = <T>(op: string) =>
    new Promise<T>((resolve, reject) => {
      const { port1, port2 } = new MessageChannel();
      port1.once("message", (data) => {
        port1.close();
        if (data.error) reject(Error(data.error));
        else resolve(data.result);
      });
      worker.postMessage({ op, response: port2 }, [port2]);
    });
  const submit = (id: string) =>
    broker.submit({
      operationId: id,
      attemptId: id,
      sourceK: broker.head(),
      reads: { entities: new Set<string>(), scopeWide: false },
      claims: [],
      placeholders: [-1],
      rows: [],
      priors: new Map(),
      newIds: new Set<string>(),
    });
  try {
    await submit("first");
    await request("init");
    Atomics.store(state, 0, 1);
    const atRead = new Promise<void>((resolve) => worker.once("message", () => resolve()));
    const reading = request<{ lsn: number; position: number }>("watermark");
    await atRead;
    const next = await submit("second");
    if (next.kind !== "committed") throw Error("No receipt");
    Atomics.store(state, 0, 3);
    Atomics.notify(state, 0);
    const mark = await reading;
    expect(mark.lsn).toBe(broker.durable().lsn);
    expect(mark.position).toBe([...next.positions.values()][0]);
    await request("close");
  } finally {
    Atomics.store(state, 0, 3);
    Atomics.notify(state, 0);
    await worker.terminate();
    await broker.close();
  }
}, 15000);
