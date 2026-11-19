import assert from "node:assert/strict";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import { readOutboxAt } from "../../../bench/lib/w0-outbox-state.ts";
import { W0, canonical, sha256, type WorldRow } from "../../../bench/lib/w0-world.ts";

export type Store = Pick<
  CompositionHandle,
  "scopeName" | "currentPosition" | "sweepPage" | "transactionByCommand" | "transact"
>;
export const prefix = "staged:v1:";
export type Cell<T> = { key: string; id: string; at: number; data: T };
export type Op =
  | {
      op: "assert";
      entityId: string;
      attribute: string;
      value: { type: string; value: any };
      validFrom: number;
      validTo?: number;
    }
  | { op: "retract"; id: string };
export type Condition =
  | { _tag: "TripleLive"; id: string }
  | { _tag: "EntityState"; entityId: string; tripleIds: string[] };
export class Conflict extends Error {}
export class NotReady extends Error {}
export const absent = (key: string): Condition => ({
  _tag: "EntityState",
  entityId: prefix + key,
  tripleIds: [],
});
export const live = (cell: Cell<unknown>): Condition => ({ _tag: "TripleLive", id: cell.id });
export const set = (key: string, value: unknown): Op => ({
  op: "assert",
  entityId: prefix + key,
  attribute: "staged/value",
  value: { type: "string", value: canonical(value) },
  validFrom: 0,
});
export const replace = (cell: Cell<unknown>, value: unknown): Op[] => [
  { op: "retract", id: cell.id },
  set(cell.key, value),
];

// [DX-STG1] Why: W0 sequences and receiver counters are arbitrary integers, while kernel source positions are safe integers. Rejected: rounding a JSON number before converting it to BigInt.
export function decode<T>(bytes: string): T {
  return JSON.parse(bytes, ((key: string, value: unknown, ctx: { source?: string }) =>
    (key === "seq" || key === "done") && typeof value === "number"
      ? BigInt(ctx.source!)
      : value) as Parameters<typeof JSON.parse>[1]);
}
export const validMillis = (instant: string) => {
  assert(W0.isInstant(instant), "Invalid W0 instant");
  const result = Date.parse(instant.slice(0, 23) + "Z") + Number(instant.slice(23, 26)) / 1000;
  assert(Number.isFinite(result));
  return result;
};
export function safeName(value: string) {
  assert(/^[A-Za-z0-9_.-]{1,100}$/.test(value), "Invalid deployment or command name");
  return value;
}
export class Repository {
  readonly store: Store;
  readonly scope: string;
  constructor(store: Store) {
    assert(store.scopeName);
    this.scope = store.scopeName;
    this.store = store;
  }
  async cells<T>(keys: string[], at: number): Promise<Map<string, Cell<T>>> {
    const rows = await readOutboxAt(
      this.store,
      keys.map((k) => prefix + k),
      at,
    );
    const result = new Map<string, Cell<T>>();
    for (const row of rows.rows) {
      const key = row.entityId.slice(prefix.length);
      assert(
        row.entityId.startsWith(prefix) &&
          keys.includes(key) &&
          !result.has(key) &&
          row.position <= at,
      );
      assert(row.attribute === "staged/value" && row.value.type === "string");
      result.set(key, { key, id: row.id, at: row.position, data: decode<T>(row.value.value) });
    }
    return result;
  }
  async cell<T>(key: string, at: number) {
    return (await this.cells<T>([key], at)).get(key);
  }
  async must<T>(key: string, at: number) {
    const row = await this.cell<T>(key, at);
    assert(row, "Missing " + key);
    return row;
  }
  command(id: string) {
    return prefix + "op:" + sha256(id);
  }
  async recovered(id: string, intent: unknown) {
    const commandId = this.command(id);
    const r = await this.store.transactionByCommand(commandId);
    if (!r.ok) throw Error(r.tag);
    if (!r.value) return;
    const { txId, position } = r.value;
    assert(
      r.value.commandId === commandId && txId && Number.isSafeInteger(position) && position > 0,
    );
    const marker = (r.value.changes ?? r.value.triples).filter(
      (c: WorldRow & { op?: string }) =>
        c.entityId === commandId && c.attribute === "staged/value" && c.op !== "retract",
    );
    assert.equal(marker.length, 1, "Missing original command marker");
    assert.equal(
      marker[0].value.value,
      canonical(sha256(canonical([this.scope, id, intent]))),
      "Command identity reused with different intent",
    );
    return { txId: String(txId), position: Number(position) };
  }
  async write(id: string, intent: unknown, ops: Op[], preconditions: Condition[]) {
    const commandId = this.command(id);
    const claim = set(commandId.slice(prefix.length), sha256(canonical([this.scope, id, intent])));
    const r = await this.store.transact([...ops, claim], {
      commandId,
      actor: "staged-v1",
      preconditions,
    });
    if (r.ok) {
      assert(
        r.value.triples.some(
          (t) => t.entityId === commandId && t.value.value === claim.value.value,
        ),
      );
      return { txId: r.value.txId, position: r.value.position };
    }
    const prior = await this.recovered(id, intent);
    if (prior) return prior;
    if (r.tag === "TransactionConflictError") throw new Conflict("Contended " + id);
    throw Error(r.tag + " " + String(r.error?.message ?? ""));
  }
}

export interface Block<T> {
  scope: string;
  generation: string;
  type: "page" | "index";
  body: T;
}
export type Ref = {
  hash: string;
  first: number;
  last: number;
  count: number;
  owed: number;
  members: string;
};
export const pageWidth = 32,
  fanout = 32;
export function bucket(subject: string) {
  assert(/^pl:s\d{8}$/.test(subject), "Expected numbered W0 subject");
  return Math.floor(Number(subject.slice(4)) / pageWidth);
}
export const digest = (data: unknown) => sha256(canonical(data));
export class Blocks {
  readonly db: Repository;
  readonly generation: string;
  bytes = 0;
  constructor(db: Repository, generation: string) {
    this.db = db;
    this.generation = generation;
  }
  async put<T>(type: Block<T>["type"], bodies: T[], fence: Cell<unknown>) {
    const blobs = bodies.map((body) => {
      const raw = canonical({ scope: this.db.scope, generation: this.generation, type, body });
      const key = "block:" + sha256(raw);
      return { key, bytes: deflateRawSync(raw).toString("base64") };
    });
    const keys = [...new Set(blobs.map((x) => x.key))];
    const existing = await this.db.cells<string>(keys, await this.db.store.currentPosition());
    const fresh = blobs.filter(
      (v, i) => !existing.has(v.key) && blobs.findIndex((x) => x.key === v.key) === i,
    );
    let at = await this.db.store.currentPosition();
    if (fresh.length) {
      const id = "blocks:" + digest(fresh.map((x) => x.key));
      const saved = await this.db.write(
        id,
        fresh.map((x) => x.key),
        fresh.map((x) => set(x.key, x.bytes)),
        [live(fence), ...fresh.map((x) => absent(x.key))],
      );
      at = saved.position;
      this.bytes += fresh.reduce((s, x) => s + Buffer.byteLength(x.bytes), 0);
    }
    // [DX-STG1] Why: seal only blocks whose actual committed bytes decode to their scoped content address. Rejected: a worker's count or returned hash as a coverage proof.
    const read = await this.db.cells<string>(keys, at);
    return blobs.map(({ key }) => {
      const cell = read.get(key);
      assert(cell && key === "block:" + sha256(inflateRawSync(Buffer.from(cell.data, "base64"))));
      return key.slice(6);
    });
  }
  async get<T>(ref: string, type: Block<T>["type"], at: number): Promise<T> {
    const row = await this.db.must<string>("block:" + ref, at);
    const bytes = inflateRawSync(Buffer.from(row.data, "base64"));
    assert.equal(sha256(bytes), ref);
    const block = decode<Block<T>>(bytes.toString("utf8"));
    assert(
      block.scope === this.db.scope && block.generation === this.generation && block.type === type,
    );
    return block.body;
  }
}
