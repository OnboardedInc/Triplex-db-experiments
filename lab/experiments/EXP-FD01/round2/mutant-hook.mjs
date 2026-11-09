// @ts-nocheck -- [CX-A01-040] Why: integration adds this runtime protocol or command fixture to checkJs; dynamic JSON/message fields lack static record types. Binding errors remain checked by lab/bin/checkjs.mjs. Rejected: excluding current executable code.
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
