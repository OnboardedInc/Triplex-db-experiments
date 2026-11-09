import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { test } from "node:test";
import { auditP3, core, host, lagSample } from "../lib/p3.mjs";
import { runP3 } from "../p3-driver.mjs";
const evidence = process.env.P3M_EVIDENCE ?? fs.mkdtempSync(path.join(os.tmpdir(), "p3m-"));
fs.mkdirSync(evidence, { recursive: true });
const fixture = path.resolve("lab/bench/test/fixtures/p3-source.mjs");
const options = {
  lane: "qlever",
  source: "fake-p3",
  stream: "test-stream",
  startToken: '{"after":0}',
  readerComposition: "fake-source-file-pinned",
  provider: fixture,
  dir: evidence,
  offline: true,
  timeoutMs: 30000,
};

test("P3M: planted 100/249/251/400 ms delays are exact, missing producer instant fails", () => {
  const file = path.join(evidence, "planted-" + crypto.randomUUID() + ".db");
  const clock = host.openHostFeedClock(),
    writer = host.openPublicationWriter(file, "source", "stream", clock);
  const rows = [];
  try {
    for (const [i, ms] of [100, 249, 251, 400].entries()) {
      const key = { source: "source", stream: "stream", epoch: "0", position: String(i) };
      const pub = writer.publish(key, `tx-${i}`);
      const known = {
        ...key,
        domain: pub.domain,
        atNs: String(BigInt(pub.atNs) + BigInt(ms) * 1000000n),
      };
      rows.push(lagSample(pub, known, pub, i >= 2));
      assert.equal(rows.at(-1).lagMs, ms);
      assert.throws(() => lagSample(undefined, known, pub, false), /Missing source publication/);
      assert.throws(() => lagSample(pub, { ...known, position: "99" }, pub, false), /differs/);
      assert.throws(
        () =>
          lagSample(pub, { ...known, domain: { ...pub.domain, boot: "f".repeat(64) } }, pub, false),
        /origin/,
      );
    }
    fs.writeFileSync(
      path.join(evidence, "planted-delays.json"),
      JSON.stringify(
        { kind: "synthetic-known-instant arithmetic gate; not wall-time performance", rows },
        null,
        2,
      ),
    );
  } finally {
    writer.close();
  }
});

test("P3M: isolated consumer and 256 actual closed loops; lost ACK included in prefix; receipt refuses false reader label, missing instant and dropped source entry", async () => {
  const receipt = await runP3(options);
  assert.equal(receipt.status, "OFFLINE-PASS");
  assert.equal(receipt.measurement.readerLevel, 256);
  assert.equal(receipt.measurement.coverage.positions, 4);
  assert.equal(receipt.measurement.coverage.resolutions, 5);
  assert.deepEqual(receipt.measurement.publishedWithoutAck, ["cmd-2"]);
  assert.equal(receipt.measurement.lag.pooled.count, 4);
  assert.equal(receipt.measurement.lag.steady.count, 2);
  assert.equal(receipt.measurement.lag.burst.count, 2);
  const config = receipt.config;
  const prefix = JSON.parse(fs.readFileSync(path.join(config.attemptDir, "prefix.json")));
  const observed = JSON.parse(fs.readFileSync(path.join(config.attemptDir, "observations.json")));
  const records = host.openPublicationReader(config.publicationFile);
  const audit = (overrides = {}) => auditP3({ config, prefix, ...observed, records, ...overrides });
  try {
    const planted = structuredClone(observed.consumed);
    planted.samples.forEach((s, i) => {
      s.known.atNs = String(
        BigInt(s.publication.atNs) + BigInt([100, 249, 251, 400][i]) * 1000000n,
      );
      s.lagMs = [100, 249, 251, 400][i];
    });
    const plantedReport = audit({ consumed: planted });
    assert.deepEqual(
      planted.samples.map((s) => s.lagMs),
      [100, 249, 251, 400],
    );
    assert.equal(plantedReport.lag.pooled.p99Ms, 400);
    assert.equal(plantedReport.lag.steady.p99Ms, 249);
    assert.equal(plantedReport.lag.burst.p99Ms, 400);
    assert.equal(plantedReport.lagWithin250ms, false);
    fs.writeFileSync(
      path.join(evidence, "planted-report.json"),
      JSON.stringify({ kind: "synthetic durable-known instants", report: plantedReport }),
    );
    assert.throws(() => audit({ readers: observed.readers.slice(1) }), /Reader label/);
    assert.throws(() => audit({ config: { ...config, readers: 1024 } }), /Reader label/);
    assert.throws(() => audit({ config: { ...config, runId: "old-attempt" } }), /Attempt/);
    assert.throws(() => audit({ acks: [...observed.acks, { commandId: "phantom" }] }), /ACK not/);
    const dropped = structuredClone(observed.consumed);
    dropped.pages = dropped.pages.map((p) => ({
      ...p,
      entries: p.entries.filter((e) => e.offset !== "2"),
    }));
    assert.throws(() => audit({ consumed: dropped }), /gap/);
    const sample = structuredClone(observed.consumed);
    sample.samples[0].lagMs = 0;
    assert.throws(() => audit({ consumed: sample }), /Changed lag/);
    const missingFile = path.join(evidence, "missing-" + crypto.randomUUID() + ".db");
    host
      .openPublicationWriter(missingFile, config.source, config.stream, host.openHostFeedClock())
      .close();
    const missing = host.openPublicationReader(missingFile);
    try {
      assert.throws(() => audit({ records: missing }), /Missing source publication/);
    } finally {
      missing.close();
    }
    assert.ok(observed.consumed.samples.every((s) => core.feedPositionKey(s.known) === s.key));
  } finally {
    records.close();
  }
});

test("P3M: zero-reader diagnostic labels zero; cannot relabel its receipt L256", async () => {
  const receipt = await runP3({ ...options, readers: 0 });
  assert.equal(receipt.measurement.readerLevel, 0);
  const c = receipt.config;
  const prefix = JSON.parse(fs.readFileSync(path.join(c.attemptDir, "prefix.json")));
  const observed = JSON.parse(fs.readFileSync(path.join(c.attemptDir, "observations.json")));
  const records = host.openPublicationReader(c.publicationFile);
  try {
    assert.throws(
      () => auditP3({ config: { ...c, readers: 256 }, prefix, ...observed, records }),
      /Reader label/,
    );
  } finally {
    records.close();
  }
});

test("P3M: missing publication fails the running consumer before advancing that position", async () => {
  const dir = path.join(evidence, "missing-run-" + crypto.randomUUID());
  await assert.rejects(
    runP3({ ...options, dir, readers: 0, missingInstant: true }),
    /Missing source publication/,
  );
  const attempt = path.join(dir, fs.readdirSync(dir)[0]);
  const receipt = JSON.parse(fs.readFileSync(path.join(attempt, "receipt.json")));
  assert.equal(receipt.status, "FAIL");
  const store = new host.SqliteConsumerStore(receipt.config.storeFile);
  try {
    assert.ok(store.effects(receipt.runId).every((e) => e.position !== "2"));
  } finally {
    store.close();
  }
});

// [EXP-P3M] Why: trace metadata IO cannot change when an already committed page became durable.
// Rejected: one later timestamp per position after awaiting the preceding position's metadata.
test("P3M: batched commit captures one durable instant before delayed metadata lookups", async () => {
  const receipt = await runP3({ ...options, readers: 0, batch: true, metadataDelayMs: 20 });
  const observed = JSON.parse(
    fs.readFileSync(path.join(receipt.config.attemptDir, "observations.json")),
  );
  assert.equal(observed.consumed.samples.length, 4);
  assert.equal(new Set(observed.consumed.samples.map((s) => s.known.atNs)).size, 1);
  assert.equal(receipt.measurement.coverage.positions, 4);
});

// [EXP-P3M] Why: observations cannot become a receipt until the worker's cleanup succeeds.
// Rejected: accepting a result message before its native source handle closes.
test("P3M: late consumer close failure refuses receipt publication", async () => {
  const dir = path.join(evidence, "close-failure-" + crypto.randomUUID());
  await assert.rejects(
    runP3({ ...options, dir, readers: 0, failConsumerClose: true }),
    /planted consumer close failure/,
  );
  const attempt = path.join(dir, fs.readdirSync(dir)[0]);
  assert.equal(JSON.parse(fs.readFileSync(path.join(attempt, "receipt.json"))).status, "FAIL");
});
