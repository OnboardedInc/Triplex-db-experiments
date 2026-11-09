// [CX-VHS01] Why: generate independent row/cut witnesses and compare every scalar after actual SQLite storage. Rejected: reusing HS01's generator or its journal derivation as the oracle.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { Worker, MessageChannel } from "node:worker_threads";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { it, expect } from "vitest";
import { sqliteWorker } from "../../../../packages/qlever/src/broker/sqlite-worker.ts";
import {
  HostLog,
  hostLogRecovery,
  FeedRetentionExpired,
} from "../../../../packages/qlever/src/broker/log.ts";
import { LogFeed } from "../../../../packages/qlever/src/broker/feed.ts";
import { FrameKind, encodeFrame } from "../../../../packages/qlever/src/broker/frame.ts";
import { encodeCommitGroup } from "../../../../packages/qlever/src/broker/frames.ts";
import { columns } from "../../../../packages/qlever/src/rdf.ts";
const req = createRequire(new URL("../../../../packages/qlever/package.json", import.meta.url));
const driver = req.resolve("better-sqlite3"),
  Database = req("better-sqlite3");
const out = process.env.VHS01_OUT!;
if (!out) throw Error("Use adversarial/run.mjs to bind the attempt");
const save = (name: string, data: any) =>
  fs.writeFileSync(path.join(out, name + ".json"), JSON.stringify(data, null, 2));
let serial = 0,
  state = 0x48f5a102;
const next = () => {
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  return state >>> 0;
};
const fresh = (label: string) => {
  const dir = path.join(out, label + "-" + serial++);
  fs.mkdirSync(dir);
  return dir;
};
const row = (id: string, pos: number, extra: any = {}) => ({
  ...Object.fromEntries(columns.map((c) => [c, null])),
  id,
  entity_id: "subject:" + (next() % 13),
  attribute: ":a" + (next() % 5),
  value_type: "string",
  value_string: "v" + id,
  recorded_at: 1700000000000 + pos,
  recorded_position: pos,
  valid_from: 1700000000000 + pos,
  tx_id: "tx/" + pos,
  schema_version: 1,
  ...extra,
});
const ordered = (rs: any[]) => rs.toSorted((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
async function worker(source: string, dir = fresh("raw")) {
  const w = new Worker(source, {
    eval: true,
    workerData: {
      file: path.join(dir, "broker.db"),
      driver,
      role: "writer",
      seed: 12345,
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
  return {
    call,
    dir,
    close: async () => {
      await call("close");
      await w.terminate();
    },
  };
}
const member = (op: string, positions: number[], rows: any[]) => ({
  operationId: op,
  attemptId: op,
  positions,
  rows,
  priors: [],
  subjects: [
    ...new Set(rows.filter((r) => r.entity_type !== "_Transaction").map((r) => r.entity_id)),
  ],
  claims: positions.map((p) => ({
    commandId: "cmd/" + p,
    txId: "tx/" + p,
    timestamp: 1700000000000 + p,
  })),
});
// Independent serialization of core's published transaction-change shape, deliberately no codec calls.
function change(r: any, target: any, op = "assert") {
  const type = target.value_type;
  let value = target[type === "ref" || type === "integer" ? "value_string" : "value_" + type];
  if (type === "json") value = JSON.parse(value);
  if (type === "boolean") value = Boolean(value);
  return JSON.stringify({
    op,
    tripleId: target.id,
    entityId: target.entity_id,
    attribute: target.attribute,
    ...(target.entity_type == null ? {} : { entityType: target.entity_type }),
    value: { type, value },
    validFrom: target.valid_from,
    ...(target.valid_to == null ? {} : { validTo: target.valid_to }),
    recordedAt: target.recorded_at,
    ...(op === "retract" ? { retractedAt: r.recorded_at } : {}),
    ...(target.tx_id == null ? {} : { assertionTxId: target.tx_id }),
    ...(op === "retract" ? { retractionTxId: r.tx_id } : {}),
  });
}
function journal(id: string, pos: number, target: any, op = "assert", noncanonical = false) {
  const r = row(id, pos, {
    entity_id: "tx/" + pos,
    entity_type: "_Transaction",
    attribute: ":_tx/change",
    value_type: "json",
    value_string: null,
  });
  r.value_json = change(r, target, op) + (noncanonical ? "\n" : "");
  return r;
}
it("independent v1/v2 and explicit replay agree at ordinal cuts and feed pages", async () => {
  const original = execFileSync(
    "git",
    ["show", "257d4d20:packages/qlever/src/broker/sqlite-worker.ts"],
    { encoding: "utf8" },
  );
  const v1 = new Function(
    original.replace("export const sqliteWorker", "const sqliteWorker") + "\nreturn sqliteWorker",
  )();
  const old = await worker(v1),
    current = await worker(sqliteWorker);
  const latest = new Map<string, any>(),
    writes = new Map<string, number>(),
    cursors: any[] = [];
  let crc = 12345,
    offset = 32,
    reads = 0,
    fallback = 0;
  try {
    for (let lsn = 1; lsn <= 33; lsn++) {
      const positions = [lsn * 1024, lsn * 1024 + 1, lsn * 1024 + 2],
        ms: any[] = [];
      for (const pos of positions) {
        const rs = Array.from({ length: 5 }, (_, j) =>
          row("r/" + pos + "/" + j, pos, {
            valid_from: pos - 100 + j,
            valid_to: j % 2 ? null : pos + 100,
          }),
        );
        if (lsn > 1) {
          const target = latest.get("r/" + (pos - 1024) + "/0");
          if (target)
            rs.push({
              ...target,
              retracted_at: 1700000000000 + pos,
              retracted_position: pos,
              retract_tx_id: "tx/" + pos,
            });
        }
        const changes = rs.map((t, j) =>
          journal(
            "j/" + pos + "/" + j,
            pos,
            t,
            t.retracted_position == null ? "assert" : "retract",
            j === 2,
          ),
        );
        rs.push(...changes);
        for (const [attribute, value_type, channel, value] of [
          [":_tx/position", "number", "value_number", pos],
          [":_tx/instant", "datetime", "value_datetime", 1700000000000 + pos],
        ] as any[])
          rs.push(
            row("header/" + pos + "/" + attribute, pos, {
              entity_id: "tx/" + pos,
              entity_type: "_Transaction",
              attribute,
              value_type,
              value_string: null,
              [channel]: value,
            }),
          );
        ms.push(member("operation/" + pos, [pos], rs));
        for (const r of rs) {
          latest.set(r.id, r);
          writes.set(r.id, lsn);
        }
      }
      const payload = encodeCommitGroup({
        v: 1,
        stream: "independent",
        lsn,
        epoch: 1,
        members: ms,
      });
      const f = encodeFrame({ lsn, epoch: 1, kind: 1, prevCrc: crc, payload });
      cursors.push({ offset, seed: crc, nextLsn: lsn });
      const a = {
        lsn,
        epoch: 1,
        kind: 1,
        payload,
        prev: crc,
        crc: f.crc,
        length: f.bytes.length,
        members: ms,
      };
      await old.call("append", a);
      await current.call("append", a);
      crc = f.crc;
      offset += f.bytes.length;
    }
    const selections = [
      {},
      { entities: [] },
      { entities: ["missing"] },
      { entities: ["subject:1", "subject:8"] },
      { entities: ["tx/2048"] },
      { id: "r/2048/0" },
      { id: "j/2048/0" },
      { entities: ["wrong"], id: "r/2048/0" },
    ];
    for (let i = 0; i < 8500; i++) {
      const selection: any = selections[next() % selections.length],
        basis = next() % (34 * 1024),
        after = next() % 35;
      const matches = (r: any) =>
        (selection.id === undefined || selection.id === r.id) &&
        (selection.entities === undefined || selection.entities.includes(r.entity_id));
      for (const [op, args, expected] of [
        [
          "pull",
          { basis, selection },
          [...latest.values()].filter(
            (r) =>
              matches(r) &&
              r.recorded_position <= basis &&
              (r.retracted_position == null || r.retracted_position > basis),
          ),
        ],
        [
          "recent",
          { after, selection },
          [...latest.values()].filter((r) => matches(r) && writes.get(r.id)! > after),
        ],
      ] as any[]) {
        const [a, b] = await Promise.all([old.call(op, args), current.call(op, args)]);
        const aa = op === "pull" ? a.rows : a,
          bb = op === "pull" ? b.rows : b;
        expect(ordered(bb), op + ":" + i).toEqual(ordered(aa));
        if (op !== "pull" || a.eligible) expect(ordered(bb)).toEqual(ordered(expected));
        reads++;
      }
      for (const [op, arg] of [
        ["claim", "cmd/" + (1024 + (next() % 33) * 1024)],
        ["operation", "operation/" + (1024 + (next() % 33) * 1024)],
        ["head", "subject:" + (next() % 14)],
        ["frames", { from: cursors[next() % 33], upto: 33, maxBytes: 1024 + (next() % 30000) }],
      ] as any[]) {
        const a = await old.call(op, arg),
          b = await current.call(op, arg);
        // committed_at is an observation clock, compared separately from stored frame bytes.
        if (op === "frames")
          for (const x of [a, b]) for (const f of x.frames) delete f.committed_at;
        expect(b).toEqual(a);
        reads++;
      }
    }
    await current.call("purge", 30000);
    expect(ordered(await current.call("recent", { after: 0, selection: {} }))).toEqual(
      ordered([...latest.values()]),
    );
    const db = new Database(path.join(current.dir, "broker.db"), { readonly: true });
    fallback = db.prepare("SELECT count(*) n FROM journal WHERE x IS NOT NULL").get().n;
    db.close();
    save("equivalence", {
      reads,
      rows: latest.size,
      fallbackJournalRows: fallback,
      v1SourceSha256: createHash("sha256").update(original).digest("hex"),
    });
  } finally {
    await old.close();
    await current.close();
  }
});
it("stored codec round trips random IEEE doubles and exceptional columns including dictionary names", async () => {
  const w = await worker(sqliteWorker),
    expected: any[] = [],
    ieee = Buffer.alloc(8);
  const doubles = [
    -0,
    0,
    2 ** 53,
    -(2 ** 53),
    Number.MIN_VALUE,
    -Number.MIN_VALUE,
    Number.MAX_VALUE,
    -Number.MAX_VALUE,
    Infinity,
    -Infinity,
    NaN,
    2 ** -1022,
    -(2 ** -1022),
  ];
  for (let i = 0; i < 4096; i++) {
    ieee.writeUInt32LE(next(), 0);
    ieee.writeUInt32LE(next(), 4);
    doubles.push(ieee.readDoubleLE());
  }
  const strings = ["", "a\0b", "\ud800", "\udfff", "\ud800A\udfff", "世界😀", "e\u0301", "\ufffd"];
  let n = 0;
  for (const value of doubles)
    expected.push(
      row("float/" + n++, 1024, { value_type: "number", value_string: null, value_number: value }),
    );
  for (const kind of ["string", "json", "ref", "integer"])
    for (let i = 0; i < 32; i++) {
      const value =
        kind === "integer"
          ? [
              "-9223372036854775808",
              "9223372036854775807",
              "-9007199254740992",
              "9007199254740992",
            ][i % 4]
          : kind === "json"
            ? JSON.stringify({ s: strings[i % strings.length], a: [null, 0] })
            : strings[i % strings.length];
      const r = row("text/" + n++, 1024, {
        entity_id: "entity/" + strings[i % strings.length],
        attribute: ":attr/" + strings[i % strings.length],
        created_by: strings[i % strings.length],
        entity_type: strings[i % strings.length],
        value_type: kind,
        value_string: null,
        [kind === "integer" || kind === "ref" ? "value_string" : "value_" + kind]: value,
      });
      if (i % 4 === 0) delete r.valid_to;
      if (i % 4 === 1) r.valid_to = undefined;
      if (i % 4 === 2) r.schema_version = undefined;
      expected.push(r);
    }
  expected.push(
    row("00000000000000000000000000", 1024),
    row("7ZZZZZZZZZZZZZZZZZZZZZZZZZ", 1024),
    row("lower/id", 1024),
  );
  try {
    await w.call("append", {
      lsn: 1,
      epoch: 1,
      kind: 1,
      payload: Buffer.from("codec"),
      prev: 12345,
      crc: 6789,
      length: 100,
      members: [member("codec", [1024], expected)],
    });
    const actual = await w.call(
      "readback",
      expected.map((r) => r.id),
    );
    const failures = expected.flatMap((r, i) =>
      isDeepStrictEqual(r, actual[i])
        ? []
        : [
            {
              id: r.id,
              keys: Object.keys(r).filter((k) => !Object.is(r[k], actual[i]?.[k])),
              expected: r,
              actual: actual[i],
            },
          ],
    );
    const db = new Database(path.join(w.dir, "broker.db"), { readonly: true });
    const stats = db.prepare("SELECT count(*) n,sum(x IS NOT NULL) fallback FROM facts").get();
    db.close();
    save("codec", { inputs: expected.length, stats, failures });
    expect(failures).toEqual([]);
  } finally {
    await w.close();
  }
});
it("old pinned cut survives frame purge, restart verifies anchor and stale feed refuses typed", async () => {
  const dir = fresh("pinned");
  let { log } = await HostLog.open(dir, { minFreeBytes: 0, frameRetention: { tailFrames: 2 } });
  const stale = new LogFeed(dir).start();
  let first: any, previous: any, pin: any;
  try {
    for (let i = 0; i < 24; i++) {
      const pos = log.nextLsn * 1024,
        r = row("cut/" + i, pos, { entity_id: "hot" });
      const rs =
        i === 0
          ? [r]
          : [
              {
                ...previous,
                retracted_at: r.recorded_at,
                retracted_position: pos,
                retract_tx_id: r.tx_id,
              },
              r,
            ];
      if (i === 0) first = r;
      previous = r;
      const m = member("cut-op/" + i, [pos], rs);
      const f = await log.append(
        FrameKind.COMMIT_GROUP,
        encodeCommitGroup({
          v: 1,
          stream: "cut",
          lsn: log.nextLsn,
          epoch: log.epoch,
          members: [m],
        }),
      );
      log.publishWatermark({ lsn: f.lsn, epoch: log.epoch, position: pos });
      if (i === 0) pin = log.pinBasis(first.recorded_position, "independent-P1");
      log.purge(pos);
    }
    // Read raw retirement metadata separately; exact snapshot membership is the P1 witness.
    const pulled = await log.pull(first.recorded_position, { entities: ["hot"] });
    expect(pulled.eligible).toBe(true);
    expect(pulled.rows.map((r) => r.id)).toEqual([first.id]);
    expect({
      ...pulled.rows[0],
      retracted_at: null,
      retracted_position: null,
      retract_tx_id: null,
    }).toEqual(first);
    const before = hostLogRecovery(log).marker;
    expect(before.base_lsn).toBeGreaterThan(1);
    expect(() => new LogFeed(dir).poll(stale)).toThrow(FeedRetentionExpired);
    pin.release();
    await log.close();
    ({ log } = await HostLog.open(dir, { minFreeBytes: 0, frameRetention: { tailFrames: 2 } }));
    expect(hostLogRecovery(log).marker.base_lsn).toBe(before.base_lsn);
    const db = new Database(log.segmentPath, { readonly: true });
    const f = db.prepare("SELECT * FROM frames ORDER BY lsn LIMIT 1").get();
    db.close();
    expect(f.prev_crc).toBe(before.base_crc);
    expect(f.offset).toBe(before.base_end);
    save("pinned", {
      basis: first.recorded_position,
      before,
      after: hostLogRecovery(log).marker,
      retainedFirst: { lsn: f.lsn, prev_crc: f.prev_crc, offset: f.offset },
      exactSnapshotRows: pulled.rows.length,
    });
  } finally {
    await log.close();
  }
});
