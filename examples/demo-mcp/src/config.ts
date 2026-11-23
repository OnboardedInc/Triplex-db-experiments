// [DX-CON1] Triplex configuration on this engine without a scan (G1). Triplex's stock ConfigStore.layer runs unchanged
// over the write gateway; its five reads by entity type are bounded by the guard to entity IDs found by walking from
// the `test` and `live` refs: each ref's snapshot, the snapshots' parent chain, their revisions (and revision parents),
// the objects (snapshot roots, revision objects, every child) and each object's validUnder types.
// Console rules that keep the walk complete: every commit moves `test`; `test` is never moved back; only `live` is
// moved by hand; each new release's parent is the newest release (Triplex's own rule), so walking back from `test`
// reaches every release ever committed.
// Why: the stock load() scans every entity five times (hours at 1 billion records, no budget, a read permit held).
// The IDs are rebuilt from the database whenever a ref moves, so a restart or another process loses nothing.
// Rejected: the playground's IDs in process memory (lost on restart; wrong after another process commits).
import { Triples } from "@triplex-build/triplex";
import { Attribute, ConfigNode, ConfigStore, EntityType, InMemoryConfigStore } from "@triplex-build/triplex/config";
import { Descriptors } from "@triplex-build/triplex/entity";
import { Capabilities, QueryExecutor, Runtime, StorageAdapter, type TripleRow } from "@triplex-build/triplex/runtime";
import { makeDatomicQueryExecutor, makeDatomicStorageAdapter, traceScheduler } from "@triplex-build/triplex-datomic";
import { Effect, Layer, ManagedRuntime, Scheduler } from "effect";
import { DemoError } from "./errors.ts";
import { configEntityTypes, type ConfigIds, type GuardedClient } from "./guard.ts";

const S = ConfigStore.System;
const id = ConfigStore.entityId;
type Store = InMemoryConfigStore.InMemoryConfigStore;
type Snapshot = InMemoryConfigStore.ConfigSnapshot;
type Rt = ManagedRuntime.ManagedRuntime<Triples | ConfigStore.ConfigStore, never>;

export const REFS = ["test", "live"] as const;

/** The starter type of the first release: the three attributes every loader-built root carries (DESIGN.md 5.2). */
export const SubjectType = EntityType.make("Subject", {
  attributes: {
    account: Attribute.use(Attribute.text(":subject/account"), { required: true }),
    member: Attribute.use(Attribute.text(":subject/member"), { required: true }),
    status: Attribute.use(Attribute.text(":placement/status")),
  },
});

const json = <A>(row: TripleRow | undefined) => (row?.value_json ? (JSON.parse(row.value_json) as A) : undefined);
const one = (rows: readonly TripleRow[], entity: string, attribute: string) =>
  rows.filter((r) => r.entity_id === entity && r.attribute === attribute).sort((a, b) => b.recorded_at - a.recorded_at || b.id.localeCompare(a.id))[0];

export type Discovery = {
  refs: Partial<Record<(typeof REFS)[number], string>>;
  ids: ConfigIds;
  /** Batched entity reads this discovery made (0 when the refs had not moved). */
  reads: number;
  walked: boolean;
};

export const tagOf = (error: unknown): string | undefined =>
  (error as { _tag?: string })?._tag ?? (error as { cause?: { _tag?: string } })?.cause?._tag;

export class Config {
  readonly client: GuardedClient;
  readonly db: string;
  private readonly rt: Rt;
  private seen: Discovery | undefined;
  private known = { snapshots: new Map<string, { parentId: string | null; revisionIds: string[]; rootCid: string }>(), objects: new Set<string>(), types: new Set<string>(), revisions: new Set<string>() };

  constructor(client: GuardedClient, scope: string, db: string) {
    this.client = client;
    this.db = db;
    const definition = Runtime.define({
      name: "datomic",
      storage: Layer.succeed(StorageAdapter, makeDatomicStorageAdapter(client, scope, { layout: "lean", serverRecordTime: true })),
      queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(client, scope)),
    });
    const triplex = definition.layer({ scope: scope as never, capabilities: Capabilities.none });
    this.rt = ManagedRuntime.make(Layer.merge(triplex, ConfigStore.layer.pipe(Layer.provide(triplex)))) as Rt;
  }

  close() {
    void this.rt.dispose();
  }

  run<A, E>(effect: Effect.Effect<A, E, Triples | ConfigStore.ConfigStore>) {
    return this.rt.runPromise(effect, { scheduler: traceScheduler(new Scheduler.MixedScheduler()) });
  }

  private async read(entityIds: readonly string[]) {
    if (!entityIds.length) return [];
    return this.client.rows(this.db, { entityIds: [...new Set(entityIds)] });
  }

  /** The refs' targets, then (only when one moved) the walk. Every read names its entity IDs. */
  async discover(force = false): Promise<Discovery> {
    const refRows = await this.read(REFS.map((r) => id.ref(r)));
    const refs: Discovery["refs"] = {};
    for (const r of REFS) {
      const target = one(refRows, id.ref(r), S.attribute.target)?.value_string;
      if (target) refs[r] = target;
    }
    if (!force && this.seen && JSON.stringify(this.seen.refs) === JSON.stringify(refs))
      return { ...this.seen, reads: 1, walked: false };
    let reads = 1;
    const k = this.known;
    // Snapshots: from each ref's target back through parentId, one batched read per level; known ones end the walk.
    let level = [...new Set(Object.values(refs))].filter((e) => !k.snapshots.has(e));
    while (level.length) {
      const rows = await this.read(level);
      reads++;
      const next: string[] = [];
      for (const e of level) {
        const record = json<{ id: string; parentId: string | null; revisionIds: string[]; rootCid: string }>(one(rows, e, S.attribute.data));
        if (!record) throw new DemoError("CorruptConfiguration", `The configuration record ${e} has no snapshot data`);
        k.snapshots.set(e, { parentId: record.parentId, revisionIds: record.revisionIds, rootCid: record.rootCid });
        if (record.parentId && !k.snapshots.has(id.snapshot(record.parentId))) next.push(id.snapshot(record.parentId));
      }
      level = [...new Set(next)];
    }
    // Revisions, with their own parent chains (every revision belongs to some release, so this adds nothing new
    // when the rules above hold; it is cheap insurance).
    const objectsToRead = new Set<string>();
    let revisions: string[] = [...k.snapshots.values()].flatMap((s) => s.revisionIds.map((r) => id.revision(r))).filter((e) => !k.revisions.has(e));
    for (const s of k.snapshots.values()) if (!k.objects.has(id.object(s.rootCid))) objectsToRead.add(id.object(s.rootCid));
    while (revisions.length) {
      const rows = await this.read(revisions);
      reads++;
      const next: string[] = [];
      for (const e of revisions) {
        const rev = json<{ cid: string; parentId: string | null }>(one(rows, e, S.attribute.data));
        if (!rev) throw new DemoError("CorruptConfiguration", `The configuration record ${e} has no revision data`);
        k.revisions.add(e);
        if (!k.objects.has(id.object(rev.cid))) objectsToRead.add(id.object(rev.cid));
        if (rev.parentId && !k.revisions.has(id.revision(rev.parentId))) next.push(id.revision(rev.parentId));
      }
      revisions = [...new Set(next)];
    }
    // Objects and their children, level by level; each object's validUnder names its types. Objects are immutable
    // except that a later release can add a validUnder type to an existing one, so every known object is read again.
    let objects = [...new Set([...k.objects, ...objectsToRead])];
    const typesToRead = new Set<string>();
    while (objects.length) {
      const rows = await this.read(objects);
      reads++;
      const next: string[] = [];
      for (const e of objects) {
        const body = json<{ children?: { cid: string }[] }>(one(rows, e, S.attribute.data));
        if (!body) throw new DemoError("CorruptConfiguration", `The configuration record ${e} has no object data`);
        k.objects.add(e);
        for (const c of body.children ?? []) if (!k.objects.has(id.object(c.cid))) next.push(id.object(c.cid));
        for (const r of rows) if (r.entity_id === e && r.attribute === S.attribute.validUnder && r.value_string && !k.types.has(id.type(r.value_string))) typesToRead.add(id.type(r.value_string));
      }
      objects = [...new Set(next)].filter((e) => !objects.includes(e) && !k.objects.has(e));
    }
    if (typesToRead.size) {
      const rows = await this.read([...typesToRead]);
      reads++;
      for (const e of typesToRead) {
        if (!one(rows, e, S.attribute.data)) throw new DemoError("CorruptConfiguration", `The configuration record ${e} has no type data`);
        k.types.add(e);
      }
    }
    const ids: ConfigIds = {
      "triplex.config-object": [...k.objects].sort(),
      "triplex.config-type": [...k.types].sort(),
      "triplex.config-revision": [...k.revisions].sort(),
      "triplex.config-snapshot": [...k.snapshots.keys()].sort(),
      "triplex.config-ref": REFS.filter((r) => refs[r]).map((r) => id.ref(r)),
    };
    this.client.configIds = ids;
    this.seen = { refs, ids, reads, walked: true };
    return this.seen;
  }

  /** Triplex's stock load(), its five by-type reads bounded to the discovered IDs. */
  async load(): Promise<{ store: Store; discovery: Discovery }> {
    const discovery = await this.discover();
    const store = await this.run(Effect.flatMap(ConfigStore.ConfigStore, (s) => s.load()));
    return { store, discovery };
  }

  /** Record a release with Triplex's stock commit; it always moves `test`. Retries once after another process's commit. */
  async commit(label: string, objects: readonly ConfigNode.ConfigNode[]) {
    for (let attempt = 0; ; attempt++) {
      await this.discover(attempt > 0);
      try {
        const result = await this.run(Effect.flatMap(ConfigStore.ConfigStore, (s) => s.commit({ label, objects, ref: "test" })));
        await this.discover();
        return result;
      } catch (error) {
        const tag = tagOf(error);
        if (attempt === 0 && (tag === "CorruptConfigStoreError" || tag === "TransactionConflictError")) continue;
        throw error;
      }
    }
  }

  /** Move `live` (compare-and-retract on the ref fact, Triplex's setRef). */
  async moveLive(snapshotId: string) {
    for (let attempt = 0; ; attempt++) {
      await this.discover(attempt > 0);
      try {
        const snapshot = await this.run(Effect.flatMap(ConfigStore.ConfigStore, (s) => s.setRef("live", snapshotId as never)));
        await this.discover();
        // setRef returns the snapshot only; the receipt is read back from the ref's own target fact.
        const row = one(await this.read([id.ref("live")]), id.ref("live"), S.attribute.target)!;
        return { snapshot, receipt: { txId: row.tx_id, position: row.recorded_position, recordedAt: new Date(row.recorded_at).toISOString(), actor: "triplex/config-store" } };
      } catch (error) {
        if (attempt === 0 && tagOf(error) === "TransactionConflictError") continue;
        throw error;
      }
    }
  }
}

// ---- reading a release as types -------------------------------------------------------------------------------------

export function snapshotFor(store: Store, ref: "live" | "test"): Snapshot | undefined {
  return InMemoryConfigStore.resolveRef(store, ref);
}

export function valueTypeOf(t: { _tag: string; prim?: string; values?: string[]; kind?: string; item?: unknown }): { valueType: string; enumValues?: string[]; refTarget?: string; many?: boolean } {
  if (t._tag === "List") return { ...valueTypeOf(t.item as never), many: true };
  if (t._tag === "Prim") return { valueType: t.prim! };
  if (t._tag === "Enum") return { valueType: "enumOf", enumValues: t.values! };
  if (t._tag === "Ref") return { valueType: "ref", refTarget: t.kind! };
  return { valueType: t._tag };
}

export async function compile(snapshot: Snapshot) {
  return Effect.runPromise(Descriptors.compile(snapshot));
}

export function constraintStatus(rule: { _tag: string; targetEntityType?: string }, consoleTypes: ReadonlySet<string>) {
  if (rule._tag === "Unique") return "Not enforced on this engine (needs an index by type, attribute and value, gap G4)";
  if (rule._tag === "ReferenceTarget")
    return rule.targetEntityType === "Subject" || !consoleTypes.has(rule.targetEntityType ?? "")
      ? "Not checked: loader-built subjects carry no entity type"
      : "Checked before each write: the target must hold current facts of that type";
  return "Checked before each write";
}

export const configTypeNames = configEntityTypes;
