import type { XtdbClient } from "./XtdbClient.js";

/** A read path tried to submit a transaction (contract C8). */
export class ReadPathWriteRefused extends Error {
  readonly _tag = "ReadPathWriteRefused";
  constructor(readonly lane: "xtdb" | "qlever") {
    super(`C8: a read path attempted an engine write on ${lane}; refused before it was sent`);
    this.name = "ReadPathWriteRefused";
  }
}

/**
 * The view of the shared client that every read entry point receives.
 *
 * [EXP-C8] Why: "reads never write" (contract C8) should not rest on every future read helper
 * remembering not to call `submit`. Read paths get this facade, whose `submit` refuses before
 * anything reaches the engine, so a regression fails the read (and G1/G2) instead of committing.
 * The wire-level counter (packages/qualification/src/engine-write-counter.ts) is the independent
 * engine-boundary proof; this facade is the structural guard. `close` is not delegated: the
 * runtime layer owns the shared client.
 */
export const readOnlyXtdbClient = (client: XtdbClient): XtdbClient => ({
  query: (sql, params, basis, options) => client.query(sql, params, basis, options),
  submit: async () => {
    throw new ReadPathWriteRefused("xtdb");
  },
  close: async () => {},
});
