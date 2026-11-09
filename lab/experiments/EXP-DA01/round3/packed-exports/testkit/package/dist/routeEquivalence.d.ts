//#region src/routeEquivalence.d.ts
interface RouteRead<Row, Basis> {
  readonly rows: readonly Row[];
  readonly route: string;
  readonly basis: Basis;
}
interface RouteFixture<Row, Basis> {
  readonly id: string;
  readonly eligible: (basis: Basis) => boolean;
  readonly refusals: readonly string[];
  readonly read: (basis: Basis) => Promise<RouteRead<Row, Basis>>;
}
declare const canonicalRouteValue: (value: unknown) => string;
declare function makeRouteEquivalenceCases<Row, Basis>(options: {
  readonly seed: number;
  readonly bases: readonly Basis[];
  readonly routes: readonly RouteFixture<Row, Basis>[];
  readonly oracle: (basis: Basis) => Promise<readonly Row[]>;
  readonly advance: () => Promise<void>;
}): {
  name: string;
  run(): Promise<{
    phase: number;
    route: string;
    outcome: string;
  }[]>;
}[];
//#endregion
export { RouteFixture, RouteRead, canonicalRouteValue, makeRouteEquivalenceCases };
//# sourceMappingURL=routeEquivalence.d.ts.map