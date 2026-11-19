import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { checkSweep, programInputs, requestPath, sha } from "./bench-proof.ts";

test("bench collector binds stage, native schedules, source and complete coverage before exposing ratios", () => {
  const out = mkdtempSync(join(tmpdir(), "act1-proof-"));
  const slot = "tx2-dxt1-bm1-act" + randomBytes(5).toString("hex").slice(0, 9) + "-activation-a";
  const source = "3".repeat(40),
    nonce = randomUUID(),
    arm = "narrow-selector" as const;
  const request = { source, slot, arm, inputs: programInputs(), seedSha256: sha("sealed snapshot") };
  mkdirSync("runs/act1-requests", { recursive: true });
  writeFileSync(requestPath(slot), JSON.stringify(request), { flag: "wx" });
  const put = (f: string, data: unknown) => writeFileSync(join(out, f), JSON.stringify(data));
  const origin = { source, scope: "fixture", cloneSlot: slot, cloneNonce: nonce, seedSha256: request.seedSha256 };
  put("seed-origin.json", origin);
  const file = "lab/world/W0/releases/R1.json",
    manifest = sha(readFileSync(file)) + "  " + file + "\n",
    build = sha(manifest);
  writeFileSync(join(out, "source.SHA256SUMS"), manifest);
  writeFileSync(join(out, "act1-schedules.tap"), "synthetic collector input");
  put("act1-schedules.json", {
    source,
    slot,
    nonce,
    request: sha(readFileSync(requestPath(slot))),
    tap: sha("synthetic collector input"),
  });
  put("activation-attempt.json", {
    source,
    slot,
    run: slot,
    nonce,
    scope: "fixture",
    subjects: 100000,
    sourceManifestSha256: build,
  });
  const row = { baseline: { count: 501, p99: 10 }, sweep: { count: 502, p99: 12 }, p99Ratio: 1.2 };
  const roster = sha(
    JSON.stringify(Array.from({ length: 100000 }, (_, i) => "pl:s" + String(i).padStart(8, "0"))),
  );
  const proof = {
    source,
    slot,
    scope: "fixture",
    nonce,
    build,
    N: 100000,
    checked: 100000,
    statesCompared: 100000,
    changed: 100000,
    liveReaders: 256,
    initialPosition: 4338757,
    r1Position: 4340000,
    cut: 4350000,
    statePosition: 4360000,
    act1: {
      arm,
      layout: "guard-fact",
      activationFacts: [
        {
          id: "first",
          entityId: "p5:tenant:" + slot,
          position: 4340000,
          hash: JSON.parse(readFileSync("lab/world/W0/releases/index.json", "utf8")).R1,
        },
        {
          id: "next",
          entityId: "p5:tenant:" + slot,
          position: 4350000,
          hash: "sha256:" + sha("release"),
        },
      ],
      releaseHash: "sha256:" + sha("release"),
      selector: { candidates: 25000, excluded: 75000, full: 0, roster, buildMs: 15000 },
    },
    trace: sha("trace"),
    comparedSha256: sha("fixture full reference"),
    roster,
    evaluationMs: 7500,
    publicationMs: 12345,
    postCapture: {
      captured: 4350000,
      current: 4351000,
      subjects: Array.from({ length: 1000 }, (_, i) => "pl:s" + String(i).padStart(8, "0")),
      negativeSubjects: Array.from(
        { length: 1000 },
        (_, i) => "pl:s" + String(i + 1000).padStart(8, "0"),
      ),
    },
    matched: { matchedWindowMs: 18000, fullSweepCovered: true, read: row, commit: row },
  };
  put("act1-sweep.json", proof);
  const valid = checkSweep(out, request);
  assert.equal(valid.wallSeconds, 19.845);
  assert.equal(valid.coldWallSeconds, 34.845);
  assert.equal(valid.fullWindowAnd500PerSide, true);
  put("seed-origin.json", { ...origin, seedSha256: sha("other snapshot") });
  assert.throws(() => checkSweep(out, request));
  put("seed-origin.json", origin);
  for (const diff of [
    { nonce: randomUUID() },
    { roster: sha("short") },
    { statesCompared: 99999 },
    { cut: proof.r1Position },
    { act1: { ...proof.act1, activationFacts: [...proof.act1.activationFacts].reverse() } },
    { matched: { ...proof.matched, commit: { ...row, p99Ratio: 0.1 } } },
  ]) {
    put("act1-sweep.json", { ...proof, ...diff });
    assert.throws(() => checkSweep(out, request));
  }
  const fewer = { ...row, baseline: { ...row.baseline, count: 499 } };
  put("act1-sweep.json", { ...proof, matched: { ...proof.matched, commit: fewer } });
  assert.equal(checkSweep(out, request).fullWindowAnd500PerSide, false);
});

test("traffic ratios reproduce from both fresh raw windows and reject an edited sample", async () => {
  const { checkTraffic } = await import("./bench-proof.ts");
  const { matchW0Live } = await import("../../../bench/lib/w0-replica-live.ts");
  const root = mkdtempSync(join(tmpdir(), "act1-traffic-"));
  mkdirSync(join(root, "traffic"));
  const trace = sha("two offers");
  const windows = ["baseline", "sweep"].map((name, i) => {
    const start = 100 * (i + 1),
      raw = join(root, "traffic", name + "-traffic.ndjson");
    const samples = [
      { kind: "read", started: start + 1, ms: 2 + i },
      { kind: "write", scheduled: start + 1, ack: start + 4 + i },
      { kind: "commit", scheduled: start + 1, ms: 2 + i },
    ];
    writeFileSync(raw, samples.map((s) => JSON.stringify(s)).join("\n") + "\n");
    return {
      raw,
      readers: 256,
      failures: 0,
      offered: 1,
      acknowledged: 1,
      seed: "fixture",
      offsetS: 0,
      warmupMs: 0,
      generatorTraceSha256: trace,
      startedAtMs: start,
      windowMs: 10,
    };
  });
  writeFileSync(
    join(root, "act1-sweep.json"),
    JSON.stringify({ traffic: windows, trace, matched: matchW0Live(windows[0], windows[1]) }),
  );
  assert.equal((await checkTraffic(root)).length, 2);
  writeFileSync(windows[1]!.raw, JSON.stringify({ kind: "read", started: 201, ms: 20 }) + "\n");
  await assert.rejects(checkTraffic(root));
});
