import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { unsafe } from "../Branded.js";
import { encodeOrThrow } from "../content/CanonicalJson.js";
import { Domain, hash } from "../content/ContentId.js";
import { Triples } from "../store/Triples.js";
import { walk } from "./ConfigNode.js";
import { mentions, mentionsRules, rule } from "./BoolExpr.js";
import { fromNodes, lookup } from "./Catalog.js";
import { ConfigStore } from "./ConfigStore.js";
import { factKey } from "./World.js";
import { evaluate as evaluate$1, verify as verify$1 } from "./Evaluate.js";
import { Data, Effect } from "effect";
//#region src/config/ConfigRuntime.ts
/**
* The execution bridge between temporal facts and deployed configuration.
*
* `Evaluate` remains a pure Merkle/proof kernel. This module supplies its two
* stored inputs: a rule catalog from one `ConfigSnapshot` ref and the exact
* Triple facts that catalog can observe. Keeping the bridge here lets a
* decision use one Triples storage boundary without teaching the
* proof format about a concrete backend.
*/
var ConfigRuntime_exports = /* @__PURE__ */ __exportAll({
	AmbiguousDecisionFactError: () => AmbiguousDecisionFactError,
	UnknownConfigRefError: () => UnknownConfigRefError,
	UnsupportedDecisionFactError: () => UnsupportedDecisionFactError,
	evaluate: () => evaluate,
	verify: () => verify
});
var UnknownConfigRefError = class extends Data.TaggedError("UnknownConfigRefError") {};
var AmbiguousDecisionFactError = class extends Data.TaggedError("AmbiguousDecisionFactError") {};
var UnsupportedDecisionFactError = class extends Data.TaggedError("UnsupportedDecisionFactError") {};
const readKey = ({ entity, attribute }) => `${entity}\u0000${attribute}`;
/**
* Static fact dependency closure for an expression and every rule it calls.
* Missing rules deliberately contribute no reads; the evaluator will record
* the missing config observation and return `unknown`.
*/
const factReads = (expr, catalog, subject) => {
	const reads = /* @__PURE__ */ new Map();
	const visitedRules = /* @__PURE__ */ new Set();
	const visit = (current) => {
		for (const mentioned of mentions(current)) {
			const read = {
				entity: mentioned.entity === "$subject" ? subject : mentioned.entity,
				attribute: mentioned.attribute
			};
			reads.set(readKey(read), read);
		}
		for (const key of mentionsRules(current)) {
			if (visitedRules.has(key)) continue;
			visitedRules.add(key);
			const rule = lookup(catalog, key);
			if (rule) visit(rule.expr);
		}
	};
	visit(expr);
	return [...reads.values()].sort((a, b) => a.entity.localeCompare(b.entity) || a.attribute.localeCompare(b.attribute));
};
const scalarValue = (value) => {
	switch (value.type) {
		case "string":
		case "ref":
		case "blob": return value.value;
		case "number":
		case "datetime": return value.value;
		case "boolean": return value.value;
		case "json":
		case "integer": return;
	}
};
const worldFromReads = (reads, basis) => Effect.gen(function* () {
	const triples = yield* Triples;
	const facts = /* @__PURE__ */ new Map();
	for (const read of reads) {
		const pattern = {
			entityId: unsafe.entityId(read.entity),
			attribute: read.attribute
		};
		const matches = yield* triples.match(pattern, basis);
		if (matches.length > 1) return yield* new AmbiguousDecisionFactError({
			...read,
			count: matches.length,
			message: `Decision fact ${read.entity}/${read.attribute} has ${matches.length} live values; evaluation requires cardinality one`
		});
		const triple = matches[0];
		if (!triple) continue;
		const value = scalarValue(triple.value);
		if (value === void 0) return yield* new UnsupportedDecisionFactError({
			...read,
			valueType: triple.value.type,
			message: `Decision fact ${read.entity}/${read.attribute} uses unsupported ${triple.value.type} data; rules accept scalar Triple values`
		});
		facts.set(factKey(read.entity, read.attribute), value);
	}
	return { facts };
});
const decisionId = (decision) => hash(Domain.decision, encodeOrThrow({
	v: 1,
	snapshotRootCid: decision.snapshotRootCid,
	subject: decision.subject,
	evaluation: decision.evaluation.cid
}));
/**
* Evaluate a deployed rule directly against temporal Triple facts.
*
* The returned envelope pins the release selected by the ref. The nested
* evaluation remains independently verifiable with `Evaluate.verify` and
* records content IDs for every config node and fact value it observed.
*/
const evaluate = (input) => Effect.gen(function* () {
	const snapshot = yield* (yield* ConfigStore).resolveRef(input.ref);
	if (!snapshot) return yield* new UnknownConfigRefError({
		ref: input.ref,
		message: `Configuration ref "${input.ref}" does not exist`
	});
	const catalog = fromNodes([...walk(snapshot.root)].map(({ node }) => node));
	const expr = rule(input.rule);
	const evaluation = evaluate$1(expr, yield* worldFromReads(factReads(expr, catalog, input.subject), input.basis), input.clock, catalog, input.subject);
	const decision = {
		ref: input.ref,
		snapshotId: snapshot.id,
		snapshotRootCid: snapshot.rootCid,
		subject: input.subject,
		evaluation
	};
	return {
		...decision,
		cid: decisionId(decision)
	};
});
/** Verify both the release-pinned decision envelope and its evaluation tree. */
const verify = (decision) => {
	const nested = verify$1(decision.evaluation);
	const actual = decisionId(decision);
	return actual === decision.cid ? nested : [...nested, {
		path: "decision",
		claimed: decision.cid,
		actual
	}];
};
//#endregion
export { AmbiguousDecisionFactError, ConfigRuntime_exports, UnknownConfigRefError, UnsupportedDecisionFactError, evaluate, verify };

//# sourceMappingURL=ConfigRuntime.js.map