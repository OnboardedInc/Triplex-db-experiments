import http from "node:http";
import { AsyncLocalStorage } from "node:async_hooks";

// [DX-H1] Why: count real client requests inside concurrent operations without changing the adapter.
// Rejected: counting Triples calls (one call may issue many HTTP requests).
const context = new AsyncLocalStorage<{ requests: number }>();
const original = (http.Agent.prototype as any).addRequest;
(http.Agent.prototype as any).addRequest = function (...args: any[]) {
  const active = context.getStore();
  if (active) active.requests++;
  return (original as any).apply(this, args);
};
const counts: Record<string, { operations: number; failed: number; requests: number }> = {};
export async function countHttp<T>(kind: string, run: () => Promise<T>): Promise<T> {
  const parent = context.getStore();
  const active = { requests: 0 };
  const row = (counts[kind] ??= { operations: 0, failed: 0, requests: 0 });
  row.operations++;
  try {
    return await context.run(active, run);
  } catch (e) {
    row.failed++;
    throw e;
  } finally {
    row.requests += active.requests;
    if (parent) parent.requests += active.requests;
  }
}
export function httpCounts() {
  return structuredClone(counts);
}

// [DX-H2] Why: nested operation counters must contribute to the page's measured request total.
// Rejected: subtracting global counters (concurrent traffic contaminates the page).
export async function measureHttp<T>(run: () => Promise<T>) {
  const parent = context.getStore(),
    active = { requests: 0 },
    start = performance.now();
  try {
    const value = await context.run(active, run);
    return { value, wallMs: performance.now() - start, requests: active.requests };
  } finally {
    if (parent) parent.requests += active.requests;
  }
}
