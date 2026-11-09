//#region src/routeHistory.ts
function makeRouteEquivalenceScenario(seed) {
	if (!Number.isSafeInteger(seed) || seed < 0) throw new RangeError("Route seed must be a nonnegative safe integer");
	let rng = seed >>> 0;
	const next = () => {
		rng = Math.imul(rng, 1664525) + 1013904223 >>> 0;
		return rng;
	};
	const subjects = Array.from({ length: 6 }, (_, i) => `e${i}`), live = [];
	const commands = [];
	for (let i = 0; i < 40; i++) {
		const operations = [];
		if (i === 1) for (const target of live.splice(0, 10)) operations.push({
			op: "retract",
			target
		});
		else if (i % 4 === 0 && live.length) operations.push({
			op: "retract",
			target: live.shift()
		});
		for (let j = 0; j < (i === 0 ? 40 : i === 19 ? 0 : 2); j++) {
			const ref = `s${seed}-${i}-${j}`;
			live.push(ref);
			const assertion = {
				op: "assert",
				ref,
				entityId: subjects[next() % subjects.length],
				attribute: ":value",
				value: {
					type: "number",
					value: i * 100 + j
				},
				validFrom: i % 7 === 0 ? 25 : 0,
				...i % 11 === 0 ? { validTo: 100 } : {}
			};
			operations.push(assertion);
			if (i === 17 && j === 0) {
				operations.push({
					op: "retract-pattern",
					target: ref,
					pattern: {
						entityId: assertion.entityId,
						attribute: assertion.attribute,
						value: assertion.value
					}
				});
				live.splice(live.indexOf(ref), 1);
			}
		}
		commands.push({
			clock: 100 + Math.floor(i / 2),
			operations
		});
	}
	return {
		seed,
		subjects,
		groups: commands.flatMap((command, i) => i === 11 ? [] : [i === 10 ? [command, commands[i + 1]] : [command]]),
		bases: [
			{
				validAt: 50,
				recordedPosition: 40
			},
			...[
				0,
				1,
				2,
				7,
				11,
				19
			].map((recordedPosition) => ({
				validAt: 50,
				recordedPosition
			})),
			{
				validAt: 0,
				recordedPosition: 40
			},
			{
				validAt: 150,
				recordedPosition: 40
			},
			{
				validAt: 50,
				recordedAt: 110
			},
			{
				validAt: 50,
				recordedAt: 110,
				recordedPosition: 40
			}
		],
		interiorPositions: [11]
	};
}
//#endregion
export { makeRouteEquivalenceScenario };

//# sourceMappingURL=routeHistory.js.map