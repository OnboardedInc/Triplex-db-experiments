// [EXP-DA01] Why: one reusable runner enforces R31 HE-1..7 against a fixture's independent oracle and route trace. Rejected: comparing two implementations without an oracle (both may share the same defect).
export interface RouteRead<Row, Basis> {
  readonly rows: readonly Row[];
  readonly route: string;
  readonly basis: Basis;
}
export interface RouteFixture<Row, Basis> {
  readonly id: string;
  readonly eligible: (basis: Basis) => boolean;
  readonly refusals: readonly string[];
  readonly read: (basis: Basis) => Promise<RouteRead<Row, Basis>>;
}
export const canonicalRouteValue = (value: unknown): string => {
  if (typeof value === "number" && Object.is(value, -0)) return "-0";
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalRouteValue).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalRouteValue(v)}`)
    .join(",")}}`;
};
const rowSet = <Row>(rows: readonly Row[]) => rows.map(canonicalRouteValue).sort();
export function makeRouteEquivalenceCases<Row, Basis>(options: {
  readonly seed: number;
  readonly bases: readonly Basis[];
  readonly routes: readonly RouteFixture<Row, Basis>[];
  readonly oracle: (basis: Basis) => Promise<readonly Row[]>;
  readonly advance: () => Promise<void>;
}) {
  return options.bases.map((basis, index) => ({
    name: `route equivalence seed=${options.seed} basis=${index}`,
    async run() {
      const expected = rowSet(await options.oracle(basis));
      let prior: string | undefined;
      const observations: { phase: number; route: string; outcome: string }[] = [];
      for (let phase = 0; phase < 2; phase++) {
        let answered = 0;
        for (const route of options.routes) {
          let result: RouteRead<Row, Basis>;
          try {
            result = await route.read(basis);
          } catch (error) {
            const code =
              error && typeof error === "object" && "code" in error ? String(error.code) : "";
            if (route.eligible(basis) || !route.refusals.includes(code)) throw error;
            observations.push({ phase, route: route.id, outcome: code });
            continue;
          }
          if (!route.eligible(basis)) throw new Error(`Ineligible route answered: ${route.id}`);
          if ("eligible" in result && result.eligible === false)
            throw new Error("Fail-open ineligible row set");
          if (result.route !== route.id)
            throw new Error(`Requested ${route.id}, took ${result.route}`);
          if (canonicalRouteValue(result.basis) !== canonicalRouteValue(basis))
            throw new Error("Basis echo mismatch");
          const actual = JSON.stringify(rowSet(result.rows));
          if (actual !== JSON.stringify(expected))
            throw new Error(`Oracle mismatch on ${route.id}`);
          if (prior !== undefined && actual !== prior)
            throw new Error(`Cross-route or repeat mismatch on ${route.id}`);
          prior = actual;
          answered++;
          observations.push({ phase, route: route.id, outcome: "answer" });
        }
        if (!answered) throw new Error("No route answered a required basis");
        if (phase === 0) await options.advance();
      }
      return observations;
    },
  }));
}
