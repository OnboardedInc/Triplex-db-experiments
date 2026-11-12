import { describe, it, expect, vi } from "vitest";
import { SharedIndex } from "../src/replica/sharedIndex.js";
import { Replica, ReplicaSnapshot, type ReplicaSource } from "../src/replica/Replica.js";
import type { SweepRow } from "../src/sweepRows.js";
import { encodeRowText } from "../src/rowText.js";
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
describe("packed replica", () => {
  it("captures a subject closure at one cut without scanning unrelated overlay entries", async () => {
    const f = fixture(),
      replica = new Replica(f.source, 0);
    expect(() => replica.snapshotSubject("root")).toThrow("rebuild");
    await replica.bootstrap(["root"]);
    const original = replica.snapshotSubject("root");
    f.commit([
      [
        "root",
        [
          row("root", "r", { type: "ref", value: "shared" }, 2),
          row("root", "e", { type: "ref", value: "empty" }, 2),
        ],
      ],
      ["shared", [row("shared", "long", { type: "string", value: "replacement".repeat(30) }, 2)]],
      ["empty", []],
      ...Array.from({ length: 2000 }, (_, i): [string, SweepRow[]] => [
        "unrelated" + i,
        [row("unrelated" + i, "u" + i, { type: "boolean", value: true }, 2)],
      ]),
    ]);
    await replica.followOnce();
    const full = await replica.snapshotAt(2),
      lookup = vi.spyOn(SharedIndex.prototype, "get");
    expect(full.image().entities).toHaveLength(2003);
    expect(full.world("unrelated0")[0]!.value).toEqual({ type: "boolean", value: true });
    let frozen: ReplicaSnapshot;
    try {
      frozen = replica.snapshotSubject("root");
      for (let i = 0; i < 20; i++) expect(replica.snapshotSubject("root").position).toBe(2);
      expect(lookup.mock.calls.length).toBeLessThan(200);
    } finally {
      lookup.mockRestore();
    }
    expect(frozen!.world("root")).toEqual(full.world("root"));
    expect(frozen!.world("empty")).toEqual([]);
    expect(
      frozen!
        .image()
        .entities.map(([id]) => id)
        .sort(),
    ).toEqual(["empty", "root", "shared"]);
    expect(() => frozen!.world("unrelated0")).toThrow("Missing");
    const actualBytes = frozen!
      .image()
      .entities.reduce((n, [, e]) => n + (e.byteLength ?? e.buffer.byteLength), 0);
    expect(frozen!.bytes).toBe(actualBytes);
    expect(new ReplicaSnapshot(frozen!.sharedImage()).world("root")).toEqual(full.world("root"));
    f.commit([["shared", []]]);
    await replica.followOnce();
    expect(replica.snapshotSubject("root").position).toBe(3);
    expect(
      replica
        .snapshotSubject("root")
        .world("root")
        .map((r) => r.id),
    ).toEqual(["e", "r"]);
    expect(frozen!.world("root")[2]!.id).toBe("long");
    expect(original.world("root")[1]!.value.value).toBe("before");
  });
  it("bootstraps, follows shared changes/retractions/new refs, and isolates snapshots", async () => {
    const f = fixture(),
      replica = new Replica(f.source, 0);
    await replica.bootstrap(["root"]);
    const frozen = await replica.snapshotAt(1);
    const target = f.commit([
      ["shared", [row("shared", "s2", { type: "string", value: "after" }, 2)]],
    ]);
    let ready = false;
    const caught = replica.caughtUpTo(target).then(() => {
      ready = true;
    });
    expect(ready).toBe(false);
    await replica.followOnce();
    await caught;
    expect(replica.world("root")[1]!.value.value).toBe("after");
    expect(frozen.world("root")[1]!.value.value).toBe("before");
    f.commit([
      ["root", [row("root", "newref", { type: "ref", value: "new" }, 3)]],
      ["new", [row("new", "n", { type: "boolean", value: true }, 3)]],
    ]);
    await replica.followOnce();
    expect(replica.world("root").map((r) => r.id)).toEqual(["newref", "n"]);
    f.commit([["root", []]]);
    await replica.followOnce();
    expect(replica.world("root")).toEqual([]);
    await expect(replica.snapshotAt(1)).rejects.toThrow("unavailable");
    expect(new ReplicaSnapshot(frozen.image()).world("root")).toEqual(frozen.world("root"));
    const shared = frozen.sharedImage();
    expect(new ReplicaSnapshot(shared).world("root")).toEqual(frozen.world("root"));
    expect(new ReplicaSnapshot(shared).bytes).toBe(frozen.bytes);
    expect(shared.entities.every(([, e]) => e.buffer === shared.entities[0]![1].buffer)).toBe(true);
  });
  it("rejects gaps, rejects waiting readers and rebuilds rather than guessing", async () => {
    const f = fixture(),
      replica = new Replica(f.source, 0);
    await replica.bootstrap(["root"]);
    const pending = replica.caughtUpTo(4);
    const rejected = expect(pending).rejects.toThrow("gap");
    f.source.feed = async () => ({ head: 3, transactions: [{ position: 3, entities: [] }] });
    await expect(replica.followOnce()).rejects.toThrow("gap");
    await rejected;
    expect(() => replica.world("root")).toThrow("rebuild");
    await replica.bootstrap(["root"], 1);
    expect(replica.isValid).toBe(true);
  });
  it("rejects declines, missing reference coverage, wrong cuts, duplicates and partial updates", async () => {
    for (const kind of ["decline", "cut", "reference", "duplicate"]) {
      const f = fixture(),
        original = f.source.page;
      f.source.page = async (...args) => {
        const p = await original(...args);
        if (kind === "decline") p.declined = "test";
        if (kind === "cut") p.position++;
        if (kind === "reference") {
          p.entities.pop();
          p.closures = [["root", ["root"]]];
        }
        if (kind === "duplicate") p.entities.push(p.entities[0]);
        return p;
      };
      const replica = new Replica(f.source, 0);
      await expect(replica.bootstrap(["root"])).rejects.toThrow();
      expect(replica.isValid).toBe(false);
    }
  });
  it("captures an intermediate cut without applying later entries", async () => {
    const f = fixture(),
      r = new Replica(f.source, 0);
    await r.bootstrap(["root"]);
    f.commit([["shared", [row("shared", "v2", { type: "string", value: "v2" }, 2)]]]);
    f.commit([["shared", [row("shared", "v3", { type: "string", value: "v3" }, 3)]]]);
    const snap = await r.snapshotAt(2);
    expect(r.position).toBe(2);
    await r.followOnce();
    expect(snap.world("root")[1]!.id).toBe("v2");
    expect(r.world("root")[1]!.id).toBe("v3");
  });
  it("rebuilds automatically after a feed decline, and stops a caught-up long-poll loop", async () => {
    const f = fixture(),
      original = f.source.page;
    let pages = 0,
      first = true;
    f.source.page = (...args) => {
      pages++;
      return original(...args);
    };
    const feed = f.source.feed;
    f.source.feed = (...args) => {
      if (first) {
        first = false;
        return Promise.reject(new Error("declined"));
      }
      return feed(...args);
    };
    const r = new Replica(f.source, 0);
    expect(() => r.start()).toThrow("Bootstrap");
    await r.bootstrap(["root"]);
    r.start();
    await new Promise((resolve) => setTimeout(resolve, 120));
    await r.stop();
    expect(pages).toBeGreaterThan(1);
    expect(r.isValid).toBe(true);
    expect(r.world("root")[1]!.value.value).toBe("before");
  });
  it("replays 2000 ordered replacements and retractions without leaking into a held snapshot", async () => {
    const f = fixture(),
      r = new Replica(f.source, 0);
    await r.bootstrap(["root"]);
    const original = await r.snapshotAt(1);
    for (let i = 0; i < 2000; i++) {
      const rows =
        i % 3 === 0 ? [] : [row("shared", "row:" + i, { type: "string", value: String(i) }, i + 2)];
      f.commit([["shared", rows]]);
      await r.followOnce();
      expect(r.world("root").slice(1)).toEqual(rows);
    }
    expect(original.world("root")[1]!.value.value).toBe("before");
    expect(r.position).toBe(2001);
  });
  it("captures a requested cut while an already in-flight follower batch advances beyond it", async () => {
    const f = fixture(),
      r = new Replica(f.source, 0);
    await r.bootstrap(["root"]);
    f.commit([["shared", [row("shared", "v2", { type: "string", value: "v2" }, 2)]]]);
    f.commit([["shared", [row("shared", "v3", { type: "string", value: "v3" }, 3)]]]);
    const original = f.source.feed;
    let release!: () => void, entered!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    f.source.feed = async (...args) => {
      entered();
      await gate;
      return original(...args);
    };
    const running = r.followOnce();
    await started;
    const frozen = r.snapshotAt(2);
    release();
    const view = await frozen;
    await running;
    expect(r.position).toBe(3);
    expect(view.position).toBe(2);
    expect(view.world("root")[1]!.id).toBe("v2");
    expect(r.world("root")[1]!.id).toBe("v3");
    expect((await r.capture()).position).toBe(3);
  });
  it("cancels a future capture when stopped instead of leaving its polling task alive", async () => {
    const f = fixture(),
      r = new Replica(f.source, 0);
    await r.bootstrap(["root"]);
    const waiting = r.snapshotAt(10),
      rejected = expect(waiting).rejects.toThrow("stopped");
    await new Promise((resolve) => setTimeout(resolve, 5));
    await r.stop();
    await rejected;
  });
});
