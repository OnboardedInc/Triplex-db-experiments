// [CX-VP2Q-4-R7] Why: an absent entity at the captured cut cannot settle absence at an unpublished basis.
// Rejected: accepting an empty successful read as a refusal (Q89c requires the error channel).
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { ModelReplica, freshDir, openRt, ops, attempt, at, writeJson } from "./harness.js";
import { graphIri } from "../../../../packages/qlever/src/rdf.js";
it("Q89c unpublished transactional basis must not return a successful empty result", async () => {
  const scope = `round7-q89c-empty:${randomUUID()}`;
  const rt = await openRt(freshDir("q89c-empty"), scope, new ModelReplica(graphIri(scope)), { autoApply: false }, { basisWaitMs: 40 });
  try {
    await rt.run(rt.triples.transact(ops("s:present", 1, "present")));
    const captured = rt.broker.head(), future = (rt.broker.durable().lsn + 4) * 1024;
    const start = performance.now();
    const outcome = await attempt(rt, rt.adapter.withTransaction(rt.adapter.getByEntity("s:not-yet", at(future))));
    writeJson("round7-q89c-empty.json", { captured, future, headAfter: rt.broker.head(), elapsedMs: performance.now() - start, ok: outcome.ok, value: outcome.ok ? outcome.value : null, error: outcome.error ? { tag: outcome.error._tag, reason: outcome.error.reason } : null });
    expect(outcome.ok).toBe(false);
    expect(outcome.error?.reason).toBe("basis-not-reached");
  } finally { await rt.dispose(); await rt.broker.close(); }
});
