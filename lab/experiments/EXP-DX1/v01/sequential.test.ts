import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, type TestContext } from "node:test";
import { launchProfile } from "../jvm1/launch.mjs";
import { serverStages } from "./profile.ts";
import { cellPath, serverCells } from "./server-workload.ts";
import { assembleSequential, completeSequentialArm, openSequence, sequenceProgress, startSequentialArm, type SequenceConfig } from "./sequential.ts";

function fixture(t: TestContext) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dx-v01-sequential-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const campaign = path.join(root, "campaign");
  const source = "a".repeat(40), imagePin = "b".repeat(64), cut = 12, db = "toy-datomic";
  const stages = serverStages(launchProfile("server", { txJvm: "j25-zgc" }), true);
  const sealed = { dir: "/toy-sealed", device: "7", inode: "1", controlSha256: "c".repeat(64) };
  const config: SequenceConfig = { input: { source, age: "1B", writer: "per-person-ordered", jvm: "j21-g1", txJvm: "j25-zgc", writeJvm: "j21-g1", diagnostics: { serialApply: false, lookupEvery: 0 },
    imagePin, transferPin: "d".repeat(64), originalScope: { db, cut: 4 }, separateWal: true, stages,
    wal: { wal: "/toy-wal", walDevice: "nvme1n1", dataDevice: "nvme0n1" }, agedBundle: "e".repeat(64), agedDump: undefined },
    sealed, cut, buildSha256: "f".repeat(64), forecast: "Toy diagnostic forecast" };
  const seq = openSequence(campaign, config);
  let now = 0;
  t.mock.method(Date, "now", () => now);
  const write = (name: string, object: unknown = {}) => {
    const file = path.join(campaign, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(object));
  };
  const copies = Array.from({ length: 3 }, () => ({ ...sealed, dir: "/toy-reused-scratch", inode: "2" }));
  const begin = (number: number, startedAt: number) => {
    now = startedAt;
    return startSequentialArm(campaign, openSequence(campaign, config), number, copies[number - 1]!, startedAt);
  };
  const finish = (number: number, options: { observedCut?: number; elapsed?: number; attempt?: string } = {}) => {
    const s = stages[number - 1]!;
    const anchor = s.root + (s.loaded ? "loaded" : "zero");
    const slot = "slot-" + number, attempt = options.attempt ?? "attempt-" + number;
    write(anchor + "/attempt.json", { source, slot, nonce: attempt });
    write(anchor + "/arm.json", { source, slot, attempt, firstCut: options.observedCut ?? cut,
      startedAt: now + 1, endedAt: now + 2, seed: { database: db, originalCut: 4, imageSha256: imagePin } });
    write(anchor + "/pgdata.json", { source, slot, attempt, systemIdentifier: "123", copy: copies[number - 1] });
    write(anchor + "/cleanup/inventory.json", { at: now + 3, before: { containers: ["pg", "tx", "gw-w", "gw-r"].map(r => `${slot}-${r}`) },
      after: { containers: [], volumes: [], networks: [] } });
    for (const file of ["operations.json", "launch-check.json", "aged-live-check.json"]) write(anchor + "/" + file);
    if (s.loaded) {
      for (const cell of serverCells) for (const file of ["arm.json", "operations.json"]) write(s.root + cellPath(cell) + "/" + file);
      if (!s.comparison) for (const name of [anchor + "/p7-empty/residency.json", "p8/result.json", "p8/pace-32-fixed.offers.json"]) write(name);
      if (!s.comparison) write(s.root + "mixed-ids.json");
    }
    now += options.elapsed ?? 10;
    completeSequentialArm(campaign, seq, number);
  };
  return { campaign, source, config, seq, write, copies, begin, finish };
}

test("all three arms assemble the same renderer input as the simultaneous copy form", (t) => {
  const f = fixture(t);
  for (let number = 1; number <= 3; number++) {
    assert.equal(f.begin(number, number * 1_000_000).elapsed, (number - 1) * 10);
    f.finish(number);
  }
  const { forecast } = assembleSequential(f.campaign, f.source);
  const expected = JSON.parse(JSON.stringify({ ...f.config.input, pgdata: f.copies }));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.campaign, "input.json"), "utf8")), expected);
  assert.equal(forecast, f.config.forecast);
  assert.equal(sequenceProgress(f.campaign, f.seq).elapsed, 30);
});

test("incomplete, repeated and incompatible arms are refused", (t) => {
  const f = fixture(t);
  assert.throws(() => f.begin(2, 100), /Missing completed arm 1/);
  f.begin(1, 100);
  assert.throws(() => f.begin(1, 110), /already started/);
  assert.throws(() => assembleSequential(f.campaign, f.source), /Missing completed arm 1/);
  assert.throws(() => assembleSequential(f.campaign, "0".repeat(40)), /source commit/);
  assert.throws(() => openSequence(f.campaign, { ...f.config, cut: 13 }), /seal, cut or launch configuration changed/);
  assert.throws(() => f.finish(1, { observedCut: 13 }), /source or sealed cut differs/);
  assert(!fs.existsSync(path.join(f.campaign, "input.json")));
});

test("changed evidence, extra completions and reused attempts are refused", (t) => {
  const f = fixture(t);
  for (let number = 1; number <= 3; number++) {
    f.begin(number, number * 100);
    f.finish(number);
  }
  const duplicate = path.join(path.dirname(f.campaign), "sequence", "arm-1-second-complete.json");
  fs.copyFileSync(duplicate.replace("-second", ""), duplicate);
  assert.throws(() => assembleSequential(f.campaign, f.source), /duplicate arm records/);
  fs.rmSync(duplicate);
  f.write("p8/result.json", { altered: true });
  assert.throws(() => assembleSequential(f.campaign, f.source), /evidence differs: p8\/result.json/);
});

test("expired budgets and reused attempts cannot become a complete campaign", (t) => {
  const f = fixture(t);
  f.begin(1, 10);
  f.finish(1);
  f.begin(2, 100);
  f.finish(2, { attempt: "attempt-1" });
  assert.throws(() => f.begin(3, 150), /Arm attempt was reused/);
  const over = fixture(t);
  over.begin(1, 100);
  assert.throws(() => over.finish(1, { elapsed: 224 * 60_000 + 1 }), /active time budget/);
});
