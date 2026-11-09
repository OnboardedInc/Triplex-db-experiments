// [EXP-HS01-R3] Why: round 3 regressions. (1) CX-VHS01 R2-1: a bare numeric purgeFrames request is the frame-only policy with a zero byte
// minimum. (2) The entity dictionary no longer has a unique name index: lookups go through a verified 32-bit hash, including real
// collisions. (3) Integral numbers bind as INTEGER and every value reads back with Object.is equality, at the extremes. (4) A round 2 layout
// store is refused with a typed error and left unchanged. Rejected: asserting only on the codec (the worker owns binding and lookup).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { Worker, MessageChannel } from "node:worker_threads";
import { describe, expect, it } from "vitest";
const req = createRequire(new URL("../../../packages/qlever/package.json", import.meta.url));
const Database = req("better-sqlite3");
import { sqliteWorker as r2 } from "./v2-worker.js";
import { sqliteWorker as r3 } from "../../../packages/qlever/src/broker/sqlite-worker.js";
import { rowCodec } from "../../../packages/qlever/src/broker/row-codec.js";
import {
  HostLog,
  BrokerLogError,
  hostLogRecovery,
} from "../../../packages/qlever/src/broker/log.js";
import { FrameKind, encodeFrame } from "../../../packages/qlever/src/broker/frame.js";
import { encodeCommitGroup } from "../../../packages/qlever/src/broker/frames.js";
import { columns } from "../../../packages/qlever/src/rdf.js";

const root = process.env.HS01_RESULT
  ? path.join(path.dirname(process.env.HS01_RESULT), "stores")
  : path.resolve("runs/HS01");
const stats: Record<string, unknown> = {};
const writeStats = () => {
  if (process.env.HS01_RESULT) {
    const file = path.join(path.dirname(process.env.HS01_RESULT), "round3-measurements.json");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(stats, null, 2));
  }
};
const fresh = () => {
  const dir = path.join(root, "r3-" + randomUUID());
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};
const blank = () => Object.fromEntries(columns.map((c) => [c, null]));
const raw = async (source: string, dir = fresh()) => {
  const worker = new Worker(source.replaceAll("Date.now()", "1790000000000"), {
    eval: true,
    workerData: {
      driver: req.resolve("better-sqlite3"),
      file: path.join(dir, "broker.db"),
      role: "writer",
      seed: 12345,
      gateBuffer: new SharedArrayBuffer(12),
    },
  });
  const call = (op: string, args?: unknown): Promise<any> =>
    new Promise((resolve, reject) => {
      const { port1, port2 } = new MessageChannel();
      port1.once("message", (x) => {
        port1.close();
        if (x.error) reject(Error(x.error));
        else resolve(x.result);
      });
      worker.postMessage({ op, args, response: port2 }, [port2]);
    });
  await call("init");
  let crc = 12345,
    lsn = 0;
  const append = async (kind: number, payload: Buffer, members: any[] = []) => {
    lsn++;
    const f = encodeFrame({ lsn, epoch: 1, kind, payload, prevCrc: crc });
    const r = await call("append", {
      lsn,
      epoch: 1,
      kind,
      payload,
      members,
      prev: crc,
      crc: f.crc,
      length: f.bytes.length,
    });
    crc = f.crc;
    return r;
  };
  return {
    dir,
    call,
    append,
    close: async () => {
      await call("close");
      await worker.terminate();
    },
  };
};
type Raw = Awaited<ReturnType<typeof raw>>;
const epoch = (w: Raw) =>
  w.append(2, Buffer.from(JSON.stringify({ epoch: 1, previousEpoch: 0, abortedLsns: [] })));

describe("EXP-HS01 round 3", () => {
  it("R2-1: a bare number in purgeFrames equals the normalized frame-only policy (0, 1, 2, Infinity)", async () => {
    const scenarios: { name: string; frames: number; ackAt: number; holder?: number }[] = [
      { name: "ack at the head", frames: 12, ackAt: 12 },
      { name: "slow holder", frames: 20, ackAt: 20, holder: 5 },
      { name: "ack behind the head", frames: 20, ackAt: 10 },
    ];
    const observed: unknown[] = [];
    for (const scenario of scenarios)
      for (const n of [0, 1, 2, Infinity]) {
        const run = async (request: unknown) => {
          const w = await raw(r3);
          try {
            for (let i = 0; i < scenario.frames; i++) {
              await w.append(4, Buffer.alloc(100));
              if (i + 1 === scenario.ackAt)
                await w.call("ack", { lsn: i + 1, epoch: 1, position: 0 });
            }
            if (scenario.holder !== undefined)
              await w.call("retain", { holder: "slow", lsn: scenario.holder });
            const calls = [];
            for (let i = 0; i < 4; i++) calls.push(await w.call("purgeFrames", request));
            return { calls, marker: await w.call("anchor") };
          } finally {
            await w.close();
          }
        };
        const numeric = await run(n),
          object = await run({ frames: n, bytes: 0 });
        expect(numeric.marker.base_lsn, scenario.name + " n=" + n).toBe(object.marker.base_lsn);
        expect(numeric.calls, scenario.name + " n=" + n).toEqual(object.calls);
        // Finite policies really retire frames; 0 and 1 reach the protected frame (ACKED or holder), Infinity keeps everything.
        if (n !== Infinity)
          expect(numeric.marker.base_lsn, scenario.name + " n=" + n).toBeGreaterThan(0);
        else expect(numeric.marker.base_lsn).toBe(0);
        if (scenario.holder !== undefined)
          expect(numeric.marker.base_lsn).toBeLessThanOrEqual(scenario.holder);
        expect(numeric.marker.base_lsn).toBeLessThanOrEqual(scenario.ackAt - 1);
        observed.push({ scenario: scenario.name, n, anchor: numeric.marker.base_lsn });
      }
    // The public path: HostLog.open({frameRetention:{tailFrames:n}}) retires the same prefix as the numeric worker request n.
    for (const n of [0, 1, 2, 5]) {
      const { log } = await HostLog.open(fresh(), {
        minFreeBytes: 0,
        frameRetention: { tailFrames: n },
      });
      const w = await raw(r3);
      try {
        await epoch(w);
        for (let i = 0; i < 15; i++) {
          await log.append(FrameKind.APPLIED_HINT, Buffer.alloc(100));
          await w.append(4, Buffer.alloc(100));
        }
        log.publishWatermark({ epoch: log.epoch, lsn: log.nextLsn - 1, position: 0 });
        await w.call("ack", { lsn: 16, epoch: 1, position: 0 });
        while (log.purgeFrames().removed) {}
        while ((await w.call("purgeFrames", n)).removed) {}
        const hostAnchor = hostLogRecovery(log).marker.base_lsn,
          workerAnchor = (await w.call("anchor")).base_lsn;
        expect(hostAnchor, "tailFrames " + n).toBe(workerAnchor);
        expect(workerAnchor).toBeGreaterThan(0);
        observed.push({ tailFrames: n, anchor: workerAnchor });
      } finally {
        await log.close();
        await w.close();
      }
    }
    stats.numericPurge = observed;
    writeStats();
  });

  it("entity dictionary: names that share a 32-bit hash keep distinct ids, rows and lookups; ids equal round 2", async () => {
    // Find a real FNV-1a collision (birthday search over 400,000 names; the same hash the worker uses).
    const hash = (s: string) => {
      let h = 0x811c9dc5;
      for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
      return h | 0;
    };
    const seen = new Map<number, string>(),
      pairs: [string, string][] = [];
    for (let i = 0; pairs.length < 4 && i < 2_000_000; i++) {
      const name = "pl:s" + i + "/ans:" + (i % 97);
      const h = hash(name),
        other = seen.get(h);
      if (other !== undefined) pairs.push([other, name]);
      else seen.set(h, name);
    }
    expect(pairs.length, "collision search").toBeGreaterThanOrEqual(2);
    const names = [...pairs.flat(), "plain", "\ud800lone", "世界😀", ""];
    const rows = names.map((entity, i) => ({
      ...blank(),
      id: "ID" + i,
      entity_id: entity,
      attribute: ":a",
      value_type: "string",
      value_string: "value of " + entity,
      recorded_at: 100,
      recorded_position: 1024 * 2,
      valid_from: 100,
      tx_id: "tx:a",
      schema_version: 1,
      entity_type: "Subject",
    }));
    const member = {
      operationId: "op",
      attemptId: "op",
      positions: [2048],
      claims: [],
      rows,
      priors: [],
      subjects: ["x"],
    };
    const answers: string[] = [];
    for (const source of [r2, r3]) {
      const w = await raw(source);
      try {
        await epoch(w);
        await w.append(
          1,
          encodeCommitGroup({ v: 1, stream: "r3", lsn: 2, epoch: 1, members: [member] as any }),
          [member],
        );
        const out: unknown[] = [];
        for (const entity of names)
          out.push(await w.call("pull", { basis: 2048, selection: { entities: [entity] } }));
        out.push(await w.call("pull", { basis: 2048, selection: { entities: names } }));
        out.push(await w.call("pull", { basis: 2048, selection: {} }));
        // Appending the same names again must reuse their ids, never allocate a second one (second member, new positions).
        const again = {
          ...member,
          operationId: "op2",
          attemptId: "op2",
          positions: [3072],
          rows: rows.map((r, i) => ({
            ...r,
            id: "AGAIN" + i,
            recorded_position: 3072,
            tx_id: "tx:b",
          })),
        };
        await w.append(
          1,
          encodeCommitGroup({ v: 1, stream: "r3", lsn: 3, epoch: 1, members: [again] as any }),
          [again],
        );
        out.push(await w.call("pull", { basis: 3072, selection: { entities: names.slice(0, 3) } }));
        if (source === r3) {
          const db = new Database(path.join(w.dir, "broker.db"), { readonly: true });
          const colliding = db
            .prepare("SELECT h,count(*) n FROM entkey GROUP BY h HAVING n>1")
            .all() as any[];
          const dup = db.prepare("SELECT name,count(*) n FROM ents GROUP BY name HAVING n>1").all();
          const index = db.prepare("SELECT name FROM sqlite_master WHERE tbl_name='ents'").all();
          db.close();
          expect(colliding.length, "stored colliding hash keys").toBeGreaterThanOrEqual(2);
          expect(dup).toEqual([]);
          expect(index, "ents has no name index").toEqual([{ name: "ents" }]);
        }
        answers.push(JSON.stringify(out));
      } finally {
        await w.close();
      }
    }
    expect(answers[1]).toBe(answers[0]);
    stats.entityDictionary = { collisionPairs: pairs.length, names: names.length };
    writeStats();
  });

  it("numeric values: integral numbers bind as INTEGER, every value reads back with Object.is equality", async () => {
    const values = [
      0,
      1,
      -1,
      127,
      128,
      32768,
      2 ** 31,
      2 ** 40,
      2 ** 53 - 1,
      2 ** 53,
      2 ** 53 + 2,
      -(2 ** 53),
      2 ** 62,
      2 ** 63 - 1024, // largest double below 2^63
      -(2 ** 63), // smallest int64
      2 ** 63, // first double that is not an int64
      -(2 ** 63) - 2048,
      1e300,
      Number.MAX_VALUE,
      -Number.MAX_VALUE,
      Number.MIN_VALUE,
      5e-324,
      Number.EPSILON,
      0.1,
      -0.5,
      1.5,
      2 ** 53 + 1 /* rounds to 2^53 */,
      Infinity,
      -Infinity,
      NaN,
      -0,
    ];
    const kinds = ["number", "datetime", "boolean", "ref"] as const;
    const rows: any[] = [];
    let n = 0;
    for (const kind of kinds)
      for (const v of values) {
        const row: any = {
          ...blank(),
          id: "N" + String(n).padStart(8, "0"),
          entity_id: "num:" + (n % 5),
          attribute: ":v" + kind,
          value_type: kind,
          recorded_at: 100,
          recorded_position: 2048,
          valid_from: 100,
          tx_id: "tx:n",
          schema_version: 1,
          entity_type: "Subject",
        };
        if (kind === "ref") row.value_string = "num:" + (n % 5);
        else row["value_" + kind] = kind === "boolean" ? n % 2 : v;
        rows.push(row);
        n++;
      }
    const member = {
      operationId: "n",
      attemptId: "n",
      positions: [2048],
      claims: [],
      rows,
      priors: [],
      subjects: ["x"],
    };
    const results: any[] = [];
    for (const source of [r2, r3]) {
      const w = await raw(source);
      try {
        await epoch(w);
        await w.append(
          1,
          encodeCommitGroup({ v: 1, stream: "r3", lsn: 2, epoch: 1, members: [member] as any }),
          [member],
        );
        const pulled = await w.call("pull", { basis: 2048, selection: {} });
        const byId = new Map(pulled.rows.map((r: any) => [r.id, r]));
        for (const row of rows) {
          const out: any = byId.get(row.id);
          expect(out, row.id).toBeDefined();
          for (const key of Object.keys(row))
            expect(
              Object.is(out[key], row[key]),
              `${row.id} ${key}: ${String(row[key])} vs ${String(out[key])}`,
            ).toBe(true);
        }
        if (source === r3) {
          const db = new Database(path.join(w.dir, "broker.db"), { readonly: true });
          const classes = db
            .prepare(
              "SELECT t,typeof(v) kind,count(*) n FROM facts GROUP BY t,kind ORDER BY t,kind",
            )
            .all();
          // Every stored value of an integral number within int64 is an INTEGER; fractions, huge doubles and non-finite values are not.
          const bad = db
            .prepare(
              "SELECT x FROM facts WHERE x IS NULL AND t IN (1,3) AND typeof(v)='real' AND v=cast(v as integer) AND abs(v)<9.2e18",
            )
            .all();
          const refs = db
            .prepare("SELECT count(*) n FROM facts WHERE t=5 AND typeof(v)!='integer'")
            .get() as any;
          const bools = db
            .prepare("SELECT count(*) n FROM facts WHERE t=2 AND typeof(v)!='integer'")
            .get() as any;
          db.close();
          expect(bad).toEqual([]);
          expect(refs.n).toBe(0);
          expect(bools.n).toBe(0);
          results.push(classes);
        }
        // The same reads from round 2 and round 3 are identical, including every extreme.
        results.push(
          JSON.stringify(
            pulled.rows.map((r: any) => [
              r.id,
              r.value_number,
              r.value_datetime,
              r.value_boolean,
              r.value_string,
            ]),
          ),
        );
      } finally {
        await w.close();
      }
    }
    expect(results[results.length - 1]).toBe(results[0]);
    stats.numericBinding = {
      values: values.length,
      kinds: kinds.length,
      storageClasses: results[1],
    };
    writeStats();
  });

  it("a round 2 layout store is refused with a typed error and is left unchanged", async () => {
    const old = await raw(r2),
      dir = old.dir;
    await epoch(old);
    await old.close();
    const names = () => {
      const db = new Database(path.join(dir, "broker.db"), { readonly: true });
      const rows = db.prepare("SELECT type,name FROM sqlite_master ORDER BY name").all();
      db.close();
      return JSON.stringify(rows);
    };
    const before = names();
    await expect(HostLog.open(dir, { minFreeBytes: 0 })).rejects.toThrow(BrokerLogError);
    await expect(HostLog.open(dir, { minFreeBytes: 0 })).rejects.toThrow(
      /Legacy broker layout v2 round 2 requires explicit migration/,
    );
    expect(names()).toBe(before);
    expect(before).not.toContain("entkey");
    expect(before).not.toContain("jrec");
  });

  it("the default store has no journal records and an empty record table; the option is opt-in", async () => {
    const { log } = await HostLog.open(fresh(), { minFreeBytes: 0 });
    try {
      const db = new Database(log.segmentPath, { readonly: true });
      const jrec = (db.prepare("SELECT count(*) n FROM jrec").get() as any).n;
      const txsTx = db.prepare("SELECT 1 FROM sqlite_master WHERE name='txs_tx'").get();
      db.close();
      expect(jrec).toBe(0);
      expect(txsTx).toBeUndefined();
    } finally {
      await log.close();
    }
    const opted = await HostLog.open(fresh(), { minFreeBytes: 0, journalRecords: true });
    try {
      const db = new Database(opted.log.segmentPath, { readonly: true });
      const txsTx = db.prepare("SELECT 1 FROM sqlite_master WHERE name='txs_tx'").get();
      db.close();
      expect(txsTx).toBeDefined();
    } finally {
      await opted.log.close();
    }
    void rowCodec;
  });
});
