import { describe, it, expect } from "vitest";
import {
  Replica,
  ReplicaSnapshot,
  type ReplicaSource,
} from "../../../../packages/datomic/src/replica/Replica.js";
import type { SweepRow } from "../../../../packages/datomic/src/sweepRows.js";
import { encodeRowText } from "../../../../packages/datomic/src/rowText.js";
import type { TripleRow } from "@triplex-build/triplex/runtime";

const row = (e: string, id: string, value: SweepRow["value"], p = 1): SweepRow => ({
  id,
  entityId: e,
  attribute: "value",
  value,
  position: p,
  validFrom: 0,
});
const wire = (r: SweepRow) =>
  encodeRowText({
    recorded_position: r.position,
    id: r.id,
    entity_id: r.entityId,
    attribute: r.attribute,
    value_type: r.value.type,
    value_string: ["ref", "string", "integer", "blob"].includes(r.value.type)
      ? r.value.value
      : null,
    value_number: r.value.type === "number" ? r.value.value : null,
    value_boolean: r.value.type === "boolean" ? Number(r.value.value) : null,
    value_datetime: r.value.type === "datetime" ? r.value.value : null,
    value_json: r.value.type === "json" ? JSON.stringify(r.value.value) : null,
    recorded_at: r.position,
    valid_from: r.validFrom,
    valid_to: r.validTo ?? null,
    created_by: "test",
    entity_type: null,
    schema_version: 1,
    tx_id: null,
    retracted_at: null,
    retracted_position: null,
    retract_tx_id: null,
  } as TripleRow);
function fixture() {
  let head = 1;
  const states = new Map<number, Map<string, SweepRow[]>>([
    [
      1,
      new Map([
        ["root", [row("root", "r", { type: "ref", value: "shared" })]],
        ["shared", [row("shared", "s", { type: "string", value: "before" })]],
      ]),
    ],
  ]);
  const journals: { position: number; entities: string[] }[] = [];
  const source: ReplicaSource = {
    head: async () => head,
    page: async (roots, basis, need) => {
      const state = states.get(basis.recordedPosition!)!,
        ids = new Set(roots);
      if (!need)
        for (const id of ids)
          for (const r of state.get(id) ?? [])
            if (
              r.value.type === "ref" &&
              r.validFrom <= basis.validAt &&
              (r.validTo === undefined || r.validTo > basis.validAt)
            )
              ids.add(r.value.value);
      return {
        position: basis.recordedPosition!,
        t: "1",
        reset: true,
        closures: roots.map((r) => [r, need ? [r] : [...ids]]),
        entities: [...ids].map((id) => {
          const rs = state.get(id) ?? [];
          return [id, rs.length ? basis.recordedPosition! : 0, rs.map(wire)];
        }),
      };
    },
    feed: async (after, limit) => ({
      head,
      transactions: journals.filter((j) => j.position > after).slice(0, limit),
    }),
  };
  return {
    source,
    commit(changes: [string, SweepRow[]][]) {
      const next = new Map(states.get(head));
      head++;
      for (const [id, rows] of changes) next.set(id, rows);
      states.set(head, next);
      journals.push({ position: head, entities: changes.map(([id]) => id) });
      return head;
    },
  };
}

describe("inline replica journal", () => {
  it("applies two revisions, retirement and a new reference with no extra reads", async () => {
    const f = fixture();
    const originalFeed = f.source.feed;
    const originalPage = f.source.page;
    f.source.feed = async (...args) => {
      const page = await originalFeed(...args);
      return {
        ...page,
        transactions: await Promise.all(
          page.transactions.map(async (tx) => ({
            ...tx,
            replacement: await originalPage(tx.entities, {
              recordedPosition: tx.position,
              validAt: 0,
            }),
          })),
        ),
      };
    };
    const r = new Replica(f.source, 0);
    await r.bootstrap(["root"]);
    const frozen = await r.capture();
    let reads = 0;
    f.source.page = async () => {
      reads++;
      throw new Error("Unexpected read");
    };
    f.commit([["shared", [row("shared", "v2", { type: "string", value: "second" }, 2)]]]);
    f.commit([
      ["root", [row("root", "ref", { type: "ref", value: "new" }, 3)]],
      ["new", [row("new", "n", { type: "boolean", value: true }, 3)]],
      ["shared", []],
    ]);
    const intermediate = r.snapshotAt(2);
    const snap = await intermediate;
    expect(snap.world("root")[1]!.id).toBe("v2");
    await r.followOnce();
    expect(r.position).toBe(3);
    expect(r.world("root")[1]!.entityId).toBe("new");
    expect(r.world("shared")).toEqual([]);
    expect(frozen.world("root")[1]!.value.value).toBe("before");
    expect(reads).toBe(0);
  });
  for (const corruption of ["cut", "coverage", "reference", "revision"])
    it("invalidates " + corruption, async () => {
      const f = fixture(),
        r = new Replica(f.source, 0);
      await r.bootstrap(["root"]);
      f.commit([["shared", [row("shared", "v2", { type: "string", value: "second" }, 2)]]]);
      const feed = f.source.feed;
      f.source.feed = async (...args) => {
        const page = await feed(...args);
        const replacement = await f.source.page(["shared"], { recordedPosition: 2, validAt: 0 });
        if (corruption === "cut") replacement.position = 1;
        if (corruption === "coverage") replacement.entities = [];
        if (corruption === "reference")
          replacement.entities = [
            ["shared", 2, [wire(row("shared", "ref", { type: "ref", value: "missing" }, 2))]],
          ];
        if (corruption === "revision") replacement.entities = [["shared", -1, []]];
        return { ...page, transactions: page.transactions.map((tx) => ({ ...tx, replacement })) };
      };
      await expect(r.followOnce()).rejects.toThrow();
      expect(r.isValid).toBe(false);
    });
  it("declines an unsupported scope before the first row read", async () => {
    const f = fixture();
    f.source.capability = async () => "replica-layout";
    f.source.page = async () => {
      throw new Error("Unexpected page");
    };
    const r = new Replica(f.source, 0);
    await expect(r.bootstrap(["root"])).rejects.toMatchObject({
      name: "ReplicaUnsupportedScope",
      reason: "replica-layout",
    });
    expect(r.isValid).toBe(false);
  });
});
