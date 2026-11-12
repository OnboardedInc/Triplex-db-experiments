import { typed } from "./canonical.ts";
// [DX-R3-P8] Why: O-REPLAY exports binary64 witness bits alongside its JSON number; public Values have only type/value.
// Rejected: hashing the private witness as a public field, or discarding it without verifying the numeric payload.
export function oraclePublicValue(wire: any): any {
  typed(wire);
  if (wire.type !== "number" && wire.type !== "datetime") return wire;
  if (
    Object.keys(wire).sort().join(",") !== "bits,type,value" ||
    typeof wire.value !== "number" ||
    typeof wire.bits !== "string" ||
    !/^0x[0-9a-fA-F]{16}$/.test(wire.bits)
  )
    throw Error("Invalid O-REPLAY binary64 witness");
  const bytes = new ArrayBuffer(8),
    view = new DataView(bytes);
  view.setBigUint64(0, BigInt(wire.bits), false);
  const value = view.getFloat64(0, false);
  // [DX-R3-P8] Why: JSON loses zero's sign; checked bits remain authoritative. Rejected: normalizing -0 to +0.
  if (!Number.isFinite(value) || value !== wire.value)
    throw Error("O-REPLAY binary64 witness differs from numeric payload");
  return { type: wire.type, value };
}
