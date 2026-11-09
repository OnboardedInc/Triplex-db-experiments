// [EXP-K01-R6] Why: extraction tests use real observation primitives and native-shaped completed mock process fields. Rejected: bypassing failed observations; explicit mock signals/errors are preserved and real command-facade tests do not use this adapter.
import vm from 'node:vm';
import * as observations from '../../bin/observation.ts';
export const runObserved = (code, context, ...options) => {
  const spawn = context.spawnSync;
  const adapter = { ...observations, inspectVolume: name => context.docker(['volume', 'inspect', name]), ...context };
  if (spawn) adapter.spawnSync = (...args) => ({ signal: null, ...spawn(...args) });
  return vm.runInNewContext(code, Object.assign(context, adapter), ...options);
};
