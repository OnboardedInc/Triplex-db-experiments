import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { canonical } from "./TypeExpr.js";
import { Data } from "effect";
//#region src/config/TypeSubsumption.ts
/**
* Is every value of one type also a value of another?
*
* `SchemaCompat` asks the same question of two JSON Schemas and has three
* possible answers, because it is reverse-engineering a fragment of somebody
* else's emitter: a union or a `minLength` it does not model returns `Unknown`,
* and the caller has to fall back to decoding real instances.
*
* Over `TypeExpr` the question is decidable, because the language is closed and
* has no computation in it. So there is no `Unknown` here. Every pair of types
* gets a definite verdict, and the expensive instance-level fallback becomes a
* rarity rather than the common path.
*
* The exact guarantee, stated carefully:
*
* - `Widens` and `Identical` are **proofs**. If either is returned, every value
*   of `from` is valid under `to`. Nothing else in the system is safe unless
*   this direction is never wrong, so when in doubt this function says no.
* - `Narrows` means **not proven compatible**. For every constructor except
*   `Pattern` that also constitutes a proof of incompatibility.
*
* `Pattern` is the single conservative case, and deliberately so. Deciding
* whether one regular expression's language contains another's is possible in
* principle and unpleasant in practice, and JavaScript regexes are not regular
* anyway once backreferences and lookaround are in play. So patterns are
* compared by equality: identical passes, dropping one passes, adding one
* fails, and two different patterns are reported as narrowing even where they
* might have been compatible. That is a false alarm, which costs a review; the
* alternative is a false pass, which costs correctness.
*/
var TypeSubsumption_exports = /* @__PURE__ */ __exportAll({
	Verdict: () => Verdict,
	isCompatible: () => isCompatible,
	subsumes: () => subsumes
});
const Verdict = Data.taggedEnum();
/** True when the verdict is a proof that existing values stay valid. */
const isCompatible = (verdict) => verdict._tag !== "Narrows";
const widens = (...reasons) => Verdict.Widens({ reasons });
const narrows = (...reasons) => Verdict.Narrows({ reasons });
/** Worst wins; `Narrows` is absorbing. */
const combine = (verdicts) => {
	const bad = verdicts.filter((v) => v._tag === "Narrows");
	if (bad.length > 0) return Verdict.Narrows({ reasons: bad.flatMap((v) => v.reasons) });
	if (verdicts.every((v) => v._tag === "Identical")) return Verdict.Identical();
	return Verdict.Widens({ reasons: verdicts.flatMap((v) => v._tag === "Identical" ? [] : v.reasons) });
};
/** Scalars that are freely usable where another is expected. */
const PRIM_WIDENS = { integer: ["number"] };
const primSubsumes = (from, to) => from === to || (PRIM_WIDENS[from] ?? []).includes(to);
const boundsOf = (constraints) => {
	const bounds = {};
	for (const c of constraints) switch (c._tag) {
		case "MinLength":
			bounds.minLength = Math.max(bounds.minLength ?? -Infinity, c.value);
			break;
		case "MaxLength":
			bounds.maxLength = Math.min(bounds.maxLength ?? Infinity, c.value);
			break;
		case "Min":
			bounds.min = Math.max(bounds.min ?? -Infinity, c.value);
			break;
		case "Max":
			bounds.max = Math.min(bounds.max ?? Infinity, c.value);
			break;
		case "Pattern":
			bounds.pattern = c.regex;
			break;
	}
	return bounds;
};
/**
* Does satisfying `from`'s bounds guarantee satisfying `to`'s?
*
* A lower bound in `to` is met when `from` has one at least as high; an upper
* bound when `from` has one no higher. A bound `from` lacks entirely cannot be
* guaranteed, which is why adding a constraint always narrows.
*/
const boundsSubsume = (from, to, at) => {
	const reasons = [];
	const lower = (name, label) => {
		if (to[name] === void 0) return null;
		if (from[name] === void 0 || from[name] < to[name]) return `${at} now requires ${label} >= ${to[name]}`;
		return null;
	};
	const upper = (name, label) => {
		if (to[name] === void 0) return null;
		if (from[name] === void 0 || from[name] > to[name]) return `${at} now requires ${label} <= ${to[name]}`;
		return null;
	};
	const failures = [
		lower("minLength", "length"),
		upper("maxLength", "length"),
		lower("min", "value"),
		upper("max", "value")
	].filter((r) => r !== null);
	if (to.pattern !== void 0 && to.pattern !== from.pattern) failures.push(from.pattern === void 0 ? `${at} now requires pattern ${to.pattern}` : `${at} changed pattern from ${from.pattern} to ${to.pattern}; regex containment is not decided here, so this is reported conservatively`);
	if (failures.length > 0) return Verdict.Narrows({ reasons: failures });
	for (const key of [
		"minLength",
		"maxLength",
		"min",
		"max",
		"pattern"
	]) if (from[key] !== void 0 && to[key] === void 0) reasons.push(`${at} dropped ${key}`);
	return reasons.length > 0 ? Verdict.Widens({ reasons }) : Verdict.Identical();
};
const unwrap = (expr) => expr._tag === "Constrained" ? {
	base: expr.base,
	bounds: boundsOf(expr.constraints)
} : {
	base: expr,
	bounds: {}
};
const go = (from, to, path) => {
	const at = path === "" ? "the type" : path;
	if (canonical(from) === canonical(to)) return Verdict.Identical();
	if (to._tag === "Any") return widens(`${at} became unconstrained`);
	if (from._tag === "Any") return narrows(`${at} was unconstrained and is not`);
	const f = unwrap(from);
	const t = unwrap(to);
	const constraintVerdict = boundsSubsume(f.bounds, t.bounds, at);
	if (constraintVerdict._tag === "Narrows") return constraintVerdict;
	if (f.base._tag === "Union") return combine([constraintVerdict, ...f.base.members.map((m, i) => go(m, t.base, `${at}|${i}`))]);
	if (t.base._tag === "Union") return t.base.members.some((m) => isCompatible(go(f.base, m, at))) ? combine([constraintVerdict, widens(`${at} is one branch of a union`)]) : narrows(`${at} matches no branch of the union`);
	return combine([constraintVerdict, (() => {
		if (f.base._tag === "Enum" && t.base._tag === "Prim") return t.base.prim === "text" ? widens(`${at} opened from a fixed set to text`) : narrows(`${at} cannot become ${t.base.prim}`);
		if (f.base._tag !== t.base._tag) return narrows(`${at} changed from ${f.base._tag} to ${t.base._tag}`);
		switch (f.base._tag) {
			case "Prim": {
				const other = t.base;
				return primSubsumes(f.base.prim, other.prim) ? widens(`${at} widened from ${f.base.prim} to ${other.prim}`) : narrows(`${at} changed from ${f.base.prim} to ${other.prim}`);
			}
			case "Enum": {
				const allowed = new Set(t.base.values);
				const lost = f.base.values.filter((v) => !allowed.has(v));
				return lost.length > 0 ? narrows(`${at} no longer allows ${lost.join(", ")}`) : widens(`${at} allows more values`);
			}
			case "Ref": return narrows(`${at} points at ${t.base.kind}, not ${f.base.kind}`);
			case "List": return go(f.base.item, t.base.item, `${at}[]`);
			case "Struct": {
				const target = t.base;
				const verdicts = [];
				for (const [name, field] of Object.entries(target.fields)) {
					const source = f.base.fields[name];
					if (!source) {
						if (!field.optional) return narrows(`${at} now requires ${name}`);
						verdicts.push(widens(`${at} accepts new optional ${name}`));
						continue;
					}
					if (source.optional && !field.optional) return narrows(`${at} now requires ${name}, which was optional`);
					if (!source.optional && field.optional) verdicts.push(widens(`${at} made ${name} optional`));
					verdicts.push(go(source.type, field.type, `${at}.${name}`));
				}
				for (const name of Object.keys(f.base.fields)) if (!(name in target.fields)) return narrows(`${at} no longer accepts ${name}`);
				return verdicts.length === 0 ? Verdict.Identical() : combine(verdicts);
			}
			default: return narrows(`${at} is an unhandled constructor`);
		}
	})()]);
};
/**
* Total. Every pair of `TypeExpr` values yields `Identical`, `Widens` or
* `Narrows` - there is no third state and no fallback to inspecting data.
*/
const subsumes = (from, to) => go(from, to, "");
//#endregion
export { TypeSubsumption_exports, Verdict, isCompatible, subsumes };

//# sourceMappingURL=TypeSubsumption.js.map