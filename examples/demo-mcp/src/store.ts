// [DX-DEMO1] The local functions behind every MCP tool and the inspector page. Each one talks to the remote gateways
// through the SSH forwards that demo/connect.sh opened, and returns its answer with the time the gateway itself took,
// the round trip from this machine, and the database position it read or wrote at.
// Why: one implementation for the assistant, the inspector page and the scripted proof, so all three show the same numbers.
// Rejected: a second HTTP API (the gateways are the API) and the playground service (bound to its own fixture and stack).
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { EntityId, TripleId, Triples, type TransactOp, type Triple } from "@triplex-build/triplex";
import {
  Capabilities,
  DatabaseScope,
  QueryExecutor,
  Runtime,
  StorageAdapter,
} from "@triplex-build/triplex/runtime";
import {
  DatomicClient,
  makeDatomicQueryExecutor,
  makeDatomicStorageAdapter,
  acceptLoaderPositionRows,
  traceScheduler,
  type DatomicRequestSample,
} from "@triplex-build/triplex-datomic";
import { Effect, Layer, ManagedRuntime, Scheduler } from "effect";

export const stateFile = () =>
  process.env["TRIPLEX_DEMO_STATE"] ?? join(homedir(), ".triplex-demo", "connection.json");

export type Connection = {
  version: "triplex-demo-connection/1";
  kind: "1b" | "toy";
  database: string;
  scope: string;
  writeUrl: string;
  readUrl: string;
  workingCopy: boolean;
  recordsAtBringUp: number;
  headAtBringUp: number;
  physicalTAtBringUp: number;
  sealed: { head: number; physicalT: number; records: number };
  roster: { account: string; namespace: string; firstPerson: number; people: number }[];
  clocks: Record<string, unknown> | null;
  /** Latest record time a fresh peer read at bring-up (the database's own record clock). */
  lastRecordedAtBringUp?: number | null;
  /** The database was aged by AGE1's loader, which wrote journal position rows in the test fixture's form. */
  loaderPositionRows?: boolean;
  /** The server's launch settings (demo/server/profile.mjs --summary) and when its working copy was made. */
  memory?: Record<string, unknown> | null;
  workingCopyMadeAt?: string | null;
  readyAt?: string | null;
  connectedAt: string;
};

export function loadConnection(file = stateFile()): Connection {
  const c = JSON.parse(readFileSync(file, "utf8")) as Connection;
  if (c.version !== "triplex-demo-connection/1" || !/^s2-[A-Za-z0-9_-]+$/.test(c.database))
    throw new Error(`Not a demo connection file: ${file}. Run demo/connect.sh first.`);
  if ("s2-" + Buffer.from(c.scope).toString("base64url") !== c.database)
    throw new Error("Connection file scope and database differ");
  return c;
}

export class DemoError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export type Timing = {
  /** Sum of the gateways' own handling time for every request this answer needed (x-tx2-gateway-micros). */
  serverMs: number | null;
  /** Wall time on this machine, including the SSH tunnel both ways. */
  roundTripMs: number;
  requests: number;
  calls: { route: string; status: number; serverMs: number | null; roundTripMs: number }[];
};
export type Answer<T> = T & { position: number; timing: Timing };

const samples = new AsyncLocalStorage<DatomicRequestSample[]>();
/**
 * [DX-CON1] Who is calling: "assistant" for the MCP server, "console" for the web app, "proof" for scripted checks.
 * Why: every change is one attributed transaction, and the actor must say which surface made it, without threading a
 * parameter through every function. Rejected: one fixed actor ("demo"), which the Journal could not tell apart.
 */
export type Actor = "assistant" | "console" | "proof" | "demo";
export const caller = new AsyncLocalStorage<{ actor: Actor }>();
export const currentActor = (): Actor => caller.getStore()?.actor ?? "demo";
const observe = (sample: DatomicRequestSample) => samples.getStore()?.push(sample);
const round = (n: number) => Math.round(n * 100) / 100;
const SEED_VALID_FROM = 1_700_000_000_000;

type Store = ManagedRuntime.ManagedRuntime<Triples, never>;
function store(client: DatomicClient, scope: DatabaseScope): Store {
  const definition = Runtime.define({
    name: "datomic",
    storage: Layer.succeed(
      StorageAdapter,
      makeDatomicStorageAdapter(client, scope, { layout: "lean", serverRecordTime: true }),
    ),
    queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(client, scope)),
  });
  return ManagedRuntime.make(definition.layer({ scope, capabilities: Capabilities.none })) as Store;
}

const compatibilityNote =
  "The bulk loader that built this database wrote one field of each save's journal (the position row) in a non-standard form; the demo reads it with a named compatibility rule (acceptLoaderPositionRows), off in the product's default reader.";
const pad8 = (n: number) => String(n).padStart(8, "0");
export type EntityKind = "root" | "profile" | "task";
export const entityKinds: readonly EntityKind[] = ["root", "profile", "task"];
const protectedAttribute = /^:(_|subject\/|tenant\/|triplex|f\/|db\/)/;
const attributePattern = /^:[a-z][a-z0-9-]*\/[a-z0-9-]+$/;

export function plainValue(v: { type: string; value: unknown }) {
  return typeof v.value === "bigint" ? String(v.value) : v.value;
}
const iso = (ms: number | null | undefined) =>
  ms === null || ms === undefined || !Number.isFinite(ms) ? null : new Date(ms).toISOString();

export function parseInstant(input: string | number, name: string): number {
  const ms = typeof input === "number" ? input : /^\d+$/.test(input) ? Number(input) : Date.parse(input);
  if (!Number.isFinite(ms) || ms < 0) throw new DemoError("InvalidInput", `${name} must be an ISO date or epoch milliseconds`);
  return ms;
}

export class Demo {
  readonly connection: Connection;
  readonly writer: DatomicClient;
  readonly reader: DatomicClient;
  readonly db: string;
  readonly scope: DatabaseScope;
  private readonly writeStore: Store;
  private readonly readStore: Store;

  constructor(connection = loadConnection()) {
    this.connection = connection;
    this.db = connection.database;
    // An explicit, named reader option, on only for a database built by the AGE1 bulk loader (see loaderPositionRows.ts).
    acceptLoaderPositionRows(connection.loaderPositionRows === true);
    const [tag, env, tenant, database, generation] = JSON.parse(connection.scope) as [string, string, string, string, number];
    if (tag !== "triplex-scope-v1") throw new Error("Unknown scope format");
    this.scope = DatabaseScope.make({ env, tenant, database, generation });
    this.writer = new DatomicClient(connection.writeUrl, 60_000);
    this.reader = new DatomicClient(connection.readUrl, 60_000);
    this.writer.onRequest = this.reader.onRequest = observe;
    this.writeStore = store(this.writer, this.scope);
    this.readStore = store(this.reader, this.scope);
  }

  close() {
    void this.writeStore.dispose();
    void this.readStore.dispose();
    this.writer.close();
    this.reader.close();
  }

  private run<A, E>(on: Store, effect: Effect.Effect<A, E, Triples>) {
    return on.runPromise(effect, { scheduler: traceScheduler(new Scheduler.MixedScheduler()) });
  }

  /** A plain transaction through the write gateway (used by the toy loader only). */
  transact(ops: TransactOp[], meta: { commandId: string; actor: string }) {
    return this.run(this.writeStore, Effect.flatMap(Triples, (s) => s.transact(ops, meta)));
  }

  /** Run one tool's work and attach its timing. */
  async measure<T extends object>(work: () => Promise<T & { position: number }>): Promise<Answer<T>> {
    const list: DatomicRequestSample[] = [];
    const start = performance.now();
    const value = await samples.run(list, work);
    const roundTripMs = performance.now() - start;
    const server = list.map((s) => (Number.isFinite(s.gatewayMicros) ? s.gatewayMicros / 1000 : null));
    const known = server.filter((x): x is number => x !== null);
    return {
      ...value,
      timing: {
        serverMs: known.length ? round(known.reduce((a, b) => a + b, 0)) : null,
        roundTripMs: round(roundTripMs),
        requests: list.length,
        calls: list.map((s, i) => ({
          route: s.path.replace(this.db, "{db}").replace(/\?.*$/, ""),
          status: s.status,
          serverMs: server[i] === null ? null : round(server[i]!),
          roundTripMs: round(s.finished - s.started),
        })),
      },
    };
  }

  // ---- identity helpers ----------------------------------------------------------------------------------------

  account(input: string | number) {
    const roster = this.connection.roster;
    const found =
      typeof input === "number" || /^\d+$/.test(input)
        ? roster[Number(input) - 1]
        : roster.find((r) => r.account === input);
    if (!found) throw new DemoError("UnknownAccount", `Choose one of ${roster.map((r) => r.account).join(", ")} (or 1 to ${roster.length})`);
    return found;
  }

  subjectIds(accountInput: string | number, subjectNumber: number) {
    const account = this.account(accountInput);
    if (!Number.isSafeInteger(subjectNumber) || subjectNumber < account.firstPerson || subjectNumber >= account.firstPerson + account.people)
      throw new DemoError("UnknownSubject", `${account.account} has subjects ${account.firstPerson} to ${account.firstPerson + account.people - 1}`);
    const ns = account.namespace;
    return {
      account: account.account,
      subjectNumber,
      root: `${ns}pl:${pad8(subjectNumber)}`,
      profile: `${ns}wk:${pad8(subjectNumber)}`,
      task: `${ns}i9:${pad8(subjectNumber)}`,
    };
  }

  entity(accountInput: string | number, subjectNumber: number, kind: EntityKind = "task") {
    const p = this.subjectIds(accountInput, subjectNumber);
    return { ...p, kind, entity: kind === "root" ? p.root : kind === "profile" ? p.profile : p.task };
  }

  async head() {
    const basis = await this.reader.basis(this.db);
    return { position: Number(basis.position.v), t: String(basis.t.v) };
  }

  private requireWorkingCopy() {
    if (!this.connection.workingCopy)
      throw new DemoError("NotAWorkingCopy", "This connection is not marked as a demo working copy; changes are refused");
  }

  private async world(root: string, basis: { validAt: number; recordedPosition?: number; recordedAt?: number }) {
    const world = await this.reader.readDemandWorld(this.scope, root, basis);
    if (!world) throw new DemoError("ReadDeclined", "The read gateway declined this subject read; try again");
    return world;
  }

  private static facts(triples: readonly Triple[], ns: string) {
    return triples
      .map((t) => ({
        entity: t.entityId.startsWith(ns) ? t.entityId.slice(ns.length) : t.entityId,
        attribute: t.attribute,
        value: plainValue(t.value as { type: string; value: unknown }),
        type: t.value.type,
        validFrom: iso(t.validFrom),
        validTo: t.validTo._tag === "Some" ? iso(t.validTo.value) : null,
        recordedAt: iso(t.recordedAt),
        id: t.id,
      }))
      .sort((a, b) => a.entity.localeCompare(b.entity) || a.attribute.localeCompare(b.attribute));
  }

  // ---- looking ---------------------------------------------------------------------------------------------------

  summary() {
    return this.measure(async () => {
      const { position, t } = await this.head();
      const c = this.connection;
      const subjects = c.roster.reduce((n, r) => n + r.people, 0);
      return {
        kind: c.kind === "1b" ? "the sealed 1 billion record database (working copy)" : "the toy database (working copy)",
        database: c.database,
        accounts: c.roster.length,
        subjects,
        subjectsAre: "worker records: in this test data each subject is one worker with a profile, placements, tasks, subtasks and files",
        recordsAtBringUp: c.recordsAtBringUp,
        recordsAtSeal: c.sealed.records,
        sealedHead: c.sealed.head,
        headAtBringUp: c.headAtBringUp,
        head: position,
        nativeT: t,
        transactionsSinceSeal: position - c.sealed.head,
        recordTimeRange: {
          first: iso(Number(c.clocks?.["seedRecordedAt"] ?? NaN)),
          lastAtBringUp: iso(c.lastRecordedAtBringUp ?? Number(c.clocks?.["lastRecordedAt"] ?? NaN)),
          note: "Record time is the store's own clock. The aging loader ran it about a year ahead of wall time; dates for the 'believed then' view must fall inside this range. New saves are recorded after the last one.",
        },
        compatibility: c.loaderPositionRows ? compatibilityNote : null,
        workingCopy: c.workingCopy,
        workingCopyMadeAt: c.workingCopyMadeAt ?? null,
        serverReadyAt: c.readyAt ?? null,
        memory: c.memory ?? null,
        note: "Records are Datomic datoms counted by a fresh peer at bring-up (db-stats). Each save after that adds a few dozen.",
        position,
      };
    });
  }

  /**
   * The accounts and their subject counts come from the sealed handoff's roster, which bring-up checked against the live
   * database (head, record count and the AGE1 scorecard's membership rows). That costs one basis call. The optional live
   * check reads each account's directory entity as well (at 1 billion about 220 ms cold: ten entities in ten cold segments).
   */
  listAccounts(checkDirectories = false) {
    return this.measure(async () => {
      const directories = this.connection.roster.map((r) => r.namespace + "directory");
      const { position } = await this.head();
      const rows = checkDirectories
        ? await this.reader.rows(this.db, { entityIds: directories, basis: { recordedPosition: position, validAt: Date.now() } })
        : undefined;
      return {
        source: checkDirectories
          ? "the sealed roster, with each account's directory entity read live at this position"
          : "the sealed roster checked at bring-up (pass checkDirectories to read each account's directory entity live)",
        accounts: this.connection.roster.map((r) => ({
          account: r.account,
          namespace: r.namespace,
          subjects: r.people,
          subjectNumbers: `${r.firstPerson} to ${r.firstPerson + r.people - 1}`,
          ...(rows ? { directoryFound: rows.some((x) => x.entity_id === r.namespace + "directory" && x.value_string === r.account) } : {}),
        })),
        position,
      };
    });
  }

  /** Subjects by number: the subject ids are derived from the account and the subject number, then read live. */
  findSubjects(accountInput: string | number, from: number, count: number) {
    return this.measure(async () => {
      const account = this.account(accountInput);
      const last = Math.min(account.firstPerson + account.people, from + count);
      const chosen = [];
      for (let m = Math.max(from, account.firstPerson); m < last; m++) chosen.push(this.subjectIds(account.account, m));
      const { position } = await this.head();
      const rows = await this.reader.rows(this.db, {
        entityIds: chosen.map((p) => p.root),
        basis: { recordedPosition: position, validAt: Date.now() },
      });
      return {
        account: account.account,
        subjects: chosen.map((p) => {
          const own = rows.filter((r) => r.entity_id === p.root);
          const one = (a: string) => own.find((r) => r.attribute === a);
          return {
            subject: p.subjectNumber,
            subjectId: p.root,
            status: one(":placement/status")?.value_string ?? null,
            placements: own.filter((r) => r.attribute === ":person/placement").length,
            lastRecordedAt: iso(Math.max(...own.map((r) => r.recorded_at))),
          };
        }),
        lookup: "by account and subject number (the store's subject key); protected values are never looked up by value",
        position,
      };
    });
  }

  readSubject(accountInput: string | number, subjectNumber: number, attribute?: string) {
    return this.measure(async () => {
      const p = this.subjectIds(accountInput, subjectNumber);
      const { position } = await this.head();
      const world = await this.world(p.root, { recordedPosition: position, validAt: Date.now() });
      const ns = this.account(accountInput).namespace;
      const facts = Demo.facts(world.triples, ns).filter((f) => !attribute || f.attribute === attribute);
      return {
        account: p.account,
        subject: p.subjectNumber,
        subjectId: p.root,
        entities: world.entities,
        factCount: world.triples.length,
        facts,
        position,
      };
    });
  }

  /** Both time axes at one instant: what is now believed true then, and what was believed then. */
  readSubjectAt(accountInput: string | number, subjectNumber: number, at: string | number, attribute?: string, recordedAt?: string | number, believedPosition?: number) {
    return this.measure(async () => {
      const when = parseInstant(at, "at");
      const known = recordedAt === undefined ? when : parseInstant(recordedAt, "recordedAt");
      const p = this.subjectIds(accountInput, subjectNumber);
      const ns = this.account(accountInput).namespace;
      const { position } = await this.head();
      const now = Date.now();
      const [current, trueThen, believedThen] = await Promise.all([
        this.world(p.root, { recordedPosition: position, validAt: now }),
        this.world(p.root, { recordedPosition: position, validAt: when }),
        this.world(p.root, believedPosition === undefined ? { recordedAt: known, validAt: when } : { recordedPosition: believedPosition, validAt: when }),
      ]);
      const keep = (f: { attribute: string }) => !attribute || f.attribute === attribute;
      const views = {
        current: Demo.facts(current.triples, ns).filter(keep),
        trueThenAsKnownNow: Demo.facts(trueThen.triples, ns).filter(keep),
        believedThen: Demo.facts(believedThen.triples, ns).filter(keep),
      };
      const key = (f: { entity: string; attribute: string }) => f.entity + " " + f.attribute;
      const maps = Object.fromEntries(
        Object.keys(views).map((k) => [k, new Map<string, unknown[]>()]),
      ) as Record<keyof typeof views, Map<string, unknown[]>>;
      for (const [k, list] of Object.entries(views) as [keyof typeof views, typeof views.current][])
        for (const f of list) maps[k].set(key(f), [...(maps[k].get(key(f)) ?? []), f.value]);
      const keys = [...new Set(Object.values(maps).flatMap((m) => [...m.keys()]))].sort();
      const differences = keys
        .map((k) => ({
          fact: k,
          current: maps.current.get(k) ?? null,
          trueThenAsKnownNow: maps.trueThenAsKnownNow.get(k) ?? null,
          believedThen: maps.believedThen.get(k) ?? null,
        }))
        .filter((d) => JSON.stringify(d.current) !== JSON.stringify(d.trueThenAsKnownNow) ||
          JSON.stringify(d.trueThenAsKnownNow) !== JSON.stringify(d.believedThen));
      return {
        account: p.account,
        subject: p.subjectNumber,
        at: iso(when),
        believedAsRecordedAt: believedPosition === undefined ? iso(known) : `position ${believedPosition}`,
        counts: { current: views.current.length, trueThenAsKnownNow: views.trueThenAsKnownNow.length, believedThen: views.believedThen.length },
        differences,
        ...(attribute ? views : {}),
        position,
      };
    });
  }

  /**
   * Every stored row of one field of one entity, including retired ones, with both time axes. The gateway answers a
   * history read from the entity's whole stored history (every attribute, every row ever written, and for each retired
   * row the position and clock of the transaction that retired it); it filters to one attribute only afterwards. So the
   * cost follows how often the entity was saved, not the size of the database: entityHistoryRows says how many rows it read.
   */
  fieldHistory(accountInput: string | number, subjectNumber: number, attribute: string, kind: EntityKind = "task", limit = 40) {
    return this.measure(async () => {
      const e = this.entity(accountInput, subjectNumber, kind);
      const { position } = await this.head();
      const rows = await this.reader.rows(this.db, {
        entityIds: [e.entity],
        history: true,
        basis: { recordedPosition: position, validAt: Date.now() },
      });
      const entries = rows
        .filter((r) => r.attribute === attribute)
        .map((r) => ({
          value: r.value_string ?? r.value_number ?? r.value_boolean ?? r.value_datetime ?? r.value_json,
          validFrom: iso(r.valid_from),
          validTo: iso(r.valid_to),
          recordedAt: iso(r.recorded_at),
          recordedPosition: r.recorded_position,
          retiredAt: iso(r.retracted_at),
          retiredPosition: r.retracted_position,
          live: r.retracted_at === null,
          id: r.id,
        }))
        .sort((a, b) => a.recordedPosition - b.recordedPosition || (a.validFrom ?? "").localeCompare(b.validFrom ?? ""));
      const shown = Math.max(1, Math.min(limit, 2000));
      return {
        account: e.account, subject: e.subjectNumber, entity: e.entity, attribute,
        totalRows: entries.length,
        rowsAfterFirst: Math.max(0, entries.length - 1),
        savesOfThisField: Math.max(0, new Set(entries.map((r) => r.recordedPosition)).size - 1),
        rowsAfterFirstNote: "one per loader save of this field; a demo save adds two (the old value closed at the save, and the new value)",
        entityHistoryRows: rows.length,
        rowsShown: entries.length > shown ? `the newest ${shown} of ${entries.length}` : `all ${entries.length}`,
        rows: entries.slice(-shown),
        ...(entries.length > shown ? { first: entries[0] } : {}),
        position,
      };
    });
  }

  /** The journal after a position, filtered to one account's entities when an account is given. */
  changeFeed(after: number | undefined, accountInput?: string | number, limit = 20) {
    return this.measure(async () => {
      const { position } = await this.head();
      const from = after ?? Math.max(0, position - limit);
      const ns = accountInput === undefined ? undefined : this.account(accountInput).namespace;
      const page = await this.run(this.readStore, Effect.flatMap(Triples, (s) => s.transactions({ after: from, limit: Math.min(limit, 200) })));
      const transactions = page.transactions
        .map((tx) => ({
          position: tx.position,
          txId: tx.txId,
          recordedAt: iso(tx.instant),
          commandId: tx.commandId ?? null,
          actor: tx.actor ?? null,
          changes: tx.changes
            .filter((c) => !ns || c.entityId.startsWith(ns))
            .map((c) => ({
              op: c.op,
              entity: c.entityId,
              attribute: c.attribute,
              value: c.value ? plainValue(c.value as { type: string; value: unknown }) : null,
              validFrom: iso(c.validFrom),
              validTo: iso(c.validTo),
            })),
          totalChanges: tx.changes.length,
        }))
        .filter((tx) => !ns || tx.changes.length > 0);
      return { after: from, account: ns ? this.account(accountInput!).account : null, transactions, next: page.next ?? null,
        ...(this.connection.loaderPositionRows ? { compatibility: compatibilityNote } : {}), position };
    });
  }

  /** Many subjects at one exact cut in one request (the read gateway's multi-root pull, at most 16). */
  readManySubjects(accountInput: string | number, subjectNumbers: readonly number[]) {
    return this.measure(async () => {
      if (!subjectNumbers.length || subjectNumbers.length > 16 || new Set(subjectNumbers).size !== subjectNumbers.length)
        throw new DemoError("InvalidInput", "Give 1 to 16 different subject numbers");
      const chosen = subjectNumbers.map((m) => this.subjectIds(accountInput, m));
      const { position } = await this.head();
      const found = await this.reader.readHistoricalWorlds(this.scope, chosen.map((p) => p.root), {
        recordedPosition: position,
        validAt: Date.now(),
      });
      if (!found) throw new DemoError("ReadDeclined", "The read gateway declined this batch; try again");
      return {
        account: chosen[0]!.account,
        cut: { position: found.position, nativeT: found.t },
        subjects: found.worlds.map((w, i) => ({
          subject: chosen[i]!.subjectNumber,
          subjectId: w.root,
          entities: w.entities,
          facts: w.triples.length,
          status: w.triples.find((t) => t.entityId === w.root && t.attribute === ":placement/status")?.value.value ?? null,
        })),
        totalFacts: found.worlds.reduce((n, w) => n + w.triples.length, 0),
        position: found.position,
      };
    });
  }

  // ---- changing (refused unless the connection is a demo working copy) ---------------------------------------------

  private async liveRows(entity: string) {
    const { position } = await this.head();
    const live = await this.writer.rows(this.db, { entityIds: [entity], basis: { recordedPosition: position } });
    return { position, live };
  }

  private async commit(entity: string, ops: TransactOp[], liveIds: string[], label: string) {
    const commandId = `demo:${label}:${randomUUID()}`;
    const result = await this.run(
      this.writeStore,
      Effect.flatMap(Triples, (s) =>
        s.transact(ops, {
          commandId,
          actor: currentActor(),
          preconditions: [{ _tag: "EntityState", entityId: EntityId.make(entity), tripleIds: liveIds.map((id) => TripleId.make(id)) }],
        }),
      ),
    );
    return { commandId, txId: result.txId, position: result.position, recordedAt: iso(result.instant) };
  }

  private validateChange(attribute: string, value: string) {
    if (!attributePattern.test(attribute) || protectedAttribute.test(attribute))
      throw new DemoError("InvalidAttribute", "Use a plain attribute such as :task/field-0 or :placement/status");
    if (typeof value !== "string" || !value.length || value.length > 500)
      throw new DemoError("InvalidValue", "Values are text of 1 to 500 characters");
  }

  /** Save new values from now on; the earlier values stay true for the time before now. */
  saveFacts(accountInput: string | number, subjectNumber: number, kind: EntityKind, changes: Record<string, string>) {
    this.requireWorkingCopy();
    return this.measure(async () => {
      const e = this.entity(accountInput, subjectNumber, kind);
      const entries = Object.entries(changes).sort(([a], [b]) => a.localeCompare(b));
      if (!entries.length || entries.length > 20) throw new DemoError("InvalidInput", "Give 1 to 20 changes");
      for (const [a, v] of entries) this.validateChange(a, v);
      const at = Date.now();
      const { live } = await this.liveRows(e.entity);
      const ops: TransactOp[] = [];
      for (const [attribute, value] of entries) {
        const prior = live.filter((r) => r.attribute === attribute && r.valid_from <= at && (r.valid_to === null || r.valid_to > at));
        for (const r of prior) {
          if (r.value_type !== "string") throw new DemoError("InvalidAttribute", `${attribute} holds ${r.value_type} values; the demo saves text only`);
          ops.push({ op: "retract", id: TripleId.make(r.id) });
          if (r.valid_from < at)
            ops.push(assertText(e.entity, attribute, r.value_string!, r.valid_from, at));
        }
        ops.push(assertText(e.entity, attribute, value, at, prior[0]?.valid_to ?? undefined));
      }
      const receipt = await this.commit(e.entity, ops, live.map((r) => r.id), "save");
      const readback = await this.readBack(e.entity, entries.map(([a]) => a), receipt.position, at);
      const exact = entries.every(([a, v]) => JSON.stringify(readback[a]) === JSON.stringify([v]));
      return { account: e.account, subject: e.subjectNumber, entity: e.entity, validFrom: iso(at), receipt, readback, readbackMatches: exact, position: receipt.position };
    });
  }

  /** A valid-time correction: from a past date on, the value was different. Both beliefs stay readable. */
  correctPastValue(accountInput: string | number, subjectNumber: number, kind: EntityKind, attribute: string, value: string, validFrom: string | number) {
    this.requireWorkingCopy();
    return this.measure(async () => {
      const e = this.entity(accountInput, subjectNumber, kind);
      this.validateChange(attribute, value);
      const from = parseInstant(validFrom, "validFrom");
      if (from >= Date.now()) throw new DemoError("InvalidInput", "A correction starts in the past; use save_facts for now");
      const { position: before, live } = await this.liveRows(e.entity);
      const prior = live.filter((r) => r.attribute === attribute && r.valid_from <= from && (r.valid_to === null || r.valid_to > from));
      if (!prior.length) throw new DemoError("NothingToCorrect", `${attribute} had no value on ${iso(from)} for this ${kind}`);
      const ops: TransactOp[] = [];
      for (const r of prior) {
        if (r.value_type !== "string") throw new DemoError("InvalidAttribute", `${attribute} holds ${r.value_type} values; the demo corrects text only`);
        ops.push({ op: "retract", id: TripleId.make(r.id) });
        if (r.valid_from < from) ops.push(assertText(e.entity, attribute, r.value_string!, r.valid_from, from));
      }
      const end = prior[0]!.valid_to ?? undefined;
      ops.push(assertText(e.entity, attribute, value, from, end));
      const receipt = await this.commit(e.entity, ops, live.map((r) => r.id), "correct");
      const probe = from + 1;
      const [oldBelief, newBelief] = await Promise.all([
        this.reader.rows(this.db, { entityIds: [e.entity], basis: { recordedPosition: before, validAt: probe } }),
        this.reader.rows(this.db, { entityIds: [e.entity], basis: { recordedPosition: receipt.position, validAt: probe }, basisWaitMs: 2000 }),
      ]);
      const pick = (rows: typeof oldBelief) => rows.filter((r) => r.attribute === attribute).map((r) => r.value_string);
      return {
        account: e.account, subject: e.subjectNumber, entity: e.entity, attribute,
        correctedFrom: iso(from), correctedUntil: iso(end ?? null),
        receipt,
        beliefs: {
          [`as recorded before the correction (position ${before}), value on ${iso(probe)}`]: pick(oldBelief),
          [`as recorded after the correction (position ${receipt.position}), value on ${iso(probe)}`]: pick(newBelief),
        },
        readbackMatches: JSON.stringify(pick(newBelief)) === JSON.stringify([value]),
        position: receipt.position,
      };
    });
  }

  /** Retire a fact from now on: it stops being current, the time it was true stays in history. */
  retireFact(accountInput: string | number, subjectNumber: number, kind: EntityKind, attribute: string) {
    this.requireWorkingCopy();
    return this.measure(async () => {
      const e = this.entity(accountInput, subjectNumber, kind);
      if (!attributePattern.test(attribute) || protectedAttribute.test(attribute))
        throw new DemoError("InvalidAttribute", "Use a plain attribute such as :task/field-2");
      const at = Date.now();
      const { live } = await this.liveRows(e.entity);
      const current = live.filter((r) => r.attribute === attribute && r.valid_from <= at && (r.valid_to === null || r.valid_to > at));
      if (!current.length) throw new DemoError("NothingToRetire", `${attribute} has no current value on this ${kind}`);
      const ops: TransactOp[] = [];
      for (const r of current) {
        if (r.value_type === "ref") throw new DemoError("InvalidAttribute", "The demo does not retire references (it would cut the subject apart)");
        ops.push({ op: "retract", id: TripleId.make(r.id) });
        if (r.valid_from < at) ops.push(assertSame(e.entity, attribute, r, r.valid_from, at));
      }
      const receipt = await this.commit(e.entity, ops, live.map((r) => r.id), "retire");
      const readback = await this.readBack(e.entity, [attribute], receipt.position, at);
      return {
        account: e.account, subject: e.subjectNumber, entity: e.entity, attribute, retiredFrom: iso(at), receipt,
        currentAfter: readback[attribute] ?? [],
        retiredFromCurrent: !(readback[attribute]?.length),
        position: receipt.position,
      };
    });
  }

  /** Removal on request needs the scope to have been declared protected before its first save. */
  removeOnRequest(accountInput: string | number, subjectNumber: number) {
    this.requireWorkingCopy();
    return this.measure(async () => {
      const p = this.subjectIds(accountInput, subjectNumber);
      const frontier = await this.reader.erasureFrontier(this.db);
      const { position } = await this.head();
      if (!frontier.protected)
        return {
          account: p.account, subject: p.subjectNumber, done: false,
          reason:
            "This database has no protected fields. The integrated build accepts a protection declaration only before the first save into a scope " +
            "(the gateway answers 409 ProtectedScopeNeedsMigration on a populated scope), and removal on request applies only to protected values. " +
            "The 1 billion database was loaded without a declaration, so removal cannot be shown on it. Nothing was changed.",
          erasureFrontier: frontier,
          position,
        };
      throw new DemoError("NotShown", "This demo build shows removal only as unavailable; a protected scope needs the removal runner");
    });
  }

  private async readBack(entity: string, attributes: string[], position: number, validAt: number) {
    const rows = await this.reader.rows(this.db, {
      entityIds: [entity],
      basis: { recordedPosition: position, validAt: validAt + 1 },
      basisWaitMs: 2000,
    });
    return Object.fromEntries(
      attributes.map((a) => [a, rows.filter((r) => r.attribute === a).map((r) => r.value_string ?? r.value_number ?? r.value_json)]),
    ) as Record<string, unknown[]>;
  }
}

function assertText(entity: string, attribute: string, value: string, validFrom: number, validTo?: number): TransactOp {
  return {
    op: "assert",
    entityId: EntityId.make(entity),
    attribute,
    value: { type: "string", value },
    validFrom,
    ...(validTo === undefined ? {} : { validTo }),
  };
}
function assertSame(entity: string, attribute: string, r: { value_type: string; value_string: string | null; value_number: number | null; value_boolean: number | null; value_datetime: number | null; value_json: string | null }, validFrom: number, validTo: number): TransactOp {
  const value =
    r.value_type === "string" ? { type: "string" as const, value: r.value_string! }
    : r.value_type === "integer" ? { type: "integer" as const, value: String(r.value_number) }
    : r.value_type === "number" ? { type: "number" as const, value: r.value_number! }
    : r.value_type === "boolean" ? { type: "boolean" as const, value: r.value_boolean === 1 }
    : r.value_type === "datetime" ? { type: "datetime" as const, value: r.value_datetime! }
    : null;
  if (!value) throw new DemoError("InvalidAttribute", `The demo does not retire ${r.value_type} values`);
  return { op: "assert", entityId: EntityId.make(entity), attribute, value: value as never, validFrom, validTo };
}

export { SEED_VALID_FROM };
