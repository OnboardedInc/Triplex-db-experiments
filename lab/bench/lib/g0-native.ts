// [EXP-K01-R11] Why: information_schema.clj:348-358 prints serde/types.clj:256-288 render-type, including EDN sets for Poly. Rejected: ArrowType :union as the catalog spelling or widened result OIDs alone.
export function nativeType(oid: number, spec: unknown): string {
  if (typeof spec !== "string") throw Error("G0 missing native type witness");
  // [EXP-K01-R10] Why: a monomorphic primitive, optionally nullable, proves each non-NULL row type. Rejected: inferring union legs from widened bytes; ambiguous/structured declarations refuse.
  const text = spec.trim();
  // [EXP-K01-R11] Why: serde/types.clj:279-284 flattens nullable Mono into [:? :kind ...]. Rejected: treating a nullable scalar as a mixed-width union.
  const m = /^:(\w+)$/.exec(text) ?? /^\[:\?\s+:(\w+)\]$/.exec(text);
  const primitive = m?.[1];
  const oids: Record<string, number> = {
    // [EXP-K01-R11] Why: PgType.kt:284-286 Bool / :971; Rejected: a decoded JS boolean as a native type witness.
    bool: 16,
    // [EXP-K01-R11] Why: PgType.kt:226-229,206-209,186-189 and :951-955 map I16/I32/I64; other widths error. Rejected: mapping I8 to Int2 (unsupported by this engine).
    i16: 21,
    i32: 23,
    i64: 20,
    // [EXP-K01-R11] Why: PgType.kt:245-248,264-267 and :958-960 map F32/F64 separately. Rejected: accepting an all-float union widened to Float8 (:1017).
    f32: 700,
    f64: 701,
    // [EXP-K01-R11] Why: PgType.kt:312-315 / :964-966 maps Arrow UTF8 to Text. Rejected: inferring a native column from a varchar cast's OID 1043.
    utf8: 25,
    // [EXP-K01-R11] Why: PgType.kt:582-585 / :967-969 maps Binary to Bytes. Rejected: parsing text as native binary without a catalog witness.
    varbinary: 17,
    // [EXP-K01-R11] Why: PgType.kt:737-740 / :980-981 maps UuidType. Rejected: treating an ordinary UUID-looking UTF8 string as UUID storage.
    uuid: 2950,
  };
  // [EXP-K01-R11] Why: serde/types.clj:113-115,279-284 emits [[:?] :decimal precision scale bitwidth]; PgType.kt:349-352,972 uses Numeric OID 1700. Rejected: losing decimal metadata to the wire placeholder.
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

// [EXP-K01-R11] Why: serde/types.clj:286-288 prints Poly as an unordered EDN set; PgType.kt:1013-1025 widens numeric legs and drops Null. Rejected: probes matching :union (an Arrow input tag, not catalog output) or depending on set order. This helper never grants admission; nativeType still refuses all unions.
export function nativeUnionLegs(spec: unknown): string[] {
  if (
    typeof spec !== "string" ||
    !/^#\{\s*(?::[a-z][a-z0-9-]*\s+)*:[a-z][a-z0-9-]*\s*\}$/.test(spec)
  )
    throw Error("G0 invalid primitive native union");
  const legs = spec.slice(2, -1).trim().split(/\s+/);
  if (legs.length < 2 || new Set(legs).size !== legs.length)
    throw Error("G0 invalid primitive native union");
  return legs.sort();
}
