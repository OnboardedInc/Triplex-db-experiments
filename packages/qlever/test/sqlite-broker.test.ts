// [EXP-SQL01] Why: verify atomic SQLite storage and exact H1 cuts independently from retained frame payloads.
// Rejected: checking only commit exit codes (does not establish what readers or recovery see).
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { HostBroker } from "../src/broker/broker.js";
import { HostLog } from "../src/broker/log.js";
import { crc32c } from "../src/broker/crc32c.js";
import { columns } from "../src/rdf.js";
import type { TripleRow } from "@triplex-build/triplex/runtime";

const root = path.resolve(import.meta.dirname, "../../../runs/broker/EXP-SQL01");
const fresh = () => path.join(root, randomUUID());
const row = (id: string, entity = "s", position = -1): TripleRow =>
  ({
    ...Object.fromEntries(columns.map((c) => [c, null])),
    id,
    entity_id: entity,
    attribute: ":name",
    value_type: "string",
    value_string: id,
    entity_type: "Subject",
    recorded_position: position,
    recorded_at: 1,
    valid_from: 0,
  }) as TripleRow;
const submit = (
  broker: HostBroker,
  id: string,
  rows: TripleRow[],
  priors: TripleRow[] = [],
  placeholders = [-1],
) =>
  broker.submit({
    operationId: id,
    attemptId: id,
    sourceK: broker.head(),
    reads: { entities: new Set<string>(), scopeWide: false },
    claims: [{ commandId: id, txId: id, timestamp: 1 }],
    placeholders,
    rows,
    priors: new Map(priors.map((r) => [r.id, r])),
    newIds: new Set(rows.filter((r) => !priors.some((p) => p.id === r.id)).map((r) => r.id)),
  });
const replay = (dir: string, basis: number) => {
  // Independent SQL access and wire decode, deliberately no product H1/recent_rows helpers.
  const db = new Database(path.join(dir, "broker.db"), { readonly: true });
  try {
    const latest = new Map<string, TripleRow>();
    for (const f of db.prepare("SELECT payload FROM frames WHERE kind=1 ORDER BY lsn").all() as {
      payload: Buffer;
    }[])
      for (const member of JSON.parse(f.payload.toString()).m)
        for (const cells of member.r) {
          const r = Object.fromEntries(
            columns.map((c, i) => [c, cells[i] ?? null]),
          ) as unknown as TripleRow;
          latest.set(r.id, r);
        }
    return [...latest.values()].filter(
      (r) =>
        r.recorded_position <= basis &&
        (r.retracted_position === null || r.retracted_position > basis),
    );
  } finally {
    db.close();
  }
};
const ids = (rows: readonly TripleRow[]) => rows.map((r) => r.id).sort();

describe("SQLite broker / R25", () => {
  it("H1 equals frame replay at ordinal cuts, retains pins, and falls back below H", async () => {
    const dir = fresh(),
      b = await HostBroker.open({ dir, scopeKey: "sql01", minFreeBytes: 0 });
    try {
      const a = await submit(b, "a", [row("a"), row("b")]);
      expect(a.kind).toBe("committed");
      const basis = b.head(),
        prior = b.fromLog(0, { id: "a" }, () => true)[0]!;
      const pin = b.pinBasis(basis, "test sweep");
      await submit(
        b,
        "replace",
        [{ ...prior, retracted_position: -1, retracted_at: 2 }, row("c", "s", -2)],
        [prior],
        [-1, -2],
      );
      for (const cut of [0, basis, b.head() - 1, b.head()]) {
        const actual = await b.pullAt(cut, { entities: ["s"] });
        expect(actual.eligible).toBe(true);
        expect(ids(actual.rows)).toEqual(ids(replay(dir, cut)));
      }
      expect(b.purgeCurrent(b.head()).h).toBe(basis);
      expect(ids((await b.pullAt(basis, { entities: ["s"] })).rows)).toEqual(["a", "b"]);
      pin.release();
      expect(b.purgeCurrent(b.head()).h).toBe(b.head());
      expect((await b.pullAt(basis, { entities: ["s"] })).eligible).toBe(false);
      expect((await b.pullAt(b.durable().lsn * 1024 + 1024, {})).eligible).toBe(false);
      expect(ids(b.fromLog(0, {}, () => true))).toEqual(["a", "b", "c"]);
    } finally {
      await b.close();
    }
  });
  it("publishes rows, claims, receipt, head and frame atomically across reopen", async () => {
    const dir = fresh();
    let b = await HostBroker.open({ dir, scopeKey: "sql01", minFreeBytes: 0 });
    const decision = await submit(b, "atomic", [row("atomic")]);
    expect(decision.kind).toBe("committed");
    const basis = b.head();
    await b.close();
    b = await HostBroker.open({ dir, scopeKey: "sql01", minFreeBytes: 0 });
    try {
      expect(b.claim("atomic")?.position).toBe(basis);
      expect(b.operation("atomic")?.lsn).toBe(Math.floor(basis / 1024));
      expect(ids((await b.pullAt(basis, {})).rows)).toEqual(["atomic"]);
      expect((await submit(b, "atomic", [row("unused")])).kind).toBe("committed");
      expect(ids((await b.pullAt(b.head(), {})).rows)).toEqual(["atomic"]);
    } finally {
      await b.close();
    }
  });
  it("refuses damaged acknowledged frame and ahead/corrupt ACKED sidecars", async () => {
    for (const kind of ["payload", "ahead", "sidecar"]) {
      const dir = fresh(),
        b = await HostBroker.open({ dir, scopeKey: "sql01", minFreeBytes: 0 });
      await submit(b, "damaged", [row("damaged")]);
      await b.close();
      if (kind === "payload") {
        const db = new Database(path.join(dir, "broker.db"));
        db.pragma("fullfsync=ON");
        db.pragma("checkpoint_fullfsync=ON");
        db.prepare("UPDATE frames SET payload=? WHERE kind=1").run(Buffer.from("broken"));
        db.close();
      } else {
        const p = path.join(dir, "ACKED"),
          bytes = fs.readFileSync(p);
        bytes[kind === "ahead" ? 0 : 31] ^= 0xff;
        if (kind === "ahead") bytes.writeUInt32LE(crc32c(bytes.subarray(0, 28)), 28);
        fs.writeFileSync(p, bytes);
      }
      await expect(HostLog.open(dir, { minFreeBytes: 0 })).rejects.toThrow(/CRC|ACKED|chain/);
    }
  });
  it("four reader threads at fixed cuts stay exact while writers progress", async () => {
    const dir = fresh(),
      b = await HostBroker.open({ dir, scopeKey: "sql01", minFreeBytes: 0 });
    try {
      await submit(b, "base", [row("base")]);
      const basis = b.head(),
        pin = b.pinBasis(basis, "readers");
      let writes = 0,
        reads = 0;
      await Promise.all([
        (async () => {
          for (let i = 0; i < 200; i++) {
            await submit(b, "writer" + i, [row("w" + i, "writer")]);
            writes++;
          }
        })(),
        ...Array.from({ length: 16 }, async () => {
          for (let i = 0; i < 100; i++) {
            const p = await b.pullAt(basis, { entities: ["s"] });
            expect(p.eligible).toBe(true);
            expect(ids(p.rows)).toEqual(["base"]);
            reads++;
          }
        }),
      ]);
      expect(writes).toBe(200);
      expect(reads).toBe(1600);
      pin.release();
    } finally {
      await b.close();
    }
  }, 120_000);
});
