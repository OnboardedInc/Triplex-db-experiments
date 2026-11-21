import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { writeAdoptedCard } from "./adopted-card.ts";

test("the held-seed card preserves all obligations after a stopped campaign", (t) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "dx-v01-adopted-card-"));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  writeAdoptedCard({
    source: "a".repeat(40), age: "fresh", writer: "per-person-ordered", toy: true,
    campaign: path.join(out, "campaign"), out, forecast: "Budget 235 minutes",
    failure: "The campaign stopped. See the retained log.",
  });
  const card = fs.readFileSync(path.join(out, "SCORECARD-v0.1.md"), "utf8");
  const rows = card.split("\n").filter((row) => /^\| (P\d |Journal queryable|Erased value never returned|Receipts|No acknowledged write lost|Mixed assertion identities)/.test(row));
  assert.equal(rows.length, 14);
  assert.deepEqual(rows.slice(0, 9).map((row) => Number(row[3])), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const columnCounts = rows.map((row) => row.split("|").slice(1, -1).length);
  assert.deepEqual(columnCounts, Array(14).fill(6));
  assert.match(card, /Mac toy run\. All numbers are diagnostic\./);
  assert.match(card, /"TX2_SUBJECT_SAVE": "1"/);
  assert.match(rows[4]!, /Server 1 measured Publish under load/);
  assert.match(rows[8]!, /needs two servers/);
  assert(rows.every((row) => row.includes("| NOT MEASURED |")));
  assert.doesNotMatch(card, /\| PASS \||\| FAIL \|/);
});

test("the physical card rejects run inputs carrying a different age label", (t) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "dx-v01-adopted-card-"));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  const source = "a".repeat(40), campaign = path.join(out, "campaign");
  fs.mkdirSync(campaign);
  fs.writeFileSync(path.join(campaign, "input.json"), JSON.stringify({ source, age: "1B", writer: "grouped" }));
  assert.throws(() => writeAdoptedCard({
    source, age: "fresh", writer: "grouped", toy: false, campaign, out, forecast: "Budget 235 minutes",
  }));
  assert(!fs.existsSync(path.join(out, "SCORECARD-v0.1.md")));
});
