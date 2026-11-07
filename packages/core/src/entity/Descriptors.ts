/**
 * Release-to-descriptor compiler: the persisted entity-schema and attribute nodes of a config
 * snapshot become engine-neutral entity descriptors.
 *
 * [EXP-R01] Why: moved verbatim from `packages/http/src/ConfigApi.ts` so the projection spec,
 * the repository and the http package compile releases with one function (R9 section 5.2).
 * The REST-only rules (collection paths, operations, "at least one attribute") stay in http and
 * run through `ExposureHooks` at exactly the positions they ran before, so http reports the same
 * first error for every snapshot. Inspired by: packages/http/src/ConfigApi.ts@00a300d:143-380.
 * Rejected: a second copy in core (two compilers drift); moving the REST exposure rules into
 * core (the default collection name rejects multi-word types such as `ProjectMember`, which
 * would make the compiler unusable for projection specs).
 */
import { Effect, Result, Schema } from "effect";

import * as Attribute from "../config/Attribute.js";
import * as ConfigNode from "../config/ConfigNode.js";
import type * as ConfigStore from "../config/ConfigStore.js";
import * as EntityValidation from "../config/EntityValidation.js";
import * as GraphConstraint from "../config/GraphConstraint.js";
import * as TypeExpr from "../config/TypeExpr.js";
import * as TypeSchema from "../config/TypeSchema.js";
import { DescriptorCompileError } from "./Errors.js";

/** The `TripleValue` family an attribute's values are stored as. */
export type StorageFamily =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "datetime"
  | "ref"
  | "json";

export interface AttributeDescriptor {
  readonly key: string;
  readonly alias: string;
  readonly type: TypeExpr.TypeExpr;
  readonly required: boolean;
  readonly cardinality: "one" | "many";
  readonly unique: boolean;
  readonly storage: StorageFamily;
}

export interface EntityDescriptor {
  readonly entityType: string;
  readonly attributes: ReadonlyArray<AttributeDescriptor>;
}

export interface CompiledDescriptors {
  readonly snapshotId: ConfigStore.ConfigSnapshot["id"];
  readonly label: string;
  /** In snapshot walk order; callers sort for presentation. */
  readonly entities: ReadonlyArray<EntityDescriptor>;
  readonly constraints: ReadonlyArray<GraphConstraint.Rule>;
}

/**
 * Optional checks a caller adds at fixed points of the compile. Each hook may fail with its own
 * error type, which the compile propagates unchanged.
 */
export interface ExposureHooks<E> {
  /** After the entity's struct schema is validated, before its attribute usages are read. */
  readonly beforeAttributes?: (entityType: string) => Effect.Effect<void, E>;
  /** After all usages are decoded, before the schema-fields-match-usages check. */
  readonly afterAttributes?: (
    entityType: string,
    attributes: ReadonlyArray<AttributeDescriptor>,
  ) => Effect.Effect<void, E>;
  /** After the entity passed every core check. */
  readonly afterEntity?: (entityType: string) => Effect.Effect<void, E>;
  /** After every entity, before reference targets and constraints are resolved. */
  readonly afterEntities?: (entityTypes: ReadonlySet<string>) => Effect.Effect<void, E>;
}

const entityTypeName = /^[A-Z][A-Za-z0-9]*$/;
const attributeKey = /^:[a-z][a-z0-9_-]*\/[a-z][a-z0-9_-]*$/;

const unsupported = (path: string, message: string) =>
  new DescriptorCompileError({ kind: "unsupported", path, message });
const conflict = (path: string, message: string) =>
  new DescriptorCompileError({ kind: "conflict", path, message });

/** Map a type to the single `TripleValue` family it is stored as; throws when ambiguous. */
export const storageFamily = (expr: TypeExpr.TypeExpr, path: string): StorageFamily => {
  switch (expr._tag) {
    case "Prim":
      switch (expr.prim) {
        case "text":
        case "date":
          return "string";
        case "number":
        case "integer":
          return "number";
        case "int64":
          return "integer";
        case "boolean":
          return "boolean";
        case "instant":
          return "datetime";
      }
    case "Enum":
      return "string";
    case "Ref":
      return "ref";
    case "List":
    case "Struct":
      return "json";
    case "Constrained":
      return storageFamily(expr.base, path);
    case "Union": {
      const families = new Set(expr.members.map((member) => storageFamily(member, path)));
      if (families.size !== 1) {
        throw unsupported(path, "Union members have ambiguous storage encodings");
      }
      return [...families][0]!;
    }
    case "Any":
      throw unsupported(path, "The Any type has no unambiguous REST storage encoding");
  }
};

const objectRecord = (value: unknown): Readonly<Record<string, unknown>> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : undefined;

const parseType = (
  value: unknown,
  path: string,
): Effect.Effect<TypeExpr.TypeExpr, DescriptorCompileError> => {
  const parsed = Schema.decodeUnknownResult(TypeExpr.TypeExprSchema)(value);
  if (Result.isFailure(parsed)) {
    return Effect.fail(unsupported(path, `Invalid TypeExpr: ${parsed.failure.message}`));
  }
  return Effect.succeed(parsed.success);
};

/** Every entity type a type references, in occurrence order. */
export const referenceKinds = (expr: TypeExpr.TypeExpr): ReadonlyArray<string> => {
  switch (expr._tag) {
    case "Ref":
      return [expr.kind];
    case "List":
      return referenceKinds(expr.item);
    case "Struct":
      return Object.values(expr.fields).flatMap((field) => referenceKinds(field.type));
    case "Union":
      return expr.members.flatMap(referenceKinds);
    case "Constrained":
      return referenceKinds(expr.base);
    case "Any":
    case "Prim":
    case "Enum":
      return [];
  }
};

const noHook = Effect.void;

/** Compile only persisted release data; no DSL handles are retained or consulted. */
export const compile = <E = never>(
  snapshot: ConfigStore.ConfigSnapshot,
  hooks: ExposureHooks<E> = {},
): Effect.Effect<CompiledDescriptors, DescriptorCompileError | E> =>
  Effect.gen(function* () {
    const bySlot = new Map<string, ConfigNode.ConfigNode>();
    for (const { node } of ConfigNode.walk(snapshot.root)) {
      const slot = `${node.kind}\u0000${node.key}`;
      const existing = bySlot.get(slot);
      if (existing !== undefined && existing.cid !== node.cid) {
        return yield* conflict(
          `config.${node.kind}.${node.key}`,
          `Configuration contains conflicting ${node.kind} definitions for ${node.key}`,
        );
      }
      bySlot.set(slot, node);
    }

    const attributeTypes = new Map<string, TypeExpr.TypeExpr>();
    for (const node of bySlot.values()) {
      if (node.kind !== Attribute.KIND) continue;
      if (!attributeKey.test(node.key)) {
        return yield* unsupported(
          `attributes.${node.key}`,
          `Attribute identity must be a lowercase namespaced keyword`,
        );
      }
      if (node.key.startsWith(":triplex/") || node.key.startsWith(":_tx/")) {
        return yield* conflict(`attributes.${node.key}`, `${node.key} is reserved by Triplex`);
      }
      const attrs = objectRecord(node.attrs);
      if (attrs?.["key"] !== node.key || attrs["valueType"] === undefined) {
        return yield* unsupported(
          `attributes.${node.key}`,
          `Attribute ${node.key} is missing complete Attribute metadata`,
        );
      }
      const type = yield* parseType(attrs["valueType"], `attributes.${node.key}.type`);
      try {
        TypeSchema.compile(type);
      } catch (error) {
        return yield* unsupported(
          `attributes.${node.key}.type`,
          `Attribute type cannot be compiled: ${String(error)}`,
        );
      }
      attributeTypes.set(node.key, type);
    }

    const entityTypes = new Set<string>();
    const entities: EntityDescriptor[] = [];
    for (const node of bySlot.values()) {
      if (node.kind !== EntityValidation.ENTITY_SCHEMA_KIND) continue;
      if (!entityTypeName.test(node.key)) {
        return yield* unsupported(
          `entities.${node.key}`,
          `Entity type identity must be PascalCase`,
        );
      }
      if (node.key === "_Transaction" || node.key.startsWith("triplex.")) {
        return yield* conflict(
          `entities.${node.key}`,
          `${node.key} is reserved by Triplex and cannot be exposed`,
        );
      }
      entityTypes.add(node.key);
      const attrs = objectRecord(node.attrs);
      const usages = objectRecord(attrs?.["attributes"]);
      if (
        attrs?.["entityType"] !== node.key ||
        usages === undefined ||
        attrs["type"] === undefined
      ) {
        return yield* unsupported(
          `entities.${node.key}`,
          `Entity ${node.key} was defined without complete EntityType/Attribute usage metadata`,
        );
      }
      const entitySchema = yield* parseType(attrs["type"], `entities.${node.key}.type`);
      if (entitySchema._tag !== "Struct") {
        return yield* unsupported(
          `entities.${node.key}.type`,
          "Entity type must be a closed struct",
        );
      }
      yield* hooks.beforeAttributes?.(node.key) ?? noHook;

      const descriptors: AttributeDescriptor[] = [];
      const seenAttributes = new Set<string>();
      for (const [alias, rawUsage] of Object.entries(usages).sort(([a], [b]) =>
        a.localeCompare(b),
      )) {
        const usage = objectRecord(rawUsage);
        const key = usage?.["attribute"];
        const required = usage?.["required"];
        const cardinality = usage?.["cardinality"];
        const unique = usage?.["unique"];
        if (
          typeof key !== "string" ||
          typeof required !== "boolean" ||
          (cardinality !== "one" && cardinality !== "many") ||
          typeof unique !== "boolean"
        ) {
          return yield* unsupported(
            `entities.${node.key}.attributes.${alias}`,
            `Entity ${node.key} has invalid usage metadata for ${alias}`,
          );
        }
        if (seenAttributes.has(key)) {
          return yield* conflict(
            `entities.${node.key}.attributes.${alias}`,
            `Entity ${node.key} uses ${key} more than once`,
          );
        }
        const type = attributeTypes.get(key);
        if (type === undefined) {
          return yield* unsupported(
            `entities.${node.key}.attributes.${alias}`,
            `Entity ${node.key} references unresolved attribute ${key}`,
          );
        }
        const field = entitySchema.fields[key];
        const expectedFieldType = cardinality === "many" ? TypeExpr.list(type) : type;
        if (
          field === undefined ||
          field.optional === required ||
          field.fallback !== undefined ||
          TypeExpr.canonical(field.type) !== TypeExpr.canonical(expectedFieldType)
        ) {
          return yield* conflict(
            `entities.${node.key}.attributes.${alias}`,
            `Entity schema and usage metadata disagree about ${key}`,
          );
        }
        seenAttributes.add(key);
        let storage: StorageFamily;
        try {
          storage = storageFamily(type, `entities.${node.key}.attributes.${alias}.type`);
        } catch (error) {
          return yield* error as DescriptorCompileError;
        }
        descriptors.push({ key, alias, type, required, cardinality, unique, storage });
      }
      yield* hooks.afterAttributes?.(node.key, descriptors) ?? noHook;
      const schemaFields = Object.keys(entitySchema.fields).sort();
      const usageFields = [...seenAttributes].sort();
      if (
        schemaFields.length !== usageFields.length ||
        schemaFields.some((key, index) => key !== usageFields[index])
      ) {
        return yield* conflict(
          `entities.${node.key}.type`,
          `Entity schema fields must exactly match its Attribute usage metadata`,
        );
      }
      yield* hooks.afterEntity?.(node.key) ?? noHook;
      entities.push({
        entityType: node.key,
        attributes: descriptors.sort((a, b) => a.key.localeCompare(b.key)),
      });
    }
    yield* hooks.afterEntities?.(entityTypes) ?? noHook;
    for (const entity of entities) {
      for (const attribute of entity.attributes) {
        for (const target of referenceKinds(attribute.type)) {
          if (!entityTypes.has(target)) {
            return yield* unsupported(
              `entities.${entity.entityType}.attributes.${attribute.alias}.type`,
              `Reference target ${target} is not defined in this configuration snapshot`,
            );
          }
        }
      }
    }
    const constraints = yield* GraphConstraint.collect(snapshot.root).pipe(
      Effect.map((items) => items.map((item) => item.rule)),
      Effect.mapError((error) =>
        conflict("constraints", "message" in error ? error.message : String(error)),
      ),
    );
    return { snapshotId: snapshot.id, label: snapshot.label, entities, constraints };
  });
