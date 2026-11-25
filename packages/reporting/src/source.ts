// [DX-RPT1] What the projector reads from the store, all on the read gateway and all read-only: bounded journal pages
// and whole-history row reads, both with "omitProtected": true, the ID list route for a rebuild, and the head.
// Every answer that could carry a value must echo "omittedProtected": true, or the projector refuses it.
// Rejected: the identity-only /v1/db/{db}/log feed (no values); the SDK's getTransactionsAfter (drops the echo and the
// bounded page's watermark `next`).
import { DatomicClient, decodeRowText, validateTagged } from "@triplex-build/triplex-datomic";

export class ReportingRefusal extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly detail: Record<string, unknown> = {},
  ) {
    super(`${code}: ${message}`);
  }
}

export interface ChangeRecord {
  readonly op: "assert" | "retract" | "erase";
  readonly tripleId: string;
  readonly entityId: string;
  readonly attribute: string;
  readonly entityType?: string;
  readonly value?: { readonly type: string; readonly value?: unknown; readonly [k: string]: unknown };
  readonly validFrom?: number;
  readonly validTo?: number | null;
  readonly recordedAt?: number;
  readonly retractedAt?: number;
  readonly erasureSeq?: number;
}
export interface Journal {
  readonly txId: string;
  readonly position: number;
  readonly recordedAt: number | null;
  readonly changes: readonly ChangeRecord[];
}
export interface JournalPage {
  readonly after: number;
  readonly next: number;
  readonly head: number;
  readonly availableAt: number;
  readonly stopped: string;
  readonly journals: readonly Journal[];
}
export interface StoreRow {
  readonly id: string;
  readonly entity_id: string;
  readonly attribute: string;
  readonly value_type: string;
  readonly value_string: string | null;
  readonly value_number: number | null;
  readonly value_boolean: number | boolean | null;
  readonly value_datetime: number | null;
  readonly value_json: string | null;
  readonly recorded_at: number;
  readonly recorded_position: number;
  readonly valid_from: number;
  readonly valid_to: number | null;
  readonly retracted_at: number | null;
  readonly retracted_position: number | null;
  readonly entity_type: string | null;
}

export class StoreSource {
  readonly client: DatomicClient;
  requests: Record<string, number> = {};
  constructor(
    readonly readerUrl: string,
    readonly db: string,
    timeoutMs = 60_000,
  ) {
    this.client = new DatomicClient(readerUrl, timeoutMs);
  }
  private count(route: string) {
    this.requests[route] = (this.requests[route] ?? 0) + 1;
  }

  async head(): Promise<number> {
    this.count("basis");
    const basis = await this.client.basis(this.db);
    return Number((basis as any).position.v);
  }

  /** One bounded journal page after `after`, waiting up to waitMs for the first journal. */
  async page(after: number, limit: number, waitMs: number): Promise<JournalPage> {
    this.count("transactions");
    const raw = await this.client.request<any>(
      "POST",
      `/v2/db/${this.db}/transactions`,
      { after, limit, waitMs, bounded: true, omitProtected: true },
      Math.max(30_000, waitMs + 10_000),
    );
    if (raw.declined !== undefined) throw new ReportingRefusal("FeedDeclined", `the journal declined: ${raw.declined}`);
    if (raw.omittedProtected !== true)
      throw new ReportingRefusal("ProtectedOmissionMissing", "the gateway did not confirm it omitted protected values");
    if (!Array.isArray(raw.transactions) || !Number.isSafeInteger(raw.next) || typeof raw.stopped !== "string")
      throw new ReportingRefusal("FeedShape", "a bounded journal page needs transactions, next and stopped");
    if (raw.next < after) throw new ReportingRefusal("FeedShape", "the journal cursor moved backwards", { after, next: raw.next });
    let prior = after;
    const journals: Journal[] = raw.transactions.map(([txId, position, texts]: [string, number, string[]]) => {
      if (!Number.isSafeInteger(position) || position <= prior)
        throw new ReportingRefusal("FeedOrder", "journal positions must increase", { prior, position });
      prior = position;
      let recordedAt: number | null = null;
      const changes: ChangeRecord[] = [];
      for (const text of texts) {
        const row = decodeRowText(text);
        if (row.entity_type !== "_Transaction" || row.entity_id !== txId) continue;
        if (row.attribute === ":_tx/instant") recordedAt = row.value_datetime;
        if (row.attribute === ":_tx/change") {
          const c = JSON.parse(String(row.value_json)) as ChangeRecord;
          if (!["assert", "retract", "erase"].includes(c.op) || typeof c.tripleId !== "string" ||
              typeof c.entityId !== "string" || typeof c.attribute !== "string")
            throw new ReportingRefusal("FeedShape", "a change record lacks its op or identity", { txId, position });
          changes.push(c);
        }
      }
      return { txId, position, recordedAt, changes };
    });
    if (journals.length && raw.next < journals.at(-1)!.position)
      throw new ReportingRefusal("FeedShape", "the page's watermark is below its last journal");
    return { after, next: raw.next, head: Number(raw.head), availableAt: Number(raw.availableAt), stopped: raw.stopped, journals };
  }

  /** Every entity ID of one account at a position (XQ3's ID list route, TX2_ID_LISTS=1 on the reader). */
  async accountIds(account: string, position: number): Promise<string[]> {
    const ids: string[] = [];
    let cursor: string | undefined;
    for (;;) {
      this.count("ids");
      const page = await this.client.request<any>("POST", `/v2/db/${this.db}/ids`, {
        account,
        prefix: "",
        limit: 1000,
        ...(cursor ? { cursor } : { basis: { recordedPosition: position } }),
        bounds: { entries: 100_000, ms: 1000 },
      });
      if (page.code) throw new ReportingRefusal("IdListsUnavailable", String(page.message ?? page.code));
      if (page.position !== position) throw new ReportingRefusal("IdListPosition", "the ID list answered at another position", { position, got: page.position });
      ids.push(...page.ids);
      if (!page.next) return ids;
      cursor = page.next;
    }
  }

  /** The whole history of the named entities at a position, protected values omitted. */
  async history(entityIds: readonly string[], position: number): Promise<StoreRow[]> {
    this.count("read");
    const raw = await this.client.request<{ rows: Record<string, unknown>[]; omittedProtected?: boolean }>("POST", `/v1/db/${this.db}/read`, {
      pattern: {},
      entityIds,
      history: true,
      basis: { recordedPosition: position, validAt: 0 },
      omitProtected: true,
    });
    if (raw.omittedProtected !== true)
      throw new ReportingRefusal("ProtectedOmissionMissing", "the gateway did not confirm it omitted protected values");
    return raw.rows.map(decodeWireRow);
  }
}

/** The account an entity belongs to: `acct/<account>/...`, else `_system` (configuration, settlement documents). */
export function accountOf(entityId: string): string {
  if (entityId.startsWith("acct/")) {
    const end = entityId.indexOf("/", 5);
    if (end > 5) return entityId.slice(5, end);
  }
  return "_system";
}

// The gateway's tagged wire row, decoded without the SDK's value-domain check (which has no "protected" type).
export function decodeWireRow(row: Record<string, unknown>): StoreRow {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) {
      out[key] = null;
      continue;
    }
    const tag = validateTagged(value as any) as { t: string; v: unknown };
    out[key] = tag.t === "long" ? Number(tag.v) : tag.v;
  }
  return out as unknown as StoreRow;
}
