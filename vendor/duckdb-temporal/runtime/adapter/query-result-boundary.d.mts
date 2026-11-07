import type { QueryContext, QueryDebugInfo, QueryMetrics, QueryPlan, WrappedQueryResult } from "@triplex-build/triplex/runtime";
export class QueryResultBoundaryError extends Error { readonly code: "QUERY_RESULT"; constructor(message: string); }
export function ownExecuteResult(value: { results: readonly QueryContext[]; debug?: QueryDebugInfo }, backend: string): { readonly results: readonly QueryContext[]; readonly debug?: QueryDebugInfo };
export function ownWrappedResult(value: WrappedQueryResult, backend: string): WrappedQueryResult;
export function ownExplainResult(value: { queryPlan: QueryPlan; metrics?: QueryMetrics }, backend: string): { readonly queryPlan: QueryPlan; readonly metrics?: QueryMetrics };
