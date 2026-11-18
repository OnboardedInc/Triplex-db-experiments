// [DX-T1-15] Why: the full 100k oracle exceeded 15 minutes on the busy host.
// Rejected: shortening the replay, or racing the host timeout with the copy and readback deadlines.
export function oracleTimeouts(caseBytes) {
  // [DX-BM1] Why: the 95 MiB full v3 case returned no oracle bytes under the old 15-minute bridge limit.
  // Rejected: sampling away case queries or letting the outer timeout race the host replay.
  const runMs = caseBytes > 64 * 1024 ** 2 ? 1_800_000 : 900_000;
  return { runMs, bridgeMs: runMs + 30_000, clientMs: runMs + 60_000 };
}
