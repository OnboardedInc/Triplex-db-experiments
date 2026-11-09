import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { notImplemented } from "./Errors.js";
import { Effect } from "effect";
//#region src/entity/Repository.ts
/**
* Typed repository and writer over the public `Triples` service.
*
* [EXP-R01] Why: an application declares EntityTypes once and gets `Repository<Model>` and
* `Writer<Model>`, correct on every backend because they use only the public `Triples` service
* (KV first). Lane-specific projection readers come later and must match this behavior.
* Inspired by: lab/research/R3-artifacts/api-sketch.ts sections 3-4; R3 report section 5;
* docs/agents.md rule 1 (one application command is one `transact`).
* Rejected: caller-asserted row generics; `null` for absent values (D5).
*
* Status: interface only. Every behavior is deferred to EXP-R02, which tests it against reviewed
* golden vectors (adversarial review round 3, finding 5). Effectful stubs die with
* `NotImplementedError`; pure stubs throw it.
*/
var Repository_exports = /* @__PURE__ */ __exportAll({
	commit: () => commit,
	make: () => make,
	writer: () => writer
});
/** Build a repository for `model` over the `Triples` service. Deferred to EXP-R02. */
const make = (model, _options = {}) => Effect.succeed(stubRepository(model));
const die = (feature) => Effect.die(notImplemented(feature));
const stubRepository = (model) => ({
	model,
	at: () => stubRepository(model),
	get: () => die("Repository.get"),
	getMany: () => die("Repository.getMany"),
	find: () => die("Repository.find"),
	count: () => die("Repository.count"),
	timeline: () => die("Repository.timeline")
});
/** Build a writer for `model`. Deferred to EXP-R02. */
const writer = (model) => ({
	model,
	create: () => {
		throw notImplemented("Writer.create");
	},
	patch: () => die("Writer.patch"),
	addValue: () => {
		throw notImplemented("Writer.addValue");
	},
	removeValue: () => die("Writer.removeValue")
});
/** Merge plans and perform exactly one `Triples.transact`. Deferred to EXP-R02. */
const commit = (_plans, _meta) => die("commit");
//#endregion
export { Repository_exports, commit, make, writer };

//# sourceMappingURL=Repository.js.map