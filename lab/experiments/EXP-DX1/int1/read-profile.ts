import { AsyncLocalStorage } from "node:async_hooks";
import { channel } from "node:diagnostics_channel";
import type { ClientRequest } from "node:http";

interface Exchange { route: string; bytes: number; toHeadersMs?: number; responseMs?: number; gatewayMs?: number; gzipRows?: boolean }
const envelope = Buffer.from('{"gzipRows":"');
export function coldReadProfiler() {
  const current = new AsyncLocalStorage<Exchange[]>();
  // [DX-THIN1] Why: time real HTTP exchanges on a requested read, including a revision repair. Rejected: treating a logical fallback count as a transport profile.
  channel("http.client.request.created").subscribe((event) => {
    const calls = current.getStore();
    if (!calls) return;
    const request = (event as { request: ClientRequest }).request, start = performance.now();
    const record: Exchange = { route: request.path.split("/").at(-1)!, bytes: 0 };
    calls.push(record);
    request.once("response", response => {
      record.toHeadersMs = performance.now() - start;
      const us = response.headers["x-tx2-gateway-micros"];
      if (typeof us === "string" && /^\d+$/.test(us)) record.gatewayMs = Number(us) / 1000;
      const prefix = Buffer.alloc(envelope.length);
      response.on("data", (b: Buffer) => {
        if (record.bytes < prefix.length) b.copy(prefix, record.bytes, 0, prefix.length - record.bytes);
        record.bytes += b.length;
      });
      response.once("end", () => { record.responseMs = performance.now() - start; record.gzipRows = prefix.equals(envelope); });
    });
  });
  return async function profile<T>(read: () => Promise<T>) {
    const exchanges: Exchange[] = [], start = performance.now();
    const value = await current.run(exchanges, read);
    return { value, diagnostic: { workerMs: performance.now() - start, exchanges } };
  };
}
