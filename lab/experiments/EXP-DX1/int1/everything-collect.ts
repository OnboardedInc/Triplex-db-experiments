import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { cohort, fileHash, readScope, type ScopeMeasurement } from "../scale1/measurements.ts";
import { canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import { requireIdentity } from "../../../bench/lib/deep-profile.ts";
import { distribution, percentile } from "../../../bench/lib/verdict-statistics.ts";
import { verdictMs, VERDICT_CLOCK } from "../../../trace/instrument.mjs";
import { fieldPlan, fieldProfile, fieldWindows } from "./field-plan.ts";
import { campaignCases, treatment, type CampaignCase } from "./everything-plan.ts";
import { replayRevision } from "../scale1/source.ts";
import { atomicJson, type Arm } from "./everything-arm.ts";

const read = (f: string) => JSON.parse(fs.readFileSync(f, "utf8"));
export function openPlan(
  dir: string,
  source: string,
  smoke: boolean,
  placement: "leased-mac" | "physical",
) {
  const plan = {
    source,
    smoke,
    placement,
    treatment,
    createdAt: Date.now(),
    cases: campaignCases(smoke ? [40] : undefined),
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
    [id.source, id.slot, id.people, id.arm, id.account, Boolean(id.field)],
    [arm.source, arm.slot, c.people, c.load, 0, c.profile === "field"],
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
  if (plan.placement === "leased-mac") {
    assert(placement.containers.length === 1 && /^[a-f0-9]{64}$/.test(placement.gatewaySource));
    assert(/^tx2-dxthin-/.test(placement.slot));
  }
}

async function fieldStats(out: string, arm: Arm, raw: ScopeMeasurement) {
  const start = raw.interval.from;
  const rows = fieldWindows((raw.interval.to - start) / 1000).map((w) => ({
    ...w,
    scheduled: 0,
    offered: 0,
    acknowledged: 0,
    acknowledgedInWindow: 0,
    expired: 0,
    lastAcknowledgedAt: 0,
    latencies: [] as number[],
  }));
  const at = (ms: number) => {
    const seconds = (ms - start) / 1000;
    return rows.find((w) => seconds >= w.start && seconds < w.end);
  };
  for (const event of fieldPlan(arm.identity.account, arm.case.people, arm.smoke).events) {
    if (!event.resend) at(start + event.atMs)!.scheduled++;
  }
  for await (const line of createInterface({
    input: fs.createReadStream(path.join(out, "ns-writes.jsonl")),
    crlfDelay: Infinity,
  })) {
    if (!line) continue;
    const row = JSON.parse(line);
    if (row.stream !== "background" || row.resend) continue;
    // [DX-THIN1] Why: report scheduled cohorts and receipt-time goodput using the verified sender ledger.
    // Rejected: assigning delayed completions to the nominal arrival window's throughput.
    const w = at(row.scheduledAt);
    assert(w);
    w.offered++;
    if (row.expired) w.expired++;
    if (row.outcome !== "committed") continue;
    w.acknowledged++;
    w.latencies.push(verdictMs(row));
    w.lastAcknowledgedAt = Math.max(w.lastAcknowledgedAt, row.ackPublishedAt);
    const acknowledged = at(row.ackPublishedAt);
    if (acknowledged) acknowledged.acknowledgedInWindow++;
  }
  assert.equal(
    rows.reduce((sum, w) => sum + w.acknowledged, 0),
    raw.committed,
  );
  return rows.map(({ latencies, lastAcknowledgedAt, ...w }) => {
    const d = distribution(latencies, VERDICT_CLOCK);
    return {
      ...w,
      missingOffers: w.scheduled - w.offered,
      acknowledgedPerSecond: w.acknowledgedInWindow / (w.end - w.start),
      lastScheduledAckAfterWindowMs:
        w.scheduled === w.acknowledged
          ? Math.max(0, lastAcknowledgedAt - start - w.end * 1000)
          : null,
      p50Ms: latencies.length ? percentile(d, 0.5) : null,
      p99Ms: latencies.length ? percentile(d, 0.99) : null,
    };
  });
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
}

// [DX-THIN1] Why: recompute from saved native evidence using the same code at production and collection. Rejected: accepting the producer's declared p99 or counting archives without checking their contents.
export async function collect(dir: string, mode: "produce" | "verify") {
  const { binding, ...plan } = read(path.join(dir, "campaign.json"));
  assert.equal(sha256(canonical(plan)), binding);
  assert.match(plan.source, /^[a-f0-9]{40}$/);
  assert.deepEqual(plan.cases, campaignCases(plan.smoke ? [40] : undefined));
  assert.deepEqual(plan.treatment, treatment);
  assert(plan.placement === "physical" || (plan.placement === "leased-mac" && plan.smoke));
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
    if (plan.placement === "leased-mac") assert.equal(id.slot, plan.placementInputs.slot);
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
    const exercised = raw.report.deep.writePath;
    assert(
      exercised &&
        exercised.database === raw.report.deep.database &&
        exercised.nativeCommits > 0 &&
        exercised.rangeRequests > 0,
    );
    if (id.field) assert(exercised.packedRows > 0);
    assert.equal(exercised.unexpectedFunctions, 0);
    assert.match(exercised.first.function, /^:triplex\.write\/v-[a-f0-9]{24}$/);
    assert.deepEqual(raw.report.deep.identity, id);
    if (plan.placement === "physical") {
      const clean = read(path.join(out, "cleanup/inventory.json"));
      assert(clean.at >= result.endedAt && clean.before.containers.length === 4);
      assert(Object.values(clean.after).every((x) => Array.isArray(x) && x.length === 0));
    }
    const key = `${c.people}/${c.profile}`,
      zero = prior.get(key);
    if (c.load === "zero") prior.set(key, raw);
    else {
      assert(zero && raw.id.nonce !== zero.id.nonce && raw.scope !== zero.scope);
      assert.equal(raw.report.deep.trace, zero.report.deep.trace);
      assert.equal(raw.report.deep.seed.sha256, zero.report.deep.seed.sha256);
      assert.equal(raw.offered, zero.offered);
      assert.equal(raw.report.matchedBaseline?.sha256, zero.hashes.writes);
    }
    if (plan.smoke && result.code === 0) checkPreflight(raw);
    const { summary } = cohort([raw], 1, zero?.values, zero?.invalid.join(", ") || null);
    const observed = result.code === 0 && raw.report.status === "DONE";
    const eligible =
      observed && !plan.smoke && !id.field && !raw.invalid.length && !zero?.invalid.length;
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
        profile: id.field ? fieldProfile : summary.profile,
        ...(eligible ? { pooledBars, jointObligations, perScope } : {}),
        ...(id.field ? { rateWindows: await fieldStats(out, arm, raw) } : {}),
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
