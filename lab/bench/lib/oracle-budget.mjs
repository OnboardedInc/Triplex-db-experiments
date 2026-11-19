// [DX-T1-15] Why: the full 100k oracle exceeded 15 minutes on the busy host.
// Rejected: shortening the replay, or racing the host timeout with the copy and readback deadlines.
export function oracleTimeouts(caseBytes) {
  // [DX-BM1] Why: retain the full v3 replay and the 291 MiB 100k case that hit a 30-minute host ceiling.
  // Rejected: sampling away case queries or letting the bridge deadline race the host replay.
  const MiB = 1024 ** 2;
  const runMs = caseBytes > 256 * MiB ? 5_400_000 : caseBytes > 64 * MiB ? 3_600_000 : 900_000;
  return { runMs, bridgeMs: runMs + 30_000, clientMs: runMs + 60_000 };
}
