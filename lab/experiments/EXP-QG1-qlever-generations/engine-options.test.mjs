// @ts-nocheck -- [EXP-CHECKJS-R2] runtime-populated records, option bags, or branch-specific union members; Node overloads over dynamic option/result unions. Binding errors remain checked by lab/bin/checkjs.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qg1-engine-"));
process.env.TX2_ENGINE_DIR = path.join(dir, "engines");
process.env.TX2_CONFIG_DIR = path.resolve(import.meta.dirname, "../../..");
const { effectiveConfig } = await import("../../bin/engine.mjs");
const { loadSlots, slotInfo } = await import("../../bin/lib.mjs");
test("resident and other lanes reject overrides before lifecycle", () => {
  for (const [lane, slot, memory] of [
    ["qlever", "dev", "1000M"],
    ["xtdb", "s1", "1000M"],
    ["qlever", "s1", "3000M"],
  ]) {
    const r = spawnSync(
      process.execPath,
      [
        "lab/bin/engine.mjs",
        "up",
        "--lane",
        lane,
        "--slot",
        slot,
        "--holder",
        "CX-QG1-test",
        "--qlever-memory",
        memory,
      ],
      { encoding: "utf8" },
    );
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /exclusive|1000M/);
  }
});
test("seed bytes bind config; a changed seed changes the binding", () => {
  const seed = path.join(dir, "seed");
  fs.mkdirSync(seed);
  fs.writeFileSync(path.join(seed, "seed.nq.gz"), "one");
  const config = loadSlots(),
    info = slotInfo(config, "qlever", "s1");
  Object.assign(info, { qleverSeedDir: seed, qleverMemory: "1000M" });
  const a = effectiveConfig(config, info);
  const script = fs.readFileSync(a.files.startScript, "utf8");
  assert.match(script, /sha256sum -c/);
  assert.match(script, /seed requires an empty index volume/);
  assert.match(script, /-m 1000M/);
  assert.match(script, /rebuild-keep-previous-index-dirs none/);
  fs.writeFileSync(path.join(seed, "seed.nq.gz"), "two");
  const b = effectiveConfig(config, info);
  assert.notEqual(a.sha256, b.sha256);
  assert.notEqual(a.effective.seedDigest, b.effective.seedDigest);
});
test.after(() => fs.rmSync(dir, { recursive: true }));
