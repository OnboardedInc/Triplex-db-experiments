// [DX-DEMO1, DX-CON1] Local MCP server (stdio) for Triplex Console. It registers every entry of the one catalogue in
// tools.ts, so the assistant has exactly the functions the web app calls. Every answer carries the time the gateways
// took, the round trip from this machine, the database position, which database answered and a console link.
// Endpoints come from the private state file demo/connect.sh writes (default ~/.triplex-demo/connection.json).
// Why: the official SDK and typed tool inputs, so any MCP client (Claude Code, the desktop app, the Inspector) works.
// Rejected: a second list of tools here (it drifted from the inspector page's list in the first demo).
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { annotations, errorOf, runTool, toJson, tools } from "./tools.ts";

const server = new McpServer({ name: "triplex-demo", version: "0.2.0" });

for (const t of tools)
  server.registerTool(
    t.name,
    { title: t.title, description: t.description, inputSchema: t.input, annotations: annotations(t) },
    async (input: unknown) => {
      try {
        return { content: [{ type: "text" as const, text: toJson(await runTool(t.name, input, "assistant")) }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: toJson(errorOf(error)) }], isError: true };
      }
    },
  );

await server.connect(new StdioServerTransport());
