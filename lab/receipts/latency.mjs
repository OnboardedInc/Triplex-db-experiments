// @ts-nocheck -- [CX-A01-040] Why: integration adds this runtime protocol or command fixture to checkJs; dynamic JSON/message fields lack static record types. Binding errors remain checked by lab/bin/checkjs.mjs. Rejected: excluding current executable code.
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
  return Object.assign(
    {
      receiptVersion: "qlever-latency/1",
      latencyWriter:
        Reflect.get(receipt, "latencyWriter") ??
        (typeof Reflect.get(receipt, "writer") === "string"
          ? Reflect.get(receipt, "writer")
          : Reflect.get(receipt, "format")),
      units: "ms",
    },
    receipt,
  );
}

/** @template {LatencyReceipt} T @param {T} receipt @returns {T} */
export function latencyReceipt(receipt) {
  if (receipt.qleverConnectionMode !== null)
    requireQleverConnectionMode(receipt.qleverConnectionMode);
  return Object.assign(
    {
      receiptVersion: "qlever-latency/1",
      latencyWriter:
        Reflect.get(receipt, "latencyWriter") ??
        (typeof Reflect.get(receipt, "writer") === "string"
          ? Reflect.get(receipt, "writer")
          : Reflect.get(receipt, "format")),
      units: "ms",
    },
    receipt,
  );
}

// [EXP-QNODELAY] Why: current producers may resolve their selected factory mode;
// readers must validate the recorded mode instead. Rejected: relabeling old data
// from the summarizer process environment.
/** @param {string} backend @returns {QleverConnectionMode | null} */
export function connectionModeForBackend(backend) {
  return backend.startsWith("qlever")
    ? requireQleverConnectionMode(process.env.TRIPLEX_QLEVER_CONNECTION_MODE ?? "keep-alive")
    : null;
}
/** @param {{ lane?: string, backend?: string, queryPath?: string, qleverConnectionMode?: unknown }} receipt @returns {QleverConnectionMode | null} */
export function recordedConnectionMode(receipt) {
  return receipt.qleverConnectionMode === null
    ? null
    : requireQleverConnectionMode(receipt.qleverConnectionMode);
}
