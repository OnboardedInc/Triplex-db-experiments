import { DatabaseAlreadyExists, DatabaseNotFound, InternalError } from "../Error.js";
import { TriplesService } from "./Triples.js";
import { SnapshotServiceShape } from "../snapshots/SnapshotService.js";
import { Context, Effect } from "effect";

//#region src/store/DatabaseManager.d.ts
/**
 * Database metadata
 */
interface Database {
  readonly name: string;
  readonly description: string | null;
  readonly createdAt: number;
  readonly tripleCount?: number;
  readonly sizeBytes?: number;
}
/**
 * Result of clearing a database
 */
interface ClearResult {
  readonly success: boolean;
  readonly database: string;
}
/**
 * DatabaseManager service interface
 *
 * All operations can fail with InternalError for database/filesystem issues.
 */
interface DatabaseManagerService {
  readonly create: (name: string, description?: string) => Effect.Effect<Database, DatabaseAlreadyExists | InternalError>;
  readonly update: (name: string, fields: {
    description?: string;
  }) => Effect.Effect<Database, DatabaseNotFound | InternalError>;
  readonly delete: (name: string) => Effect.Effect<void, DatabaseNotFound | InternalError>;
  readonly deleteAll: () => Effect.Effect<void, InternalError>;
  readonly list: () => Effect.Effect<readonly Database[], InternalError>;
  readonly get: (name: string) => Effect.Effect<Database, DatabaseNotFound | InternalError>;
  readonly getTriples: (name: string) => Effect.Effect<TriplesService, DatabaseNotFound | InternalError>;
  readonly getSnapshotService: (name: string) => Effect.Effect<SnapshotServiceShape | null, DatabaseNotFound | InternalError>;
  readonly clear: (name: string) => Effect.Effect<ClearResult, DatabaseNotFound | InternalError>;
}
declare const DatabaseManager_base: Context.ServiceClass<DatabaseManager, "DatabaseManager", DatabaseManagerService>;
/**
 * DatabaseManager service tag for dependency injection
 */
declare class DatabaseManager extends DatabaseManager_base {}
//#endregion
export { ClearResult, Database, DatabaseManager, DatabaseManagerService };
//# sourceMappingURL=DatabaseManager.d.ts.map