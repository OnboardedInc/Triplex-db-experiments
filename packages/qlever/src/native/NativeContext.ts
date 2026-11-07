import type { TypeExpr } from "@triplex-build/triplex/config";
import { integer } from "@triplex-build/triplex";
import { nativeAttributeKey, type NativeReadBasis } from "@triplex-build/triplex/runtime";
import {
  fieldIri,
  graphIri,
  integerOrderKey,
  literal,
  numericOrderKey,
  numericShadowIsExact,
} from "../rdf.js";

export interface QleverNativeAttribute {
  readonly key: string;
  readonly type: TypeExpr.TypeExpr;
}

export interface QleverNativeFactOptions {
  readonly assertion?: string;
  readonly order?: string;
  readonly validFrom?: string;
  readonly validTo?: string;
}

export interface QleverNativeEntity {
  readonly _tag: "QleverNativeEntity";
  readonly value: string;
}

const variable = (name: string): string => {
  if (!/^\?[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new TypeError("Invalid SPARQL variable");
  return name;
};
const atom = (value: string | QleverNativeEntity): string => {
  if (typeof value === "string") return value.startsWith("?") ? variable(value) : literal(value);
  if (value._tag !== "QleverNativeEntity") throw new TypeError("Invalid native entity literal");
  return literal(value.value);
};

const physicalType = (
  type: TypeExpr.TypeExpr,
): { storage: string; payload: string; order?: string } => {
  if (type._tag === "Constrained") return physicalType(type.base);
  if (type._tag === "Ref") return { storage: "ref", payload: "value_string" };
  if (type._tag === "Enum") return { storage: "string", payload: "value_string" };
  if (type._tag !== "Prim")
    throw new TypeError(
      "Native fact helpers require a scalar attribute; write arbitrary SPARQL for other native relations",
    );
  switch (type.prim) {
    case "text":
    case "date":
      return { storage: "string", payload: "value_string" };
    case "number":
    case "integer":
      return { storage: "number", payload: "value_number", order: "value_number_order" };
    case "int64":
      return { storage: "integer", payload: "value_string", order: "value_integer_order" };
    case "instant":
      return { storage: "datetime", payload: "value_datetime", order: "value_datetime_order" };
    case "boolean":
      return { storage: "boolean", payload: "value_boolean" };
  }
};

export const QLEVER_NATIVE_MAPPING_ID = "triplex/qlever-native/assertion-lexical/v1";

/**
 * Native SPARQL fragments over the assertion mapping in rdf.ts. The typed
 * payload predicate avoids a general Datalog payload pivot and preserves -0.
 * These helpers describe a trusted read view; they do not sandbox raw SPARQL.
 */
export const makeQleverNativeContext = (basis: NativeReadBasis) => {
  const graph = graphIri(basis.scope);
  let sequence = 0;
  const visible = (subject: string, prefix: string, recordedOnly: boolean): string => {
    const from = `?${prefix}_from`,
      to = `?${prefix}_to`,
      recorded = `?${prefix}_recorded`;
    const retracted = `?${prefix}_retracted`,
      retractedAt = `?${prefix}_retracted_at`,
      recordedAt = `?${prefix}_recorded_at`;
    return `${subject} ${fieldIri("recorded_position_order")} ${recorded} .
${recordedOnly ? "" : `${subject} ${fieldIri("valid_from_order")} ${from} . OPTIONAL { ${subject} ${fieldIri("valid_to_order")} ${to} }`}
OPTIONAL { ${subject} ${fieldIri("retracted_position_order")} ${retracted}${basis.recordedAt === undefined ? "" : ` ; ${fieldIri("retracted_at_order")} ${retractedAt}`} }
${basis.recordedAt === undefined ? "" : `${subject} ${fieldIri("recorded_at_order")} ${recordedAt} .`}
FILTER(${recorded} <= ${literal(numericOrderKey(basis.recordedPosition))})
${recordedOnly ? "" : `FILTER(${from} <= ${literal(numericOrderKey(basis.validAt))} && (!BOUND(${to}) || ${to} > ${literal(numericOrderKey(basis.validAt))}))`}
FILTER(!BOUND(${retracted}) || ${retracted} > ${literal(numericOrderKey(basis.recordedPosition))}${basis.recordedAt === undefined ? "" : ` || ${retractedAt} > ${literal(numericOrderKey(basis.recordedAt))}`})
${basis.recordedAt === undefined ? "" : `FILTER(${recordedAt} <= ${literal(numericOrderKey(basis.recordedAt))})`}`;
  };
  const fact = (
    entity: string | QleverNativeEntity,
    attribute: QleverNativeAttribute,
    value: string,
    options: QleverNativeFactOptions,
    recordedOnly: boolean,
  ) => {
    const prefix = `__triplex_native_${sequence++}`;
    const subject = options.assertion ? variable(options.assertion) : `?${prefix}_assertion`;
    const kind = physicalType(attribute.type);
    if (options.order && !kind.order)
      throw new TypeError("This schema attribute has no numeric order channel");
    return `GRAPH ${graph} {
${subject} ${fieldIri("entity_id")} ${atom(entity)} ; ${fieldIri("attribute")} ${literal(nativeAttributeKey(attribute))} ; ${fieldIri("value_type")} ${literal(kind.storage)} ; ${fieldIri(kind.payload)} ${variable(value)} .
${options.order ? `${subject} ${fieldIri(kind.order!)} ${variable(options.order)} .` : ""}
${options.validFrom ? `${subject} ${fieldIri("valid_from")} ${variable(options.validFrom)} .` : ""}
${options.validTo ? `OPTIONAL { ${subject} ${fieldIri("valid_to")} ${variable(options.validTo)} }` : ""}
${visible(subject, prefix, recordedOnly)}
}`;
  };
  return {
    basis,
    graph,
    variable,
    literal,
    entity: (value: string): QleverNativeEntity => {
      literal(value); // Validate the same exact lexical carrier used by writes.
      return Object.freeze({ _tag: "QleverNativeEntity", value });
    },
    iri: (value: string): string => {
      if (
        !value.isWellFormed() ||
        !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value) ||
        /[<>"{}|^`\\\s\u0000-\u001f]/.test(value)
      )
        throw new TypeError("Invalid absolute SPARQL IRI");
      return `<${value}>`;
    },
    integer: (value: string | bigint): string => literal(integer(value).value),
    integerOrder: (value: string | bigint): string =>
      literal(integerOrderKey(integer(value).value)),
    numberOrder: (value: number): string => literal(numericOrderKey(value)),
    nativeNumber: (value: number): string => {
      if (Object.is(value, -0) || !numericShadowIsExact(value))
        throw new RangeError(
          "This parameter cannot be represented exactly by QLever native arithmetic; use lexical/order channels",
        );
      return Number.isInteger(value) && value >= -(2 ** 59) && value < 2 ** 59
        ? String(value)
        : `${literal(String(value))}^^<http://www.w3.org/2001/XMLSchema#double>`;
    },
    fact: (
      entity: string | QleverNativeEntity,
      attribute: QleverNativeAttribute,
      value: string,
      options: QleverNativeFactOptions = {},
    ): string => {
      return fact(entity, attribute, value, options, false);
    },
    /** Live assertions at the knowledge cut across all business-time intervals. */
    recordedFact: (
      entity: string | QleverNativeEntity,
      attribute: QleverNativeAttribute,
      value: string,
      options: QleverNativeFactOptions = {},
    ) => fact(entity, attribute, value, options, true),
  };
};

export type QleverNativeContext = ReturnType<typeof makeQleverNativeContext>;
export type QleverNativeBuilder = (context: QleverNativeContext, parameters: unknown) => string;
