import { Option } from "effect";
import { canonicalRow, typed } from "./canonical.ts";
import { Digest } from "./rng.ts";
import { ids, memberOf } from "./world.ts";
import type { Receipt } from "./composition.ts";
type Version = { row: any; from: number; until: number; a: number; b: number };
// [DX-R3] Why: expected full rows come from command intent plus acknowledged assertion identities/metadata.
// Rejected: using observed reads or the replica bootstrap as expected-state evidence.
export class FullRowModel {
  private seen = new Set<number>();
  private entities = new Map<string, Version[]>();
  private assertions = new Map<string, Version>();
  add(operations: readonly any[], receipt: Receipt, actor?: string) {
    if (this.seen.has(receipt.position)) throw Error("Duplicate expected receipt position");
    this.seen.add(receipt.position);
    if (
      !Number.isSafeInteger(receipt.position) ||
      receipt.position < 1 ||
      !Number.isFinite(receipt.instant)
    )
      throw Error("Invalid expected receipt basis");
    const keyOf = (e: string, a: string, v: any, from: number, to: number | undefined) =>
      memberOf(e, a, v) + JSON.stringify(typed([from, to]));
    const pool = new Map<string, any[]>();
    for (const t of receipt.triples) {
      const key = keyOf(
        t.entityId,
        t.attribute,
        t.value,
        t.validFrom ?? receipt.instant,
        t.validTo?._tag === "Some"
          ? t.validTo.value
          : typeof t.validTo === "number"
            ? t.validTo
            : undefined,
      );
      const rows = pool.get(key) ?? [];
      rows.push(t);
      pool.set(key, rows);
    }
    for (const op of operations) {
      if (op.op === "retract") {
        const old = this.assertions.get(op.id);
        if (!old) throw Error(`Missing expected retraction ${op.id}`);
        old.until = receipt.instant;
      } else if (op.op === "assert") {
        const source = pool
          .get(
            keyOf(op.entityId, op.attribute, op.value, op.validFrom ?? receipt.instant, op.validTo),
          )
          ?.shift();
        if (!source) throw Error("Receipt lacks expected assertion");
        if (!source.id || this.assertions.has(source.id))
          throw Error("Duplicate/missing expected assertion identity");
        const createdBy =
          op.createdBy ??
          actor ??
          (source.createdBy?._tag === "Some" ? source.createdBy.value : undefined);
        const row = {
          id: source.id,
          entityId: op.entityId,
          attribute: op.attribute,
          value: op.value,
          recordedAt: receipt.instant,
          validFrom: op.validFrom ?? receipt.instant,
          validTo: op.validTo === undefined ? Option.none() : Option.some(op.validTo),
          createdBy: createdBy ? Option.some(createdBy) : Option.none(),
          entityType: op.entityType ? Option.some(op.entityType) : Option.none(),
          schemaVersion: Option.some(1),
          txId: Option.some(receipt.txId),
          retractedAt: Option.none(),
          retractTxId: Option.none(),
        };
        const d = new Digest().add(canonicalRow(row));
        const v = { row, from: receipt.instant, until: Infinity, a: d.a, b: d.b };
        const body = this.entities.get(row.entityId) ?? [];
        body.push(v);
        this.entities.set(row.entityId, body);
        this.assertions.set(row.id, v);
      } else throw Error(`Unsupported expected operation ${op.op}`);
    }
  }
  // [DX-R3] Why: every possible reachable version contributes both temporal boundaries, including seed/shared rows.
  // Rejected: command summaries (omit validTo, seed expiry and retraction record times).
  boundaries(subject: number): { record: number[]; valid: number[] } {
    const record = new Set<number>(),
      valid = new Set<number>();
    const seen = new Set([ids.placement(subject)]),
      todo = [...seen];
    for (let i = 0; i < todo.length; i++)
      for (const v of this.entities.get(todo[i]!) ?? []) {
        record.add(v.from);
        if (Number.isFinite(v.until)) record.add(v.until);
        valid.add(v.row.validFrom);
        if (Option.isSome(v.row.validTo)) valid.add(v.row.validTo.value as number);
        if (v.row.value.type === "ref" && !seen.has(v.row.value.value)) {
          seen.add(v.row.value.value);
          todo.push(v.row.value.value);
        }
      }
    return { record: [...record].sort((a, b) => a - b), valid: [...valid].sort((a, b) => a - b) };
  }
  expected(subject: number, recordedAt: number, validAt: number): string {
    return this.summary(subject, recordedAt, validAt).digest;
  }
  summary(subject: number, recordedAt: number, validAt: number) {
    const seen = new Set([ids.placement(subject)]),
      todo = [...seen],
      d = new Digest();
    let stamp = -1;
    for (let i = 0; i < todo.length; i++)
      for (const v of this.entities.get(todo[i]!) ?? []) {
        const t = v.row;
        if (
          v.from > recordedAt ||
          v.until <= recordedAt ||
          t.validFrom > validAt ||
          (Option.isSome(t.validTo) && t.validTo.value <= validAt)
        )
          continue;
        d.a = (d.a + v.a) >>> 0;
        d.b = (d.b + v.b) >>> 0;
        d.n++;
        if (t.attribute === ":placement/stamp") stamp = Math.max(stamp, Number(t.value.value));
        if (t.value.type === "ref" && !seen.has(t.value.value)) {
          seen.add(t.value.value);
          todo.push(t.value.value);
        }
      }
    return { digest: d.hex(), facts: d.n, stamp };
  }
}
