import assert from "node:assert/strict";
import { W0, canonical, sha256 } from "../../../../bench/lib/w0-world.ts";
import { Documents, pack, unpack, type Op, type Row } from "../../notify1/store.ts";
import type { NoticeCandidate } from "./recorded.ts";
import { FrameTooLarge, frameEstimate } from "./frames.ts";

// [DX-ACT6] Why: a subject's notice ledger (the state of each of its notice work items) is one packed value, written
// whole with the subject's last deliveries. At about 200 owed forms that value alone exceeds the writer's bound (8 ms of
// estimated service, 64 KiB of estimated wire), so the frame was refused and settlement stopped. With
// `TX2_NOTICE_LEDGER=parts` (needs `TX2_SETTLE_FRAMES=bytes`) a ledger longer than one part is written as numbered parts
// before the subject's ledger head, and the head (which names the parts and the SHA-256 of the whole) is the closing
// piece: the ledger a reader sees switches from the earlier state to the new one in exactly one commit, the head's.
// Parts are ordinary units of the subject in the byte frames, so a frame never exceeds the bound, a restart in the
// middle recomputes the same parts (same old ledger, same release, same work items) and skips those the cursor already
// counts. A ledger that fits one part is written exactly as before (the same value under the same key), so the small
// release is unchanged with the option set. Unset, nothing here is used.
// Rejected: one row per item (two rows per changed item at 225 us of estimated service each: about 450 ms of writer
// time per subject at 1,000 owed forms, against about 75 ms in parts), and splitting the ledger by item across several
// commits (a reader would see a ledger half old and half new).
export type LedgerMode = "whole" | "parts";
export function ledgerMode(value = process.env.TX2_NOTICE_LEDGER): LedgerMode {
  assert(value === undefined || value === "" || value === "parts", "TX2_NOTICE_LEDGER is unset or parts");
  return value === "parts" ? "parts" : "whole";
}
/** Characters of the packed ledger per part: one part with the cursor change is about 7.2 ms of estimated service. */
export const ledgerPartChars = 10240;
/** The head's frame also retracts the old ledger's parts, beside the cursor change. A ledger is kept to as many parts as
 * that frame can retract within the writer's bound by the estimate in force (both its service and its wire limit, so
 * also under a calibrated TX2_SETTLE_COST): 10 by the default estimate (7,985 us; 11 would be 8,224), about 1,680 owed
 * notice items on the synthetic forms (60.8 packed characters each). So the next release can always replace it. */
export function ledgerPartsMax() {
  const db = new Documents({ scopeName: "ledger-parts-max" } as never, "settlement-notices-" + "x".repeat(24));
  const sha = "0".repeat(64);
  // A cursor and head as large as they get: 64-hex hashes, large counters, the longest subject ids.
  const cursor = { epoch: "0".repeat(26), event: 999999, start: 999999, parent: sha, batch: 999999999, previous: sha,
    entries: 999999999999, frames: "bytes", part: 999999, ledger: "parts", erasureSeq: 999999 };
  const head = (n: number): LedgerHead => ({ parts: n, event: 999999, chars: n * ledgerPartChars, sha });
  const id = "f".repeat(40);
  const frame = (k: number) => [
    ...Array.from({ length: k }, () => ({ op: "retract" as const, id })),
    { op: "retract" as const, id },
    db.put(ledgerKey("pl:s99999999"), head(k + 1)),
    { op: "retract" as const, id },
    db.put("notice-progress", cursor),
  ];
  let k = 0;
  while (k < 4096 && frameEstimate(frame(k + 1)).fits) k++;
  // A part itself (with the cursor change) must fit too, or nothing can be written in parts.
  const part = [db.put(ledgerPartKey("pl:s99999999", 999999, 99), "A".repeat(ledgerPartChars)), { op: "retract" as const, id }, db.put("notice-progress", cursor)];
  assert(frameEstimate(part).fits, "One ledger part does not fit the writer's bound under this estimate");
  return Math.max(k, 1);
}
let partsMax: number | undefined;
export const ledgerKey = (subject: string) => "recorded-ledger:" + subject;
export const ledgerPartKey = (subject: string, event: number, i: number) =>
  "recorded-ledger-part:" + subject + ":" + event + ":" + i;
/** The head of a ledger written in parts. A ledger that fits one part keeps its old form: the packed string itself. */
export type LedgerHead = { parts: number; event: number; chars: number; sha: string };
export type Ledger = { items: W0.ItemState[]; head?: Row<string | LedgerHead>; parts: Row<string>[] };

/** Every subject's ledger at `at`: the head and, for a ledger in parts, each part, joined and checked. */
export async function readLedgers(db: Pick<Documents, "rows">, subjects: readonly string[], at: number) {
  const heads = await db.rows<string | LedgerHead>(subjects.map(ledgerKey), at);
  const wanted: string[] = [];
  for (const s of subjects) {
    const h = heads.get(ledgerKey(s))?.value;
    if (h !== undefined && typeof h !== "string")
      for (let i = 0; i < h.parts; i++) wanted.push(ledgerPartKey(s, h.event, i));
  }
  const parts = new Map<string, Row<string>>();
  for (let i = 0; i < wanted.length; i += 64)
    for (const [k, r] of await db.rows<string>(wanted.slice(i, i + 64), at)) parts.set(k, r);
  const out = new Map<string, Ledger>();
  for (const s of subjects) {
    const head = heads.get(ledgerKey(s));
    if (!head) {
      out.set(s, { items: [], parts: [] });
      continue;
    }
    if (typeof head.value === "string") {
      out.set(s, { items: unpack<W0.ItemState[]>(head.value), head, parts: [] });
      continue;
    }
    const h = head.value,
      rows: Row<string>[] = [];
    assert(Number.isSafeInteger(h.parts) && h.parts >= 2 && Number.isSafeInteger(h.event) && h.event >= 1);
    for (let i = 0; i < h.parts; i++) {
      const r = parts.get(ledgerPartKey(s, h.event, i));
      assert(r && typeof r.value === "string" && r.at <= head.at, "Ledger part missing under its head: " + s);
      rows.push(r);
    }
    const whole = rows.map((r) => r.value).join("");
    assert(whole.length === h.chars && sha256(whole) === h.sha, "Ledger parts differ from their head: " + s);
    out.set(s, { items: unpack<W0.ItemState[]>(whole), head, parts: rows });
  }
  return out;
}

/** The ops that replace `old` by `items`: `parts` (written first, unreachable until the head) and `closing` (the head
 * change and the retraction of the old ledger's parts, in one commit). Pure; empty when the ledger does not change. */
export function ledgerChange(db: Documents, subject: string, event: number, old: Ledger, items: readonly W0.ItemState[]) {
  if (canonical(items) === canonical(old.items)) return { parts: [] as Op[], closing: [] as Op[] };
  const packed = pack(items),
    retire: Op[] = old.parts.map((r) => ({ op: "retract" as const, id: r.id }));
  if (packed.length <= ledgerPartChars)
    return { parts: [] as Op[], closing: [...retire, ...db.change(ledgerKey(subject), old.head, packed)] };
  const count = Math.ceil(packed.length / ledgerPartChars);
  partsMax ??= ledgerPartsMax();
  if (count > partsMax)
    throw new FrameTooLarge(
      "Subject " + subject + ": its notice ledger needs " + count + " parts of " + ledgerPartChars + " characters (" +
        items.length + " items); at most " + partsMax + " can be replaced within the writer's bound",
    );
  const parts = Array.from({ length: count }, (_, i) =>
    db.put(ledgerPartKey(subject, event, i), packed.slice(i * ledgerPartChars, (i + 1) * ledgerPartChars)),
  );
  const head: LedgerHead = { parts: count, event, chars: packed.length, sha: sha256(packed) };
  return { parts: parts as Op[], closing: [...retire, ...db.change(ledgerKey(subject), old.head, head)] };
}

/** One subject's notice candidate for the byte frames: its deliveries, then (in parts mode) its ledger parts, as units;
 * the ledger head as the closing piece. `whole` keeps the earlier shape (the ledger change is the closing piece). */
export function noticeCandidate(
  db: Documents,
  subject: string,
  event: number,
  old: Ledger,
  result: { deliveries: W0.Delivery[]; state: { items: readonly W0.ItemState[] } },
  mode: LedgerMode,
): NoticeCandidate {
  if (mode === "whole") {
    assert(old.parts.length === 0, "A ledger in parts needs TX2_NOTICE_LEDGER=parts");
    const ledger =
      canonical(result.state.items) !== canonical(old.items)
        ? db.change(ledgerKey(subject), old.head as Row<string> | undefined, pack(result.state.items))
        : [];
    return { subject, units: result.deliveries, deliveries: result.deliveries.length, closing: ledger.length > 0, ledger };
  }
  const change = ledgerChange(db, subject, event, old, result.state.items);
  return {
    subject,
    units: [...result.deliveries, ...change.parts],
    deliveries: result.deliveries.length,
    closing: change.closing.length > 0,
    ledger: change.closing,
  };
}

// [DX-ACT8, review F3] TX2_LEDGER_CAP_AT_PUBLISH=1 (default off): a Publish is refused when one subject could owe more
// notice items, across every release of the account (a ledger keeps retired items), than the settlement in force can
// write for it: in parts, `ledgerPartsMax()` parts; whole, one value that fits one frame beside the cursor change.
// Otherwise the release is acknowledged and its first ledger write is refused (`FrameTooLarge`), and since the cursor
// cannot pass it, every later release's notices in that account are never recorded. Unset: nothing here is used.
const sample = { scopeName: "ledger-capacity" } as never;
const longCursor = { epoch: "0".repeat(26), event: 999999, start: 999999, parent: "0".repeat(64), batch: 999999999,
  previous: "0".repeat(64), entries: 999999999999, frames: "bytes", part: 999999, ledger: "parts", erasureSeq: 999999 };
let wholeMax: number | undefined;
/** The longest packed ledger one subject can have and still be written. */
export function ledgerCapacity(mode: LedgerMode) {
  if (mode === "parts") return (partsMax ??= ledgerPartsMax()) * ledgerPartChars;
  if (wholeMax === undefined) {
    const db = new Documents(sample, "settlement-notices-" + "x".repeat(24)),
      id = "f".repeat(40);
    const fits = (n: number) => frameEstimate([{ op: "retract" as const, id }, db.put(ledgerKey("pl:s99999999"), "A".repeat(n)),
      { op: "retract" as const, id }, db.put("notice-progress", longCursor)]).fits;
    let lo = 0, hi = 4 << 20;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (fits(mid)) lo = mid;
      else hi = mid - 1;
    }
    wholeMax = lo;
  }
  return wholeMax;
}
/** The packed ledger of a subject that owes each of `items` ((rule, key) pairs), as the kernel writes one: items in id
 * order, a work item id is a 64-hex hash, its payload names the form and one of 31 due dates (the real ledgers' dates
 * spread less, so they pack smaller), its sequence is six digits; plus 3% for what the sample does not show. With the
 * base allowance this is 15%, 6.5% and 5.9% above the real ledger at 200, 1,000 and 1,500 owed synthetic forms
 * (act10/ledger-probe.ts). */
export function worstLedgerChars(items: readonly (readonly [string, string])[]) {
  const subject = "pl:s99999999";
  const states = items.map(([rule, key], k) => ({ id: "wi:" + sha256(canonical([subject, rule, key])),
    payload: canonical({ dueAt: "2026-11-" + String(1 + (k % 31) % 30).padStart(2, "0") + "T00:00:00.000000Z", form: key }),
    retired: false, seq: 999999n, subject })).sort((a, b) => (a.id < b.id ? -1 : 1));
  return Math.ceil(pack(states).length * 1.03);
}
/** Every (rule, key) notice item the documents can give one subject: each notice policy one item, and an allowance of
 * two items per base rule (the base rules give at most one per rule and document on the held subjects). */
export function noticeItems(docs: readonly W0.ReleaseDoc[]) {
  const items = new Map<string, readonly [string, string]>();
  let rules = 0;
  for (const d of docs) {
    rules = Math.max(rules, d.rules?.length ?? 0);
    for (const p of d.policies ?? []) if (p.notice) items.set(p.id + " " + p.form, [p.id, p.form]);
  }
  const policies = items.size;
  for (let k = 0; k < 2 * rules; k++) items.set("base " + k, ["base:" + k, "form:base-" + k]);
  return { items: [...items.values()], policies, base: 2 * rules };
}
