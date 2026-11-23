// [DX-CON1] The catalogue and the connection, read once and shared. A screen asks hasTool(name) before it offers a
// function, so the console never shows a control for a tool the server does not run yet.
import { useQuery } from "@tanstack/react-query";
import { getCatalogue, getConnection, type CatalogueTool } from "./api";

export function useCatalogue() {
  return useQuery({ queryKey: ["catalogue"], queryFn: getCatalogue, staleTime: 30_000, retry: 1 });
}
export function useConnection() {
  return useQuery({ queryKey: ["connection"], queryFn: getConnection, staleTime: 30_000, retry: 0 });
}

export function useTools() {
  const q = useCatalogue();
  const byName = new Map<string, CatalogueTool>((q.data?.tools ?? []).map((t) => [t.name, t]));
  return {
    ...q,
    byName,
    has: (name: string) => byName.has(name),
    /** Whether a tool's input schema has a property, for parameters that arrive in later steps (basis, entity). */
    accepts: (name: string, property: string) => Boolean(byName.get(name)?.inputSchema?.properties?.[property]),
  };
}

/** The command that registers the MCP server with Claude Code, run from the repository root. */
export const REGISTER_COMMAND = "claude mcp add triplex-demo -- node examples/demo-mcp/src/mcp.ts";
