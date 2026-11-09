// [CX-VINTQ] Why: a T/TP read must bypass position-retired H1 on every row route, including empty selections. Rejected: testing only row counts or only HostLog's public signature.
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { it, expect } from "vitest";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { HostBroker } from "../../../packages/qlever/src/broker/broker.ts";
import { H1BasisUnsupported } from "../../../packages/qlever/src/broker/log.ts";
import { makeQleverStorageAdapter } from "../../../packages/qlever/src/QleverStorageAdapter.ts";
import { columns } from "../../../packages/qlever/src/rdf.ts";
import type { QleverClient } from "../../../packages/qlever/src/QleverClient.ts";
const client: QleverClient = {
  query: async () => {
    throw new TypeError("irrelevant prose", {
      cause: Object.assign(new Error("fixture"), { code: "ECONNREFUSED" }),
    });
  },
  update: async () => ({}),
  command: async () => ({}),
  cancel: async () => {},
  close: async () => {},
};
const row = (i: number): TripleRow =>
  ({
    ...Object.fromEntries(columns.map((c) => [c, null])),
    id: `r${i}`,
    entity_id: "hot",
    attribute: ":many",
    value_type: "string",
    value_string: `v${i}`,
    recorded_position: -1,
    recorded_at: 100,
    valid_from: 0,
    entity_type: "Subject",
    schema_version: 1,
    tx_id: "assert",
  }) as TripleRow;
it("T and TP bypass H1 for entity, batched entity, pattern, scope and empty reads before/after retention", async () => {
  const b = await HostBroker.open({
    dir: path.join(import.meta.dirname, "output", "h1-data-" + randomUUID()),
    scopeKey: "vintq",
    minFreeBytes: 0,
  });
  const adapter = makeQleverStorageAdapter(client, "vintq", { broker: b });
  const submit = async (id: string, rows: TripleRow[], priors: TripleRow[] = []) => {
    const d = await b.submit({
      operationId: id,
      attemptId: id,
      sourceK: b.head(),
      reads: { entities: new Set(), scopeWide: false },
      claims: [],
      placeholders: [-1],
      rows,
      priors: new Map(priors.map((r) => [r.id, r])),
      newIds: new Set(rows.filter((r) => !priors.some((p) => p.id === r.id)).map((r) => r.id)),
    });
    expect(d.kind).toBe("committed");
    if (d.kind !== "committed") throw Error("fixture");
    return d.positions.get(-1)!;
  };
  const originalPull = b.pullAt.bind(b),
    originalSource = b.fromLogAsync.bind(b);
  let pulls = 0,
    sources = 0;
  try {
    const initial = Array.from({ length: 40 }, (_, i) => row(i));
    const p = await submit("assert", initial);
    const expected = initial.map((r) => ({ ...r, recorded_position: p }));
    const priors = expected.slice(0, 10);
    const after = await submit(
      "retract",
      priors.map((r) => ({
        ...r,
        retracted_position: -1,
        retracted_at: 200,
        retract_tx_id: "retract",
      })),
      priors,
    );
    for (let phase = 0; phase < 2; phase++) {
      if (phase) b.purgeCurrent(b.head());
      for (const basis of [
        { validAt: 500, recordedAt: 100 },
        { validAt: 500, recordedAt: 100, recordedPosition: after },
      ]) {
        // Exercise all four worker connections, including T=0; refusal precedes horizon/future checks.
        await expect(
          (b as any).log.sweepPage({ recordedPosition: after, recordedAt: 100 }, ["hot"]),
        ).rejects.toBeInstanceOf(H1BasisUnsupported);
        for (let i = 0; i < 8; i++)
          await expect(
            originalPull(
              { recordedPosition: after, recordedAt: i % 2 ? 0 : 100 },
              i % 2 ? { entities: [] } : { entities: ["hot"] },
            ),
          ).rejects.toBeInstanceOf(H1BasisUnsupported);
        b.pullAt = async (...args) => {
          pulls++;
          return originalPull(...args);
        };
        b.fromLogAsync = async (...args) => {
          sources++;
          return originalSource(...args);
        };
        const probes = [
          () => Effect.runPromise(adapter.getByEntity("hot", basis)),
          async () =>
            [
              ...(
                await Effect.runPromise(adapter.getByEntities(["hot", "absent"], basis))
              ).values(),
            ].flat(),
          () => Effect.runPromise(adapter.query({ entityId: "hot", attribute: ":many" }, basis)),
          () => Effect.runPromise(adapter.query({}, basis)),
        ];
        for (const probe of probes) {
          pulls = 0;
          sources = 0;
          expect((await probe()).toSorted((a, b) => a.id.localeCompare(b.id))).toEqual(
            expected.toSorted((a, b) => a.id.localeCompare(b.id)),
          );
          expect(pulls).toBe(0);
          expect(sources).toBe(1);
        }
        pulls = 0;
        sources = 0;
        expect(await Effect.runPromise(adapter.getByEntities([], basis))).toEqual(new Map());
        expect(pulls).toBe(0);
        expect(sources).toBe(0);
      }
    }
    b.pullAt = originalPull;
    b.fromLogAsync = originalSource;
    const current = await Effect.runPromise(
      adapter.getByEntity("hot", { validAt: 500, recordedPosition: after }),
    );
    expect(current).toHaveLength(30);
    const history = await Effect.runPromise(adapter.history("hot"));
    expect(history).toHaveLength(40);
    expect(history.filter((r) => r.retracted_position === after)).toHaveLength(10);
    expect(await Effect.runPromise(adapter.getById("r0"))).toBeNull();
    expect((await Effect.runPromise(adapter.getById("r10")))?.value_string).toBe("v10");
  } finally {
    await b.close();
  }
});
