import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { validatePreflight } from "../act2/preflight-runner.ts";
const root = "/var/tmp/triplex-scale1";
const experiment = "lab/experiments/EXP-DX1/scale1/bench.ts";
const read = (f: string) => JSON.parse(fs.readFileSync(f, "utf8"));
const exists = fs.existsSync;
const clock = () => new Date().toISOString();
type Step = {
  item: number;
  layout?: "pooled" | "separate";
  mode: string;
  tag: string;
  source: string;
  baseline?: string;
  seedImage?: string;
  sizing?: string;
  sizingChoices?: string[];
  when?: { tag: string; action: "live" | "seed-only" };
  retryOf?: string;
  groupControl?: string;
  live?: "staggered" | "coincident";
  activationMode?: "delta";
  bounded?: true;
  bootstrapCache?: string;
};
type Plan = { label: string; steps: Step[]; final: boolean; keepGoing?: true };
const label = process.argv[2] ?? "";
const safe = (s: string) => /^[a-z][a-z0-9-]{2,40}$/.test(s);
const sha = (s: string) => /^[0-9a-f]{40}$/.test(s);
const call = (cmd: string, args: string[], options: { cwd?: string; timeout?: number } = {}) =>
  execFileSync(cmd, args, { encoding: "utf8", timeout: 30000, ...options }).trim();
const unitState = (unit: string) =>
  call("systemctl", ["show", unit, "-p", "ActiveState", "--value"]);
const wait = async (
  predicate: () => boolean,
  until: number,
  failed: () => boolean = () => false,
) => {
  while (!predicate()) {
    assert(
      Date.now() < until && !failed(),
      "Stage ended or exceeded its ceiling before producing the required evidence",
    );
    await sleep(15000);
  }
};
function state(body: object) {
  const f = path.join(root, "queues", label, "state.json");
  fs.writeFileSync(f + ".new", JSON.stringify({ at: clock(), ...body }) + "\n");
  fs.renameSync(f + ".new", f);
}
function identified(step: Step) {
  assert(
    Number.isInteger(step.item) &&
      step.item >= 1 &&
      step.item <= 5 &&
      safe(step.tag) &&
      sha(step.source),
  );
  assert(["zero", "reader", "activation", "seed", "interference", "small"].includes(step.mode));
  for (const tag of [
    step.baseline,
    step.seedImage,
    step.sizing,
    step.retryOf,
    step.groupControl,
    step.when?.tag,
    ...(step.sizingChoices ?? []),
  ])
    if (tag) assert(safe(tag));
  if (step.layout) assert(step.item >= 3 && ["pooled", "separate"].includes(step.layout));
  if (step.live)
    assert(
      step.item === 3 &&
        step.mode === "interference" &&
        ["staggered", "coincident"].includes(step.live),
    );
  if (step.groupControl)
    assert(step.item === 3 && step.mode === "interference" && step.layout === "pooled");
  if (step.activationMode)
    assert(
      step.activationMode === "delta" &&
        step.item === 2 &&
        step.mode === "activation" &&
        step.bounded &&
        !step.layout &&
        !step.seedImage,
    );
  if (step.bootstrapCache) assert(sha(step.bootstrapCache));
}
export async function prepare(step: Pick<Step, "source" | "bootstrapCache">) {
  const build = path.join(root, "build-" + step.source),
    exit = path.join(build, "results/bootstrap.exit");
  if (!exists(exit)) {
    assert(!exists(build), "Preserve failed preparation and supply a fresh published revision");
    const unit = "triplex-scale1-prepare-" + step.source.slice(0, 12),
      start = Date.now();
    const checkout = path.join(root, "source-" + step.source);
    if (!exists(checkout))
      call(
        "git",
        [
          "-c",
          "credential.helper=",
          "clone",
          "--no-checkout",
          "https://github.com/OnboardedInc/Triplex-db-experiments.git",
          checkout,
        ],
        { timeout: 180000 },
      );
    call("git", ["-C", checkout, "checkout", "--detach", step.source]);
    const args = [
      "--no-block",
      "--unit=" + unit,
      "--property=RuntimeMaxSec=2100s",
      "--property=KillMode=control-group",
      "--setenv=GIT_TERMINAL_PROMPT=0",
      "--setenv=GIT_CONFIG_GLOBAL=/dev/null",
      "--setenv=GIT_CONFIG_NOSYSTEM=1",
    ];
    if (step.bootstrapCache)
      args.push(
        "--setenv=DX_NATIVE_BOOTSTRAP_CACHE=" + path.join(root, "build-" + step.bootstrapCache),
      );
    call("systemd-run", [
      ...args,
      "bash",
      path.join(checkout, "lab/experiments/EXP-DX1/t1/bare-metal.sh"),
      "--prepare",
      step.source,
      build,
    ]);
    await wait(
      () => exists(exit),
      start + 2160000,
      () => Date.now() - start > 90000 && ["inactive", "failed"].includes(unitState(unit)),
    );
  }
  assert.equal(fs.readFileSync(exit, "utf8").trim(), "0");
  await wait(
    () =>
      ["inactive", "failed"].includes(
        unitState("triplex-scale1-prepare-" + step.source.slice(0, 12)),
      ),
    Date.now() + 180000,
  );
  return build;
}
async function run(step: Step) {
  const base = path.join(root, step.tag),
    attempt = path.join(base, "attempt.json"),
    unit = "triplex-scale1-" + step.tag,
    build = path.join(root, "build-" + step.source),
    runtime = path.join(build, "repository"),
    node = path.join(build, "tools/bin/node");
  if (!exists(attempt)) {
    state({ stage: "preparing", step });
    assert.equal(await prepare(step), build);
    const prior = step.baseline ? read(path.join(root, step.baseline, "attempt.json")) : null;
    if (prior)
      assert(prior.source === step.source && prior.mode === "zero" && prior.item === step.item);
    const sizing =
      step.sizing ??
      step.sizingChoices?.find(
        (t) =>
          exists(path.join(root, t, "sizing.json")) ||
          (step.item === 5 &&
            step.mode === "seed" &&
            exists(path.join(root, t, "transfer/seed-image.json")) &&
            read(path.join(root, t, "terminal.json")).service === "success"),
      );
    const opts = [
      ...(step.bounded ? ["--bounded-readers"] : []),
      ...(step.activationMode ? ["--activation-mode", step.activationMode] : []),
      ...(step.live ? ["--profile", "deep-live", "--peak-alignment", step.live] : []),
      ...(step.layout ? ["--account-layout", step.layout] : []),
      ...(step.baseline ? ["--baseline", step.baseline] : []),
      ...(step.seedImage ? ["--seed-image", step.seedImage] : []),
      ...(step.groupControl ? ["--group-control", step.groupControl] : []),
      ...(sizing ? ["--sizing", sizing] : []),
    ];
    const args = [
      "--experimental-strip-types",
      path.join(runtime, experiment),
      "launch",
      String(step.item),
      step.tag,
      step.mode,
      ...opts,
    ];
    const proc = spawnSync(node, args, {
      cwd: runtime,
      env: {
        ...process.env,
        PATH: path.join(build, "tools/bin") + ":" + process.env.PATH,
        DOCKER_HOST: "unix:///var/run/docker.sock",
        DX_SCALE1_RUNTIME_REPO: runtime,
      },
      encoding: "utf8",
      timeout: 180000,
    });
    fs.writeFileSync(
      path.join(root, "queues", label, step.tag + "-submission.log"),
      (proc.stdout ?? "") + (proc.stderr ?? ""),
    );
    assert((proc.status === 0 || proc.status === 75) && exists(attempt), "Arm submission failed");
  }
  const a = read(attempt);
  assert(
    a.item === step.item &&
      a.mode === step.mode &&
      a.source === step.source &&
      a.tag === step.tag &&
      a.layout === step.layout &&
      a.live === step.live &&
      a.bounded === step.bounded &&
      a.activationMode === step.activationMode &&
      a.groupControl === step.groupControl,
  );
  state({ stage: "running", step, ceilingUTC: new Date(a.at + a.ceiling * 1000).toISOString() });
  await wait(
    () => exists(path.join(base, "transfer.json")),
    a.at + (a.ceiling + 3750) * 1000,
    () => Date.now() - a.at > 90000 && ["inactive", "failed"].includes(unitState(unit)),
  );
  const t = read(path.join(base, "terminal.json")),
    transport = read(path.join(base, "transfer.json"));
  assert(
    t.nonce === a.nonce &&
      transport.nonce === a.nonce &&
      t.source === a.source &&
      t.slot === a.slot &&
      t.cleanup === true,
  );
  await wait(() => ["inactive", "failed"].includes(unitState(unit)), Date.now() + 180000);
  if (step.activationMode === "delta") {
    if (t.service === "success") {
      call(
        node,
        ["--import", "tsx", "lab/experiments/EXP-DX1/actv-delta/verify-campaign.ts", base],
        { cwd: runtime, timeout: 120000 },
      );
    }
    return {
      success: t.service === "success",
      capacity: t.service === "capacity-refused",
      service: t.service,
      scopeReports: t.scopeReports,
      stopReason: t.stopReason,
    };
  }
  if (a.item >= 2 && a.spec.people * a.spec.scopes >= 100000 && t.service === "success") {
    const proof = read(path.join(base, "transfer/preflight.json"));
    const binding = { source: a.source, slot: a.slot, nonce: a.nonce };
    validatePreflight(proof, binding);
    const disk = read(path.join(base, "transfer/preflight-disk.json"));
    assert.deepEqual(disk.binding, binding);
    assert(disk.before.at >= a.at && disk.after.at >= disk.before.at);
  }
  let verified = t.scopeReports === a.spec.scopes;
  if (step.mode === "seed" && exists(path.join(base, "seed-disk.json"))) {
    const d = read(path.join(base, "seed-disk.json")),
      state = read(path.join(base, "partial.json"));
    const actual = state.scopes ?? [];
    const tenantSeed = [3, 5].includes(a.item) && a.layout === "pooled";
    const study = a.item === 3 ? "interference" : "million";
    const pins = read(
      path.join(
        root,
        "build-" + a.source,
        "repository/lab/experiments/EXP-DX1/scale1/" +
          (tenantSeed ? "tenant-seeds.json" : "profile.json"),
      ),
    );
    verified =
      state.tag === a.tag &&
      actual.length > 0 &&
      actual.length === a.capacity.seedScopeLimit &&
      actual.every((r: any) => {
        if (!/^s[0-9]+$/.test(r.scope)) return false;
        const seed = read(path.join(base, "transfer", r.scope, "seed-observed.json"));
        if (tenantSeed)
          assert.deepEqual(seed.identity.tenant, {
            study,
            topology: "pooled",
            physical: 0,
          });
        else assert.equal(seed.identity.tenant, undefined);
        const expected = tenantSeed
          ? pins[study + "/pooled/0"]
          : pins.find((p: any) => p.people === r.people)?.population;
        return (
          r.status === "SEEDED" &&
          r.facts > 0 &&
          r.facts === seed.seed.facts &&
          seed.identity.source === a.source &&
          seed.identity.nonce === a.nonce &&
          seed.identity.slot === a.slot &&
          seed.identity.account === Number(r.scope.slice(1)) &&
          seed.seed.people === r.people &&
          r.people === a.spec.people &&
          seed.seed.sha256 === expected
        );
      }) &&
      actual.reduce((n: number, r: any) => n + r.facts, 0) === d.facts &&
      d.after.at >= a.at &&
      d.after.at >= d.before.at;
  }
  if (exists(path.join(base, "database-limit.json"))) {
    const r = read(path.join(base, "database-limit.json"));
    verified =
      a.item === 4 &&
      r.source === a.source &&
      r.slot === a.slot &&
      r.nonce === a.nonce &&
      r.at >= a.at &&
      r.requested === 100 &&
      r.opened === r.prior.length &&
      r.opened < 100 &&
      r.failedAccount === r.opened &&
      r.error &&
      r.operation &&
      r.prior.every(
        (d: any, i: number) =>
          d.account === i &&
          d.openedAt >= a.at &&
          d.database ===
            "s2-" +
              Buffer.from(
                JSON.stringify(["triplex-scope-v1", "test", "test", d.scope, 0]),
              ).toString("base64url"),
      );
  }
  const summary = exists(path.join(base, "summary.json"))
    ? read(path.join(base, "summary.json"))
    : null;
  const correctness = summary
    ? summary.source === a.source &&
      summary.nonce === a.nonce &&
      summary.slot === a.slot &&
      summary.scopeCount === a.spec.scopes &&
      summary.perScope.length === a.spec.scopes &&
      new Set(summary.perScope.map((s: any) => s.account)).size === a.spec.scopes &&
      summary.perScope.every((s: any) => {
        const o = s.observations;
        assert(Number.isInteger(s.account) && s.account >= 0 && s.account < a.spec.scopes);
        const bytes = fs.readFileSync(
          path.join(base, "transfer", "s" + s.account, "ns-report.json"),
        );
        assert.equal(createHash("sha256").update(bytes).digest("hex"), s.hashes.report);
        const run = JSON.parse(bytes.toString("utf8"));
        // [DX-SCALE1] Why: a deadline witnessed for a planned field save answers the capacity question while correctness still covers all ACKs, reads and feed effects. Rejected: calling missing offers, unbound losses or an oracle failure a saturation result.
        const expiredLoad =
          !!step.live &&
          run.deep?.identity?.tenant?.live === step.live &&
          summary.profile === "deep-live/1" &&
          Number.isSafeInteger(o.expired) &&
          o.expired > 0 &&
          o.missing === 0 &&
          o.committed + o.expired + (o.expiredDependents ?? 0) === o.primaries &&
          run.writer?.expired === o.expired + (o.expiredResends ?? 0) &&
          run.writer?.pendingAtEnd === 0;

        return (
          run.status === "DONE" &&
          !run.finalizationErrors?.length &&
          !run.invalidReasons?.length &&
          s.invalid.every(
            (r: string) =>
              (r === "Attempt did not finish every check or a load generator saturated" &&
                run.client?.invalid) ||
              (expiredLoad &&
                r ===
                  "0 missing offers, " +
                    (o.expired + (o.expiredDependents ?? 0)) +
                    " unsuccessful primaries, " +
                    o.expired +
                    " expired" +
                    (o.expiredDependents
                      ? ", " + o.expiredDependents + " blocked by expired creation"
                      : "")),
          ) &&
          o.correctness.reads > 0 &&
          o.correctness.reads === o.correctness.correct &&
          !o.correctness.errors &&
          !o.correctness.violations &&
          o.oracle.status === "PASS" &&
          o.oracle.receiptConsistency === "PASS" &&
          o.oracle.exitCode === 0 &&
          o.oracle.mismatchCount === 0 &&
          o.oracle.reads > 0 &&
          o.oracle.reads === o.oracle.modelCorrectOnSameReads &&
          o.missing === 0 &&
          (o.committed === o.primaries || expiredLoad)
        );
      })
    : verified &&
      t.scopeReports === 0 &&
      (step.mode === "seed" || exists(path.join(base, "database-limit.json")));
  return {
    success: t.service === "success" && verified && correctness,
    capacity: t.service === "capacity-refused",
    service: t.service,
    scopeReports: t.scopeReports,
    correctness,
    invalid: summary?.invalid,
  };
}
// [DX-SCALE1] Why: a reader fix needs a fresh zero on the same source; both attempts remain in the item's failure count. Rejected: comparing different revisions or letting another item bypass a failure.
export function resumesItem(failed: Step, retry: Step, next?: Step) {
  if (
    retry.item !== failed.item ||
    retry.layout !== failed.layout ||
    retry.live !== failed.live ||
    retry.retryOf !== failed.tag
  )
    return false;
  if (retry.mode === failed.mode) return true;
  return (
    failed.mode === "reader" &&
    retry.mode === "zero" &&
    retry.source !== failed.source &&
    next?.item === retry.item &&
    next.mode === "reader" &&
    next.layout === retry.layout &&
    next.source === retry.source &&
    next.baseline === retry.tag &&
    next.retryOf === failed.tag
  );
}
// [DX-SCALE1] Why: each phase must release its cgroup and retain its own terminal attempt, even with the Mac disconnected. Rejected: a background SSH stream that owns the stack.
async function main() {
  assert(safe(label) && process.platform === "linux" && process.getuid?.() === 0);
  const dir = path.join(root, "queues", label),
    ledgerFile = path.join(dir, "ledger.json");
  const ledger: any[] = exists(ledgerFile) ? read(ledgerFile) : [];
  for (;;) {
    const p: Plan = read(path.join(dir, "plan.json"));
    assert(p.label === label && new Set(p.steps.map((s) => s.tag)).size === p.steps.length);
    p.steps.forEach(identified);
    const failures = ledger.filter((row) => !row.success && !row.capacity);
    const twice = failures.find((a) => failures.filter((b) => b.item === a.item).length >= 2);
    if (twice && !p.keepGoing) {
      state({ stage: "stopped-after-two-failures", item: twice.item, ledger });
      process.exitCode = 2;
      return;
    }
    const remaining = p.steps.filter((s) => !ledger.some((r) => r.tag === s.tag));
    const ready = p.keepGoing
      ? remaining.filter((s) =>
          [s.baseline, s.groupControl, s.seedImage].every(
            (required) =>
              !required || ledger.some((r) => r.tag === required && r.success && !r.skipped),
          ),
        )
      : remaining;
    // [DX-SCALE1] Why: on failure, use the box for the next independent item and then return to the earlier arms. Rejected: treating a missing control as a measurement or blocking unrelated work.
    const step =
      (p.keepGoing && ready.find((s) => !failures.some((r) => r.item === s.item))) || ready[0];
    if (!step) {
      const pending = failures.filter(
        (f) => !ledger.some((r) => r.retryOf === f.tag && (r.success || r.capacity)),
      );
      state({
        stage: !p.final
          ? "plan-consumed"
          : pending.length || remaining.length
            ? "finished-with-failures"
            : "complete",
        ledger,
        deferred: remaining.map((s) => s.tag),
      });

      return;
    }
    if (failures.length && !p.keepGoing) {
      const last = ledger.at(-1);
      if (
        !last.success &&
        !last.capacity &&
        !resumesItem(last, step, p.steps[p.steps.indexOf(step) + 1])
      ) {
        state({ stage: "first-failure-needs-retry", item: last.item, ledger });
        process.exitCode = 1;
        return;
      }
    }
    if (step.when) {
      const ref = read(path.join(root, step.when.tag, "terminal.json")),
        attempt = read(path.join(root, step.when.tag, "attempt.json"));
      assert(ref.nonce === attempt.nonce && ref.cleanup && attempt.item === step.item);
      const eligible =
        step.when.action === "live"
          ? ref.scopeReports > 0 && ref.service === "success"
          : ref.service === "capacity-refused" && attempt.capacity.fitsSeed;
      if (!eligible) {
        ledger.push({
          ...step,
          success: true,
          skipped: true,
          reason: "condition on " + step.when.tag + " was not met",
          at: clock(),
        });
        fs.writeFileSync(ledgerFile + ".new", JSON.stringify(ledger, null, 2) + "\n");
        fs.renameSync(ledgerFile + ".new", ledgerFile);
        continue;
      }
    }
    let outcome;
    try {
      outcome = await run(step);
    } catch (e) {
      outcome = { success: false, capacity: false, error: String(e) };
    }
    ledger.push({ ...step, ...outcome, at: clock() });
    fs.writeFileSync(ledgerFile + ".new", JSON.stringify(ledger, null, 2) + "\n");
    fs.renameSync(ledgerFile + ".new", ledgerFile);
    state({ stage: "collected-on-server", last: ledger.at(-1) });
    if (!outcome.success && !outcome.capacity && !p.keepGoing) {
      const n = ledger.filter((r) => r.item === step.item && !r.success && !r.capacity).length;
      state({
        stage: n >= 2 ? "stopped-after-two-failures" : "first-failure-needs-retry",
        item: step.item,
        ledger,
      });
      process.exitCode = n >= 2 ? 2 : 1;
      return;
    }
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
