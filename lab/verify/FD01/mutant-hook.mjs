import './source-hook.mjs';
import { registerHooks } from 'node:module';
import { splitTransaction } from './mutate.mjs';
const target = new URL('../../../packages/host/src/feed/ConsumerStore.ts', import.meta.url).href;
registerHooks({ load(url, context, next) {
  const loaded = next(url, context);
  if (url === target) return { ...loaded, source: splitTransaction(String(loaded.source)) };
  return loaded;
} });
