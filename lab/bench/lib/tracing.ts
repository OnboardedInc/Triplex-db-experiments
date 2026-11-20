// [DX-T1] Why: the bench consumes the built public recorder, as applications do. Rejected: sibling src imports.
import { pathToFileURL } from "node:url";
import { REPO } from "./triplex.ts";
const api = await import(pathToFileURL(`${REPO}/packages/datomic/dist/index.js`).href);
export const {
  traceLevel,
  beginTrace,
  withTrace,
  withoutTrace,
  finishTrace,
  traceSync,
  traceWork,
  traceAsync,
  traceInterval,
  traceNow,
  currentTrace,
  captureTraceContext,
  continueTrace,
  flushTracing,
  currentTraceStep,
  traceResource,
} = api;
export type Trace = ReturnType<typeof api.beginTrace>;

// [DX-RD1] Why: seal each native timing span to the initiating HTTP round trip and the response seen by Node.
// Rejected: joining only on a logical read ID (one read can issue several wire requests).
type WireRequestTrace = NonNullable<ReturnType<typeof import("../../../packages/datomic/dist/index.js").beginTrace>>;
export function gatewayExchanges(trace: WireRequestTrace) {
  return trace.spans.filter(s => s.name === "client.http").map(s => {
    const response = s.attributes?.responseTraceparent;
    const match = typeof response === "string" ? /^00-([a-f0-9]{32})-([a-f0-9]{16})-01$/.exec(response) : null;
    if (!match || match[1] !== trace.traceId || s.attributes?.status !== 200)
      throw Error("Historical exchange has an unbound HTTP response");
    return { parent: s.id, root: match[2]! };
  });
}
