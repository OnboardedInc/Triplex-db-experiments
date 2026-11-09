import { Brand, Schema } from "effect";

//#region src/content/ContentId.d.ts
declare namespace ContentId_d_exports {
  export { ContentId, ContentIdSchema, Domain, hash, isContentId, short };
}
type ContentId = string & Brand.Brand<"ContentId">;
/** Stable domain separators shared by Triplex's content-addressed models. */
declare const Domain: {
  readonly entitySnapshot: "triplex/entity-snapshot";
  readonly configNode: "triplex/config-node";
  readonly configRevision: "triplex/config-revision";
  readonly configSnapshot: "triplex/config-snapshot";
  readonly configClosure: "triplex/config-closure";
  readonly configStamp: "triplex/config-stamp";
  readonly typeExpr: "triplex/type";
  readonly boolExpr: "triplex/expression";
  readonly evaluation: "triplex/evaluation";
  readonly decision: "triplex/decision";
  readonly validationResult: "triplex/validation-result";
  readonly validationViolation: "triplex/validation-violation";
  readonly validationRun: "triplex/validation-run";
  readonly validationState: "triplex/validation-state";
  readonly observationClosure: "triplex/observation-closure";
  readonly observationValue: "triplex/observation-value";
  readonly derivationDefinition: "triplex/derivation-definition";
  readonly derivationIdentity: "triplex/derivation-identity";
  readonly derivationCandidate: "triplex/derivation-candidate";
  readonly derivationRun: "triplex/derivation-run";
  readonly derivationOverlayFact: "triplex/derivation-overlay-fact";
  readonly commandReceipt: "triplex/command-receipt";
  readonly consumerCheckpoint: "triplex/consumer-checkpoint";
  readonly paginationCursor: "triplex/pagination-cursor";
  readonly paginationScope: "triplex/pagination-scope"; /** [EXP-R01] Compiled entity projection spec (physical names, declared types, exactness). */
  readonly projectionSpec: "triplex/projection-spec";
};
type Domain = (typeof Domain)[keyof typeof Domain];
declare const ContentIdSchema: Schema.Codec<ContentId, string>;
/**
 * Hash `payload` within `domain`. `domain` names the kind of thing being
 * hashed (`"triplex/config-node"`, `"triplex/config-closure"`) and is length-
 * prefixed so no two domains can produce the same pre-image.
 */
declare const hash: (domain: string, payload: string) => ContentId;
declare const isContentId: <I>(input: I) => input is I & string & Brand.Brand<"ContentId">;
/** First 12 hex chars, for logs and UI. Never for equality. */
declare const short: (id: ContentId) => string;
//#endregion
export { ContentId, ContentIdSchema, ContentId_d_exports, Domain, hash, isContentId, short };
//# sourceMappingURL=ContentId.d.ts.map