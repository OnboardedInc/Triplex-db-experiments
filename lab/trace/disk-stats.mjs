// [DX-T1-9] Why: physical-disk operation/time counters help bound where a slow virtual flush waited.
// Rejected: recording hardware serials or treating aggregate device time as a request-specific service duration.
/** @param {string} text */
export function parseDarwinDiskStats(text) {
  /** @type {{driver: string, statistics: Record<string, number>}[]} */
  const rows = [];
  let driver = "";
  for (const line of text.split("\n")) {
    const identity = /\+-o IOBlockStorageDriver\s+<[^>]*\bid (0x[0-9a-f]+),/.exec(line);
    if (identity) driver = identity[1] ?? "";
    const body = /"Statistics"\s*=\s*\{([^}]+)\}/.exec(line);
    if (!body || !driver) continue;
    const statistics = Object.fromEntries(
      [...(body[1] ?? "").matchAll(/"([^"]+)"\s*=\s*(\d+)/g)].map((m) => [m[1], Number(m[2])]),
    );
    if (
      !Object.keys(statistics).length ||
      Object.values(statistics).some((x) => !Number.isSafeInteger(x) || x < 0)
    )
      throw Error("Invalid disk statistics");
    rows.push({ driver, statistics });
  }
  if (!rows.length) throw Error("Physical disk statistics unavailable");
  return rows;
}
