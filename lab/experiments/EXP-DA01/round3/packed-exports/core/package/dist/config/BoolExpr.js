import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { encodeOrThrow } from "../content/CanonicalJson.js";
import { Domain, hash } from "../content/ContentId.js";
//#region src/config/BoolExpr.ts
/**
* A bounded three-valued predicate language over facts.
*
* Small on purpose, and the smallness is a correctness property rather than a
* scoping convenience. Every read an expression can perform is visible in its
* own structure, so the dependency set is knowable and the evaluator cannot
* consult something it did not declare. The moment the language grows a general
* function call or a closure, that guarantee is gone and every cached result
* becomes a guess - so this stays a fixed set of constructors with no escape
* hatch, like `TypeExpr`.
*
* Evaluation is three-valued (`true` / `false` / `unknown`) and that is not the
* same question `TypeSubsumption` answers. Type subsumption is decidable over a
* closed algebra, so it has no `unknown`. Predicate evaluation runs against a
* world where a fact may simply be absent, and collapsing that to `false` is
* how a negated predicate accidentally reports compliance. The two layers are
* both right.
*/
var BoolExpr_exports = /* @__PURE__ */ __exportAll({
	all: () => all,
	any: () => any,
	before: () => before,
	canonical: () => canonical,
	eq: () => eq,
	exists: () => exists,
	id: () => id,
	lit: () => lit,
	mentions: () => mentions,
	mentionsRules: () => mentionsRules,
	not: () => not,
	rule: () => rule
});
const lit = (value) => ({
	_tag: "Lit",
	v: 1,
	value
});
const exists = (entity, attribute) => ({
	_tag: "Exists",
	v: 1,
	entity,
	attribute
});
const eq = (entity, attribute, value) => ({
	_tag: "Eq",
	v: 1,
	entity,
	attribute,
	value
});
const before = (entity, attribute, granularity = "day") => ({
	_tag: "Before",
	v: 1,
	entity,
	attribute,
	granularity
});
const rule = (key) => ({
	_tag: "Rule",
	v: 1,
	key
});
const not = (expr) => ({
	_tag: "Not",
	v: 1,
	expr
});
const all = (exprs) => ({
	_tag: "All",
	v: 1,
	exprs
});
const any = (exprs) => ({
	_tag: "Any",
	v: 1,
	exprs
});
const canonical = (expr) => encodeOrThrow(expr);
const id = (expr) => hash(Domain.boolExpr, canonical(expr));
/**
* Every fact this expression *could* read, without evaluating it.
*
* Available because the language is bounded. Note this is the static
* over-approximation - `Any` short-circuits, so a run may observe fewer. The
* cache keys on what was *actually* observed, not on this; this is for indexes
* and impact analysis ("which predicates mention `employee.start_date`?").
*/
const mentions = (expr) => {
	switch (expr._tag) {
		case "Lit": return [];
		case "Exists":
		case "Eq":
		case "Before": return [{
			entity: expr.entity,
			attribute: expr.attribute
		}];
		case "Rule": return [];
		case "Not": return mentions(expr.expr);
		case "All":
		case "Any": return expr.exprs.flatMap(mentions);
	}
};
/** Rules this expression calls directly. Used to derive a rule node's refs. */
const mentionsRules = (expr) => {
	switch (expr._tag) {
		case "Lit":
		case "Exists":
		case "Eq":
		case "Before": return [];
		case "Rule": return [expr.key];
		case "Not": return mentionsRules(expr.expr);
		case "All":
		case "Any": return expr.exprs.flatMap(mentionsRules);
	}
};
//#endregion
export { BoolExpr_exports, all, any, before, canonical, eq, exists, id, lit, mentions, mentionsRules, not, rule };

//# sourceMappingURL=BoolExpr.js.map