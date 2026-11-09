import { ResolvedTemporalBasis } from "@triplex-build/triplex";

//#region src/routeHistory.d.ts
type RouteHistoryOperation = {
  readonly op: "assert";
  readonly ref: string;
  readonly entityId: string;
  readonly attribute: string;
  readonly value: {
    readonly type: "number";
    readonly value: number;
  };
  readonly validFrom: number;
  readonly validTo?: number;
} | {
  readonly op: "retract" | "retract-pattern";
  readonly target: string;
  readonly pattern?: {
    readonly entityId: string;
    readonly attribute: string;
    readonly value: {
      readonly type: "number";
      readonly value: number;
    };
  };
};
interface RouteHistoryCommand {
  readonly clock: number;
  readonly operations: readonly RouteHistoryOperation[];
}
declare function makeRouteEquivalenceScenario(seed: number): {
  seed: number;
  subjects: string[];
  groups: readonly RouteHistoryCommand[][];
  bases: readonly ResolvedTemporalBasis[];
  interiorPositions: readonly number[];
};
//#endregion
export { RouteHistoryCommand, RouteHistoryOperation, makeRouteEquivalenceScenario };
//# sourceMappingURL=routeHistory.d.ts.map