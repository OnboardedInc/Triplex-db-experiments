import { readFile } from 'node:fs/promises';
import { Effect, Option } from 'effect';
import { Runtime, TripleStoreRuntime } from '@triplex-build/triplex/runtime';
import { PublicDuckDBBackend } from './public-backend.mjs';
import { NativeDuckDBPort } from './native-duckdb-port.mjs';
import { makeAdapterLayers } from './query-executor-adapter.js';
import { DuckDBSqlStrategy } from './index.js';
import { NativeDirectCompatibilityBackend } from './native-direct-backend.js';

/** Explicit C++ mutation experiment. Raw transport invalidates owned read state. */
export async function makeNativeDirectCompatibilityRuntime(options: { readonly database?: string } = {}) {
  const schema = await readFile(new URL('./public-schema.sql', import.meta.url), 'utf8');
  const open = Effect.gen(function* () {
    const current = yield* Effect.serviceOption(TripleStoreRuntime);
    if (Option.isNone(current)) return yield* Effect.fail(new Error('Triplex runtime scope is required'));
    const runtime = current.value;
    return yield* Effect.tryPromise({
      try: async () => new NativeDirectCompatibilityBackend(new PublicDuckDBBackend(
        await NativeDuckDBPort.openWithOwner(options), runtime.scope,
      )),
      catch: cause => cause,
    });
  });
  const adapters = makeAdapterLayers(open, schema, DuckDBSqlStrategy);
  return Runtime.define({ name: 'duckdb-2.0.0-direct-compat-experimental', storage: adapters.storage, queries: adapters.queries });
}
