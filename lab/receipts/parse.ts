// [EXP-QNODELAY] Why: reject missing transport metadata at the consumption boundary,
// regardless of the writer's field names, units or serializer. Rejected: searching
// for timing writers or reconstructing historical mode from today's environment.
import type { LatencyReceipt, QleverConnectionMode } from "./latency.mjs";

export interface ReceiptContext {
  readonly lane?: string;
  readonly source?: string;
}
// [EXP-QNODELAY] Why: payload content schemas remain with their existing gates.
// Rejected: treating valid mode metadata as semantic/freshness/binding acceptance.
export type ParsedLatencyReceipt = Record<string, any> & LatencyReceipt;
const qlever = (lane: unknown) => typeof lane === "string" && lane.startsWith("qlever");
const nonQlever = (lane: unknown) =>
  typeof lane === "string" && /^(?:xtdb|duckdb|datomic|memory)(?:$|-)/.test(lane);
const modeOf = (mode: unknown): mode is QleverConnectionMode =>
  mode === "keep-alive" || mode === "per-request";

export function parseLatencyReceipt(
  input: unknown,
  context: ReceiptContext = {},
): ParsedLatencyReceipt {
  const fail = (detail: string): never => {
    throw new TypeError(`${context.source ?? "latency receipt"}: ${detail}`);
  };
  const value: unknown =
    typeof input === "string"
      ? JSON.parse(input)
      : input instanceof Uint8Array
        ? JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(input))
        : input;
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return fail("expected a receipt object");
  const receipt = value as Record<string, unknown>;
  // [EXP-QNODELAY] Why: null needs a named non-QLever lane, not missing identity.
  // Rejected: treating an unknown source as proof of a different engine.
  const identities = [receipt["lane"], receipt["backend"], receipt["queryPath"]];
  const requiresQlever =
    qlever(context.lane) ||
    identities.some(qlever) ||
    !(nonQlever(context.lane) || (!context.lane && identities.some(nonQlever)));
  const mode = receipt["qleverConnectionMode"];
  if (
    !Object.hasOwn(receipt, "qleverConnectionMode") ||
    !(modeOf(mode) || (!requiresQlever && mode === null))
  )
    return fail(
      "qleverConnectionMode must explicitly identify keep-alive or per-request (null only for a named non-QLever lane)",
    );
  const visit = (node: unknown, location: string): void => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((v, i) => visit(v, `${location}[${i}]`));
      return;
    }
    const object = node as Record<string, unknown>;
    if (
      Object.hasOwn(object, "qleverConnectionMode") &&
      !(
        modeOf(object["qleverConnectionMode"]) ||
        (!requiresQlever &&
          ![object["lane"], object["backend"], object["queryPath"]].some(qlever) &&
          object["qleverConnectionMode"] === null)
      )
    )
      fail(`invalid nested qleverConnectionMode at ${location}`);
    for (const [key, child] of Object.entries(object)) visit(child, `${location}.${key}`);
  };
  visit(receipt, "$root");
  return receipt as ParsedLatencyReceipt;
}

export function parseLatencyReceipts(
  input: unknown,
  context: ReceiptContext = {},
): ParsedLatencyReceipt[] {
  const value: unknown =
    typeof input === "string"
      ? JSON.parse(input)
      : input instanceof Uint8Array
        ? JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(input))
        : input;
  if (!Array.isArray(value))
    throw new TypeError(`${context.source ?? "latency receipts"}: expected receipt array`);
  return value.map((row, i) =>
    parseLatencyReceipt(row, {
      ...context,
      source: `${context.source ?? "latency receipts"}[${i}]`,
    }),
  );
}
