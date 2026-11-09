// [EXP-DA01] Why: adapt XTDB row/visibility codec to the identical public SPI. Rejected: cross-backend source imports (package boundary).
import {
  integer,
  isPatternVariable,
  type TripleValue,
  type ResolvedTemporalBasis,
} from "@triplex-build/triplex";
import type { QueryPattern, TripleRow } from "@triplex-build/triplex/runtime";

export const assertionColumns = [
  "id",
  "entity_id",
  "attribute",
  "value_type",
  "value_string",
  "value_number",
  "value_boolean",
  "value_datetime",
  "value_json",
  "recorded_at",
  "recorded_position",
  "valid_from",
  "valid_to",
  "created_by",
  "retracted_at",
  "retracted_position",
  "retract_tx_id",
  "entity_type",
  "schema_version",
  "tx_id",
] as const;

/** Canonical JSON rejects unsupported values rather than silently replacing them. */
export const canonicalJson = (value: unknown): string => {
  const seen = new Set<object>();
  const encode = (input: unknown): string => {
    if (input === null) return "null";
    if (typeof input === "string" || typeof input === "boolean") return JSON.stringify(input);
    if (typeof input === "number") {
      if (!Number.isFinite(input)) throw new TypeError("JSON numbers must be finite");
      return JSON.stringify(input);
    }
    if (typeof input !== "object") throw new TypeError(`Unsupported JSON value: ${typeof input}`);
    if (seen.has(input)) throw new TypeError("Cyclic JSON is not supported");
    seen.add(input);
    try {
      if (Array.isArray(input)) {
        for (let i = 0; i < input.length; i++) {
          if (!(i in input)) throw new TypeError("Sparse JSON arrays are not supported");
        }
        return `[${input.map(encode).join(",")}]`;
      }
      if (
        Object.getPrototypeOf(input) !== Object.prototype &&
        Object.getPrototypeOf(input) !== null
      ) {
        throw new TypeError("JSON objects must be plain records");
      }
      return `{${Object.keys(input)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${encode((input as Record<string, unknown>)[key])}`)
        .join(",")}}`;
    } finally {
      seen.delete(input);
    }
  };
  return encode(value);
};

export const packValue = (value: TripleValue) => {
  const packed = {
    value_type: value.type,
    value_string: null as string | null,
    value_number: null as number | null,
    value_boolean: null as number | null,
    value_datetime: null as number | null,
    value_json: null as string | null,
  };
  switch (value.type) {
    case "string":
    case "ref":
      packed.value_string = value.value;
      break;
    case "integer":
      if (integer(value.value).value !== value.value)
        throw new TypeError("Integer payload must be canonical decimal text");
      packed.value_string = value.value;
      break;
    case "number":
    case "datetime": {
      if (!Number.isFinite(value.value)) throw new TypeError(`${value.type} must be finite`);
      if (value.type === "number") packed.value_number = value.value;
      else packed.value_datetime = value.value;
      break;
    }
    case "boolean":
      packed.value_boolean = value.value ? 1 : 0;
      break;
    case "json":
      canonicalJson(value.value); // validate while retaining Triplex's public scalar spelling
      packed.value_json = canonicalJson(value.value);
      break;
    case "blob":
      if (!Number.isSafeInteger(value.size) || value.size < 0)
        throw new TypeError("Blob size must be a nonnegative safe integer");
      packed.value_string = value.value;
      packed.value_json = canonicalJson({
        mimeType: value.mimeType,
        size: value.size,
        ...(value.filename === undefined ? {} : { filename: value.filename }),
      });
      break;
  }
  return packed;
};

const nullableNumber = (input: unknown): number | null => {
  if (input === null || input === undefined) return null;
  const value = typeof input === "number" ? input : Number(input);
  if (!Number.isFinite(value))
    throw new TypeError(`Invalid numeric database value: ${String(input)}`);
  return value;
};

export const decodeAssertionRow = (input: Record<string, unknown>): TripleRow => {
  const row: Record<string, unknown> = {};
  for (const column of assertionColumns) row[column] = input[column] ?? null;
  for (const column of [
    "value_number",
    "value_boolean",
    "value_datetime",
    "recorded_at",
    "recorded_position",
    "valid_from",
    "valid_to",
    "retracted_at",
    "retracted_position",
    "schema_version",
  ]) {
    row[column] = nullableNumber(row[column]);
  }
  for (const column of ["recorded_position", "retracted_position"]) {
    if (row[column] !== null && !Number.isSafeInteger(row[column]))
      throw new TypeError(`Unsafe ${column}`);
  }
  for (const column of ["id", "entity_id", "attribute", "value_type"]) {
    if (typeof row[column] !== "string") throw new TypeError(`Missing assertion ${column}`);
  }
  if (row["value_type"] === "integer") {
    const payload = row["value_string"];
    if (typeof payload !== "string" || integer(payload).value !== payload)
      throw new TypeError("Invalid exact integer payload in Datomic");
  }
  return row as unknown as TripleRow;
};

export const visibleAt = (row: TripleRow, basis?: ResolvedTemporalBasis): boolean => {
  if (basis?.recordedPosition !== undefined && row.recorded_position > basis.recordedPosition)
    return false;
  if (basis?.recordedAt !== undefined && row.recorded_at > basis.recordedAt) return false;
  const retractVisible =
    row.retracted_at !== null &&
    (basis?.recordedAt === undefined || row.retracted_at <= basis.recordedAt) &&
    (basis?.recordedPosition === undefined ||
      (row.retracted_position !== null && row.retracted_position <= basis.recordedPosition));
  if (retractVisible) return false;
  return (
    basis === undefined ||
    (row.valid_from <= basis.validAt && (row.valid_to === null || row.valid_to > basis.validAt))
  );
};

export const matchesPattern = (row: TripleRow, pattern: QueryPattern): boolean => {
  if (
    pattern.entityId !== undefined &&
    !isPatternVariable(pattern.entityId) &&
    row.entity_id !== pattern.entityId
  )
    return false;
  if (
    pattern.attribute !== undefined &&
    !isPatternVariable(pattern.attribute) &&
    row.attribute !== pattern.attribute
  )
    return false;
  if (pattern.entityType !== undefined && row.entity_type !== pattern.entityType) return false;
  if (pattern.value !== undefined && !isPatternVariable(pattern.value)) {
    const packed = packValue(pattern.value);
    if (Object.entries(packed).some(([key, value]) => row[key as keyof TripleRow] !== value))
      return false;
  }
  return true;
};

export const assertionValue = (row: TripleRow): TripleValue => {
  switch (row.value_type) {
    case "string":
      return { type: "string", value: row.value_string! };
    case "ref":
      return { type: "ref", value: row.value_string! as never };
    case "integer":
      return integer(row.value_string!);
    case "number":
      return { type: "number", value: row.value_number! };
    case "datetime":
      return { type: "datetime", value: row.value_datetime! };
    case "boolean":
      return { type: "boolean", value: row.value_boolean === 1 };
    case "json":
      return { type: "json", value: JSON.parse(row.value_json!) };
    case "blob":
      return { type: "blob", value: row.value_string!, ...JSON.parse(row.value_json!) };
    default:
      throw new TypeError(`Unknown assertion value family ${row.value_type}`);
  }
};
