import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { notImplemented } from "./Errors.js";
//#region src/entity/Plan.ts
var Plan_exports = /* @__PURE__ */ __exportAll({
	partialSet: () => partialSet,
	planProjection: () => planProjection,
	rowSegments: () => rowSegments
});
/** Pure planner. Deferred to EXP-R02; the stub throws `NotImplementedError`. */
const planProjection = (_input) => {
	throw notImplemented("planProjection");
};
/**
* Per-type partial set for one engine: entity type to entity id to the attributes that are not
* complete. C1 routes a query to the exact path when this set intersects the query's referenced
* attributes. Deferred to EXP-R02.
*/
const partialSet = (_plan, _engine) => {
	throw notImplemented("partialSet");
};
/** Whole-row segments of one membership (all attribute edges merged), for timeline rewrites. Deferred to EXP-R02. */
const rowSegments = (_membership) => {
	throw notImplemented("rowSegments");
};
//#endregion
export { Plan_exports, partialSet, planProjection, rowSegments };

//# sourceMappingURL=Plan.js.map