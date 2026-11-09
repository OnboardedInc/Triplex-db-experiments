// [EXP-K01-R4] Why: use genuine LocalLog framing around pinned SourceMessage encodings in offline controls. Rejected: maintenance labels supplied by the test instead of decoded bytes.
export function frame(offset, payload) {
  const out = Buffer.alloc(21 + payload.length);
  out[0] = 30; out.writeInt32BE(payload.length, 1); out.writeBigInt64BE(0n, 5);
  Buffer.from(payload).copy(out, 13); out.writeBigInt64BE(BigInt(offset), out.length - 8);
  return out;
}
export function maintenanceFixture(application = false, F = 201, T = 100) {
  const cut = frame(F, [3, 10, 2, 16, 0]);
  const M = F + cut.length;
  const after = frame(M, application ? [3, 50, 0] : [3, 18, 0]);
  return { bytes: Buffer.concat([cut, after]), frontiers: { F, M, T } };
}
