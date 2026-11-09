//#region src/routeEquivalence.ts
const canonicalRouteValue = (value) => {
	if (typeof value === "number" && Object.is(value, -0)) return "-0";
	if (value === void 0) return "undefined";
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(canonicalRouteValue).join(",")}]`;
	return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonicalRouteValue(v)}`).join(",")}}`;
};
const rowSet = (rows) => rows.map(canonicalRouteValue).sort();
function makeRouteEquivalenceCases(options) {
	return options.bases.map((basis, index) => ({
		name: `route equivalence seed=${options.seed} basis=${index}`,
		async run() {
			const expected = rowSet(await options.oracle(basis));
			let prior;
			const observations = [];
			for (let phase = 0; phase < 2; phase++) {
				let answered = 0;
				for (const route of options.routes) {
					let result;
					try {
						result = await route.read(basis);
					} catch (error) {
						const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
						if (route.eligible(basis) || !route.refusals.includes(code)) throw error;
						observations.push({
							phase,
							route: route.id,
							outcome: code
						});
						continue;
					}
					if (!route.eligible(basis)) throw new Error(`Ineligible route answered: ${route.id}`);
					if ("eligible" in result && result.eligible === false) throw new Error("Fail-open ineligible row set");
					if (result.route !== route.id) throw new Error(`Requested ${route.id}, took ${result.route}`);
					if (canonicalRouteValue(result.basis) !== canonicalRouteValue(basis)) throw new Error("Basis echo mismatch");
					const actual = JSON.stringify(rowSet(result.rows));
					if (actual !== JSON.stringify(expected)) throw new Error(`Oracle mismatch on ${route.id}`);
					if (prior !== void 0 && actual !== prior) throw new Error(`Cross-route or repeat mismatch on ${route.id}`);
					prior = actual;
					answered++;
					observations.push({
						phase,
						route: route.id,
						outcome: "answer"
					});
				}
				if (!answered) throw new Error("No route answered a required basis");
				if (phase === 0) await options.advance();
			}
			return observations;
		}
	}));
}
//#endregion
export { canonicalRouteValue, makeRouteEquivalenceCases };

//# sourceMappingURL=routeEquivalence.js.map