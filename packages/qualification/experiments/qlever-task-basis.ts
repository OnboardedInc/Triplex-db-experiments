/** Real writer between a native business task's calls; no server restart.
 * This independently schedules a committed refund after the first capture
 * COUNT. A logical task must keep its first returned P, while the next logical
 * task must see the writer. It tests the public compiled task/provider path.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import { EntityId, Triples, integer, string } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope, type NativeReadResult } from "@triplex-build/triplex/runtime";
import { loadQualificationBackend } from "@triplex-build/triplex-qualification";

const root = path.resolve(import.meta.dirname, "../../..");
const output = process.argv[process.argv.indexOf("--output") + 1];
assert(output && path.resolve(output).startsWith(root + path.sep));
const backend = await loadQualificationBackend("qlever");
assert.equal(backend.queryPath, "qlever-native");
assert(backend.nativeWorkload);
const runId = randomUUID(),
  scope = DatabaseScope.test(`qlever-native-task-basis-${runId}`);
const session = backend.openNative(scope);
type Session = { select: (...args: any[]) => Effect.Effect<NativeReadResult, unknown> };
const provider = session.provider as Session;
const report: Record<string, any> = {
  format: "triplex-native-multicall-basis/1",
  runId,
  scope,
  status: "RUNNING",
  traces: [],
  observedCuts: [],
  expected: { firstTask: "100", nextTask: "90", writerAdvancesP: true, oneSourcePWithinTask: true },
  limits: [
    "One deterministic read/writer interleaving; not256-client throughput or write-fault durability.",
    "The coordinator consumes only final aggregate scalars; ordinary fact relations stay native.",
  ],
};
const save = () => writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
save();
const attribute = (name: string) => `:w08/a${Buffer.from(name).toString("hex")}`;
const put = (kind: "capture" | "refund") =>
  Effect.runPromise(
    Effect.gen(function* () {
      const triples = yield* Triples;
      return yield* triples.assertBatch([
        {
          entityId: EntityId.make(kind),
          attribute: attribute(kind === "capture" ? "customer" : "capture"),
          value: string(kind === "capture" ? "customer" : "capture"),
          validFrom: 0,
        },
        {
          entityId: EntityId.make(kind),
          attribute: attribute("currency"),
          value: string("USD"),
          validFrom: 0,
        },
        {
          entityId: EntityId.make(kind),
          attribute: attribute("amount"),
          value: integer(kind === "capture" ? 100n : 10n),
          validFrom: 0,
        },
      ]);
    }).pipe(
      Effect.provide(
        backend
          .makeRuntime()
          .layer({
            scope,
            capabilities: Capabilities.none,
            deterministic: {
              startTime: kind === "capture" ? 1001 : 1002,
              seed: `${runId}/${kind}`,
            },
          }),
      ),
      Effect.scoped,
    ),
  );
const entry = {
  id: "writer-between-native-calls",
  operation: "customer_net_revenue",
  cut: { known_at: "10", valid_at: "10" },
  parameters: {
    customer: { tag: "str", value: "customer" },
    currency: { tag: "str", value: "USD" },
  },
};
let inserted = false;
const invoke = async (interleave: boolean) => {
  const cuts: number[] = [],
    trace: unknown[] = [];
  const wrapped = {
    ...provider,
    select: (...args: any[]) =>
      provider.select(...args).pipe(
        Effect.flatMap((answer) =>
          Effect.promise(async () => {
            cuts.push(answer.basis.recordedPosition);
            if (interleave && !inserted) {
              inserted = true;
              report.writerReceipt = await put("refund");
              save();
            }
            return answer;
          }),
        ),
      ),
  };
  const rows = await Effect.runPromise(
    backend.nativeWorkload!.evaluate(wrapped, { id: "08" }, entry, new Map(), trace),
  );
  report.traces.push(trace);
  report.observedCuts.push(cuts);
  save();
  const total = rows[0]?.[0] as { type: "integer"; value: string };
  assert.equal(total.type, "integer");
  return { total: total.value, cuts };
};
try {
  report.seedReceipt = await put("capture");
  save();
  const first = await invoke(true),
    next = await invoke(false);
  const actual = {
    firstTask: first.total,
    nextTask: next.total,
    writerAdvancesP: inserted && Math.min(...next.cuts) > first.cuts[0]!,
    oneSourcePWithinTask: new Set(first.cuts).size === 1,
  };
  report.actual = actual;
  report.status =
    JSON.stringify(actual) === JSON.stringify(report.expected)
      ? "PASS_FIXED_TASK_CUT_AND_VISIBLE_WRITER"
      : "FAIL_MIXED_TASK_SOURCE_CUT";
  save();
  writeFileSync(
    path.join(path.dirname(output), "status.json"),
    JSON.stringify(actual, null, 2) + "\n",
    { flag: "wx" },
  );
  console.log(JSON.stringify({ output, status: report.status, actual, cuts: report.observedCuts }));
} catch (error) {
  report.status = "FAIL_RETAINED";
  report.error = String(error);
  save();
  throw error;
} finally {
  await session.close();
}
