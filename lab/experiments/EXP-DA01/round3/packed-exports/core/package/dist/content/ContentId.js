import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { hex } from "./Sha256.js";
import { Schema } from "effect";
//#region src/content/ContentId.ts
/**
* A content id: the SHA-256 of a canonically encoded value, rendered as
* `sha256-<64 lowercase hex>`.
*
* The algorithm is in the string on purpose. Content ids are written to the
* database and compared across deploys, so the day SHA-256 has to be replaced
* the two generations must be able to coexist in one column rather than
* requiring a flag day; a bare hex digest could not tell them apart.
*
* Every hash is domain-separated by a caller-supplied tag. Without it the
* digest of a node body and the digest of an arbitrary string blob live in the
* same space, and a value crafted to look like an encoded node could be passed
* off as one.
*
* The hash itself is `Sha256`, not `node:crypto`, so this module works in the
* browser. The configuration kernel has to decode and validate the same
* declarations on the server, in the authoring UI, in the CLI and in tests, and
* a Node-only identity function would force a second implementation of the one
* thing that must never have two.
*/
var ContentId_exports = /* @__PURE__ */ __exportAll({
	ContentIdSchema: () => ContentIdSchema,
	Domain: () => Domain,
	hash: () => hash,
	isContentId: () => isContentId,
	short: () => short
});
/** Stable domain separators shared by Triplex's content-addressed models. */
const Domain = {
	entitySnapshot: "triplex/entity-snapshot",
	configNode: "triplex/config-node",
	configRevision: "triplex/config-revision",
	configSnapshot: "triplex/config-snapshot",
	configClosure: "triplex/config-closure",
	configStamp: "triplex/config-stamp",
	typeExpr: "triplex/type",
	boolExpr: "triplex/expression",
	evaluation: "triplex/evaluation",
	decision: "triplex/decision",
	validationResult: "triplex/validation-result",
	validationViolation: "triplex/validation-violation",
	validationRun: "triplex/validation-run",
	validationState: "triplex/validation-state",
	observationClosure: "triplex/observation-closure",
	observationValue: "triplex/observation-value",
	derivationDefinition: "triplex/derivation-definition",
	derivationIdentity: "triplex/derivation-identity",
	derivationCandidate: "triplex/derivation-candidate",
	derivationRun: "triplex/derivation-run",
	derivationOverlayFact: "triplex/derivation-overlay-fact",
	commandReceipt: "triplex/command-receipt",
	consumerCheckpoint: "triplex/consumer-checkpoint",
	paginationCursor: "triplex/pagination-cursor",
	paginationScope: "triplex/pagination-scope",
	projectionSpec: "triplex/projection-spec"
};
const ContentIdSchema = Schema.String.check(Schema.isPattern(/^sha256-[0-9a-f]{64}$/, { message: "Expected a content id of the form sha256-<64 hex chars>" })).pipe(Schema.brand("ContentId"));
/**
* Hash `payload` within `domain`. `domain` names the kind of thing being
* hashed (`"triplex/config-node"`, `"triplex/config-closure"`) and is length-
* prefixed so no two domains can produce the same pre-image.
*/
const hash = (domain, payload) => {
	return `sha256-${hex(`${domain.length}:${domain}:${payload}`)}`;
};
const isContentId = Schema.is(ContentIdSchema);
/** First 12 hex chars, for logs and UI. Never for equality. */
const short = (id) => id.slice(7, 19);
//#endregion
export { ContentIdSchema, ContentId_exports, Domain, hash, isContentId, short };

//# sourceMappingURL=ContentId.js.map