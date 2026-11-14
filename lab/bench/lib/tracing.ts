// [DX-T1] Why: the bench consumes the built public recorder, as applications do. Rejected: sibling src imports.
import { pathToFileURL } from "node:url";
import { REPO } from "./triplex.ts";
const api = await import(pathToFileURL(`${REPO}/packages/datomic/dist/index.js`).href);
export const {
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
