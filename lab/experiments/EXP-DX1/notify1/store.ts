import assert from "node:assert/strict";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import { readOutboxAt } from "../../../bench/lib/w0-outbox-state.ts";
import { canonical, sha256 } from "../../../bench/lib/w0-world.ts";

export type Store = Pick<
  CompositionHandle,
  "currentPosition" | "sweepPage" | "transactionByCommand" | "transact" | "scopeName"
>;
export type Op =
  | {
      op: "assert";
      entityId: string;
      attribute: string;
      value: any;
      validFrom: number;
      validTo?: number;
    }
  | { op: "retract"; id: string };
export type Check =
  | { _tag: "TripleLive"; id: string }
  | { _tag: "EntityState"; entityId: string; tripleIds: string[] };
export interface Row<T> {
  key: string;
  id: string;
  at: number;
  value: T;
}
export interface Ack {
  position: number;
  txId: string;
}
export const hash = (v: unknown) => sha256(canonical(v));
export class Conflict extends Error {}
export function parse<T>(s: string): T {
  return JSON.parse(s, ((k: string, v: unknown, ctx: { source?: string }) =>
    (k === "seq" || k === "done") && typeof v === "number" ? BigInt(ctx.source!) : v) as Parameters<
    typeof JSON.parse
  >[1]);
}
// [DX-STG1] Why: Datomic stores one bounded batch as a value and W0 counters must retain their exact digits. Rejected: JSON.parse followed by BigInt on an already-rounded sequence.
export const pack = (v: unknown) => deflateRawSync(canonical(v)).toString("base64");
export const unpack = <T>(v: string): T =>
  parse<T>(inflateRawSync(Buffer.from(v, "base64")).toString());
export class Documents {
  readonly store: Store;
  readonly account: string;
  readonly prefix: string;
  constructor(store: Store, account: string) {
    assert(store.scopeName && /^[a-zA-Z0-9_.-]{1,100}$/.test(account));
    this.store = store;
    this.account = account;
    this.prefix = "notice:v1:" + hash([store.scopeName, account]) + ":";
  }
  head() {
    return this.store.currentPosition();
  }
  async rows<T>(keys: string[], at: number) {
    const roots = new Set(keys.map((k) => this.prefix + k));
    const { rows } = await readOutboxAt(this.store, [...roots], at);
    const result = new Map<string, Row<T>>();
    for (const r of rows) {
      const k = r.entityId.slice(this.prefix.length);
      assert(
        roots.has(r.entityId) &&
          !result.has(k) &&
          r.attribute === "notice/value" &&
          r.value.type === "string" &&
          r.position <= at,
      );
      result.set(k, { key: k, id: r.id, at: r.position, value: parse<T>(r.value.value) });
    }
    return result;
  }
  async row<T>(k: string, at: number) {
    return (await this.rows<T>([k], at)).get(k);
  }
  async get<T>(k: string, at: number) {
    const v = await this.row<T>(k, at);
    assert(v, "Missing durable " + k);
    return v;
  }
  put(k: string, value: unknown): Extract<Op, { op: "assert" }> {
    return {
      op: "assert",
      entityId: this.prefix + k,
      attribute: "notice/value",
      value: { type: "string", value: canonical(value) },
      validFrom: 0,
    };
  }
  change<T>(k: string, old: Row<T> | undefined, value: unknown): Op[] {
    return [...(old ? [{ op: "retract" as const, id: old.id }] : []), this.put(k, value)];
  }
  guard(k: string, old: Row<unknown> | undefined): Check {
    return old
      ? { _tag: "TripleLive", id: old.id }
      : { _tag: "EntityState", entityId: this.prefix + k, tripleIds: [] };
  }
  command(id: string) {
    return this.prefix + "claim:" + hash(id);
  }
  async original(id: string, intent: unknown): Promise<Ack | undefined> {
    const commandId = this.command(id),
      found = await this.store.transactionByCommand(commandId);
    if (!found.ok) throw Error(found.tag);
    if (!found.value) return;
    const r = found.value;
    assert(
      r.txId && r.commandId === commandId && Number.isSafeInteger(r.position) && r.position > 0,
    );
    const markers = (r.changes ?? r.triples).filter(
      (x: any) => x.entityId === commandId && x.attribute === "notice/value" && x.op !== "retract",
    );
    assert(
      markers.length === 1 && markers[0].value.value === canonical(hash([this.prefix, id, intent])),
      "Operation ID content mismatch",
    );
    return { position: r.position, txId: r.txId };
  }
  async commit(id: string, intent: unknown, ops: Op[], checks: Check[]): Promise<Ack> {
    const claim = this.put("claim:" + hash(id), hash([this.prefix, id, intent]));
    const result = await this.store.transact([...ops, claim], {
      commandId: this.command(id),
      actor: "notice-v1",
      preconditions: checks,
    });
    if (result.ok) {
      assert(
        result.value.triples.some(
          (t) => t.entityId === claim.entityId && t.value.value === claim.value.value,
        ),
      );
      return { position: result.value.position, txId: result.value.txId };
    }
    const prior = await this.original(id, intent);
    if (prior) return prior;
    if (result.tag === "TransactionConflictError")
      throw new Conflict("Serial precondition changed");
    throw Error(result.tag + " " + String(result.error?.message ?? ""));
  }
}
