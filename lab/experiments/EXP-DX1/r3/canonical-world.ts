// [DX-R3] Why: NS worlds contain datetimes/blobs and exact tagged numbers, beyond W0's business-value subset.
// Rejected: W0.factValue (declines those types), or a digest-only comparison (not canonical world bytes).
const canonical = (value: any): any =>
  typeof value === "number"
    ? ["number", Object.is(value, -0) ? "-0" : String(value)]
    : Array.isArray(value)
      ? ["array", value.map(canonical)]
      : value !== null && typeof value === "object"
        ? [
            "object",
            Object.keys(value)
              .sort()
              .map((key) => [key, canonical(value[key])]),
          ]
        : [typeof value, value];
export const worldBytes = (rows: readonly any[]) =>
  JSON.stringify(
    rows
      .map((row) =>
        JSON.stringify(
          canonical({
            id: row.id,
            entityId: row.entityId,
            attribute: row.attribute,
            value: row.value,
            position: row.position,
            validFrom: row.validFrom,
            validTo: row.validTo ?? null,
          }),
        ),
      )
      .sort(),
  );
