import assert from "node:assert/strict";
import { canonical, sha256, V_W0 } from "../../../bench/lib/w0-world.ts";
import type { OutboxStore } from "../../../bench/lib/w0-outbox.ts";

import { packIndex, unpackIndex } from "./index-patch.ts";
type Base<T> = { value: T; position: number; hash: string };
type Encoded = { hash: string; value?: unknown; patch?: string; from?: number; base?: string };
export type Cell<T = unknown> = {
  base?: Base<T>;
  value: T;
  id: string;
  hash: string;
  position: number;
};
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
  private readonly bases = new Map<string, Base<unknown>>();
  async decode<T>(key: string, id: string, position: number, raw: string): Promise<Cell<T>> {
    const wire: Encoded = JSON.parse(raw);
    let value = wire.value,
      base: Base<unknown> | undefined;
    if (wire.patch !== undefined) {
      assert(
        (key === "tree" || key.startsWith("page:")) &&
          !Object.hasOwn(wire, "value") &&
          Number.isSafeInteger(wire.from) &&
          wire.from! > 0 &&
          wire.from! < position &&
          typeof wire.base === "string",
        "invalid index patch coordinates",
      );
      const k = key + "/" + wire.from + "/" + wire.base;
      base = this.bases.get(k);
      if (!base) {
        let original = (await this.many<unknown>([key], wire.from!)).get(key);
        if (!original || original.hash !== wire.base || original.position !== wire.from) {
          const { originalObject } = await import("./recovery.ts");
          original = await originalObject(
            this,
            key,
            wire.from!,
            (val) => hash([this.account, key, val]) === wire.base,
          );
        }
        assert(
          original.position === wire.from && original.hash === wire.base && !original.base,
          "patch requires immutable full base",
        );
        base = { position: original.position, hash: original.hash, value: original.value };
        if (this.bases.size >= 128) this.bases.delete(this.bases.keys().next().value!);
        this.bases.set(k, base);
      }
      value = unpackIndex(base.value, wire.patch);
    }
    assert.equal(hash([this.account, key, value]), wire.hash, "incorrect or misbound object bytes");
    return {
      id,
      position,
      hash: wire.hash,
      value: value as T,
      ...(base ? { base: base as Base<T> } : {}),
    };
  }
  async many<T>(keys: readonly string[], position: number): Promise<Map<string, Cell<T>>> {
    const unique = [...new Set(keys)],
      out = new Map<string, Cell<T>>();
    for (let at = 0; at < unique.length; at += 64) {
      const batch = unique.slice(at, at + 64),
        entities = new Map(batch.map((k) => [this.entity(k), k]));
      const basis = { position, validAt: V_W0 },
        answer = await this.comp.sweepPage([...entities.keys()], basis);
      assert.deepEqual(answer.reportedBasis, basis);
      for (const row of answer.rows) {
        const k = entities.get(row.entityId);
        assert(k && !out.has(k) && row.attribute === "delta/object" && row.position <= position);
        out.set(k, await this.decode<T>(k, row.id, row.position, row.value.value));
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
      const content = hash([this.account, p.key, p.value]);
      let bytes = canonical({ hash: content, value: p.value });
      if (p.prior && (p.key === "tree" || p.key.startsWith("page:"))) {
        const b = p.prior.base ?? p.prior,
          delta = canonical({
            hash: content,
            from: b.position,
            base: b.hash,
            patch: packIndex(b.value, p.value),
          });
        if (Buffer.byteLength(delta) < Buffer.byteLength(bytes)) bytes = delta;
      }
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
      ids: new Map(result.value.triples.map((t) => [t.entityId, t.id])),
      assertions: assertions.size,
      operations: ops.length,
      bytes: Buffer.byteLength(JSON.stringify(ops)),
    };
  }
}
