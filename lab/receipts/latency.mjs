// @ts-check
// [EXP-QNODELAY] Why: timing writers must provide actual transport metadata before
// serialization, including JS harnesses. Rejected: optional fields or inferring
// missing historical modes from today's environment (would mislabel old data).
/** @typedef {'keep-alive' | 'per-request'} QleverConnectionMode */
/** @typedef {{ readonly qleverConnectionMode: QleverConnectionMode }} QleverLatencyReceipt */
/** @typedef {{ readonly qleverConnectionMode: QleverConnectionMode | null }} LatencyReceipt */

/** @param {unknown} mode @returns {QleverConnectionMode} */
export function requireQleverConnectionMode(mode) {
  if (mode !== "keep-alive" && mode !== "per-request")
    throw new TypeError(
      "QLever latency receipt requires an explicit keep-alive or per-request mode",
    );
  return mode;
}

/** @template {QleverLatencyReceipt} T @param {T} receipt @returns {T} */
export function qleverLatencyReceipt(receipt) {
  requireQleverConnectionMode(receipt.qleverConnectionMode);
  return receipt;
}

/** @template {LatencyReceipt} T @param {T} receipt @returns {T} */
export function latencyReceipt(receipt) {
  if (receipt.qleverConnectionMode !== null)
    requireQleverConnectionMode(receipt.qleverConnectionMode);
  return receipt;
}
