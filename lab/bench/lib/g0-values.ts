// [EXP-K01-R9] Why: hash typed representations before any JSON coercion. Rejected: JSON numbers, toJSON hooks and untagged sentinels (representation collisions).
const wireTag = Symbol("tx2.g0.pgwire");
export function wireValue(oid: number, bytes: Uint8Array, nativeType?: string) {
  if (!Number.isSafeInteger(oid) || oid <= 0) throw Error("G0 invalid wire type");
  const hex = Buffer.from(bytes).toString("hex");
  const text = Buffer.from(bytes).toString("utf8");
  // [EXP-K01-R9] Why: text NaN hides payloads and structured JSON can hide nested numeric types/bits. Rejected: granting from an irreversibly decoded representation; exact native transport is required for these types.
  if (
    ![16, 17, 20, 21, 23, 25, 700, 701, 1042, 1043, 1700, 2950].includes(oid) ||
    ([700, 701].includes(oid) && /nan/i.test(text))
  )
    throw Error("G0 wire representation is not lossless for type " + oid);
  return Object.freeze({ [wireTag]: true, oid, hex, nativeType });
}
export function scalar(value: unknown): unknown {
  if (value && typeof value === "object" && (value as any)[wireTag] === true) {
    const v = value as any;
    const text = Buffer.from(v.hex, "hex").toString("utf8");
    return [20, 21, 23, 700, 701, 1700].includes(v.oid)
      ? Number(text)
      : v.oid === 16
        ? text === "t"
        : text;
  }
  return value;
}
export function canonical(value: unknown): string {
  const seen = new Set<object>();
  const frame = (tag: string, payload: string) => tag + payload.length + ":" + payload;
  const encode = (v: unknown): string => {
    if (v === null) return "null;";
    if (typeof v === "boolean") return v ? "bool1;" : "bool0;";
    if (typeof v === "string") {
      const b = Buffer.alloc(v.length * 2);
      for (let i = 0; i < v.length; i++) b.writeUInt16BE(v.charCodeAt(i), i * 2);
      return frame("str", b.toString("hex"));
    }
    if (typeof v === "number") {
      const b = Buffer.alloc(8);
      b.writeDoubleBE(v);
      return frame("f64", b.toString("hex"));
    }
    if (typeof v === "bigint") return frame("int", v.toString());
    if (typeof v !== "object") throw Error("G0 unsupported/missing value");
    if (seen.has(v)) throw Error("G0 cyclic value");
    seen.add(v);
    try {
      if ((v as any)[wireTag] === true) {
        const w = v as any;
        return frame("wire", encode(w.oid) + encode(w.nativeType ?? null) + encode(w.hex));
      }
      if (v instanceof Date) {
        if (!Number.isFinite(v.getTime())) throw Error("G0 invalid date");
        return frame("date", encode(v.getTime()));
      }
      if (v instanceof ArrayBuffer) return frame("arraybuffer", Buffer.from(v).toString("hex"));
      if (ArrayBuffer.isView(v))
        return frame(
          v.constructor.name,
          Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString("hex"),
        );
      if (Array.isArray(v)) {
        if (
          Object.keys(v).length !== v.length ||
          Array.from({ length: v.length }, (_, i) => i).some(
            (i) =>
              !Object.hasOwn(v, i) || !("value" in Object.getOwnPropertyDescriptor(v, String(i))!),
          )
        )
          throw Error("G0 sparse/decorated array");
        return frame("array", v.map(encode).join(""));
      }
      const proto = Object.getPrototypeOf(v);
      if (proto !== Object.prototype && proto !== null)
        throw Error("G0 unsupported object prototype");
      if (Object.getOwnPropertySymbols(v).length) throw Error("G0 unsupported symbol property");
      return frame(
        "object",
        Object.getOwnPropertyNames(v)
          .sort()
          .map((k) => {
            const d = Object.getOwnPropertyDescriptor(v, k)!;
            if (!("value" in d)) throw Error("G0 accessor value");
            return encode(k) + encode(d.value);
          })
          .join(""),
      );
    } finally {
      seen.delete(v);
    }
  };
  return "tx2-value/2;" + encode(value);
}
