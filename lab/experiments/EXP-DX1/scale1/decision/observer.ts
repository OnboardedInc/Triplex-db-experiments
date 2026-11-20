import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient } from "../../../../../packages/datomic/dist/index.js";
import { decodeRowText } from "../../../../../packages/datomic/dist/rowText.js";
import { canonicalJson } from "../../../../../packages/datomic/dist/rows.js";
import { fieldValue } from "../../../../bench/lib/deep-world.ts";
import { SEED_VALID_FROM } from "../../../../bench/lib/world.ts";
import { Histogram } from "../../../../bench/lib/hist.ts";
import {
  field,
  readTape,
  readWindow,
  sampleEvery,
  sha,
  task,
  type Cell,
  type Density,
} from "./plan.ts";

export type Scope = { name: string; db: string; cut: number; seedCut: number; accounts: number[] };
export type Feed = {
  db: string;
  position: number;
  tx: string;
  id: string;
  clock: number;
  seen: number;
  digest: string;
};
export type ReadResult = {
  latency: ReturnType<Histogram["toJSON"]>;
  planned: number;
  samples: { ordinal: number; start?: number; end: number; digest?: string; error?: string }[];
};
export type Begin = {
  kind: "begin";
  key: string;
  start: number;
  people: Density;
  repeat: number;
  cell: Cell;
  withReaders: boolean;
  scopes: Scope[];
};
export type Finish = { kind: "finish"; key: string; cuts: Record<string, number> };
export const now = () => performance.timeOrigin + performance.now();
const waitTo = async (until: number) => {
  while (now() < until) await sleep(Math.ceil(until - now()));
};
type Wire = [string, number, string[]];

export const journalHash = (root: string, changes: readonly Record<string, unknown>[]) =>
  sha([root, changes.map(canonicalJson).sort()]);

export function decodeFeed(db: string, row: Wire, seen: number): Feed {
  const [tx, position, text] = row;
  const fields = text.map(decodeRowText),
    attr = (a: string) => fields.filter((f) => f.attribute === ":_tx/" + a),
    id = attr("command-id"),
    instant = attr("instant"),
    owner = attr("changed-entity"),
    changes = attr("change").map((r) => JSON.parse(r.value_json!));
  assert(id.length === 1 && typeof id[0]!.value_string === "string");
  assert(instant.length === 1 && typeof instant[0]!.value_datetime === "number");
  assert(Number.isSafeInteger(position) && position > 0);
  assert(owner.length === 1 && typeof owner[0]!.value_string === "string");
  assert.deepEqual(
    attr("position").map((r) => r.value_number),
    [position],
  );
  assert(fields.length === changes.length + 4);
  return {
    db,
    position,
    tx,
    id: id[0]!.value_string!,
    clock: instant[0]!.value_datetime!,
    seen,
    digest: journalHash(owner[0]!.value_string!, changes),
  };
}

// [DX-SCALE1] Why: the two readers issue the same fixed seat tape at the initial durable basis for every cell. Rejected: a closed-loop fastest-reader distribution or materializing all read responses.
async function readCell(client: DatomicClient, role: number, m: Begin): Promise<ReadResult> {
  const scope = m.scopes.find((s) => s.accounts.includes(0))!;
  assert(scope);
  const ops = readTape(m.people, m.repeat, m.cell, m.withReaders).filter(
    (x) => x.seat % 2 === role,
  );
  const window = readWindow(m.cell);
  const active = new Map<number, Promise<void>>();
  const samples: ReadResult["samples"] = [];
  const latency = new Histogram();
  for (const op of ops) {
    await waitTo(m.start + op.ms);
    const at = now();
    if (active.has(op.seat) || at >= m.start + window.from + window.duration) {
      samples.push({ ordinal: op.ordinal, end: at, error: "reader missed its offer" });
      continue;
    }
    const query = async () => {
      try {
        const entity = task(0, op.subject);
        const got = await client.rows(scope.db, {
          entityIds: [entity],
          pattern: { attribute: field(0) },
          basis: { recordedPosition: scope.seedCut, validAt: SEED_VALID_FROM },
        });
        const end = now();
        const expected = fieldValue(op.subject, 0, 0, 0);
        assert(expected.type === "string");
        assert(got.length === 1 && got[0]!.entity_id === entity && got[0]!.attribute === field(0));
        assert(
          got[0]!.value_string === expected.value && got[0]!.recorded_position <= scope.seedCut,
        );
        latency.recordMs(end - m.start - op.ms);
        if ((op.ordinal + 1) % sampleEvery === 0)
          samples.push({
            ordinal: op.ordinal,
            start: at,
            end,
            digest: sha([entity, field(0), expected]),
          });
      } catch (e) {
        samples.push({ ordinal: op.ordinal, start: at, end: now(), error: String(e) });
      }
    };
    const pending = query().finally(() => active.delete(op.seat));
    active.set(op.seat, pending);
  }
  await Promise.all(active.values());
  assert.equal(latency.count + samples.filter((s) => s.error).length, ops.length);
  return { latency: latency.toJSON(), samples, planned: ops.length };
}

async function follow(client: DatomicClient, m: Begin, stop: () => Finish | undefined) {
  const feeds = new Map(m.scopes.map((s) => [s.db, { after: s.cut, rows: [] as Feed[] }]));
  let last = now();
  for (;;) {
    const cut = stop();
    if (cut && [...feeds].every(([db, f]) => f.after === cut.cuts[db])) break;
    assert(now() - last < 40000 || !cut, "Timed feed drain exceeded 40 seconds");
    const batch = await Promise.all(
      [...feeds].map(async ([db, cursor]) => {
        if (cut && cursor.after === cut.cuts[db]) return 0;
        const result = await client.request<{ transactions: Wire[] }>(
          "POST",
          `/v2/db/${db}/transactions`,
          { after: cursor.after, limit: 100 },
        );
        const seen = now();
        for (const row of result.transactions) {
          const r = decodeFeed(db, row, seen);
          assert.equal(r.position, ++cursor.after);
          cursor.rows.push(r);
          assert(cursor.rows.length <= 40000, "Feed rows exceeded the bounded cell size");
        }
        if (cut) assert(cursor.after <= cut.cuts[db]!);
        return result.transactions.length;
      }),
    );
    if (batch.some(Boolean)) last = now();
    else await sleep(25);
  }
  return [...feeds.values()].flatMap((f) => f.rows);
}

if (process.argv[1] === import.meta.filename) {
  assert(process.send);
  const role = process.argv[2],
    url = process.env.DECISION_OBSERVER_URL;
  assert((role === "0" || role === "1" || role === "feed") && url);
  const client = new DatomicClient(url, 35000);
  let active: string | undefined;
  let finish: Finish | undefined;
  process.on("disconnect", () => client.close());
  process.on("message", (m: Begin | Finish) => {
    if (m.kind === "finish") {
      assert.equal(m.key, active);
      finish = m;
      return;
    }
    assert(!active);
    active = m.key;
    void (role === "feed" ? follow(client, m, () => finish) : readCell(client, Number(role), m))
      .then((data) => process.send!({ key: m.key, data }))
      .catch((e) => process.send!({ key: m.key, error: String(e) }))
      .finally(() => {
        active = undefined;
        finish = undefined;
      });
  });
  process.send({ ready: role });
}
