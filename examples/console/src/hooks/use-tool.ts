// [DX-CON1] One hook per tool call. It keeps the exact call (name and input) beside the answer, so the answer line and
// "Ask your assistant" show what produced the screen, and it reports "slow" once a call has run over one second.
import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { callTool, type Answer } from "@/lib/api";

export type ToolCall = { name: string; input: Record<string, unknown> };

export function useSlow(active: boolean, after = 1000) {
  const [slow, setSlow] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) {
      setSlow(false);
      setElapsed(0);
      return;
    }
    const start = performance.now();
    const id = setInterval(() => {
      const e = performance.now() - start;
      setElapsed(e);
      if (e >= after) setSlow(true);
    }, 100);
    return () => clearInterval(id);
  }, [active, after]);
  return { slow, elapsed };
}

/** Drop undefined fields so the call shown is the call sent. */
export function clean(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== undefined && v !== ""),
  ) as Record<string, unknown>;
}

export function useTool<T = Record<string, unknown>>(
  name: string,
  input: Record<string, unknown>,
  options: { enabled?: boolean; refetchInterval?: number | false; keepPrevious?: boolean } = {},
) {
  const call: ToolCall = { name, input: clean(input) };
  const query = useQuery<Answer<T>>({
    queryKey: ["tool", name, call.input],
    queryFn: ({ signal }) => callTool<T>(name, call.input, signal),
    enabled: options.enabled ?? true,
    refetchInterval: options.refetchInterval ?? false,
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
    retry: false,
    staleTime: 5_000,
  });
  const { slow, elapsed } = useSlow(query.isFetching);
  return { ...query, call, slow, elapsed };
}

/** A tool that changes data. On success every cached read is stale, because a commit moves the head. */
export function useToolMutation<T = Record<string, unknown>>(name: string) {
  const client = useQueryClient();
  const mutation = useMutation<Answer<T>, Error, Record<string, unknown>>({
    mutationFn: (input) => callTool<T>(name, clean(input)),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["tool"] }),
  });
  const { slow, elapsed } = useSlow(mutation.isPending);
  return { ...mutation, slow, elapsed };
}
