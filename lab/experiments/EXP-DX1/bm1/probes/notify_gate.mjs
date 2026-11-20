import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [action, tag, source] = process.argv.slice(2);
assert(/^(run|cleanup|cleanup-full)$/.test(action));
assert(/^notify-bm1n20b?$/.test(tag) && /^[a-f0-9]{40}$/.test(source));
const program = (file) => import(pathToFileURL(path.resolve("lab/experiments/EXP-DX1", file)).href);
const [{ scaleHost, startScaleStack }, { commandPlan }, { inspectPair }] = await Promise.all([
  program("scale1/bench.ts"),
  program("notify1/bench.ts"),
  program("notify1/inspect.ts"),
]);
const { dir, prefix, tag: child } = commandPlan(action === "cleanup-full" ? tag : tag + "-smk");
const log = path.join(dir, "attempt.json");
const read = (file) => JSON.parse(fs.readFileSync(file));
const save = (file, value) =>
  fs.writeFileSync(path.join(dir, file), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const command = (...args) => execFileSync(args[0], args.slice(1), { encoding: "utf8" }).trim();
assert.equal(command("git", "rev-parse", "HEAD"), source);
scaleHost.physical();

if (action.startsWith("cleanup")) {
  if (fs.existsSync(log)) {
    const owner = read(log);
    assert.deepEqual([owner.source, owner.slot, owner.tag], [source, prefix, child]);
    scaleHost.clean(dir, prefix);
  }
} else {
  // [DX-BM1] Why: pass the exact copied-route preflight and both collectors before creating the full producer unit.
  // Rejected: treating the published launch as a preflight or relying on a 1k Mac run with a different delivery route.
  const [{ preflight }, { inputPins }] = await Promise.all([
    program("notify1/preflight.ts"),
    program("notify1/rung.ts"),
  ]);
  assert.equal(command("git", "status", "--porcelain"), "");
  scaleHost.released();
  assert(Object.values(scaleHost.childrenInventory(prefix)).every((items) => !items.length));
  fs.mkdirSync(dir, { mode: 0o700 });
  const binding = { source, slot: prefix, nonce: randomUUID() };
  const recipient = { route: "copied", pages: 16, intervalMs: 0, copyWorkers: 4 };
  save("attempt.json", { ...binding, tag: child, recipient, inputs: inputPins() });
  try {
    const { env, engines } = startScaleStack(dir, prefix, source);
    for (const [role, cpus] of Object.entries({ pg: "1", tx: "0", "gw-w": "2", "gw-r": "4,8" }))
      assert.equal(engines[role].cpus, cpus);
    save("placement.json", engines);
    Object.assign(process.env, env, {
      DATOMIC_URL: "http://" + engines["gw-w"].address + ":8080",
      NOTIFY_SENDER_URL: "http://" + engines["gw-r"].address + ":8080",
      NOTIFY_NATIVE: "1",
      NOTIFY_COPY_WORKERS: String(recipient.copyWorkers),
      TRIPLEX_DATOMIC_LAYOUT: "lean",
      TX2_W0_POINT_JOURNAL: "1",
      TX2_W0_RESTORE_INDEXED_JOURNAL: "1",
      TX2_SWEEP_STRICT: "1",
    });
    delete process.env.DATOMIC_READ_URLS;
    command("taskset", "-pc", "3,5,6,7,9,10,11", String(process.pid));
    await preflight(dir, binding, recipient);
    save("producer-preflight.json", inspectPair(path.join(dir, "notice-preflight")));
  } finally {
    scaleHost.clean(dir, prefix);
  }
}
