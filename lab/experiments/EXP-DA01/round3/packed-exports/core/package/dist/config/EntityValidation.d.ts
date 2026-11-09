import { EntityId } from "../Branded.js";
import { CanonicalEncodingError, CanonicalValue } from "../content/CanonicalJson.js";
import { CommandAlreadyCommittedError, ConstraintViolationError, DatalogQueryError, ReadError, TransactionConflictError, WriteError } from "../errors/index.js";
import { DatalogQuery } from "../datalog/schema.js";
import { ContentId } from "../content/ContentId.js";
import { TypeExpr } from "./TypeExpr.js";
import { ConfigNode, DuplicateChildKeyError } from "./ConfigNode.js";
import { TransactionResult, Triples } from "../store/Triples.js";
import { ConfigStore, LoadError } from "./ConfigStore.js";
import { Code, DuplicateGraphConstraintError, InvalidGraphConstraintError } from "./GraphConstraint.js";
import { Context, Effect, Layer } from "effect";
import * as _$effect_Brand0 from "effect/Brand";
import * as _$effect_Types0 from "effect/Types";
import * as _$effect_Cause0 from "effect/Cause";

//#region src/config/EntityValidation.d.ts
declare namespace EntityValidation_d_exports {
  export { CurrentValidation, ENTITY_SCHEMA_KIND, EntitySchemaDefinition, EntityValidation, EntityValidationService, InvalidEntity, InvalidEntitySchemaError, RevalidateError, StoredViolation, System, UnknownValidationRefError, ValidationResult, ValidationRun, ValidationViolation, currentInvalidQuery, define, entityId, everInvalidQuery, lastInvalidQuery, layer, violationsQuery };
}
declare const ENTITY_SCHEMA_KIND = "entity-schema";
declare const System: {
  readonly prefix: "_triplex/validation/";
  readonly entityType: {
    readonly result: "triplex.validation-result";
    readonly violation: "triplex.validation-violation";
    readonly head: "triplex.validation-head";
    readonly run: "triplex.validation-run";
    readonly checkpoint: "triplex.validation-checkpoint";
  };
  readonly attribute: {
    readonly contentId: ":triplex/content-id";
    readonly ref: ":triplex/validation-ref";
    readonly result: ":triplex/validation-result";
    readonly runRef: ":triplex/validation-run-ref";
    readonly runResult: ":triplex/validation-run-result";
    readonly subject: ":triplex/validation-subject";
    readonly entityType: ":triplex/validation-entity-type";
    readonly schema: ":triplex/validation-schema";
    readonly snapshot: ":triplex/validation-snapshot";
    readonly snapshotRoot: ":triplex/validation-snapshot-root";
    readonly valid: ":triplex/validation-valid";
    readonly stateContentId: ":triplex/validation-state-content-id";
    readonly sourcePosition: ":triplex/validation-source-position";
    readonly code: ":triplex/validation-code";
    readonly path: ":triplex/validation-path";
    readonly message: ":triplex/validation-message";
    readonly constraint: ":triplex/validation-constraint";
  };
};
declare const entityId: {
  result: (cid: ContentId) => EntityId;
  violation: (cid: ContentId) => EntityId;
  run: (cid: ContentId) => EntityId;
  checkpoint: (ref: string) => EntityId;
  head: (ref: string, entityType: string, subject: string) => string & _$effect_Brand0.Brand<"EntityId">;
};
interface EntitySchemaDefinition {
  readonly entityType: string;
  readonly type: TypeExpr;
}
/** Define the runtime shape of entities carrying `entityType`. */
declare const define: (entityType: string, type: TypeExpr) => Effect.Effect<ConfigNode, DuplicateChildKeyError | CanonicalEncodingError>;
interface ValidationViolation {
  readonly id: ContentId;
  readonly resultId: ContentId;
  readonly subject: string;
  readonly entityType: string;
  readonly schemaId: ContentId;
  readonly snapshotId: string;
  readonly code: "schema" | Code;
  readonly path: string;
  readonly message: string;
  readonly constraintKey?: string;
}
interface ValidationResult {
  readonly id: ContentId;
  readonly subject: string;
  readonly entityType: string;
  readonly schemaId: ContentId;
  readonly snapshotId: string;
  readonly snapshotRootCid: ContentId;
  readonly valid: boolean;
  /** Commitment to `state`; the materialized state itself is not persisted. */
  readonly stateCid: ContentId;
  readonly state: CanonicalValue;
  readonly violations: ReadonlyArray<ValidationViolation>;
}
interface ValidationRun {
  readonly id: ContentId;
  readonly ref: string;
  readonly snapshotId: string;
  readonly snapshotRootCid: ContentId;
  /** Last non-validation transaction visible when this projection began. */
  readonly sourcePosition: number;
  readonly results: ReadonlyArray<ValidationResult>;
  /** Undefined when an identical run was already materialized. */
  readonly transaction: TransactionResult | undefined;
}
interface InvalidEntity {
  readonly subject: string;
  readonly resultEntityId: string;
  readonly schemaId: ContentId;
  readonly snapshotEntityId: string;
}
interface CurrentValidation {
  readonly status: "current" | "stale" | "unvalidated";
  /** Last non-validation transaction incorporated by the projection. */
  readonly sourcePosition?: number;
  /** Latest non-validation transaction currently present in the store. */
  readonly currentPosition: number;
  /** Last known invalid entities. Stale results are never presented as current. */
  readonly invalid: ReadonlyArray<InvalidEntity>;
}
interface StoredViolation {
  readonly violationEntityId: string;
  readonly resultEntityId: string;
  readonly subject: string;
  readonly entityType: string;
  readonly code: "schema" | Code;
  readonly path: string;
  readonly message: string;
}
declare const UnknownValidationRefError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "UnknownValidationRefError";
} & Readonly<A>;
declare class UnknownValidationRefError extends UnknownValidationRefError_base<{
  readonly ref: string;
  readonly message: string;
}> {}
declare const InvalidEntitySchemaError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "InvalidEntitySchemaError";
} & Readonly<A>;
declare class InvalidEntitySchemaError extends InvalidEntitySchemaError_base<{
  readonly key: string;
  readonly message: string;
}> {}
type RevalidateError = ReadError | WriteError | TransactionConflictError | CommandAlreadyCommittedError | ConstraintViolationError | LoadError | UnknownValidationRefError | InvalidEntitySchemaError | InvalidGraphConstraintError | DuplicateGraphConstraintError | CanonicalEncodingError;
interface EntityValidationService {
  readonly revalidate: (input: {
    readonly ref: string;
  }) => Effect.Effect<ValidationRun, RevalidateError>;
  readonly currentInvalid: (ref: string) => Effect.Effect<CurrentValidation, ReadError | DatalogQueryError>;
  readonly everInvalid: () => Effect.Effect<ReadonlyArray<string>, ReadError | DatalogQueryError>;
  readonly violations: (input?: {
    readonly subject?: string;
    readonly resultEntityId?: string;
  }) => Effect.Effect<ReadonlyArray<StoredViolation>, ReadError | DatalogQueryError>;
}
declare const EntityValidation_base: Context.ServiceClass<EntityValidation, "triplex/EntityValidation", EntityValidationService>;
declare class EntityValidation extends EntityValidation_base {}
declare const currentInvalidQuery: (ref: string) => DatalogQuery;
/** Last materialized invalid observations for a ref, even when now stale. */
declare const lastInvalidQuery: (ref: string) => DatalogQuery;
declare const everInvalidQuery: () => DatalogQuery;
declare const violationsQuery: (input?: {
  readonly subject?: string;
  readonly resultEntityId?: string;
}) => DatalogQuery;
declare const layer: Layer.Layer<EntityValidation, never, Triples | ConfigStore>;
//#endregion
export { CurrentValidation, ENTITY_SCHEMA_KIND, EntitySchemaDefinition, EntityValidation, EntityValidationService, EntityValidation_d_exports, InvalidEntity, InvalidEntitySchemaError, RevalidateError, StoredViolation, System, UnknownValidationRefError, ValidationResult, ValidationRun, ValidationViolation, currentInvalidQuery, define, entityId, everInvalidQuery, lastInvalidQuery, layer, violationsQuery };
//# sourceMappingURL=EntityValidation.d.ts.map