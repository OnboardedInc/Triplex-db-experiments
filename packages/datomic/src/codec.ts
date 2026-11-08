import spec from "./codec-spec.json";
// [EXP-DA00] Why: preserve exact integer text and decimal scale across JSON. Rejected: Number for longs (rounds above 2^53).
export type TextTag =
  | "long"
  | "ref"
  | "instant"
  | "bigint"
  | "bigdec"
  | "string"
  | "keyword"
  | "uuid";
export type TaggedValue =
  | { t: TextTag; v: string }
  | { t: "double"; v: number }
  | { t: "bool"; v: boolean };
export class DatomicCodecError extends Error {
  readonly _tag = "DatomicCodecError";
}
const invalid = (message: string): never => {
  throw new DatomicCodecError(message);
};
// [EXP-DA01] Why: both runtimes consume one range and grammar definition. Rejected: mirrored constants (boundary drift in V-DA00 F4).
const matches = (pattern: string, value: string) =>
  new RegExp(`^(?:${pattern})$`, "u").exec(value)?.[0] === value;
export function validateTagged(value: unknown): TaggedValue {
  if (typeof value !== "object" || value === null || !("t" in value) || !("v" in value))
    return invalid("Expected tagged value");
  const { t, v } = value;
  switch (t) {
    case "long":
    case "ref":
    case "instant":
    case "bigint": {
      if (typeof v !== "string" || !matches(spec.integerPattern, v))
        return invalid("Expected decimal integer text");
      const n = BigInt(v);
      if (t !== "bigint" && (n < BigInt(spec.longMin) || n > BigInt(spec.longMax)))
        return invalid("Long out of range");
      return { t, v };
    }
    case "bigdec": {
      if (typeof v !== "string" || !matches(spec.decimalPattern, v))
        return invalid("Invalid bigdec");
      const [coefficient = "", exponentText = "0"] = v.split(/[eE]/);
      const exponent = BigInt(exponentText);
      const fraction = BigInt(coefficient.split(".")[1]?.length ?? 0);
      const scale = fraction - exponent;
      if (
        exponent < BigInt(spec.exponentMin) ||
        exponent > BigInt(spec.exponentMax) ||
        scale < BigInt(spec.scaleMin) ||
        scale > BigInt(spec.scaleMax)
      )
        return invalid("Bigdec scale or exponent out of range");
      return { t, v };
    }
    case "double":
      if (typeof v !== "number" || !Number.isFinite(v)) return invalid("Nonfinite double");
      return { t, v };
    case "bool":
      if (typeof v !== "boolean") return invalid("Expected boolean");
      return { t, v };
    case "string":
    case "keyword":
    case "uuid":
      if (typeof v !== "string") return invalid("Expected string");
      if (t === "keyword" && !matches(spec.keywordPattern, v)) return invalid("Invalid keyword");
      if (t === "uuid" && !matches(spec.uuidPattern, v)) return invalid("Invalid UUID");
      return { t, v };
    default:
      return invalid("Unknown value tag");
  }
}
// [EXP-DA00] Why: JSON.stringify(-0) erases its sign. Rejected: string-valued doubles (R29 specifies a numeric channel).
export function stringifyExact(value: unknown): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return invalid("Nonfinite JSON number");
    return Object.is(value, -0) ? "-0.0" : JSON.stringify(value);
  }
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stringifyExact).join(",")}]`;
  if (typeof value === "object")
    return `{${Object.entries(value)
      .map(([k, v]) => `${JSON.stringify(k)}:${stringifyExact(v)}`)
      .join(",")}}`;
  return invalid("Unsupported JSON value");
}
export const encodeTagged = (value: TaggedValue): string => stringifyExact(validateTagged(value));
export const decodeTagged = (json: string): TaggedValue => validateTagged(JSON.parse(json));
