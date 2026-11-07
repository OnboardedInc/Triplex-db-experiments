/** Future generated-public-DTS witness only. This file has not been compiled. */
import { Effect } from "effect";
import { Triples } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import {
  makeQleverRuntime, makeQleverNativeQueries, makeQleverTemporalQueries,
  type QleverClient, type QleverRuntimeOptions,
} from "@triplex-build/triplex-qlever";
declare const sameObservedClient: QleverClient;
const scope = DatabaseScope.make({ env: "test", tenant: "source", database: "types", generation: 0 });
const options: QleverRuntimeOptions = { url: "http://127.0.0.1:17019", client: sameObservedClient };
const runtime = makeQleverRuntime(options);
export const ordinaryDefault = makeQleverRuntime({ url: options.url });
export const native = makeQleverNativeQueries(sameObservedClient, scope);
export const intervals = makeQleverTemporalQueries(sameObservedClient, scope);
export const position = Effect.gen(function* () { return yield* (yield* Triples).currentPosition(); }).pipe(
  Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none })), Effect.scoped,
);
