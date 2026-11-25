// [DX-ACT10, third review] After a gate run (DX_ACT10_IDSCAN=1, diagnostic toy only): every assertion ID in the run's
// feed, checked for the duplicate-identity shape (identity.test.ts). A save with an ordered identity carries the
// transaction ID `_tx/<token>00` (or `_tx/<token23>W00`) and the assertion IDs `<token><hex ordinal>`. Any other
// transaction whose transaction ID or assertion ID starts with such a token was given an ID inside that save's block
// (an "intrusion"); if its ordinal is one the save used, the two would have been the same ID, and whichever committed
// second was refused ("TRIPLEX_IDENTITY f/id"). Writes <out>/act10-idscan.json. Nothing here asserts.
import { writeFileSync } from "node:fs";
import path from "node:path";
import type { Store } from "../actv-lazy/store.ts";

const narrow = /^_tx\/([0-7][0-9A-HJKMNP-TV-Z]{23})00$/, wide = /^_tx\/([0-7][0-9A-HJKMNP-TV-Z]{22})W00$/;

export async function idScan(s: Store, out: string, from: number, note: Record<string, unknown> = {}) {
  const started = Date.now();
  const head = await s.head();
  type Tx = { position: number; txId: string; commandId?: string; actor?: string; changes: { op: string; tripleId: string }[] };
  const blocks = new Map<string, { position: number; ordinals: number[]; width: 2 | 3; command: string }>();
  const general: { position: number; id: string; command: string; actor: string }[] = [];
  const seen = new Map<string, number>();
  const duplicates: [string, number, number][] = [];
  let transactions = 0, after = from;
  while (after < head) {
    const page = await s.comp.feedPage(after, 1000);
    const txs = page.transactions as Tx[];
    if (!txs.length) break;
    for (const t of txs) {
      if (t.position > head) break;
      after = t.position;
      transactions++;
      const asserted = t.changes.filter((c) => c.op === "assert").map((c) => String(c.tripleId));
      for (const id of asserted) {
        const prior = seen.get(id);
        if (prior !== undefined && prior !== t.position) duplicates.push([id, prior, t.position]);
        seen.set(id, t.position);
      }
      const m = narrow.exec(String(t.txId)) ?? wide.exec(String(t.txId));
      const token = m?.[1];
      if (token && asserted.length && asserted.every((id) => id.startsWith(token))) {
        const width = token.length === 24 ? 2 : 3;
        blocks.set(token, { position: t.position, ordinals: asserted.map((id) => parseInt(id.slice(token.length), 16)), width,
          command: String(t.commandId ?? "") });
      } else
        for (const id of [String(t.txId).replace(/^_tx\//, ""), ...asserted])
          general.push({ position: t.position, id, command: String(t.commandId ?? "").slice(0, 80), actor: String(t.actor ?? "") });
    }
    if (txs.length < 1000) break;
  }
  const intrusions: Record<string, unknown>[] = [];
  for (const g of general)
    for (const len of [24, 23]) {
      const b = blocks.get(g.id.slice(0, len));
      if (!b || (len === 23 && b.width !== 3)) continue;
      const tail = g.id.slice(len), hex = new RegExp("^[0-9A-F]{" + (len === 24 ? 2 : 3) + "}$").test(tail);
      const ordinal = hex ? parseInt(tail, 16) : null;
      intrusions.push({ savePosition: b.position, saveCommand: b.command.slice(0, 80), saveOrdinals: [Math.min(...b.ordinals), Math.max(...b.ordinals)],
        position: g.position, command: g.command, actor: g.actor, id: g.id, ordinal, sameAsASaveId: ordinal !== null && b.ordinals.includes(ordinal),
        insideTheSavesRange: ordinal !== null && ordinal <= Math.max(...b.ordinals) });
    }
  const result = { ...note, from, head, transactions, orderedSaves: blocks.size, generalIds: general.length, duplicates,
    intrusions: intrusions.length, inRange: intrusions.filter((x) => x.insideTheSavesRange).length, list: intrusions.slice(0, 200),
    ms: Date.now() - started };
  writeFileSync(path.join(out, "act10-idscan.json"), JSON.stringify(result, null, 1));
  console.log("[act10-idscan] " + JSON.stringify({ ...result, list: undefined }));
  return result;
}
