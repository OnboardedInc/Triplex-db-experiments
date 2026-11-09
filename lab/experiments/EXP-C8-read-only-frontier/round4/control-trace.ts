import { appendFileSync, writeFileSync } from "node:fs";
// [EXP-C8-R4] Why: record actual query bytes and elapsed HTTP calls without altering the control.
// Rejected: logical-query timing alone (cannot identify expensive engine requests).
const out = "lab/experiments/EXP-C8-read-only-frontier/round4/control";
const original = globalThis.fetch;
let sequence = 0;
const put = (event: unknown) => appendFileSync(`${out}/events.jsonl`, JSON.stringify(event) + "\n");
globalThis.fetch = async (input, init) => {
  const id = ++sequence;
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.hostname !== "127.0.0.1") throw new Error("Diagnostic permits loopback requests only");
  const body = typeof init?.body === "string" ? init.body : undefined;
  if (body) writeFileSync(`${out}/${id}.rq`, body);
  const start = performance.now();
  put({
    event: "start",
    id,
    at: new Date().toISOString(),
    url: url.href,
    method: init?.method,
    contentType: new Headers(init?.headers).get("Content-Type"),
  });
  try {
    const response = await original(input, init);
    put({ event: "headers", id, ms: performance.now() - start, status: response.status });
    return response;
  } catch (error) {
    put({ event: "error", id, ms: performance.now() - start, error: String(error) });
    throw error;
  }
};
