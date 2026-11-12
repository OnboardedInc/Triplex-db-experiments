// [DX-T1] Why: the bench consumes the built public recorder, as applications do. Rejected: sibling src imports.
import { pathToFileURL } from "node:url";
import { REPO } from "./triplex.ts";
const api = await import(pathToFileURL(`${REPO}/packages/datomic/dist/index.js`).href);
export const { beginTrace, withTrace, finishTrace, traceSync, traceWork, traceAsync, traceInterval, traceNow, currentTrace, flushTracing } = api;
export type Trace = ReturnType<typeof api.beginTrace>;
