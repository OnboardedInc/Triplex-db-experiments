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
