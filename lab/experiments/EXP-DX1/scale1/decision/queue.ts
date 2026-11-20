import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { setTimeout as nap } from "node:timers/promises";
import { prepare } from "../remote-sequence.ts";
import { activeUnitArgs, dedicatedHost } from "../source.ts";
import { layoutOf, reusableSeed } from "./plan.ts";
import type { Request } from "./server.ts";

const root = "/var/tmp/triplex-scale1",
  base = path.join(root, "decision"),
  attempts = path.join(base, "attempts"),
  ready = path.join(base, "plan.json"),
  ledgerFile = path.join(base, "ledger.json");
const exists = fs.existsSync;
const read = (f: string) => JSON.parse(fs.readFileSync(f, "utf8"));
const put = (f: string, data: unknown) => {
  fs.writeFileSync(f + ".pending", JSON.stringify(data) + "\n");
  fs.renameSync(f + ".pending", f);
};
const progress = (data: object) =>
  put(path.join(base, "state.json"), { ...data, at: new Date().toISOString() });
const call = (cmd: string, args: string[], cwd?: string, timeout = 30000) =>
  execFileSync(cmd, args, { cwd, encoding: "utf8", timeout }).trim();
const state = (unit: string) => call("systemctl", ["show", unit, "-p", "ActiveState", "--value"]);
function released() {
  assert.equal(process.env.DOCKER_HOST, "unix:///var/run/docker.sock");
  const platform = path.join(root, "platform"),
    governor = "/sys/devices/system/cpu/cpufreq";
  const sum = (filename: string) =>
    createHash("sha256").update(fs.readFileSync(filename)).digest("hex");
  dedicatedHost(
    read(path.join(platform, "dedicated.json")),
    sum("/etc/machine-id"),
    sum(path.join(platform, "delivered.txt")),
    fs
      .readdirSync(governor)
      .filter((p) => /^policy\d+$/.test(p))
      .map((p) => fs.readFileSync(path.join(governor, p, "scaling_governor"), "utf8").trim()),
    fs.readFileSync("/sys/devices/system/cpu/smt/active", "utf8").trim(),
  );
  assert.equal(call("systemctl", [...activeUnitArgs, "triplex-scale1-arm-*.service"]), "");
  assert.equal(call("docker", ["ps", "-q"]), "");
}
type Step = Omit<Request, "source" | "nonce" | "review">;
type Plan = {
  source: string;
  review: string;
  bootstrapCache: string;
  steps: Step[];
  maxHours: number;
};

function plan(): Plan {
  const p = read(ready) as Plan;
  assert(
    /^[a-f0-9]{40}$/.test(p.source) &&
      /^[a-f0-9]{64}$/.test(p.review) &&
      /^[a-f0-9]{40}$/.test(p.bootstrapCache),
  );
  assert(
    Array.isArray(p.steps) &&
      (p.steps.length >= 2 || (p.steps.length === 1 && p.steps[0]?.fromTransfer)) &&
      new Set(p.steps.map((s) => s.tag)).size === p.steps.length,
  );
  assert(Number.isInteger(p.maxHours) && p.maxHours > 0 && p.maxHours <= 40);
  for (const [i, s] of p.steps.entries()) {
    assert(/^arm-d7-[a-z0-9-]{2,24}$/.test(s.tag));
    assert(
      ["pooled", "split5", "single"].includes(s.layout) &&
        (s.people === 10000 || s.people === 100000),
    );
    if (s.layout === "single") assert(s.people === 100000 && s.mode === "individual");
    assert((typeof s.withReaders === "boolean") === (s.layout === "single" && s.phase === "cells"));
    if (s.phase === "cells") {
      assert(["individual", "bounded", "prepared"].includes(s.mode));
      const earlier = p.steps.slice(0, i).find((q) => q.tag === s.from);
      if (s.fromTransfer) {
        assert(reusableSeed(s.people, s.layout) && !earlier);
        assert.match(s.from ?? "", /^arm-d7-[a-z0-9-]{2,24}$/);
        assert.match(s.fromTransfer, /^[a-f0-9]{64}$/);
      } else {
        assert(
          earlier?.phase === "seed" && earlier.people === s.people && earlier.layout === s.layout,
        );
      }
    } else assert(s.phase === "seed" && s.mode === "individual" && !s.from);
  }
  return p;
}

async function run(p: Plan, s: Step, deadline: number, build: string) {
  const dir = path.join(attempts, s.tag),
    repo = path.join(build, "repository"),
    node = path.join(build, "tools/bin/node"),
    unit = "triplex-scale1-" + s.tag,
    pathEnv = path.join(build, "tools/bin") + ":" + process.env.PATH;
  assert.equal(call("git", ["rev-parse", "HEAD"], repo), p.source);
  if (!exists(dir)) {
    released();
    const remaining = Math.floor((deadline - Date.now()) / 1000);
    const large = s.layout !== "single" && s.people === 100000;
    const h = s.phase === "seed" ? (large ? 18 : 3) : large ? 5 : 2;
    assert(
      remaining > (s.phase === "seed" && large ? 6 : 1) * 3600,
      "Campaign ceiling leaves too little time to start this arm",
    );
    const ceiling = Math.min(h * 3600, remaining);
    if (s.from) {
      const receipt = fs.readFileSync(path.join(attempts, s.from, "transfer.json"));
      const src = JSON.parse(receipt.toString("utf8"));
      assert(src.result === "success" && src.tag === s.from);
      if (s.fromTransfer)
        assert.equal(createHash("sha256").update(receipt).digest("hex"), s.fromTransfer);
      else assert.equal(src.source, p.source);
    }
    const request: Request = { ...s, source: p.source, nonce: randomUUID(), review: p.review };
    const slot = "tx2-dxscale1-" + s.tag;
    const placement = layoutOf(s.layout);
    fs.mkdirSync(dir);
    put(path.join(dir, "request.json"), request);
    put(path.join(dir, "attempt.json"), {
      ...request,
      slot,
      at: Date.now(),
      ceiling,
      study: "decision",
      item: 7,
      spec: {
        accounts: placement.flat().length,
        scopes: placement.length,
        people: placement[0]!.length * s.people,
      },
    });
    const code = path.join(repo, "lab/experiments/EXP-DX1/scale1/decision");
    const stop = [node, "--import", "tsx", path.join(code, "stop.ts"), dir].join(" ");
    const out = call(
      "systemd-run",
      [
        "--no-block",
        "--unit=" + unit,
        "--working-directory=" + repo,
        "--property=RuntimeMaxSec=" + ceiling,
        "--property=TimeoutStopSec=180",
        "--property=KillMode=control-group",
        "--property=ExecStopPost=" + stop,
        // [DX-SCALE1] Why: the stack's admission sees every assigned native role. Rejected: pinning setup to the sender core before the stack checks CPU availability.
        "--property=AllowedCPUs=0-8",
        "--setenv=PATH=" + pathEnv,
        "--setenv=DOCKER_HOST=unix:///var/run/docker.sock",
        // [DX-SCALE1] Why: the stop hook runs outside the stack's startup environment.
        // Rejected: assuming DOCKER_HOST alone opts an interrupted Linux stack into the cleanup path.
        "--setenv=DX_BARE_METAL=1",
        "--setenv=DX_BARE_METAL_ROOT=" + dir,
        "--setenv=GIT_TERMINAL_PROMPT=0",
        "--setenv=GIT_CONFIG_GLOBAL=/dev/null",
        "--setenv=GIT_CONFIG_NOSYSTEM=1",
        "/usr/bin/flock",
        "-n",
        path.join(root, "exclusive.lock"),
        node,
        "lab/bin/heavy.mjs",
        "--label",
        "DX-SCALE1-decision-native",
        "--",
        node,
        "--import",
        "tsx",
        path.join(code, "server.ts"),
        dir,
      ],
      repo,
    );
    fs.writeFileSync(path.join(dir, "submit.log"), out + "\n", { flag: "wx" });
  }
  const a = read(path.join(dir, "attempt.json"));
  assert(
    a.source === p.source &&
      a.tag === s.tag &&
      a.phase === s.phase &&
      a.slot === "tx2-dxscale1-" + s.tag,
  );
  progress({
    stage: "running",
    arm: s,
    ceilingUTC: new Date(a.at + a.ceiling * 1000).toISOString(),
  });
  const done = path.join(dir, "unit.json");
  while (!exists(done) || !["inactive", "failed"].includes(state(unit))) {
    assert(
      Date.now() < a.at + (a.ceiling + 480) * 1000,
      "The run failed to release its scoped unit",
    );
    if (!exists(done) && Date.now() - a.at > 90000 && ["inactive", "failed"].includes(state(unit)))
      throw Error("Native execution has no terminal record. Preserve its directory.");
    await nap(15000);
  }
  const transport = path.join(dir, "transfer.json");
  progress({ stage: "packaging", arm: s });
  let lastError: string | undefined;
  for (let attempt = 0; attempt < 2 && !exists(transport); attempt++) {
    try {
      const check = execFileSync(
        node,
        ["--import", "tsx", "lab/experiments/EXP-DX1/scale1/decision/finalize.ts", dir],
        {
          cwd: repo,
          env: { ...process.env, PATH: pathEnv },
          encoding: "utf8",
          timeout: 600000,
        },
      );
      fs.writeFileSync(path.join(dir, "package.log"), check);
    } catch (e) {
      lastError = String(e);
    }
  }
  if (!exists(transport))
    return { tag: s.tag, outcome: "packaging-failed", reason: lastError, definitive: false };
  const t = read(transport);
  assert(t.tag === s.tag && t.source === p.source && t.nonce === a.nonce);
  return { tag: s.tag, outcome: t.result, definitive: true };
}

async function main() {
  assert(process.platform === "linux" && process.getuid?.() === 0);
  const first = plan(),
    old = path.join(root, "queues", "p6-live");
  fs.mkdirSync(attempts, { recursive: true });
  progress({ stage: "waiting for first staggered arm" });
  for (;;) {
    if (
      read(path.join(old, "state.json")).stage === "plan-consumed" &&
      ["inactive", "failed"].includes(state("triplex-scale1-p6-handoff-v2.service"))
    )
      break;
    await nap(15000);
  }
  const preceding = read(path.join(old, "ledger.json"));
  assert(
    preceding.length === 2 &&
      preceding[1].tag === "arm-p6-i1-pool-staggered-a" &&
      preceding[1].source === "a4b2331e966113aaab02d51a3c65aca1be804fe4",
  );
  const startedFile = path.join(base, "started.json");
  if (!exists(startedFile)) put(startedFile, { start: Date.now(), source: first.source });
  const started = read(startedFile);
  assert.equal(started.source, first.source);
  const deadline = started.start + first.maxHours * 3600000;
  progress({
    stage: "preparing published decision runtime",
    source: first.source,
    ceilingUTC: new Date(deadline).toISOString(),
  });
  released();
  const build = await prepare(first);
  const results: { tag: string; outcome: string; definitive?: boolean; reason?: string }[] = exists(
    ledgerFile,
  )
    ? read(ledgerFile)
    : [];
  for (;;) {
    const p = plan();
    assert.equal(p.source, first.source);
    const pilot = p.steps.find(
      (s) => s.people === 10000 && s.phase === "cells" && s.mode === "bounded",
    );
    const pilotDir = pilot && path.join(attempts, pilot.tag);
    // [DX-SCALE1] Why: a finalizer failure cannot erase a completed native pilot. Rejected: spending a million-person load on an unexercised writer or replaying a measured pilot to regenerate a transfer.
    const pilotComplete =
      pilot &&
      pilotDir &&
      (results.some((r) => r.tag === pilot.tag && r.outcome === "success") ||
        (exists(path.join(pilotDir, "measurement.json")) &&
          exists(path.join(pilotDir, "unit.json")) &&
          (() => {
            const a = read(path.join(pilotDir, "attempt.json"));
            const m = read(path.join(pilotDir, "measurement.json"));
            const unit = read(path.join(pilotDir, "unit.json"));
            return (
              a.source === p.source &&
              unit.result === "success" &&
              m.source === a.source &&
              m.slot === a.slot &&
              m.nonce === a.nonce &&
              unit.nonce === a.nonce &&
              m.cells.length === 10
            );
          })()));
    const s = p.steps.find(
      (s) =>
        !results.some((r) => r.tag === s.tag) &&
        (s.layout === "single" || s.people === 10000 || pilotComplete) &&
        (!s.from || results.some((r) => r.tag === s.from && r.outcome === "success")),
    );
    if (!s) {
      const remaining = p.steps
        .filter((s) => !results.some((r) => r.tag === s.tag))
        .map((s) => s.tag);
      progress({ stage: "plan-consumed", remaining, results });
      return;
    }
    try {
      results.push(await run(p, s, deadline, build));
    } catch (e) {
      results.push({
        tag: s.tag,
        outcome: "execution-incomplete",
        definitive: false,
        reason: String(e),
      });
      const current = state("triplex-scale1-" + s.tag);
      if (current !== "inactive" && current !== "failed") {
        put(ledgerFile, results);
        progress({ stage: "blocked by unreleased unit", arm: s, current });
        throw e;
      }
    }
    put(ledgerFile, results);
  }
}
await main();
