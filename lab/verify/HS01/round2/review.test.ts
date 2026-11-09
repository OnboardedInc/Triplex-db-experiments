// [CX-VHS01-R2] Why: independent worker-level negative controls and cross-reopen id/retention witnesses. Rejected: adopting builder counters or codec-generated expected ids.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { Worker, MessageChannel } from "node:worker_threads";
import { it, expect } from "vitest";
import { sqliteWorker } from "../../../../packages/qlever/src/broker/sqlite-worker.ts";
import { rowCodec } from "../../../../packages/qlever/src/broker/row-codec.ts";
import {
  HostLog,
  BrokerLogError,
  FeedRetentionExpired,
  hostLogRecovery,
} from "../../../../packages/qlever/src/broker/log.ts";
import { LogFeed } from "../../../../packages/qlever/src/broker/feed.ts";
import { encodeFrame } from "../../../../packages/qlever/src/broker/frame.ts";
import { encodeCommitGroup } from "../../../../packages/qlever/src/broker/frames.ts";
import { columns } from "../../../../packages/qlever/src/rdf.ts";
const root = process.env.VHS01_OUT!;
if (!root) throw Error("use bound round2/run.mjs");
const req = createRequire(new URL("../../../../packages/qlever/package.json", import.meta.url)),
  driver = req.resolve("better-sqlite3"),
  Database = req("better-sqlite3");
const save = (name: string, v: any) =>
  fs.writeFileSync(path.join(root, name + ".json"), JSON.stringify(v, null, 2));
let count = 0,
  rng = 0x29be1753;
const rand = () => {
  rng ^= rng << 13;
  rng ^= rng >>> 17;
  rng ^= rng << 5;
  return rng >>> 0;
};
const fresh = (name: string) => {
  const d = path.join(root, name + "-" + count++);
  fs.mkdirSync(d);
  return d;
};
const row = (id: string, pos: number, extra: any = {}) => ({
  ...Object.fromEntries(columns.map((c) => [c, null])),
  id,
  entity_id: "hot",
  attribute: ":value",
  value_type: "string",
  value_string: "value:" + id,
  recorded_at: 1000000 + pos,
  recorded_position: pos,
  valid_from: 1000000 + pos,
  tx_id: "tx/" + pos,
  schema_version: 1,
  ...extra,
});
const member = (name: string, pos: number, rows: any[]) => ({
  operationId: name,
  attemptId: name,
  positions: [pos],
  claims: [],
  rows,
  priors: [],
  subjects: ["hot"],
});
const oldCodec = () =>
  new Function(
    execFileSync("git", ["show", "13ce4978:packages/qlever/src/broker/row-codec.ts"], {
      encoding: "utf8",
    }).replace("export const rowCodec", "const rowCodec") + "\nreturn rowCodec",
  )();
const oldWorker = () =>
  new Function(
    "rowCodec",
    execFileSync("git", ["show", "13ce4978:packages/qlever/src/broker/sqlite-worker.ts"], {
      encoding: "utf8",
    })
      .replace(/import \{ rowCodec \} from "\.\/row-codec.js";/, "")
      .replace("export const sqliteWorker", "const sqliteWorker") + "\nreturn sqliteWorker",
  )(oldCodec());
async function raw(source: string, dir = fresh("raw")) {
  const w = new Worker(source, {
    eval: true,
    workerData: {
      file: path.join(dir, "broker.db"),
      driver,
      seed: 12345,
      role: "writer",
      gateBuffer: new SharedArrayBuffer(12),
    },
  });
  const call = (op: string, args?: any): Promise<any> =>
    new Promise((resolve, reject) => {
      const { port1, port2 } = new MessageChannel();
      port1.once("message", (x) => {
        port1.close();
        if (x.error) reject(Error(x.error));
        else resolve(x.result);
      });
      w.postMessage({ op, args, response: port2 }, [port2]);
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
      await w.terminate();
    },
  };
}
it("round 1 oversized-group reproduction fails old worker and passes new progress bound", async () => {
  const observations: any[] = [];
  for (const old of [true, false]) {
    const w = await raw(old ? oldWorker() : sqliteWorker);
    try {
      await w.append(
        2,
        Buffer.from(JSON.stringify({ epoch: 1, previousEpoch: 0, abortedLsns: [] })),
      );
      const rows = Array.from({ length: 20 }, (_, j) =>
        row("large/" + j, 2048, { attribute: ":a" + j, value_string: "x".repeat(900000) }),
      );
      const ms = [member("large-operation", 2048, rows)],
        payload = encodeCommitGroup({
          v: 1,
          stream: "r2-negative-control",
          lsn: 2,
          epoch: 1,
          members: ms,
        });
      const big = await w.append(1, payload, ms);
      let last: any;
      for (let i = 0; i < 10; i++) last = await w.append(4, Buffer.from("small"));
      await w.call("ack", { lsn: last.lsn, epoch: 1, position: 2048 });
      const calls = [];
      for (let i = 0; i < 6; i++)
        calls.push(await w.call("purgeFrames", old ? 1 : { frames: 1, bytes: 0 }));
      const marker = await w.call(old ? "init" : "anchor");
      const anchor = old ? marker.marker.base_lsn : marker.base_lsn;
      observations.push({ old, frameBytes: big.end - big.offset, lsn: big.lsn, anchor, calls });
      if (old) expect(anchor).toBe(1);
      else {
        expect(anchor).toBe(11);
        for (const c of calls) expect(c.bytes <= 16 * 1024 ** 2 || c.removed === 1).toBe(true);
      }
    } finally {
      await w.close();
    }
  }
  save("oversized-negative-control", observations);
});
it("legacy numeric purge request still means a frame count", async () => {
  const w = await raw(sqliteWorker);
  try {
    let last: any;
    for (let i = 0; i < 12; i++) last = await w.append(4, Buffer.alloc(100));
    await w.call("ack", { lsn: last.lsn, epoch: 1, position: 0 });
    const numeric = await w.call("purgeFrames", 2),
      afterNumeric = await w.call("anchor");
    const object = await w.call("purgeFrames", { frames: 2, bytes: 0 }),
      afterObject = await w.call("anchor");
    save("numeric-compatibility", { numeric, afterNumeric, object, afterObject });
    expect(numeric.anchor, "numeric 2 must agree with {frames:2,bytes:0}").toBe(
      afterObject.base_lsn,
    );
  } finally {
    await w.close();
  }
});
it("byte and frame minima, holder and ACKED constraints keep the independently computed suffix", async () => {
  const results = [];
  for (const keep of [
    { frames: 0, bytes: 999 },
    { frames: 7, bytes: 999 },
    { frames: 0, bytes: 0 },
    { frames: 0, bytes: 4000 },
  ]) {
    const w = await raw(sqliteWorker),
      frames: any[] = [];
    try {
      for (let i = 0; i < 30; i++)
        frames.push(await w.append(4, Buffer.alloc(40 + ((i * 37) % 400))));
      await w.call("ack", { lsn: 30, epoch: 1, position: 0 });
      const expected =
        frames
          .filter(
            (f) =>
              f.lsn <= 30 - keep.frames && f.lsn < 30 && frames.at(-1).end - f.end >= keep.bytes,
          )
          .at(-1)?.lsn ?? 0;
      const calls = [];
      for (let i = 0; i < 4; i++) calls.push(await w.call("purgeFrames", keep));
      const marker = await w.call("anchor");
      expect(marker.base_lsn).toBe(expected);
      results.push({ keep, expected, marker, calls });
    } finally {
      await w.close();
    }
  }
  const w = await raw(sqliteWorker);
  try {
    let last: any;
    for (let i = 0; i < 20; i++) {
      last = await w.append(4, Buffer.alloc(100));
      if (i === 9) await w.call("ack", { lsn: 10, epoch: 1, position: 0 });
    }
    await w.call("retain", { holder: "slow-consumer", lsn: 5 });
    const held = await w.call("purgeFrames", { frames: 0, bytes: 0 });
    expect(held.anchor).toBe(5);
    await w.call("release", "slow-consumer");
    const ackBound = await w.call("purgeFrames", { frames: 0, bytes: 0 });
    expect(ackBound.anchor).toBe(9);
    expect(
      await w
        .call("frames", { from: { offset: 32, seed: 12345, nextLsn: 1 }, upto: 20, maxBytes: 1 })
        .catch((e) => String(e)),
    ).toContain("FEED_RETENTION_EXPIRED");
    results.push({ held, ackBound, head: last.lsn });
  } finally {
    await w.close();
  }
  save("suffix-oracle", results);
});
it("independent id corpus is injective, lookup stable and exact after SQLite, including head 64", () => {
  const codec = new Function("Buffer", rowCodec + "\nreturn {packId,unpackId}")(Buffer);
  const db = new Database(":memory:");
  db.exec("CREATE TABLE ids(id BLOB PRIMARY KEY,original BLOB NOT NULL) WITHOUT ROWID");
  const heads = new Map<string, number>(),
    names = new Map<number, string>();
  const writer = {
    hid: (k: string) => {
      if (!heads.has(k) && heads.size < 63) {
        const n = heads.size + 1;
        heads.set(k, n);
        names.set(n, k);
      }
      return heads.get(k);
    },
    name: (_: string, n: number) => names.get(n),
  };
  const reader = { hid: (k: string) => heads.get(k), name: writer.name };
  const id = (h: number, tail: bigint, width = 18) =>
    "H" +
    h.toString(36).toUpperCase().padStart(7, "0") +
    tail.toString(36).toUpperCase().padStart(width, "0");
  const corpus = Array.from({ length: 64 }, (_, i) => id(i, 1n));
  corpus.push(
    "",
    "00000000000000000000000000",
    "7ZZZZZZZZZZZZZZZZZZZZZZZZZ",
    "numeric/123",
    "123",
    "ABCDEFGH0000000001",
    "\ud800",
    "\udfff",
    "\ufffd",
    "\ud800\udfff",
    "\udfff\ud800",
    "\ud800\0",
  );
  for (let width = 1; width <= 18; width++)
    for (const v of [0n, 1n, 35n, 36n, (1n << 43n) - 1n, 1n << 43n, (1n << 43n) + 1n])
      corpus.push(id(0, v, width));
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  for (let i = 0; i < 100000; i++) {
    const kind = rand() % 4;
    if (kind === 0) corpus.push(id(rand() % 80, BigInt(rand()) * 997n + BigInt(rand() % 997)));
    if (kind === 1)
      corpus.push(
        String(rand() % 8) + Array.from({ length: 25 }, () => alphabet[rand() % 32]).join(""),
      );
    if (kind === 2)
      corpus.push(
        Array.from({ length: rand() % 40 }, () => String.fromCharCode(rand() % 65536)).join(""),
      );
    if (kind === 3) corpus.push("text/" + rand() + "/" + i);
  }
  const insert = db.prepare("INSERT INTO ids VALUES(?,?)"),
    select = db.prepare("SELECT id,original,typeof(id) kind FROM ids WHERE id=?"),
    observed = new Map<string, any>(),
    seen = new Set<string>();
  const classes: any = { integer: 0, blob: 0, text: 0 };
  for (const s of corpus) {
    const packed = codec.packId(s, writer);
    if (seen.has(s)) continue;
    seen.add(s);
    insert.run(packed, Buffer.from(s, "utf16le"));
    const r = select.get(codec.packId(s, reader));
    if (!r || r.original.toString("utf16le") !== s || codec.unpackId(r.id, reader) !== s)
      throw Error("id differs: " + JSON.stringify(s));
    classes[r.kind]++;
    observed.set(s, r.id);
  }
  expect(heads.size).toBe(63);
  expect(typeof observed.get(corpus[0])).toBe("number");
  expect(typeof observed.get(corpus[63])).toBe("string");
  for (const [s, stored] of observed) {
    const r = select.get(codec.packId(s, reader));
    expect(r.id).toEqual(stored);
    if (r.original.toString("utf16le") !== s) throw Error("lookup changed after saturation");
  }
  const scan = db
    .prepare("SELECT original FROM ids ORDER BY id")
    .all()
    .map((r: any) => r.original.toString("utf16le"))
    .sort();
  expect(scan).toEqual([...seen].sort());
  save("ids", {
    inputs: corpus.length,
    unique: seen.size,
    classes,
    headSlots: heads.size,
    slot64Class: typeof observed.get(corpus[63]),
  });
  db.close();
});
it("worker lookups, exact pinned cuts and typed feed expiry survive head saturation, byte purge and reopen", async () => {
  const dir = fresh("pin-ids");
  let { log } = await HostLog.open(dir, {
    minFreeBytes: 0,
    frameRetention: { tailFrames: 2, tailBytes: 1000 },
  });
  const stale = new LogFeed(dir).start();
  const firstId = "FIRSTOOO000000000000000001",
    ids = [
      firstId,
      ...Array.from(
        { length: 65 },
        (_, i) => "A" + i.toString(36).toUpperCase().padStart(7, "0") + "000000000000000001",
      ),
      "7ZZZZZZZZZZZZZZZZZZZZZZZZZ",
      "plain/id",
      "\ud800",
      "\ufffd",
      "\udfff",
    ];
  let pin: any,
    original: any,
    prior: any,
    position = 0;
  const expected = new Map<string, any>();
  try {
    // Negative head lookups on every reader precede its allocation and must not stay negatively cached.
    for (let i = 0; i < 8; i++) expect((await log.recentAsync(0, { id: firstId })).length).toBe(0);
    for (let i = 0; i < ids.length; i++) {
      const lsn = log.nextLsn,
        pos = lsn * 1024,
        r = row(ids[i], pos),
        rs = [r];
      if (prior) {
        const retired = {
          ...prior,
          retracted_at: r.recorded_at,
          retracted_position: pos,
          retract_tx_id: r.tx_id,
        };
        rs.unshift(retired);
        expected.set(retired.id, retired);
      }
      const f = await log.append(
        1,
        encodeCommitGroup({
          v: 1,
          stream: "pin-ids",
          lsn,
          epoch: log.epoch,
          members: [member("id-op/" + i, pos, rs)],
        }),
      );
      log.publishWatermark({ lsn: f.lsn, epoch: log.epoch, position: pos });
      if (i === 0) {
        original = r;
        pin = log.pinBasis(pos, "old-cut");
      }
      expected.set(r.id, r);
      prior = r;
      position = pos;
      log.purge(pos);
    }
    const masked = (r: any) => ({
      ...r,
      retracted_at: null,
      retracted_position: null,
      retract_tx_id: null,
    });
    const old = await log.pull(original.recorded_position, { entities: ["hot"] });
    expect(old.eligible).toBe(true);
    expect(old.rows.map(masked)).toEqual([original]);
    for (const id of ids) expect(await log.recentAsync(0, { id })).toEqual([expected.get(id)]);
    const before = hostLogRecovery(log).marker;
    expect(before.base_lsn).toBeGreaterThan(2);
    expect(() => new LogFeed(dir).poll(stale)).toThrow(FeedRetentionExpired);
    pin.release();
    await log.close();
    ({ log } = await HostLog.open(dir, { minFreeBytes: 0, frameRetention: { tailBytes: 1000 } }));
    const reopened = await log.pull(original.recorded_position, { entities: ["hot"] });
    expect(reopened.eligible).toBe(true);
    expect(reopened.rows.map(masked)).toEqual([original]);
    expect((await log.pull(position, { entities: ["hot"] })).rows.map(masked)).toEqual([prior]);
    for (const id of ids) expect(await log.recentAsync(0, { id })).toEqual([expected.get(id)]);
    const db = new Database(log.segmentPath, { readonly: true });
    const heads = db.prepare("SELECT * FROM hds ORDER BY hid").all(),
      storage = db.prepare("SELECT typeof(id) kind,count(*) n FROM history GROUP BY kind").all(),
      first = db.prepare("SELECT prev_crc,offset FROM frames ORDER BY lsn LIMIT 1").get();
    db.close();
    expect(heads.length).toBe(63);
    expect(first.prev_crc).toBe(before.base_crc);
    expect(first.offset).toBe(before.base_end);
    save("pin-ids", {
      ids: ids.length,
      basis: original.recorded_position,
      position,
      before,
      after: hostLogRecovery(log).marker,
      heads,
      storage,
    });
  } finally {
    await log.close();
  }
});
it("round 1 stores are refused with BrokerLogError without adopting another id encoding", async () => {
  const dir = fresh("legacy");
  const w = await raw(oldWorker(), dir);
  await w.close();
  let observed: any;
  try {
    const opened = await HostLog.open(dir, { minFreeBytes: 0 });
    await opened.log.close();
  } catch (e) {
    observed = e;
  }
  expect(observed).toBeInstanceOf(BrokerLogError);
  expect(String(observed)).toContain("layout v2 round 1");
  const db = new Database(path.join(dir, "broker.db"), { readonly: true });
  expect(db.prepare("SELECT name FROM sqlite_master WHERE name='hds'").all()).toEqual([]);
  db.close();
  save("legacy-refusal", { type: observed.constructor.name, message: String(observed) });
});
