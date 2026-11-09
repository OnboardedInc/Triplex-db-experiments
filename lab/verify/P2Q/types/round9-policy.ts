import { Effect } from "effect";
import { constructSnapshotReads, type ReadError } from "@triplex-build/triplex/runtime";

// [EXP-P2Q] Why: a formerly infallible operation gains the policy's typed refusal channel at construction.
// Rejected: retaining the original function type (silently describes a refusing read as infallible).
const reads = constructSnapshotReads({ read: {
  run: (_key: string) => Effect.succeed([] as readonly string[]),
  basis: () => undefined,
  rawHistory: false,
} }, { wrap: effect => effect });
type Assert<T extends true> = T;
export type RefusalIsTyped = Assert<Effect.Error<ReturnType<typeof reads.read>> extends ReadError ? true : false>;
export type RefusalIsNotNever = Assert<[Effect.Error<ReturnType<typeof reads.read>>] extends [never] ? false : true>;
export type ArgumentsArePreserved = Assert<Parameters<typeof reads.read> extends [string] ? true : false>;
