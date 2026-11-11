import assert from "node:assert/strict";
import { DatomicClient, decodeSweepRows } from "../../../../packages/datomic/dist/index.js";
import { openComposition, type Basis } from "../../../bench/lib/composition.ts";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import { ReplicaReadHost, ReplicaReader } from "../../../bench/lib/replica-reads.ts";
import { seedRung } from "../../../bench/lib/seed.ts";
import { ids } from "../../../bench/lib/world.ts";
import { generateTrace } from "../../../bench/lib/trace.ts";
import { buildTraceCommand } from "../../../bench/lib/commands.ts";
import { observe } from "../../../bench/lib/observe.ts";
import { worldOf, worldCanonical } from "../../../bench/lib/w0-world.ts";

const subjects = 2000,
  count = Number(process.env.DX_R3_READS ?? 200000);
const scope = `dxr3-diff-${Date.now()}`;
const comp = await openComposition("reach", "datomic", scope);
const seed = await seedRung({
  comp,
  subjects,
  runTag: scope,
  batchFacts: 2000,
  budgetMs: 600000,
  recordSubjects: new Set(),
  recordAccounts: new Set(),
  historySubjects: new Set(),
  log: console.log,
});
assert(seed.complete && seed.failures.length === 0, "complete fresh seed required");
const host = await ReplicaReadHost.open(
  scope,
  Array.from({ length: subjects }, (_, i) => ids.placement(i)),
  comp,
  { position: seed.lastPosition, instant: seed.lastInstant },
);
const reader = new ReplicaReader();
reader.install(host.index.image());
host.subscribe((delta) => reader.apply(delta));
const client = new DatomicClient(process.env.DATOMIC_READ_URLS!.split(",")[0]!, 30000);
const db = await client.create(runtimeApi.DatabaseScope.test(scope), "lean");
const acked = [{ position: seed.lastPosition, instant: seed.lastInstant }];
const trace = generateTrace({ seed: "ns-v2", subjects, durationS: 3600 }).filter(
  (event) => !event.resend,
);
let writing = true,
  writerError: unknown,
  writes = 0;
const writer = (async () => {
  for (const event of trace) {
    if (!writing) break;
    const scheduledAbsMs = Date.now();
    const state = seed.state.get(event.subject)!;
    const command = buildTraceCommand({ runTag: scope, event, state, scheduledAbsMs });
    const result = await comp.transact(command.operations, {
      commandId: command.commandId,
      actor: event.kind,
      preconditions: command.preconditions,
    });
    assert(result.ok, `writer ${result.ok ? "" : result.tag}`);
    const receipt = result.value;
    state.stamp = command.newStamp;
    state.stampId = receipt.triples.find(
      (t) => t.entityId === ids.placement(event.subject) && t.attribute === ":placement/stamp",
    )!.id;
    state.stampValidFrom = Math.floor(scheduledAbsMs);
    if (command.newAddress) {
      state.address = command.newAddress;
      state.addressId = receipt.triples.find(
        (t) => t.entityId === ids.worker(event.subject) && t.attribute === ":worker/address",
      )!.id;
      state.addressValidFrom = command.validRange.from;
    }
    acked.push({ position: receipt.position, instant: receipt.instant });
    writes++;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
})().catch((error) => {
  writerError = error;
});
let next = 0,
  compared = 0,
  local = 0,
  fallback = 0,
  floorReads = 0,
  straddles = 0,
  current = 0;
const kinds = [0, 0, 0],
  wait: number[] = [];
const started = performance.now();
try {
  await Promise.all(
    Array.from({ length: 32 }, async () => {
      while (next < count) {
        const n = next++,
          subject = ids.placement(n % subjects);
        if (writerError) throw writerError;
        const kind = n % 100 < 80 ? 0 : n % 100 < 95 ? 1 : 2;
        kinds[kind]++;
        const receipt = kind === 1 ? acked[(n * 7919) % acked.length]! : acked.at(-1)!;
        let basis: Basis = {
          recordedAt: receipt.instant,
          recordedPosition: receipt.position,
          validAt: Date.now() - (kind === 2 ? (1 + (n % 90)) * 86400000 : 0),
        };
        if (n % 503 === 0) {
          basis = {
            recordedPosition: host.index.floor,
            validAt: Date.now(),
            recordedAt: seed.lastInstant,
          };
          floorReads++;
        } else if (n % 7 === 0) {
          basis = { recordedPosition: host.index.position, validAt: Date.now() } as Basis;
          current++;
        }
        const gateway = async () => {
          const wire = await client.request<any>("POST", `/v2/db/${db.db}/reach-many`, {
            roots: [subject],
            basis,
            rowPage: true,
            full: true,
          });
          const rows = decodeSweepRows(wire, [subject], basis as any);
          assert(rows, `gateway declined ${JSON.stringify(wire)}`);
          return {
            triples: rows,
            entities: 0,
            roundTrips: 1,
            depth: 0,
            route: "source",
            language: "gateway",
            waitedMs: 0,
          };
        };
        const before = await reader.pullAt(subject, basis, gateway, undefined, true);
        // [DX-R3] Why: force the two sides of selected pairs across an actual ACK at the same named cut.
        // Rejected: only comparing quiescent bootstrap worlds.
        if (n % 997 === 0) {
          const prior = writes;
          const deadline = Date.now() + 5000;
          while (writes <= prior && !writerError && Date.now() < deadline)
            await new Promise((resolve) => setTimeout(resolve, 1));
          assert(writes > prior, "straddle must cross a commit");
          straddles++;
        }
        const slow = await gateway();
        assert.equal(
          worldCanonical(worldOf(subject, before.triples as any)),
          worldCanonical(worldOf(subject, slow.triples)),
          `canonical world at ${JSON.stringify({ n, basis })}`,
        );
        const fast = await reader.pullAt(subject, basis, gateway);
        assert.deepEqual(observe(fast), observe(slow), `whole-world observation at ${n}`);
        if (before.route === "replica") local++;
        else fallback++;
        wait.push(before.waitedMs);
        compared++;
        if (compared % 10000 === 0)
          console.log(
            JSON.stringify({
              compared,
              writes,
              local,
              fallback,
              wallS: (performance.now() - started) / 1000,
            }),
          );
      }
    }),
  );
  assert.equal(compared, count);
  assert(writes > 0 && floorReads > 0 && straddles > 0 && current > 0);
  wait.sort((a, b) => a - b);
  console.log(
    JSON.stringify({
      kind: "fresh-differential",
      subjects,
      compared,
      differences: 0,
      writes,
      local,
      fallback,
      floorReads,
      straddles,
      current,
      basisKinds: kinds,
      waitP50Ms: wait[Math.floor(wait.length * 0.5)],
      waitP99Ms: wait[Math.floor(wait.length * 0.99)],
      wallS: (performance.now() - started) / 1000,
      packedBytes: host.replica.bytes,
      historyBytes: host.index.historyBytes,
      rss: process.memoryUsage().rss,
    }),
  );
} finally {
  writing = false;
  await writer;
  await host.close();
  client.close();
  await comp.close();
}
if (writerError) throw writerError;
