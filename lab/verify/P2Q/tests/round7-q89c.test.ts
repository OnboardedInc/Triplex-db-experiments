// [CX-VP2Q-4-R7] Why: Q89c requires a typed refusal instead of silently answering another basis.
// Rejected: checking only outside-transaction future reads (the transaction uses a different basis branch).
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ModelReplica, freshDir, openRt, ops, attempt, at, writeJson } from "./harness.js";
import { graphIri } from "../../../../packages/qlever/src/rdf.js";

describe("round7 Q89c future repository basis refuses typed", () => {
  it.each(["getByEntity", "getByEntities", "query"].flatMap(route => [false, true].map(transaction => ({ route, transaction }))))("$route transaction=$transaction", async ({ route, transaction }) => {
    const scope = `round7-q89c:${randomUUID()}`;
    const replica = new ModelReplica(graphIri(scope));
    const rt = await openRt(freshDir("q89c"), scope, replica, { autoApply: false }, { basisWaitMs: 40 });
    try {
      await rt.run(rt.triples.transact(ops("s:q89c", 1, "visible")));
      const headBefore = rt.broker.head();
      const future = (rt.broker.durable().lsn + 4) * 1024;
      const effect = route === "getByEntity" ? rt.adapter.getByEntity("s:q89c", at(future))
        : route === "getByEntities" ? rt.adapter.getByEntities(["s:q89c"], at(future))
        : rt.adapter.query({ entityId: "s:q89c" }, at(future));
      const start = performance.now();
      const outcome = await attempt(rt, transaction ? rt.adapter.withTransaction(effect as any) : effect as any);
      const value = outcome.ok ? outcome.value : undefined;
      writeJson(`round7-q89c-${route}-${transaction ? "transaction" : "outside"}.json`, { route, transaction, headBefore, future, headAfter: rt.broker.head(), elapsedMs: performance.now() - start, ok: outcome.ok, rows: Array.isArray(value) ? value.length : value instanceof Map ? [...value].map(([id, rows]) => ({ id, rows: rows.length })) : value, error: outcome.error ? { tag: outcome.error._tag, reason: outcome.error.reason, required: outcome.error.required, observed: outcome.error.observed, message: outcome.error.message } : null });
      expect(outcome.ok).toBe(false);
      expect(outcome.error).toMatchObject({ _tag: "ReadError", reason: "basis-not-reached", required: future });
    } finally { await rt.dispose(); await rt.broker.close(); }
  });
});
