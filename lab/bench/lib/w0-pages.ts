import type { CompositionHandle } from "./composition.ts";
import { canonical, type PositionBasis } from "./w0-world.ts";
// [DX-H8] Why: coalesced publications retain the 64-root reach bound and deduplicate shared closure rows.
// Rejected: concatenating repeated shared entities, unbounded read concurrency, or serial reads with idle CPUs.
export async function readW0Pages(
  comp: Pick<CompositionHandle, "sweepPage">,
  subjects: readonly string[],
  basis: PositionBasis,
) {
  let combined: Awaited<ReturnType<CompositionHandle["sweepPage"]>> | undefined;
  const unique = new Map<string, any>();
  for (let offset = 0; offset < subjects.length; offset += 256) {
    const chunks = [];
    for (let start = offset; start < Math.min(subjects.length, offset + 256); start += 64)
      chunks.push(comp.sweepPage(subjects.slice(start, start + 64), basis));
    for (const page of await Promise.all(chunks)) {
      if (!Number.isSafeInteger(page.position) || page.position < basis.position)
        throw Error("chunk snapshot unavailable");
      if (combined && page.epoch !== combined.epoch) throw Error("chunk epoch changed");
      combined = page;
      for (const row of page.rows) {
        const old = unique.get(row.id);
        if (
          old &&
          canonical({ ...old, retractedPosition: 0 }) !==
            canonical({ ...row, retractedPosition: 0 })
        )
          throw Error("chunk row mismatch");
        unique.set(row.id, row);
      }
    }
  }
  if (!combined) throw Error("empty W0 page group");
  return { ...combined, rows: [...unique.values()] };
}
