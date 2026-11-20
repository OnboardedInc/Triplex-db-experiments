// [DX-HA1] Why: exercise the shipped client and native log with an independent intent ledger. Rejected: comparing two reads of the recovered store as an oracle.
import assert from "node:assert/strict";
import {
  DatomicClient,
  DatomicHttpError,
  DatomicTransportError,
} from "@triplex-build/triplex-datomic";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { setTimeout as sleep } from "node:timers/promises";
export { DatomicClient };
export type Input = Parameters<DatomicClient["transact"]>[1];
export type Receipt = {
  operationId: string;
  position: { t: "long"; v: string };
  t: { t: "long"; v: string };
  recordedAt: { t: "double"; v: number };
};
export const errorCode = (e: unknown) =>
  e instanceof DatomicHttpError
    ? e.code
    : e instanceof DatomicTransportError
      ? "Transport"
      : undefined;
export function immutable(value: any): Receipt {
  const { operationId, position, t, recordedAt } = value;
  assert.equal(typeof operationId, "string");
  assert.equal(position?.t, "long");
  assert.match(position.v, /^[1-9]\d*$/);
  assert.equal(t?.t, "long");
  assert.match(t.v, /^[1-9]\d*$/);
  assert.equal(recordedAt?.t, "double");
  assert(Number.isSafeInteger(recordedAt.v));
  return { operationId, position, t, recordedAt };
}
export class Account {
  readonly inputs: Input[] = [];
  private readonly byOperation = new Map<string, Input>();
  private readonly bySubject = new Map<string, Input[]>();
  private readonly subjectOf = new Map<string, string>();
  readonly receipts = new Map<string, Receipt>();
  readonly arrivals = new Map<string, number>();
  readonly attempts: { op: string; start: number; end: number; result: string }[] = [];
  readonly scope: string;
  readonly db: string;
  w: DatomicClient;
  r: DatomicClient;
  cursor = "";
  schema = "";
  constructor(
    readonly key: string,
    write: string,
    read: string,
    scopeKey = key,
    writeTimeout = 2200,
    scopeText?: string,
  ) {
    this.scope = scopeText ?? JSON.stringify(["triplex-scope-v1", "ha1", scopeKey, "test", 0]);
    this.db = "s2-" + Buffer.from(this.scope).toString("base64url");
    this.w = new DatomicClient(write, writeTimeout);
    this.r = new DatomicClient(read, 2600);
  }
  async open(layout: "legacy" | "lean" = "legacy", strict = false) {
    const v = await this.w.create(this.scope, layout, strict, 45000);
    assert(v.created && v.db === this.db);
    this.schema = v.schemaHash;
    const b = await this.w.basis(this.db);
    assert.equal(b.position.v, "0");
    assert.equal(b.schemaHash, this.schema);
    this.cursor = String(BigInt(b.t.v) + 1n);
  }
  close() {
    this.w.close();
    this.r.close();
  }
  changeEndpoint(write: string, read: string) {
    this.close();
    this.w = new DatomicClient(write, 2200);
    this.r = new DatomicClient(read, 2600);
  }
  intent(label: string, width = 1, person = "witness", subjectsPerCommand = 1): Input {
    assert(
      Number.isInteger(subjectsPerCommand) &&
        subjectsPerCommand > 0 &&
        width % subjectsPerCommand === 0,
    );
    const op = this.key + "-" + label,
      tx = op + "/tx",
      stamp = 1000000 + this.inputs.length + 1;
    const subject = this.key + "/" + person;
    assert(!this.byOperation.has(op));
    const subjectAt = (k: number) =>
      subjectsPerCommand === 1
        ? subject
        : subject + "/s-" + Math.floor(k / (width / subjectsPerCommand));
    const makeRows = (): TripleRow[] =>
      Array.from({ length: width }, (_, k) => ({
        id: op + "/fact-" + k,
        entity_id: subjectAt(k),
        entity_type: "Subject",
        attribute: "ha/value-" + k,
        value_type: "string",
        value_string: op + "/value-" + k,
        value_number: null,
        value_boolean: null,
        value_datetime: null,
        value_json: null,
        recorded_at: stamp,
        recorded_position: 1,
        valid_from: 10,
        valid_to: null,
        created_by: null,
        retracted_at: null,
        retracted_position: null,
        retract_tx_id: null,
        schema_version: 1,
        tx_id: tx,
      }));
    const input = {
      operationId: op,
      attemptId: op + "/attempt",
      sourceK: null,
      scopeWide: false,
      assignRecordTime: false,
      position: 1,
      span: 1,
      get rows() {
        return makeRows();
      },
      get newIds() {
        return Array.from({ length: width }, (_, k) => op + "/fact-" + k);
      },
      claims: [{ commandId: op + "/command", txId: tx, timestamp: stamp }],
    };
    this.byOperation.set(op, input);
    this.subjectOf.set(op, subjectAt(0));
    for (let n = 0; n < subjectsPerCommand; n++) {
      const id = subjectAt(n * (width / subjectsPerCommand));
      const group = this.bySubject.get(id) ?? [];
      group.push(input);
      this.bySubject.set(id, group);
    }
    this.inputs.push(input);
    return input;
  }
  remember(input: Input, value: unknown, time = performance.now()) {
    const receipt = immutable(value);
    assert.equal(receipt.operationId, input.operationId);
    assert.equal(receipt.recordedAt.v, input.claims[0]!.timestamp);
    const old = this.receipts.get(input.operationId);
    if (old) assert.deepEqual(receipt, old);
    else {
      this.receipts.set(input.operationId, receipt);
      this.arrivals.set(input.operationId, time);
    }
    return receipt;
  }
  async send(input: Input, onSent?: () => void) {
    const deadline = performance.now() + 150000;
    for (;;) {
      const start = performance.now();
      try {
        const answer = await this.w.transact(this.db, { ...input }, onSent);
        this.attempts.push({ op: input.operationId, start, end: performance.now(), result: "ack" });
        return this.remember(input, answer);
      } catch (error) {
        const code = errorCode(error);
        if (
          !code ||
          ![
            "Transport",
            "OutcomeUnknown",
            "OperationDuplicate",
            "CommandConflict",
            "CasConflict",
            "TransactionRejected",
            "GatewayError",
            "SyncTimeout",
          ].includes(code)
        )
          throw error;
        this.attempts.push({ op: input.operationId, start, end: performance.now(), result: code });
        let existing;
        try {
          existing = await this.w.operation(this.db, input.operationId);
        } catch (e) {
          if (!["Transport", "GatewayError", "SyncTimeout"].includes(errorCode(e) ?? "")) throw e;
        }
        if (existing?.status === "committed") {
          this.attempts.push({
            op: input.operationId,
            start,
            end: performance.now(),
            result: "original receipt",
          });
          return this.remember(input, existing);
        }
        if (performance.now() > deadline) throw error;
        await sleep(130);
      }
    }
  }
  async pinned(point: Receipt, reader = this.r) {
    const who = this.subjectOf.get(point.operationId)!;
    const expected = this.bySubject.get(who)!.flatMap((i) => {
      const ack = this.receipts.get(i.operationId);
      return ack && BigInt(ack.position.v) <= BigInt(point.position.v)
        ? i.rows
            .filter((r) => r.entity_id === who)
            .map((r) => ({ ...r, recorded_position: Number(ack.position.v) }))
        : [];
    });
    const rows = await reader.rows(this.db, {
      entityIds: [who],
      basis: { recordedPosition: Number(point.position.v), validAt: 10 },
      basisT: point.t.v,
    });
    const sorted = (x: readonly TripleRow[]) => [...x].sort((a, b) => a.id.localeCompare(b.id));
    assert.deepEqual(sorted(rows), sorted(expected));
    assert(expected.length > 0);
  }
  checkEntry(row: any) {
    const id = row.transaction.operationId,
      input = this.byOperation.get(id);
    assert(input, "Unexpected feed entry " + id);
    const ack = this.receipts.get(id);
    assert(ack, "Missing receipt for " + id);
    assert.equal(row.t, ack.t.v);
    assert.deepEqual(row.transaction, {
      positions: [ack.position.v],
      txIds: [input.claims[0]!.txId],
      commandIds: [input.claims[0]!.commandId],
      operationId: id,
      stamp: String(input.claims[0]!.timestamp),
      stampStatus: "decided",
      changes: input.rows
        .map((r) => ({
          op: "assert",
          entity: r.entity_id,
          attribute: r.attribute,
          assertionId: r.id,
          validFrom: r.valid_from,
          validTo: r.valid_to,
          position: ack.position.v,
        }))
        .sort((a, b) => (a.assertionId < b.assertionId ? -1 : 1)),
    });
  }
  async verify(from = this.cursor) {
    assert.equal(this.inputs.length, this.receipts.size);
    const sorted = [...this.inputs].sort((a, b) =>
      Number(
        BigInt(this.receipts.get(a.operationId)!.position.v) -
          BigInt(this.receipts.get(b.operationId)!.position.v),
      ),
    );
    assert.equal(
      new Set(sorted.map((i) => this.receipts.get(i.operationId)!.position.v)).size,
      sorted.length,
    );
    const expected = sorted.filter(
      (i) => BigInt(this.receipts.get(i.operationId)!.t.v) >= BigInt(from),
    );
    const lastBySubject = new Map<string, bigint>();
    for (const i of this.inputs) {
      const p = BigInt(this.receipts.get(i.operationId)!.position.v);
      const entity = this.subjectOf.get(i.operationId)!;
      assert(p > (lastBySubject.get(entity) ?? 0n));
      lastBySubject.set(entity, p);
    }
    const seen: string[] = [];
    let cursor = from;
    for (;;) {
      const page = await this.r.log(this.db, cursor, 64);
      for (const row of page.rows)
        if (row.kind === "commit") {
          this.checkEntry(row);
          seen.push(row.transaction.operationId);
        }
      cursor = page.nextT;
      if (!page.rows.length) break;
    }
    assert.deepEqual(
      seen,
      expected.map((i) => i.operationId),
    );
    const seedAudit = { subjects: 0, facts: 0, receiptAndClaimMs: 0, valueReadbackMs: 0 };
    const isSeed = (op: string) => op.startsWith(this.key + "-seed-");
    for (const input of this.inputs) {
      const started = performance.now();
      const receipt = this.receipts.get(input.operationId)!;
      assert.deepEqual(immutable(await this.r.operation(this.db, input.operationId)), receipt);
      assert.equal(
        await this.r.claim(this.db, input.claims[0]!.commandId, Number(receipt.position.v)),
        input.claims[0]!.txId,
      );
      if (isSeed(input.operationId)) seedAudit.receiptAndClaimMs += performance.now() - started;
    }
    // [DX-HA1] Why: an intact claim and log entry alone cannot prove the fact value survived. Rejected: auditing only transaction metadata following a restore.
    const last = sorted.at(-1)!;
    const headReceipt = this.receipts.get(last.operationId)!;
    for (const [entity, operations] of this.bySubject) {
      const started = performance.now();
      const expectedRows = operations.flatMap((i) =>
        i.rows.map((row) => ({
          ...row,
          recorded_position: Number(this.receipts.get(i.operationId)!.position.v),
        })),
      );
      const actual = await this.r.rows(this.db, {
        entityIds: [entity],
        basis: { recordedPosition: Number(headReceipt.position.v), validAt: 10 },
        basisT: headReceipt.t.v,
      });
      const order = (a: TripleRow, b: TripleRow) => a.id.localeCompare(b.id);
      assert.deepEqual([...actual].sort(order), expectedRows.sort(order));
      if (operations.length === 1 && isSeed(operations[0]!.operationId)) {
        seedAudit.subjects++;
        seedAudit.facts += actual.length;
        seedAudit.valueReadbackMs += performance.now() - started;
      }
    }
    const basis = await this.r.basis(this.db);
    assert.equal(basis.schemaHash, this.schema);
    assert.equal(basis.position.v, this.receipts.get(sorted.at(-1)!.operationId)!.position.v);
    return {
      from,
      next: cursor,
      operations: seen.length,
      acknowledged: this.receipts.size,
      seedAudit,
    };
  }
}
