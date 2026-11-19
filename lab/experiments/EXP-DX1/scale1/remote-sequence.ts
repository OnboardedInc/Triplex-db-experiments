import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
const root = "/var/tmp/triplex-scale1";
const experiment = "lab/experiments/EXP-DX1/scale1/bench.ts";
const read = (f: string) => JSON.parse(fs.readFileSync(f, "utf8"));
const exists = fs.existsSync;
const clock = () => new Date().toISOString();
type Step = {
  item: number;
  mode: string;
  tag: string;
  source: string;
  baseline?: string;
  sizing?: string;
  bootstrapCache?: string;
};
type Plan = { label: string; steps: Step[]; final: boolean };
const label = process.argv[2] ?? "";
const safe = (s: string) => /^[a-z][a-z0-9-]{2,40}$/.test(s);
const sha = (s: string) => /^[0-9a-f]{40}$/.test(s);
const operator = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
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
  for (const tag of [step.baseline, step.sizing]) if (tag) assert(safe(tag));
  if (step.bootstrapCache) assert(sha(step.bootstrapCache));
}
async function prepare(step: Step) {
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
    unit = "triplex-scale1-" + step.tag;
  if (!exists(attempt)) {
    state({ stage: "preparing", step });
    const build = await prepare(step);
    const prior = step.baseline ? read(path.join(root, step.baseline, "attempt.json")) : null;
    if (prior)
      assert(prior.source === step.source && prior.mode === "zero" && prior.item === step.item);
    const runtime = path.join(build, "repository");
    const opts = [
      ...(step.baseline ? ["--baseline", step.baseline] : []),
      ...(step.sizing ? ["--sizing", step.sizing] : []),
    ];
    const args = [
      "--experimental-strip-types",
      path.join(operator, experiment),
      "launch",
      String(step.item),
      step.tag,
      step.mode,
      ...opts,
    ];
    const proc = spawnSync(path.join(build, "tools/bin/node"), args, {
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
    a.item === step.item && a.mode === step.mode && a.source === step.source && a.tag === step.tag,
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
  const verified =
    step.mode === "seed"
      ? exists(path.join(base, "seed-summary.json")) || exists(path.join(base, "seed-disk.json"))
      : t.scopeReports > 0 || exists(path.join(base, "database-limit.json"));
  return {
    success: t.service === "success" && verified,
    capacity: t.service === "capacity-refused",
    service: t.service,
    scopeReports: t.scopeReports,
  };
}
// [DX-SCALE1] Why: each phase must survive a disconnected Mac, release its systemd cgroup and retain an independently identifiable terminal attempt. Rejected: a background SSH stream or proceeding after a second failed experiment.
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
    if (twice) {
      state({ stage: "stopped-after-two-failures", item: twice.item, ledger });
      process.exitCode = 2;
      return;
    }
    const step = p.steps.find((s) => !ledger.some((r) => r.tag === s.tag));
    if (!step) {
      state({ stage: p.final ? "complete" : "plan-consumed", ledger });
      return;
    }
    if (failures.length) {
      const last = ledger.at(-1);
      if (!last.success && !last.capacity && step.item !== last.item) {
        state({ stage: "first-failure-needs-retry", item: last.item, ledger });
        process.exitCode = 1;
        return;
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
    if (!outcome.success && !outcome.capacity) {
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
