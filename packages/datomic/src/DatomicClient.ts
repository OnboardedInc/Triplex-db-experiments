import http from "node:http";
import { stringifyExact, validateTagged, type TaggedValue } from "./codec.js";

export class DatomicHttpError extends Error {
  readonly _tag = "DatomicHttpError";
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export class DatomicTransportError extends Error {
  readonly _tag = "DatomicTransportError";
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}
export interface DatomicHealth {
  datomicVersion: string;
  gatewaySourceHash: string;
}
export interface DatomicDatabase {
  db: string;
  created: boolean;
  schemaHash: string;
}
export interface DatomicBasis {
  t: TaggedValue;
  position: TaggedValue;
  recordedAt: null;
  schemaHash: string;
}

// [EXP-DA00] Why: 256 readers plus writers must not queue on the HTTP agent (R16). Rejected: default pool limits.
export class DatomicClient {
  readonly agent: http.Agent;
  private readonly endpoint: URL;
  constructor(
    endpoint: string,
    readonly timeoutMs = 5000,
  ) {
    this.endpoint = new URL(endpoint);
    if (this.endpoint.protocol !== "http:" || this.endpoint.username || this.endpoint.password)
      throw new TypeError("Expected HTTP gateway URL without credentials");
    this.agent = new http.Agent({ keepAlive: true, maxSockets: 512, maxTotalSockets: 512 });
  }
  close(): void {
    this.agent.destroy();
  }
  async request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const bytes = body === undefined ? undefined : Buffer.from(stringifyExact(body));
    return new Promise<T>((resolve, reject) => {
      const req = http.request(
        new URL(path, this.endpoint),
        {
          method,
          agent: this.agent,
          headers: {
            Accept: "application/json",
            ...(bytes
              ? { "Content-Type": "application/json", "Content-Length": bytes.length }
              : {}),
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          let size = 0;
          res.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > 1024 * 1024) res.destroy(new Error("Gateway response exceeds 1 MiB"));
            else chunks.push(chunk);
          });
          res.on("error", (error) =>
            reject(new DatomicTransportError(error.message, { cause: error })),
          );
          res.on("end", () => {
            try {
              const data = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<
                string,
                unknown
              >;
              const status = res.statusCode ?? 0;
              if (status < 200 || status >= 300)
                reject(
                  new DatomicHttpError(
                    status,
                    String(data["code"] ?? "GatewayError"),
                    String(data["message"] ?? "Gateway request failed"),
                  ),
                );
              else resolve(data as T);
            } catch (error) {
              reject(new DatomicTransportError("Invalid gateway JSON", { cause: error }));
            }
          });
        },
      );
      const timer = setTimeout(
        () => req.destroy(new Error("Gateway deadline exceeded")),
        this.timeoutMs,
      );
      req.on("close", () => clearTimeout(timer));
      req.on("error", (error) =>
        reject(new DatomicTransportError(error.message, { cause: error })),
      );
      req.end(bytes);
    });
  }
  health(): Promise<DatomicHealth> {
    return this.request("GET", "/health");
  }
  create(scope: string): Promise<DatomicDatabase> {
    return this.request("POST", "/v1/db/create", { scope });
  }
  delete(scope: string): Promise<{ db: string; deleted: boolean }> {
    return this.request("POST", "/v1/db/delete", { scope });
  }
  async basis(db: string): Promise<DatomicBasis> {
    if (!/^s-[a-f0-9]{32}$/.test(db)) throw new TypeError("Invalid Datomic database name");
    const result = await this.request<DatomicBasis>("GET", `/v1/db/${db}/basis`);
    return { ...result, t: validateTagged(result.t), position: validateTagged(result.position) };
  }
}
