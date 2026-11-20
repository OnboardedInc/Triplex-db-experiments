import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import test from "node:test";
import { Histogram } from "../../../../bench/lib/hist.ts";
import { pairedP99 } from "./paired.ts";
import { summarizeCapture } from "./telemetry.ts";
import { placementReport } from "./report.ts";
import { nextTrimPair, trimAgrees, trimRate } from "./trim.ts";
import type { checkCell } from "./check.ts";
import {
  cellOrder,
  isolationProfile,
  quietFor,
  rates,
  readTape,
  repetitions,
  workloadPins,
  writeTape,
} from "./plan.ts";

test("the isolation profile freezes twelve balanced pairs at each rate", () => {
  const actual = workloadPins(100000, "pooled", true);
  const pin = JSON.parse(
    fs.readFileSync(new URL("./isolation-pins.json", import.meta.url), "utf8"),
  );
  assert.equal(pin.profile, isolationProfile);
  assert.deepEqual(actual, pin.items[0].tapes);
  const groups = new Map(
    rates.map((rate) => [rate, { first: 0, second: 0, accounts: new Set<number>() }]),
  );
  for (const repeat of repetitions("pooled", true)) {
    const order = cellOrder(repeat, "pooled", true);
    const rate = rates.find((r) => order.includes(r))!;
    const group = groups.get(rate)!;
    group[order[0] === rate ? "first" : "second"]++;
    const account = quietFor(repeat, true);
    group.accounts.add(account);
    const left = writeTape(100000, "alone", repeat, true);
    const right = writeTape(100000, rate, repeat, true);
    assert.equal(left.length, 1050);
    assert.equal(right.length, rate * 300);
    assert.deepEqual(
      left.map(({ version: _, ...w }) => w),
      right.filter((w) => w.account === account).map(({ version: _, ...w }) => w),
    );
    const reads = readTape(100000, repeat, "alone", true, true);
    assert.equal(reads.length, 19200);
    assert.deepEqual(reads, readTape(100000, repeat, rate, true, true));
  }
  for (const { first, second, accounts } of groups.values()) {
    assert.deepEqual([first, second, accounts.size], [6, 6, 10]);
  }
});

test("whole-window bootstrap can distinguish a matched 1.25× control from 2×", () => {
  const windows = (factor: number) =>
    Array.from({ length: 12 }, (_, i) => {
      const h = new Histogram();
      for (let sample = 0; sample < 1050; sample++) h.recordMs(factor * 16 * 2 ** (i % 3));
      return h;
    });
  const control = windows(1);
  const near = pairedP99(windows(1.25), control, "test/near")!;
  const far = pairedP99(windows(2), control, "test/far")!;
  assert(near.compatibleWith125 && !near.compatibleWith200 && near.discriminate);
  assert(!far.compatibleWith125 && far.compatibleWith200 && far.discriminate);
  assert(!far.upper95Within125);
  assert.equal(far.primary.draws, 10000);
  assert.equal(far.longer.matchedPairsPerBlock, 2);
});

test("a rate stops after two agreeing pairs and keeps measuring different loss outcomes", () => {
  const rate = 35;
  const points = (loss = 0) =>
    [1, 6].flatMap((repeat, i) => [
      { cell: "alone", repeat, quietComplete: true, quiet: { p99: 25 } },
      {
        cell: rate,
        repeat,
        quietComplete: true,
        quiet: { p99: 50 + i },
        goodput: 35 - i * 0.1,
        capacityBars: false,
        missing: 0,
        preDispatchExpiry: loss * i,
        refused: 0,
        recovered: 0,
        uncertain: 0,
      },
    ]) as ReturnType<typeof checkCell>[];
  assert(trimAgrees(points(), rate));
  assert(!trimAgrees(points(1), rate));
  const repeat = Array.from({ length: 8 }, (_, i) => 8 + i).find(
    (r) => trimRate(cellOrder(r, "pooled", true)) === rate,
  )!;
  assert.deepEqual(nextTrimPair(repeat, points()), []);
  assert.equal(nextTrimPair(repeat, points(1)).length, 2);
});

test("stage coverage joins the received gateway root to the original native t", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dx-scale1-clock-"));
  try {
    const id = { slot: "test-slot", nonce: "this-attempt", source: "a".repeat(40) };
    const raw = path.join(dir, "engines", id.slot, "trace/raw");
    fs.mkdirSync(raw, { recursive: true });
    const started = { bootId: "boot", beforeNs: "0", afterNs: "100", senderMs: 1000 };
    const stopped = {
      ...started,
      beforeNs: "400000000000",
      afterNs: "400000000100",
      senderMs: 401000,
    };
    const jvms: Record<string, object> = {};
    for (const [role, count] of [
      ["gw-w", 1],
      ["gw-r", 2],
      ["tx", 1],
    ] as const) {
      fs.writeFileSync(
        path.join(raw, role + "-gc.log"),
        "[2026-11-20T12:00:00.000+0000][2ms][info][gc     ] Using Serial\n" +
          "[2026-11-20T12:00:00.001+0000][3ms][info][gc,init] CPUs: 24 total, " +
          count +
          " available\n",
      );
      jvms[role] = {
        collector: "Serial",
        activeProcessors: count,
        first: Date.parse("2026-11-20T12:00:00Z"),
        last: Date.parse("2026-11-20T12:00:00.001Z"),
        lines: 2,
      };
    }
    const traceId = "b".repeat(32),
      root = "c".repeat(16),
      databaseHash = "d".repeat(64);
    const clock = { bootId: "boot", offsetMs: 1000, crossProcessQualified: true };
    const gateway = {
      ...id,
      process: "gw-w",
      clock,
      traceId,
      root,
      name: "gateway /v1/db/{db}/transact",
      kind: "commit",
      truncated: 0,
      start: 2010,
      end: 2050,
      attributes: { datomicT: "42", databaseHash },
      spans: [{ name: "commit.prepare-and-validate", start: 2011, end: 2013 }],
    };
    const tx = {
      ...id,
      process: "tx",
      clock,
      name: "datomic.tx/process",
      datomicT: "42",
      databaseHash,
      end: 2030,
    };
    const write = (where: string, name: string, contents: unknown) =>
      fs.writeFileSync(path.join(where, name), JSON.stringify(contents) + "\n");
    write(raw, "gw-w.jsonl", gateway);
    write(raw, "tx.jfr.jsonl", tx);
    write(raw, "tx.jfr", "jfr");
    write(raw, "tx.jfr-complete.jsonl", "seal");
    const files = ["gw-w.jsonl", "tx.jfr.jsonl", "tx.jfr", "tx.jfr-complete.jsonl"].map((name) => {
      const bytes = fs.readFileSync(path.join(raw, name));
      return {
        name,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    });
    write(dir, "telemetry-start.json", { ...id, started, jvms });
    write(dir, "telemetry-end.json", { ...id, started, stopped, jvms, files });
    write(dir, "r0-alone-writer.json", {
      ...id,
      isolation: true,
      repeat: 0,
      key: "r0-alone",
      start: 2000,
      writes: [
        {
          account: 0,
          id: "this-save",
          due: 2000,
          sent: 2005,
          end: 2060,
          status: "acked",
          receipt: { t: "42" },
          stage: { readyToNativeEntryMs: 7 },
          responseTrace: "00-" + traceId + "-" + root + "-01",
        },
      ],
    });
    const result = await summarizeCapture(dir, id);
    const cell = result.cells["r0-alone"]!;
    assert.deepEqual([cell.acked, cell.gatewayJoined, cell.nativeJoined], [1, 1, 1]);
    assert(Math.abs(cell.slowQuiet[0]!.nativeDone! - 2030) < 0.001);
    await assert.rejects(summarizeCapture(dir, { ...id, nonce: "other-attempt" }));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("seed replay prices cgroup counter increments only within the observed span", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dx-scale1-seed-report-"));
  try {
    const population = JSON.parse(
      fs.readFileSync(new URL("./isolation-pins.json", import.meta.url), "utf8"),
    ).items[0].seed.digest;
    const a = {
      at: 1700000000000,
      nonce: "test",
      source: "a".repeat(40),
      slot: "slot",
      phase: "seed",
      mode: "individual",
      people: 100000,
      layout: "pooled",
    };
    const records = Array.from({ length: 21 }, (_, i) => ({
      ...a,
      population,
      scope: 0,
      at: a.at + i * 60000,
      persons: i,
      facts: i * 160,
      commands: i,
      bytes: i * 100,
      resources: {
        tx: { peak: 1000, cpu: "usage_usec " + i * 57e6 },
        pg: {
          peak: 1500,
          cpu: "usage_usec " + i * 9e6,
          io: "8:0 rbytes=" + i * 2 ** 20 + " wbytes=" + i * 5 * 2 ** 20,
        },
      },
    }));
    placementReport(dir, [
      {
        tag: "fixture",
        attempt: a,
        terminal: {
          ...a,
          service: "ceiling",
          endedAt: new Date(a.at + 21 * 60000).toISOString(),
        },
        loaderProgress: { records },
      },
    ]);
    const report = fs.readFileSync(path.join(dir, "DECISION-RESULTS.md"), "utf8");
    assert.match(
      report,
      /First ten intervals \| 2\.67 \(n=10 frames, 600\.0 s\) \| 95\.00 \| 15\.00 \| 10\.00 \/ 50\.00/,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
