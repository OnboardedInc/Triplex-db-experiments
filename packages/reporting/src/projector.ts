// [DX-RPT1] The projector: follows the store's journal from the watermark kept in PostgreSQL and applies each page in
// ONE SQL transaction with that watermark, so every journal is applied exactly once and every reader sees one cut.
// Rebuild of one account reads its whole history at the store's head and swaps it in under the same lock.
// Rejected: a checkpoint file or a second store (a crash between the two writes applies twice or loses a page);
// ON CONFLICT DO NOTHING on assertions (it would hide a copy that is already wrong).
import { randomUUID } from "node:crypto";
import type postgres from "postgres";
import { schemaSql } from "./schema.js";
import { accountOf, ReportingRefusal, StoreSource, type ChangeRecord, type JournalPage, type StoreRow } from "./source.js";
import { columnName, MAX_COLUMNS, snake, viewSql, type ColumnSpec } from "./views.js";

type Sql = postgres.Sql;
type Tx = postgres.TransactionSql;

/** Doubles go to PostgreSQL as text so -0 and every bit survive. */
const dbl = (n: number | null | undefined): string | null =>
  n === null || n === undefined ? null : Object.is(n, -0) ? "-0" : String(n);

interface FactRow {
  account: string;
  entity: string;
  kind: string | null;
  attribute: string;
  assertion_id: string;
  value_type: string;
  value_string: string | null;
  value_number: string | null;
  value_boolean: boolean | null;
  value_datetime: string | null;
  value_json: unknown;
  valid_from: string;
  valid_to: string | null;
  recorded_position: number;
  recorded_at: string;
  retracted_position: number | null;
  retracted_at: string | null;
  removed_position: number | null;
}

const canonical = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value as object).sort().map((k) => `${JSON.stringify(k)}:${canonical((value as any)[k])}`).join(",")}}`;
};

/** A change record's typed value in the store's own row columns (packages/datomic/src/rows.ts `pack`). */
export function packChangeValue(value: ChangeRecord["value"]) {
  const out = { value_type: "protected", value_string: null as string | null, value_number: null as string | null,
    value_boolean: null as boolean | null, value_datetime: null as string | null, value_json: null as unknown };
  if (!value || value.type === "protected") return out;
  out.value_type = value.type;
  switch (value.type) {
    case "string":
    case "ref":
    case "integer":
      out.value_string = String(value.value);
      break;
    case "number":
      out.value_number = dbl(value.value as number);
      break;
    case "datetime":
      out.value_datetime = dbl(value.value as number);
      break;
    case "boolean":
      out.value_boolean = value.value === true;
      break;
    case "json":
      out.value_json = JSON.parse(canonical(value.value));
      break;
    case "blob":
      out.value_string = String(value.value);
      out.value_json = { mimeType: value["mimeType"], size: value["size"], ...(value["filename"] === undefined ? {} : { filename: value["filename"] }) };
      break;
    case "erased":
      // A removed value's marker: the attribute is protected, so it never reaches here with omitProtected on.
      throw new ReportingRefusal("ProtectedOmissionMissing", "a removal marker arrived where no protected value may");
    default:
      throw new ReportingRefusal("UnknownValueType", `value type ${value.type}`);
  }
  return out;
}

/** A store history row in the copy's columns. */
export function factFromStoreRow(r: StoreRow): FactRow {
  const protectedRow = r.value_type === "protected";
  return {
    account: accountOf(r.entity_id),
    entity: r.entity_id,
    kind: r.entity_type,
    attribute: r.attribute,
    assertion_id: r.id,
    value_type: r.value_type,
    value_string: protectedRow ? null : r.value_string,
    value_number: protectedRow ? null : dbl(r.value_number),
    value_boolean: protectedRow || r.value_boolean === null ? null : r.value_boolean === true || Number(r.value_boolean) === 1,
    value_datetime: protectedRow ? null : dbl(r.value_datetime),
    value_json: protectedRow || r.value_json === null ? null : JSON.parse(r.value_json),
    valid_from: dbl(r.valid_from)!,
    valid_to: dbl(r.valid_to),
    recorded_position: r.recorded_position,
    recorded_at: dbl(r.recorded_at)!,
    retracted_position: r.retracted_position,
    retracted_at: dbl(r.retracted_at),
    removed_position: null,
  };
}

const FACT_COLUMNS = `account text, entity text, kind text, attribute text, assertion_id text, value_type text,
  value_string text, value_number text, value_boolean boolean, value_datetime text, value_json jsonb, valid_from text,
  valid_to text, recorded_position bigint, recorded_at text, retracted_position bigint, retracted_at text,
  removed_position bigint`;
const FACT_TABLE_COLUMNS = `account, entity, kind, attribute, assertion_id, value_type, value_string, value_number,
  value_boolean, value_datetime, value_json, valid_from, valid_to, recorded_position, recorded_at, retracted_position,
  retracted_at, removed_position`;
const FACT_SELECT = `account, entity, kind, attribute, assertion_id, value_type, value_string, value_number::float8,
  value_boolean, value_datetime::float8, value_json, valid_from::float8, valid_to::float8, recorded_position,
  recorded_at::float8, retracted_position, retracted_at::float8, removed_position`;

export interface PageStats {
  after: number;
  next: number;
  head: number;
  journals: number;
  changes: number;
  inserted: number;
  retracted: number;
  removed: number;
  skippedByFence: number;
  newColumns: number;
  availableAt: number;
  newestRecordedAt: number | null;
  fetchMs: number;
  applyMs: number;
  committedAt: number;
}

export type FaultPoint = "after-fetch" | "mid-transaction" | "after-commit";

export interface ProjectorOptions {
  readonly sql: Sql;
  readonly source: StoreSource;
  readonly pageLimit?: number;
  readonly waitMs?: number;
  /** Called at each fault point; a test kills the process here. */
  readonly fault?: (point: FaultPoint, pageNumber: number) => void;
  readonly log?: (kind: string, data: Record<string, unknown>) => void;
}

export class Projector {
  readonly sql: Sql;
  readonly source: StoreSource;
  readonly pageLimit: number;
  readonly waitMs: number;
  pages = 0;
  /** A kind's view could not take a new column (a reporting query held it); retried after every page. */
  viewsBehind = false;
  /** Attributes the gateway has marked protected; a later change of one that carries a value is refused. */
  private protectedAttributes: Set<string> | null = null;
  private readonly fault: ProjectorOptions["fault"];
  private readonly log: NonNullable<ProjectorOptions["log"]>;

  constructor(options: ProjectorOptions) {
    this.sql = options.sql;
    this.source = options.source;
    this.pageLimit = options.pageLimit ?? 200;
    this.waitMs = options.waitMs ?? 1000;
    this.fault = options.fault;
    this.log = options.log ?? (() => {});
  }

  /** Creates the tables, functions and policies (idempotent, serialised by an advisory lock). */
  async install(): Promise<void> {
    await this.sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(7019240001)`;
      await tx.unsafe(schemaSql);
    });
  }

  /** The copy's watermark, or null before its first build. */
  async watermark(): Promise<{ database: string; after: number; epoch: string } | null> {
    const [row] = await this.sql`SELECT database, after_position, epoch FROM rpt.feed_state`;
    return row ? { database: row.database, after: Number(row.after_position), epoch: row.epoch } : null;
  }

  /** Starts an empty copy that replays the journal from `after` (0: the whole journal). */
  async start(after = 0): Promise<void> {
    await this.sql.begin(async (tx) => {
      const [row] = await tx`SELECT database FROM rpt.feed_state FOR UPDATE`;
      if (row && row.database !== this.source.db)
        throw new ReportingRefusal("OtherDatabase", "this copy follows another database", { follows: row.database });
      if (!row)
        await tx`INSERT INTO rpt.feed_state (database, epoch, after_position) VALUES (${this.source.db}, ${randomUUID()}, ${after})`;
    });
  }

  /** Reads one page after the watermark and applies it. Returns null when another projector moved first. */
  async step(): Promise<PageStats | null> {
    const mark = await this.watermark();
    if (!mark) throw new ReportingRefusal("NotStarted", "the copy has no watermark; build it first");
    if (mark.database !== this.source.db) throw new ReportingRefusal("OtherDatabase", "this copy follows another database");
    const t0 = performance.now();
    const page = await this.source.page(mark.after, this.pageLimit, this.waitMs);
    const fetchMs = performance.now() - t0;
    if (page.head < mark.after)
      throw new ReportingRefusal("StoreBehind", "the store's head is below the copy's watermark (a restore to an older point?)", {
        head: page.head, watermark: mark.after });
    this.pages++;
    this.fault?.("after-fetch", this.pages);
    if (page.next === mark.after && page.journals.length === 0) return { ...emptyStats(page), fetchMs, applyMs: 0, committedAt: Date.now() };
    const t1 = performance.now();
    const stats = await this.sql.begin(async (tx) => {
      const [state] = await tx`SELECT after_position FROM rpt.feed_state FOR UPDATE`;
      if (Number(state!.after_position) !== mark.after) return null;
      const s = await this.applyJournals(tx, page, null);
      this.fault?.("mid-transaction", this.pages);
      await tx`UPDATE rpt.feed_state SET after_position = ${page.next}, store_head_seen = ${page.head},
        last_journal_position = coalesce(${page.journals.at(-1)?.position ?? null}::bigint, last_journal_position),
        last_recorded_at = coalesce(${dbl(s.newestRecordedAt)}::float8, last_recorded_at), applied_at = now(),
        journals_applied = journals_applied + ${page.journals.length}`;
      return s;
    });
    if (!stats) return null;
    const applyMs = performance.now() - t1;
    this.fault?.("after-commit", this.pages);
    if (stats.newColumns || this.viewsBehind) await this.refreshViews();
    return { ...stats, fetchMs, applyMs, committedAt: Date.now() };
  }

  /**
   * Applies a page's journals inside the caller's transaction. With `onlyAccount`, applies that account's changes only
   * and ignores fences (the rebuild's catch-up); otherwise skips each account's journals at or below its fence.
   */
  private async applyJournals(tx: Tx, page: JournalPage, onlyAccount: string | null, fenceOverride?: number) {
    const touched = new Set<string>();
    for (const j of page.journals) for (const c of j.changes) touched.add(accountOf(c.entityId));
    const fences = new Map<string, number>();
    if (onlyAccount === null && touched.size) {
      const rows = await tx`SELECT account, fence_position FROM rpt.account_state WHERE account = ANY(${[...touched]})`;
      for (const r of rows) fences.set(r.account, Number(r.fence_position));
    }
    if (this.protectedAttributes === null)
      this.protectedAttributes = new Set((await tx`SELECT DISTINCT attribute FROM rpt.columns WHERE value_type = 'protected'`).map((r) => r.attribute));
    const inserts: FactRow[] = [];
    const retracts: { account: string; assertion_id: string; position: number; at: string | null }[] = [];
    const removals: { account: string; assertion_id: string; position: number }[] = [];
    const commits = new Map<string, { account: string; position: number; tx_id: string; recorded_at: string | null; changes: number }>();
    let skipped = 0, changes = 0, newest: number | null = null;
    for (const j of page.journals) {
      if (j.recordedAt !== null) newest = j.recordedAt;
      for (const c of j.changes) {
        const account = accountOf(c.entityId);
        if (onlyAccount !== null && account !== onlyAccount) continue;
        const fence = onlyAccount !== null ? (fenceOverride ?? 0) : (fences.get(account) ?? 0);
        if (j.position <= fence) { skipped++; continue; }
        changes++;
        const key = `${account} ${j.position} ${j.txId}`;
        const commit = commits.get(key) ?? { account, position: j.position, tx_id: j.txId, recorded_at: dbl(j.recordedAt), changes: 0 };
        commit.changes++;
        commits.set(key, commit);
        if (c.op === "assert") {
          if (typeof c.validFrom !== "number" || typeof c.recordedAt !== "number")
            throw new ReportingRefusal("FeedShape", "an assertion lacks its valid-from or record time", { tripleId: c.tripleId });
          const packed = packChangeValue(c.value);
          if (packed.value_type === "protected") this.protectedAttributes.add(c.attribute);
          else if (this.protectedAttributes.has(c.attribute))
            throw new ReportingRefusal("ProtectedValueArrived", "a change of a protected attribute arrived with a value", { attribute: c.attribute, position: j.position });
          inserts.push({
            account, entity: c.entityId, kind: c.entityType ?? null, attribute: c.attribute, assertion_id: c.tripleId,
            ...packed,
            valid_from: dbl(c.validFrom)!, valid_to: dbl(c.validTo ?? null), recorded_position: j.position,
            recorded_at: dbl(c.recordedAt)!, retracted_position: null, retracted_at: null, removed_position: null,
          });
        } else if (c.op === "retract") {
          retracts.push({ account, assertion_id: c.tripleId, position: j.position, at: dbl(c.retractedAt ?? null) });
        } else {
          removals.push({ account, assertion_id: c.tripleId, position: j.position });
        }
      }
    }
    // Assertions first, so a retirement later in the same page finds its row; then retirements, then removals.
    let newColumns = 0;
    if (inserts.length) {
      const inserted = await tx.unsafe(
        `INSERT INTO rpt.facts SELECT ${FACT_SELECT} FROM jsonb_to_recordset($1::text::jsonb) AS x(${FACT_COLUMNS})
         ON CONFLICT (account, assertion_id) DO NOTHING RETURNING assertion_id`, [JSON.stringify(inserts)]);
      if (inserted.length !== inserts.length) {
        const got = new Set(inserted.map((r: any) => r.assertion_id));
        throw new ReportingRefusal("DuplicateAssertion", "an assertion was already in the copy",
          { assertionIds: inserts.filter((r) => !got.has(r.assertion_id)).slice(0, 5).map((r) => r.assertion_id) });
      }
      const entities = new Map<string, { account: string; entity: string; kind: string | null; first_position: number }>();
      for (const r of inserts) {
        const k = `${r.account} ${r.entity}`;
        const e = entities.get(k);
        if (!e) entities.set(k, { account: r.account, entity: r.entity, kind: r.kind, first_position: r.recorded_position });
        else if (e.kind === null && r.kind !== null) e.kind = r.kind;
      }
      await tx.unsafe(
        `INSERT INTO rpt.entities SELECT * FROM jsonb_to_recordset($1::text::jsonb) AS x(account text, entity text, kind text, first_position bigint)
         ON CONFLICT (account, entity) DO UPDATE SET kind = excluded.kind
         WHERE rpt.entities.kind IS NULL AND excluded.kind IS NOT NULL`,
        [JSON.stringify([...entities.values()])]);
      newColumns = await this.recordColumns(tx, inserts, page.journals.at(-1)?.position ?? page.next);
    }
    if (retracts.length) {
      const done = await tx.unsafe(
        `UPDATE rpt.facts f SET retracted_position = x.position, retracted_at = x.at::float8
         FROM jsonb_to_recordset($1::text::jsonb) AS x(account text, assertion_id text, position bigint, at text)
         WHERE f.account = x.account AND f.assertion_id = x.assertion_id AND f.retracted_position IS NULL
         RETURNING f.assertion_id`, [JSON.stringify(retracts)]);
      if (done.length !== new Set(retracts.map((r) => `${r.account} ${r.assertion_id}`)).size)
        throw new ReportingRefusal("MissingAssertion", "a retirement names an assertion the copy does not hold live",
          { expected: retracts.length, found: done.length, first: retracts.slice(0, 3) });
    }
    if (removals.length) {
      // The value was never copied (omitProtected); the row keeps its shape and records the removal's position.
      const done = await tx.unsafe(
        `UPDATE rpt.facts f SET removed_position = x.position,
           value_string = NULL, value_number = NULL, value_boolean = NULL, value_datetime = NULL, value_json = NULL
         FROM jsonb_to_recordset($1::text::jsonb) AS x(account text, assertion_id text, position bigint)
         WHERE f.account = x.account AND f.assertion_id = x.assertion_id
         RETURNING f.assertion_id, f.value_type`, [JSON.stringify(removals)]);
      const notProtected = done.filter((r: any) => r.value_type !== "protected");
      if (notProtected.length)
        throw new ReportingRefusal("RemovedValueWasCopied", "a removal named an assertion whose value the copy held",
          { assertionIds: notProtected.slice(0, 5).map((r: any) => r.assertion_id) });
    }
    if (commits.size)
      await tx.unsafe(
        `INSERT INTO rpt.commits SELECT account, position, tx_id, recorded_at::float8, changes
         FROM jsonb_to_recordset($1::text::jsonb) AS x(account text, position bigint, tx_id text, recorded_at text, changes int)
         ON CONFLICT DO NOTHING`, [JSON.stringify([...commits.values()])]);
    return {
      after: page.after, next: page.next, head: page.head, journals: page.journals.length, changes,
      inserted: inserts.length, retracted: retracts.length, removed: removals.length, skippedByFence: skipped,
      newColumns, availableAt: page.availableAt, newestRecordedAt: newest,
    };
  }

  /** New (kind, attribute, value type) triples get a column name, under the watermark lock (deterministic order). */
  private async recordColumns(tx: Tx, facts: readonly FactRow[], position: number): Promise<number> {
    const wanted = new Map<string, { kind: string; attribute: string; valueType: string }>();
    for (const f of facts)
      if (f.kind !== null && f.kind !== "_Transaction")
        wanted.set(`${f.kind}\u0000${f.attribute}\u0000${f.value_type}`, { kind: f.kind, attribute: f.attribute, valueType: f.value_type });
    if (!wanted.size) return 0;
    const kinds = [...new Set([...wanted.values()].map((w) => w.kind))];
    const existing = await tx`SELECT kind, attribute, value_type, column_name FROM rpt.columns WHERE kind = ANY(${kinds}) ORDER BY ordinal`;
    const have = new Set(existing.map((r) => `${r.kind}\u0000${r.attribute}\u0000${r.value_type}`));
    const used = new Map<string, Set<string>>();
    const attrs = new Map<string, Set<string>>();
    for (const r of existing) {
      (used.get(r.kind) ?? used.set(r.kind, new Set()).get(r.kind)!).add(r.column_name);
      (attrs.get(r.kind) ?? attrs.set(r.kind, new Set()).get(r.kind)!).add(r.attribute);
    }
    let added = 0;
    const grown = new Set<string>();
    for (const [key, w] of wanted) {
      if (have.has(key)) continue;
      const u = used.get(w.kind) ?? used.set(w.kind, new Set()).get(w.kind)!;
      const a = attrs.get(w.kind) ?? attrs.set(w.kind, new Set()).get(w.kind)!;
      if (u.size >= MAX_COLUMNS) {
        await tx`UPDATE rpt.kinds SET status = 'stale', reason = 'TooManyColumns' WHERE kind = ${w.kind}`;
        continue;
      }
      const name = columnName(w.attribute, w.valueType, u, a.has(w.attribute));
      u.add(name);
      a.add(w.attribute);
      grown.add(w.kind);
      await tx`INSERT INTO rpt.columns (kind, attribute, value_type, column_name, added_at_position, status)
        VALUES (${w.kind}, ${w.attribute}, ${w.valueType}, ${name}, ${position}, ${w.valueType === "protected" ? "protected, not copied" : "pending"})`;
      added++;
    }
    for (const kind of grown) {
      const [k] = await tx`SELECT view_name FROM rpt.kinds WHERE kind = ${kind}`;
      if (!k) {
        const taken = new Set((await tx`SELECT view_name FROM rpt.kinds`).map((r) => r.view_name));
        let name = snake(kind);
        for (let i = 2; taken.has(name); i++) name = `${snake(kind)}_${i}`;
        await tx`INSERT INTO rpt.kinds (kind, view_name) VALUES (${kind}, ${name})`;
      }
      await tx`UPDATE rpt.kinds SET status = 'pending' WHERE kind = ${kind} AND status <> 'stale'`;
    }
    return added;
  }

  /**
   * Regenerates the views of kinds with new columns, each in its own transaction with a 2 s lock timeout. A view a
   * reporting query holds keeps its old shape (status 'stale', reason 'ViewBusy') and is retried at the next page.
   */
  async refreshViews(): Promise<{ refreshed: string[]; busy: string[] }> {
    const kinds = await this.sql`SELECT kind, view_name FROM rpt.kinds WHERE status IN ('pending', 'stale') AND coalesce(reason, '') <> 'TooManyColumns'`;
    const refreshed: string[] = [], busy: string[] = [];
    for (const k of kinds) {
      try {
        await this.sql.begin(async (tx) => {
          await tx`SET LOCAL lock_timeout = '2s'`;
          const cols = await tx`SELECT attribute, value_type, column_name FROM rpt.columns WHERE kind = ${k.kind} ORDER BY ordinal`;
          const specs: ColumnSpec[] = cols.map((c) => ({ attribute: c.attribute, valueType: c.value_type, columnName: c.column_name }));
          for (const statement of viewSql(k.kind, k.view_name, specs)) await tx.unsafe(statement);
          await tx`UPDATE rpt.columns SET status = 'live' WHERE kind = ${k.kind} AND status = 'pending'`;
          await tx`UPDATE rpt.kinds SET status = 'live', reason = NULL, generated_at = now() WHERE kind = ${k.kind}`;
        });
        refreshed.push(k.kind);
      } catch (error: any) {
        if (error?.code !== "55P03") throw error;
        busy.push(k.kind);
        await this.sql`UPDATE rpt.kinds SET status = 'stale', reason = 'ViewBusy' WHERE kind = ${k.kind}`;
        this.log("view-busy", { kind: k.kind });
      }
    }
    this.viewsBehind = busy.length > 0;
    return { refreshed, busy };
  }

  /**
   * Rebuilds one account from the store while saves continue: read its whole history at the store's head P, then in
   * one transaction under the watermark lock G replace its rows, catch up (P, G] for that account if G > P, and set its
   * fence to max(P, G).
   */
  async rebuildAccount(account: string, options: { batch?: number; beforeSwap?: () => Promise<void> } = {}) {
    const t0 = performance.now();
    const rebuildId = randomUUID();
    const p = await this.source.head();
    const ids = await this.source.accountIds(account, p);
    // Stage the account's history at P in batches (bounded memory), outside any lock.
    await this.sql`DELETE FROM rpt.rebuild_facts WHERE account = ${account}`;
    const batch = options.batch ?? 100;
    let staged = 0;
    for (let i = 0; i < ids.length; i += batch) {
      const rows = (await this.source.history(ids.slice(i, i + batch), p))
        .filter((r) => r.entity_type !== "_Transaction" && accountOf(r.entity_id) === account).map(factFromStoreRow);
      if (!rows.length) continue;
      await this.sql.unsafe(`INSERT INTO rpt.rebuild_facts SELECT $2::uuid, ${FACT_SELECT} FROM jsonb_to_recordset($1::text::jsonb) AS x(${FACT_COLUMNS})`,
        [JSON.stringify(rows), rebuildId]);
      staged += rows.length;
    }
    const readMs = performance.now() - t0;
    await options.beforeSwap?.();
    const t1 = performance.now();
    const result = await this.sql.begin(async (tx) => {
      const [state] = await tx`SELECT after_position FROM rpt.feed_state FOR UPDATE`;
      if (!state) throw new ReportingRefusal("NotStarted", "start the copy before rebuilding an account");
      const g = Number(state.after_position);
      await tx`DELETE FROM rpt.facts WHERE account = ${account}`;
      await tx`DELETE FROM rpt.entities WHERE account = ${account}`;
      await tx.unsafe(`INSERT INTO rpt.facts SELECT ${FACT_TABLE_COLUMNS} FROM rpt.rebuild_facts WHERE rebuild_id = $1`, [rebuildId]);
      await tx`INSERT INTO rpt.entities (account, entity, kind, first_position)
        SELECT account, entity, (array_agg(kind ORDER BY recorded_position) FILTER (WHERE kind IS NOT NULL))[1], min(recorded_position)
        FROM rpt.facts WHERE account = ${account} GROUP BY account, entity`;
      const kinds = await tx`SELECT kind, attribute, value_type, min(recorded_position) AS first FROM rpt.facts
        WHERE account = ${account} AND kind IS NOT NULL GROUP BY 1, 2, 3 ORDER BY 4, 1, 2, 3`;
      const newColumns = kinds.length
        ? await this.recordColumns(tx, kinds.map((k) => ({ kind: k.kind, attribute: k.attribute, value_type: k.value_type }) as unknown as FactRow), p)
        : 0;
      // Catch up the journals the projector applied while this rebuild read (P, G], for this account only.
      let caught = 0;
      for (let after = p; after < g; ) {
        const page = await this.source.page(after, this.pageLimit, 0);
        const slice = { ...page, journals: page.journals.filter((j) => j.position <= g), next: Math.min(page.next, g) };
        const s = await this.applyJournals(tx, slice, account, p);
        caught += s.changes;
        if (slice.next <= after) throw new ReportingRefusal("FeedShape", "catch-up made no progress");
        after = slice.next;
      }
      const fence = Math.max(p, g);
      await tx`INSERT INTO rpt.account_state (account, fence_position) VALUES (${account}, ${fence})
        ON CONFLICT (account) DO UPDATE SET fence_position = excluded.fence_position, rebuilt_at = now()`;
      await tx`DELETE FROM rpt.rebuild_facts WHERE rebuild_id = ${rebuildId}`;
      return { account, position: p, watermark: g, fence, ids: ids.length, facts: staged, caughtUp: caught, newColumns };
    });
    if (result.newColumns) await this.refreshViews();
    return { ...result, readMs, swapMs: performance.now() - t1 };
  }

  /** Follows until `until()` is true, retrying transient store errors (restarts, a removal being applied). */
  async follow(until: () => boolean, onPage?: (s: PageStats) => void): Promise<void> {
    let backoff = 50;
    while (!until()) {
      try {
        const s = await this.step();
        backoff = 50;
        if (s) onPage?.(s);
      } catch (error) {
        if (!transient(error)) throw error;
        this.log("retry", { message: String((error as Error).message).slice(0, 200) });
        await new Promise((r) => setTimeout(r, backoff));
        backoff = Math.min(2000, backoff * 2);
      }
    }
  }
}

/** Errors worth retrying: the store or the copy's PostgreSQL restarting, a removal being applied, a busy reader. */
export function transient(error: unknown): boolean {
  if (error instanceof ReportingRefusal) return false;
  const e = error as { _tag?: string; status?: number; code?: string; message?: string };
  if (e?._tag === "DatomicTransportError") return true;
  if (e?._tag === "DatomicHttpError") return (e.status ?? 0) >= 500 || e.code === "ErasureFrontierChanged" || e.code === "AtLeastTimeout";
  if (typeof e?.code === "string" && /^(ECONNREFUSED|ECONNRESET|EPIPE|ETIMEDOUT|CONNECTION_CLOSED|CONNECTION_ENDED|CONNECTION_DESTROYED|57P01|57P02|57P03)$/.test(e.code)) return true;
  return /fetch failed|socket hang up|ECONNREFUSED|ECONNRESET/.test(String(e?.message ?? ""));
}

function emptyStats(page: JournalPage) {
  return { after: page.after, next: page.next, head: page.head, journals: 0, changes: 0, inserted: 0, retracted: 0,
    removed: 0, skippedByFence: 0, newColumns: 0, availableAt: page.availableAt, newestRecordedAt: null };
}
