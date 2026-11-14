import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { DatomicClient } from "../src/DatomicClient.js";
import { makeDatomicStorageAdapter } from "../src/DatomicStorageAdapter.js";
const exec = promisify(execFile);
// [DX-B5-L0] Why: require native fast-path acceptance and exact fallback content at every receipt time.
// Rejected: trusting only a missing irregular flag or a successful ACK.
describe.skipIf(process.env.DATOMIC_INTEGRATION !== "1")("distributed clock order", () => {
  it("orders 4 processes x 500 public commands without irregular record-time cuts", async () => {
    const scope = DatabaseScope.test(`b5-clock-${randomUUID()}`),
      client = new DatomicClient(process.env.DATOMIC_GATEWAY_URL ?? "http://127.0.0.1:8505", 30000);
    // [DX-T1-5] Why: independently scheduled processes must learn the strictly increasing server-assigned clock.
    // Rejected: testing only a non-strict scope's client ticket/replay path after removing it from strict scopes.
    await client.create(scope, "lean", true);
    const adapter = makeDatomicStorageAdapter(client, scope);
    try {
      const workers = await Promise.all(
        Array.from({ length: 4 }, (_, worker) =>
          exec(
            process.execPath,
            [
              "--experimental-strip-types",
              "lab/experiments/EXP-DX1/b5/clock-worker.mts",
              scope,
              String(worker),
            ],
            { env: process.env, maxBuffer: 8 * 1024 ** 2 },
          ).then((r) => {
            // [DX-T1-5] Why: permanent tracing can share stdout; bind one complete worker result and preserve the raw stream.
            // Rejected: parsing all stdout as one JSON object or silently accepting the last arbitrary log line.
            if (process.env.DX_CLOCK_EVIDENCE_DIR) {
              mkdirSync(process.env.DX_CLOCK_EVIDENCE_DIR, { recursive: true });
              writeFileSync(
                path.join(process.env.DX_CLOCK_EVIDENCE_DIR, `clock-${worker}.jsonl`),
                r.stdout,
                { flag: "wx" },
              );
              writeFileSync(
                path.join(process.env.DX_CLOCK_EVIDENCE_DIR, `clock-${worker}.stderr`),
                r.stderr,
                { flag: "wx" },
              );
            }
            const results = r.stdout
              .split("\n")
              .filter(Boolean)
              .map((line) => JSON.parse(line))
              .filter((row) => row.kind === "distributed-clock-worker");
            expect(results).toHaveLength(1);
            expect(results[0].worker).toBe(String(worker));
            expect(results[0].scope).toBe(scope);
            return results[0];
          }),
        ),
      );
      const receipts = workers.flatMap((w) => w.receipts);
      expect(receipts).toHaveLength(2000);
      for (const worker of workers) {
        expect(worker.diagnostics.clockReplays).toBe(0);
        expect(worker.diagnostics.ticketWaitMicros).toBe(0);
        expect(worker.diagnostics.serverAssignedSubmissions).toBe(500);
        expect(worker.diagnostics.clientOrderedSubmissions).toBe(0);
      }
      receipts.sort((a, b) => a.position - b.position);
      expect(new Set(receipts.map((r) => r.instant)).size).toBe(receipts.length);
      for (let i = 1; i < receipts.length; i++)
        expect(receipts[i]!.instant).toBeGreaterThan(receipts[i - 1]!.instant);
      expect(new Set(receipts.map((r) => r.position)).size).toBe(2000);
      for (const worker of workers)
        for (const receipt of worker.receipts) {
          const basis = { validAt: 100000, recordedAt: receipt.instant };
          const fast = await Effect.runPromise(
            adapter.getReachTriples!(`worker-${worker.worker}`, basis),
          );
          expect(fast).toBeDefined();
          const slow = await Effect.runPromise(
            adapter.getByEntity(`worker-${worker.worker}`, basis),
          );
          expect(fast!.triples.map((t) => t.id)).toEqual(slow.map((r) => r.id));
          for (const id of receipt.ids) expect(slow.map((r) => r.id)).toContain(id);
        }
      expect(client.reachDiagnostics.declines).toEqual({});
      console.log(
        JSON.stringify({
          processes: 4,
          commands: 2000,
          clockReplays: workers.reduce((n, w) => n + w.diagnostics.clockReplays, 0),
          declines: client.reachDiagnostics.declines,
        }),
      );
    } finally {
      await client.delete(scope);
      client.close();
    }
  }, 240000);
});
