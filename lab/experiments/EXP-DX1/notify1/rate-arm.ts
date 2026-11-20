import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { openComposition } from "../../../bench/lib/composition.ts";
import { sha256 } from "../../../bench/lib/w0-world.ts";

import { deepProfile } from "./deep.ts";
import { fixtureProfile, inputPins } from "./rung.ts";
import { recipient } from "./worker.ts";
import { runWindow } from "./workload.ts";

const {
  slotCpu,
  slotGatewayGc,
}: {
  slotCpu(holder: string, lane: string, slot: string): unknown;
  slotGatewayGc(holder: string, lane: string, slot: string): Record<string, string>;
} = await import(new URL("../../../bin/engine.mjs", import.meta.url).href);
const [
  mode,
  size,
  pause,
  duration,
  shape = "fixture",
  pages = "1",
  route = "source",
  train = "1",
  interval = "0",
  concurrency = "4",
  savePeriod = "625",
] = process.argv.slice(2);
const n = Number(size),
  gap = Number(pause),
  ms = Number(duration),
  batchPages = Number(pages);
assert(
  ["active", "baseline", "idle"].includes(mode!) &&
    [1000, 10000].includes(n) &&
    ["fixture", "deep"].includes(shape),
);
assert(
  Number.isInteger(gap) &&
    gap >= 0 &&
    Number.isInteger(ms) &&
    ms >= 0 &&
    (mode === "baseline") === ms > 0,
);
assert(
  ["source", "recipient", "isolated"].includes(route) &&
    Number.isInteger(batchPages) &&
    batchPages >= 1 &&
    batchPages <= 32 &&
    (route !== "source" || batchPages === 1),
);
assert(
  Number.isFinite(Number(interval)) &&
    Number(interval) >= 0 &&
    Number(interval) <= 1000 &&
    (route !== "source" || Number(interval) === 0),
);
const readers = Number(concurrency);
assert([4, 64].includes(readers));
const savePeriodMs = Number(savePeriod);
assert(Number.isInteger(savePeriodMs) && savePeriodMs >= 20 && savePeriodMs <= 1000);
assert(shape === "fixture" || savePeriodMs === 625);
const recipientPages = route !== "source" ? batchPages : undefined;
const dir = process.env.NOTIFY_DIR!,
  binding = JSON.parse(fs.readFileSync(path.join(dir, "binding.json"), "utf8"));
const ownerBytes = fs.readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER!),
  owner = JSON.parse(ownerBytes.toString());
assert(
  binding.owner === sha256(ownerBytes) &&
    owner.holder === "DX-STG1" &&
    owner.mode === "exclusive" &&
    binding.slot === owner.container &&
    owner.endpoint === process.env.DATOMIC_URL,
);
const sourceEndpoint = route === "isolated" ? (owner.readerEndpoint as string) : undefined;
if (route === "isolated") {
  assert(sourceEndpoint && sourceEndpoint !== owner.endpoint, "Exclusive reader peer required");
  const response = await fetch(new URL("/health", sourceEndpoint));
  assert(response.ok, "Exclusive reader peer is unavailable");
}
assert.equal(
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  binding.source,
);
const pins = inputPins(binding.source);
const dependencies = Object.fromEntries(
  [
    "lab/bin/engine.mjs",
    "lab/bench/lib/w0-http.ts",
    "lab/bench/lib/composition.ts",
    "lab/experiments/EXP-DX1/act1/sqlite.ts",
  ].map((file) => {
    const sha = sha256(fs.readFileSync(file));
    assert.equal(sha, sha256(execFileSync("git", ["show", binding.source + ":" + file])));
    return [file, sha];
  }),
);
const epoch = binding.nonce,
  profiled = process.env.NOTIFY_PROFILE === "1";
const src = await openComposition("reach", "datomic", "notice-" + epoch),
  rx = await recipient("act1-notify-" + epoch, dir);
try {
  const budget = profiled
    ? new (await import("./budget.ts")).Budget({ dir, role: "foreground", epoch })
    : undefined;
  const source = budget?.store(src, "live") ?? src;
  const p =
    shape === "deep"
      ? await deepProfile(source, n, new Date().toISOString().replace(/Z$/, "000Z"))
      : await fixtureProfile(source, n, savePeriodMs);
  const run = await runWindow({
    source,
    receiver: rx,
    epoch,
    profile: p,
    readers,
    pace: shape === "deep" ? 0 : 60,
    gapMs: gap,
    priority: mode !== "idle",
    idle: mode === "idle",
    budget,
    recipientPages,
    releases: Number(train),
    readIntervalMs: Number(interval),
    cpuSnapshot: () => slotCpu(owner.holder, owner.lane, owner.slot),
    duration: mode === "baseline" ? ms : undefined,
    workerJob: {
      source: src.scopeName!,
      recipient: rx.scopeName!,
      directory: dir,
      deep: shape === "deep",
      subjects: n,
      epoch,
      gap,
      priority: mode !== "idle",
      profileDir: profiled ? dir : undefined,
      recipientPages,
      releases: Number(train),
      readIntervalMs: Number(interval),
      sourceEndpoint,
    },
    phase: (stage) => console.log(stage),
  });
  const { reads, saves, history, ...summary } = run;
  assert(run.scope === "notice-" + epoch && run.receiver === "act1-notify-" + epoch);
  assert(
    run.activation.operations === 4 &&
      run.activation.assertions === 3 &&
      run.activation.txId === history[1]!.receipt.txId,
  );
  if (mode !== "baseline")
    assert(
      run.proof?.subjects === n &&
        run.proof.receiverStates === n &&
        run.proof.ledgerStates === n &&
        run.dispatch.deliveries ===
          run.proof.eventCounts.slice(1, Number(train) + 1).reduce((a, b) => a + b, 0) &&
        run.dispatch.deliveries > 0,
    );
  if (mode !== "idle") assert(reads.length && saves.length);
  const liveReadCount = reads.filter((r) => r.beganMs + r.latency <= run.duration).length;
  const liveSaveCount = saves.filter((s) => s.atMs + s.ackMs <= run.duration).length;
  const raw = gzipSync(JSON.stringify({ reads, saves, history }));
  fs.writeFileSync(path.join(dir, "traffic.json.gz"), raw, { flag: "wx" });
  const gatewayGc = owner.readerEndpoint
    ? Object.fromEntries(
        Object.entries(slotGatewayGc(owner.holder, owner.lane, owner.slot)).map(([role, log]) => {
          fs.writeFileSync(path.join(dir, role + "-gc.log"), log, { flag: "wx" });
          return [role, sha256(log)];
        }),
      )
    : undefined;
  assert.deepEqual(inputPins(binding.source), pins);
  assert(fs.readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER!).equals(ownerBytes));
  const out = {
    binding,
    pins,
    dependencies,
    mode,
    n,
    gap,
    shape,
    batchPages,
    route,
    savePeriodMs,
    liveReadCount,
    liveSaveCount,
    profiled,
    gatewayGc,
    sourceClock: owner.createdAt,
    raw: sha256(raw),
    ...summary,
  };
  fs.writeFileSync(path.join(dir, "arm.json"), JSON.stringify(out) + "\n", { flag: "wx" });
  console.log(
    JSON.stringify({
      mode,
      n,
      gap,
      rate: run.deliveriesPerSecond,
      readP99: run.readP99,
      saveP99: run.saveP99,
    }),
  );
} finally {
  await rx.close();
  await src.close();
}
