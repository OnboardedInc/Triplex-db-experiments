// [DX-CON1] The five configuration tools: list_entity_types, describe_entity_type, define_entity_type, list_releases,
// move_live. Each reads Triplex's own records through config.ts (no scan) and answers in Triplex's terms: a type is
// config nodes in an immutable, content-addressed release; `test` and `live` are refs; rollback moves a ref.
// Why: the console says "Commit release" and "Move live" (ConfigStore.commit and setRef), never "Publish", which in
// this project means release activation. Rejected: storing types anywhere but Triplex's own configuration records.
import { Attribute, type ConfigNode, EntityType, InMemoryConfigStore } from "@triplex-build/triplex/config";
import { Effect } from "effect";
import { compile, Config, constraintStatus, snapshotFor, SubjectType, valueTypeOf } from "./config.ts";
import { DemoError } from "./errors.ts";
import type { Demo } from "./store.ts";

type Store = InMemoryConfigStore.InMemoryConfigStore;
type Snapshot = InMemoryConfigStore.ConfigSnapshot;

const configs = new WeakMap<Demo, Config>();
export function configOf(demo: Demo) {
  let c = configs.get(demo);
  if (!c) {
    c = new Config(demo.writer, demo.scope, demo.db);
    configs.set(demo, c);
  }
  return c;
}

export const LOADER_PREFIXES = new Set(["pl", "wk", "i9", "sec", "doc", "page", "directory"]);
export const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const reservedAttribute = /^:(_|subject\/|tenant\/|triplex|f\/|db\/|console\/)/;
const attributeKey = /^:[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/;
export const VALUE_TYPES = ["text", "number", "integer", "int64", "boolean", "date", "instant", "enumOf", "ref"] as const;
export type ValueType = (typeof VALUE_TYPES)[number];
export type AttributeInput = {
  key: string;
  valueType: ValueType;
  required?: boolean | undefined;
  cardinality?: "one" | "many" | undefined;
  unique?: boolean | undefined;
  refTarget?: string | undefined;
  enumValues?: string[] | undefined;
};

const releaseOf = (s: Snapshot | undefined) => (s ? { id: s.id, label: s.label, sequence: s.seq, parent: s.parentId } : null);
const topObjects = (s: Snapshot | undefined) => (s ? s.root.children.map((c) => c.node) : []);
const typeNamesOf = (s: Snapshot | undefined) =>
  new Set(topObjects(s).filter((n) => n.kind === "entity-schema").map((n) => n.key));

async function describeTypes(store: Store, s: Snapshot) {
  const compiled = await compile(s);
  const consoleTypes = new Set([...typeNamesOf(s)].filter((n) => n !== "Subject"));
  return compiled.entities
    .map((e) => {
      const attributes = e.attributes.map((a) => {
        const v = valueTypeOf(a.type as never);
        return {
          key: a.key,
          valueType: v.valueType,
          required: a.required,
          cardinality: a.cardinality,
          unique: a.unique,
          ...(v.refTarget ? { refTarget: v.refTarget } : {}),
          ...(v.enumValues ? { enumValues: v.enumValues } : {}),
          storedAs: a.storage,
        };
      });
      const constraints = compiled.constraints
        .filter((r) => r.entityType === e.entityType)
        .map((r) => ({
          id: `${r.entityType}:${r.attribute}:${r._tag === "Required" ? "required" : r._tag === "Cardinality" ? "cardinality-" + r.max : r._tag === "Unique" ? "unique" : "reference-target-" + r.targetEntityType}`,
          kind: r._tag,
          attribute: r.attribute,
          status: constraintStatus(r, consoleTypes),
        }));
      const revisions = InMemoryConfigStore.historyOf(store, { kind: "entity-schema", key: e.entityType }).map((rev) => ({
        sequence: rev.seq,
        revision: rev.id,
        release: store.snapshots.find((x) => x.revisionIds.includes(rev.id))?.label ?? null,
        change: rev.parentId ? "changed" : "added",
      }));
      return { name: e.entityType, attributes, constraints, revisions };
    })
    .sort((a, b) => (a.name === "Subject" ? -1 : b.name === "Subject" ? 1 : a.name.localeCompare(b.name)));
}

const subjectNote =
  "Loader-built facts carry no entity type, so membership of Subject cannot be checked; it exists so a type can hold a reference to a real subject. The console does not create entities of type Subject.";

/** Per type, how many entities the console created (filled in by entities.ts once it exists). */
export let createdCounts: (demo: Demo, types: string[]) => Promise<Record<string, Record<string, number>>> = async () => ({});
export const setCreatedCounts = (f: typeof createdCounts) => {
  createdCounts = f;
};

export function listEntityTypes(demo: Demo, ref: "live" | "test" = "live") {
  return demo.measure(async (): Promise<Record<string, unknown> & { position: number }> => {
    const config = configOf(demo);
    const { store, discovery } = await config.load();
    const s = snapshotFor(store, ref);
    const types = s ? await describeTypes(store, s) : [];
    const counts = await createdCounts(demo, types.map((t) => t.name).filter((t) => t !== "Subject"));
    const { position } = await demo.head();
    return {
      ref,
      release: releaseOf(s),
      refs: { test: releaseOf(snapshotFor(store, "test")), live: releaseOf(snapshotFor(store, "live")) },
      types: types.map((t) => ({
        name: t.name,
        attributes: t.attributes.length,
        created: t.name === "Subject" ? null : Object.values(counts[t.name] ?? {}).reduce((n, x) => n + x, 0),
        createdByAccount: t.name === "Subject" ? null : (counts[t.name] ?? {}),
        ...(t.name === "Subject" ? { note: subjectNote } : {}),
      })),
      ...(s ? {} : { note: `No release on ${ref} yet. Define the first entity type.` }),
      configurationReads: discovery.reads,
      position,
    };
  });
}

export function describeEntityType(demo: Demo, name: string, ref: "live" | "test" = "live") {
  return demo.measure(async (): Promise<Record<string, unknown> & { position: number }> => {
    const { store } = await configOf(demo).load();
    const s = snapshotFor(store, ref);
    if (!s) throw new DemoError("NoRelease", `No release on ${ref} yet`);
    const t = (await describeTypes(store, s)).find((x) => x.name === name);
    if (!t) throw new DemoError("UnknownType", `${name} is not an entity type in release ${s.label} (${ref}). Types: ${[...typeNamesOf(s)].join(", ")}`);
    const { position } = await demo.head();
    return {
      ref, release: releaseOf(s), type: t,
      ...(name === "Subject" ? { note: subjectNote } : {}),
      uniqueness: "Uniqueness is declared in Triplex but not enforced on this engine: it needs an index by type, attribute and value (gap G4).",
      position,
    };
  });
}

function definition(a: AttributeInput): Attribute.AnyDefinition {
  switch (a.valueType) {
    case "text": return Attribute.text(a.key);
    case "number": return Attribute.number(a.key);
    case "integer": return Attribute.integer(a.key);
    case "int64": return Attribute.int64(a.key);
    case "boolean": return Attribute.boolean(a.key);
    case "date": return Attribute.date(a.key);
    case "instant": return Attribute.instant(a.key);
    case "enumOf":
      if (!a.enumValues?.length || a.enumValues.length > 64 || a.enumValues.some((v) => !v || v.length > 100))
        throw new DemoError("InvalidInput", `${a.key}: an enum needs 1 to 64 values of 1 to 100 characters`);
      return Attribute.enumOf(a.key, a.enumValues);
    case "ref":
      if (!a.refTarget) throw new DemoError("InvalidInput", `${a.key}: a reference needs refTarget, the entity type it points to`);
      return Attribute.ref(a.key, { entityType: a.refTarget });
  }
}

/** Key-order-independent JSON, so a stored value type compares equal to the same type built here. */
const canon = (v: unknown): string =>
  Array.isArray(v) ? "[" + v.map(canon).join(",") + "]"
  : v && typeof v === "object" ? "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canon((v as Record<string, unknown>)[k])).join(",") + "}"
  : JSON.stringify(v);

export function defineEntityType(
  demo: Demo,
  input: { name: string; attributes: AttributeInput[]; label?: string | undefined; moveLive?: boolean | undefined },
) {
  demo.requireWorkingCopy();
  return demo.measure(async (): Promise<Record<string, unknown> & { position: number }> => {
    const { name } = input;
    if (!/^[A-Z][A-Za-z0-9]*$/.test(name) || name.length > 64) throw new DemoError("InvalidInput", "An entity type name is PascalCase, such as Review or VehicleCheck");
    if (name === "Subject") throw new DemoError("Reserved", "Subject is the starter type; its definition follows the loader's data");
    if (LOADER_PREFIXES.has(kebab(name))) throw new DemoError("Reserved", `${name} would number its entities like the loader's ${kebab(name)} entities`);
    if (!input.attributes.length || input.attributes.length > 40) throw new DemoError("InvalidInput", "A type has 1 to 40 attributes");
    const config = configOf(demo);
    const { store } = await config.load();
    const base = store.snapshots[store.snapshots.length - 1];
    const live = snapshotFor(store, "live");
    const existing = topObjects(base);
    const known = new Set([...typeNamesOf(base), name]);
    const keys = new Set<string>();
    const uses: Record<string, Attribute.Use<Attribute.AnyDefinition, boolean, "one" | "many">> = {};
    for (const a of input.attributes) {
      if (!attributeKey.test(a.key)) throw new DemoError("InvalidInput", `${a.key}: an attribute key is a lowercase keyword such as :review/outcome`);
      if (reservedAttribute.test(a.key)) throw new DemoError("Reserved", `${a.key}: attributes beginning :_, :subject/, :tenant/, :triplex, :f/, :db/ or :console/ are reserved`);
      if (keys.has(a.key)) throw new DemoError("InvalidInput", `${a.key} appears twice`);
      keys.add(a.key);
      if (a.valueType === "ref" && !known.has(a.refTarget ?? "")) throw new DemoError("UnknownType", `${a.key}: refTarget ${a.refTarget} is not a type in the release (${[...known].join(", ")})`);
      const def = definition(a);
      const prior = existing.find((n) => n.kind === Attribute.KIND && n.key === a.key);
      if (prior && canon((prior.attrs as { valueType: unknown }).valueType) !== canon(def.type))
        throw new DemoError("AttributeTypeFixed", `${a.key} already exists with another value type; in Triplex the attribute owns its type. Add a new attribute key.`);
      const alias = "a" + keys.size + "_" + a.key.slice(1).replace(/[^a-z0-9]+/g, "_");
      uses[alias] = Attribute.use(def, { required: a.required ?? false, cardinality: a.cardinality ?? "one", unique: a.unique ?? false }) as never;
    }
    const type = EntityType.make(name, { attributes: uses });
    const nodes = await Effect.runPromise(type.nodes);
    const subject = existing.some((n) => n.kind === "entity-schema" && n.key === "Subject") ? [] : await Effect.runPromise(SubjectType.nodes);
    const slot = (n: ConfigNode.ConfigNode) => n.kind + "\u0000" + n.key;
    const replacing = new Set([...nodes, ...subject].map(slot));
    const objects = [...existing.filter((n) => !replacing.has(slot(n))), ...subject, ...nodes];
    const label = input.label?.trim() || `${kebab(name)}-${(base?.seq ?? 0) + 1}`;
    if (label.length > 80) throw new DemoError("InvalidInput", "A release label has at most 80 characters");
    const committed = await config.commit(label, objects);
    const after = committed.store;
    const changes = base ? InMemoryConfigStore.changesBetween(after, base, committed.snapshot) : [];
    const objectsSummary = base
      ? {
          added: changes.filter((c) => c._tag === "ObjectAdded").map((c) => `${c.kind} ${c.key}`),
          changed: changes.filter((c) => c._tag === "ObjectChanged").map((c) => `${c.kind} ${c.key}`),
          removed: changes.filter((c) => c._tag === "ObjectRemoved").map((c) => `${c.kind} ${c.key}`),
          unchanged: objects.length - changes.filter((c) => c._tag !== "ObjectRemoved").length,
        }
      : { added: objects.map((n) => `${n.kind} ${n.key}`), changed: [], removed: [], unchanged: 0 };
    const receipt = { txId: committed.transaction.txId, position: committed.transaction.position, recordedAt: new Date(committed.transaction.instant).toISOString(), actor: "triplex/config-store" };
    let liveReceipt: Awaited<ReturnType<Config["moveLive"]>>["receipt"] | null = null;
    if (input.moveLive !== false) liveReceipt = (await config.moveLive(committed.snapshot.id)).receipt;
    const { store: now } = await config.load();
    return {
      type: name,
      release: releaseOf(committed.snapshot),
      basedOn: releaseOf(base),
      objects: objectsSummary,
      refs: { test: releaseOf(snapshotFor(now, "test")), live: releaseOf(snapshotFor(now, "live")), liveBefore: releaseOf(live) },
      receipt,
      liveReceipt,
      note: "One transaction recorded the release and moved test. " + (liveReceipt ? "A second moved live to it." : "live did not move."),
      position: liveReceipt?.position ?? receipt.position,
    };
  });
}

export function listReleases(demo: Demo, limit = 20, compare?: [string, string]) {
  return demo.measure(async (): Promise<Record<string, unknown> & { position: number }> => {
    const { store } = await configOf(demo).load();
    const refsOf = (id: string) => ["test", "live"].filter((r) => store.refs.get(r) === id);
    const releases = [...store.snapshots].reverse().slice(0, limit).map((s) => ({
      id: s.id, label: s.label, sequence: s.seq, parent: s.parentId, objects: s.root.children.length,
      types: [...typeNamesOf(s)], refs: refsOf(s.id),
    }));
    let difference: unknown;
    if (compare) {
      const [a, b] = compare.map((id) => InMemoryConfigStore.snapshotById(store, id));
      if (!a || !b) throw new DemoError("UnknownRelease", "Give two release IDs from this list");
      difference = InMemoryConfigStore.changesBetween(store, a, b).map((c) => ({
        change: c._tag === "ObjectAdded" ? "added" : c._tag === "ObjectRemoved" ? "removed" : "changed", kind: c.kind, key: c.key,
      }));
    }
    const { position } = await demo.head();
    return {
      refs: { test: releaseOf(snapshotFor(store, "test")), live: releaseOf(snapshotFor(store, "live")) },
      releases, total: store.snapshots.length,
      ...(compare ? { compared: compare, difference } : {}),
      position,
    };
  });
}

export function moveLive(demo: Demo, snapshotId: string) {
  demo.requireWorkingCopy();
  return demo.measure(async (): Promise<Record<string, unknown> & { position: number }> => {
    const config = configOf(demo);
    const { store } = await config.load();
    const target = InMemoryConfigStore.snapshotById(store, snapshotId);
    if (!target) throw new DemoError("UnknownRelease", `No release ${snapshotId}. See list_releases.`);
    const before = snapshotFor(store, "live");
    if (before?.id === target.id) throw new DemoError("AlreadyLive", `live already points to ${target.label}`);
    const { receipt } = await config.moveLive(target.id);
    return {
      receipt,
      before: releaseOf(before),
      after: releaseOf(target),
      typesBefore: [...typeNamesOf(before)],
      typesAfter: [...typeNamesOf(target)],
      note: "No fact and no earlier receipt changed. Moving live changes the release that new writes are pinned to.",
      position: receipt.position,
    };
  });
}

