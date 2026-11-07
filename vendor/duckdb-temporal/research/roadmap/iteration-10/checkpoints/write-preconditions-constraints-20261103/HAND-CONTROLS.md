# Twenty hand controls for a future write mapping

Every control is an unexecuted source-derived specification. No model, fixture, product or conformance test was run. These controls select no adapter implementation or executable action. P01–P10 concern the pinned write boundary; G01–G10 concern the opt-in graph projection.

## Write preconditions and operation order

### P01 Explicit conditional retract

Declare TripleLive(X) but supply only a retract-pattern that would match X. Predict structural WriteError because only an explicit retract X satisfies validatePreconditions. The existence of X does not change this result.

### P02 Stale conditional retract

Retract X with TripleLive(X), where X is already retracted or absent, alongside an assertion Y. Predict TransactionConflictError and an obligation that Y, the claim, position and journal do not commit. This is the contract expectation, not an observed rollback.

### P03 Unconditioned missing retract

Supply the same missing retract X without TripleLive. Predict retracted count zero rather than the conditional conflict in P02. The current product strict stale-retraction path is not equivalent.

### P04 Entity ID order and multiplicity

An entity's unretracted IDs are A and B. EntityState([B,A]) predicts success; EntityState([A,A,B]) predicts mismatch because the actual comparison sorts but does not deduplicate expected IDs. The schema's Array declaration does not enforce a mathematical-set uniqueness property.

### P05 Recorded versus valid-now identity

An entity has one unretracted fact with valid interval [20,30), and the command clock is 10. EntityState([]) predicts mismatch and EntityState([that ID]) predicts success on the inspected omitted-basis SQL path. Repeat with an unretracted expired [0,5) fact. A valid-now read cannot be substituted for the identity capture.

### P06 Narrow empty-entity absence

An entity has no unretracted facts. EntityState([]) followed by a new assertion predicts a matching pre-state. If a competing committed fact exists before this comparison, predict conflict. This controls complete entity identity under the serialized transaction contract; it does not claim arbitrary attribute or graph-predicate absence.

### P07 State checked before own writes

Observe entity IDs [A], then submit EntityState([A]) and an assertion B on the same entity. Predict that the precondition compares [A] before B is applied. Including future B in the expected list predicts mismatch.

### P08 Ordered assertion and pattern retraction

Compare commands [assert X, retract-pattern matching X] and [retract-pattern matching X, assert X] on otherwise empty matching storage. The first assertion batch is flushed before its pattern read. Predict different final live facts. Preserve ordered application, the corresponding assertion/retraction changes and returned assertion identities. This does not promise stable operation order in a reconstructed journal array. This control must be selected against the adapter's supported pattern/value path; the product's unconditional retractions-first API cannot represent the distinction directly.

### P09 Guarded fact consumed inside the command

Start with live X. Submit a matching retract-pattern before explicit retract X with TripleLive(X). Predict that correspondence validation succeeds but the later explicit retract conflicts because the pattern already consumed X. Two explicit guarded retracts of X similarly predict conflict on the second. The conditional check is not merely an entry-time existence test.

### P10 Standalone helper error after a no-op transaction

Compare transact([retract missing X]) with standalone retract(X). The former predicts retracted zero and a successful position/envelope. The standalone helper then predicts WriteError after that transaction returns. Do not classify every helper error as rollback or a never-allocated position. No such command was run here.

## Temporal graph projection

For the graph controls, use valid non-reserved IDs, valid rule/value shapes, and source facts whose entityType membership covers the stated interval. All intervals are half-open.

### G01 Equal assertions still consume cardinality

One typed subject has two separate live assertions of identical value at attribute a. Cardinality(a,max=1) predicts actual 2. A DISTINCT value query predicting one scalar is the wrong count.

### G02 Repeated rows on one uniqueness claimant

The same subject has those two equal values. Unique(a) alone predicts one claimant, not a conflict. Add the same typed storage value on a second typed subject and predict two subject findings with actual 2.

### G03 Tagged uniqueness identity

Different subjects claim string("x") and ref("x") at a. Predict distinct uniqueness keys even though a flattened Datalog value join can equate the text. Likewise, equal blob content IDs with different retained metadata are not silently merged by this key.

### G04 Reference type and temporal target existence

A source's a holds string("target") and the target has a visible fact with entityType Target. ReferenceTarget(a,Target) still predicts a violation because the source value is not ref-tagged. Replace it with ref("target") and predict no finding only at instants where the typed target fact is visible.

### G05 Future overlap

At command instant 5 a subject has one a row valid [0,20). Assert another a row valid [10,30), enforcing max 1. Predict a new violation at validAt 10 even though only one row is visible at the command instant. A now-only check misses it.

### G06 Adjacent intervals

Use a rows valid [0,10) and [10,20) under max 1 with source type membership across both. Predict no overlap violation at 10: the first interval has ended and the second has begun.

### G07 Unchanged existing violation

A subject already has two a rows across [0,20) under max 1. Add an unrelated attribute b without altering a or subject membership. Predict no newlyViolated finding for that unchanged identity/count. Enforcement is not a clean-graph audit.

### G08 Worsening versus partial repair

Start with three a rows under max 1. Removing one predicts no new/worsened cardinality finding even though actual remains 2. Adding a fourth predicts rejection for increased actual. This is an unexecuted before/after derivation.

### G09 Violation identity must survive comparison

Repair a missing required a on subject S but introduce the same missing requirement on new subject T. A global finding count can stay one, yet T's new identity predicts rejection. The same applies to a new uniqueness value identity rather than an increased total alone.

### G10 Fact-based subject membership

The only visible typed fact makes entity S a subject and carries required attribute a. Retract that last typed fact, leaving no visible type-carrying fact on S. Predict that S leaves the rule's subject set, rather than persisting as an externally registered entity with a missing a. Host entity-lifecycle policy must be a separate guarantee.

## Admission qualifications

The declared schema admits two precondition tags and four graph-rule tags. Direct service helpers are not a proof of full schema decoding. Malformed preconditions/rules, reserved writes, canonical encoding failures, concurrency, interruption, crash/restart and capacity behavior require separately selected controls. Predictions above are not passed tests or a conformance score.
