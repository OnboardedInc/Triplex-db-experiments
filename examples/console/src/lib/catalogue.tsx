// [DX-CON1] The catalogue and the connection, read once and shared. A screen asks hasTool(name) before it offers a
// function, so the console never shows a control for a tool the server does not run yet.
import { useQuery } from "@tanstack/react-query";
import { callTool, getCatalogue, getConnection, type CatalogueTool } from "./api";

export function useCatalogue() {
  return useQuery({ queryKey: ["catalogue"], queryFn: getCatalogue, staleTime: 30_000, retry: 1 });
}
export function useConnection() {
  return useQuery({
    queryKey: ["connection"],
    queryFn: getConnection,
    staleTime: 30_000,
    retry: 0,
  });
}

export function useTools() {
  const q = useCatalogue();
  const byName = new Map<string, CatalogueTool>((q.data?.tools ?? []).map((t) => [t.name, t]));
  return {
    ...q,
    byName,
    has: (name: string) => byName.has(name),
    /** Whether a tool's input schema has a property, for parameters that arrive in later steps (basis, entity). */
    accepts: (name: string, property: string) =>
      Boolean(byName.get(name)?.inputSchema?.properties?.[property]),
  };
}

/** The command that registers the MCP server with Claude Code, run from the repository root. */
export const REGISTER_COMMAND = "claude mcp add triplex-demo -- node examples/demo-mcp/src/mcp.ts";

export type AccountInfo = { account: string; first: number; last: number; people: number };

/**
 * The accounts of the connected database and the default subject every screen starts from, read from the
 * list_accounts tool (never hard-coded): the third account when there is one (account-003, as in the design's demo),
 * and the subject in the middle of its numbers (50000 of 0 to 99999 on the 1 billion database).
 */
export function useDefaults() {
  const tools = useTools();
  const q = useQuery({
    queryKey: ["tool", "list_accounts", {}],
    queryFn: () =>
      callTool<{ accounts: { account: string; subjects: number; subjectNumbers: string }[] }>(
        "list_accounts",
        {},
      ),
    enabled: tools.has("list_accounts"),
    staleTime: 60_000,
  });
  const accounts: AccountInfo[] = (q.data?.accounts ?? []).map((a) => {
    const m = /^(\d+) to (\d+)$/.exec(a.subjectNumbers ?? "");
    const first = m ? Number(m[1]) : 0;
    return {
      account: a.account,
      first,
      last: m ? Number(m[2]) : first + a.subjects - 1,
      people: a.subjects,
    };
  });
  const chosen = accounts[2] ?? accounts[0];
  return {
    ready: Boolean(chosen),
    accounts,
    account: chosen?.account,
    subject: chosen ? chosen.first + Math.floor(chosen.people / 2) : undefined,
    of: (account: string) => accounts.find((a) => a.account === account),
  };
}
