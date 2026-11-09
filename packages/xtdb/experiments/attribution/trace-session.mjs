// @ts-nocheck -- [EXP-CHECKJS-R2] unannotated local values; unannotated dynamic parameters; initially empty collections. Binding errors remain checked by lab/bin/checkjs.mjs.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { closeSync, openSync, readFileSync, realpathSync, writeFileSync, writeSync } from "node:fs";
import path from "node:path";
import { makePostgresObserver, safeErrorInfo } from "./observe-postgres.mjs";

const root = path.resolve(import.meta.dirname, "../../../..");
const admissionPath = realpathSync(process.env.TRIPLEX_RESOURCE_ADMISSION ?? "");
assert(admissionPath.startsWith(realpathSync(root) + path.sep));
const admissionBytes = readFileSync(admissionPath);
assert.equal(
  createHash("sha256").update(admissionBytes).digest("hex"),
  process.env.TRIPLEX_RESOURCE_ADMISSION_SHA256,
);
const admission = JSON.parse(admissionBytes.toString());
assert.equal(admission.format, "triplex-devloop-resource-admission/1");
assert.equal(admission.proofPolicy, "portable-export-devloop-v1");
assert.equal(admission.state, "ADMITTED");
assert.equal(admission.localResourcesOnly, true);
assert.equal(path.resolve(admission.root), root);
assert.equal(admission.backend, "xtdb");
process.kill(admission.controller.pid, 0);
const artifacts = path.resolve(root, admission.directory, "artifacts");
assert(artifacts.startsWith(root + path.sep));
const output = path.join(artifacts, "xtdb-driver-trace.jsonl");
const checksOutput = path.join(artifacts, "xtdb-driver-checks.json");
const maximumBytes = 16 * 1024 ** 2;
const footerReserve = 8192;
const fd = openSync(output, "wx", 0o600);
let bytes = 0,
  sequence = 0,
  finished = false,
  failureCount = 0,
  firstFailure;
let observerWriteMilliseconds = 0;
const fail = (error) => {
  failureCount++;
  firstFailure ??= safeErrorInfo(error);
  process.exitCode = 1;
};
const line = (event, footer = false) => {
  const encoded = JSON.stringify({ sequence: ++sequence, ...event }) + "\n";
  if (bytes + Buffer.byteLength(encoded) > maximumBytes - (footer ? 0 : footerReserve))
    throw new RangeError("Bounded16MiB driver observation trace exhausted");
  const started = performance.now();
  const written = writeSync(fd, encoded);
  if (written !== Buffer.byteLength(encoded)) throw new Error("Partial driver observation write");
  observerWriteMilliseconds += performance.now() - started;
  bytes += Buffer.byteLength(encoded);
};
line({
  type: "trace-header",
  format: "triplex-xtdb-driver-observation/1",
  node: process.version,
  driver: "postgres3.4.9",
  pid: process.pid,
  processTimeOrigin: performance.timeOrigin,
  atProcessMonotonicMs: performance.now(),
  admission: {
    jobId: admission.jobId,
    attemptId: admission.attemptId,
    manifestSha256: admission.manifestSha256,
  },
  maximumBytes,
  scope:
    "Driver construction/handler-dispatch/settlement callbacks, not independent wire, engine execution or indexing timestamps",
  parameterPolicy:
    "Scalar type/bit descriptors and string hashes only; no DB URL, await-token value, whole facts or result rows",
});
export const observer = makePostgresObserver({
  emit: (event) => {
    if (finished) {
      fail(new Error("Driver activity after observation footer"));
      return;
    }
    if (failureCount) return;
    line(event);
  },
  onFailure: fail,
});
process.once("exit", () => {
  const snapshot = observer.snapshot();
  const complete =
    failureCount === 0 &&
    snapshot.observerErrors === 0 &&
    snapshot.openPools === 0 &&
    snapshot.unreleasedLeases === 0 &&
    snapshot.unsettledQueries === 0;
  const checks = {
    format: "triplex-xtdb-driver-observation-checks/1",
    status: complete ? "COMPLETE" : "INCOMPLETE",
    observerErrors: failureCount,
    openPools: snapshot.openPools,
    unreleasedLeases: snapshot.unreleasedLeases,
    unsettledQueries: snapshot.unsettledQueries,
  };
  try {
    line(
      {
        type: "trace-footer",
        atProcessMonotonicMs: performance.now(),
        status: checks.status,
        snapshot,
        bytesBeforeFooter: bytes,
        observerWriteMilliseconds,
        ...(firstFailure ? { firstFailure } : {}),
      },
      true,
    );
    finished = true;
    closeSync(fd);
    writeFileSync(checksOutput, JSON.stringify(checks, null, 2) + "\n", { flag: "wx" });
  } catch (error) {
    fail(error);
  }
  if (!complete) process.exitCode = 1;
});
