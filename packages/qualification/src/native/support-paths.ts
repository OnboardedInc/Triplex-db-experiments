import { Effect } from "effect";
import { countSimplePaths, frontierClosure, memoryEdges } from "@triplex-build/triplex/runtime";

// [EXP-C8-R2] Why: read limit+1 within XTDB's public 100k row cap to prove coverage.
// Rejected: accepting a LIMIT-sized relation without an overflow witness.
export const SUPPORT_EDGE_LIMIT = 99_999;
export const countSupportPaths = (
  rows: readonly Record<string, unknown>[],
  from: string,
  to: string,
): Effect.Effect<bigint, unknown> =>
  Effect.tryPromise({
    try: async () => {
      const edges = memoryEdges(
        rows.map((row) => [row["source"], row["target"]] as [string, string]),
        SUPPORT_EDGE_LIMIT,
      );
      const closure = await frontierClosure({ seeds: [from], edges });
      return countSimplePaths(closure, from, to);
    },
    catch: (cause) => cause,
  });
