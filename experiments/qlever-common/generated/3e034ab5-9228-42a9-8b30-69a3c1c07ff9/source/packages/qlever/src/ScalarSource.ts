/** Internal native source seam: both implementations feed every compiler operator. */
export interface QleverScalarSourceRequest {
  readonly prefix: string;
  readonly subject: string;
  readonly term: unknown;
}
export interface QleverScalarSource {
  readonly body: readonly string[];
  readonly family: string;
  readonly lexical: string;
  readonly order: string;
  readonly payload?: string;
  readonly numericOrderFields: readonly string[];
}
export type QleverSourcePlan = "compact" | "persisted";
