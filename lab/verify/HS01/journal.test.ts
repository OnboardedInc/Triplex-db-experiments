// [EXP-HS01-R3] Why: the one-record journal (option ON) must answer every read exactly as the round 2 worker and as the same worker with the
// option OFF, over transactions that look like core's (position, instant, headers, changed entities, changes), including every shape that must
// fall back to verbatim rows and the retirement of a journal row inside a record. Rejected: comparing the record against its own decoder.
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
import { encodeFrame } from "../../../packages/qlever/src/broker/frame.js";
import { encodeCommitGroup } from "../../../packages/qlever/src/broker/frames.js";
import { columns } from "../../../packages/qlever/src/rdf.js";

const root = process.env.HS01_RESULT
  ? path.join(path.dirname(process.env.HS01_RESULT), "stores")
  : path.resolve("runs/HS01");
const stats: Record<string, unknown> = {};
const writeStats = () => {
  if (process.env.HS01_RESULT) {
    const file = path.join(path.dirname(process.env.HS01_RESULT), "journal-measurements.json");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(stats, null, 2));
  }
};
const codec = new Function("Buffer", rowCodec + "return {deriveChange};")(Buffer);
const crockford = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ulid = (n: bigint) => {
  let s = "";
  for (let i = 0; i < 26; i++, n >>= 5n) s = crockford[Number(n & 31n)] + s;
  return s;
};
const blank = () => Object.fromEntries(columns.map((c) => [c, null]));

// One generated history: the same append objects go to every worker under test.
interface Gen {
  appends: any[];
  journalIds: string[];
  factIds: string[];
  txNames: string[];
  entities: string[];
  expect: {
    records: number;
    verbatimTx: number;
    explicitRefs: number;
    transactions: number;
    expanded: number;
  };
}
const generate = (options: { ids: "structured" | "ulid" | "mixed"; transactions: number }): Gen => {
  let counter = 1000,
    ulidCounter = 0x1234567890abcdef1234567890n;
  const heads = ["ZQ0000A1", "LIOU0000", "00000000"];
  // One head per transaction (core's generator has one head per runtime); a gap models a clock tick between two ids of a run.
  const nextFactIds = (count: number, kind: number, head: string, gap = false): string[] => {
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
      if (gap && i === Math.floor(count / 2)) {
        counter += 7;
        ulidCounter += 5n;
      }
      out.push(
        kind === 0
          ? head + (counter++).toString(36).toUpperCase().padStart(18, "0")
          : ulid(ulidCounter++),
      );
    }
    return out;
  };
  const gen: Gen = {
    appends: [],
    journalIds: [],
    factIds: [],
    txNames: [],
    entities: [],
    expect: { records: 0, verbatimTx: 0, explicitRefs: 0, transactions: 0, expanded: 0 },
  };
  const recordable = new Map<number, boolean>(),
    retiredIds = new Set<string>(),
    expanded = new Set<number>();
  const live = new Map<string, any>();
  const journalBy = new Map<number, any[]>();
  let crc = 123,
    lsn = 1,
    t = 0;
  const frame = (kind: number, payload: Buffer, members: any[]) => {
    const encoded = encodeFrame({ lsn, epoch: 1, kind, payload, prevCrc: crc });
    const a = {
      lsn,
      epoch: 1,
      kind,
      prev: crc,
      crc: encoded.crc,
      length: encoded.bytes.length,
      payload,
      members,
    };
    gen.appends.push(a);
    crc = encoded.crc;
    lsn++;
  };
  frame(
    2,
    Buffer.from(
      JSON.stringify({
        v: 1,
        epoch: 1,
        previousEpoch: 0,
        lastValidLsn: 0,
        abortedLsns: [],
        tornBytes: 0,
        at: 100,
      }),
    ),
    [],
  );
  while (t < options.transactions) {
    const inMember = 1 + (t % 5 === 4 ? 2 : 0);
    const rows: any[] = [],
      positions: number[] = [],
      claims: any[] = [],
      subjects = new Set<string>(),
      priors: any[] = [];
    for (let j = 0; j < inMember && t < options.transactions; j++, t++) {
      const pos = lsn * 1024 + j,
        at = 1_000_000 + t * 10,
        txId = "_tx/" + (t % 4 === 3 ? "T" + t : ulid(BigInt(t) + 0x77n).padStart(26, "0")),
        kind = options.ids === "structured" ? 0 : options.ids === "ulid" ? 1 : t % 2;
      positions.push(pos);
      gen.txNames.push(txId);
      const vf = t % 23 === 22 ? 500 : 0;
      const factCount = 1 + (t % 6),
        shape = {
          noActor: t % 7 === 3,
          noCommand: t % 5 === 2,
          extras: t % 11 === 5,
          retract: t % 13 === 6 && live.size > 5,
          runGap: t % 17 === 8,
          journalGap: t % 19 === 9,
          textIds: t % 29 === 14,
          noChanges: t % 31 === 15,
          valueKinds: t % 3 === 0,
        };
      const base = (over: any) => ({
        ...blank(),
        recorded_at: at,
        recorded_position: pos,
        valid_from: at + vf,
        tx_id: txId,
        schema_version: 1,
        ...over,
      });
      const changes: { op: "assert" | "retract"; row: any }[] = [];
      if (shape.retract) {
        const old = [...live.values()][t % live.size];
        live.delete(old.id);
        changes.push({
          op: "retract",
          row: {
            ...old,
            retracted_at: at,
            retracted_position: pos,
            retract_tx_id: txId,
          },
        });
        priors.push(old);
      }
      const head = heads[t % 2]!;
      const ids = shape.noChanges ? [] : nextFactIds(factCount, kind, head, shape.runGap);
      ids.forEach((id, i) => {
        const entity = "e:" + ((t * 3 + i) % 37);
        if (!gen.entities.includes(entity)) gen.entities.push(entity);
        const k = shape.valueKinds ? (t + i) % 6 : 0;
        const over: any = {
          id,
          entity_id: entity,
          attribute: ":a" + (i % 4),
          entity_type: "Subject",
        };
        if (k === 0) Object.assign(over, { value_type: "string", value_string: "v" + t + "." + i });
        if (k === 1)
          Object.assign(over, {
            value_type: "number",
            value_number: [1, -3, 2 ** 53, 2 ** 62, -(2 ** 63), 1.5, 2 ** 63, 1e300][(t + i) % 8],
          });
        if (k === 2) Object.assign(over, { value_type: "boolean", value_boolean: (t + i) % 2 });
        if (k === 3) Object.assign(over, { value_type: "datetime", value_datetime: at + i });
        if (k === 4) Object.assign(over, { value_type: "ref", value_string: "e:" + (i % 37) });
        if (k === 5)
          Object.assign(over, { value_type: "integer", value_string: "9007199254740993" });
        const row = base(over);
        live.set(id, row);
        gen.factIds.push(id);
        changes.push({ op: "assert", row });
        rows.push(row);
        subjects.add(entity);
      });
      for (const c of changes) if (c.op === "retract") rows.push(c.row);
      // The journal, in core's metadataInputs order; ids follow the fact ids (a gap models a clock tick inside a transaction).
      const jIds = nextFactIds(
        2 +
          (shape.noActor ? 0 : 1) +
          (shape.noCommand ? 0 : 1) +
          (shape.extras ? 3 : 0) +
          new Set(changes.map((c) => c.row.entity_id)).size +
          changes.length,
        kind,
        head,
        shape.journalGap,
      ).map((id, i) => (shape.textIds ? "jid/" + t + "/" + i : id));
      let jn = 0;
      const jrow = (attribute: string, over: any) => {
        const id = jIds[jn++]!;
        gen.journalIds.push(id);
        return base({
          id,
          entity_id: txId,
          entity_type: "_Transaction",
          attribute,
          ...over,
        });
      };
      const journal: any[] = [
        jrow(":_tx/position", { value_type: "number", value_number: pos }),
        jrow(":_tx/instant", { value_type: "datetime", value_datetime: at }),
        ...(shape.noActor
          ? []
          : [jrow(":_tx/actor", { value_type: "string", value_string: "actor-" + (t % 3) })]),
        ...(shape.noCommand
          ? []
          : [jrow(":_tx/command-id", { value_type: "string", value_string: "cmd-" + t })]),
        ...(shape.extras
          ? [
              jrow(":_tx/correlation-id", { value_type: "string", value_string: "cor-" + t }),
              jrow(":_tx/causation-id", { value_type: "string", value_string: "cau-" + t }),
              jrow(":_tx/config-snapshot", { value_type: "string", value_string: "cfg-" + t }),
            ]
          : []),
        ...[...new Set(changes.map((c) => c.row.entity_id))].map((e) =>
          jrow(":_tx/changed-entity", { value_type: "ref", value_string: e }),
        ),
      ];
      for (const c of changes) {
        const change = jrow(":_tx/change", { value_type: "json", value_json: "" });
        change.value_json = codec.deriveChange(change, c.row);
        journal.push(change);
      }
      journalBy.set(pos, journal);
      rows.push(...journal);
      claims.push({ commandId: "cmd" + t, txId, timestamp: at });
      gen.expect.transactions++;
      const plain = !shape.journalGap && !shape.textIds;
      recordable.set(pos, plain);
      if (plain) gen.expect.records++;
      else gen.expect.verbatimTx++;
      // The change list is explicit when a retraction or a gap breaks the run just before the journal ids.
      if (plain && (shape.retract || (shape.runGap && ids.length >= 2))) gen.expect.explicitRefs++;
    }
    const members = [
      {
        operationId: "op" + lsn,
        attemptId: "attempt" + lsn,
        positions,
        claims,
        subjects: [...subjects],
        rows,
        priors,
      },
    ];
    // Later transactions retire a journal row of an earlier record (erasure style): the same row with its retirement set.
    const earlier = [...journalBy.keys()].slice(0, 6);
    if (lsn % 9 === 0 && earlier.length === 6) {
      const pos = earlier[(lsn / 9) % 6]!,
        target =
          journalBy.get(pos)!.find((r) => r.attribute === ":_tx/command-id") ??
          journalBy.get(pos)![0];
      if (target && !retiredIds.has(target.id)) {
        retiredIds.add(target.id);
        if (recordable.get(pos) && !expanded.has(pos)) {
          expanded.add(pos);
          gen.expect.expanded++;
        }
        members[0]!.rows.push({
          ...target,
          retracted_at: 2_000_000 + lsn,
          retracted_position: lsn * 1024 + 900,
          retract_tx_id: "_tx/RETIRE" + lsn,
        });
        members[0]!.positions.push(lsn * 1024 + 900);
      }
    }
    const payload = encodeCommitGroup({
      v: 1,
      stream: "hs01-r3-journal",
      lsn,
      epoch: 1,
      members: members as any,
    });
    frame(1, payload, members);
  }
  return gen;
};

const client = async (source: string, options: { dir?: string; journalRecords?: boolean } = {}) => {
  source = source.replaceAll("Date.now()", "1790000000000");
  const dir = options.dir ?? path.join(root, "journal-" + randomUUID());
  fs.mkdirSync(dir, { recursive: true });
  const worker = new Worker(source, {
    eval: true,
    workerData: {
      driver: req.resolve("better-sqlite3"),
      file: path.join(dir, "broker.db"),
      role: "writer",
      seed: 123,
      gateBuffer: new SharedArrayBuffer(12),
      journalRecords: options.journalRecords === true,
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
type Client = Awaited<ReturnType<typeof client>>;
const feed = async (c: Client, gen: Gen, from = 0, to = gen.appends.length) => {
  for (const a of gen.appends.slice(from, to)) await c.call("append", a);
};
const reads = (gen: Gen) => {
  const out: [string, any][] = [];
  const lastLsn = gen.appends.length;
  const bases: number[] = [];
  for (let l = 1; l <= lastLsn; l += 3) bases.push(l * 1024, l * 1024 + 1, l * 1024 + 2);
  bases.push(lastLsn * 1024 + 1023);
  const selections: any[] = [
    {},
    { entities: [] },
    { entities: ["e:1", "e:2", "e:30"] },
    { entities: gen.txNames.slice(0, 5) },
    { entities: gen.txNames.slice(7, 8) },
    { entities: [gen.txNames.at(-1)!, "e:3"] },
    { entities: ["no such entity"] },
  ];
  for (let i = 0; i < gen.journalIds.length; i += 11) selections.push({ id: gen.journalIds[i] });
  for (let i = 0; i < gen.factIds.length; i += 13) selections.push({ id: gen.factIds[i] });
  selections.push({ id: "NOPE" });
  for (const b of bases) for (const s of selections) out.push(["pull", { basis: b, selection: s }]);
  for (let after = 0; after <= lastLsn; after += 4)
    for (const s of selections.slice(0, 12)) out.push(["recent", { after, selection: s }]);
  for (let i = 0; i < gen.journalIds.length; i += 97)
    out.push(["readback", gen.journalIds.slice(i, i + 40)]);
  out.push(["readback", gen.factIds.slice(0, 60)]);
  return out;
};
const compare = async (reference: Client, subject: Client, gen: Gen, label: string) => {
  let n = 0;
  for (const [op, args] of reads(gen)) {
    const [a, b] = await Promise.all([reference.call(op, args), subject.call(op, args)]);
    expect(JSON.stringify(b), label + " " + op + " " + JSON.stringify(args).slice(0, 120)).toBe(
      JSON.stringify(a),
    );
    n++;
  }
  return n;
};
const counts = (dir: string) => {
  const db = new Database(path.join(dir, "broker.db"), { readonly: true });
  try {
    const one = (sql: string) => (db.prepare(sql).get() as any).n as number;
    return {
      records: one("SELECT count(*) n FROM jrec"),
      verbatimJournalRows: one("SELECT count(*) n FROM journal"),
      explicit: one("SELECT count(*) n FROM jrec WHERE rf IS NOT NULL"),
      history: one("SELECT count(*) n FROM history"),
    };
  } finally {
    db.close();
  }
};

describe("EXP-HS01 round 3 journal record", () => {
  for (const ids of ["structured", "ulid", "mixed"] as const)
    it("answers every read like round 2 and like the option off: " + ids + " ids", async () => {
      const gen = generate({ ids, transactions: 160 });
      const ref = await client(r2),
        off = await client(r3),
        on = await client(r3, { journalRecords: true });
      try {
        await feed(ref, gen);
        await feed(off, gen);
        await feed(on, gen);
        const vsRef = await compare(ref, off, gen, "off vs round 2");
        const vsOff = await compare(off, on, gen, "on vs off");
        const c = counts(on.dir);
        expect(counts(off.dir).records).toBe(0);
        // Every transaction that is a plain run gets a record; every other keeps verbatim rows. Retired journal rows expand their record.
        expect(c.records + c.verbatimJournalRows).toBeGreaterThan(0);
        expect(c.records).toBe(gen.expect.records - gen.expect.expanded);
        expect(gen.expect.expanded).toBeGreaterThan(0);
        expect(c.explicit).toBeGreaterThan(0);
        stats["journal-" + ids] = {
          reads: { versusRound2: vsRef, versusOff: vsOff },
          transactions: gen.expect.transactions,
          records: c.records,
          expectedRecordsBeforeExpansion: gen.expect.records,
          verbatimJournalRows: c.verbatimJournalRows,
          explicitChangeLists: c.explicit,
        };
        writeStats();
      } finally {
        await ref.close();
        await off.close();
        await on.close();
      }
    });
  it("reopen: records stay readable with the option off, and appending continues with either setting", async () => {
    const gen = generate({ ids: "mixed", transactions: 120 });
    const half = Math.floor(gen.appends.length / 2),
      third = Math.floor((gen.appends.length * 3) / 4);
    const ref = await client(r2);
    let on = await client(r3, { journalRecords: true });
    try {
      await feed(ref, gen);
      await feed(on, gen, 0, half);
      await on.close();
      // Same store, option off: first half stays records, second part writes verbatim rows.
      on = await client(r3, { dir: on.dir, journalRecords: false });
      await feed(on, gen, half, third);
      await on.close();
      on = await client(r3, { dir: on.dir, journalRecords: true });
      await feed(on, gen, third);
      await compare(ref, on, gen, "reopened vs round 2");
      const c = counts(on.dir);
      expect(c.records).toBeGreaterThan(10);
      expect(c.verbatimJournalRows).toBeGreaterThan(0);
    } finally {
      await ref.close();
      await on.close();
    }
  });
});
