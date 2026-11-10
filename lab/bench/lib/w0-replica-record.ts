import fs from "node:fs";
import http from "node:http";
import { createGzip } from "node:zlib";
import { finished } from "node:stream/promises";
// [DX-R1] Why: recordings contain request/response bytes from the actual client, compressed as they arrive.
// Rejected: reserializing parsed response objects (not raw evidence) or retaining full response buffers twice.
export function recordReplicaHttp(directory: string) {
  fs.mkdirSync(directory, { recursive: true });
  let sequence = 0,
    enabled = false;
  const pending: Promise<void>[] = [];
  const original = http.request;
  (http as any).request = function (...args: any[]) {
    const req = (original as any)(...args);
    if (!enabled) return req;
    const pathname = String(args[0]?.pathname ?? args[0]?.path ?? "");
    if (!pathname.includes("/reach-many") && !pathname.includes("/transactions")) return req;
    const n = sequence++,
      requestBytes: Buffer[] = [];
    const write = req.write.bind(req),
      end = req.end.bind(req);
    req.write = (chunk: any, ...rest: any[]) => {
      requestBytes.push(Buffer.from(chunk));
      return write(chunk, ...rest);
    };
    req.end = (chunk: any, ...rest: any[]) => {
      if (chunk && typeof chunk !== "function") requestBytes.push(Buffer.from(chunk));
      fs.writeFileSync(`${directory}/request-${n}.json`, Buffer.concat(requestBytes), {
        flag: "wx",
      });
      return end(chunk, ...rest);
    };
    req.on("response", (res: any) => {
      const gzip = createGzip(),
        file = fs.createWriteStream(`${directory}/response-${n}.json.gz`, { flags: "wx" });
      gzip.pipe(file);
      res.pipe(gzip);
      pending.push(finished(file));
    });
    return req;
  };
  return {
    async around<T>(f: () => Promise<T>): Promise<T> {
      enabled = true;
      try {
        return await f();
      } finally {
        enabled = false;
      }
    },
    async close() {
      (http as any).request = original;
      await Promise.all(pending);
    },
  };
}
