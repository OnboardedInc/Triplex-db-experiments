import type { QleverClient } from "./QleverClient.js";

/** A read path tried to send a SPARQL update (contract C8). */
export class QleverReadPathWriteRefused extends Error {
  readonly _tag = "QleverReadPathWriteRefused";
  constructor() {
    super("C8: a read path attempted a QLever update; refused before it was sent");
    this.name = "QleverReadPathWriteRefused";
  }
}

/**
 * The view of the shared client that every read entry point receives.
 *
 * [EXP-C8] Why: every QLever update empties the whole result cache (R17 finding 2) and grows the
 * delta, so a read that updates hurts every other reader and writer. Read paths get this facade,
 * whose `update` refuses before anything reaches the engine; a regression fails the read (and
 * G1/G2) instead of writing. Queries, commands (settings, cache statistics) and cancellation pass
 * through. The wire-level counter (packages/qualification/src/engine-write-counter.ts) is the
 * independent engine-boundary proof. `close` is not delegated: the runtime owns the client.
 */
export const readOnlyQleverClient = (client: QleverClient): QleverClient => ({
  query: (sparql, options) => client.query(sparql, options),
  update: async () => {
    throw new QleverReadPathWriteRefused();
  },
  command: (command, options) => client.command(command, options),
  cancel: (queryId) => client.cancel(queryId),
  close: async () => {},
});
