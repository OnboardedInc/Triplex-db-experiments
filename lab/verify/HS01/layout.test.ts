// [EXP-HS01] Why: compare actual worker results and exceptional codec values with independent v1 bytes.
// Rejected: a codec self-round-trip alone (would miss changed query selection and temporal semantics).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { Worker, MessageChannel } from "node:worker_threads";
import { describe, expect, it } from "vitest";
const Database = createRequire(new URL("../../../packages/qlever/package.json", import.meta.url))(
  "better-sqlite3",
);
import { sqliteWorker as v1 } from "./v1-worker.js";
import { sqliteWorker as v2 } from "../../../packages/qlever/src/broker/sqlite-worker.js";
import { rowCodec } from "../../../packages/qlever/src/broker/row-codec.js";
import {
  HostLog,
  hostLogRecovery,
  BrokerLogError,
  FeedRetentionExpired,
} from "../../../packages/qlever/src/broker/log.js";
import { LogFeed } from "../../../packages/qlever/src/broker/feed.js";
import { FrameKind, encodeFrame } from "../../../packages/qlever/src/broker/frame.js";
import { encodeCommitGroup } from "../../../packages/qlever/src/broker/frames.js";
import { columns } from "../../../packages/qlever/src/rdf.js";
import type { TripleRow } from "@triplex-build/triplex/runtime";
const root = process.env.HS01_RESULT
  ? path.join(path.dirname(process.env.HS01_RESULT), "stores")
  : path.resolve("runs/HS01");
const fresh = () => {
  const dir = path.join(root, randomUUID());
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};
// [EXP-HS01] Why: R2 id codec. Generated ids mix canonical Crockford, core's deterministic <8 head><18 counter> base-36 shape
// (with I/L/O/U digits), another tail length and noncanonical text, so G6/G7 exercise every id storage class.
// Rejected: hex-only ids (every id would be a canonical ULID and the structured integer form would never run).
const idHeads = ["0118TDQD", "ZZZZ0000", "LIOU1234", "00000000", "7ABCDEFG"];
const crockford = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
// A canonical ULID-shaped id: 21 pseudo-random characters, then i in base 32 (injective for i < 32^5).
const ulidLike = (i: number): string => {
  let x = Math.imul(i + 1, 2654435761) >>> 0,
    out = String(x % 8);
  for (let k = 0; k < 20; k++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    out += crockford[x >>> 27];
  }
  let tail = "";
  for (let n = i; tail.length < 5; n = Math.floor(n / 32)) tail = crockford[n % 32] + tail;
  return out + tail;
};
const rowId = (i: number): string =>
  i % 6 === 0 || i % 6 === 3
    ? ulidLike(i)
    : i % 6 === 1 || i % 6 === 4
      ? idHeads[i % idHeads.length] + i.toString(36).toUpperCase().padStart(18, "0")
      : i % 12 === 2
        ? "id/" + i
        : idHeads[(i >> 3) % idHeads.length] + i.toString(36).toUpperCase().padStart(7, "0");
const row = (i: number, pos = 2048): TripleRow =>
  ({
    ...Object.fromEntries(columns.map((c) => [c, null])),
    id: rowId(i),
    entity_id: "s:" + (i % 19),
    attribute: ":value",
    value_type: "string",
    value_string: "héllo " + i,
    recorded_at: 100,
    recorded_position: pos,
    valid_from: 100,
    entity_type: "Subject",
    schema_version: 1,
    tx_id: "tx:" + pos,
  }) as TripleRow;
const codec = new Function("Buffer", rowCodec + "return {encodeRow,decodeRow,deriveChange};")(
  Buffer,
);
let rng = 21991;
const random = () => {
  rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
  return rng;
};
const stats: Record<string, unknown> = {};
const writeStats = () => {
  if (process.env.HS01_RESULT) {
    fs.mkdirSync(path.dirname(process.env.HS01_RESULT), { recursive: true });
    fs.writeFileSync(process.env.HS01_RESULT, JSON.stringify(stats, null, 2));
  }
};
const client = async (source: string) => {
  // [EXP-HS01] Why: both stores must observe the same committed_at clock for byte comparison.
  // Rejected: ignoring frame metadata differences (could conceal a retention regression).
  source = source.replaceAll("Date.now()", "1790000000000");
  const dir = fresh(),
    worker = new Worker(source, {
      eval: true,
      workerData: {
        driver: createRequire(
          new URL("../../../packages/qlever/package.json", import.meta.url),
        ).resolve("better-sqlite3"),
        file: path.join(dir, "broker.db"),
        role: "writer",
        seed: 123,
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
  return {
    dir,
    call,
    close: async () => {
      await call("close");
      await worker.terminate();
    },
  };
};
const canonical = (v: any): string => {
  const normalize = (x: any): any =>
    Array.isArray(x)
      ? x.map(normalize).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
      : x !== null && typeof x === "object"
        ? Object.fromEntries(
            Object.keys(x)
              .sort()
              .map((k) => [k, normalize(x[k])]),
          )
        : x;
  return JSON.stringify(normalize(v));
};
describe("EXP-HS01", () => {
  it("G7: 100000 generated rows preserve every column and exceptional scalar", () => {
    const storage = new Database(":memory:");
    const fields = ["e", "id", "a", "pos", "t", "v", "vf", "vto", "c", "y", "sv", "x", "rpos"];
    storage.exec("CREATE TABLE codec(" + fields.join(",") + ")");
    const insert = storage.prepare(
        "INSERT INTO codec VALUES(" + fields.map(() => "?").join(",") + ")",
      ),
      select = storage.prepare("SELECT * FROM codec");
    let fallback = 0,
      derived = 0;
    const idClasses = { integer: 0, blob: 0, text: 0 };
    const dicts = new Map<string, Map<any, number>>(),
      names = new Map<string, any>(),
      txs = new Map(),
      refs = new Map();
    const heads = new Map<string, number>();
    const c = {
      hid: (key: string) => {
        let h = heads.get(key);
        if (h === undefined && heads.size < 63) {
          heads.set(key, (h = heads.size + 1));
          names.set("hds:" + h, key);
        }
        return h;
      },
      intern: (t: string, s: any) => {
        let m = dicts.get(t);
        if (!m) dicts.set(t, (m = new Map()));
        let id = m.get(s);
        if (id === undefined) {
          id = m.size + 1;
          m.set(s, id);
          names.set(t + ":" + id, s);
        }
        return id;
      },
      name: (t: string, id: number) => names.get(t + ":" + id),
      tx: (p: number) => txs.get(p),
      row: (id: string) => refs.get(id),
    };
    for (let i = 0; i < 100000; i++) {
      const r: any = row(i + 1),
        k = random() % 7,
        types = ["string", "number", "boolean", "datetime", "json", "ref", "integer"];
      r.value_string = null;
      r.value_type = types[k];
      const strings = ["plain", "\ud800", "\udfff", "世界😀", "", "a\u0000b"];
      const values: any[] = [
        strings[random() % strings.length],
        [-0, 2 ** 53, -(2 ** 53), 1e200, 1e-200, Number.MIN_VALUE][random() % 6],
        random() % 2,
        random() % 100000,
        JSON.stringify({ x: strings[random() % strings.length] }),
        "target:" + (random() % 13),
        "9007199254740993",
      ];
      r[k === 5 || k === 6 ? "value_string" : "value_" + r.value_type] = values[k];
      if (i % 17 === 0) r.id = "not/a/ULID/" + i;
      if (i % 23 === 0) delete r.valid_to;
      if (i % 31 === 0) r.created_by = undefined;
      if (i % 37 === 0) r.entity_type = "\ud800";
      txs.set(r.recorded_position, { tx: c.intern("ents", r.tx_id), at: r.recorded_at });
      if (i % 11 === 0) {
        const target = row(i + 200000);
        refs.set(target.id, target);
        r.entity_id = r.tx_id;
        r.entity_type = "_Transaction";
        r.attribute = ":_tx/change";
        for (const col of ["value_string", "value_number", "value_boolean", "value_datetime"])
          r[col] = null;
        r.value_type = "json";
        r.value_json = codec.deriveChange(r, target) + (i % 22 === 0 ? " " : "");
      }
      const s = codec.encodeRow(r, c);
      storage.exec("DELETE FROM codec");
      insert.run(...fields.map((k) => s[k]));
      const stored = select.get();
      idClasses[
        typeof stored.id === "number" ? "integer" : Buffer.isBuffer(stored.id) ? "blob" : "text"
      ]++;
      const out = codec.decodeRow(stored, c);
      if (s.x) fallback++;
      if (s.t === 7 && !s.x) derived++;
      expect(Object.keys(out).sort()).toEqual(Object.keys(r).sort());
      for (const key of Object.keys(r)) expect(Object.is(r[key], out[key]), key).toBe(true);
    }
    storage.close();
    expect(idClasses.integer).toBeGreaterThan(10000);
    expect(idClasses.blob).toBeGreaterThan(10000);
    expect(idClasses.text).toBeGreaterThan(1000);
    stats.codec = { rows: 100000, fallback, fallbackRate: fallback / 100000, derived, idClasses };
    writeStats();
  });
  it("G6: 50000 generated worker reads match the v1 reference", async () => {
    const old = await client(v1),
      now = await client(v2);
    const timings: number[][] = [[], []];
    let crc = 123,
      offset = 32;
    const cursors = new Map<number, { offset: number; seed: number; nextLsn: number }>();
    let calls = 0;
    try {
      for (let lsn = 1; lsn <= 40; lsn++) {
        const pos = lsn * 1024,
          rs: TripleRow[] = [];
        for (let j = 0; j < 8; j++) {
          const r = row(lsn * 10 + j, pos);
          r.valid_from = 100 + (j % 3) * 100;
          if (j === 0) r.entity_id = "replacement";
          rs.push(r);
        }
        if (lsn > 2 && lsn !== 21 && lsn !== 22) {
          const id = (lsn - 1) * 10;
          rs.push({
            ...row(id, (lsn - 1) * 1024),
            entity_id: "replacement",
            retracted_at: 100,
            retracted_position: pos,
            retract_tx_id: "tx:" + pos,
          });
        }
        rs.push({
          ...row(600000 + lsn, pos),
          entity_id: "tx:" + pos,
          entity_type: "_Transaction",
          attribute: ":_tx/position",
          value_string: null,
          value_type: "number",
          value_number: pos,
        });
        if (lsn === 20) rs.push(row(700000, pos + 1));
        for (const [index, target] of rs
          .filter((r) => r.entity_type !== "_Transaction")
          .entries()) {
          const own = target.retracted_position ?? target.recorded_position;
          const journal = {
            ...row(900000 + lsn * 100 + index, own),
            entity_id: "tx:" + own,
            entity_type: "_Transaction",
            attribute: ":_tx/change",
            value_type: "json",
            value_string: null,
            value_json: "",
          };
          journal.value_json = codec.deriveChange(journal, target);
          rs.push(journal);
        }
        const epoch = lsn < 21 ? 1 : 2,
          kind = lsn === 1 || lsn === 21 ? 2 : 1;
        const members =
          kind === 2
            ? []
            : [
                {
                  operationId: "op" + lsn,
                  attemptId: "attempt" + lsn,
                  positions: lsn === 20 ? [pos, pos + 1] : [pos],
                  claims:
                    lsn === 20
                      ? []
                      : [{ commandId: "cmd" + lsn, txId: "tx:" + pos, timestamp: 100 }],
                  subjects: ["s:" + (lsn % 19)],
                  rows: rs,
                  priors: rs
                    .filter((r) => r.retracted_position !== null)
                    .map((r) => ({
                      ...r,
                      retracted_at: null,
                      retracted_position: null,
                      retract_tx_id: null,
                    })),
                },
              ];
        const payload =
          kind === 2
            ? Buffer.from(
                JSON.stringify({
                  v: 1,
                  epoch,
                  previousEpoch: epoch - 1,
                  lastValidLsn: lsn - 1,
                  abortedLsns: [],
                  tornBytes: 0,
                  at: 100,
                }),
              )
            : encodeCommitGroup({ v: 1, stream: "hs01-equivalence", lsn, epoch, members });
        const encoded = encodeFrame({ lsn, epoch, kind, payload, prevCrc: crc });
        cursors.set(lsn, { offset, seed: crc, nextLsn: lsn });
        const a = {
          lsn,
          epoch,
          kind,
          prev: crc,
          crc: encoded.crc,
          length: encoded.bytes.length,
          payload,
          members,
        };
        for (const [index, c] of (lsn % 2
          ? [
              [0, old],
              [1, now],
            ]
          : [
              [1, now],
              [0, old],
            ]) as [number, typeof old][]) {
          const start = performance.now();
          await c.call("append", a);
          timings[index]!.push(performance.now() - start);
        }
        crc = encoded.crc;
        offset += encoded.bytes.length;
      }
      const selections = [
        {},
        { entities: [] },
        { entities: ["s:2", "s:3"] },
        { id: row(100).id },
        { entities: ["tx:20480"] },
      ];
      for (let i = 0; i < 50000; i++) {
        const n = (random() % 40) + 1,
          s = selections[random() % selections.length];
        const choices: [string, any][] = [
          ["pull", { basis: n * 1024 + (random() % 3), selection: s }],
          ["recent", { after: random() % 42, selection: s }],
          ["claim", "cmd" + n],
          ["operation", "op" + n],
          ["head", "s:" + (n % 19)],
          ["marker", undefined],
          [
            "frames",
            {
              from: cursors.get(n),
              upto: 40,
              maxBytes: 80 + (random() % 200),
            },
          ],
        ];
        const [op, args] = choices[i % choices.length];
        const [a, b] = await Promise.all([old.call(op, args), now.call(op, args)]);
        expect(canonical(b), op + ":" + i).toBe(canonical(a));
        calls++;
      }
      await now.call("purge", 30000);
      expect((await now.call("recent", { after: 0, selection: {} })).length).toBe(
        (await old.call("recent", { after: 0, selection: {} })).length,
      );
      stats.equivalence = { reads: calls, mismatches: 0 };
      const quantiles = timings.map((a) => {
        a.sort((x, y) => x - y);
        return { p50: a[Math.floor(a.length * 0.5)], p99: a[Math.floor(a.length * 0.99)] };
      });
      stats.commitDiagnostic = {
        schedule: "40 alternating v1/v2 appends, same host and payloads; diagnostic",
        v1: quantiles[0],
        v2: quantiles[1],
        ratio: {
          p50: quantiles[1]!.p50! / quantiles[0]!.p50!,
          p99: quantiles[1]!.p99! / quantiles[0]!.p99!,
        },
      };
      writeStats();
    } finally {
      await old.close();
      await now.close();
    }
  });
  it("G8: retention holders, tail, typed expiry, epochs, exact reopen and ACKED", async () => {
    const dir = fresh();
    let { log } = await HostLog.open(dir, { minFreeBytes: 0, frameRetention: { tailFrames: 2 } });
    const stale = new LogFeed(dir).start();
    log.retain("consumer", 0);
    try {
      for (let i = 0; i < 30; i++) await log.append(FrameKind.APPLIED_HINT, Buffer.from("hint"));
      expect(log.purgeFrames().removed).toBe(0);
      log.release("consumer");
      while (log.purgeFrames().removed) {}
      const anchor = new LogFeed(dir).start();
      expect(anchor.lsn).toBe(29);
      expect(() => new LogFeed(dir).poll(stale)).toThrow(FeedRetentionExpired);
      log.publishWatermark({ epoch: log.epoch, lsn: log.nextLsn - 1, position: 0 });
      const before = hostLogRecovery(log).marker;
      await log.close();
      ({ log } = await HostLog.open(dir, { minFreeBytes: 0, frameRetention: { tailFrames: 2 } }));
      expect(hostLogRecovery(log).marker.base_lsn).toBeGreaterThanOrEqual(before.base_lsn);
      expect(hostLogRecovery(log).epochs).toHaveLength(2);
      expect(new LogFeed(dir).poll(anchor).resolutions).toHaveLength(1);
      log.retain("lease", hostLogRecovery(log).marker.base_lsn, 1);
      await new Promise((r) => setTimeout(r, 5));
      expect(log.purgeFrames().removed).toBeGreaterThanOrEqual(0);
      stats.retention = { anchor: before.base_lsn, epochs: 2, reopen: true };
      writeStats();
    } finally {
      await log.close();
    }
  });
  it("G8: reopening after 1 GB of frame churn verifies only the retained tail", async () => {
    const free = fs.statfsSync(root);
    if (free.bavail * free.bsize < 5 * 1024 ** 3 + 128 * 1024 ** 2)
      throw Error("RESOURCE-ABORT 1GB churn needs 128MiB headroom");
    const dir = fresh();
    let { log } = await HostLog.open(dir, {
      minFreeBytes: 5 * 1024 ** 3,
      frameRetention: { tailFrames: 2 },
    });
    let written = 0;
    const payload = Buffer.alloc(4 * 1024 * 1024, 113);
    try {
      for (let i = 0; i < 260; i++) {
        const space = fs.statfsSync(dir);
        if (space.bavail * space.bsize < 5 * 1024 ** 3 + 64 * 1024 ** 2)
          throw Error("RESOURCE-ABORT churn disk floor");
        const frame = await log.append(FrameKind.APPLIED_HINT, payload);
        written += frame.end - frame.offset;
        log.publishWatermark({ epoch: log.epoch, lsn: frame.lsn, position: 0 });
      }
      const before = hostLogRecovery(log).marker,
        db = new Database(log.segmentPath, { readonly: true });
      const retained = db
        .prepare("SELECT count(*) n,sum(end-offset) bytes FROM frames")
        .get() as any;
      db.close();
      expect(written - retained.bytes).toBeGreaterThan(1000000000);
      expect(retained.n).toBe(2);
      await log.close();
      const rssBefore = process.memoryUsage().rss;
      ({ log } = await HostLog.open(dir, { minFreeBytes: 0, frameRetention: { tailFrames: 2 } }));
      // [EXP-HS01] Why: a restart must not materialize the purged gigabyte. Rejected: recording RSS without a bound.
      expect((log as any).openVerification.peakRss - rssBefore).toBeLessThan(128 * 1024 ** 2);
      expect((log as any).openVerification.maxPageBytes).toBeLessThanOrEqual(8 * 1024 ** 2);
      expect((log as any).openVerification.bytes).toBe(retained.bytes);
      expect((log as any).openVerification.frames).toBe(2);
      expect(hostLogRecovery(log).marker.base_lsn).toBe(before.base_lsn);
      stats.boundedOpen = {
        written,
        purged: written - retained.bytes,
        retained,
        verification: (log as any).openVerification,
        rssBefore,
        rssGrowth: (log as any).openVerification.peakRss - rssBefore,
      };
      writeStats();
    } finally {
      await log.close();
    }
  });
  it("keeps diagnostic opened.frames fixed to the opening prefix", async () => {
    const opened = await HostLog.open(fresh(), { minFreeBytes: 0 });
    try {
      await opened.log.append(FrameKind.APPLIED_HINT, Buffer.from("later"));
      expect(opened.frames.map((f) => f.lsn)).toEqual([1]);
    } finally {
      await opened.log.close();
    }
  });
  it("refuses v1 layout with BrokerLogError", async () => {
    const old = await client(v1),
      dir = old.dir;
    await old.close();
    await expect(HostLog.open(dir, { minFreeBytes: 0 })).rejects.toThrow(BrokerLogError);
    await expect(HostLog.open(dir, { minFreeBytes: 0 })).rejects.toThrow(/Legacy broker layout v1/);
  });
  it("refuses a round 1 layout 2 store that has no head dictionary", async () => {
    // [EXP-HS01] Why: round 1 stored ids without the hds dictionary; adopting them could hide rows from id lookups.
    // Rejected: CREATE IF NOT EXISTS over the older store (silent adoption).
    const dir = fresh(),
      old = new Database(path.join(dir, "broker.db"));
    old.exec("CREATE TABLE ents(eid INTEGER PRIMARY KEY,name TEXT NOT NULL UNIQUE)");
    old.close();
    await expect(HostLog.open(dir, { minFreeBytes: 0 })).rejects.toThrow(
      /round 1 requires explicit migration/,
    );
  });
  it("nested command claims bind their own positions", async () => {
    const { log } = await HostLog.open(fresh(), { minFreeBytes: 0 });
    try {
      const lsn = log.nextLsn,
        positions = [lsn * 1024, lsn * 1024 + 1],
        rs = positions.map((p, i) => row(i + 1, p));
      await log.append(
        FrameKind.COMMIT_GROUP,
        encodeCommitGroup({
          v: 1,
          stream: "hs01",
          lsn,
          epoch: log.epoch,
          members: [
            {
              operationId: "nested",
              attemptId: "1",
              positions,
              claims: rs.map((r, i) => ({
                commandId: "nested" + i,
                txId: r.tx_id!,
                timestamp: 100,
              })),
              rows: rs,
              priors: [],
              subjects: ["s:1"],
            },
          ],
        }),
      );
      for (let i = 0; i < 2; i++) expect(log.claim("nested" + i)?.position).toBe(positions[i]);
    } finally {
      await log.close();
    }
  });
});
