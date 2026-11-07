import { Descriptors, DescriptorCompileError } from "@triplex-build/triplex/entity";
import type { GraphConstraint } from "@triplex-build/triplex/config";
import { Effect } from "effect";

import { ConfigConflictError, type CompileError, UnsupportedConfigError } from "./Errors.js";

// [EXP-R01] Why: the release-to-descriptor compile moved to core (`@triplex-build/triplex/entity`)
// so projection specs and the typed repository share one compiler. Only the REST exposure rules
// (collection paths, operations, at least one attribute) remain here. They run through core's
// exposure hooks at the positions they always ran, so every snapshot yields the same descriptor
// or the same first error as before. Inspired by: lab/research/R9-core-plumbing.md section 5.2.
// Rejected: re-exporting a duplicate compiler (two compilers drift).

export type Operation = "read" | "create" | "replace" | "delete";
export type StorageFamily = Descriptors.StorageFamily;

export interface ExposureOptions {
  /** Entity type to collection path override. Unlisted entities use a deterministic lowercase+s name. */
  readonly collections?: Readonly<Record<string, string>>;
  /** Per-entity operations. Defaults to all four operations. */
  readonly operations?: Readonly<Record<string, ReadonlyArray<Operation>>>;
}

export type AttributeDescriptor = Descriptors.AttributeDescriptor;

export interface EntityDescriptor extends Descriptors.EntityDescriptor {
  readonly collection: string;
  readonly operations: ReadonlyArray<Operation>;
}

export interface ConfigApiDescriptor {
  readonly protocolVersion: 1;
  readonly snapshotId: import("@triplex-build/triplex/config").ConfigStore.ConfigSnapshot["id"];
  readonly label: string;
  readonly entities: ReadonlyArray<EntityDescriptor>;
  readonly constraints: ReadonlyArray<GraphConstraint.Rule>;
}

const pathSegment = /^[a-z][a-z0-9_-]*$/;
const reservedCollections = new Set(["schema", "openapi.json", "docs"]);
const allOperations: ReadonlyArray<Operation> = ["read", "create", "replace", "delete"];

const unsupported = (path: string, message: string) =>
  new UnsupportedConfigError({ code: "unsupported_config", path, message });
const conflict = (path: string, message: string) =>
  new ConfigConflictError({ code: "config_conflict", path, message });

const fromCore = (error: DescriptorCompileError): CompileError =>
  error.kind === "unsupported"
    ? unsupported(error.path, error.message)
    : conflict(error.path, error.message);

const defaultCollection = (entityType: string): string =>
  `${entityType.slice(0, 1).toLowerCase()}${entityType.slice(1)}s`;

/** Compile only persisted release data; no DSL handles are retained or consulted. */
export const compile = (
  snapshot: import("@triplex-build/triplex/config").ConfigStore.ConfigSnapshot,
  options: ExposureOptions = {},
): Effect.Effect<ConfigApiDescriptor, CompileError> =>
  Effect.gen(function* () {
    const collections = new Set<string>();
    const collectionOf = new Map<string, string>();
    const operationsOf = new Map<string, ReadonlyArray<Operation>>();
    const compiled = yield* Descriptors.compile<CompileError>(snapshot, {
      beforeAttributes: (entityType) =>
        Effect.gen(function* () {
          const collection = options.collections?.[entityType] ?? defaultCollection(entityType);
          if (
            typeof collection !== "string" ||
            !pathSegment.test(collection) ||
            reservedCollections.has(collection)
          ) {
            return yield* conflict(
              `entities.${entityType}.collection`,
              `Collection ${JSON.stringify(collection)} is not a safe, non-reserved path segment`,
            );
          }
          if (collections.has(collection)) {
            return yield* conflict(
              `entities.${entityType}.collection`,
              `Collection path ${collection} is exposed more than once`,
            );
          }
          collections.add(collection);
          collectionOf.set(entityType, collection);
        }),
      afterAttributes: (entityType, descriptors) =>
        descriptors.length === 0
          ? Effect.fail(
              unsupported(
                `entities.${entityType}.attributes`,
                "REST exposure requires at least one application attribute",
              ),
            )
          : Effect.void,
      afterEntity: (entityType) =>
        Effect.gen(function* () {
          const configuredOperations = options.operations?.[entityType];
          if (configuredOperations !== undefined && !Array.isArray(configuredOperations)) {
            return yield* conflict(
              `entities.${entityType}.operations`,
              "Operations must be an array",
            );
          }
          const operations = configuredOperations ?? allOperations;
          if (
            operations.some((operation) => !allOperations.includes(operation)) ||
            new Set(operations).size !== operations.length
          ) {
            return yield* conflict(
              `entities.${entityType}.operations`,
              "Operations must be unique",
            );
          }
          operationsOf.set(entityType, [...operations]);
        }),
      afterEntities: (entityTypes) =>
        Effect.gen(function* () {
          for (const entityType of Object.keys(options.collections ?? {})) {
            if (!entityTypes.has(entityType)) {
              return yield* conflict(
                `exposure.collections.${entityType}`,
                `Collection override refers to unknown entity type ${entityType}`,
              );
            }
          }
          for (const entityType of Object.keys(options.operations ?? {})) {
            if (!entityTypes.has(entityType)) {
              return yield* conflict(
                `exposure.operations.${entityType}`,
                `Operation override refers to unknown entity type ${entityType}`,
              );
            }
          }
        }),
    }).pipe(
      Effect.mapError((error) =>
        error instanceof DescriptorCompileError ? fromCore(error) : error,
      ),
    );
    const entities: EntityDescriptor[] = compiled.entities.map((entity) => ({
      entityType: entity.entityType,
      collection: collectionOf.get(entity.entityType)!,
      attributes: entity.attributes,
      operations: operationsOf.get(entity.entityType)!,
    }));
    return {
      protocolVersion: 1,
      snapshotId: compiled.snapshotId,
      label: compiled.label,
      entities: entities.sort((a, b) => a.collection.localeCompare(b.collection)),
      constraints: compiled.constraints,
    };
  });
