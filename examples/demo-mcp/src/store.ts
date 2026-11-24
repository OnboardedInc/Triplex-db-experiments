// [DX-DEMO1, DX-CON1] The local functions behind every tool of the catalogue (tools.ts), which the MCP server and the
// console's server both run. Each one talks to the remote gateways
// through the SSH forwards that demo/connect.sh opened, and returns its answer with the time the gateway itself took,
// the round trip from this machine, and the database position it read or wrote at.
// Why: one implementation for the assistant, the console and the scripted proofs, so all of them show the same numbers.
// Rejected: a second HTTP API (the gateways are the API) and the playground service (bound to its own fixture and stack).
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { EntityId, TripleId, Triples, type TransactOp, type TransactionMeta, type TransactionRecord, type Triple } from "@triplex-build/triplex";
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
import { DemoError } from "./errors.ts";
import { GuardedClient } from "./guard.ts";

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

export { DemoError };

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
  readonly writer: GuardedClient;
  readonly reader: GuardedClient;
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
    // [DX-CON1] Both clients go through the guard: no read without an entity ID is ever sent.
    this.writer = new GuardedClient(connection.writeUrl, 60_000);
    this.reader = new GuardedClient(connection.readUrl, 60_000);
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
  transact(ops: TransactOp[], meta: TransactionMeta) {
    return this.run(this.writeStore, Effect.flatMap(Triples, (s) => s.transact(ops, meta)));
  }

  /** [DX-CON1] Any Triples operation through the read gateway (journal pages, entity transactions). */
  read<A, E>(effect: Effect.Effect<A, E, Triples>) {
    return this.run(this.readStore, effect);
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

  requireWorkingCopy() {
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

  /** [DX-CON1] A subject by account and number, or by its root entity ID (any entity can be read as a subject). */
  subjectOf(input: { account?: string | number | undefined; subject?: number | undefined; root?: string | undefined }) {
    if (input.root !== undefined) {
      if (input.subject !== undefined) throw new DemoError("InvalidInput", "Give root, or account and subject, not both");
      const root = input.root.trim();
      if (!root || root.length > 300) throw new DemoError("InvalidInput", "Give a root entity ID");
      const m = /^acct\/(account-\d{3})\//.exec(root);
      const r = m ? this.connection.roster.find((x) => x.account === m[1]) : undefined;
      const n = /\/pl:(\d{8})$/.exec(root);
      return { root, account: r?.account ?? null, subjectNumber: n && r ? Number(n[1]) : null, ns: r?.namespace ?? "" };
    }
    if (input.account === undefined || input.subject === undefined) throw new DemoError("InvalidInput", "Give account and subject, or root");
    const p = this.subjectIds(input.account, input.subject);
    return { root: p.root, account: p.account, subjectNumber: p.subjectNumber, ns: this.account(input.account).namespace };
  }

  readSubject(input: { account?: string | number | undefined; subject?: number | undefined; root?: string | undefined }, attribute?: string, basis?: { wire: { recordedPosition?: number; recordedAt?: number; validAt: number }; words: string; position?: number | undefined }) {
    return this.measure(async () => {
      const p = this.subjectOf(input);
      const position = basis?.position ?? (basis?.wire.recordedAt !== undefined ? undefined : (await this.head()).position);
      const world = await this.world(p.root, basis?.wire ?? { recordedPosition: position!, validAt: Date.now() });
      const ns = p.ns;
      const facts = Demo.facts(world.triples, ns).filter((f) => !attribute || f.attribute === attribute);
      return {
        account: p.account,
        subject: p.subjectNumber,
        subjectId: p.root,
        entities: world.entities,
        factCount: world.triples.length,
        facts,
        ...(basis ? { basis: basis.words } : {}),
        position: position ?? (await this.head()).position,
      };
    });
  }

  /** Both time axes at one instant: what is now believed true then, and what was believed then. */
  readSubjectAt(input: { account?: string | number | undefined; subject?: number | undefined; root?: string | undefined }, at: string | number, attribute?: string, recordedAt?: string | number, believedPosition?: number) {
    return this.measure(async () => {
      const when = parseInstant(at, "at");
      const known = recordedAt === undefined ? when : parseInstant(recordedAt, "recordedAt");
      const p = this.subjectOf(input);
      const ns = p.ns;
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
  fieldHistory(t: Target, attribute: string, limit = 40) {
    return this.measure(async () => {
      const e = { entity: t.entity, account: t.account, subjectNumber: t.subjectNumber };
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

  /**
   * The journal after a position, filtered to one account's entities when an account is given. [DX-CON1] Also: one
   * entity's transactions newest first (entity), one actor's (actor, filtered here after reading), a long poll for the
   * Journal's Live switch (waitMs), and "who changed since" (summary): the subjects changed after a position with their
   * counts, reading at most 10 pages of 1,000 transactions and saying so when it stops.
   */
  changeFeed(o: { after?: number | undefined; account?: string | number | undefined; limit?: number | undefined; entity?: string | undefined; actor?: string | undefined; summary?: boolean | undefined; waitMs?: number | undefined; before?: number | undefined }) {
    return this.measure(async () => {
      const limit = Math.min(o.limit ?? 20, o.summary ? 1000 : 200);
      const { position } = await this.head();
      const ns = o.account === undefined ? undefined : this.account(o.account).namespace;
      const fmt = (tx: TransactionRecord) => ({
        position: tx.position,
        txId: tx.txId,
        recordedAt: iso(tx.instant),
        commandId: tx.commandId ?? null,
        actor: tx.actor ?? null,
        configSnapshot: tx.configSnapshot ?? null,
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
      });
      const keep = (tx: ReturnType<typeof fmt>) => (!ns || tx.changes.length > 0) && (!o.actor || tx.actor === o.actor);
      const compat = this.connection.loaderPositionRows ? { compatibility: compatibilityNote } : {};
      // [DX-CON1] The gateway's /transactions page walks the position index from after+1 and keeps only journals inside
      // (after, head]. The bulk loader's saves carry position rows in its own form (G11): they sit in that range but never
      // pass, so a page that asks for more transactions than exist after `after`, or starts below the sealed head, walks
      // all of them while holding the gateway's single journal permit. So every page here starts at or after the sealed
      // head of a loader-built database and asks for at most head - after transactions; a long poll asks for one.
      // Rejected: the gateway's entity-transactions route on the lean layout, which reads every transaction (G13).
      const floor = this.connection.loaderPositionRows ? this.connection.sealed.head : 0;
      const pageAfter = (after: number, want: number, waitMs?: number) => {
        const from = Math.max(after, floor);
        const n = waitMs ? 1 : Math.min(want, position - from);
        if (n <= 0) return Promise.resolve({ transactions: [] as TransactionRecord[], next: undefined as number | undefined, from });
        return this.run(this.readStore, Effect.flatMap(Triples, (s) => s.transactions({ after: from, limit: n, ...(waitMs ? { waitMs } : {}) })))
          .then((page) => ({ transactions: page.transactions, next: page.next, from }));
      };
      const floorNote = floor
        ? { searched: `positions after ${floor}, the sealed head: the loader's saves before it are not read by the console (their journal rows are in the loader's own form, gap G11)` }
        : {};
      if (o.entity !== undefined) {
        // An entity's journal: the transactions since the sealed head that changed it, newest first, in pages of 1,000.
        const before = Math.min(o.before ?? position + 1, position + 1);
        const found: TransactionRecord[] = [];
        let cursor = floor, pages = 0;
        while (cursor < before - 1 && pages < 10) {
          const page = await pageAfter(cursor, Math.min(1000, before - 1 - cursor));
          pages++;
          for (const tx of page.transactions) if (tx.position < before && tx.changes.some((c) => c.entityId === o.entity)) found.push(tx);
          if (!page.transactions.length) break;
          cursor = page.transactions[page.transactions.length - 1]!.position;
        }
        const newest = found.sort((a, b) => b.position - a.position);
        const shown = newest.slice(0, limit);
        return { entity: o.entity, order: "newest first", transactions: shown.map(fmt).filter(keep), transactionsRead: cursor - floor, pages,
          nextBefore: newest.length > limit ? shown[shown.length - 1]!.position : null, ...floorNote, ...compat, position };
      }
      if (o.summary) {
        if (o.after === undefined) throw new DemoError("InvalidInput", "Changed since needs after, the position to look back to");
        let cursor = Math.max(o.after, floor), read = 0, pages = 0, complete = false;
        const subjects = new Map<string, { subject: string; account: string | null; root: string | null; transactions: Set<number>; facts: number; lastPosition: number }>();
        while (pages < 10) {
          if (cursor >= position) { complete = true; break; }
          const page = await pageAfter(cursor, 1000);
          pages++;
          read += page.transactions.length;
          for (const tx of page.transactions.map(fmt)) {
            if (o.actor && tx.actor !== o.actor) continue;
            for (const c of tx.changes) {
              const k = subjectKey(c.entity, this.connection.roster);
              const e = subjects.get(k.subject) ?? { ...k, transactions: new Set<number>(), facts: 0, lastPosition: 0 };
              e.transactions.add(tx.position);
              e.facts++;
              e.lastPosition = Math.max(e.lastPosition, tx.position);
              subjects.set(k.subject, e);
            }
          }
          if (!page.transactions.length) { complete = true; break; }
          cursor = page.transactions[page.transactions.length - 1]!.position;
        }
        const list = [...subjects.values()].map((e) => ({ subject: e.subject, account: e.account, root: e.root, transactions: e.transactions.size, factsChanged: e.facts, lastPosition: e.lastPosition }))
          .sort((x, y) => y.lastPosition - x.lastPosition);
        return {
          after: o.after, transactionsRead: read, pages, complete,
          ...(complete ? {} : { note: `Stopped after ${pages} pages of 1,000 transactions, at position ${cursor}; ask again with after = ${cursor}.`, resumeAfter: cursor }),
          subjectsChanged: list.length, subjects: list, ...floorNote, ...compat, position,
        };
      }
      const page = await pageAfter(o.after ?? Math.max(0, position - limit), limit, o.waitMs ? Math.min(30_000, o.waitMs) : undefined);
      const transactions = page.transactions.map(fmt).filter(keep);
      const last = page.transactions[page.transactions.length - 1]?.position;
      return { after: page.from, account: ns ? this.account(o.account!).account : null, actor: o.actor ?? null, transactions, read: page.transactions.length,
        next: last ?? null, ...floorNote, ...compat, position };
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
  // [DX-CON1] Every change names its entity: a loader-built subject's root, profile or first task (account, subject,
  // kind), or any entity by ID. Values are typed: text for untyped entities, the type's own value types for entities
  // of a console type (entities.ts decodes them with Triplex's EntityCodec). Re-asserted old values keep their own
  // value type and entity type. Typed writes pin the release live points to (configSnapshot).

  /** The entity a change or a read is about. */
  target(input: { entity?: string | undefined; account?: string | number | undefined; subject?: number | undefined; kind?: EntityKind | undefined }): Target {
    if (input.entity !== undefined) {
      const entity = input.entity.trim();
      if (!entity || entity.length > 300) throw new DemoError("InvalidInput", "Give an entity ID");
      if (input.account !== undefined || input.subject !== undefined) throw new DemoError("InvalidInput", "Give entity, or account and subject, not both");
      const m = /^acct\/(account-\d{3})\//.exec(entity);
      return { entity, account: m?.[1] ?? null, subjectNumber: null, kind: null };
    }
    if (input.account === undefined || input.subject === undefined) throw new DemoError("InvalidInput", "Give entity, or account and subject");
    const e = this.entity(input.account, input.subject, input.kind ?? "task");
    return { entity: e.entity, account: e.account, subjectNumber: e.subjectNumber, kind: e.kind };
  }

  private async liveRows(entity: string) {
    const { position } = await this.head();
    const live = await this.writer.rows(this.db, { entityIds: [entity], basis: { recordedPosition: position } });
    return { position, live };
  }

  private async commit(entity: string, ops: TransactOp[], liveIds: string[], label: string, configSnapshot?: string) {
    const commandId = `demo:${label}:${randomUUID()}`;
    const result = await this.run(
      this.writeStore,
      Effect.flatMap(Triples, (s) =>
        s.transact(ops, {
          commandId,
          actor: currentActor(),
          ...(configSnapshot ? { configSnapshot } : {}),
          preconditions: [{ _tag: "EntityState", entityId: EntityId.make(entity), tripleIds: liveIds.map((id) => TripleId.make(id)) }],
        }),
      ),
    );
    return { commandId, txId: result.txId, position: result.position, recordedAt: iso(result.instant), actor: currentActor(), ...(configSnapshot ? { configSnapshot } : {}) };
  }

  private validateTarget(t: Target, attribute: string) {
    if (!attributePattern.test(attribute) || protectedAttribute.test(attribute) || attribute.startsWith(":console/"))
      throw new DemoError("InvalidAttribute", "Use a plain attribute such as :task/field-0 or :review/outcome");
    if (t.entity.startsWith("_triplex/") || t.entity.startsWith("_tx/") || /\/console\//.test(t.entity))
      throw new DemoError("Reserved", `${t.entity} is a reserved entity`);
  }
  private static text(value: unknown): TripleValueLike[] {
    if (typeof value !== "string" || !value.length || value.length > 500) throw new DemoError("InvalidValue", "Values are text of 1 to 500 characters");
    return [{ type: "string", value }];
  }
  private where(t: Target) {
    return t.subjectNumber === null ? { entity: t.entity } : { account: t.account, subject: t.subjectNumber, entity: t.entity, kind: t.kind };
  }

  /**
   * Save new values from now on; the earlier values stay true for the time before now. `typed` gives the values
   * already decoded for the entity's type; otherwise each value is text.
   */
  saveFacts(t: Target, changes: Record<string, unknown>, typed?: { values: ReadonlyMap<string, readonly TripleValueLike[]>; configSnapshot: string; entityType: string }) {
    this.requireWorkingCopy();
    return this.measure(async () => {
      const entries = Object.keys(changes).sort().map((a) => [a, typed ? typed.values.get(a) ?? [] : Demo.text(changes[a])] as const);
      if (!entries.length || entries.length > 20) throw new DemoError("InvalidInput", "Give 1 to 20 changes");
      for (const [a] of entries) this.validateTarget(t, a);
      const at = Date.now();
      const { live } = await this.liveRows(t.entity);
      const ops: TransactOp[] = [];
      for (const [attribute, values] of entries) {
        const prior = live.filter((r) => r.attribute === attribute && r.valid_from <= at && (r.valid_to === null || r.valid_to > at));
        for (const r of prior) {
          if (!typed && r.value_type !== "string") throw new DemoError("InvalidAttribute", `${attribute} holds ${r.value_type} values; an untyped entity's save takes text only`);
          ops.push({ op: "retract", id: TripleId.make(r.id) });
          if (r.valid_from < at) ops.push(assertSame(t.entity, attribute, r, r.valid_from, at));
        }
        for (const v of values) ops.push(assertValue(t.entity, attribute, v, at, prior[0]?.valid_to ?? undefined, typed?.entityType ?? live.find((r) => r.entity_type)?.entity_type ?? undefined));
      }
      const receipt = await this.commit(t.entity, ops, live.map((r) => r.id), "save", typed?.configSnapshot);
      const readback = await this.readBack(t.entity, entries.map(([a]) => a), receipt.position, at);
      const exact = entries.every(([a, vs]) => JSON.stringify(readback[a]) === JSON.stringify(vs.map(plainWritten)));
      return { ...this.where(t), validFrom: iso(at), receipt, readback, readbackMatches: exact, position: receipt.position };
    });
  }

  /** A valid-time correction: from a past date on, the value was different. Both beliefs stay readable. */
  correctPastValue(t: Target, attribute: string, value: unknown, validFrom: string | number, typed?: { value: TripleValueLike; configSnapshot: string; entityType: string }) {
    this.requireWorkingCopy();
    return this.measure(async () => {
      this.validateTarget(t, attribute);
      const next = typed?.value ?? Demo.text(value)[0]!;
      const from = parseInstant(validFrom, "validFrom");
      if (from >= Date.now()) throw new DemoError("InvalidInput", "A correction starts in the past; use save_facts for now");
      const { position: before, live } = await this.liveRows(t.entity);
      const prior = live.filter((r) => r.attribute === attribute && r.valid_from <= from && (r.valid_to === null || r.valid_to > from));
      if (!prior.length) throw new DemoError("NothingToCorrect", `${attribute} had no value on ${iso(from)} for ${t.entity}`);
      const ops: TransactOp[] = [];
      for (const r of prior) {
        if (!typed && r.value_type !== "string") throw new DemoError("InvalidAttribute", `${attribute} holds ${r.value_type} values; an untyped entity's correction takes text only`);
        ops.push({ op: "retract", id: TripleId.make(r.id) });
        if (r.valid_from < from) ops.push(assertSame(t.entity, attribute, r, r.valid_from, from));
      }
      const end = prior[0]!.valid_to ?? undefined;
      ops.push(assertValue(t.entity, attribute, next, from, end, typed?.entityType ?? prior[0]!.entity_type ?? undefined));
      const receipt = await this.commit(t.entity, ops, live.map((r) => r.id), "correct", typed?.configSnapshot);
      const probe = from + 1;
      const [oldBelief, newBelief] = await Promise.all([
        this.reader.rows(this.db, { entityIds: [t.entity], basis: { recordedPosition: before, validAt: probe } }),
        this.reader.rows(this.db, { entityIds: [t.entity], basis: { recordedPosition: receipt.position, validAt: probe }, basisWaitMs: 2000 }),
      ]);
      const pick = (rows: typeof oldBelief) => rows.filter((r) => r.attribute === attribute).map(readValue);
      return {
        ...this.where(t), attribute,
        correctedFrom: iso(from), correctedUntil: iso(end ?? null),
        receipt,
        beliefs: {
          [`as recorded before the correction (position ${before}), value on ${iso(probe)}`]: pick(oldBelief),
          [`as recorded after the correction (position ${receipt.position}), value on ${iso(probe)}`]: pick(newBelief),
        },
        readbackMatches: JSON.stringify(pick(newBelief)) === JSON.stringify([plainWritten(next)]),
        position: receipt.position,
      };
    });
  }

  /** Retire a fact from now on: it stops being current, the time it was true stays in history. */
  retireFact(t: Target, attribute: string, configSnapshot?: string) {
    this.requireWorkingCopy();
    return this.measure(async () => {
      this.validateTarget(t, attribute);
      const at = Date.now();
      const { live } = await this.liveRows(t.entity);
      const current = live.filter((r) => r.attribute === attribute && r.valid_from <= at && (r.valid_to === null || r.valid_to > at));
      if (!current.length) throw new DemoError("NothingToRetire", `${attribute} has no current value on ${t.entity}`);
      const ops: TransactOp[] = [];
      for (const r of current) {
        if (r.value_type === "ref" && !r.entity_type) throw new DemoError("InvalidAttribute", "The console does not retire a reference of a loader-built subject (it would cut the subject apart)");
        ops.push({ op: "retract", id: TripleId.make(r.id) });
        if (r.valid_from < at) ops.push(assertSame(t.entity, attribute, r, r.valid_from, at));
      }
      const receipt = await this.commit(t.entity, ops, live.map((r) => r.id), "retire", configSnapshot);
      const readback = await this.readBack(t.entity, [attribute], receipt.position, at);
      return {
        ...this.where(t), attribute, retiredFrom: iso(at), receipt,
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
    return Object.fromEntries(attributes.map((a) => [a, rows.filter((r) => r.attribute === a).map(readValue)])) as Record<string, unknown[]>;
  }
}

/** Which subject a change belongs to: a loader-built entity's subject, a console entity, configuration or counters. */
export function subjectKey(entity: string, roster: readonly { account: string; namespace: string }[]) {
  if (entity.startsWith("_triplex/")) return { subject: "configuration", account: null, root: null };
  const m = /^acct\/(account-\d{3})\/(?:(console)\/|([a-z0-9-]+):(\d{8}))/.exec(entity);
  if (!m) return { subject: entity, account: null, root: null };
  const account = m[1]!;
  if (m[2]) return { subject: `${account} / console counters`, account, root: null };
  const prefix = m[3]!, n = Number(m[4]);
  if (["pl", "wk", "i9", "sec", "doc", "page"].includes(prefix)) {
    const ns = roster.find((r) => r.account === account)?.namespace ?? `acct/${account}/`;
    return { subject: `${account} / ${n}`, account, root: `${ns}pl:${String(n).padStart(8, "0")}` };
  }
  return { subject: `${account} / ${prefix}:${m[4]}`, account, root: entity.slice(0, entity.indexOf(m[4]!) + 8) };
}

export type Target = { entity: string; account: string | null; subjectNumber: number | null; kind: EntityKind | null };
export type TripleValueLike = { type: string; value: unknown };
type Row = { value_type: string; value_string: string | null; value_number: number | null; value_boolean: number | null; value_datetime: number | null; value_json: string | null; entity_type?: string | null };

/** A stored row's value as the tools print it (exact integers as decimal text, instants as epoch milliseconds). */
function readValue(r: Row): unknown {
  switch (r.value_type) {
    case "integer": return r.value_string ?? (r.value_number === null ? null : String(r.value_number));
    case "boolean": return r.value_boolean === null ? null : r.value_boolean === 1;
    case "datetime": return r.value_datetime;
    case "json": return r.value_json === null ? null : JSON.parse(r.value_json);
    case "number": return r.value_number;
    default: return r.value_string;
  }
}
/** A written value in the same form as readValue. */
function plainWritten(v: TripleValueLike): unknown {
  return typeof v.value === "bigint" ? String(v.value) : v.value instanceof Date ? v.value.getTime() : v.value;
}

function assertValue(entity: string, attribute: string, value: TripleValueLike, validFrom: number, validTo?: number, entityType?: string): TransactOp {
  return {
    op: "assert",
    entityId: EntityId.make(entity),
    attribute,
    value: (value.type === "ref" ? { type: "ref", value: EntityId.make(String(value.value)) } : value) as never,
    validFrom,
    ...(validTo === undefined ? {} : { validTo }),
    ...(entityType ? { entityType } : {}),
  };
}
function assertSame(entity: string, attribute: string, r: Row, validFrom: number, validTo: number): TransactOp {
  const value =
    r.value_type === "string" ? { type: "string" as const, value: r.value_string! }
    : r.value_type === "ref" ? { type: "ref" as const, value: r.value_string! }
    : r.value_type === "integer" ? { type: "integer" as const, value: String(readValue(r)) }
    : r.value_type === "number" ? { type: "number" as const, value: r.value_number! }
    : r.value_type === "boolean" ? { type: "boolean" as const, value: r.value_boolean === 1 }
    : r.value_type === "datetime" ? { type: "datetime" as const, value: r.value_datetime! }
    : r.value_type === "json" ? { type: "json" as const, value: JSON.parse(r.value_json!) }
    : null;
  if (!value) throw new DemoError("InvalidAttribute", `The console does not re-assert ${r.value_type} values`);
  return assertValue(entity, attribute, value, validFrom, validTo, r.entity_type ?? undefined);
}

export { SEED_VALID_FROM };
