import type { QleverFamilyDomainQuery, QleverFamilyDomainRequest } from "./FamilyDomains.js";

/** One native pass emits exact numeric-family presence flags, never source rows. */
export const compileFamilyDomainMask = ({
  where,
  bindings,
  maxSummaryRows,
}: QleverFamilyDomainRequest): QleverFamilyDomainQuery => {
  if (!Number.isSafeInteger(maxSummaryRows) || maxSummaryRows < 1)
    throw new RangeError("Family summary row budget must be a positive safe integer");
  if (!bindings.length || bindings.length > 256 || bindings.some((binding) => !binding.family))
    throw new RangeError("A family mask requires from1through256 bound family expressions");
  if (new Set(bindings.map((binding) => binding.variable)).size !== bindings.length)
    throw new TypeError("Family summary variables must be unique");
  const projection = bindings.flatMap((binding, index) => [
    `(MAX(IF((${binding.family}) = "number", 1, 0)) AS ?d${index}_number)`,
    `(MAX(IF((${binding.family}) = "integer", 1, 0)) AS ?d${index}_integer)`,
  ]);
  return {
    sparql: `SELECT ${projection.join(" ")} WHERE { ${where} } LIMIT 2`,
    decode: (rows) => {
      if (rows.length > maxSummaryRows || rows.length > 1)
        throw new RangeError("Native family-mask summary returned multiple aggregate rows");
      const output = new Map<string, ReadonlySet<string>>();
      for (const [index, binding] of bindings.entries()) {
        const number = rows[0]?.[`d${index}_number`]?.value,
          integer = rows[0]?.[`d${index}_integer`]?.value;
        const families = new Set<string>();
        if (number === undefined && integer === undefined) {
          output.set(binding.variable, families);
          continue;
        }
        if ((number !== "0" && number !== "1") || (integer !== "0" && integer !== "1"))
          throw new TypeError(
            "Native family-mask flags must both be exact0or1, or both absent for empty input",
          );
        if (number === "1") families.add("number");
        if (integer === "1") families.add("integer");
        output.set(binding.variable, families);
      }
      return output;
    },
  };
};
