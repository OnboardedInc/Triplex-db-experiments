import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { SpillBudget } from "../../../lab/bench/lib/spill-budget.ts";
import { ReadRecords } from "../../../lab/bench/lib/read-records.ts";
import { R, type ReadRecord } from "../../../lab/bench/lib/observe.ts";
const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});
const temporary = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "triplex-spill-cap-"));
  dirs.push(dir);
  return dir;
};
it("counts strings, sidecars and replacement scratch before writing; a failure preserves the previous bytes", () => {
  const dir = temporary(),
    budget = new SpillBudget(32),
    a = path.join(dir, "a"),
    b = path.join(dir, "split");
  budget.replace(a, "1234567890");
  budget.append(b, "é");
  expect(budget.bytes).toBe(12);
  budget.replace(a, "12345678901234567890");
  expect(budget.bytes).toBe(22);
  expect(budget.peakBytes).toBe(32);
  expect(() => budget.replace(a, "12345678901")).toThrow("spill limit");
  expect(fs.readFileSync(a, "utf8")).toBe("12345678901234567890");
  expect(fs.existsSync(a + ".tmp")).toBe(false);
  expect(budget.bytes).toBe(22);
  expect(() => new SpillBudget(NaN)).toThrow();
});
it("keeps the exact preceding checkpoint readable when the lossless log reaches its cap", () => {
  const dir = temporary(),
    log = path.join(dir, "observations"),
    numericChunk = 4096 * (R.waitedMs + 1) * 8;
  const budget = new SpillBudget(numericChunk * 2 + 4096),
    records = new ReadRecords(log, false, budget);
  const row: ReadRecord = [
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    "digest",
    9,
    1,
    1,
    null,
    0,
    1,
    0,
    0,
    0,
    "replica",
    "native",
    0,
  ];
  records.push(row);
  records.checkpoint();
  expect(() => {
    for (let i = 0; i < 8192; i++) records.push(row);
    records.checkpoint();
  }).toThrow("spill limit");
  const retained = new ReadRecords(log, true);
  expect(retained.length).toBe(1);
  expect([...retained]).toEqual([row]);
  expect(fs.readdirSync(log).some((f) => f.endsWith(".tmp"))).toBe(false);
  expect(
    fs.readdirSync(log).reduce((n, f) => n + fs.statSync(path.join(log, f)).size, 0),
  ).toBeLessThanOrEqual(budget.maxBytes);
});
