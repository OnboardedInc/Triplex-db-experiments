// [EXP-K01-R10] Why: information_schema.columns.xt_type renders the un-unified Arrow VectorType (information_schema.clj columns and serde/types.clj render-type). Rejected: PgType.fromVectorType's column OID alone (integer/float unions widen).
export function nativeType(oid: number, spec: unknown): string {
  if (typeof spec !== "string") throw Error("G0 missing native type witness");
  // [EXP-K01-R10] Why: a monomorphic primitive, optionally nullable, proves each non-NULL row type. Rejected: inferring union legs from widened bytes; ambiguous/structured declarations refuse.
  const text = spec.trim();
  const m = /^:(\w+)$/.exec(text) ?? /^\[:\?\s+:(\w+)\]$/.exec(text);
  const primitive = m?.[1];
  const oids: Record<string, number> = {
    bool: 16,
    i8: 21,
    i16: 21,
    i32: 23,
    i64: 20,
    f32: 700,
    f64: 701,
    utf8: 25,
    varbinary: 17,
    uuid: 2950,
  };
  const decimal = /^\[(?::\?\s+)?\:decimal\s+([1-9][0-9]*)\s+(-?[0-9]+)\s+(128|256)\]$/.exec(text);
  if (decimal && oid === 1700) return ":decimal/" + decimal.slice(1).join("/");
  if (!primitive || oids[primitive] !== oid)
    throw Error("G0 ambiguous or inconsistent native type/OID: " + String(spec) + " / " + oid);
  return ":" + primitive;
}
export function nativeCatalog(rows: unknown): Record<string, string> {
  if (!Array.isArray(rows)) throw Error("G0 incomplete native catalog");
  const out: Record<string, string> = {};
  for (const r of rows) {
    if (
      !r ||
      typeof r.column_name !== "string" ||
      !r.column_name ||
      typeof r.xt_type !== "string" ||
      Object.hasOwn(out, r.column_name)
    )
      throw Error("G0 incomplete native catalog");
    out[r.column_name] = r.xt_type;
  }
  return out;
}
