// [DX-CON1] Entities of the types a visitor defines: numbered within their type and account, created from the type's
// descriptor, listed by number, read with both intervals (DESIGN.md 5.4 to 5.6).
//   Entity ID   acct/<account>/<type in kebab case>:<8 digits>
//   Counter     acct/<account>/console/type/<Type>, one fact :console/next (exact integer)
//   Create      one transaction: the entity's facts with entityType set, and the counter replaced; the counter's and the
//               new entity's observed states are preconditions, so two creates cannot take one number (the loser
//               retries, at most three times); configSnapshot pins the release live points to.
// Why: this engine has no index from entity type to entities (G2); Triples.entityPage would scan. A page then costs one
// counter read and one read of the page's IDs at any size. Rejected: meta.enforce (it scans every entity of each
// constrained type, F4); value type, required and cardinality are checked before the write with Triplex's own
// EntityCodec.decodeInput instead, and uniqueness is stated as not enforced (G4).
import { randomUUID } from "node:crypto";
import { EntityId, TripleId, type TransactOp } from "@triplex-build/triplex";
import { EntityCodec, type Descriptors } from "@triplex-build/triplex/entity";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { Effect } from "effect";
import { compile, snapshotFor, tagOf } from "./config.ts";
import { DemoError } from "./errors.ts";
import { configOf, kebab, setCreatedCounts } from "./releases.ts";
import { currentActor, type Demo } from "./store.ts";

export type Basis = { validAt?: string | number | undefined; recordedAt?: string | number | undefined; position?: number | undefined };
const pad8 = (n: number) => String(n).padStart(8, "0");
const iso = (ms: number | null | undefined) => (ms === null || ms === undefined || !Number.isFinite(ms) ? null : new Date(ms).toISOString());
const instant = (v: string | number, name: string) => {
  const ms = typeof v === "number" ? v : /^\d+$/.test(v) ? Number(v) : Date.parse(v);
  if (!Number.isFinite(ms) || ms < 0) throw new DemoError("InvalidInput", `${name} must be an ISO date or epoch milliseconds`);
  return ms;
};

/** A basis resolved to what the gateway takes: an exact position (head when none given) or a record time, and a valid time. */
export async function resolveBasis(demo: Demo, basis: Basis = {}) {
  if (basis.position !== undefined && basis.recordedAt !== undefined) throw new DemoError("InvalidInput", "Give recordedAt or position, not both");
  const validAt = basis.validAt === undefined ? Date.now() : instant(basis.validAt, "validAt");
  if (basis.recordedAt !== undefined) {
    const recordedAt = instant(basis.recordedAt, "recordedAt");
    return { wire: { recordedAt, validAt }, words: `recorded at ${iso(recordedAt)}, valid ${basis.validAt === undefined ? "now" : iso(validAt)}`, latest: false, position: undefined as number | undefined };
  }
  const head = (await demo.head()).position;
  const position = basis.position ?? head;
  if (position > head) throw new DemoError("InvalidInput", `Position ${position} is after the head ${head}`);
  return { wire: { recordedPosition: position, validAt }, words: `${basis.position === undefined ? "recorded latest" : `recorded at position ${position}`}, valid ${basis.validAt === undefined ? "now" : iso(validAt)}`, latest: basis.position === undefined || position === head, position };
}

export function rowValue(r: TripleRow): unknown {
  switch (r.value_type) {
    case "string": case "ref": return r.value_string;
    case "integer": return r.value_string ?? (r.value_number === null ? null : String(r.value_number));
    case "number": return r.value_number;
    case "boolean": return r.value_boolean === null ? null : r.value_boolean === 1;
    case "datetime": return r.value_datetime === null ? null : iso(r.value_datetime);
    case "json": return r.value_json === null ? null : JSON.parse(r.value_json);
    default: return r.value_string ?? r.value_number ?? r.value_json;
  }
}
export const factOf = (r: TripleRow) => ({
  entity: r.entity_id, attribute: r.attribute, value: rowValue(r), type: r.value_type,
  validFrom: iso(r.valid_from), validTo: iso(r.valid_to), recordedAt: iso(r.recorded_at), position: r.recorded_position,
  ...(r.retracted_at !== null ? { retractedAt: iso(r.retracted_at), retractedPosition: r.retracted_position } : {}),
  entityType: r.entity_type, id: r.id, txId: r.tx_id,
});

// ---- entity IDs ---------------------------------------------------------------------------------------------------

export const counterId = (account: string, type: string) => `acct/${account}/console/type/${type}`;
export const entityIdFor = (account: string, type: string, n: number) => `acct/${account}/${kebab(type)}:${pad8(n)}`;
export function parseEntity(entity: string) {
  const m = /^acct\/(account-\d{3})\/([a-z0-9-]+):(\d{8})$/.exec(entity);
  return m ? { account: m[1]!, prefix: m[2]!, number: Number(m[3]) } : undefined;
}
const reservedEntity = (e: string) => e.startsWith("_triplex/") || /\/console\//.test(e) || e.startsWith("_tx/");

async function liveType(demo: Demo, typeName: string) {
  const { store } = await configOf(demo).load();
  const live = snapshotFor(store, "live");
  if (!live) throw new DemoError("NoRelease", "No release on live yet. Define an entity type first.");
  const compiled = await compile(live);
  const descriptor = compiled.entities.find((e) => e.entityType === typeName);
  if (!descriptor) throw new DemoError("UnknownType", `${typeName} is not an entity type in the live release ${live.label} (${compiled.entities.map((e) => e.entityType).join(", ")})`);
  if (typeName === "Subject") throw new DemoError("Reserved", "The console does not create entities of type Subject; loader-built subjects are found by account and number");
  return { live, descriptor, store };
}

async function counter(demo: Demo, account: string, type: string) {
  const id = counterId(account, type);
  const rows = await demo.writer.rows(demo.db, { entityIds: [id] });
  const live = rows.filter((r) => r.attribute === ":console/next");
  const next = live.length ? Number(rowValue(live[0]!)) : 0;
  return { id, rows, next };
}

/** Entities created per type and account: one request for the counters of every type in every account. */
export async function createdCounts(demo: Demo, types: string[]) {
  if (!types.length) return {};
  const accounts = demo.connection.roster.map((r) => r.account);
  const ids = types.flatMap((t) => accounts.map((a) => counterId(a, t)));
  const rows = await demo.reader.rows(demo.db, { entityIds: ids, basis: { recordedPosition: (await demo.head()).position, validAt: Date.now() } });
  const out: Record<string, Record<string, number>> = {};
  for (const t of types) {
    out[t] = {};
    for (const a of accounts) {
      const r = rows.find((x) => x.entity_id === counterId(a, t) && x.attribute === ":console/next");
      if (r) out[t]![a] = Number(rowValue(r));
    }
  }
  return out;
}
setCreatedCounts(createdCounts);

// ---- typed values ---------------------------------------------------------------------------------------------------

type Raw = string | number | boolean | null;
/** Values as a visitor writes them, keyed by attribute, through Triplex's own input decoder for the type. */
async function decode(descriptor: Descriptors.EntityDescriptor, attributes: Record<string, Raw | Raw[]>) {
  const unknown = Object.keys(attributes).filter((k) => !descriptor.attributes.some((a) => a.key === k));
  if (unknown.length) throw new DemoError("InvalidInput", `${descriptor.entityType} has no attribute ${unknown.join(", ")}`);
  for (const [k, v] of Object.entries(attributes)) {
    const list = Array.isArray(v) ? v : [v];
    if (list.length > 64) throw new DemoError("InvalidInput", `${k}: at most 64 values`);
    for (const x of list) if (typeof x === "string" && x.length > 500) throw new DemoError("InvalidInput", `${k}: text values have at most 500 characters`);
  }
  // The decoder takes int64 values in Triplex's tagged form; the console takes digits and tags them.
  const body: Record<string, unknown> = {};
  for (const a of descriptor.attributes) {
    if (!(a.key in attributes)) continue;
    const v = attributes[a.key];
    const tag = (x: Raw) => ((a.type as { prim?: string }).prim === "int64" || (a.type as { item?: { prim?: string } }).item?.prim === "int64") && (typeof x === "string" || typeof x === "number") ? { type: "integer", value: String(x) } : x;
    body[a.key] = Array.isArray(v) ? v.map(tag) : tag(v as Raw);
  }
  const decoded = await Effect.runPromise(
    EntityCodec.decodeInput(descriptor, { attributes: body }).pipe(Effect.mapError((e) => new DemoError("InvalidInput", (e as { message?: string }).message ?? String(e)))),
  ).catch((e: unknown) => {
    throw e instanceof DemoError ? e : new DemoError("InvalidInput", String((e as { message?: string }).message ?? e));
  });
  return decoded;
}

async function checkReferences(demo: Demo, _descriptor: Descriptors.EntityDescriptor, values: ReadonlyMap<Descriptors.AttributeDescriptor, readonly { type: string; value: unknown }[]>) {
  const targets: { attribute: string; entity: string; type: string }[] = [];
  for (const [a, list] of values)
    for (const v of list)
      if (v.type === "ref") targets.push({ attribute: a.key, entity: String(v.value), type: (a.type as { kind?: string; item?: { kind?: string } }).kind ?? (a.type as { item?: { kind?: string } }).item?.kind ?? "" });
  if (!targets.length) return [];
  for (const t of targets) if (reservedEntity(t.entity)) throw new DemoError("Reserved", `${t.attribute}: ${t.entity} is a reserved entity`);
  const rows = await demo.writer.rows(demo.db, { entityIds: [...new Set(targets.map((t) => t.entity))] });
  return targets.map((t) => {
    const own = rows.filter((r) => r.entity_id === t.entity);
    if (!own.length) throw new DemoError("UnknownReference", `${t.attribute}: ${t.entity} has no current facts`);
    if (t.type !== "Subject" && !own.some((r) => r.entity_type === t.type))
      throw new DemoError("ReferenceTargetMismatch", `${t.attribute}: ${t.entity} is not a current ${t.type}`);
    return { ...t, checked: t.type === "Subject" ? "exists (membership of Subject cannot be checked: loader-built facts carry no entity type)" : `holds current ${t.type} facts` };
  });
}

// ---- the tools -----------------------------------------------------------------------------------------------------

export function createEntity(demo: Demo, input: { type: string; account: string | number; attributes: Record<string, Raw | Raw[]>; validFrom?: string | number | undefined; commandId?: string | undefined }) {
  demo.requireWorkingCopy();
  return demo.measure(async (): Promise<Record<string, unknown> & { position: number }> => {
    const account = demo.account(input.account).account;
    if (Object.keys(input.attributes).length > 20) throw new DemoError("InvalidInput", "At most 20 attributes per save");
    const { live, descriptor } = await liveType(demo, input.type);
    const values = await decode(descriptor, input.attributes);
    const references = await checkReferences(demo, descriptor, values as never);
    const validFrom = input.validFrom === undefined ? Date.now() : instant(input.validFrom, "validFrom");
    const commandId = input.commandId ?? `console:create:${randomUUID()}`;
    // One process never races itself for a number: creates of one type in one account queue here. Another process's
    // create is caught by the counter precondition and retried (at most three times).
    const key = counterId(account, input.type);
    const previous = queues.get(key) ?? Promise.resolve();
    let release!: () => void;
    const mine = new Promise<void>((ok) => (release = ok));
    const tail = previous.then(() => mine);
    queues.set(key, tail);
    await previous;
    try {
      return await attemptCreate();
    } finally {
      release();
      if (queues.get(key) === tail) queues.delete(key);
    }
    async function attemptCreate(): Promise<Record<string, unknown> & { position: number }> {
    let attempt = 0;
    for (;;) {
      attempt++;
      const c = await counter(demo, account, input.type);
      const number = c.next;
      const entity = entityIdFor(account, input.type, number);
      const ops: TransactOp[] = [];
      for (const [a, list] of values)
        for (const value of list)
          ops.push({ op: "assert", entityId: EntityId.make(entity), entityType: input.type, attribute: a.key, value: value as never, validFrom });
      for (const r of c.rows.filter((x) => x.attribute === ":console/next")) ops.push({ op: "retract", id: TripleId.make(r.id) });
      ops.push({ op: "assert", entityId: EntityId.make(c.id), attribute: ":console/next", value: { type: "integer", value: String(number + 1) } as never });
      try {
        const result = await demo.transact(ops, {
          commandId, actor: currentActor(), configSnapshot: live.id,
          preconditions: [
            { _tag: "EntityState", entityId: EntityId.make(c.id), tripleIds: c.rows.map((r) => TripleId.make(r.id)) },
            { _tag: "EntityState", entityId: EntityId.make(entity), tripleIds: [] },
          ],
        });
        const readRows = await demo.reader.rows(demo.db, { entityIds: [entity], basis: { recordedPosition: result.position, validAt: Math.max(validFrom, Date.now()) + 1 }, basisWaitMs: 2000 });
        const written = ops.filter((o): o is Extract<TransactOp, { op: "assert" }> => o.op === "assert" && o.entityId === entity).map((o) => `${o.attribute}=${JSON.stringify(o.value.value)}`).sort();
        const back = readRows.map((r) => `${r.attribute}=${JSON.stringify(r.value_type === "integer" ? rowValue(r) : r.value_type === "datetime" ? r.value_datetime : rowValue(r))}`).sort();
        return {
          type: input.type, account, entity, number,
          release: { id: live.id, label: live.label },
          facts: readRows.map(factOf),
          references,
          receipt: { commandId, txId: result.txId, position: result.position, recordedAt: iso(result.instant), actor: currentActor(), attempts: attempt },
          readbackMatches: JSON.stringify(written) === JSON.stringify(back) && readRows.every((r) => r.entity_type === input.type),
          uniqueness: "not checked on this engine (gap G4)",
          position: result.position,
        };
      } catch (error) {
        const tag = tagOf(error);
        if (tag === "TransactionConflictError" && attempt < 3) continue;
        if (tag === "CommandAlreadyCommittedError") throw new DemoError("CommandAlreadyCommitted", `Command ${commandId} was already committed: ${String((error as { message?: string }).message ?? "")}`);
        if (tag === "TransactionConflictError") throw new DemoError("Conflict", "Another change reached this counter first three times. Try again.");
        throw error;
      }
    }
    }
  });
}
const queues = new Map<string, Promise<void>>();

export function listEntities(demo: Demo, input: { type: string; account: string | number; from?: number | undefined; count?: number | undefined; basis?: Basis | undefined }) {
  return demo.measure(async () => {
    const account = demo.account(input.account).account;
    const { descriptor } = await liveType(demo, input.type);
    const c = await counter(demo, account, input.type);
    const from = Math.max(0, input.from ?? 0);
    const count = Math.min(50, Math.max(1, input.count ?? 20));
    const ids: string[] = [];
    for (let n = from; n < Math.min(c.next, from + count); n++) ids.push(entityIdFor(account, input.type, n));
    const b = await resolveBasis(demo, input.basis);
    const rows = ids.length ? await demo.reader.rows(demo.db, { entityIds: ids, basis: b.wire, basisWaitMs: 2000 }) : [];
    return {
      type: input.type, account, created: c.next,
      columns: descriptor.attributes.map((a) => a.key),
      entities: ids.map((entity, i) => {
        const own = rows.filter((r) => r.entity_id === entity);
        const attributes: Record<string, unknown[]> = {};
        for (const r of own) (attributes[r.attribute] ??= []).push(rowValue(r));
        return { number: from + i, entity, attributes, recordedAt: iso(Math.max(0, ...own.map((r) => r.recorded_at))) || null, present: own.length > 0 };
      }),
      page: { from, count: ids.length, of: c.next },
      basis: b.words,
      note: "Listed by entity number. This engine has no index by entity type (gap G2).",
      position: b.position ?? (await demo.head()).position,
    };
  });
}

export function readEntity(demo: Demo, input: { entity: string; basis?: Basis | undefined; asSubject?: boolean | undefined; history?: boolean | undefined }) {
  return demo.measure(async () => {
    const entity = input.entity.trim();
    if (!entity || entity.length > 300) throw new DemoError("InvalidInput", "Give an entity ID");
    const b = await resolveBasis(demo, input.basis);
    const rows = await demo.reader.rows(demo.db, { entityIds: [entity], basis: b.wire, basisWaitMs: 2000 });
    const type = rows.find((r) => r.entity_type)?.entity_type ?? null;
    const parsed = parseEntity(entity);
    let reach: unknown;
    if (input.asSubject) {
      const world = await demo.reader.readDemandWorld(demo.scope, entity, b.wire);
      if (!world) throw new DemoError("ReadDeclined", "The read gateway declined this subject read; try again");
      reach = {
        root: entity, entities: world.entities, factCount: world.triples.length,
        facts: world.triples.map((t) => ({
          entity: t.entityId, attribute: t.attribute, value: typeof t.value.value === "bigint" ? String(t.value.value) : t.value.value, type: t.value.type,
          validFrom: iso(t.validFrom), validTo: t.validTo._tag === "Some" ? iso(t.validTo.value) : null, recordedAt: iso(t.recordedAt), id: t.id,
        })),
      };
    }
    return {
      entity,
      entityType: type ?? "untyped",
      ...(type ? {} : { kindFromId: parsed?.prefix ?? null, note: "Loader-built facts carry no entity type; the kind is read from the entity ID." }),
      account: parsed?.account ?? null,
      number: parsed?.number ?? null,
      factCount: rows.length,
      facts: rows.map(factOf).sort((x, y) => x.attribute.localeCompare(y.attribute)),
      ...(input.asSubject ? { subject: reach } : {}),
      basis: b.words,
      position: b.position ?? (await demo.head()).position,
    };
  });
}

/**
 * Typed values for a change to one entity (save_facts, correct_past_value with entity): when the entity holds facts of
 * a type in the live release, its values are decoded by that type's descriptor (only the attributes given, none
 * required) and the write pins the live release; otherwise undefined, and the change is text on an untyped entity.
 */
export async function typingFor(demo: Demo, entity: string, changes: Record<string, Raw | Raw[]>): Promise<{ values: Map<string, readonly { type: string; value: unknown }[]>; configSnapshot: string; entityType: string } | undefined> {
  const rows = await demo.writer.rows(demo.db, { entityIds: [entity] });
  const entityType = rows.find((r) => r.entity_type)?.entity_type;
  if (!entityType || entityType.startsWith("triplex.")) return undefined;
  const { live, descriptor } = await liveType(demo, entityType);
  if (!Object.keys(changes).length) return { values: new Map(), configSnapshot: live.id, entityType };
  const partial = { ...descriptor, attributes: descriptor.attributes.filter((a) => a.key in changes).map((a) => ({ ...a, required: false })) };
  const decoded = await decode(partial, changes);
  await checkReferences(demo, partial, decoded as never);
  const values = new Map<string, readonly { type: string; value: unknown }[]>();
  for (const [a, list] of decoded) values.set(a.key, list as never);
  return { values, configSnapshot: live.id, entityType };
}

