import { unsafe } from "../../Branded.js";
import { isVariable } from "./types.js";
import { Effect } from "effect";
//#region src/kv/datalog/pattern.ts
/**
* Pattern clause execution against the hexastore.
*
* Converts a Datalog PatternClause into a hexastore scan, then
* produces Context bindings from each matching Datom.
*
* This is the bridge between Datalog variables and KV range scans.
*/
/**
* Flatten a TripleValue to a Constant for use in variable bindings.
*
* The domain uses typed discriminated unions for values (e.g., { type: "string", value: "Alice" }).
* Datalog contexts use flat constants (e.g., "Alice" or 42).
* Refs are kept as their entity ID strings.
*/
const tripleValueToConstant = (tv) => {
	switch (tv.type) {
		case "integer": throw new TypeError("KV Datalog does not support exact integer values");
		case "string":
		case "ref":
		case "blob": return tv.value;
		case "number":
		case "datetime": return tv.value;
		case "boolean": return tv.value;
		case "json": return JSON.stringify(tv.value);
	}
};
/**
* Convert a Constant back to a TripleValue for hexastore scans.
* Since we lose type information when flattening, we use heuristics:
* - strings starting with certain patterns could be refs, but we default to string
* - numbers are numbers
* - booleans are booleans
*
* For bound variables from previous patterns, we use the original TripleValue
* stored alongside the binding when possible.
*/
const constantToTripleValue = (c) => {
	if (typeof c === "object" && c !== null && c.type === "integer") throw new TypeError("KV Datalog does not support exact integer constants");
	if (typeof c === "string") return {
		type: "string",
		value: c
	};
	if (typeof c === "number") return {
		type: "number",
		value: c
	};
	if (typeof c === "boolean") return {
		type: "boolean",
		value: c
	};
	if (typeof c === "object" && c !== null && "type" in c && c.type === "ref") return {
		type: "ref",
		value: unsafe.entityId(c.value)
	};
	return {
		type: "string",
		value: String(c)
	};
};
/**
* Convert an untyped Datalog constant to every stored value encoding with the
* same scalar representation. Explicitly typed constants remain exact.
*
* Datalog bindings intentionally expose ergonomic scalar values, so a string
* bound from a ref cannot retain its storage tag. Scanning every compatible
* encoding keeps later joins symmetric with that public binding shape.
*/
const constantToScanValues = (c) => {
	if (typeof c === "string") {
		const values = [
			{
				type: "string",
				value: c
			},
			{
				type: "ref",
				value: unsafe.entityId(c)
			},
			{
				type: "blob",
				value: c,
				mimeType: "",
				size: 0
			}
		];
		try {
			values.push({
				type: "json",
				value: JSON.parse(c)
			});
		} catch {}
		return values;
	}
	if (typeof c === "number") return [{
		type: "number",
		value: c
	}, {
		type: "datetime",
		value: c
	}];
	return [constantToTripleValue(c)];
};
/**
* Resolve a term in a pattern clause to either a concrete value or undefined (variable).
* If the term is a variable already bound in the context, use the bound value.
*/
const resolveTermForScan = (term, context) => {
	if (isVariable(term)) {
		if (term in context) return {
			bound: true,
			value: context[term]
		};
		return { bound: false };
	}
	return {
		bound: true,
		value: term
	};
};
/**
* Convert a PatternClause + current Context into a ScanPattern for the hexastore.
*
* A PatternClause is [entity, attribute, value] or [entity, attribute, value, tx].
* Terms can be variables (?x) or constants.
* Variables already bound in the context are treated as constants.
*/
const patternToScanPattern = (pattern, context) => {
	const [entityTerm, attrTerm, valueTerm] = pattern;
	const entity = resolveTermForScan(entityTerm, context);
	const attr = resolveTermForScan(attrTerm, context);
	const value = resolveTermForScan(valueTerm, context);
	const result = {};
	if (entity.bound) result.entity = String(entity.value);
	if (attr.bound) result.attribute = String(attr.value);
	if (value.bound) result.value = constantToTripleValue(value.value);
	return result;
};
/**
* Convert a pattern to all index scans required by Datalog's untyped-constant
* matching semantics. The singular helper above remains the canonical exact
* conversion for callers that need one scan plan.
*/
const patternToScanPatterns = (pattern, context) => {
	const base = patternToScanPattern(pattern, context);
	const value = resolveTermForScan(pattern[2], context);
	if (!value.bound) return [base];
	return constantToScanValues(value.value).map((scanValue) => ({
		...base,
		value: scanValue
	}));
};
/**
* Try to bind a Datom's components against a PatternClause, extending the given Context.
*
* For each position (entity, attribute, value, tx):
* - If the term is a constant, verify the datom matches
* - If the term is an unbound variable, bind it to the datom's value
* - If the term is a bound variable, verify the binding matches
*
* Returns the extended context, or null if the datom doesn't match.
*/
const bindDatom = (pattern, datom, context) => {
	const [entityTerm, attrTerm, valueTerm] = pattern;
	const txTerm = pattern.length === 4 ? pattern[3] : void 0;
	let ctx = context;
	ctx = matchTerm(entityTerm, datom.entity, ctx);
	if (ctx === null) return null;
	ctx = matchTerm(attrTerm, datom.attribute, ctx);
	if (ctx === null) return null;
	if (typeof valueTerm === "object" && valueTerm !== null && "type" in valueTerm) {
		if (valueTerm.type !== datom.value.type || valueTerm.value !== datom.value.value) return null;
	} else ctx = matchTerm(valueTerm, tripleValueToConstant(datom.value), ctx);
	if (ctx === null) return null;
	if (txTerm !== void 0) {
		ctx = matchTerm(txTerm, datom.txId, ctx);
		if (ctx === null) return null;
	}
	return ctx;
};
/**
* Match a single term against a value in the context.
*/
const matchTerm = (term, value, context) => {
	if (context === null) return null;
	if (isVariable(term)) {
		if (term in context) return context[term] === value ? context : null;
		return {
			...context,
			[term]: value
		};
	}
	if (typeof term === "object" && term !== null && "type" in term) {
		const typedTerm = term;
		if (typedTerm.type === "ref") return typedTerm.value === value ? context : null;
	}
	return term === value ? context : null;
};
/**
* Execute a single pattern clause against the hexastore.
*
* For each input context:
* 1. Convert the pattern + context to a ScanPattern (binding known variables)
* 2. Scan the hexastore for matching datoms
* 3. For each datom, try to extend the context with new bindings
* 4. Yield all successful bindings
*
* This is the index nested loop join operation at the core of the executor.
* Uses the synchronous scanCollect path when available (in-memory backend)
* to avoid Effect/Stream overhead in the hot loop.
*/
const executePattern = (store, pattern, contexts, basis) => {
	const syncResults = executePatternSync(store, pattern, contexts, basis);
	if (syncResults !== null) return Effect.succeed(syncResults);
	return Effect.gen(function* () {
		if (contexts.length > 100) {
			const hashResult = yield* executePatternHashJoinAsync(store, pattern, contexts, basis);
			if (hashResult !== null) return hashResult;
		}
		const results = [];
		for (const ctx of contexts) for (const scanPattern of patternToScanPatterns(pattern, ctx)) {
			const datoms = yield* basis === void 0 ? store.scanCollectAsync(scanPattern) : store.scanCollectTemporalAsync(scanPattern, basis);
			for (let i = 0; i < datoms.length; i++) {
				const bound = bindDatom(pattern, datoms[i], ctx);
				if (bound !== null) results.push(bound);
			}
		}
		return results;
	});
};
/**
* Synchronous fast path for pattern execution.
* Returns null if the backend doesn't support sync operations.
*
* When there are many contexts and the join variable is the entity position,
* uses a hash join instead of nested loop: one attribute scan → hash map → O(1) lookups.
* This turns D2's 100k × O(log n) scans into 1 × O(n) scan + 100k × O(1) lookups.
*/
const executePatternSync = (store, pattern, contexts, basis) => {
	if (contexts.length > 100) {
		const hashResult = executePatternHashJoin(store, pattern, contexts, basis);
		if (hashResult !== null) return hashResult;
	}
	const results = [];
	for (const ctx of contexts) for (const scanPattern of patternToScanPatterns(pattern, ctx)) {
		const datoms = basis === void 0 ? store.scanCollect(scanPattern) : store.scanCollectTemporal(scanPattern, basis);
		if (datoms === null) return null;
		for (let i = 0; i < datoms.length; i++) {
			const bound = bindDatom(pattern, datoms[i], ctx);
			if (bound !== null) results.push(bound);
		}
	}
	return results;
};
/**
* Hash join optimization: instead of N individual index scans,
* do ONE full attribute scan and build a hash map entity → Datom[].
* Then for each context, look up the bound entity in O(1).
*
* Applicable when:
* - Entity is a variable bound in contexts (the join key)
* - Attribute is a constant (determines which index to scan)
* - Value is unbound (or also bound, we filter post-scan)
*
* Returns null if the pattern shape doesn't match or sync is unavailable.
*/
const executePatternHashJoin = (store, pattern, contexts, basis) => {
	const [entityTerm, attrTerm] = pattern;
	if (!isVariable(entityTerm)) return null;
	if (!(entityTerm in contexts[0])) return null;
	if (isVariable(attrTerm)) return null;
	const scanPattern = { attribute: String(attrTerm) };
	const allDatoms = basis === void 0 ? store.scanCollect(scanPattern) : store.scanCollectTemporal(scanPattern, basis);
	if (allDatoms === null) return null;
	const entityMap = /* @__PURE__ */ new Map();
	for (let i = 0; i < allDatoms.length; i++) {
		const d = allDatoms[i];
		let arr = entityMap.get(d.entity);
		if (arr === void 0) {
			arr = [];
			entityMap.set(d.entity, arr);
		}
		arr.push(d);
	}
	const results = [];
	for (const ctx of contexts) {
		const entityId = String(ctx[entityTerm]);
		const datoms = entityMap.get(entityId);
		if (datoms === void 0) continue;
		for (let i = 0; i < datoms.length; i++) {
			const bound = bindDatom(pattern, datoms[i], ctx);
			if (bound !== null) results.push(bound);
		}
	}
	return results;
};
/**
* Async hash join optimization: same as executePatternHashJoin but uses
* scanCollectAsync for batched META reads (2 round trips instead of N+1).
*
* Returns Effect<Context[] | null> — null if the pattern shape doesn't match.
*/
const executePatternHashJoinAsync = (store, pattern, contexts, basis) => {
	const [entityTerm, attrTerm] = pattern;
	if (!isVariable(entityTerm)) return Effect.succeed(null);
	if (!(entityTerm in contexts[0])) return Effect.succeed(null);
	if (isVariable(attrTerm)) return Effect.succeed(null);
	const scanPattern = { attribute: String(attrTerm) };
	return Effect.gen(function* () {
		const allDatoms = yield* basis === void 0 ? store.scanCollectAsync(scanPattern) : store.scanCollectTemporalAsync(scanPattern, basis);
		const entityMap = /* @__PURE__ */ new Map();
		for (let i = 0; i < allDatoms.length; i++) {
			const d = allDatoms[i];
			let arr = entityMap.get(d.entity);
			if (arr === void 0) {
				arr = [];
				entityMap.set(d.entity, arr);
			}
			arr.push(d);
		}
		const results = [];
		for (const ctx of contexts) {
			const entityId = String(ctx[entityTerm]);
			const datoms = entityMap.get(entityId);
			if (datoms === void 0) continue;
			for (let i = 0; i < datoms.length; i++) {
				const bound = bindDatom(pattern, datoms[i], ctx);
				if (bound !== null) results.push(bound);
			}
		}
		return results;
	});
};
//#endregion
export { bindDatom, constantToTripleValue, executePattern, patternToScanPattern, tripleValueToConstant };

//# sourceMappingURL=pattern.js.map