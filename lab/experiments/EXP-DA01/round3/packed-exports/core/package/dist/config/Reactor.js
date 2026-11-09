import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { observedKey } from "./World.js";
import { evaluate } from "./Evaluate.js";
//#region src/config/Reactor.ts
var Reactor_exports = /* @__PURE__ */ __exportAll({
	affected: () => affected,
	answer: () => answer,
	clockKey: () => clockKey,
	empty: () => empty,
	factKey: () => factKey,
	react: () => react,
	refresh: () => refresh,
	register: () => register,
	registerAll: () => registerAll,
	ruleKey: () => ruleKey,
	unregister: () => unregister
});
const empty = {
	registrations: /* @__PURE__ */ new Map(),
	index: /* @__PURE__ */ new Map()
};
const factKey = (entity, attribute) => observedKey({
	_tag: "Fact",
	entity,
	attribute,
	present: false
});
const ruleKey = (key) => observedKey({
	_tag: "Config",
	kind: "rule",
	key,
	cid: null
});
const clockKey = (granularity) => observedKey({
	_tag: "Clock",
	granularity,
	bucket: 0
});
const draft = (reactor) => ({
	registrations: new Map(reactor.registrations),
	index: new Map(reactor.index)
});
const reindex = (d, key, observed, previous) => {
	for (const o of previous ?? []) {
		const slot = observedKey(o);
		const holders = new Set(d.index.get(slot));
		holders.delete(key);
		if (holders.size === 0) d.index.delete(slot);
		else d.index.set(slot, holders);
	}
	for (const o of observed) {
		const slot = observedKey(o);
		d.index.set(slot, new Set(d.index.get(slot)).add(key));
	}
};
const registerInto = (d, key, expr, env) => {
	const evaluation = evaluate(expr, env.world, env.clock, env.catalog, env.subject);
	const existing = d.registrations.get(key);
	const registration = {
		key,
		expr,
		evaluation
	};
	d.registrations.set(key, registration);
	reindex(d, key, evaluation.observed, existing?.evaluation.observed);
	return registration;
};
/** Record a standing interest, evaluating it once. */
const register = (reactor, key, expr, env) => {
	const d = draft(reactor);
	registerInto(d, key, expr, env);
	return d;
};
/**
* Register many at once.
*
* Not sugar: `register` in a loop copies the whole reactor per entry, which is
* quadratic. Anything bulk - loading an account, backfilling after a publish -
* has to come through here.
*/
const registerAll = (reactor, entries) => {
	const d = draft(reactor);
	for (const e of entries) registerInto(d, e.key, e.expr, e.env);
	return d;
};
const unregister = (reactor, key) => {
	const existing = reactor.registrations.get(key);
	if (!existing) return reactor;
	const d = draft(reactor);
	d.registrations.delete(key);
	reindex(d, key, [], existing.evaluation.observed);
	return d;
};
const answer = (reactor, key) => reactor.registrations.get(key)?.evaluation;
/**
* Which registrations depended on any of these inputs?
*
* A lookup per changed input, not a scan. This is the whole reason the index
* exists: the work of reacting is proportional to what the change touched, not
* to how much the product is watching.
*/
const affected = (reactor, changed) => {
	const keys = /* @__PURE__ */ new Set();
	for (const slot of changed) for (const key of reactor.index.get(slot) ?? []) keys.add(key);
	return [...keys].sort();
};
/**
* Recompute the given registrations and report which answers actually moved.
*
* Recomputation and change are different events: a rule edit may invalidate a
* thousand decisions and flip none of them. Callers that notify people care
* about the flips; callers that keep a read model current care about both.
*/
const refresh = (reactor, keys, env) => {
	const d = draft(reactor);
	const flipped = [];
	for (const key of keys) {
		const before = d.registrations.get(key);
		if (!before) continue;
		const after = registerInto(d, key, before.expr, env);
		if (after.evaluation.truth !== before.evaluation.truth) flipped.push({
			key,
			from: before.evaluation.truth,
			to: after.evaluation.truth
		});
	}
	return {
		reactor: d,
		flipped
	};
};
/** `affected` then `refresh`: the ordinary path when something changes. */
const react = (reactor, changed, env) => {
	const considered = affected(reactor, changed);
	const { reactor: next, flipped } = refresh(reactor, considered, env);
	return {
		reactor: next,
		considered,
		flipped
	};
};
//#endregion
export { Reactor_exports, affected, answer, clockKey, empty, factKey, react, refresh, register, registerAll, ruleKey, unregister };

//# sourceMappingURL=Reactor.js.map