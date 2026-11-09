// [CX-VHS01-R3] Why: own generators and byte-exact oracles challenge round 3 at the SQLite/RPC boundary. Rejected: builder-generated expected rows.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Worker, MessageChannel } from "node:worker_threads";
import { it, expect } from "vitest";
import { sqliteWorker } from "../../../../packages/qlever/src/broker/sqlite-worker.ts";
import { sqliteWorker as previous } from "../v2-worker.ts";
import { columns } from "../../../../packages/qlever/src/rdf.ts";
import { encodeFrame } from "../../../../packages/qlever/src/broker/frame.ts";
import { encodeCommitGroup } from "../../../../packages/qlever/src/broker/frames.ts";
const root = process.env.VHS01_OUT!;
if (!root) throw Error("bound runner required");
const req = createRequire(new URL("../../../../packages/qlever/package.json", import.meta.url));
const Database = req("better-sqlite3");
let serial = 0,
  rng = 0x613c7529;
const next = () => {
  rng ^= rng << 13;
  rng ^= rng >>> 17;
  rng ^= rng << 5;
  return rng >>> 0;
};
const save = (name: string, value: any) =>
  fs.writeFileSync(path.join(root, name + ".json"), JSON.stringify(value, null, 2));
const id = (n: number) => "VHS3HEAD" + n.toString(36).toUpperCase().padStart(18, "0");
const row = (n: number, pos = 2048, extra: any = {}) => ({
  ...Object.fromEntries(columns.map((c) => [c, null])),
  id: id(n),
  entity_id: "entity/" + n,
  attribute: ":v",
  value_type: "string",
  value_string: "text/" + n,
  recorded_at: 100000 + pos,
  recorded_position: pos,
  valid_from: 100000 + pos,
  schema_version: 1,
  tx_id: "tx/" + pos,
  entity_type: "Witness",
  ...extra,
});
async function raw(
  source = sqliteWorker,
  records = false,
  dir = path.join(root, "store-" + serial++),
) {
  fs.mkdirSync(dir, { recursive: true });
  const w = new Worker(source.replaceAll("Date.now()", "1790000000000"), {
    eval: true,
    workerData: {
      driver: req.resolve("better-sqlite3"),
      file: path.join(dir, "broker.db"),
      seed: 12345,
      role: "writer",
      gateBuffer: new SharedArrayBuffer(12),
      journalRecords: records,
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
  const init = await call("init");
  let lsn = init.marker.lsn,
    crc = init.marker.crc;
  const append = async (rows: any[] = [], kind = 1) => {
    lsn++;
    const positions = [...new Set(rows.map((r) => r.retracted_position ?? r.recorded_position))];
    const members = rows.length
      ? [
          {
            operationId: "op/" + lsn,
            attemptId: "a/" + lsn,
            positions,
            rows,
            subjects: [],
            claims: [],
            priors: [],
          },
        ]
      : [];
    const payload =
      kind === 1
        ? encodeCommitGroup({ v: 1, stream: "vhs3", epoch: 1, lsn, members })
        : Buffer.alloc(73 + (lsn % 99));
    const f = encodeFrame({ lsn, epoch: 1, kind, payload, prevCrc: crc });
    await call("append", {
      lsn,
      epoch: 1,
      kind,
      payload,
      prev: crc,
      crc: f.crc,
      length: f.bytes.length,
      members,
    });
    crc = f.crc;
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
const dbRead = (dir: string, fn: (db: any) => any) => {
  const db = new Database(path.join(dir, "broker.db"), { readonly: true });
  try {
    return fn(db);
  } finally {
    db.close();
  }
};
it("numeric policies agree with an independent prefix oracle, old worker is a negative control", async () => {
  const observed = [];
  for (const source of [previous, sqliteWorker])
    for (const n of [0, 1, 2, Infinity])
      for (const mode of [0, 1, 2]) {
        const one = async (policy: any) => {
          const w = await raw(source);
          try {
            for (let i = 1; i <= 23; i++) {
              await w.append([], 4);
              if (i === (mode === 2 ? 12 : 23))
                await w.call("ack", { lsn: i, epoch: 1, position: 0 });
            }
            if (mode === 1) await w.call("retain", { holder: "witness", lsn: 7 });
            const results = [];
            for (let i = 0; i < 4; i++) results.push(await w.call("purgeFrames", policy));
            return { results, anchor: (await w.call("anchor")).base_lsn };
          } finally {
            await w.close();
          }
        };
        const numeric = await one(n),
          object = await one({ frames: n, bytes: 0 });
        const expected =
          n === Infinity ? 0 : Math.min(23 - n, 22, mode === 1 ? 7 : 23, mode === 2 ? 11 : 22);
        expect(object.anchor).toBe(expected);
        if (source === sqliteWorker) expect(numeric).toEqual(object);
        else if (n !== Infinity) {
          expect(numeric.anchor).toBe(0);
          expect(expected).toBeGreaterThan(0);
        }
        observed.push({ old: source === previous, n: String(n), mode, expected, numeric, object });
      }
  save("numeric-purge", observed);
});
it("independently found hash collisions preserve UTF-16 names and ordered selections after reopen", async () => {
  const hash = (s: string) => {
    let h = 2166136261n;
    for (const ch of s.split("")) h = ((h ^ BigInt(ch.charCodeAt(0))) * 16777619n) & 0xffffffffn;
    return Number(h >= 0x80000000n ? h - 0x100000000n : h);
  };
  const buckets = new Map<number, string>(),
    pairs: string[][] = [];
  for (let i = 0; i < 650000 && pairs.length < 24; i++) {
    const s = "witness/" + next().toString(36) + "/" + i.toString(36),
      h = hash(s),
      prior = buckets.get(h);
    if (prior !== undefined) pairs.push([prior, s]);
    else buckets.set(h, s);
  }
  expect(pairs.length).toBe(24);
  const names = [
    ...pairs.flat(),
    "",
    "\ud800",
    "\ud801",
    "\udc00",
    "�",
    "😀",
    "é",
    "é",
    "a\0b",
    "ents:x",
    "x:y",
  ];
  const rows = names.map((e, n) => row(n, 2048, { entity_id: e, value_string: e }));
  const ref = await raw(previous),
    w = await raw();
  let live = w,
    readCount = 0;
  try {
    for (const c of [ref, w]) {
      await c.append([], 4);
      await c.append(rows);
    }
    const compare = async () => {
      const selections = [
        {},
        { entities: [] },
        { entities: ["absent"] },
        { entities: names.slice().reverse() },
        ...names.map((e) => ({ entities: [e] })),
        ...rows.map((r) => ({ id: r.id })),
      ];
      for (const selection of selections)
        for (const [op, args] of [
          ["pull", { basis: 2048, selection }],
          ["recent", { after: 0, selection }],
        ] as const) {
          expect(await live.call(op, args)).toStrictEqual(await ref.call(op, args));
          readCount++;
        }
      const actual = await live.call("pull", { basis: 2048, selection: {} });
      expect(actual.rows).toStrictEqual(rows);
    };
    await compare();
    await live.close();
    live = await raw(sqliteWorker, false, w.dir);
    await compare();
    const again = names.map((e, n) => row(1000 + n, 3072, { entity_id: e }));
    for (const c of [ref, live]) await c.append(again);
    await compare();
    const sql = dbRead(w.dir, (db) => ({
      names: db.prepare("SELECT eid,name FROM ents ORDER BY eid").all(),
      collisions: db.prepare("SELECT h,count(*) n FROM entkey GROUP BY h HAVING n>1").all(),
      duplicates: db.prepare("SELECT name,count(*) n FROM ents GROUP BY name HAVING n>1").all(),
      broken: db.prepare("SELECT * FROM entkey WHERE eid NOT IN (SELECT eid FROM ents)").all(),
    }));
    expect(sql.collisions.length).toBeGreaterThanOrEqual(24);
    expect(sql.duplicates).toEqual([]);
    expect(sql.broken).toEqual([]);
    expect(sql.names.length).toBe(names.length + 2);
    save("entity-collisions", { pairs, readCount, sql });
  } finally {
    await ref.close();
    await live.close();
  }
});
it("actual binding preserves independently sampled IEEE754 values, adjacent int64 doubles, and int64 strings", async () => {
  const values = [
    0,
    -0,
    NaN,
    Infinity,
    -Infinity,
    Number.MIN_VALUE,
    -Number.MIN_VALUE,
    Number.MAX_VALUE,
    -Number.MAX_VALUE,
  ];
  const buf = Buffer.alloc(8);
  for (let i = 0; i < 12000; i++) {
    buf.writeUInt32LE(next(), 0);
    buf.writeUInt32LE(next(), 4);
    values.push(buf.readDoubleLE(0));
  }
  for (const base of [2 ** 53, 2 ** 62, 2 ** 63]) {
    buf.writeDoubleLE(base);
    const bits = buf.readBigUInt64LE();
    for (let i = -32; i <= 32; i++) {
      buf.writeBigUInt64LE(bits + BigInt(i));
      values.push(buf.readDoubleLE(), -buf.readDoubleLE());
    }
  }
  const ints = [
    "-9223372036854775808",
    "9223372036854775807",
    "9007199254740993",
    "-9007199254740993",
  ];
  const rows = values.flatMap((v, n) => [
    row(100000 + 2 * n, 2048, { value_type: "number", value_string: null, value_number: v }),
    row(100001 + 2 * n, 2048, { value_type: "datetime", value_string: null, value_datetime: v }),
  ]);
  rows.push(
    ...ints.map((v, n) => row(900000 + n, 2048, { value_type: "integer", value_string: v })),
  );
  const w = await raw();
  let live = w;
  try {
    await w.append([], 4);
    await w.append(rows);
    const check = async () => {
      const p = await live.call("pull", { basis: 2048, selection: {} });
      expect(p.rows.length).toBe(rows.length);
      const ids = new Map(p.rows.map((r: any) => [r.id, r]));
      for (const r of rows) expect(ids.get(r.id), r.id).toStrictEqual(r);
    };
    await check();
    await live.close();
    live = await raw(sqliteWorker, false, w.dir);
    await check();
    const classes = dbRead(w.dir, (db) =>
      db
        .prepare(
          "SELECT t,typeof(v) storage,x IS NOT NULL fallback,count(*) n FROM facts GROUP BY t,storage,fallback ORDER BY t,storage,fallback",
        )
        .all(),
    );
    save("numeric-binding", {
      values: values.length,
      rows: rows.length,
      verifiedBeforeAndAfterReopen: true,
      classes,
    });
  } finally {
    await live.close();
  }
});
// [CX-VHS01-R3] Why: build change JSON here, not with the product's deriveChange; perturb each journal column to require exact fallback.
const journal = (t: number, mutate?: (rs: any[]) => void) => {
  const pos = (t + 2) * 1024,
    at = 100000 + pos,
    tx = "tx/" + pos,
    start = t * 100;
  const fact = row(start, pos, { entity_id: "subject/" + t });
  const jr = (n: number, a: string, type: string, v: any) =>
    row(start + n, pos, {
      entity_id: tx,
      entity_type: "_Transaction",
      attribute: a,
      value_type: type,
      value_string: null,
      [type === "ref" ? "value_string" : "value_" + type]: v,
    });
  const change = JSON.stringify({
    op: "assert",
    tripleId: fact.id,
    entityId: fact.entity_id,
    attribute: fact.attribute,
    entityType: fact.entity_type,
    value: { type: "string", value: fact.value_string },
    validFrom: at,
    recordedAt: at,
    assertionTxId: tx,
  });
  const rows = [
    fact,
    jr(1, ":_tx/position", "number", pos),
    jr(2, ":_tx/instant", "datetime", at),
    jr(3, ":_tx/changed-entity", "ref", fact.entity_id),
    jr(4, ":_tx/change", "json", change),
  ];
  mutate?.(rows);
  return rows;
};
it("OFF keeps every journal triple; ON verifies each column and preserves non-derivable values verbatim", async () => {
  const perturbations = [
    undefined,
    (rs: any[]) => (rs[3].created_by = "different"),
    (rs: any[]) => (rs[3].valid_from += 1),
    (rs: any[]) => (rs[3].valid_to = 500000),
    (rs: any[]) => (rs[3].schema_version = 2),
    (rs: any[]) => (rs[3].value_string = "other"),
    (rs: any[]) => (rs[3].entity_type = "Other"),
    (rs: any[]) => (rs[3].attribute = ":other"),
    (rs: any[]) => (rs[4].value_json += " "),
    (rs: any[]) => (rs[4].value_json = JSON.stringify({ tripleId: rs[0].id, surprise: true })),
    (rs: any[]) => (rs[2].value_datetime = -0),
    (rs: any[]) => (rs[3].created_by = undefined),
    (rs: any[]) => (rs[4].id = "literal\ud800"),
  ];
  const inputs = perturbations.map((f, t) => journal(t, f));
  const workers = [await raw(previous), await raw(), await raw(sqliteWorker, true)];
  try {
    for (const w of workers) await w.append([], 4);
    for (const rows of inputs) for (const w of workers) await w.append(rows);
    let reads = 0;
    for (let cut = 0; cut < 15; cut++)
      for (const selection of [
        {},
        { entities: [] },
        ...inputs.map((rs) => ({ entities: [rs[1].entity_id] })),
        ...inputs.flat().map((r) => ({ id: r.id })),
      ]) {
        for (const [op, args] of [
          ["pull", { basis: cut * 1024, selection }],
          ["recent", { after: cut, selection }],
        ] as const) {
          const expected = await workers[0].call(op, args);
          for (const w of workers.slice(1))
            expect(await w.call(op, args), JSON.stringify({ op, args })).toStrictEqual(expected);
          reads += 2;
        }
      }
    const expected = inputs.flat();
    const actual = await workers[1].call(
      "readback",
      expected.map((r) => r.id),
    );
    expect(actual).toStrictEqual(expected);
    const counts = workers.slice(1).map((w) =>
      dbRead(w.dir, (db) => ({
        rows: db.prepare("SELECT count(*) n FROM journal").get().n,
        records: db.prepare("SELECT count(*) n FROM jrec").get().n,
        changes: db
          .prepare("SELECT count(*) n FROM journal JOIN attrs ON a=aid WHERE name=':_tx/change'")
          .get().n,
        entities: db
          .prepare(
            "SELECT count(*) n FROM journal JOIN attrs ON a=aid WHERE name=':_tx/changed-entity'",
          )
          .get().n,
      })),
    );
    expect(counts[0]).toEqual({
      rows: inputs.length * 4 - 1,
      records: 0,
      changes: inputs.length,
      entities: inputs.length - 2,
    });
    expect(counts[1].records).toBe(1);
    expect(counts[1].rows).toBe(inputs.length * 4 - 5);
    save("journal-options", { reads, transactions: inputs.length, counts });
  } finally {
    for (const w of workers) await w.close();
  }
});
