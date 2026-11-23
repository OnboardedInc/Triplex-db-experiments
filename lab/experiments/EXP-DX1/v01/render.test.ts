import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { render, type Run } from "./render.ts";
import { selectedWriter, stackOptions } from "./profile.ts";

const source = "a".repeat(40);
const context = (campaign: string): Run => ({
  source, age: "1B", toy: false, startedAt: "2026-11-20T00:00:00Z", campaign, forecast: "Forecast",
  seal: "a".repeat(64),
});
const rows = (card: string) => card.split("\n").filter((line) => /^\| P\d /.test(line));

test("per-person-ordered selects the executable writer and leaves the grouped control intact", () => {
  const ordered = selectedWriter("per-person-ordered");
  assert.deepEqual([ordered.TX2_SUBJECT_SAVE, ordered.TX2_SUBJECT_NUMERIC_OWNER, ordered.TX2_SUBJECT_ORDERED_IDS], ["1", "1", "1"]);
  assert.deepEqual([ordered.TX2_GROUP_COMMIT, ordered.TX2_LIVE_PRIORITY, ordered.TX2_SMALL_ROWS, ordered.TX2_SAVE_LEDGER], ["0", "0", "0", "0"]);
  const on = stackOptions("per-person-ordered", "attempt");
  const off = stackOptions("grouped", "attempt");
  assert.deepEqual([on.DX_PREP1_SUBJECT, on.TX2_SUBJECT_NUMERIC_OWNER, on.TX2_SUBJECT_ORDERED_IDS], ["1", "1", "1"]);
  assert.deepEqual([off.DX_GROUP_COMMIT, off.DX_W1_LEDGER, off.DX_SMALL_ROWS, off.DX_PREP1_SUBJECT, off.TX2_SUBJECT_ORDERED_IDS], ["1", "1", "1", "0", "0"]);
});

test("failed campaign still describes every priority and standing ruling", () => {
  const card = render({ ...context("/missing"), error: "Campaign stopped." }, "/missing");
  assert.equal(rows(card).length, 9);
  assert(rows(card).every((line) => line.includes("NOT MEASURED")));
  assert.match(card, /\| Deep read gateway \|[^\n]+Forecast under 64 B\/person[^\n]+NOT MEASURED/);
  assert.match(card, /\| Transactor residency \|[^\n]+Forecast 6–12 GiB[^\n]+NOT MEASURED/);
  for (const name of ["Journal queryable", "Erased value never returned", "Receipts", "No acknowledged write lost"]) {
    assert.match(card, new RegExp(`\\| ${name} \\|`));
  }
  assert.doesNotMatch(card, /\| PASS \|/);
});

test("only current evidence can judge a physical bar and toy reports never judge", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dv1-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const run = context(root);
  const key = "100000-frozen-reader";
  const witness = { id: "correct", value: 0, pass: true };
  const receipt = ["read-your-own-write at the returned tx", "duplicates return the original receipt",
    "lost ACKs return the original receipt"].map((id) => ({ id, value: 1, pass: true }));
  const raw = {
    status: "DONE", deep: { identity: { source } }, config: { layout: "legacy" },
    correctness: { reads: 23 }, receiptCapture: { matched: 17, missing: 0, mismatches: 0 },
    priorities: {
      P1: { bars: [witness, { id: "fallback share", value: 0.5, pass: null, bar: "reported" }] },
      P2: { bars: [...receipt, { id: "NS-P2 all-primary p99 ms", value: 100, pass: false }], bandsAtL256: { a: { count: 17 } } },
      P3: { bars: [witness], lag: { atL256: { count: 13 } } },
      P4: { bars: [witness, { id: "NS-P4 correct weighted pulls/s whole machine", value: 4000, pass: false }],
        weightedMix: { read: { count: 23 } }, throughput: { pullsPerSPerQuotaCore: 1500 } },
    },
  };
  const c = { key, profile: "frozen", load: "reader" };
  const arm = { case: c, identity: raw.deep.identity, source, startedAt: Date.parse(run.startedAt) + 2 };
  const zero = { ...c, key: "100000-frozen-zero", load: "zero" };
  const plan = { binding: "bound", source, cases: [zero, c], createdAt: arm.startedAt - 1,
    placement: "physical", heldSeal: run.seal, smoke: false };
  const write = (file: string, value: unknown) => fs.writeFileSync(path.join(root, file), JSON.stringify(value));
  fs.mkdirSync(path.join(root, key));
  fs.mkdirSync(path.join(root, zero.key));
  write("campaign.json", plan);
  write("physical-inputs.json", {});
  write(key + "/ns-report.json", raw);
  write(zero.key + "/ns-report.json", raw);
  const files = [["ns-report.json", createHash("sha256").update(JSON.stringify(raw)).digest("hex")]];
  const comparison = { source, binding: plan.binding, smoke: false,
    results: [{ binding: plan.binding, arm: { ...arm, case: zero }, state: "measured", files },
      { binding: plan.binding, arm, state: "measured", files }] };
  write("comparison.json", comparison);
  const physical = render(run, root);
  assert.match(rows(physical)[0]!, /\| PASS \|/);
  assert.match(rows(physical)[1]!, /\| PASS \|/);
  assert.match(rows(physical)[2]!, /\| NOT MEASURED \|/);
  assert.match(rows(physical)[3]!, /\| NOT MEASURED \|/);
  write("campaign.json", { ...plan, placement: "mac-diagnostic", smoke: true });
  write("comparison.json", { ...comparison, smoke: true });
  const toy = render({ ...run, toy: true }, root);
  assert.match(toy, /All numbers are diagnostic/);
  assert.match(toy, /"admission": "mac-diagnostic"/);
  assert.doesNotMatch(toy, /\| PASS \||\| FAIL \|/);
  assert.throws(() => render({ ...run, toy: true, startedAt: "2026-11-21T00:00:00Z" }, root));
  fs.unlinkSync(path.join(root, "comparison.json"));
  write(key + "/recorded.json", comparison.results[1]);
  const partialRun = { ...run, toy: true, partial: true };
  const partial = render(partialRun, root);
  assert.match(partial, /The native fixture stopped/);
  assert.equal(rows(partial).length, 9);
  assert.match(rows(partial)[0]!, /\| DIAGNOSTIC \|/);
  assert.doesNotMatch(partial, /\| PASS \||\| FAIL \|/);
  assert.throws(() => render({ ...partialRun, source: "b".repeat(40) }, root));
  write(key + "/ns-report.json", { ...raw, status: "UNVERIFIED" });
  assert.throws(() => render(partialRun, root));
});
