import type { OutboxStore } from "./w0-outbox.ts";
import { V_W0, type WorldRow } from "./w0-world.ts";

// [DX-ACT1] Why: subjects and sequences have unbounded integer tokens in W0 §8.8. Rejected: rounding once in JSON.parse and converting the rounded value back to BigInt.
export function parseOutbox(bytes: string) {
  return JSON.parse(bytes, ((key: string, value: unknown, ctx: { source?: string }) => {
    if ((key === "tx" || key === "seq") && typeof value === "number") return BigInt(ctx.source!);
    return value;
  }) as Parameters<typeof JSON.parse>[1]);
}

// [DX-ACT1] Why: strict native reach accepts 64 roots and every chunk must read the same position. Rejected: splitting a write transaction or refreshing the head between chunks.
export async function readOutboxAt(
  store: Pick<OutboxStore, "sweepPage">,
  roots: readonly string[],
  position: number,
) {
  const rows: WorldRow[] = [];
  let reads = 0;
  const basis = { position, validAt: V_W0 };
  for (let i = 0; i < roots.length; i += 64) {
    const page = await store.sweepPage(roots.slice(i, i + 64), basis);
    if (page.reportedBasis?.position !== position || page.reportedBasis.validAt !== V_W0)
      throw Error("Outbox state read at wrong cut");
    rows.push(...page.rows);
    reads += page.roundTrips;
  }
  return { rows, reads };
}
