import { integer, type TripleValue } from "@triplex-build/triplex";
export const canonicalJson = (value: unknown): string => {
  const seen = new Set<object>();
  const go = (input: unknown): string => {
    if (input === null || typeof input === "string" || typeof input === "boolean")
      return JSON.stringify(input);
    if (typeof input === "number") {
      if (!Number.isFinite(input)) throw new TypeError("JSON numbers must be finite");
      return JSON.stringify(input);
    }
    if (typeof input !== "object" || seen.has(input))
      throw new TypeError("Unsupported or cyclic JSON value");
    if (
      !Array.isArray(input) &&
      Object.getPrototypeOf(input) !== Object.prototype &&
      Object.getPrototypeOf(input) !== null
    )
      throw new TypeError("JSON objects must be plain records");
    seen.add(input);
    try {
      if (Array.isArray(input)) {
        for (let i = 0; i < input.length; i++)
          if (!(i in input)) throw new TypeError("Sparse JSON arrays are unsupported");
        return `[${input.map(go).join(",")}]`;
      }
      if (Object.getOwnPropertySymbols(input).length)
        throw new TypeError("JSON symbol keys are unsupported");
      return `{${Object.keys(input)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${go((input as Record<string, unknown>)[key])}`)
        .join(",")}}`;
    } finally {
      seen.delete(input);
    }
  };
  return go(value);
};
export const packValue = (value: TripleValue) => {
  const row = {
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
      row.value_string = value.value;
      break;
    case "integer":
      if (integer(value.value).value !== value.value) throw new TypeError("Noncanonical integer");
      row.value_string = value.value;
      break;
    case "number":
    case "datetime":
      if (!Number.isFinite(value.value)) throw new TypeError("Numeric values must be finite");
      if (value.type === "number") row.value_number = value.value;
      else row.value_datetime = value.value;
      break;
    case "boolean":
      row.value_boolean = value.value ? 1 : 0;
      break;
    case "json":
      canonicalJson(value.value);
      row.value_json = JSON.stringify(value.value);
      break;
    case "blob":
      if (!Number.isSafeInteger(value.size) || value.size < 0)
        throw new TypeError("Unsafe blob size");
      row.value_string = value.value;
      row.value_json = canonicalJson({
        mimeType: value.mimeType,
        size: value.size,
        ...(value.filename === undefined ? {} : { filename: value.filename }),
      });
      break;
  }
  return row;
};
