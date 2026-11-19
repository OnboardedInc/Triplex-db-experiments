import assert from "node:assert/strict";
import { closeSync, openSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { Option } from "effect";
import type { Receipt } from "../../../bench/lib/composition.ts";
import type { ImportJournal } from "../../../bench/lib/thin-activation.ts";
import { type RecordedCommand } from "../../../bench/lib/seed.ts";
import { batchSize, intent, person, seedHead, seedPosition } from "./population.ts";

// [DX-THIN1] Why: keep actual assigned IDs and receipt clocks on disk. Regenerate command intent by its frozen offset.
// Rejected: deriving expected values from the read gateway or keeping the compact model for four million people.
export class IntentLog {
  private db: DatabaseSync;
  private select;
  private insert;
  private readonly base: number;
  constructor(
    file: string,
    readonly size: number,
    readonly scope: string,
  ) {
    closeSync(openSync(file, "wx"));
    this.db = new DatabaseSync(file);
    this.db.exec(
      "PRAGMA cache_size=-4096; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE receipts(p INTEGER PRIMARY KEY, tx TEXT UNIQUE, instant REAL, ids TEXT)",
    );
    this.base = seedHead(size);
    this.select = this.db.prepare("SELECT * FROM receipts WHERE p=?");
    this.insert = this.db.prepare("INSERT INTO receipts VALUES (?,?,?,?)");
  }
  indices(p: number) {
    if (p > this.base) return [(p - this.base - 1) * 50];
    const from = (p - 1) * batchSize;
    return Array.from({ length: Math.min(batchSize, this.size - from) }, (_, n) => from + n);
  }
  operations(p: number) {
    return this.indices(p).flatMap((i) => intent(i, p > this.base));
  }
  record(p: number, operations: ReturnType<typeof intent>, receipt: Receipt) {
    assert.equal(receipt.position, p);
    assert(Number.isFinite(receipt.instant) && receipt.txId);
    const key = (r: Receipt["triples"][number]) =>
      JSON.stringify([r.entityId, r.attribute, r.value.type, r.value.value, r.validFrom]);
    const rows = new Map(receipt.triples.map((row) => [key(row), row.id]));
    assert.equal(rows.size, operations.length);
    assert.equal(receipt.triples.length, operations.length);
    const ids = operations.map((op) => {
      const id = rows.get(key({ ...op, id: "" }));
      assert(id);
      return id;
    });
    assert.equal(new Set(ids).size, ids.length);
    this.insert.run(p, receipt.txId, receipt.instant, JSON.stringify(ids));
  }
  command(p: number): RecordedCommand {
    const r = this.select.get(p);
    assert(r);
    return {
      commandId: this.scope + "-" + p,
      operations: this.operations(p),
      actor: "import",
      preconditions: [],
      receipt: {
        position: p,
        instant: Number(r.instant),
        txId: String(r.tx),
        assertionIds: JSON.parse(String(r.ids)),
      },
    };
  }
  verifyJournal(tx: ImportJournal) {
    const c = this.command(tx.position);
    assert.equal(tx.txId, c.receipt.txId);
    assert.equal(tx.instant, c.receipt.instant);
    assert.equal(tx.commandId, c.commandId);
    const expected = c.operations
      .map((op, n) =>
        JSON.stringify([
          op.op,
          c.receipt.assertionIds[n],
          op.entityId,
          op.attribute,
          op.value.type,
          op.value.value,
          op.validFrom,
          null,
        ]),
      )
      .sort();
    const actual = tx.changes
      .map((c) =>
        JSON.stringify([
          c.op,
          c.tripleId,
          c.entityId,
          c.attribute,
          c.value?.type,
          c.value?.value,
          c.validFrom,
          c.validTo ?? null,
        ]),
      )
      .sort();
    assert.deepEqual(actual, expected);
  }
  rows(i: number, p: number, validAt: number) {
    const commands = [seedPosition(i)];
    if (i % 50 === 0) commands.push(this.base + i / 50 + 1);
    return commands
      .filter((pos) => pos <= p)
      .flatMap((pos) => {
        const c = this.command(pos),
          root = person(i);
        return c.operations.flatMap((op, n) =>
          (op.entityId === root || op.entityId.startsWith(root + "/")) && op.validFrom <= validAt
            ? [
                {
                  id: c.receipt.assertionIds[n]!,
                  entityId: op.entityId,
                  attribute: op.attribute,
                  value: op.value,
                  recordedAt: c.receipt.instant,
                  validFrom: op.validFrom,
                  validTo: Option.none(),
                  retractedAt: Option.none(),
                  createdBy: Option.some("import"),
                  schemaVersion: Option.some(1),
                  entityType: Option.none(),
                  txId: Option.some(c.receipt.txId),
                  retractTxId: Option.none(),
                },
              ]
            : [],
        );
      });
  }
  close() {
    this.db.close();
  }
}
