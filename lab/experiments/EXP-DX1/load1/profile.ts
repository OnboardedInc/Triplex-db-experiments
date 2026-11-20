import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as api from "../../../../packages/datomic/dist/index.js";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import { ModelJournal } from "../../../bench/lib/model-journal.ts";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import { frames, identity, sourceId } from "./source.ts";
import { ack, lookup } from "./oracle.ts";

export async function profile(
  comp: CompositionHandle,
  scope: string,
  subjects: number,
  dir: string,
  arm: string,
) {
  const nonce = process.env.TRIPLEX_TRACE_RUN!,
    source = process.env.TRIPLEX_TRACE_SOURCE!,
    slot = process.env.TRIPLEX_TRACE_SLOT!;
  const journal = new ModelJournal(path.join(dir, arm + ".model"), {
    run: nonce,
    source,
    slot,
    subjects,
  });
  const rows: any[] = [],
    summaries = new Map<number, ReturnType<typeof ack>>();
  const sourceSeal = sourceId("seed", subjects),
    iterator = frames("seed", subjects, 2000);
  const native = api.DatomicClient.prototype.transact;
  let current: any;
  api.DatomicClient.prototype.transact = async function (db, input, onSent) {
    assert(current && input.claims.length === 1 && current.command === input.claims[0]!.commandId);
    assert.equal(
      db,
      "s2-" + Buffer.from(String(runtimeApi.DatabaseScope.test(scope))).toString("base64url"),
    );
    const requests: any[] = [],
      observe = this.onRequest;
    this.onRequest = (s) => {
      if (s.operationId === input.operationId && s.path.endsWith("/transact")) requests.push(s);
      observe?.(s);
    };
    try {
      const reply: any = await native.call(this, db, input, onSent);
      assert.equal(reply.operationId, input.operationId);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].position, Number(reply.position.v));
      assert(Array.isArray(reply.loadProfile?.tx) && reply.loadProfile.tx.length === 5);
      Object.assign(current, {
        rows: input.rows.length,
        newIds: input.newIds.length,
        native: reply.loadProfile,
        timeline: reply.timeline,
        request: requests[0],
        db,
        datoms: reply.datoms,
        operation: input.operationId,
      });
      return reply;
    } finally {
      this.onRequest = observe;
    }
  };
  const t0 = performance.now(),
    cpu = process.cpuUsage();
  try {
    for (;;) {
      const start = performance.now(),
        item = iterator.next();
      if (item.done) break;
      const f = item.value,
        meta = identity(scope, sourceSeal, 2000, f),
        built = performance.now();
      current = {
        command: meta.commandId,
        facts: f.operations.length,
        first: f.first,
        buildMs: built - start,
      };
      const trace = api.beginTrace("commit", "load1.seed", { command: meta.commandId })!;
      const result = await api.withTrace(trace, () => comp.transact(f.operations, meta));
      const returned = performance.now();
      api.finishTrace(trace);
      if (!result.ok) throw Error(result.tag + " " + String(result.error?.message));
      assert(
        current.request &&
          result.value.position === current.request.position &&
          trace.run === nonce &&
          trace.source === source &&
          trace.slot === slot,
      );
      const journalStart = performance.now();
      journal.bindReceipt(f.operations, result.value, meta.actor);
      const journalEnd = performance.now();
      summaries.set(f.first, ack(f, result.value));
      rows.push({
        ...current,
        publicMs: returned - built,
        journalMs: journalEnd - journalStart,
        checkMs: performance.now() - journalEnd,
        traceId: trace.traceId,
        spans: trace.spans.map((s) => [s.name, s.end - s.start]),
        position: result.value.position,
      });
    }
  } finally {
    api.DatomicClient.prototype.transact = native;
  }
  const elapsedMs = performance.now() - t0,
    used = process.cpuUsage(cpu);
  const seal = journal.seal();
  assert.equal(seal.frames, summaries.size);
  for (const f of frames("seed", subjects, 2000))
    assert.deepEqual(
      await lookup(comp, f, identity(scope, sourceSeal, 2000, f)),
      summaries.get(f.first),
    );
  assert.equal(await comp.currentPosition(), summaries.size);
  fs.writeFileSync(
    path.join(dir, arm + ".frames.json"),
    JSON.stringify({ nonce, source, slot, scope, sourceSeal, rows }),
    { flag: "wx" },
  );
  return {
    scope,
    sourceSeal,
    commands: rows.length,
    facts: rows.reduce((n, r) => n + r.facts, 0),
    elapsedMs,
    cpu: used,
    journalBytes: seal.bytes,
    journalSha: seal.sha256,
  };
}
