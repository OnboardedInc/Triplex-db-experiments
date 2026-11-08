/** EXP-K01 clone readiness unit tests (G0): canonical digests, probe-plan shape, freeze comparison, seed-path binding. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { canonical, compareFreeze, digest, planShape, pullDigest, publishedBlockIndices } from "../lib/clone.ts";
import { assertSeedInputsCurrent, seedPathOf } from "../lib/bulk.ts";

const freeze = {
  c3: { latestCompletedTxs: [{ db: "xtdb", tx: 1 }], txs: { n: 10, minSystemTime: "2026-11-08T00:00:00.000Z", maxSystemTime: "2026-11-08T00:01:00.000Z", maxId: 9, notCommitted: 0 } },
  c4: { scope: "s", position: 42, counts: { tx_assertions: 100, tx_claims: 42, tx_attempts: 42, tx_meta: 1 }, scopes: [["k", 42]] },
  c5: { history: { tx_assertions: 100, tx_claims: 42, tx_attempts: 42, tx_meta: 42 }, distinctTxSystemTimes: 10 },
  c6: { trieStats: { sha256: "t" }, blockFiles: { sha256: "b" }, liveTables: { rows: [] }, sha256: "x" },
  c7: { jobsAvailable: 0 },
  c8: { subjects: [1, 2], resultSha256: "r", plan: { sha256: "p", rows: [] } },
};
const manifest = { result: { lastPosition: 42 } };
const clone = (patch: (o: any) => void) => { const o = structuredClone(freeze) as any; o.c7 = { jobsAvailable: 0, polls: [0, 0, 0] }; patch(o); return o; };

test("clone check: an identical fingerprint passes C3-C8", () => {
  const checks = compareFreeze(freeze, clone(() => {}), manifest);
  assert.deepEqual(Object.keys(checks), ["C3", "C4", "C5", "C6", "C7", "C8"]);
  for (const [k, c] of Object.entries(checks)) assert.equal(c.pass, true, k);
});

test("clone check: each kind of difference fails its own check only", () => {
  const failing = (patch: (o: any) => void) => Object.entries(compareFreeze(freeze, clone(patch), manifest)).filter(([, c]) => !c.pass).map(([k]) => k);
  assert.deepEqual(failing((o) => { o.c3.txs.n = 9; }), ["C3"], "lost tail");
  assert.deepEqual(failing((o) => { o.c4.counts.tx_assertions = 99; }), ["C4"], "missing rows");
  assert.deepEqual(failing((o) => { o.c5.history.tx_meta = 41; }), ["C5"], "lost versions");
  assert.deepEqual(failing((o) => { o.c6.sha256 = "y"; }), ["C6"], "different layout");
  assert.deepEqual(failing((o) => { o.c6.liveTables.rows = [["tx_meta", 1]]; }), ["C6"], "replayed rows in the live index");
  assert.deepEqual(failing((o) => { o.c7.polls = [0, 1, 0]; }), ["C7"], "compactor busy");
  assert.deepEqual(failing((o) => { o.c7.polls = [0, 0]; }), ["C7"], "fewer than three readings");
  assert.deepEqual(failing((o) => { o.c8.plan.sha256 = "q"; }), ["C8"], "R7 stale plan");
  assert.deepEqual(failing((o) => { o.c8.resultSha256 = "s"; }), ["C8"], "wrong data");
  // The manifest binds C4 too: a freeze and a clone that agree with each other but not with the manifest fail.
  assert.equal(compareFreeze(freeze, clone(() => {}), { result: { lastPosition: 41 } })["C4"]!.pass, false);
});

test("clone check: canonical digests ignore key order and EXPLAIN times", () => {
  assert.equal(canonical({ b: 1, a: { d: 2, c: [3, { f: 1, e: 2 }] } }), '{"a":{"c":[3,{"e":2,"f":1}],"d":2},"b":1}');
  assert.equal(digest({ a: 1n }), digest({ a: "1" }));
  const row = (t: number) => ({ depth: "->", op: "scan", attributes: { scan_source: "tx_assertions", scan_files_used: 3, scan_pages_used: 7, scan_rows_read: 120, scan_files_pruned: 1, scan_pages_pruned: 2 }, total_time: t, self_time: t, time_to_first_page: t, page_count: 4, row_count: 9 });
  assert.equal(digest(planShape([row(10)])), digest(planShape([row(9999)])));
  assert.notEqual(digest(planShape([row(10)])), digest(planShape([{ ...row(10), attributes: { ...row(10).attributes, scan_files_used: 24 } }])));
  assert.equal(planShape([{ ...row(1), attributes: JSON.stringify(row(1).attributes) }])[0].scan.filesUsed, 3, "a struct that arrives as JSON text");
  const t = (id: string, v: unknown) => ({ id, entityId: "e", attribute: "a", value: v, validFrom: 1 });
  assert.equal(pullDigest([t("2", { type: "ref", value: "x" }), t("1", 5)]), pullDigest([t("1", 5), t("2", { value: "x", type: "ref" })]));
  assert.notEqual(pullDigest([t("1", 5)]), pullDigest([t("1", 6)]));
});

test("seed path: driver, QLever bulk index, XTDB seed-writer, unverified, clone bound to its manifest and readiness", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tx2-k01-"));
  const mf = path.join(dir, "manifest.json");
  fs.writeFileSync(mf, "{}");
  const sha = "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a"; // sha256("{}")
  const owner = path.join(dir, "owner.json");
  const xtdb = { format: "tx2-xtdb-seed/1", lane: "xtdb", scope: "s", capture: { wallS: 100, startedAt: "t" } };
  assert.deepEqual(seedPathOf(null, null, undefined), { kind: "transact", seededBy: "driver" });
  assert.equal(seedPathOf({ lane: "qlever", nq: { sha256: "n", quads: 3 } }, mf, undefined).kind, "bulk-index");
  assert.equal(seedPathOf(xtdb, mf, undefined).seededBy, "unverified");
  fs.writeFileSync(owner, JSON.stringify({ holder: "K01" }));
  assert.equal(seedPathOf(xtdb, mf, owner).seededBy, "seed-writer");
  const content = { kind: "clone", goldenVolume: "tx2-golden-xtdb-abcd1234", key: "k", manifestSha256: sha, containerId: "c", readiness: { verdict: "PASS" }, copy: { copyS: 1, treeSha256: "t", c1: { pass: true } } };
  fs.writeFileSync(owner, JSON.stringify({ holder: "K01", volumeContent: content }));
  const p = seedPathOf(xtdb, mf, owner);
  assert.equal(p.seededBy, "clone");
  assert.equal(p.golden.volume, "tx2-golden-xtdb-abcd1234");
  assert.equal(p.manifestSha256, sha);
  fs.writeFileSync(owner, JSON.stringify({ holder: "K01", volumeContent: { ...content, readiness: { verdict: "STALE" } } }));
  assert.throws(() => seedPathOf(xtdb, mf, owner), /Q74d/);
  fs.writeFileSync(owner, JSON.stringify({ holder: "K01", volumeContent: { ...content, manifestSha256: "other" } }));
  assert.throws(() => seedPathOf(xtdb, mf, owner), /not this manifest/);
  assert.throws(() => seedPathOf({ ...xtdb, format: "x" }, mf, owner), /not an XTDB seed manifest/);
});

// [EXP-K01] Why: two incomplete fingerprints cannot certify a clone. Rejected: only testing unequal populated fixtures (misses absent evidence).
test("clone check: missing evidence on both sides fails closed", () => {
  const checks = compareFreeze({}, {}, manifest);
  for (const [name, check] of Object.entries(checks)) assert.equal(check.pass, false, name);
});

// [EXP-K01] Why: exercise changed bytes and added files, not just manifest self-consistency. Rejected: accepting any self-hashing old key (does not bind the current build).
test("seed identity: refuse changed generators and stale or expanded adapter builds", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tx2-k01-identity-"));
  const sha = (s: string) => createHash("sha256").update(s).digest("hex");
  try {
    fs.writeFileSync(path.join(root, "generator.ts"), "generator");
    const dist: any = {};
    for (const pkg of ["core", "xtdb", "qualification"]) {
      const rel = `packages/${pkg}/dist/index.js`;
      fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
      fs.writeFileSync(path.join(root, rel), "build");
      dist[pkg] = { files: 1, sha256: sha(`${sha("build")}  ${rel}\n`) };
    }
    const m = { seedInputs: { generator: { "generator.ts": sha("generator") }, adapter: { dist } } };
    assert.doesNotThrow(() => assertSeedInputsCurrent(m, root));
    fs.writeFileSync(path.join(root, "generator.ts"), "changed");
    assert.throws(() => assertSeedInputsCurrent(m, root), /stale seed generator/);
    fs.writeFileSync(path.join(root, "generator.ts"), "generator");
    fs.writeFileSync(path.join(root, "packages/core/dist/index.js"), "changed");
    assert.throws(() => assertSeedInputsCurrent(m, root), /stale seed adapter build core/);
    fs.writeFileSync(path.join(root, "packages/core/dist/index.js"), "build");
    fs.writeFileSync(path.join(root, "packages/core/dist/extra.js"), "extra");
    assert.throws(() => assertSeedInputsCurrent(m, root), /stale seed adapter build core/);
    assert.throws(() => assertSeedInputsCurrent({}, root), /inputs are missing/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

// [EXP-K01] Why: a seed below the first automatic block cut has no block files. Rejected: querying b00 regardless (first live failure).
test("published block discovery: empty is empty, gaps are preserved, malformed paths refuse", () => {
  assert.deepEqual(publishedBlockIndices(""), []);
  assert.deepEqual(publishedBlockIndices("/var/lib/xtdb/buffers/v06/blocks/b02.binpb\n/var/lib/xtdb/buffers/v06/blocks/b00.binpb\n"), ["00", "02"]);
  assert.throws(() => publishedBlockIndices("/other/b00.binpb"), /unexpected block file/);
});
