// [EXP-QH1-R3] Why: the subject pull (all entities reachable from a root through ref values at one cut) is the unit lane Q serves.
// A store without a whole-pull primitive gets this exact breadth-first fallback over its own batch read; a columnar store answers the
// whole closure in one operation. Rejected: leaving the BFS to every caller (each hop re-enters the kernel and the Effect runtime).
import { Effect } from "effect";
import type { Triple } from "../Triple.js";
import type { ReadError } from "../errors/index.js";
import type { ReachResult } from "./Triples.js";

/**
 * Breadth-first closure over `ref` values. A level is one `read` call; an entity is read once. Triples keep level order, then
 * the order `read` returned them within an entity.
 */
export const reachBy = (
  read: (ids: readonly string[]) => Effect.Effect<readonly (readonly Triple[])[], ReadError>,
  root: string,
): Effect.Effect<ReachResult, ReadError> =>
  Effect.gen(function* () {
    const seen = new Set<string>([root]);
    const triples: Triple[] = [];
    let todo: string[] = [root];
    let hops = 0;
    while (todo.length > 0) {
      const bodies = yield* read(todo);
      hops++;
      const next: string[] = [];
      for (const body of bodies)
        for (const t of body) {
          triples.push(t);
          if (t.value.type === "ref" && !seen.has(t.value.value)) {
            seen.add(t.value.value);
            next.push(t.value.value);
          }
        }
      todo = next;
    }
    return { triples, hops };
  });
