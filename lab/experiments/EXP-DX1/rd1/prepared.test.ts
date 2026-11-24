import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { checkPreparedStudy, openPreparedLadder } from "./prepared.ts";

test("prepared reader ladders run control then tuned on fresh copies of one seal", (t) => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "dx-rd1-prepared-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const make = (name: string, fill = 0) => {
    const dir = path.join(root, name);
    fs.mkdirSync(path.join(dir, "global"), { recursive: true });
    fs.writeFileSync(path.join(dir, "PG_VERSION"), "17\n");
    fs.writeFileSync(path.join(dir, "global", "pg_control"), Buffer.alloc(8192, fill));
    return dir;
  };
  const sealed = make("sealed"), out = path.join(root, "out"), campaign = path.join(out, "campaign");
  fs.mkdirSync(out);
  const record = { source: "a".repeat(40), imagePin: "b".repeat(64) };
  const run = (ladder: string, copy: string, slot: string, system = "7311", input = record) => {
    const p = openPreparedLadder({ campaign, ladder, source: sealed, copy, record: input });
    p.claim(slot, slot + "-attempt");
    const arm = path.join(campaign, ladder);
    fs.mkdirSync(path.join(arm, "cleanup"), { recursive: true });
    for (const file of ["attempt.json", "cleanup/inventory.json", "50/arm.json", "50/operations.json", "235/arm.json", "235/operations.json"]) {
      fs.mkdirSync(path.dirname(path.join(arm, file)), { recursive: true });
      fs.writeFileSync(path.join(arm, file), JSON.stringify({ ladder, file }));
    }
    if (p.previous) assert.notEqual(system, "") ;
    fs.writeFileSync(path.join(arm, "pgdata.json"), JSON.stringify({ slot, attempt: slot + "-attempt", copy: p.copy, systemIdentifier: system }));
    p.complete(slot, slot + "-attempt", system);
    return p;
  };
  assert.throws(() => openPreparedLadder({ campaign, ladder: "tuned", source: sealed, copy: make("early"), record }), /ENOENT|has not completed/);
  fs.rmSync(path.join(root, "early"), { recursive: true });
  assert.throws(() => openPreparedLadder({ campaign, ladder: "both", source: sealed, copy: make("x"), record }), /--ladder control or --ladder tuned/);
  assert.throws(() => openPreparedLadder({ campaign, ladder: "control", source: sealed, copy: make("wrong", 1), record }), /differs from sealed/);
  const first = make("copy");
  run("control", first, "tx2-dxscale1-v01-aaaaaaaaaaaa");
  // The claimed copy cannot be admitted again; the driver must make a new one.
  assert.throws(() => openPreparedLadder({ campaign, ladder: "tuned", source: sealed, copy: first, record }), /already used/);
  fs.rmSync(first, { recursive: true });
  make("copy");
  assert.throws(() => openPreparedLadder({ campaign, ladder: "tuned", source: sealed, copy: first, record: { ...record, imagePin: "c".repeat(64) } }),
    /launch configuration changed/);
  const tuned = openPreparedLadder({ campaign, ladder: "tuned", source: sealed, copy: first, record });
  assert.throws(() => tuned.claim("tx2-dxscale1-v01-aaaaaaaaaaaa", "other"), /reused/);
  assert.equal(tuned.previous?.end.systemIdentifier, "7311");
  assert.throws(() => openPreparedLadder({ campaign, ladder: "tuned", source: sealed, copy: make("again"), record }), /already started/);
  tuned.claim("tx2-dxscale1-v01-bbbbbbbbbbbb", "tx2-dxscale1-v01-bbbbbbbbbbbb-attempt");
  const arm = path.join(campaign, "tuned");
  for (const file of ["attempt.json", "cleanup/inventory.json", "50/arm.json", "50/operations.json", "235/arm.json", "235/operations.json"]) {
    fs.mkdirSync(path.dirname(path.join(arm, file)), { recursive: true });
    fs.writeFileSync(path.join(arm, file), "{}");
  }
  fs.writeFileSync(path.join(arm, "pgdata.json"), JSON.stringify({ slot: "tx2-dxscale1-v01-bbbbbbbbbbbb",
    attempt: "tx2-dxscale1-v01-bbbbbbbbbbbb-attempt", copy: tuned.copy, systemIdentifier: "7311" }));
  tuned.complete("tx2-dxscale1-v01-bbbbbbbbbbbb", "tx2-dxscale1-v01-bbbbbbbbbbbb-attempt", "7311");
  const both = checkPreparedStudy(campaign);
  assert.equal(both.control.end.systemIdentifier, both.tuned.end.systemIdentifier);
  // Tampering with control evidence after the fact is detected.
  fs.writeFileSync(path.join(campaign, "control", "50", "arm.json"), "{\"changed\":true}");
  assert.throws(() => checkPreparedStudy(campaign), /Ladder evidence differs/);
});

// [DX-INT1] The runner's own arm wrapper, driven as study-server.ts drives it: the control ladder's body returns, its
// cleanup writes the inventory, and the seal follows, so the tuned ladder is admitted. Bench 3 stopped here.
test("sealedArm seals each prepared ladder after cleanup, for the read study and the retirement pair", async (t) => {
  const { sealedArm } = await import("./prepared.ts");
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "dx-int1-sealed-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const sealed = path.join(root, "sealed");
  fs.mkdirSync(path.join(sealed, "global"), { recursive: true });
  fs.writeFileSync(path.join(sealed, "PG_VERSION"), "17\n");
  fs.writeFileSync(path.join(sealed, "global", "pg_control"), Buffer.alloc(8192, 3));
  const copy = (name: string) => { fs.cpSync(sealed, path.join(root, name), { recursive: true }); return path.join(root, name); };
  const record = { source: "a".repeat(40), imagePin: "b".repeat(64) };
  const arm = async (campaign: string, kind: "read" | "retirement", ladder: string, rates: string[], n: number, fail = false) => {
    const p = openPreparedLadder({ campaign, ladder, source: sealed, copy: copy(kind + ladder + n), record, kind });
    const slot = "tx2-dxscale1-v01-" + String(n).repeat(12), attempt = slot + "-attempt";
    const dir = path.join(campaign, ladder);
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, "attempt.json"), "{}");
    const run = sealedArm(p, slot, attempt, async () => {
      p.claim(slot, attempt);
      fs.writeFileSync(path.join(dir, "pgdata.json"), JSON.stringify({ slot, attempt, copy: p.copy, systemIdentifier: "7311" }));
      for (const rate of rates) {
        fs.mkdirSync(path.join(dir, rate));
        for (const file of ["arm.json", "operations.json"]) fs.writeFileSync(path.join(dir, rate, file), JSON.stringify({ ladder, rate }));
      }
      if (fail) throw new Error("arm failed");
      return "7311";
    }, () => {
      fs.mkdirSync(path.join(dir, "cleanup"));
      fs.writeFileSync(path.join(dir, "cleanup", "inventory.json"), "[]");
    }, kind === "retirement" ? () => fs.writeFileSync(path.join(dir, "retirement-diagnostic.json"), "{}") : undefined);
    return run;
  };
  const read = path.join(root, "read", "campaign");
  fs.mkdirSync(path.dirname(read));
  await arm(read, "read", "control", ["50", "235"], 1);
  await arm(read, "read", "tuned", ["50", "235"], 2);
  assert.equal(checkPreparedStudy(read).tuned.end.systemIdentifier, "7311");
  const retire = path.join(root, "retire", "campaign");
  fs.mkdirSync(path.dirname(retire));
  await assert.rejects(arm(retire, "retirement", "reference", ["394", "620"], 3, true), /arm failed/);
  assert(!fs.existsSync(path.join(path.dirname(retire), "ladders", "reference-complete.json")), "A failed arm is never sealed");
  assert.throws(() => openPreparedLadder({ campaign: retire, ladder: "append", source: sealed, copy: copy("early"), record, kind: "retirement" }),
    /has not completed/);
  const retire2 = path.join(root, "retire2", "campaign");
  fs.mkdirSync(path.dirname(retire2));
  await arm(retire2, "retirement", "reference", ["394", "620"], 4);
  await arm(retire2, "retirement", "append", ["394", "620"], 5);
  assert.equal(checkPreparedStudy(retire2, "retirement").control.end.slot, "tx2-dxscale1-v01-444444444444");
  assert.throws(() => openPreparedLadder({ campaign: read, ladder: "append", source: sealed, copy: copy("mixed"), record }), /--ladder control or --ladder tuned/);
});

// [DX-INT1] The 1 billion pair seals at 50 and 235 offered; a first-offer dry run admits the treatment arm alone.
test("retirement pair on the 1 billion copy seals its own rates, and a dry run opens the treatment arm by itself", async (t) => {
  const { sealedArm } = await import("./prepared.ts");
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "dx-int1-aged-pair-")));
  t.after(() => { fs.rmSync(root, { recursive: true, force: true }); delete process.env.DX_DRY_RUN_FIRST_OFFER; });
  const sealed = path.join(root, "sealed");
  fs.mkdirSync(path.join(sealed, "global"), { recursive: true });
  fs.writeFileSync(path.join(sealed, "PG_VERSION"), "17\n");
  fs.writeFileSync(path.join(sealed, "global", "pg_control"), Buffer.alloc(8192, 5));
  const copy = (name: string) => { fs.cpSync(sealed, path.join(root, name), { recursive: true }); return path.join(root, name); };
  const record = { source: "a".repeat(40), age: "1B", agedBundle: "c".repeat(64) };
  const arm = (campaign: string, ladder: string, rates: string[], n: number) => {
    const p = openPreparedLadder({ campaign, ladder, source: sealed, copy: copy("c" + n), record, kind: "retirement" });
    const slot = "tx2-dxscale1-v01-" + String(n).repeat(12), attempt = slot + "-attempt", dir = path.join(campaign, ladder);
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, "attempt.json"), "{}");
    return sealedArm(p, slot, attempt, async () => {
      p.claim(slot, attempt);
      fs.writeFileSync(path.join(dir, "pgdata.json"), JSON.stringify({ slot, attempt, copy: p.copy, systemIdentifier: "9" }));
      for (const rate of rates) {
        fs.mkdirSync(path.join(dir, rate));
        for (const file of ["arm.json", "operations.json"]) fs.writeFileSync(path.join(dir, rate, file), "{}");
      }
      return "9";
    }, () => { fs.mkdirSync(path.join(dir, "cleanup")); fs.writeFileSync(path.join(dir, "cleanup", "inventory.json"), "[]"); },
    () => fs.writeFileSync(path.join(dir, "retirement-diagnostic.json"), "{}"));
  };
  const wrong = path.join(root, "wrong", "campaign");
  fs.mkdirSync(path.dirname(wrong));
  await assert.rejects(arm(wrong, "reference", ["394", "620"], 1), /Missing ladder evidence reference\/50\/arm.json/);
  const aged = path.join(root, "aged", "campaign");
  fs.mkdirSync(path.dirname(aged));
  await arm(aged, "reference", ["50", "235"], 2);
  await arm(aged, "append", ["50", "235"], 3);
  assert.equal(checkPreparedStudy(aged, "retirement").tuned.end.slot, "tx2-dxscale1-v01-333333333333");
  // Without the dry-run variable the treatment arm still needs the reference arm's seal.
  const alone = path.join(root, "alone", "campaign");
  fs.mkdirSync(path.dirname(alone));
  assert.throws(() => openPreparedLadder({ campaign: alone, ladder: "append", source: sealed, copy: copy("c4"), record, kind: "retirement" }),
    /ENOENT|has not completed/);
  process.env.DX_DRY_RUN_FIRST_OFFER = "1";
  const dry = path.join(root, "dry", "campaign");
  fs.mkdirSync(path.dirname(dry));
  const p = openPreparedLadder({ campaign: dry, ladder: "append", source: sealed, copy: copy("c5"), record, kind: "retirement" });
  assert.deepEqual([p.ladder, p.loaded, p.previous], ["append", true, undefined]);
  // An arm stopped before its first save moves aside; the same arm then runs again in the same campaign.
  const pairDir = path.join(root, "pair", "campaign");
  fs.mkdirSync(path.dirname(pairDir));
  delete process.env.DX_DRY_RUN_FIRST_OFFER;
  const refusedRef = openPreparedLadder({ campaign: pairDir, ladder: "reference", source: sealed, copy: copy("c7"), record, kind: "retirement" });
  fs.mkdirSync(path.join(pairDir, "reference"));
  assert.match(refusedRef.setAside("r1"), /set-aside\/reference-r1$/);
  assert(!fs.existsSync(pairDir) && fs.existsSync(path.join(root, "pair", "set-aside", "reference-r1", "ladders", "reference-start.json")));
  await arm(pairDir, "reference", ["50", "235"], 8);
  const refusedTrt = openPreparedLadder({ campaign: pairDir, ladder: "append", source: sealed, copy: copy("c9"), record, kind: "retirement" });
  fs.mkdirSync(path.join(pairDir, "append"));
  refusedTrt.setAside("t1");
  assert(fs.existsSync(path.join(root, "pair", "ladders", "reference-complete.json")), "the sealed reference arm stays");
  assert(!fs.existsSync(path.join(pairDir, "append")));
  await arm(pairDir, "append", ["50", "235"], 7);
  assert.equal(checkPreparedStudy(pairDir, "retirement").control.end.slot, "tx2-dxscale1-v01-888888888888");
  const sealedRef = openPreparedLadder({ campaign: path.join(root, "pair2", "campaign"), ladder: "reference", source: sealed,
    copy: (fs.mkdirSync(path.join(root, "pair2")), copy("c10")), record, kind: "retirement" });
  assert.ok(sealedRef);
  process.env.DX_DRY_RUN_FIRST_OFFER = "1";
  // A dry run cannot slip a treatment arm into a campaign that already exists.
  assert.throws(() => openPreparedLadder({ campaign: aged, ladder: "append", source: sealed, copy: copy("c6"), record, kind: "retirement" }),
    /already started/);
});

test("two prepared campaigns need their own parent directories, because ladders/ sits beside the campaign", (t) => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "dx-rd1-parents-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const make = (name: string) => {
    const dir = path.join(root, name);
    fs.mkdirSync(path.join(dir, "global"), { recursive: true });
    fs.writeFileSync(path.join(dir, "PG_VERSION"), "17\n");
    fs.writeFileSync(path.join(dir, "global", "pg_control"), Buffer.alloc(8192, 0));
    return dir;
  };
  const sealed = make("sealed"), record = { source: "a".repeat(40), imagePin: "b".repeat(64) };
  const shared = path.join(root, "out");
  fs.mkdirSync(shared);
  openPreparedLadder({ campaign: path.join(shared, "p6"), ladder: "control", source: sealed, copy: make("copy-1"), record });
  // The 2026-11-23 random arm's command: a second configuration under the same parent is refused, and says why.
  assert.throws(() => openPreparedLadder({ campaign: path.join(shared, "p12"), ladder: "control", source: sealed,
    copy: make("copy-2"), record }), /already holds another campaign's ladders: give each campaign its own parent directory/);
  assert(!fs.existsSync(path.join(shared, "p12")));
  // The corrected command: each configuration in its own parent.
  for (const name of ["p6", "p12"]) fs.mkdirSync(path.join(root, name));
  for (const [name, copy] of [["p6", "copy-3"], ["p12", "copy-4"]] as const) {
    const p = openPreparedLadder({ campaign: path.join(root, name, "campaign"), ladder: "control", source: sealed, copy: make(copy), record });
    assert.equal(p.ladder, "control");
    assert(fs.existsSync(path.join(root, name, "ladders", "control-start.json")));
  }
});
