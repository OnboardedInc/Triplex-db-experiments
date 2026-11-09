import { MigrationError } from "../errors/index.js";
import { QueryExecutor } from "../storage/QueryExecutor.js";
import { Triples } from "../store/Triples.js";
import { KvBackend } from "../kv/kv/KvBackend.js";
import { TripleStoreRuntime } from "../store/TripleStoreRuntime.js";
import { StorageAdapter } from "../storage/StorageAdapter.js";
import { CapabilityError } from "../store/StoreCapability.js";
import { DatabaseScope } from "./DatabaseScope.js";
import { Capabilities, CapabilitySet } from "./Capabilities.js";
import { Layer } from "effect";

//#region src/runtime/Runtime.d.ts
interface RuntimeOptions {
  readonly scope: DatabaseScope;
  readonly deterministic?: {
    readonly startTime: number;
    readonly seed: string;
  };
}
type DefaultCapabilities = typeof Capabilities.default;
type DefaultOutput = DefaultCapabilities extends CapabilitySet<infer O, infer _E, infer _R> ? O : never;
type DefaultRequirements = DefaultCapabilities extends CapabilitySet<infer _O, infer _E, infer R> ? R : never;
interface RuntimeDefinition<E, R, Provided = never> {
  readonly name: string;
  readonly layer: {
    (options: RuntimeOptions & {
      readonly capabilities?: never;
    }): Layer.Layer<Triples | DefaultOutput, E | CapabilityError, R | DefaultRequirements>;
    <O, CE, CR>(options: RuntimeOptions & {
      readonly capabilities: CapabilitySet<O, CE, CR>;
    }): Layer.Layer<Triples | O, E | CE | CapabilityError, R | Exclude<CR, Triples | TripleStoreRuntime | Provided>>;
  };
}
declare const Runtime: {
  readonly define: <SE, SR, QE, QR>(options: {
    readonly name: string;
    readonly storage: Layer.Layer<StorageAdapter, SE, SR>;
    readonly queries: Layer.Layer<QueryExecutor, QE, QR>;
  }) => RuntimeDefinition<SE | QE | MigrationError, SR | QR, StorageAdapter | QueryExecutor>;
  readonly fromKv: <E, R>(options: {
    readonly name: string;
    readonly backend: Layer.Layer<KvBackend, E, R>;
  }) => RuntimeDefinition<E, R, KvBackend>;
};
//#endregion
export { Runtime, RuntimeDefinition, RuntimeOptions };
//# sourceMappingURL=Runtime.d.ts.map