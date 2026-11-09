import { ResolvedTemporalBasis, TemporalBasis } from "./Temporal.js";

//#region src/EntityPage.d.ts
type EntityPageCursor = string & {
  readonly EntityPageCursor: unique symbol;
};
interface EntityPageRequest {
  readonly entityType: string;
  readonly limit?: number;
  readonly cursor?: string;
  readonly basis?: TemporalBasis;
}
interface EntityPageSnapshot {
  readonly recordedAt: number;
  readonly recordedPosition: number;
  readonly validAt: number;
}
interface PreparedEntityPage {
  readonly entityType: string;
  readonly limit: number;
  readonly after?: string;
  readonly basis: ResolvedTemporalBasis & EntityPageSnapshot;
  readonly scope: string;
}
declare const prepareEntityPage: (input: {
  readonly request: EntityPageRequest;
  readonly now: number;
  readonly recordedPosition: number;
  readonly scope: string;
}) => PreparedEntityPage;
declare const encodeEntityPageCursor: (prepared: PreparedEntityPage, after: string) => EntityPageCursor;
//#endregion
export { EntityPageCursor, EntityPageRequest, EntityPageSnapshot, PreparedEntityPage, encodeEntityPageCursor, prepareEntityPage };
//# sourceMappingURL=EntityPage.d.ts.map