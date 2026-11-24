import assert from "node:assert/strict";
import { W0, canonical, sha256 } from "../../../../bench/lib/w0-world.ts";
import { pack, unpack, type Documents, type Op, type Row } from "../../notify1/store.ts";
import type { NoticeCandidate } from "./recorded.ts";

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
