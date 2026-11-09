import { MigrationError } from "../errors/index.js";
import { QueryExecutor } from "../storage/QueryExecutor.js";
import { Triples } from "./Triples.js";
import { TripleStoreRuntime } from "./TripleStoreRuntime.js";
import { StorageAdapter } from "../storage/StorageAdapter.js";
import { Layer } from "effect";

//#region src/store/TriplesLive.d.ts
declare const TriplesLive: Layer.Layer<Triples, MigrationError, StorageAdapter | TripleStoreRuntime | QueryExecutor>;
//#endregion
export { TriplesLive };
//# sourceMappingURL=TriplesLive.d.ts.map