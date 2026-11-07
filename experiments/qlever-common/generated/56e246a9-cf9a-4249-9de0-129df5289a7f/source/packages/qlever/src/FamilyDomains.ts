import type { SparqlBinding } from "./QleverClient.js";

/** A summary of the same completed positive candidate relation as main execution. */
export interface QleverFamilyDomainRequest {
  readonly where: string;
  readonly bindings: readonly { readonly variable: string; readonly family: string }[];
  readonly maxSummaryRows: number;
}
export interface QleverFamilyDomainQuery {
  readonly sparql: string;
  readonly decode: (rows: readonly SparqlBinding[]) => ReadonlyMap<string, ReadonlySet<string>>;
}
export type QleverDomainPlan = "distinct" | "mask";
