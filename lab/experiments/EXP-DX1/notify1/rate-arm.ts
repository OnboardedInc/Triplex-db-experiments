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

const { slotCpu }: { slotCpu(holder: string, lane: string, slot: string): unknown } = await import(
  new URL("../../../bin/engine.mjs", import.meta.url).href
);
const [mode, size, pause, duration, shape = "fixture", pages = "1"] = process.argv.slice(2);
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
assert(batchPages === 1);
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
assert.equal(
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  binding.source,
);
const pins = inputPins(binding.source);
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
      : await fixtureProfile(source, n, 625);
  const run = await runWindow({
    source,
    receiver: rx,
    epoch,
    profile: p,
    readers: 4,
    pace: shape === "deep" ? 0 : 60,
    gapMs: gap,
    priority: mode !== "idle",
    idle: mode === "idle",
    budget,
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
        run.dispatch.deliveries === run.proof.eventCounts[1] &&
        run.dispatch.deliveries > 0,
    );
  if (mode !== "idle") assert(reads.length && saves.length);
  const raw = gzipSync(JSON.stringify({ reads, saves, history }));
  fs.writeFileSync(path.join(dir, "traffic.json.gz"), raw, { flag: "wx" });
  assert.deepEqual(inputPins(binding.source), pins);
  assert(fs.readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER!).equals(ownerBytes));
  const out = {
    binding,
    pins,
    mode,
    n,
    gap,
    shape,
    batchPages,
    profiled,
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
