import { TransactionId, TripleId } from "../Branded.js";
import { Context, Effect, Layer } from "effect";

//#region src/store/RuntimeServices.d.ts
interface RuntimeClockService {
  readonly now: Effect.Effect<number>;
}
declare const RuntimeClock_base: Context.ServiceClass<RuntimeClock, "RuntimeClock", RuntimeClockService>;
declare class RuntimeClock extends RuntimeClock_base {}
declare const RuntimeClockLive: Layer.Layer<RuntimeClock, never, never>;
interface IdGeneratorService {
  readonly generate: (scope: string) => Effect.Effect<string>;
  readonly nextId: (scope: string) => Effect.Effect<string>;
  readonly nextTripleId: Effect.Effect<TripleId>;
  readonly nextTxId: Effect.Effect<TransactionId>;
}
declare const IdGenerator_base: Context.ServiceClass<IdGenerator, "IdGenerator", IdGeneratorService>;
declare class IdGenerator extends IdGenerator_base {}
declare const IdGeneratorLive: Layer.Layer<IdGenerator, never, never>;
interface DeterministicRuntimeOptions {
  readonly now: number;
  readonly idSeed?: string;
}
declare const DeterministicRuntimeClockLive: ({
  now
}: Pick<DeterministicRuntimeOptions, "now">) => Layer.Layer<RuntimeClock, never, never>;
declare const DeterministicIdGeneratorLive: ({
  idSeed
}: Pick<DeterministicRuntimeOptions, "idSeed">) => Layer.Layer<IdGenerator, never, never>;
declare const RuntimeServicesLive: Layer.Layer<RuntimeClock | IdGenerator, never, never>;
declare const DeterministicRuntimeServicesLive: (options: DeterministicRuntimeOptions) => Layer.Layer<RuntimeClock | IdGenerator, never, never>;
//#endregion
export { DeterministicIdGeneratorLive, DeterministicRuntimeClockLive, DeterministicRuntimeOptions, DeterministicRuntimeServicesLive, IdGenerator, IdGeneratorLive, IdGeneratorService, RuntimeClock, RuntimeClockLive, RuntimeClockService, RuntimeServicesLive };
//# sourceMappingURL=RuntimeServices.d.ts.map