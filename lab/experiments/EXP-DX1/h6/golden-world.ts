import { canonical, factValue, type WorldRow, W0 } from "../../../bench/lib/w0-world.ts";
// [DX-H6] Why: freeze H5's comparator as the independent offline equality baseline.
// Rejected: generating golden worlds through the optimized comparator.
export function worldOf(subject: string, rows: readonly WorldRow[]): W0.World {
  const facts = rows.map((r) => ({
    e: r.entityId,
    a: r.attribute,
    v: factValue(r.value),
    tx: r.position,
  }));
  facts.sort((a, b) => Buffer.compare(Buffer.from(canonical(a)), Buffer.from(canonical(b))));
  return { subject, facts };
}
