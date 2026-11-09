import "./source-hook.mjs";
import { registerHooks } from "node:module";
import { splitTransaction } from "./reviewer-probes/mutate.mjs";
// [EXP-FD01-R2] Why: rerun the exact QA split at the same hook on source and child-process imports.
// Rejected: a pretend keyed-split observation that never mutates the consumer under test.
registerHooks({
  load(url, context, next) {
    const loaded = next(url, context);
    if (/\/packages\/host\/(src|dist)\/feed\/ConsumerStore\.(ts|js)$/.test(url))
      return { ...loaded, source: splitTransaction(String(loaded.source)) };
    return loaded;
  },
});
