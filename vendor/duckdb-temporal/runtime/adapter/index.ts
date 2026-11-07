import { readFile } from 'node:fs/promises';
import { Effect, Option } from 'effect';
import { Runtime, TripleStoreRuntime } from '@triplex-build/triplex/runtime';
import { SqliteDialect } from '@triplex-build/triplex-sql';
import { PublicDuckDBBackend } from './public-backend.mjs';
import { NativeDuckDBPort } from './native-duckdb-port.mjs';
import { makeAdapterLayers } from './query-executor-adapter.js';

export const DuckDBSqlStrategy = Object.freeze({
  ...SqliteDialect,
  limitOffset: (limit: number | undefined, offset: number | undefined) =>
    `${limit === undefined ? '' : `LIMIT ${limit}`} ${offset === undefined ? '' : `OFFSET ${offset}`}`.trim(),
});

/** Exact pinned Triplex API; one native instance/connection per scoped acquisition. */
export async function makeDuckDBRuntime(options: {readonly database?: string} = {}) {
  const schema=await readFile(new URL('./public-schema.sql',import.meta.url),'utf8');
  const open=Effect.gen(function*(){
    const current=yield* Effect.serviceOption(TripleStoreRuntime);
    if(Option.isNone(current))return yield* Effect.fail(new Error('Triplex runtime scope is required'));
    const runtime=current.value;
    return yield* Effect.tryPromise({
      try:async()=>new PublicDuckDBBackend(await NativeDuckDBPort.open({
        ...(options.database===undefined?{}:{database:options.database}),
      }),runtime.scope),
      catch:(cause)=>cause,
    });
  });
  const adapters=makeAdapterLayers(open,schema,DuckDBSqlStrategy);
  return Runtime.define({name:'duckdb-2.0.0',storage:adapters.storage,queries:adapters.queries});
}
