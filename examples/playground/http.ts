import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { stripTypeScriptTypes } from "node:module";
import type { AddressInfo } from "node:net";
import { ActionError, inputFor, openapi, ownsAction, type Invoke } from "./actions.ts";
import { rpc, rpcError, versions } from "./mcp.ts";
import type { Playground } from "./service.ts";
import { loopback } from "./stack.ts";
import type { Timings } from "./timings.ts";

export function actionService(
  playground: Playground,
  clock: Timings,
  onFault?: (action: string, error: unknown) => void,
): Invoke {
  return async (action, body) => {
    const { timings, value } = await clock.measure(action, async () => {
      try {
        return { status: 200, result: await playground.execute(action, inputFor(action, body)) };
      } catch (error) {
        if (error instanceof ActionError)
          return { status: error.status, error: { code: error.code, message: error.message } };
        onFault?.(action, error);
        console.error("Playground action failed", action, error instanceof Error ? error.name : "");
        return {
          status: 500,
          error: {
            code: "BackendError",
            message: "The playground database could not complete the action",
          },
        };
      }
    });
    return {
      status: value.status,
      reply: {
        records: [],
        receipt: null,
        position: null,
        ...value.result,
        ok: value.status === 200,
        timings,
        ...(value.error ? { error: value.error } : {}),
      },
    };
  };
}

const stringify = (data: unknown) =>
  JSON.stringify(data, (_key, value) => (typeof value === "bigint" ? value.toString() : value));
const json = (response: ServerResponse, status: number, data: unknown) => {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(stringify(data));
};
const apiFailure = (response: ServerResponse, status: number, code: string, message: string) =>
  json(response, status, {
    ok: false,
    records: [],
    receipt: null,
    position: null,
    timings: {
      totalMs: 0,
      clientMs: null,
      gatewayMs: null,
      transactorMs: null,
      storageMs: null,
      peerWaitMs: null,
      traceId: null,
    },
    error: { code, message },
  });

async function body(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const bytes of request.iterator({ destroyOnReturn: false })) {
    length += bytes.length;
    if (length > 96_000) {
      request.resume();
      throw new ActionError(413, "RequestTooLarge", "JSON request exceeds the local limit");
    }
    chunks.push(bytes);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new ActionError(400, "InvalidJson", "Send one JSON object");
  }
}

type Controls = {
  getInvoke: () => Invoke | undefined;
  token: string;
  stop: () => void;
};
const staticFiles = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/ui.js", ["ui.ts", "text/javascript; charset=utf-8"]],
  ["/ui.css", ["ui.css", "text/css; charset=utf-8"]],
] as const);

export async function listen(port: number, controls: Controls) {
  const assets = new Map(
    await Promise.all(
      [...staticFiles].map(async ([route, [file, type]]) => {
        const content = await readFile(
          new URL("../../packages/dashboard/playground/" + file, import.meta.url),
          "utf8",
        );
        return [
          route,
          { bytes: file.endsWith(".ts") ? stripTypeScriptTypes(content) : content, type },
        ] as const;
      }),
    ),
  );
  const server = createServer(async (request, response) => {
    response.setHeader("x-content-type-options", "nosniff");
    response.setHeader(
      "content-security-policy",
      "default-src 'self'; frame-ancestors 'none'; base-uri 'none'",
    );
    const host = `${loopback}:${(server.address() as AddressInfo).port}`;
    const origin = request.headers.origin;
    // [DX-PLAY1] Why: reuse the dashboard server's loopback origin boundary while admitting local stdio/CLI clients with no Origin.
    // Rejected: CORS or trusting a browser Host header for a local mutation.
    if (request.headers.host !== host || (origin !== undefined && origin !== "http://" + host))
      return apiFailure(
        response,
        403,
        "OriginDenied",
        "Use this process's printed loopback address",
      );
    const path = request.url ?? "";
    const method = request.method;
    const invoke = controls.getInvoke();
    if (method === "GET" && path === "/health")
      return json(response, invoke ? 200 : 503, { ready: Boolean(invoke) });
    if (method === "GET" && path === "/openapi.json") return json(response, 200, openapi());
    if (method === "POST" && path === "/internal/stop") {
      if (request.headers.authorization !== "Bearer " + controls.token)
        return apiFailure(response, 403, "StopDenied", "The stop command must own this run");
      json(response, 202, { stopping: true });
      controls.stop();
      return;
    }
    if (method === "GET" && assets.has(path as "/")) {
      const asset = assets.get(path as "/")!;
      response.writeHead(200, { "content-type": asset.type, "cache-control": "no-store" });
      response.end(asset.bytes);
      return;
    }
    if (path === "/mcp" && method !== "POST") {
      response.writeHead(405, { allow: "POST" });
      response.end();
      return;
    }
    const action = path.startsWith("/api/") ? path.slice(5) : "";
    if (method !== "POST" || (path !== "/mcp" && !ownsAction(action)))
      return apiFailure(response, 404, "RouteNotFound", "See /openapi.json for available actions");
    if (request.headers["content-type"]?.split(";")[0]?.trim() !== "application/json")
      return apiFailure(response, 415, "UnsupportedContentType", "Use application/json");
    const version = request.headers["mcp-protocol-version"];
    if (path === "/mcp" && version && !versions.some((supported) => supported === version))
      return json(response, 400, rpcError(null, -32600, "Unsupported MCP protocol version"));
    if (!invoke) return apiFailure(response, 503, "Starting", "The playground is loading its data");
    try {
      const input = await body(request);
      if (path === "/mcp") {
        const answer = await rpc(input, invoke);
        if (answer) return json(response, 200, answer);
        response.writeHead(202);
        response.end();
      } else if (ownsAction(action)) {
        const result = await invoke(action, input);
        json(response, result.status, result.reply);
      }
    } catch (error) {
      if (error instanceof ActionError) {
        if (path === "/mcp")
          return json(response, error.status, rpcError(null, -32700, error.message));
        return apiFailure(response, error.status, error.code, error.message);
      }
      apiFailure(response, 500, "ServerError", "The server could not complete the request");
    }
  });
  server.requestTimeout = 30_000;
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, loopback, resolve);
  });
  const actual = (server.address() as AddressInfo).port;
  return {
    port: actual,
    url: `http://${loopback}:${actual}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
