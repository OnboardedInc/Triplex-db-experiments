import config from './vitest.config.mjs';
import { splitTransaction } from './mutate.mjs';
export default { ...config, plugins: [{
  name: 'CX-VFD01-split-transaction-negative-control', enforce: 'pre',
  transform(source, id) {
    if (id.endsWith('/packages/host/src/feed/ConsumerStore.ts'))
      return { code: splitTransaction(source), map: null };
  },
}] };
