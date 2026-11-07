import type { QleverFamilyDomainQuery, QleverFamilyDomainRequest } from "./FamilyDomains.js";

/** One bounded family-only projection, without aggregate admission work. */
export const compileFamilyDomainDistinct = ({
  where,
  bindings,
  maxSummaryRows,
}: QleverFamilyDomainRequest): QleverFamilyDomainQuery => {
  if (!bindings.length || !Number.isSafeInteger(maxSummaryRows) || maxSummaryRows < 1)
    throw new RangeError("Invalid QLever family summary budget or bindings");
  if (new Set(bindings.map(({ variable }) => variable)).size !== bindings.length)
    throw new TypeError("Duplicate family summary variable");
  return {
    sparql: `SELECT DISTINCT ${bindings.map(({ family }, i) => `(${family} AS ?family${i})`).join(" ")} WHERE { ${where} } LIMIT ${maxSummaryRows + 1}`,
    decode: (rows) => {
      if (rows.length > maxSummaryRows)
        throw new RangeError("QLever family summary exceeds row budget; no partial type inference");
      return new Map(
        bindings.map(({ variable }, i) => [
          variable,
          new Set(
            rows.flatMap((row) => {
              const family = row[`family${i}`]?.value;
              if (family === undefined) return [];
              if (!["number", "integer", "boolean", "string"].includes(family))
                throw new TypeError("Invalid QLever scalar family summary");
              return [family];
            }),
          ),
        ]),
      );
    },
  };
};
