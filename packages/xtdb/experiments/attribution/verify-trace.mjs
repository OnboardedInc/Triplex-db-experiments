// @ts-nocheck -- [EXP-CHECKJS-R2] unannotated dynamic parameters; dynamic record keys. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Read-only verification of retained driver observations, not engine execution proof. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { openContext } from "../../../../qualification/devloop/state.mjs";
import { verifyAttempt } from "../../../../qualification/devloop/evidence.mjs";

const root = path.resolve(import.meta.dirname, "../../../..");
const args = process.argv.slice(2),
  option = (key) => args[args.indexOf(key) + 1];
assert(args.includes("--run") && args.includes("--output"));
const [jobId, attemptId] = option("--run").split("/");
const checked = await verifyAttempt(await openContext(root), jobId, attemptId);
assert.equal(checked.terminal.cleanup.groupGone, true);
if (!args.includes("--inspect-failed"))
  assert.equal(checked.terminal.status, "completed_verified_bytes");
const directory = path.join(root, ".devloop/jobs", jobId, "attempts", attemptId);
const traceFile = path.join(directory, "artifacts/xtdb-driver-trace.jsonl");
const bytes = await readFile(traceFile);
assert(bytes.length <= 16 * 1024 ** 2);
const events = bytes
  .toString()
  .trimEnd()
  .split("\n")
  .map((line) => JSON.parse(line));
assert(events.length >= 2);
const header = events[0],
  footer = events.at(-1);
assert.equal(header.type, "trace-header");
assert.equal(header.driver, "postgres3.4.9");
assert.equal(header.admission.jobId, jobId);
assert.equal(header.admission.attemptId, attemptId);
assert.equal(header.admission.manifestSha256, checked.terminal.manifestSha256);
assert.equal(header.pid, checked.terminal.commandOutcome.pid);
assert.equal(footer.type, "trace-footer");
assert.equal(footer.status, "COMPLETE");
assert(!/postgres(?:ql)?:\/\//i.test(bytes.toString()), "A DB URL escaped trace redaction");
const pools = new Map(),
  leases = new Map(),
  queries = new Map();
let previousTime = -Infinity;
const counts = { issued: 0, dispatched: 0, fulfilled: 0, rejected: 0, cancelRequests: 0 };
const byKind = {},
  reserveWaits = [];
for (const [index, event] of events.entries()) {
  assert.equal(event.sequence, index + 1);
  assert(Number.isFinite(event.atProcessMonotonicMs));
  assert(event.atProcessMonotonicMs >= previousTime);
  previousTime = event.atProcessMonotonicMs;
  for (const description of [event.error, event.firstFailure].filter(Boolean)) {
    assert.equal(typeof description, "object");
    assert(!Object.hasOwn(description, "message"), "Raw observer error text was retained");
    if (description.name !== "UninspectableError") {
      assert(/^[a-f0-9]{64}$/.test(description.messageSha256));
      assert(
        Number.isSafeInteger(description.messageUtf8Bytes) && description.messageUtf8Bytes >= 0,
      );
    }
    if (description.sqlState !== undefined) assert(/^[0-9A-Z]{5}$/.test(description.sqlState));
  }
  if (event.type === "pool-created") {
    assert(!pools.has(event.poolId));
    pools.set(event.poolId, { ended: false });
  } else if (event.type === "pool-end-fulfilled") {
    assert(pools.has(event.poolId));
    pools.get(event.poolId).ended = true;
  } else if (event.type === "reserve-start") {
    assert(!leases.has(event.leaseId));
    leases.set(event.leaseId, { poolId: event.poolId, fulfilled: false, released: false });
  } else if (event.type === "reserve-fulfilled") {
    const lease = leases.get(event.leaseId);
    assert(lease && lease.poolId === event.poolId);
    lease.fulfilled = true;
    assert(event.waitMs >= 0);
    reserveWaits.push(event.waitMs);
  } else if (event.type === "lease-release") {
    const lease = leases.get(event.leaseId);
    assert(lease?.fulfilled && !lease.released);
    lease.released = true;
  } else if (event.type === "query-issued") {
    assert(!queries.has(event.queryId));
    const lease = leases.get(event.leaseId);
    assert(lease?.fulfilled && !lease.released);
    if (event.kind === "await-token-setting")
      assert.equal(event.sql, "SET AWAIT_TOKEN = <redacted>");
    assert(/^[a-f0-9]{64}$/.test(event.sqlSha256));
    queries.set(event.queryId, { issued: event, dispatched: false, settled: false });
    counts.issued++;
    byKind[event.kind] ??= {
      issued: 0,
      fulfilled: 0,
      rejected: 0,
      driverDispatchToSettlementMilliseconds: [],
    };
    byKind[event.kind].issued++;
  } else if (event.type === "query-handler-dispatch") {
    const query = queries.get(event.queryId);
    assert(query && !query.dispatched);
    query.dispatched = true;
    counts.dispatched++;
    assert(event.afterIssueMs >= 0);
  } else if (event.type === "query-driver-settlement") {
    const query = queries.get(event.queryId);
    assert(query && !query.settled);
    query.settled = true;
    assert(["fulfilled", "rejected"].includes(event.status));
    counts[event.status]++;
    assert(event.afterIssueMs >= 0);
    byKind[query.issued.kind][event.status]++;
    if (event.afterHandlerDispatchMs !== undefined) {
      assert(event.afterHandlerDispatchMs >= 0);
      byKind[query.issued.kind].driverDispatchToSettlementMilliseconds.push(
        event.afterHandlerDispatchMs,
      );
    }
  } else if (event.type === "query-cancel-request") {
    assert(queries.has(event.queryId));
    counts.cancelRequests++;
  }
}
assert([...pools.values()].every((pool) => pool.ended));
assert([...leases.values()].filter((lease) => lease.fulfilled).every((lease) => lease.released));
assert([...queries.values()].every((query) => query.settled));
assert.deepEqual(counts, footer.snapshot.queries);
assert.equal(footer.snapshot.pools, pools.size);
assert.equal(footer.snapshot.openPools, 0);
assert.equal(footer.snapshot.unreleasedLeases, 0);
assert.equal(footer.snapshot.unsettledQueries, 0);
assert.equal(footer.snapshot.observerErrors, 0);
const output = path.resolve(root, option("--output"));
assert(output.startsWith(path.join(root, "qualification/evidence") + path.sep));
const receipt = {
  format: "triplex-driver-observation-verification/1",
  at: new Date().toISOString(),
  reference: option("--run"),
  terminalStatus: checked.terminal.status,
  terminalSha256: checked.terminalSha256,
  traceBytes: (await stat(traceFile)).size,
  traceSha256: createHash("sha256").update(bytes).digest("hex"),
  traceEvents: events.length,
  pools: pools.size,
  leases: leases.size,
  driverQueryCounts: counts,
  driverStatementsByKind: byKind,
  reserveWaitMilliseconds: reserveWaits,
  observerWriteMilliseconds: footer.observerWriteMilliseconds,
  sourcePreimages: checked.sourcePreimages,
  verifierSourceSha256: createHash("sha256")
    .update(await readFile(new URL(import.meta.url)))
    .digest("hex"),
  interpretation:
    "Retained callback/cut/semantic byte gates only. These are driver issue/handler-dispatch/settlement spans, not independent wire execution or exact engine/indexing time. Component tests, not trace JSON alone, check lazy object transparency.",
};
await writeFile(output, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
console.log(
  JSON.stringify({
    output: path.relative(root, output),
    reference: receipt.reference,
    terminalStatus: receipt.terminalStatus,
    traceBytes: receipt.traceBytes,
    traceEvents: receipt.traceEvents,
    pools: receipt.pools,
    leases: receipt.leases,
    driverQueryCounts: counts,
    sourcePreimages: receipt.sourcePreimages,
  }),
);
