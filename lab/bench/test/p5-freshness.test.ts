import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { test } from "node:test";
import { memoryComposition } from "../lib/memory.ts";
import { seedW0 } from "../lib/w0-seed.ts";
import { freezeMemoryG0, fingerprintSweep, FingerprintRefusal } from "../lib/w0-fingerprint.ts";
import { V_W0, sha256 } from "../lib/w0-world.ts";
const raw = path.join(
  "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P5A/round4",
  "freshness-" + randomUUID(),
);
fs.mkdirSync(raw, { recursive: true });
fs.writeFileSync(path.join(raw, "executed-test.ts"), fs.readFileSync(new URL(import.meta.url)));
fs.writeFileSync(path.join(raw, "freshness-attempt.json"), JSON.stringify({ raw }, null, 2));
const scope = randomUUID(),
  comp = memoryComposition("xtdb", scope);
const seed = await seedW0(comp, 50, path.join(raw, "seed.ndjson"));
execFileSync("python3", [
  "-I",
  "lab/oracles/domain/cli.py",
  "--population",
  "--rung",
  "50",
  "--fingerprint",
  "--out",
  path.join(raw, "oracle.json"),
]);
const expected = {
  ...JSON.parse(fs.readFileSync(path.join(raw, "oracle.json"), "utf8")).fingerprint,
  N: 50,
};
const input: any = {
  endpoint: comp.backend.url,
  scope,
  basis: { position: seed.basis.tx, validAt: V_W0 },
  expected,
  counts: seed.counts,
};
input.pin = await freezeMemoryG0(comp, input);
const report: any = {
  acceptance: false,
  testSha256: sha256(fs.readFileSync(new URL(import.meta.url))),
  cases: [],
};
for (const kind of ["deadline", "abort"]) {
  test(`gate must refuse ${kind} covering the final count`, async () => {
    const deadlineMs = 5000,
      controller = new AbortController();
    let calls = 0,
      closes = 0;
    // [CX-VP5A-R2] Why: the wrapper's last observation is part of freshness; an inner valid digest cannot override cancellation or expired total time. Rejected: injecting wrong content (would mask this lifecycle defect).
    const wrapped = {
      ...comp,
      storeCounts: async () => {
        calls++;
        if (kind === "deadline") await new Promise((r) => setTimeout(r, deadlineMs + 100));
        if (kind === "abort" && calls === 2)
          controller.abort(new Error("cancelled during end-count read"));
        return comp.storeCounts();
      },
    };
    let result: any;
    const start = performance.now();
    try {
      result = await fingerprintSweep(
        { ...input, deadlineMs, signal: controller.signal },
        async () => ({
          endpoint: input.endpoint,
          scope,
          comp: wrapped,
          close: async () => {
            closes++;
          },
        }),
      );
    } catch (e) {
      assert.ok(e instanceof FingerprintRefusal);
      result = { refusal: String(e) };
    }
    const elapsedMs = performance.now() - start;
    report.cases.push({
      kind,
      deadlineMs,
      elapsedMs,
      calls,
      aborted: controller.signal.aborted,
      result,
    });
    fs.writeFileSync(path.join(raw, "observations.json"), JSON.stringify(report, null, 2));
    assert.notEqual(
      result.status,
      "complete-and-matching",
      "freshness must refuse before granting",
    );
    assert.equal(closes, 1);
    assert.equal(calls, kind === "deadline" ? 1 : 2);
  });
}

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const handle = (overrides: Record<string, unknown> = {}) => ({
  endpoint: input.endpoint,
  scope,
  comp,
  close: async () => {},
  ...overrides,
});
for (const mode of [
  "never-open",
  "late-open",
  "cancel-open",
  "start-count",
  "end-count",
  "cancel-scan",
  "close-error",
  "cancel-close",
]) {
  test(`whole wrapper freshness and cleanup: ${mode}`, async () => {
    const controller = new AbortController();
    let closes = 0,
      openSignal: AbortSignal | undefined,
      calls = 0,
      readSignal: AbortSignal | undefined;
    let release!: () => void;
    const latch = new Promise<void>((resolve) => {
      release = resolve;
    });
    const close = async () => {
      closes++;
      if (mode === "close-error") throw Error("planted cleanup error");
      if (mode === "cancel-close") controller.abort();
    };
    const wrapped = {
      ...comp,
      storeCounts: async (signal?: AbortSignal) => {
        calls++;
        readSignal = signal;
        if (mode === "end-count" && calls === 2) queueMicrotask(() => controller.abort());
        if (mode === "start-count" || (mode === "end-count" && calls === 2))
          await new Promise<void>((_r, reject) =>
            signal!.addEventListener("abort", () => reject(Error("cancelled count")), {
              once: true,
            }),
          );
        return comp.storeCounts();
      },
    };
    const open = async (_endpoint: string, _scope: string, signal?: AbortSignal) => {
      openSignal = signal;
      if (mode === "never-open") return new Promise<any>(() => {});
      if (mode === "cancel-open") {
        queueMicrotask(() => controller.abort());
        await latch;
      }
      if (mode === "late-open") await latch;
      if (mode === "cancel-scan")
        wrapped.g0Reader = (logical) => {
          const r = comp.g0Reader!(logical);
          return {
            ...r,
            async *scan(t, s, inner) {
              controller.abort();
              yield* r.scan(t, s, inner);
            },
          };
        };
      return handle({ comp: wrapped, close });
    };
    const budget = ["never-open", "late-open", "start-count"].includes(mode) ? 20 : 10_000;
    const run = fingerprintSweep({ ...input, deadlineMs: budget, signal: controller.signal }, open);
    await assert.rejects(run, mode === "close-error" ? /cleanup error/ : /deadline|aborted/);
    assert.ok(openSignal);
    if (mode === "late-open" || mode === "cancel-open") {
      assert.equal(closes, 0);
      release();
      await pause(10);
      assert.equal(closes, 1);
    } else if (mode !== "never-open") assert.equal(closes, 1);
    if (mode === "start-count") assert.ok(readSignal?.aborted);
  });
}
test("successful matching admission closes once and still grants within the total budget", async () => {
  let closes = 0;
  const result = await fingerprintSweep({ ...input, deadlineMs: 10000 }, async () =>
    handle({
      close: async () => {
        closes++;
      },
    }),
  );
  assert.equal(result.status, "complete-and-matching");
  assert.equal(closes, 1);
});
