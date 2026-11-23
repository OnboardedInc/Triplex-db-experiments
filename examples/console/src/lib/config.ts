// [DX-CON1] Reading the configuration through its tools: the types in the live release and each type's description.
import { useQueries } from "@tanstack/react-query";
import { callTool, type Answer } from "./api";
import { useTool } from "@/hooks/use-tool";
import { useTools } from "./catalogue";
import type { DescribeType, ListReleases, ListTypes } from "./types";

export function useTypes() {
  const tools = useTools();
  return useTool<ListTypes>("list_entity_types", {}, { enabled: tools.has("list_entity_types") });
}

/** Every type of the live release, described; for the new-type sheet's checks and the Objects tab. */
export function useDescribedTypes(names: string[], enabled = true) {
  return useQueries({
    queries: names.map((name) => ({
      queryKey: ["tool", "describe_entity_type", { name }],
      queryFn: () => callTool<DescribeType>("describe_entity_type", { name }),
      enabled,
      staleTime: 5_000,
    })),
  }) as { data?: Answer<DescribeType>; isPending: boolean; isError: boolean; error: unknown }[];
}

export const VALUE_TYPES = ["text", "number", "integer", "int64", "boolean", "date", "instant", "enumOf", "ref"] as const;
export const valueTypeWords: Record<string, string> = {
  text: "text",
  number: "number",
  integer: "integer",
  int64: "exact integer",
  boolean: "boolean",
  date: "date",
  instant: "instant",
  enumOf: "enum",
  ref: "ref",
};
export const RESERVED_ATTRIBUTE = /^:(_|subject\/|tenant\/|triplex|f\/|db\/|console\/)/;
export const LOADER_PREFIXES = ["pl", "wk", "i9", "sec", "doc", "page", "directory"];
export const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/** Release ID to label, for journal rows that name the release a write was pinned to. */
export function useReleaseLabels() {
  const tools = useTools();
  const q = useTool<ListReleases>("list_releases", { limit: 50 }, { enabled: tools.has("list_releases") });
  return new Map((q.data?.releases ?? []).map((r) => [r.id, r.label]));
}
