import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { encodeOrThrow } from "../content/CanonicalJson.js";
import { Domain, hash } from "../content/ContentId.js";
//#region src/config/World.ts
/**
* The facts an evaluation reads, and the clock it reads them at.
*
* A world is deliberately not content-addressed as a whole. Hashing every fact
* an account has would make one submitted value invalidate every cached
* evaluation in the system, which is the naive design and the wrong one. What
* gets addressed is the **closure**: the facts an evaluation actually observed.
* That set is not knowable before evaluating, so it is discovered during
* evaluation and recorded - the same shape as a build system with dynamic
* dependencies.
*
* Two things here are load-bearing and easy to get wrong.
*
* **Values are observed by digest, never in the clear.** An evaluation that
* read an SSN records that `employee/ssn` was present with digest `sha256-...`,
* not the number. Comparison still works, because a digest changes exactly when
* the value does, so the cache is unaffected. What changes is that a persisted
* decision - the very record you most want to hand an auditor - stops being a
* second copy of the data it was made from.
*
* This is not encryption, and it should not be sold as such. A digest over a
* three-option enum is trivially reversed by trying all three; it is only
* meaningful over a value with real entropy. What it buys unconditionally is
* that the record holds no plaintext, and that anyone with a candidate value
* can *prove* it was the one used without the record ever containing it.
*
* **Absence is a dependency.** "This employee has no work authorization on
* file" is a conclusion drawn from a fact that is not there. If absence is not
* recorded, adding the missing fact leaves a stale cached answer that says the
* requirement is still unmet. So a read of a missing fact observes
* `present: false` and participates in the closure exactly like a present one.
*
* **The clock is an input, not ambient.** An expression asking "is the start
* date in the past" is not a function of the facts alone, and an evaluator that
* reaches for `Date.now()` produces a result that cannot honestly be cached
* against its inputs. Time therefore arrives as a value, with a declared
* granularity, and what is observed is the *bucket* rather than the instant.
* A question about days depends on the day; it should not be invalidated a
* thousand times a second.
*/
var World_exports = /* @__PURE__ */ __exportAll({
	SUBJECT: () => SUBJECT,
	bucket: () => bucket,
	closureId: () => closureId,
	factKey: () => factKey,
	make: () => make,
	matches: () => matches,
	observe: () => observe,
	observedKey: () => observedKey,
	read: () => read,
	valueDigest: () => valueDigest,
	withFact: () => withFact,
	withoutFact: () => withoutFact
});
const DAY_MS = 864e5;
const bucket = (clock) => clock.granularity === "day" ? Math.floor(clock.now / DAY_MS) : clock.now;
/**
* The entity a rule means when it says "this one".
*
* A compliance rule is about *an* employee, not about `ee_1`. Baking a
* particular id into the expression would mint a separate rule per person -
* a thousand config objects saying the same thing, each versioned and diffed
* on its own, and no way to ask "did the I-9 rule change".
*
* So reads may name this sentinel and evaluation substitutes the subject.
* Crucially the substitution happens at evaluation, not at construction: the
* rule's content id stays subject-free, so it is ONE object in the graph, while
* each decision's id differs because its observations name the real entity.
* One rule, many proofs.
*/
const SUBJECT = "$subject";
const factKey = (entity, attribute) => `${entity}/${attribute}`;
const make = (facts) => ({ facts: new Map(Object.entries(facts)) });
const withFact = (world, entity, attribute, value) => {
	const facts = new Map(world.facts);
	facts.set(factKey(entity, attribute), value);
	return { facts };
};
const withoutFact = (world, entity, attribute) => {
	const facts = new Map(world.facts);
	facts.delete(factKey(entity, attribute));
	return { facts };
};
const read = (world, entity, attribute) => world.facts.get(factKey(entity, attribute));
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const encodeObserved = (o) => o._tag === "Config" ? {
	_tag: "Config",
	kind: o.kind,
	key: o.key,
	cid: o.cid
} : o._tag === "Fact" ? {
	_tag: "Fact",
	entity: o.entity,
	attribute: o.attribute,
	present: o.present,
	digest: o.present ? o.digest : void 0
} : {
	_tag: "Clock",
	granularity: o.granularity,
	bucket: o.bucket
};
/** Identity of an observation, used to dedupe and to order the closure. */
const observedKey = (o) => o._tag === "Config" ? `config:${o.kind}/${o.key}` : o._tag === "Fact" ? `fact:${o.entity}/${o.attribute}` : `clock:${o.granularity}`;
/**
* The digest of everything an evaluation depended on.
*
* This is the cache key's other half. Observations are deduped by key and
* sorted, so the order an expression happened to read things in is not content.
*/
const closureId = (observed) => {
	const byKey = /* @__PURE__ */ new Map();
	for (const o of observed) byKey.set(observedKey(o), o);
	const sorted = [...byKey.entries()].sort(([a], [b]) => cmp(a, b)).map(([, o]) => encodeObserved(o));
	return hash(Domain.observationClosure, encodeOrThrow(sorted));
};
const VALUE_DOMAIN = Domain.observationValue;
/**
* The digest of a fact's value.
*
* Domain-separated from node and type ids so a value's digest can never be
* mistaken for, or forged from, an id in another space.
*/
const valueDigest = (value) => hash(VALUE_DOMAIN, encodeOrThrow(value));
/** Observe a fact without retaining its value. */
const observe = (world, entity, attribute) => {
	const value = read(world, entity, attribute);
	return value === void 0 ? {
		_tag: "Fact",
		entity,
		attribute,
		present: false
	} : {
		_tag: "Fact",
		entity,
		attribute,
		present: true,
		digest: valueDigest(value)
	};
};
/**
* Does a candidate value match what an observation recorded?
*
* The verification direction. Someone holding a decision and a proposed value
* can confirm the decision was made from that value; nobody holding only the
* decision can recover it.
*/
const matches = (observed, value) => observed._tag === "Fact" && observed.present && observed.digest === valueDigest(value);
//#endregion
export { SUBJECT, World_exports, bucket, closureId, factKey, make, matches, observe, observedKey, read, valueDigest, withFact, withoutFact };

//# sourceMappingURL=World.js.map