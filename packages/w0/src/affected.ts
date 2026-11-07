/**
 * SPEC 10 `affected(release, worlds, writes)`: the subjects whose dependencies under `release` meet at least one write.
 */
import type { Basis, World } from "./kernel.js";
import { checkBasis, evaluateIndexed, indexWorld } from "./kernel.js";
import type { CompiledRelease } from "./release.js";
import type { W0ErrorCode } from "./schema.js";

/**
 * Returns the affected subjects, ascending, or the first error. Worlds are validated one at a time in array order, SPEC 4.4
 * steps 3.1 to 3.3 per world (Q53 reading A04), after the basis (step 2). `writes` entries are not checked beyond their shape
 * (SPEC 4.4). Dependencies do not depend on the valid time, so no valid-time filtering happens (SPEC 10 item 6).
 */
export function affectedSubjects(
  rel: CompiledRelease,
  worlds: readonly World[],
  writes: readonly (readonly [string, string])[],
  basis: Basis,
): { affected: string[] } | { error: W0ErrorCode } {
  const b = checkBasis(basis);
  if (b !== null) return { error: b };
  const wanted = new Set(writes.map(([e, a]) => e + "\u0000" + a));
  const out: string[] = [];
  for (const w of worlds) {
    const idx = indexWorld(w, basis.tx);
    if (typeof idx === "string") return { error: idx };
    const o = evaluateIndexed(idx, rel, basis);
    if (o.dependencies.some(([e, a]) => wanted.has(e + "\u0000" + a))) out.push(o.subject);
  }
  out.sort();
  return { affected: out };
}
