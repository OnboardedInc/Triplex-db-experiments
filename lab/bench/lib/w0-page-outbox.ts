import { canonical, sha256, W0, type WorldRow } from "./w0-world.ts";
import { parseOutbox, readOutboxAt } from "./w0-outbox-state.ts";
import type { OutboxStore, PublicationOptions } from "./w0-outbox.ts";

export interface SweepRoster {
  subjects: readonly string[];
  basis: W0.RecordBasis;
  release: string;
}
export interface PageSpan {
  roster: string;
  size: number;
  first: number;
  count: number;
  basis: W0.RecordBasis;
  release: string;
}
const domain = () =>
  "p5:pages:v1:" + encodeURIComponent(process.env.TX2_W0_OUTBOX_NAMESPACE ?? "") + ":";
// [DX-ACT1] Why: every ordinary publisher reopening the same named page namespace must consult its fence, including the first writer on an empty page. Rejected: making live callers remember to repeat a per-call layout hint.
export function pageNamespace(id: string) {
  if (!/^[a-z0-9-]+$/.test(id)) throw Error("Invalid page namespace");
  return "page-v1~" + id;
}
export function pageLayout(layout: PublicationOptions["layout"]) {
  if (!process.env.TX2_W0_OUTBOX_NAMESPACE?.startsWith("page-v1~")) return layout;
  if (layout && layout !== "page-cut") throw Error("Conflicting layout for page namespace");
  return "page-cut" as const;
}
export function pageAddress(subject: string) {
  const number = /^pl:s([0-9]{8})$/.exec(subject);
  const i = number ? Number(number[1]) : 0;
  const key = number ? "n" + Math.floor(i / 256) : "s" + encodeURIComponent(subject);
  return {
    key,
    bit: 1n << BigInt(i % 256),
    page: domain() + "p:" + key,
    body: domain() + "b:" + subject,
  };
}
export const pageRoots = (subjects: readonly string[]) => [
  ...new Set(
    subjects.flatMap((s) => {
      const { page, body } = pageAddress(s);
      return [page, body];
    }),
  ),
];

type Band = { basis: W0.RecordBasis; bits: string };
type Header = {
  version: number;
  key: string;
  bands: Band[];
  bodies: string;
  ack: {
    input: string;
    members: string;
    advanced: string;
    written: string;
    span: PageSpan | null;
  };
};
const hex = (n: bigint) => n.toString(16);
function mask(value: string) {
  if (!/^(0|[1-9a-f][0-9a-f]{0,63})$/.test(value)) throw Error("Invalid page mask");
  return BigInt("0x" + value);
}
function unpack(h: Header, key: string) {
  if (h.key !== key || h.version !== 1 || !Array.isArray(h.bands))
    throw Error("Invalid page identity");
  const bases = new Map<string, { basis: W0.RecordBasis; bits: bigint }>();
  let covered = 0n;
  for (const band of h.bands) {
    const bits = mask(band.bits),
      basis = band.basis;
    if (
      !bits ||
      covered & bits ||
      typeof basis?.tx !== "bigint" ||
      typeof basis.validTime !== "string" ||
      bases.has(canonical(basis))
    )
      throw Error("Ambiguous page basis");
    bases.set(canonical(basis), { basis, bits });
    covered |= bits;
  }
  const bodies = mask(h.bodies);
  if (bodies & ~covered || (key.startsWith("s") && covered & ~1n))
    throw Error("Invalid page membership");
  return { bases, bodies };
}
const assertString = (entityId: string, attribute: string, bytes: string) => ({
  op: "assert",
  entityId,
  attribute,
  value: { type: "string", value: bytes },
  validFrom: 0,
});
function storedBody(row: Pick<WorldRow, "attribute" | "value">) {
  if (row.attribute !== "p5/page-body" || row.value.type !== "string")
    throw Error("Invalid paged body");
  const body = parseOutbox(row.value.value) as {
    items: W0.ItemState[];
    pending: W0.Delivery[];
    delivered: number;
  };
  if (
    !Array.isArray(body.items) ||
    !Array.isArray(body.pending) ||
    !Number.isSafeInteger(body.delivered) ||
    body.delivered < 0 ||
    body.delivered > body.pending.length
  )
    throw Error("Invalid paged delivery count");
  return body;
}
export async function publishPage(
  store: OutboxStore,
  inputRecords: readonly W0.EvaluationRecord[],
  inputSpan: PageSpan | undefined,
  beforeSubmit: () => Promise<void>,
  eventId?: string,
) {
  const records = structuredClone(inputRecords),
    span = inputSpan ? structuredClone(inputSpan) : undefined;
  const addresses = records.map((r) => pageAddress(r.subject)),
    owner = addresses[0];
  if (
    !owner ||
    addresses.some((a) => a.page !== owner.page) ||
    new Set(records.map((r) => r.subject)).size !== records.length
  )
    throw Error("Page transaction needs distinct subjects from one stable page");
  if (
    span &&
    (!/^[0-9a-f]{64}$/.test(span.roster) ||
      !Number.isSafeInteger(span.size) ||
      !Number.isSafeInteger(span.first) ||
      span.first < 0 ||
      span.first + records.length > span.size ||
      span.count !== records.length ||
      records.some(
        (r) => r.release !== span.release || canonical(r.basis) !== canonical(span.basis),
      ))
  )
    throw Error("Wrong publication range");
  const members = addresses.reduce((m, a) => m | a.bit, 0n);
  const input = sha256(
    canonical({
      scope: store.scopeName ?? "",
      page: owner.page,
      records,
      span: span ?? null,
      eventId: eventId ?? null,
    }),
  );
  // [DX-ACT1] Why: a retried ordinal range must find its original claim even if a caller changes the frame geometry or supplies different output bytes. Rejected: giving divergent bytes a second sweep command.
  const claimKey = span
    ? sha256(
        canonical({
          scope: store.scopeName ?? "",
          roster: span.roster,
          size: span.size,
          basis: span.basis,
          release: span.release,
          first: span.first,
        }),
      )
    : eventId !== undefined
      ? sha256(canonical({ scope: store.scopeName ?? "", page: owner.page, eventId }))
      : input;
  const commandId = domain() + (span ? "range:" : "live:") + claimKey;
  let conflicts = 0,
    stateReads = 0,
    stateReadMs = 0,
    commandReads = 0,
    publishCommitMs = 0,
    bodyPrepareMs = 0,
    guardPrepareMs = 0;
  const decode = (r: any, retry: boolean, expected?: Map<string, string>) => {
    const rows = r.changes?.filter((x: any) => x.op === "assert") ?? r.triples;
    if (
      !Array.isArray(rows) ||
      !r.txId ||
      !Number.isSafeInteger(r.position) ||
      r.position < 1 ||
      (retry && r.commandId !== commandId)
    )
      throw Error("Invalid page transaction receipt");
    const byEntity = new Map<string, WorldRow>(rows.map((x: any) => [x.entityId, x]));
    if (byEntity.size !== rows.length) throw Error("Duplicate page receipt assertion");
    const marker = byEntity.get(owner.page);
    if (marker?.attribute !== "p5/page-cut" || marker.value.type !== "string")
      throw Error("Page receipt missing fence");
    const h: Header = parseOutbox(marker.value.value);
    unpack(h, owner.key);
    const ack = h.ack,
      advanced = mask(ack.advanced),
      written = mask(ack.written);
    if (
      ack.input !== input ||
      mask(ack.members) !== members ||
      advanced & ~members ||
      written & ~advanced ||
      canonical(ack.span) !== canonical(span ?? null)
    )
      throw Error("Page receipt input mismatch");
    if (
      expected &&
      (expected.size !== byEntity.size ||
        [...expected].some(([k, v]) => byEntity.get(k)?.value?.value !== v))
    )
      throw Error("Committed page content mismatch");
    const deliveries: W0.Delivery[] = [];
    let changed = 0,
      bodies = 0;
    for (const a of addresses) {
      if (advanced & a.bit) changed++;
      if (!(written & a.bit)) continue;
      const row = byEntity.get(a.body);
      if (!row) throw Error("Missing committed page body");
      const b = storedBody(row);
      bodies++;
      if (b.delivered) deliveries.push(...b.pending.slice(-b.delivered));
    }
    if (byEntity.size !== bodies + 1) throw Error("Unexpected page receipt assertions");
    return {
      deliveries,
      retry,
      changed,
      bodies,
      committed: true,
      txId: r.txId as string,
      position: r.position as number,
      span: ack.span,
      input,
      commandId,
      members: ack.members,
    };
  };
  const lookup = async () => {
    commandReads++;
    const r = await store.transactionByCommand(commandId);
    if (!r.ok) throw Error(r.tag);
    return r.value ? decode(r.value, true) : undefined;
  };
  for (;;) {
    const previous = await lookup();
    if (previous) return previous;
    const t = performance.now(),
      head = await store.currentPosition();
    const fence = await readOutboxAt(store, [owner.page], head);
    stateReads += fence.reads;
    if (
      fence.rows.length > 1 ||
      fence.rows.some(
        (r) =>
          r.entityId !== owner.page || r.attribute !== "p5/page-cut" || r.value.type !== "string",
      )
    )
      throw Error("Ambiguous page fence");
    const old = fence.rows[0];
    const prior = old
      ? unpack(parseOutbox(old.value.value), owner.key)
      : { bases: new Map<string, { basis: W0.RecordBasis; bits: bigint }>(), bodies: 0n };
    const needed = addresses.filter((a) => !!(a.bit & prior.bodies)).map((a) => a.body);
    const stored = await readOutboxAt(store, needed, head);
    stateReads += stored.reads;
    const bodyRows = new Map(stored.rows.map((r) => [r.entityId, r]));
    if (
      bodyRows.size !== needed.length ||
      bodyRows.size !== stored.rows.length ||
      needed.some((id) => !bodyRows.has(id))
    )
      throw Error("Page body membership differs at pinned cut");
    stateReadMs += performance.now() - t;
    const ops: any[] = [],
      expected = new Map<string, string>();
    let advanced = 0n,
      written = 0n,
      bodyBits = prior.bodies;
    const set = (id: string, attr: string, value: unknown) => {
      const bytes = canonical(value);
      ops.push(assertString(id, attr, bytes));
      expected.set(id, bytes);
    };
    const prepareBody = performance.now();
    for (const [i, r] of records.entries()) {
      const a = addresses[i]!,
        previousBand = [...prior.bases.values()].find((b) => !!(b.bits & a.bit));
      const row = bodyRows.get(a.body),
        b = row ? storedBody(row) : W0.EMPTY_OUTBOX;
      const state = {
        items: b.items,
        pending: b.pending,
        subjects: previousBand ? [{ subject: r.subject, basis: previousBand.basis }] : [],
      };
      const next = W0.publish(state, [r]),
        through = next.state.subjects[0]!.basis;
      const bodyChanged =
        next.deliveries.length > 0 || canonical(next.state.items) !== canonical(state.items);
      const id = canonical(through);
      if (!bodyChanged && previousBand && canonical(previousBand.basis) === id) continue;
      advanced |= a.bit;
      if (previousBand) previousBand.bits &= ~a.bit;
      const band = prior.bases.get(id) ?? { basis: through, bits: 0n };
      band.bits |= a.bit;
      prior.bases.set(id, band);
      if (bodyChanged) {
        written |= a.bit;
        bodyBits |= a.bit;
        if (row) ops.push({ op: "retract", id: row.id });
        set(a.body, "p5/page-body", {
          items: next.state.items,
          pending: next.state.pending,
          delivered: next.deliveries.length,
        });
      }
    }
    const prepareGuard = performance.now(),
      bodyFacts = ops.length;
    bodyPrepareMs += prepareGuard - prepareBody;
    // [DX-ACT1] Why: an identified no-op live command must recover its original empty delivery after a different equal-basis decision. Rejected: recomputing it on retry after the other decision commits.
    if (!advanced && !span && eventId === undefined)
      return (
        (await lookup()) ?? {
          deliveries: [],
          retry: false,
          changed: 0,
          bodies: 0,
          committed: false,
        }
      );
    if (old) ops.push({ op: "retract", id: old.id });
    const bands = [...prior.bases.values()]
      .filter((b) => b.bits)
      .map((b) => ({ basis: b.basis, bits: hex(b.bits) }));
    set(owner.page, "p5/page-cut", {
      version: 1,
      key: owner.key,
      bands,
      bodies: hex(bodyBits),
      ack: {
        input,
        members: hex(members),
        advanced: hex(advanced),
        written: hex(written),
        span: span ?? null,
      },
    });
    // [DX-ACT1] Why: all member-body writers replace this single fence, even for a different record at equal basis. Rejected: fencing just changed bodies or validating an empty page with no precondition.
    const preconditions = old
      ? [{ _tag: "TripleLive", id: old.id }]
      : [{ _tag: "EntityState", entityId: owner.page, tripleIds: [] }];
    guardPrepareMs += performance.now() - prepareGuard;
    await beforeSubmit();
    const start = performance.now();
    const result = await store.transact(ops, { commandId, actor: "p5-publisher", preconditions });
    publishCommitMs += performance.now() - start;
    if (result.ok)
      return {
        ...decode(result.value, false, expected),
        timing: {
          receiptTxId: result.value.txId,
          receiptPosition: result.value.position,
          stateReads,
          stateReadMs,
          commandReads,
          conflicts,
          publishCommitMs,
          operations: ops.length,
          bodyFacts,
          guardFacts: ops.length - bodyFacts,
          bodyPrepareMs,
          guardPrepareMs,
          preconditions: 1,
          payloadBytes: Buffer.byteLength(JSON.stringify(ops)),
        },
      };
    const reasons = result.error?.reasons;
    const tag =
      result.tag === "Unknown" && reasons?.length === 1 && reasons[0]._tag === "Fail"
        ? reasons[0].error?._tag
        : result.tag;
    if (
      !["TransactionConflictError", "CommandAlreadyCommittedError"].includes(tag) ||
      ++conflicts > 16
    )
      throw Error("Page publication failed: " + tag);
  }
}

export async function publishPages(
  records: Pick<readonly W0.EvaluationRecord[], "length" | "slice">,
  options: PublicationOptions,
  submit: (
    frame: W0.EvaluationRecord[],
    span?: PageSpan,
  ) => Promise<Awaited<ReturnType<typeof publishPage>>>,
) {
  const start = performance.now(),
    roster = options.roster
      ? {
          ...options.roster,
          subjects: [...options.roster.subjects],
          basis: { ...options.roster.basis },
        }
      : undefined,
    frameSize = options.frameSize ?? 256;
  if (
    roster &&
    (roster.subjects.length !== records.length ||
      roster.subjects.some((s, i) => i > 0 && W0.cmpCodePoints(roster.subjects[i - 1]!, s) >= 0))
  )
    throw Error("Invalid independent release roster");
  const hash = roster ? sha256(canonical(roster.subjects)) : "";
  const responses: Awaited<ReturnType<typeof publishPage>>[] = [];
  let frame: W0.EvaluationRecord[] = [],
    first = 0,
    key = "",
    changed = 0,
    commits = 0,
    stateReadMs = 0,
    bodies = 0;
  const receiptHashes: string[] = [];
  const flush = async () => {
    const span = roster
      ? {
          roster: hash,
          size: records.length,
          first,
          count: frame.length,
          basis: roster.basis,
          release: roster.release,
        }
      : undefined;
    const response = await submit(frame, span);
    if (span) {
      if (!("span" in response) || canonical(response.span) !== canonical(span))
        throw Error("Missing covered range receipt");
      receiptHashes.push(
        sha256(
          canonical([span, response.input, response.txId, response.position, response.members]),
        ),
      );
    }
    responses.push(response);
    changed += response.changed;
    bodies += response.bodies;
    commits += Number(response.committed);
    stateReadMs += ("timing" in response ? response.timing?.stateReadMs : 0) ?? 0;
    first += frame.length;
    frame = [];
    if (options.gapMs) await new Promise((resolve) => setTimeout(resolve, options.gapMs));
  };
  for (let i = 0; i < records.length; i += 64)
    for (const r of records.slice(i, i + 64)) {
      const page = pageAddress(r.subject).key;
      if (frame.length && (page !== key || frame.length === frameSize)) await flush();
      if (
        roster &&
        (r.subject !== roster.subjects[first + frame.length] ||
          r.release !== roster.release ||
          canonical(r.basis) !== canonical(roster.basis))
      )
        throw Error("Evaluation differs from roster/release/cut");
      frame.push(r);
      key = page;
    }
  if (frame.length) await flush();
  if (first !== records.length) throw Error("Incomplete release coverage");
  return {
    changed,
    commits,
    bodies,
    wallMs: performance.now() - start,
    stateReadMs,
    frameSize,
    inflight: 1,
    gapMs: options.gapMs ?? 0,
    yieldToWriter: !!options.yieldToWriter,
    maxWriterYieldMs: options.yieldToWriter ? (options.maxWriterYieldMs ?? 50) : 0,
    responses,
    coverage: roster
      ? {
          roster: hash,
          size: first,
          pages: receiptHashes.length,
          receipts: sha256(canonical(receiptHashes)),
        }
      : undefined,
  };
}
