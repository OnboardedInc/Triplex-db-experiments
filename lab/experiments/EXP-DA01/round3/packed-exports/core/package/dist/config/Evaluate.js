import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { encodeOrThrow } from "../content/CanonicalJson.js";
import { ContentIdSchema, Domain, hash } from "../content/ContentId.js";
import { id } from "./BoolExpr.js";
import { RULE_KIND, empty, lookup } from "./Catalog.js";
import { bucket, closureId, observe, observedKey, read } from "./World.js";
import { Schema } from "effect";
//#region src/config/Evaluate.ts
/**
* Content-addressed evaluation: is `evaluate(expr, facts) -> result` a pure
* function you can address by identity?
*
* If it is, four things that are normally built as separate systems collapse
* into one structure:
*
* - the **cache key** for an evaluation;
* - the **invalidation index** - a fact moves, its observation moves, and
*   exactly the evaluations that read it die;
* - the **provenance tree** an auditor needs, which is itself a merkle DAG; and
* - **verifiable history** - a root id proves what was decided from what,
*   without trusting the database that stored it.
*
* The catch, and the reason this needs an experiment rather than an assertion,
* is that the cache key is not knowable *before* evaluating. Which facts an
* expression reads depends on the facts - `Any` short-circuits, so a run may
* touch two of five. That is a dynamic-dependency problem, and the resolution
* is the one build systems reached: record what was observed, and on the next
* lookup replay *those* observations against the current world and compare
* digests. A hit means every input the last run actually looked at is
* unchanged. Facts it never looked at may change freely, which is the whole
* point - otherwise one submitted value invalidates an account.
*
* Two subtleties are what make this correct rather than merely fast. Absence is
* recorded as an observation, so filling in a missing fact invalidates. And the
* clock is an explicit input at a declared granularity, so a question about
* days is cached for a day rather than being either wrong or useless.
*/
var Evaluate_exports = /* @__PURE__ */ __exportAll({
	EvaluationSchema: () => EvaluationSchema,
	cached: () => cached,
	emptyCache: () => emptyCache,
	env: () => env,
	evaluate: () => evaluate,
	impact: () => impact,
	reobserve: () => reobserve,
	replay: () => replay,
	shapeCount: () => shapeCount,
	verify: () => verify,
	walk: () => walk
});
const env = (world, clock, catalog = empty, subject) => ({
	world,
	clock,
	catalog,
	...subject !== void 0 && { subject }
});
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const dedupe = (observed) => {
	const byKey = /* @__PURE__ */ new Map();
	for (const o of observed) byKey.set(observedKey(o), o);
	return [...byKey.entries()].sort(([a], [b]) => cmp(a, b)).map(([, o]) => o);
};
const node = (input) => {
	const children = input.children ?? [];
	const observed = dedupe([...input.observed, ...children.flatMap((c) => c.observed)]);
	const expr = id(input.expr);
	const cid = hash(Domain.evaluation, encodeOrThrow({
		v: 1,
		expr,
		truth: input.truth,
		closure: closureId(observed),
		children: children.map((c) => c.cid),
		reason: input.reason ?? null
	}));
	return {
		truth: input.truth,
		cid,
		expr,
		observed,
		children,
		...input.reason !== void 0 && { reason: input.reason }
	};
};
const notOf = (t) => t === "unknown" ? "unknown" : t === "true" ? "false" : "true";
const allOf = (ts) => ts.includes("false") ? "false" : ts.includes("unknown") ? "unknown" : "true";
const anyOf = (ts) => ts.includes("true") ? "true" : ts.includes("unknown") ? "unknown" : "false";
/**
* Read a fact for comparison and record it for provenance.
*
* Deliberately two values. The evaluator needs the actual value to decide the
* predicate; the record needs only a digest. Splitting them here is what keeps
* plaintext out of everything downstream.
*/
const readFact = (world, entity, attribute) => ({
	value: read(world, entity, attribute),
	observed: observe(world, entity, attribute)
});
/**
* Which entity a read names. Unresolved `$subject` is a missing input, not a
* crash - the same three-valued treatment an absent fact gets.
*/
const resolve = (entity, env) => entity === "$subject" ? env.subject : entity;
const go = (expr, env, calling) => {
	const { world, clock } = env;
	if ((expr._tag === "Exists" || expr._tag === "Eq" || expr._tag === "Before") && resolve(expr.entity, env) === void 0) return node({
		truth: "unknown",
		expr,
		observed: [],
		reason: "evaluated without a subject"
	});
	switch (expr._tag) {
		case "Lit": return node({
			truth: expr.value ? "true" : "false",
			expr,
			observed: []
		});
		case "Exists": {
			const fact = readFact(world, resolve(expr.entity, env), expr.attribute);
			return node({
				truth: fact.value === void 0 ? "false" : "true",
				expr,
				observed: [fact.observed]
			});
		}
		case "Eq": {
			const fact = readFact(world, resolve(expr.entity, env), expr.attribute);
			if (fact.value === void 0) return node({
				truth: "unknown",
				expr,
				observed: [fact.observed],
				reason: `${resolve(expr.entity, env)}/${expr.attribute} is absent`
			});
			return node({
				truth: fact.value === expr.value ? "true" : "false",
				expr,
				observed: [fact.observed]
			});
		}
		case "Before": {
			const fact = readFact(world, resolve(expr.entity, env), expr.attribute);
			const tick = {
				_tag: "Clock",
				granularity: expr.granularity,
				bucket: bucket({
					now: clock.now,
					granularity: expr.granularity
				})
			};
			if (fact.value === void 0) return node({
				truth: "unknown",
				expr,
				observed: [fact.observed, tick],
				reason: `${resolve(expr.entity, env)}/${expr.attribute} is absent`
			});
			if (typeof fact.value !== "number") return node({
				truth: "unknown",
				expr,
				observed: [fact.observed, tick],
				reason: `${resolve(expr.entity, env)}/${expr.attribute} is not an instant`
			});
			return node({
				truth: bucket({
					now: fact.value,
					granularity: expr.granularity
				}) < tick.bucket ? "true" : "false",
				expr,
				observed: [fact.observed, tick]
			});
		}
		case "Rule": {
			const found = lookup(env.catalog, expr.key);
			if (!found) return node({
				truth: "unknown",
				expr,
				observed: [{
					_tag: "Config",
					kind: RULE_KIND,
					key: expr.key,
					cid: null
				}],
				reason: `rule ${expr.key} is not in this configuration`
			});
			const observed = {
				_tag: "Config",
				kind: RULE_KIND,
				key: expr.key,
				cid: found.cid
			};
			if (calling.has(expr.key)) return node({
				truth: "unknown",
				expr,
				observed: [observed],
				reason: `rule ${expr.key} is recursive`
			});
			const child = go(found.expr, env, new Set(calling).add(expr.key));
			return node({
				truth: child.truth,
				expr,
				observed: [observed],
				children: [child]
			});
		}
		case "Not": {
			const child = go(expr.expr, env, calling);
			return node({
				truth: notOf(child.truth),
				expr,
				observed: [],
				children: [child]
			});
		}
		case "All": {
			const children = expr.exprs.map((e) => go(e, env, calling));
			return node({
				truth: allOf(children.map((c) => c.truth)),
				expr,
				observed: [],
				children
			});
		}
		case "Any": {
			const children = expr.exprs.map((e) => go(e, env, calling));
			return node({
				truth: anyOf(children.map((c) => c.truth)),
				expr,
				observed: [],
				children
			});
		}
	}
};
const evaluate = (expr, world, clock, catalog = empty, subject) => go(expr, env(world, clock, catalog, subject), /* @__PURE__ */ new Set());
/**
* Replay a recorded dependency set against the current inputs.
*
* Lives here rather than in `World` because a dependency may now be a config
* node, and re-observing one means asking the catalog - the same question,
* asked of a different source.
*/
const reobserve = (observed, env) => observed.map((o) => {
	if (o._tag === "Clock") return {
		_tag: "Clock",
		granularity: o.granularity,
		bucket: bucket({
			now: env.clock.now,
			granularity: o.granularity
		})
	};
	if (o._tag === "Config") {
		const found = lookup(env.catalog, o.key);
		return {
			_tag: "Config",
			kind: o.kind,
			key: o.key,
			cid: found?.cid ?? null
		};
	}
	return observe(env.world, o.entity, o.attribute);
});
const emptyCache = () => ({
	entries: /* @__PURE__ */ new Map(),
	hits: 0,
	misses: 0
});
/** Identity of a dependency shape: the observed keys, ignoring their values. */
const shapeKey = (observed) => observed.map(observedKey).sort(cmp).join("|");
/** How many distinct dependency shapes this expression has produced. */
const shapeCount = (cache, expr) => (cache.entries.get(id(expr)) ?? []).length;
/**
* Evaluate, reusing a previous answer when every input that answer actually
* looked at is unchanged.
*
* A hit costs one re-observation per shape plus a map read - it never traverses
* the world, the expression, or the other cached answers.
*/
const cached = (cache, expr, world, clock, catalog = empty, subject) => {
	const scope = env(world, clock, catalog, subject);
	const exprId = id(expr);
	const shapes = cache.entries.get(exprId) ?? [];
	for (const shape of shapes) {
		const now = reobserve(shape.probe, scope);
		const found = shape.byClosure.get(closureId(now));
		if (found) return {
			evaluation: found,
			cache: {
				...cache,
				hits: cache.hits + 1
			},
			hit: true
		};
	}
	const evaluation = go(expr, scope, /* @__PURE__ */ new Set());
	const key = shapeKey(evaluation.observed);
	const closure = closureId(evaluation.observed);
	const next = shapes.some((s) => shapeKey(s.probe) === key) ? shapes.map((s) => shapeKey(s.probe) === key ? {
		probe: s.probe,
		byClosure: new Map(s.byClosure).set(closure, evaluation)
	} : s) : [...shapes, {
		probe: evaluation.observed,
		byClosure: new Map([[closure, evaluation]])
	}];
	const entries = new Map(cache.entries);
	entries.set(exprId, next);
	return {
		evaluation,
		cache: {
			entries,
			hits: cache.hits,
			misses: cache.misses + 1
		},
		hit: false
	};
};
/** Depth-first walk of the provenance tree. */
function* walk(evaluation) {
	yield evaluation;
	for (const child of evaluation.children) yield* walk(child);
}
/**
* "If I publish this, what changes?" - answered before publishing.
*
* This is what the join is for. The closure an evaluation recorded is not only
* a cache key, it is an invalidation index: a subject whose answer read none of
* the rules that moved *cannot* flip, so it is skipped without being evaluated.
* Work is proportional to the blast radius of the change rather than to the
* size of the population, which is what makes the preview affordable to run on
* every publish rather than as an offline report.
*
* Note the asymmetry with facts. Config deps are resolvable up front - the two
* catalogs are both in hand - so the skip decision is made without touching a
* world. Fact deps could not be pruned this way, because knowing which facts an
* answer would read requires evaluating it.
*/
const impact = (cache, expr, subjects, clock, before, after) => {
	const flipped = [];
	let working = cache;
	let skipped = 0;
	let reevaluated = 0;
	subjects.forEach((world, subject) => {
		const previous = cached(working, expr, world, clock, before);
		working = previous.cache;
		const configDeps = previous.evaluation.observed.filter((o) => o._tag === "Config");
		if (!reobserve(configDeps, env(world, clock, after)).some((now, i) => now._tag === "Config" && now.cid !== configDeps[i].cid)) {
			skipped++;
			return;
		}
		const next = cached(working, expr, world, clock, after);
		working = next.cache;
		reevaluated++;
		if (next.evaluation.truth !== previous.evaluation.truth) flipped.push({
			subject,
			from: previous.evaluation.truth,
			to: next.evaluation.truth
		});
	});
	return {
		impact: {
			considered: subjects.length,
			skipped,
			reevaluated,
			flipped
		},
		cache: working
	};
};
/**
* A decision, in the form it leaves the process in.
*
* Plain data with no values in it - the observations carry digests - so a tree
* can be handed to an auditor, stored, or sent over a wire without becoming a
* second copy of the facts it was made from.
*/
const EvaluationSchema = Schema.suspend(() => Schema.Struct({
	truth: Schema.Literals([
		"true",
		"false",
		"unknown"
	]),
	cid: ContentIdSchema,
	expr: ContentIdSchema,
	observed: Schema.Array(Schema.Union([
		Schema.Struct({
			_tag: Schema.Literal("Config"),
			kind: Schema.String,
			key: Schema.String,
			cid: Schema.NullOr(ContentIdSchema)
		}),
		Schema.Struct({
			_tag: Schema.Literal("Fact"),
			entity: Schema.String,
			attribute: Schema.String,
			present: Schema.Boolean,
			digest: Schema.optional(ContentIdSchema)
		}),
		Schema.Struct({
			_tag: Schema.Literal("Clock"),
			granularity: Schema.Literals(["instant", "day"]),
			bucket: Schema.Number
		})
	])),
	children: Schema.Array(EvaluationSchema),
	reason: Schema.optional(Schema.String)
}));
/**
* Recompute every id in an evaluation from its own contents.
*
* This is the auditor's check, and it needs nothing but the tree: no database,
* no catalog, no trust in whoever handed it over. Each node's id is derived
* from its answer, the expression that produced it, the digest of everything it
* observed, and its children's ids - so altering any of those, at any depth,
* breaks the root. A decision that verifies is a decision nobody edited after
* the fact.
*
* This is an internal-consistency and tamper-evidence check. It deliberately
* does not check whether the answer follows from an authoritative deployed
* rule or whether observed configuration ids belong to a release; that is a
* replay/attestation check and needs trusted external inputs.
*/
const verify = (evaluation, path = "root") => {
	const found = evaluation.children.flatMap((child, i) => verify(child, `${path}.${i}`));
	const actual = hash(Domain.evaluation, encodeOrThrow({
		v: 1,
		expr: evaluation.expr,
		truth: evaluation.truth,
		closure: closureId(evaluation.observed),
		children: evaluation.children.map((c) => c.cid),
		reason: evaluation.reason ?? null
	}));
	return actual === evaluation.cid ? found : [...found, {
		path,
		claimed: evaluation.cid,
		actual
	}];
};
/**
* Re-derive a decision from the rule and the inputs it recorded.
*
* The stronger claim: not merely that the record is internally consistent, but
* that evaluating this expression against a world matching the recorded
* observations reproduces exactly this answer. Because the record holds digests
* rather than values, the caller supplies the world - which is the point. An
* auditor with the data can reproduce the decision; an auditor without it can
* still verify the decision was not tampered with.
*/
const replay = (expr, evaluation, world, clock, catalog = empty, subject) => go(expr, env(world, clock, catalog, subject), /* @__PURE__ */ new Set()).cid === evaluation.cid;
//#endregion
export { Evaluate_exports, EvaluationSchema, cached, emptyCache, env, evaluate, impact, reobserve, replay, shapeCount, verify, walk };

//# sourceMappingURL=Evaluate.js.map