import assert from "node:assert/strict";

export const cohortBounds = Object.freeze({
  admissionMilliseconds: 120000,
  startupMilliseconds: 30000,
  sampleMilliseconds: 250,
  workerMilliseconds: 180000,
});
const active = new Set(["granted", "running", "cleanup_unknown"]);
export function checkCohort(admission, state, { startup = false, now = Date.now() } = {}) {
  assert.equal(state.format, "triplex-devloop-state/2");
  const own = state.jobs[admission.jobId];
  assert(
    own && own.manifestSha256 === admission.manifestSha256,
    "Own canonical job identity differs",
  );
  assert(["granted", "running"].includes(own.status), "Own client is no longer canonically active");
  const clients = Object.values(state.jobs)
    .filter(
      (job) =>
        job.manifest.resources?.heavy === true &&
        active.has(job.status) &&
        job.manifest.id !== admission.jobId,
    )
    .map((job) => job.manifest.id)
    .sort();
  assert.deepEqual(clients, [], "Another heavy client group overlaps this isolated diagnostic");
  const expected = {
    "foundation-xtdb": { memoryBytes: 3 * 1024 ** 3, cpuUnits: 2 },
    "foundation-qlever": { memoryBytes: 2 * 1024 ** 3, cpuUnits: 1.5 },
  };
  const owners = Object.values(state.owners).filter((owner) =>
    ["active", "unknown"].includes(owner.status),
  );
  assert.deepEqual(
    owners.map((owner) => owner.id).sort(),
    Object.keys(expected).sort(),
    "Commissioned reservation set differs",
  );
  for (const owner of owners) {
    assert.equal(owner.status, "active");
    assert.equal(owner.resources.memoryBytes, expected[owner.id].memoryBytes);
    assert.equal(owner.resources.cpuUnits, expected[owner.id].cpuUnits);
  }
  if (startup) {
    assert.deepEqual(
      (admission.cohort ?? []).filter((job) => job.resources.heavy).map((job) => job.jobId),
      [],
      "A heavy group was already active at admission",
    );
    const enqueued = Date.parse(own.enqueuedAt),
      granted = Date.parse(admission.grantedAt);
    assert(Number.isFinite(enqueued) && Number.isFinite(granted));
    assert(
      granted >= enqueued && granted - enqueued <= cohortBounds.admissionMilliseconds,
      "Admission exceeded its frozen120s envelope",
    );
    assert(
      now >= granted && now - granted <= cohortBounds.startupMilliseconds,
      "Startup exceeded its frozen30s envelope",
    );
  }
  return {
    heavyClients: clients,
    commissionedReservations: owners.map((owner) => ({
      id: owner.id,
      memoryBytes: owner.resources.memoryBytes,
      cpuUnits: owner.resources.cpuUnits,
    })),
  };
}

/** Admission-to-anchored-terminal bounds; no separate publication-tail clock exists. */
export const overlappingAttempts = (records, startMilliseconds, endMilliseconds) => {
  assert(
    Number.isFinite(startMilliseconds) &&
      Number.isFinite(endMilliseconds) &&
      endMilliseconds >= startMilliseconds,
  );
  return records.filter(
    (record) =>
      record.startMilliseconds <= endMilliseconds &&
      (record.endMilliseconds === null || record.endMilliseconds >= startMilliseconds),
  );
};

export function validateGrantContract(grant, manifest, job, attempt) {
  assert.equal(grant.jobId, manifest.id);
  assert.equal(grant.attemptId, attempt.id);
  assert.equal(grant.manifestSha256, job.manifestSha256);
  assert.equal(grant.grantedAt, attempt.grantedAt);
  assert.deepEqual(
    grant.resources,
    manifest.resources,
    "Grant classification/caps differ from the verified canonical manifest",
  );
}
