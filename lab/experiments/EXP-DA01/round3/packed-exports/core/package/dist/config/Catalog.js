import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { make } from "./ConfigNode.js";
import { mentionsRules } from "./BoolExpr.js";
//#region src/config/Catalog.ts
/**
* Rules as configuration.
*
* Until now `BoolExpr` was free-floating: a predicate had a content id but no
* version, no place in the graph, and nothing connecting a rule change to the
* decisions it had already produced. That left two content-addressed systems
* side by side, which is two coincidences rather than one principle.
*
* A rule here is an ordinary `ConfigNode`. That buys three things at once and
* they are the point of the join:
*
* - **One graph.** A rule that calls another rule records a `ref`, so
*   `ConfigNode.closureId` already answers "would this rule behave differently"
*   when a shared sub-rule moves - the same machinery that answers it for a
*   form reading a retyped attribute.
* - **One invalidation path.** Resolving a rule during evaluation observes its
*   content id, exactly the way reading a fact observes a value. Config changes
*   and fact changes then flow through the same closure and the same cache;
*   there is no config-watcher bolted on beside the fact-watcher.
* - **Pinning for free.** An evaluation carries the rule's cid in its own id,
*   so an answer decided under v3 is not merely labelled v3 - it is a different
*   object from the v4 answer and the cache cannot serve one for the other.
*/
var Catalog_exports = /* @__PURE__ */ __exportAll({
	RULE_KIND: () => RULE_KIND,
	empty: () => empty,
	fromNodes: () => fromNodes,
	lookup: () => lookup,
	ruleNode: () => ruleNode
});
const RULE_KIND = "rule";
const empty = { rules: /* @__PURE__ */ new Map() };
/**
* A rule as a node in the config graph.
*
* The refs are derived from the expression rather than declared by the caller,
* so a rule cannot claim a dependency set that differs from the one it will
* actually resolve. That is the same discipline `BoolExpr` uses for facts: what
* it can reach is visible in its structure.
*/
const ruleNode = (key, expr) => make({
	kind: RULE_KIND,
	key,
	attrs: { expr },
	refs: mentionsRules(expr).map((target) => ({
		rel: "calls",
		kind: RULE_KIND,
		key: target
	}))
});
/** Build a catalog from rule nodes - typically the rules in one snapshot. */
const fromNodes = (nodes) => {
	const rules = /* @__PURE__ */ new Map();
	for (const node of nodes) {
		if (node.kind !== "rule") continue;
		const attrs = node.attrs;
		if (attrs.expr === void 0) continue;
		rules.set(node.key, {
			expr: attrs.expr,
			cid: node.cid
		});
	}
	return { rules };
};
const lookup = (catalog, key) => catalog.rules.get(key);
//#endregion
export { Catalog_exports, RULE_KIND, empty, fromNodes, lookup, ruleNode };

//# sourceMappingURL=Catalog.js.map