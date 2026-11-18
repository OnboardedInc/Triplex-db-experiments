// [DX-T1-15] Why: the full 100k oracle exceeded 15 minutes on the busy host.
// Rejected: shortening the replay, or racing the host timeout with the copy and readback deadlines.
export function oracleTimeouts(caseBytes) {
  const runMs = caseBytes > 128 * 1024 ** 2 ? 1_800_000 : 900_000;
  return { runMs, bridgeMs: runMs + 30_000, clientMs: runMs + 60_000 };
}
