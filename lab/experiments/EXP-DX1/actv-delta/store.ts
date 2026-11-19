import assert from "node:assert/strict";
import { canonical, sha256, V_W0 } from "../../../bench/lib/w0-world.ts";
import type { OutboxStore } from "../../../bench/lib/w0-outbox.ts";

export type Cell<T = unknown> = { value: T; id: string; hash: string; position: number };
export type Patch = { key: string; value: unknown; prior?: Cell };
export const hash = (v: unknown) => sha256(canonical(v));
export class Conflict extends Error {}
export class Objects {
  readonly comp: OutboxStore;
  readonly account: string;
  constructor(comp: OutboxStore, account: string) {
    this.comp = comp;
    this.account = account;
    assert(/^[a-zA-Z0-9_-]{1,96}$/.test(account));
  }
  entity(k: string) {
    return "actv-delta:" + this.account + ":" + k;
  }
  async many<T>(keys: readonly string[], position: number): Promise<Map<string, Cell<T>>> {
    const unique = [...new Set(keys)],
      out = new Map<string, Cell<T>>();
    for (let at = 0; at < unique.length; at += 128) {
      const batch = unique.slice(at, at + 128),
        entities = new Map(batch.map((k) => [this.entity(k), k]));
      const basis = { position, validAt: V_W0 },
        answer = await this.comp.sweepPage([...entities.keys()], basis);
      assert.deepEqual(answer.reportedBasis, basis);
      for (const row of answer.rows) {
        const k = entities.get(row.entityId);
        assert(k && !out.has(k) && row.attribute === "delta/object" && row.position <= position);
        const { value, hash: claimed } = JSON.parse(row.value.value);
        assert.equal(hash([this.account, k, value]), claimed, "incorrect or misbound object bytes");
        out.set(k, { id: row.id, position: row.position, hash: claimed, value });
      }
    }
    return out;
  }
  async get<T>(key: string, position: number): Promise<Cell<T>> {
    const cell = (await this.many<T>([key], position)).get(key);
    assert(cell, "missing durable object " + key);
    return cell;
  }
  async commit(
    command: string,
    patches: Patch[],
    guards: { key: string; cell: Cell | undefined }[] = [],
    nativeOps: readonly unknown[] = [],
    nativePreconditions: readonly unknown[] = [],
  ) {
    const preconditions = [
      ...nativePreconditions,
      ...guards.map(({ key, cell }) => ({
        _tag: "EntityState",
        entityId: this.entity(key),
        tripleIds: cell ? [cell.id] : [],
      })),
    ];
    const ops: any[] = [...nativeOps];
    const assertions = new Map<string, string>();
    for (const p of patches) {
      const entityId = this.entity(p.key);
      assert(!assertions.has(entityId), "duplicate object in transaction");
      if (p.prior) ops.push({ op: "retract", id: p.prior.id });
      const bytes = canonical({ hash: hash([this.account, p.key, p.value]), value: p.value });
      assertions.set(entityId, bytes);
      ops.push({
        op: "assert",
        entityId,
        attribute: "delta/object",
        value: { type: "string", value: bytes },
        validFrom: 0,
      });
    }
    const result = await this.comp.transact(ops, {
      actor: "activation-delta",
      commandId: this.entity("cmd:" + command),
      preconditions,
    });
    if (!result.ok) {
      if (
        result.tag === "TransactionConflictError" ||
        result.tag === "CommandAlreadyCommittedError"
      )
        throw new Conflict(result.tag);
      throw Error("DELTA commit rejected " + result.tag + " " + String(result.error?.message));
    }
    const effect = (r: any) => canonical([r.entityId, r.attribute, r.value, r.validFrom]);
    assert.deepEqual(
      result.value.triples.map(effect).sort(),
      ops
        .filter((r) => r.op === "assert")
        .map(effect)
        .sort(),
      "source or index assertions differ from the atomic request",
    );
    const actual = new Map(
      result.value.triples
        .filter((r) => r.attribute === "delta/object")
        .map((r) => [r.entityId, r.value.value]),
    );
    assert.deepEqual(actual, assertions, "native receipt lacks requested object bytes");
    return {
      position: result.value.position,
      txId: result.value.txId,
      assertions: assertions.size,
      operations: ops.length,
      bytes: Buffer.byteLength(JSON.stringify(ops)),
    };
  }
}
