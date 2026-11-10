import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openComposition } from "../../../bench/lib/composition.ts";
import { seedW0 } from "../../../bench/lib/w0-seed.ts";
import { runW0Sweep, subjectList } from "../../../bench/lib/sweep.ts";
import { V_W0, worldOf, reachableRows, worldSha256 } from "../../../bench/lib/w0-world.ts";
// [DX-H6] Why: real worker threads exercise ordered bounded handover, ACK-only checkpoints and completed resume.
// Rejected: inferring pipeline correctness from a queue-shape unit test.
test("pipeline publishes pages in order and resumes only ACKed pages", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dxh6-pipeline-")),
    comp = await openComposition("memory", "xtdb", "dxh6-unit");
  try {
    const seed = await seedW0(comp, 200, path.join(dir, "seed.ndjson"));
    const basis = { position: seed.basis.tx, validAt: V_W0 },
      subjects = subjectList(200),
      rows = (await comp.sweepPage(subjects, basis)).rows;
    const expected = new Map(
      subjects.map((subject) => [
        subject,
        worldSha256(worldOf(subject, reachableRows([subject], rows))),
      ]),
    );
    let hookFinished = false,
      hookCalls = 0;
    const invoked: number[] = [],
      acked: number[] = [],
      seen = new Set<string>();
    let active = 0,
      peak = 0;
    const options = {
      comp,
      composition: "memory",
      lane: "xtdb" as const,
      scope: "dxh6-unit",
      subjects,
      basis,
      sweepId: "unit",
      cursor: path.join(dir, "cursor.json"),
      workers: 4,
      beforeTimedWindow: async () => {
        hookCalls++;
        await new Promise((r) => setTimeout(r, 20));
        hookFinished = true;
      },
      onPage: async (records: readonly any[], page: number) => {
        assert.ok(hookFinished);
        invoked.push(page);
        active++;
        peak = Math.max(peak, active);
        for (const r of records) {
          assert.equal(r.worldSha256, expected.get(r.subject));
          assert.ok(!seen.has(r.subject));
          seen.add(r.subject);
        }
        await new Promise((r) => setTimeout(r, (4 - page) * 20));
        await comp.publishOutbox(records.map((r) => r.record));
        active--;
        acked.push(page);
      },
    };
    const result = await runW0Sweep(options);
    assert.deepEqual(invoked, [0, 1, 2, 3]);
    assert.equal(seen.size, 200);
    assert.ok(peak > 1 && peak <= 8);
    assert.equal(result.complete, true);
    assert.equal(hookCalls, 1);
    assert.ok(result.preTimedWindowHookMs >= 15);
    assert.equal(result.workersReadyBeforeTimedWindow, true);
    assert.equal(
      JSON.parse(fs.readFileSync(options.cursor, "utf8")).published.length,
      acked.length,
    );
    const resumed = await runW0Sweep({
      ...options,
      onPage: async () => {
        throw Error("replayed completed page");
      },
    });
    assert.equal(resumed.complete, true);
  } finally {
    await comp.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("failed publication leaves no checkpoint and rejects later pages", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dxh6-failed-")),
    comp = await openComposition("memory", "xtdb", "dxh6-failure");
  try {
    const subjects = subjectList(200),
      basis = { position: 0, validAt: V_W0 };
    const invoked: number[] = [];
    await assert.rejects(
      runW0Sweep({
        comp,
        composition: "memory",
        lane: "xtdb",
        scope: "dxh6-failure",
        subjects,
        basis,
        sweepId: "failure",
        cursor: path.join(dir, "cursor.json"),
        workers: 4,
        beforePublish: async () => {
          throw Error("injected before publication");
        },
        onPage: async (_records, page) => {
          invoked.push(page);
        },
      }),
      /injected before publication/,
    );
    assert.equal(invoked.length, 0);
    assert.ok(!fs.existsSync(path.join(dir, "cursor.json")));
  } finally {
    await comp.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
