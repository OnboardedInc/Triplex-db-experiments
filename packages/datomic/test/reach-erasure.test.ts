import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { gzipSync } from "node:zlib";
import { expect, it } from "vitest";
import { DatabaseScope, type TripleRow } from "@triplex-build/triplex/runtime";
import { DatomicClient } from "../src/DatomicClient.js";
import { packValue } from "../src/rows.js";
import { rowTextColumns } from "../src/rowText.js";
import { databaseName } from "../src/scopeName.js";

const subject = "subject";
const clear = { type: "string", value: "planted-string" } as const;
const marker = { type: "erased", valueType: "string", erasedAt: 42, erasureTxId: "erase" };
const basis = (recordedPosition = 1) => ({ validAt: 10, recordedPosition });
const fact: TripleRow = {
  id: "assertion",
  entity_id: subject,
  attribute: ":protected",
  ...packValue(clear),
  recorded_at: 10,
  recorded_position: 1,
  valid_from: 10,
  valid_to: null,
  created_by: "fixture",
  retracted_at: null,
  retracted_position: null,
  retract_tx_id: null,
  entity_type: null,
  schema_version: 1,
  tx_id: null,
};
const inline = (erased = false) => {
  const row = erased
    ? { ...fact, value_type: "erased", value_string: null, value_json: JSON.stringify(marker) }
    : fact;
  const columns = rowTextColumns.map((key) =>
    key === "recorded_position" ? String(row[key]).padStart(16, "0") : row[key],
  );
  return [subject, 1, [columns]];
};
const ref = [subject, 1];
const database = databaseName(DatabaseScope.test("reach-erasure"));
const value = (result: Awaited<ReturnType<DatomicClient["reachEntities"]>>) =>
  result?.entities.get(subject)?.rows[0]?.value;
type Step = {
  readonly seq?: number;
  readonly entity: unknown[];
  readonly position?: number;
  readonly gzip?: boolean;
  readonly waiting?: Promise<void>;
  readonly seen?: () => void;
  readonly input?: (body: Record<string, unknown>) => void;
};

// [DX-ERASE1] Why: the frontier travels in the real response headers, including on repair and reordered replies.
// Rejected: stubbing reachEntities (would bypass the cache and HTTP binding this test needs).
async function withPeer(
  steps: Step[],
  test: (client: DatomicClient) => Promise<void>,
  historicalRevisionReuse = false,
) {
  const server = createServer(async (req, res) => {
    const step = steps.shift();
    try {
      assert(step, "Unexpected reach request");
      const bytes: Buffer[] = [];
      for await (const chunk of req) bytes.push(Buffer.from(chunk));
      step.input?.(JSON.parse(Buffer.concat(bytes).toString("utf8")));
      step.seen?.();
      await step.waiting;
      if (step.seq !== undefined) res.setHeader("x-triplex-erasure-seq", String(step.seq));
      const body = JSON.stringify({
        position: step.position ?? 1,
        t: String((step.position ?? 1) + 500),
        reset: false,
        entities: [step.entity],
        closures: [[subject, [subject]]],
      });
      res.end(step.gzip ? JSON.stringify({ gzipRows: gzipSync(body).toString("base64") }) : body);
    } catch {
      res.statusCode = 500;
      res.end(JSON.stringify({ code: "FixtureMismatch" }));
    }
  }).listen(0);
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const host = address.family === "IPv6" ? `[${address.address}]` : address.address;
  const client = new DatomicClient(`http://${host}:${address.port}`, 2_000, undefined, {
    historicalRevisionReuse,
  });
  try {
    await test(client);
    expect(steps).toHaveLength(0);
  } finally {
    client.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

it("keeps references at the same pin and rejects a cached value at a newer frontier", async () => {
  await withPeer(
    [
      { seq: 0, entity: inline() },
      { seq: 0, entity: ref },
      { seq: 1, entity: ref },
      { seq: 1, entity: inline(true), input: (body) => expect(body.need).toEqual([subject]) },
    ],
    async (peer) => {
      expect(value(await peer.reachEntities(database, [subject], basis()))).toEqual(clear);
      expect(value(await peer.reachEntities(database, [subject], basis()))).toEqual(clear);
      expect(peer.reachDiagnostics.referenceHits).toBe(1);
      expect(value(await peer.reachEntities(database, [subject], basis()))).toEqual(marker);
    },
  );
});

it("repairs at the same cut or retries the entire read when the frontier moves", async () => {
  await withPeer(
    [
      { seq: 0, entity: inline() },
      { seq: 1, entity: ref },
      { seq: 2, entity: inline(true), input: (body) => expect(body.need).toEqual([subject]) },
      { seq: 2, entity: inline(true), input: (body) => expect(body.full).toBe(true) },
    ],
    async (peer) => {
      expect(value(await peer.reachEntities(database, [subject], basis()))).toEqual(clear);
      expect(value(await peer.reachEntities(database, [subject], basis()))).toEqual(marker);
      expect(peer.reachDiagnostics.fullRetries).toBe(1);
    },
  );
});

it("does not carry a guarded cache entry across data positions", async () => {
  await withPeer(
    [
      { seq: 0, entity: inline() },
      { seq: 0, entity: ref, position: 2 },
      {
        seq: 0,
        entity: inline(),
        position: 2,
        input: (body) => expect(body.need).toEqual([subject]),
      },
    ],
    async (peer) => {
      expect(value(await peer.reachEntities(database, [subject], basis()))).toEqual(clear);
      const second = await peer.reachEntities(database, [subject], basis(2));
      expect(second?.position).toBe(2);
      expect(second?.requests).toBe(2);
    },
  );
});

it.each(
  ["reference", "inline"].flatMap((format) =>
    [false, true].map((historicalRevisionReuse) => ({ format, historicalRevisionReuse })),
  ),
)(
  "cannot roll back a protected cache on a late $format reply (history $historicalRevisionReuse)",
  async ({ format, historicalRevisionReuse }) => {
    const release = Promise.withResolvers<void>();
    const entered = Promise.withResolvers<void>();
    await withPeer(
      [
        { seq: 0, entity: inline() },
        {
          seq: 0,
          entity: format === "reference" ? ref : inline(),
          waiting: release.promise,
          seen: entered.resolve,
        },
        { seq: 1, entity: inline(true) },
        { seq: 1, entity: inline(true), input: (body) => expect(body.full).toBe(true) },
        { seq: 1, entity: ref },
      ],
      async (peer) => {
        expect(value(await peer.reachEntities(database, [subject], basis()))).toEqual(clear);
        const late = peer.reachEntities(database, [subject], basis());
        try {
          await entered.promise;
          expect(value(await peer.reachEntities(database, [subject], basis()))).toEqual(marker);
        } finally {
          release.resolve();
        }
        const result = await late;
        expect(value(result)).toEqual(marker);
        expect(result?.requests).toBe(2);
        expect(value(await peer.reachEntities(database, [subject], basis()))).toEqual(marker);
      },
      historicalRevisionReuse,
    );
  },
);

it("keeps the sequence on compressed pages and refuses to reuse a reference without it", async () => {
  const zipped = (step: Step) => ({ ...step, gzip: true });
  await withPeer(
    [
      zipped({ seq: 0, entity: inline() }),
      zipped({ seq: 0, entity: ref }),
      zipped({ entity: ref }),
      zipped({ seq: 1, entity: inline(true), input: (body) => expect(body.full).toBe(true) }),
    ],
    async (peer) => {
      const read = () => peer.reachEntities(database, [subject], basis(), true, true);
      expect(value(await read())).toEqual(clear);
      expect(value(await read())).toEqual(clear);
      expect(value(await read())).toEqual(marker);
    },
  );
});
