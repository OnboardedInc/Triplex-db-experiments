// @ts-nocheck -- [CX-A01-040] Why: integration adds this runtime protocol or command fixture to checkJs; dynamic JSON/message fields lack static record types. Binding errors remain checked by lab/bin/checkjs.mjs. Rejected: excluding current executable code.
import './source-hook.mjs';
import { registerHooks } from 'node:module';
import { splitTransaction } from './mutate.mjs';
const target = new URL('../../../packages/host/src/feed/ConsumerStore.ts', import.meta.url).href;
registerHooks({ load(url, context, next) {
  const loaded = next(url, context);
  if (url === target) return { ...loaded, source: splitTransaction(String(loaded.source)) };
  return loaded;
} });
