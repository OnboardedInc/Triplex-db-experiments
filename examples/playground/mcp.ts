import { createInterface } from "node:readline";
import { actions, ownsAction, outputSchema, type Invoke } from "./actions.ts";

export const versions = ["2025-11-25", "2025-06-18", "2025-03-26"] as const;
type Id = string | number | null;
const result = (id: Id, value: unknown) => ({ jsonrpc: "2.0", id, result: value });
export const rpcError = (id: Id, code: number, message: string) => ({
  jsonrpc: "2.0",
  id,
  error: { code, message },
});

const tools = Object.entries(actions).map(([name, action]) => ({
  name,
  title: action.title,
  description: action.description,
  inputSchema: action.schema,
  outputSchema,
  annotations: {
    readOnlyHint: !["save", "duplicate", "publish", "load"].includes(name),
    destructiveHint: ["save", "duplicate", "publish", "load"].includes(name),
    openWorldHint: false,
  },
}));

// [DX-PLAY1] Why: both MCP transports delegate to the same schema-decoded JSON actions.
// Rejected: transport-specific database code and a second set of tool argument definitions.
export async function rpc(message: unknown, invoke: Invoke) {
  if (!message || typeof message !== "object" || Array.isArray(message))
    return rpcError(null, -32600, "Invalid Request");
  const msg = message as Record<string, unknown>;
  const id = typeof msg["id"] === "number" || typeof msg["id"] === "string" ? msg["id"] : null;
  if (msg["jsonrpc"] !== "2.0") return rpcError(id, -32600, "Invalid Request");
  if (
    !Object.hasOwn(msg, "method") &&
    (Object.hasOwn(msg, "result") || Object.hasOwn(msg, "error"))
  )
    return;
  if (typeof msg["method"] !== "string" || (Object.hasOwn(msg, "id") && id === null))
    return rpcError(id, -32600, "Invalid Request");
  if (!Object.hasOwn(msg, "id")) return;
  const params = msg["params"] as Record<string, unknown> | undefined;
  switch (msg["method"]) {
    case "initialize": {
      const preferred = versions.find((v) => v === params?.["protocolVersion"]);
      return result(id, {
        protocolVersion: preferred ?? versions[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "triplex-playground", version: "0.1.0" },
      });
    }
    case "ping":
      return result(id, {});
    case "tools/list":
      return result(id, { tools });
    case "tools/call": {
      const name = params?.["name"];
      if (typeof name !== "string" || !ownsAction(name))
        return rpcError(id, -32602, "Unknown tool");
      const { reply } = await invoke(name, params?.["arguments"] ?? {});
      return result(id, {
        structuredContent: reply,
        content: [
          {
            type: "text",
            text: JSON.stringify(reply, (_key, value) =>
              typeof value === "bigint" ? value.toString() : value,
            ),
          },
        ],
        isError: !reply.ok,
      });
    }
    default:
      return rpcError(id, -32601, "Method not found");
  }
}

export async function stdio(invoke: Invoke) {
  const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of input) {
    let value;
    try {
      value =
        line.length > 96_000
          ? rpcError(null, -32600, "Request too large")
          : await rpc(JSON.parse(line), invoke);
    } catch {
      value = rpcError(null, -32700, "Parse error");
    }
    if (value) process.stdout.write(JSON.stringify(value) + "\n");
  }
}
