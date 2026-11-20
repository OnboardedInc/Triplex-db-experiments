import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { cohort, fileHash, readScope, type ScopeMeasurement } from "../scale1/measurements.ts";
import { canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import { requireIdentity } from "../../../bench/lib/deep-profile.ts";
import {
  histogramDistribution,
  percentile,
  ratioBar,
} from "../../../bench/lib/verdict-statistics.ts";
import { Histogram } from "../../../bench/lib/hist.ts";
import { VERDICT_CLOCK } from "../../../trace/instrument.mjs";
import { campaignWindows, pooledCampaignId } from "../scale1/tenant-traffic.ts";
import { importDigest, importFrames } from "./pooled-import.ts";
import {
  campaignCases,
  campaignTenant,
  gatewayJvmOptions,
  scorecardCases,
  treatment,
  type CampaignCase,
} from "./everything-plan.ts";
import { replayRevision } from "../scale1/source.ts";
import { atomicJson, type Arm } from "./everything-arm.ts";

const read = (f: string) => JSON.parse(fs.readFileSync(f, "utf8"));
export function openPlan(
  dir: string,
  source: string,
  smoke: boolean,
  placement: "leased-mac" | "mac-diagnostic" | "physical",
  overnight = false,
  heldSeal?: string,
) {
  const plan = {
    source,
    smoke,
    placement,
    treatment,
    createdAt: Date.now(),
    overnight,
    ...(heldSeal ? { heldSeal } : {}),
    cases: heldSeal ? scorecardCases() : campaignCases(smoke ? [4] : overnight ? [10_000] : undefined),
    oracle: read(path.join(dir, "oracle-source.json")),
    placementInputs: read(path.join(dir, "physical-inputs.json")),
  };
  atomicJson(path.join(dir, "campaign.json"), { ...plan, binding: sha256(canonical(plan)) });
  return plan.cases;
}

async function index(dir: string, sub = ""): Promise<[string, string][]> {
  const indexed: [string, string][] = [];
  for (const entry of fs
    .readdirSync(path.join(dir, sub), { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === "recorded.json" || entry.name === "recorded.json.tmp") continue;
    const rel = path.join(sub, entry.name);
    assert(entry.isFile() || entry.isDirectory(), `Unexpected archive entry ${rel}`);
    if (entry.isDirectory()) indexed.push(...(await index(dir, rel)));
    else indexed.push([rel, await fileHash(path.join(dir, rel))]);
  }
  return indexed;
}

function originalArm(out: string, c: CampaignCase, plan: ReturnType<typeof read>) {
  const arm: Arm = read(path.join(out, "arm.json"));
  assert.deepEqual(arm.case, c);
  assert.equal(arm.source, plan.source);
  assert.equal(arm.smoke, plan.smoke);
  assert(arm.startedAt >= plan.createdAt);
  const id = arm.identity;
  requireIdentity(id);
  assert.deepEqual(
    [id.source, id.slot, id.people, id.arm, id.account, id.tenant],
    [arm.source, arm.slot, c.total, c.load, 0, campaignTenant(c, arm.smoke)],
  );
  return arm;
}

async function checkInputs(dir: string, plan: ReturnType<typeof read>) {
  const oracle = plan.oracle,
    placement = plan.placementInputs;
  assert.deepEqual(read(path.join(dir, "oracle-source.json")), oracle);
  assert.deepEqual(read(path.join(dir, "physical-inputs.json")), placement);
  assert.equal(placement.source, plan.source);
  assert.equal(oracle.revision, replayRevision);
  const base = "lab/oracles/replay/",
    declared = new Set<string>();
  for (const f of oracle.files) {
    assert(
      typeof f.path === "string" &&
        f.path.startsWith(base) &&
        !f.path.split("/").includes("..") &&
        !declared.has(f.path),
    );
    declared.add(f.path);
    const file = path.join(dir, "oracle", f.path);
    assert(fs.lstatSync(file).isFile() && fs.statSync(file).size === f.bytes);
    assert.equal(await fileHash(file), f.sha256);
  }
  assert(declared.has(base + "cli.py"));
  const observed = (await index(path.join(dir, "oracle"))).map(([f]) => f).sort();
  assert.deepEqual(observed, [...declared].sort());
  if (plan.placement !== "physical") {
    assert(placement.containers.length === 1 && /^[a-f0-9]{64}$/.test(placement.gatewaySource));
    assert(/^tx2-dxthin-/.test(placement.slot));
  }
}

async function fieldStats(out: string, arm: Arm, raw: ScopeMeasurement) {
  const geometry = campaignWindows(arm.identity.tenant!, arm.identity.arm);
  const evidence = raw.tenantEvidence;
  assert(evidence && evidence.windows.length === geometry.length);
  const quiet = "account-001";
  const keys = ["commit", "read", "feed"] as const;
  const clock = {
    commit: VERDICT_CLOCK,
    read: "reader/service-ms",
    feed: "publication-to-durable-effect/1",
  };
  const distributions = Object.fromEntries(
    geometry.map((w, i) => {
      const window = evidence.windows[i];
      assert.equal(window.name, w.name);
      assert.equal(window.start, raw.interval.from + w.from * 1000);
      assert.equal(window.to, window.start + w.seconds * 1000);
      const group = window.accounts[quiet];
      return [
        w.name,
        Object.fromEntries(
          keys.map((k) => [k, histogramDistribution(Histogram.fromJSON(group[k]), clock[k])]),
        ),
      ];
    }),
  );
  const ratios = [];
  const effects = [];
  if (arm.case.load === "reader") {
    for (const [control, tested] of [
      ["quiet-alone", "neighbors-64"],
      ["quiet-alone", "neighbors-256"],
      ["publish-control", "publish"],
      ["import-control", "import"],
    ] as const) {
      const base = geometry.find((w) => w.name === control)!,
        run = geometry.find((w) => w.name === tested)!;
      assert(
        base.seconds === run.seconds &&
          base.seats?.[0] === run.seats?.[0] &&
          base.rates?.[0] === run.rates?.[0],
      );
      const dirty = [control, tested].some((name) => {
        const found = evidence.windows.find((w: any) => w.name === name).accounts[quiet];
        return found.fullExpired || found.failed || found.incorrectReads || found.missingFeed;
      });
      const values = keys.map((k) =>
        ratioBar(
          "P6 quiet " + k + " during " + tested,
          distributions[tested]![k]!,
          distributions[control]![k]!,
          1.25,
          {
            invalid: arm.smoke ? "short saved output" : dirty ? "quiet traffic incomplete" : null,
            minimum: 500,
          },
        ),
      );
      ratios.push({ control, tested, quietSeats: run.seats![0], values });
    }
    const published = raw.report.deep.r2,
      checked = raw.report.deep.activationOracle,
      release = geometry.find((w) => w.name === "publish")!;
    const releaseStart = raw.interval.from + release.from * 1000;
    assert(
      checked?.checked === arm.case.people && checked.guardComparisons === 2 * arm.case.people,
    );
    assert(published.layout === "page-cut" && published.coverage.size === arm.case.people);
    assert(
      published.publicationPosition > published.cut.position &&
        published.endedAt >= releaseStart &&
        published.endedAt <= releaseStart + release.seconds * 1000,
    );
    assert(
      published.mutations.length === Math.min(arm.case.people, 10) &&
        published.mutations.every((m: { position: number }) => m.position > published.cut.position),
    );
    effects.push({
      name: "publish",
      account: "account-002",
      wallMs: published.wallMs,
      startedAt: releaseStart,
      endedAt: published.endedAt,
      coverage: published.coverage,
      cut: published.cut,
      reference: "publish-control",
    });
    const imported = raw.report.deep.pooledImport;
    const importFile = path.join(out, "int1-import.jsonl");
    assert.equal(await fileHash(importFile), imported.sha256);
    assert(
      imported.format === "int1-import/1" &&
        imported.incomingAccount === "account-011" &&
        imported.people === arm.case.people,
    );
    const importWindow = geometry.find((w) => w.name === "import")!;
    assert(
      imported.start >= raw.interval.from + importWindow.from * 1000 &&
        imported.endedAt <= raw.interval.to &&
        imported.endedAt > imported.start,
    );
    const frames = fs.readFileSync(importFile, "utf8").trimEnd().split("\n");
    const native = new Map<number, string[]>(
      fs
        .readFileSync(path.join(out, "deep-native-commits.jsonl"), "utf8")
        .trimEnd()
        .split("\n")
        .map((line) => JSON.parse(line))
        .filter((row) => row.position)
        .map((row) => [row.position, row.commands]),
    );
    let count = 0,
      total = 0,
      position = 0;
    for (const wanted of importFrames(arm.case.people)) {
      const frame = JSON.parse(frames[count]!);
      assert(
        frame.commandId === raw.report.runTag + ":import:" + count &&
          frame.position > position &&
          frame.sentAt >= imported.start &&
          frame.sentAt <= frame.ackAt &&
          frame.ackAt <= imported.endedAt &&
          native.get(frame.position)?.includes(frame.commandId),
      );
      assert.equal(frame.facts, wanted.length);
      assert.equal(frame.rows, importDigest(wanted));
      count++;
      position = frame.position;
      total += frame.facts;
    }
    assert.deepEqual(
      [imported.facts, imported.frames, imported.position],
      [total, count, position],
    );
    assert.equal(frames.length, count);
    assert.equal(imported.factsPerSecond, (total * 1000) / (imported.endedAt - imported.start));
    effects.push({ name: "import", ...imported, reference: "import-control" });
  }
  const windows = evidence.windows.map((w: any) => ({
    name: w.name,
    start: w.start,
    to: w.to,
    accounts: Object.fromEntries(
      Object.entries(w.accounts).map(([account, data]: [string, any]) => [
        account,
        {
          offered: data.fullOffered,
          acked: data.acked,
          expired: data.fullExpired,
          incorrectReads: data.incorrectReads,
          p99Ms: Object.fromEntries(
            keys.map((k) => [
              k,
              percentile(histogramDistribution(Histogram.fromJSON(data[k]), clock[k]), 0.99),
            ]),
          ),
        },
      ]),
    ),
  }));
  return { windows, ratios, effects, feed: evidence.feed };
}

function checkPreflight(raw: ScopeMeasurement) {
  const { correctness, oracle, receiptCapture, status } = raw.report;
  assert.equal(status, "DONE");
  assert(
    raw.missing === 0 && raw.expired === 0 && raw.committed > 0 && raw.primaries === raw.committed,
  );
  assert(
    receiptCapture.matched === raw.committed &&
      !receiptCapture.missing &&
      !receiptCapture.mismatches,
  );
  assert(
    correctness.reads > 0 &&
      correctness.correct === correctness.reads &&
      !correctness.errors &&
      !correctness.violations,
  );
  assert(
    oracle.status === "PASS" &&
      oracle.oracleVerdict === "PASS" &&
      oracle.receiptConsistency === "PASS" &&
      oracle.exitCode === 0 &&
      oracle.reads > 0 &&
      oracle.modelCorrectOnSameReads === oracle.reads &&
      oracle.mismatchCount === 0,
  );
  // [DX-INT1] Why: the short tapes exercise resume and corrections, while the lost-ACK event lies outside their window.
  // Rejected: letting matching archive bytes admit an incomplete feed or requiring an unoffered event.
  const feed = raw.report.priorities.P3;
  assert.equal(feed.notReachedAtStop.count, 0);
  assert.equal(feed.counts.incompleteChanges, 0);
  assert.deepEqual(
    raw.invalid.filter(
      (id) =>
        id.startsWith("NS-P3 ") ||
        (id.startsWith("NS-P2 ") && id !== "NS-P2 lost ACKs return the original receipt"),
    ),
    [],
  );
}

// [DX-THIN1] Why: recompute from saved native evidence using the same code at production and collection. Rejected: accepting the producer's declared p99 or counting archives without checking their contents.
export async function collect(dir: string, mode: "produce" | "verify") {
  const { binding, ...plan } = read(path.join(dir, "campaign.json"));
  assert.equal(sha256(canonical(plan)), binding);
  assert.match(plan.source, /^[a-f0-9]{40}$/);
  assert.equal(typeof plan.overnight, "boolean");
  assert.deepEqual(
    plan.cases,
    plan.heldSeal ? scorecardCases() : campaignCases(plan.smoke ? [4] : plan.overnight ? [10_000] : undefined),
  );
  if (plan.heldSeal) {
    assert(!plan.smoke && !plan.overnight && plan.placement === "physical");
    assert.equal(await fileHash(path.join(dir, "held-seal.json")), plan.heldSeal);
  }
  assert.deepEqual(plan.treatment, treatment);
  const mac = ["leased-mac", "mac-diagnostic"].includes(plan.placement);
  assert(plan.placement === "physical" || (mac && plan.smoke));
  await checkInputs(dir, plan);
  const seen = new Set<string>(),
    prior = new Map<string, ScopeMeasurement>();
  const results = [];
  for (const c of plan.cases as CampaignCase[]) {
    const out = path.join(dir, c.key),
      terminal = path.join(out, "observed.json");
    if (!fs.existsSync(terminal)) {
      results.push({ case: c, state: "missing terminal output" });
      continue;
    }
    const arm = originalArm(out, c, plan),
      result = read(terminal),
      id = arm.identity;
    assert.deepEqual(result.arm, arm);
    if (mac) assert.equal(id.slot, plan.placementInputs.slot);
    assert(
      result.start > arm.startedAt &&
        result.endedAt > result.start &&
        Number.isSafeInteger(result.code),
    );
    assert(!seen.has(id.nonce));
    seen.add(id.nonce);
    const go = read(path.join(out, "barrier/go.json")),
      released = read(path.join(out, "barrier/release.json"));
    assert.deepEqual(
      [go.nonce, go.slot, go.source, go.start],
      [id.nonce, id.slot, id.source, result.start],
    );
    assert.deepEqual(
      [released.nonce, released.slot, released.source, released.start],
      [id.nonce, id.slot, id.source, result.start],
    );
    assert.deepEqual(released.armed.s0.identity, id);
    const raw = await readScope(out, id, result.start, result.code);
    if (plan.heldSeal) {
      assert.deepEqual(raw.report.deep.restoredSeed?.origin, read(path.join(dir, "held-seal.json")));
    }
    if (mac) {
      assert.deepEqual(raw.report.harnessStorage, {
        requested: "owned-ext4",
        filesystemType: 0xef53,
      });
    }
    const exercised = raw.report.deep.writePath;
    assert(
      exercised &&
        exercised.database === raw.report.deep.database &&
        exercised.nativeCommits > 0 &&
        exercised.rangeRequests === 0 &&
        exercised.packedRows === 0,
    );
    assert.equal(exercised.unexpectedFunctions, 0);
    assert.equal(exercised.first.function, ":triplex/commit");
    assert.deepEqual(raw.report.deep.identity, id);
    if (plan.placement === "physical") {
      const clean = read(path.join(out, "cleanup/inventory.json"));
      assert(clean.at >= result.endedAt && clean.before.containers.length === 4);
      assert(Object.values(clean.after).every((x) => Array.isArray(x) && x.length === 0));
      const placement = read(path.join(out, "placement.json"));
      const launch = read(path.join(out, "gateway-jvm.json"));
      assert.deepEqual(launch.identity, id);
      assert(launch.capturedAt >= arm.startedAt && launch.capturedAt <= result.start);
      assert.deepEqual(
        launch.vm.map((r: any) => r.role),
        [...Object.keys(gatewayJvmOptions), ...(plan.heldSeal ? ["tx"] : [])],
      );
      for (const row of launch.vm) {
        const role = row.role as keyof typeof gatewayJvmOptions | "tx";
        assert(row.container === placement[role].id);
        const flags = role === "tx" ? ["-Xmx5g", "-XX:+UseG1GC"] : gatewayJvmOptions[role];
        assert(flags.every((flag) => row.actual.includes(flag)));
        assert.equal(row.actual.filter((flag: string) => /^-XX:\+Use.*GC$/.test(flag)).length, 1);
        assert.equal(
          row.actual.filter((flag: string) => flag.startsWith("-Xmx")).at(-1),
          role === "tx" ? "-Xmx5g" : "-Xmx384m",
        );
      }
    }
    const key = `${c.people}/${c.profile}`,
      zero = prior.get(key);
    if (c.load === "zero") prior.set(key, raw);
    else {
      assert(zero && raw.id.nonce !== zero.id.nonce);
      if (raw.scope === zero.scope) {
        assert(plan.placement === "physical" && raw.report.deep.restoredSeed);
        const origin =
          zero.report.deep.restoredSeed?.origin ??
          read(path.join(dir, `${c.people}-frozen-zero`, "captured-seed.json"));
        assert.deepEqual(raw.report.deep.restoredSeed.origin, origin);
        if (!zero.report.deep.restoredSeed) assert.deepEqual(origin.identity, zero.id);
      }
      assert.equal(raw.report.deep.trace, zero.report.deep.trace);
      assert.equal(raw.report.deep.seed.sha256, zero.report.deep.seed.sha256);
      assert.equal(raw.offered, zero.offered);
      assert.equal(raw.report.matchedBaseline?.sha256, zero.hashes.writes);
    }
    if (plan.smoke && result.code === 0) checkPreflight(raw);
    const { summary } = cohort([raw], 1, zero?.values, zero?.invalid.join(", ") || null);
    const observed = result.code === 0 && raw.report.status === "DONE";
    const eligible =
      observed &&
      !plan.smoke &&
      c.profile === "frozen" &&
      !raw.invalid.length &&
      !zero?.invalid.length;
    const { pooledBars, jointObligations, perScope, ...observations } = summary;
    const row = {
      binding,
      arm,
      state: !observed
        ? "incomplete"
        : plan.smoke
          ? "preflight"
          : eligible
            ? "measured"
            : "diagnostic",
      files: await index(out),
      summary: {
        ...observations,
        profile: c.profile === "field" ? pooledCampaignId + "/field" : summary.profile,
        ...(eligible ? { pooledBars, jointObligations, perScope } : {}),
        ...(c.profile === "field" ? { field: await fieldStats(out, arm, raw) } : {}),
      },
    };
    const stored = path.join(out, "recorded.json");
    if (mode === "produce" && !fs.existsSync(stored)) atomicJson(stored, row);
    else
      assert.deepEqual(
        read(stored),
        JSON.parse(JSON.stringify(row)),
        `Collector differs for ${c.key}`,
      );
    results.push(row);
  }
  return { source: plan.source, binding, smoke: plan.smoke, results };
}
