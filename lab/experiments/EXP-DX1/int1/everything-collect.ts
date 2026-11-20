import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { cohort, fileHash, readScope, type ScopeMeasurement } from "../scale1/measurements.ts";
import { canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import { requireIdentity } from "../../../bench/lib/deep-profile.ts";
import { campaignCases, treatment, type CampaignCase } from "./everything-plan.ts";
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

// [DX-THIN1] Why: recompute from saved native evidence using the same code at production and collection. Rejected: accepting the producer's declared p99 or counting archives without checking their contents.
export async function collect(dir: string, mode: "produce" | "verify") {
  const { binding, ...plan } = read(path.join(dir, "campaign.json"));
  assert.equal(sha256(canonical(plan)), binding);
  assert.match(plan.source, /^[a-f0-9]{40}$/);
  assert.deepEqual(plan.cases, campaignCases(plan.smoke ? [40] : undefined));
  assert.deepEqual(plan.treatment, treatment);
  assert(plan.placement === "physical" || (plan.placement === "leased-mac" && plan.smoke));
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
    const summary = cohort([raw], 1, zero?.values, zero?.invalid.join("; ") || null);
    const row = {
      binding,
      arm,
      state: result.code === 0 ? "measured" : "diagnostic",
      files: await index(out),
      summary,
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
