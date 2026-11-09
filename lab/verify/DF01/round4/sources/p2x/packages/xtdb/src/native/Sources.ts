import { nativeAttributeKey, type NativeReadBasis } from "@triplex-build/triplex/runtime";
import { integer } from "@triplex-build/triplex";
import { assertionColumns, canonicalJson } from "../codecs.js";

export interface XtdbNativeContext {
  readonly basis: NativeReadBasis;
  readonly bind: (value: unknown) => string;
  /** Attribute handles remain Triplex schema identities, not native column names. */
  readonly attribute: (attribute: string | { readonly key: string }) => string;
  readonly identifier: (name: string) => string;
  /** A closed native relation. Add selective predicates in the authored native query. */
  readonly facts: () => string;
  /** Live at the knowledge cut over all business time, for native interval queries. */
  readonly recordedFacts: () => string;
  /** All assertions known at the cut, including known retractions. */
  readonly history: () => string;
}

export const nativeParameter = (value: unknown): unknown => {
  if (typeof value === "object" && value !== null && "type" in value && value.type === "integer") {
    if (!("value" in value) || typeof value.value !== "string")
      throw new TypeError("Invalid native int64 parameter");
    const normalized = integer(value.value).value;
    if (normalized !== value.value)
      throw new TypeError("Native int64 parameters must be canonical");
    return BigInt(normalized);
  }
  if (typeof value === "bigint") return BigInt(integer(value).value);
  if (typeof value === "number" && !Number.isFinite(value))
    throw new TypeError("Native numeric parameters must be finite");
  if (typeof value === "string" && !value.isWellFormed())
    throw new TypeError("Native text parameters require well-formed Unicode");
  if (value === undefined) throw new TypeError("Undefined is not a native query parameter");
  if (typeof value === "object" && value !== null) canonicalJson(value);
  return value;
};

export const quoteNativeIdentifier = (name: string): string => {
  if (!name || !name.isWellFormed() || name.includes("\0"))
    throw new TypeError("Invalid native identifier");
  return `"${name.replaceAll('"', '""')}"`;
};

export const makeNativeContext = (
  language: "xtql" | "xtdb-sql",
  basis: NativeReadBasis,
): { readonly context: XtdbNativeContext; readonly parameters: unknown[] } => {
  const parameters: unknown[] = [];
  const bind = (value: unknown): string => {
    parameters.push(nativeParameter(value));
    return language === "xtql" ? `triplex_param_${parameters.length}` : `$${parameters.length}`;
  };
  const source = (history: boolean, atValidTime = !history): string => {
    const scope = bind(basis.scope),
      position = bind(basis.recordedPosition),
      recorded = basis.recordedAt === undefined ? undefined : bind(basis.recordedAt);
    if (language === "xtdb-sql") {
      const knownRetraction = [
        "retracted_at IS NOT NULL",
        "retracted_position IS NOT NULL",
        `retracted_position <= ${position}`,
        ...(recorded === undefined ? [] : [`retracted_at <= ${recorded}`]),
      ].join(" AND ");
      const conditions = [
        `scope_key = ${scope}`,
        `recorded_position <= ${position}`,
        ...(recorded === undefined ? [] : [`recorded_at <= ${recorded}`]),
        ...(history ? [] : [`NOT (${knownRetraction})`]),
      ];
      if (atValidTime) {
        const valid = bind(basis.validAt);
        conditions.push(`valid_from <= ${valid}`, `(valid_to IS NULL OR valid_to > ${valid})`);
      }
      // These rows may have been retracted after this source cut. Hide future
      // metadata as well as filtering future assertions: SELECT * stays historical.
      const projection = assertionColumns.map((column) =>
        ["retracted_at", "retracted_position", "retract_tx_id"].includes(column)
          ? `CASE WHEN ${knownRetraction} THEN ${column} ELSE NULL END AS ${column}`
          : column,
      );
      return `(SELECT ${projection.join(", ")} FROM tx_assertions FOR ALL VALID_TIME WHERE ${conditions.join(" AND ")})`;
    }
    const knownRetraction = `(and (not (nil? retracted_at)) (not (nil? retracted_position)) (<= retracted_position ${position})${recorded === undefined ? "" : ` (<= retracted_at ${recorded})`})`;
    const conditions = [
      `(= scope_key ${scope})`,
      `(<= recorded_position ${position})`,
      ...(recorded === undefined ? [] : [`(<= recorded_at ${recorded})`]),
      ...(history ? [] : [`(not ${knownRetraction})`]),
    ];
    if (atValidTime) {
      const valid = bind(basis.validAt);
      conditions.push(`(<= valid_from ${valid})`, `(or (nil? valid_to) (> valid_to ${valid}))`);
    }
    // XTDB v2.2.0 XTQL from/where/with are native relational operators. This
    // explicit all-time source preserves Triplex's numeric fractional coordinates.
    // https://github.com/xtdb/xtdb/blob/v2.2.0/core/src/main/clojure/xtdb/xtql.clj
    return `(-> (from :tx_assertions {:for-valid-time :all-time :bind [scope_key ${assertionColumns.join(" ")}]}) (where ${conditions.join(" ")}) (with {:retracted_at (if ${knownRetraction} retracted_at nil) :retracted_position (if ${knownRetraction} retracted_position nil) :retract_tx_id (if ${knownRetraction} retract_tx_id nil)}) (without :scope_key))`;
  };
  return {
    parameters,
    context: {
      basis,
      bind,
      attribute: (attribute) => bind(nativeAttributeKey(attribute)),
      identifier:
        language === "xtdb-sql"
          ? quoteNativeIdentifier
          : (name) => {
              if (!/^[A-Za-z_][A-Za-z0-9_/-]*$/.test(name))
                throw new TypeError("XTQL identifiers must be valid native symbols");
              return name;
            },
      facts: () => source(false),
      recordedFacts: () => source(false, false),
      history: () => source(true),
    },
  };
};

export const xtqlStatement = (query: string, parameterCount: number): string => {
  // The pinned parser accepts XTQL ('EDN', $1, ...). A SQL single-quoted
  // literal plus untouched $n binds avoids rewriting XTQL exists? and strings.
  // https://github.com/xtdb/xtdb/blob/v2.2.0/core/src/main/antlr/xtdb/antlr/Sql.g4
  const fn = `(fn [${Array.from({ length: parameterCount }, (_, i) => `triplex_param_${i + 1}`).join(" ")}] ${query})`;
  return `XTQL ('${fn.replaceAll("'", "''")}'${Array.from({ length: parameterCount }, (_, i) => `, $${i + 1}`).join("")})`;
};
