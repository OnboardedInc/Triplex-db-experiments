// @ts-nocheck -- [EXP-CHECKJS-R2] negative test fixture deliberately omits job fields. Binding errors remain checked by lab/bin/checkjs.mjs.
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkCohort, overlappingAttempts, validateGrantContract } from "./cohort-contract.mjs";

const fixture = () => {
  const resources = { heavy: true },
    manifest = { id: "component-stage", resources };
  const admission = {
    jobId: manifest.id,
    manifestSha256: "fixed",
    grantedAt: "2026-11-07T00:00:10Z",
    cohort: [],
  };
  const state = {
    format: "triplex-devloop-state/2",
    jobs: {
      [manifest.id]: {
        manifest,
        manifestSha256: "fixed",
        enqueuedAt: "2026-11-07T00:00:00Z",
        status: "running",
      },
    },
    owners: {
      x: {
        id: "foundation-xtdb",
        status: "active",
        resources: { memoryBytes: 3 * 1024 ** 3, cpuUnits: 2 },
      },
      q: {
        id: "foundation-qlever",
        status: "active",
        resources: { memoryBytes: 2 * 1024 ** 3, cpuUnits: 1.5 },
      },
    },
  };
  return { admission, state };
};
test("requires the named active client and both unchanged foundation reservations", () => {
  const { admission, state } = fixture();
  assert.equal(
    checkCohort(admission, state, { startup: true, now: Date.parse("2026-11-07T00:00:11Z") })
      .commissionedReservations.length,
    2,
  );
  state.owners.q.status = "unknown";
  assert.throws(() => checkCohort(admission, state));
  state.owners.q.status = "active";
  state.owners.x.resources.memoryBytes++;
  assert.throws(() => checkCohort(admission, state));
});
test("refuses unexpected heavy clients at admission or after startup while allowing light work", () => {
  const { admission, state } = fixture();
  state.jobs.other = { status: "running", manifest: { id: "other", resources: { heavy: false } } };
  checkCohort(admission, state);
  state.jobs.other.manifest.resources.heavy = true;
  assert.throws(() => checkCohort(admission, state));
  delete state.jobs.other;
  admission.cohort = [{ jobId: "previous", resources: { heavy: true } }];
  assert.throws(() =>
    checkCohort(admission, state, { startup: true, now: Date.parse("2026-11-07T00:00:11Z") }),
  );
});
test("the frozen admission and startup envelopes expire without changing read deadlines", () => {
  const { admission, state } = fixture();
  assert.throws(() =>
    checkCohort(admission, state, { startup: true, now: Date.parse("2026-11-07T00:00:41Z") }),
  );
  admission.grantedAt = "2026-11-07T00:03:00Z";
  assert.throws(() =>
    checkCohort(admission, state, { startup: true, now: Date.parse("2026-11-07T00:03:01Z") }),
  );
});
test("complete attempt intervals catch short overlaps missed by sampled snapshots", () => {
  const records = [
    { id: "old", startMilliseconds: 0, endMilliseconds: 5 },
    { id: "between-samples", startMilliseconds: 20, endMilliseconds: 21 },
    { id: "unknown", startMilliseconds: 25, endMilliseconds: null },
    { id: "later", startMilliseconds: 50, endMilliseconds: 60 },
  ];
  assert.deepEqual(
    overlappingAttempts(records, 10, 30).map((record) => record.id),
    ["between-samples", "unknown"],
  );
});

test("a heavy-to-light grant mutation cannot escape classification or cap validation", () => {
  const manifest = {
    id: "component-stage",
    resources: { heavy: true, memoryBytes: 100, cpuUnits: 1 },
  };
  const job = { manifestSha256: "fixed" },
    attempt = { id: "0001", grantedAt: "2026-11-07T00:00:00Z" };
  const grant = {
    jobId: manifest.id,
    attemptId: attempt.id,
    grantedAt: attempt.grantedAt,
    manifestSha256: "fixed",
    resources: { ...manifest.resources },
  };
  validateGrantContract(grant, manifest, job, attempt);
  grant.resources.heavy = false;
  assert.throws(() => validateGrantContract(grant, manifest, job, attempt));
  grant.resources.heavy = true;
  grant.resources.memoryBytes++;
  assert.throws(() => validateGrantContract(grant, manifest, job, attempt));
});
