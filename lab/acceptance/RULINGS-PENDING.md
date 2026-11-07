# Rulings recorded but not yet compiled (Q38c: RULINGS.md holds only compiled or explicitly listed entries)

These move into RULINGS.md when the contract version that compiles them is built.

## Q50: EXP-P2Q open questions
| Q | Ruling | Basis |
| --- | --- | --- |
| Q50a replica unreachable (open question 2) | Entity and repository pulls fall back to the broker's own record when the replica is unreachable (TARGETS 4.1: the source of truth's own query surface is an eligible fallback). The cheap way is a broker-side current-entity index, which is also a candidate current-index layer for P4 (per-subject current document served from the host, QLever kept for history and analytics); EXP-Q05 builds and measures it. | TARGETS 4.1 items 4-6; P4 |
| Q50b native and Datalog reads beyond the watermark (open question 3) | Native SPARQL and Datalog reads at a basis the replica has not reached wait within the read's deadline (Q31d's 10 ms, extended to the request's own timeout for native queries that name an explicit basis) and then fail with a typed `BasisNotAvailable` error, never an untyped failure; repository reads use the overlay or the broker. Read-your-own-write is a repository-pull guarantee. | Q31d, Q31e |
| Q50c write amplification (open question 4) | Measure and reduce triples per command on QLever (about 750 per 10-fact command against R17's 94): the journal encoding is the first suspect. Owner: EXP-Q05 with EXP-R02. | P2, delta growth |
| Q50d hardening (open question 5) | Required before promotion of the broker composition: an overlay memory bound with backpressure (typed `Overloaded` beyond the bound) for GS.04b-style replica outages, segment rotation with checkpoints, a kernel file lock (flock) in addition to the epoch and marker guard. Out-of-process broker and off-device copies are deferred. | GS.04b; C3 fencing |
| Q50e measurement (open questions 1, 6) | The exclusive-slot run list (A0 and candidate at delta 0/100k/500k, persist-updates off, kill -9 replay, rebuild trigger cost, full trace with burst against QLever, keep-alive recheck on an idle slot) joins the QLever exclusive queue first. | Q47b matched controls |

## Q51: EXP-P2X open questions
| Q | Ruling | Basis |
| --- | --- | --- |
| Q51a hot subjects | Accepted for every lane: a per-subject FIFO queue in the runtime's command router (bounded; typed `Overloaded` beyond the bound, never an unbounded wait) and same-subject group commit (up to 8 queued commands of one subject in one engine transaction, positions by ordinal). Optimistic CAS stays for cross-node races. The queue is part of the candidate, not the driver. | P2 progress (accounting is not progress); trace hot subject 20% |
| Q51b feed lag on XTDB | The next XTDB P2/P3 experiment puts XTDB behind the same host log and broker as EXP-P2Q (EXP-P2B: XTDB as the replica, current and history layer), since that composition measured feed lag p99 12.8-24.5 ms and an ACK independent of the engine. The subject-stamp path stays the XTDB-native arm (A1) to compare against; a separate consumer database through ATTACH is not pursued unless P2B fails. | both engines stay candidates for every layer; fewer moving parts |
| Q51c positions bound after commit | Accepted: the core binds a transaction's position after the source of truth publishes it; positions become an opaque, totally ordered value (bigint), so adapters stop returning placeholders and the 8-ordinal packing limit goes away. Lands with the broker's engine-agnostic extraction (EXP-P2B), on both lanes. | Q31c |
| Q51d bytes per commit | One cross-lane experiment (EXP-J01) measures bytes and triples per 10-fact command on both lanes (XTDB A0 27,581 bytes, candidate 95,364; QLever A0 about 750 triples against R17's 94) and cuts the journal and parameter encoding. Q50c is folded into it. | P2, storage per commit |
| Q51e 100k rung | Deferred until EXP-J01 lands; re-estimate the disk need from the new bytes per commit before asking for a large slot. | disk budget 50 GiB |
| Q51f untested items | `lab/bin/engine.mjs` gains a `kill` verb (SIGKILL the engine process) so F3 can be tested engine-side on both lanes. A scope written by both commit paths at once is refused with a typed error at runtime, not left unsupported. xt.txs and METADATA cost at 1M+ transactions joins the EXP-J01 measurement list. | Q31c F3 |

## Q52: EXP-O04 residual erasure and decimal questions (provisional, under the Q24 flag for Sam)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q52a COUNT over erased values | A count of distinct values counts an attribute's erased values as one value (the marker group of Q49c), the same as GROUP BY; a count of assertions counts each erased assertion. | Q49c grouping |
| Q52b ORDER BY with erased and missing values | Readable values first, then erased markers (by assertion id), then missing values, in both directions. | present before absent |
| Q52c erasedAt of a marker group | The group's marker reports the earliest erasedAt among its members. | deterministic answers |
| Q52d ReferenceTarget over an erased reference | An erased reference takes no part in reference constraints: it blocks no restrict delete, cascades nothing and is skipped by ReferenceTarget validation, because enforcing it would need the erased value. | Q24 |
| Q52e computed answers over in-flight values | An erasure commit is atomic for readers: a read that started before it published sees either all of that commit's values as they were or all as markers, never a mix; the oracle accepts exactly those two whole answers. This narrows Q49d from per value to per commit. | Q49d |
| Q52f toDecimal(json, p, s, rounding) | The named mode (half-even, half-up or down, Q22) applies to the JSON number's as-written decimal reading (Q49e); without a rounding argument, excess digits are E-DECIMAL-FRACTION. | Q22, Q49e |
| Q52g erase command shape | The op is spelled `erase`; `erasure` is a typed invalid-command error. An erase is its own command: mixing it with other ops, or giving it preconditions, is a typed invalid-command error. | Q49a |

## Q53: W0 SPEC-AMBIGUITY readings from EXP-D01c
| Q | Ruling | Basis |
| --- | --- | --- |
| Q53a readings A01-A10 | Accepted as written in lab/experiments/EXP-D01c-o-domain/REPORT.md. They change no golden case and no fingerprint value. | W0-1.1.1 outputs unchanged |
| Q53b fold into W0 | W0-1.1.2 adds them to SPEC.md as clarifications and adds one golden case per reading (A10 is already exercised by the population), so the TypeScript kernel (EXP-D01b) and O-DOMAIN are held to the same reading. Every existing case and the fingerprint must stay byte-identical; V-D01c checks that. Until W0-1.1.2 lands, the W0 pin covers W0-1.1.1 with these readings recorded. | Q31i (two independent implementers) |

## Q54: EXP-A01 contract 0.3.7 questions
| Q | Ruling | Basis |
| --- | --- | --- |
| Q54a third blocked obligation | Keep G7.migration.valid-writes-never-rejected blocked by the CS-MIGRATION:* reach: a valid-write migration case can redeclare a decimal attribute. Narrow the reach once the CS-MIGRATION manifest tags its decimal-redeclaring cases, or once O-REPLAY models R-DEC-15. | Q47c |
| Q54b no reach for two selections | Confirmed: CS-REQ:no-silent-precision-loss and CS-TYPES8:decimal get no reach, because neither redeclares a scale. | Q47c |
| Q54c 0.3.8 content | 0.3.8 compiles Q50 to Q54; Q52e replaces the 0.3.7 ERASURE inFlight text (per commit, not per value). | Q47d |
| Q54d control production | Confirmed: tree and composition come from A0_REGISTRY; the control receipt is a fresh harness run at the claim's commit; the registry commit is the A0 code commit. EXP-E01 does the same. | Q47b, Q46b |
| Q54e record schemas | build-manifest/1, verifier-record/1 and case-result/1 are adopted as written in 0.3.7; EXP-E01 conforms and proposes any change for 0.3.8. | Q47a |

## Q55: Codex round 7 on contract 0.3.7
| Q | Ruling | Basis |
| --- | --- | --- |
| Q55a qualification is a run, not a document | A QUALIFIED verdict comes only from a run the evaluator (lab/bin/claim.mjs) executes itself at the claimed commit: it builds the declared source tree (and A0 from the registry's tree and commit) and records its own build hashes; it resolves cases from the pinned manifests (every case and mode in each selected set; a claimant's `selection` or case list is ignored); it runs the system under test through the gate on a registered slot; it computes every expected answer by running the pinned oracle on the pinned input and applies the declared comparator. Records an experiment supplies are DIAGNOSTIC evidence only. Independent verification counts only through a contract-held VERIFIER_REGISTRY entry (verifier id, brief hash, branch, commit, verdict), added by a reviewed contract version, never by a record in a claim. | round 7 findings 1, 2 |
| Q55b source and replica publication | QT4 splits into QT4s (the source of truth's decision is durable and its own read surface answers at that position: the broker's log reader or overlay, or the engine itself when the engine is the source) and QT4r (the replica's marker has reached the position). ACK is allowed after QT4s (Q31e). Every composition declares its source implementation; the receipt binds the broker or log identity and its durability configuration (fsync mode, F_FULLFSYNC, device) next to engine identities. Each protocol variant (engine as source; host log as source with an engine replica) has its own witnessed transition table in G7.commit.protocol-transitions. | round 7 finding 5; Q31e |
| Q55c per-surface read guarantees (provisional, flagged for Sam) | Repository pulls: read-your-own-write by routing (replica, else overlay, else the source's log), never below the caller's basis; with the replica unreachable they fall back to the source (Q50a). Native SPARQL, XTQL, SQL and Datalog: every answer reports the basis it was computed at; with a basis token it is never below that basis (wait within the request deadline, then typed BasisNotAvailable); without one it answers at the replica's watermark and reports that position; with the replica unreachable it fails typed ReplicaUnavailable. No surface may present an answer as at a basis it was not computed at. NS.P2 and G7.composition.ack-and-routed-ryow test each surface the composition claims; this supersedes Q50b's wording. | round 7 finding 6; the goal's "raw native queries still make sense" |
| Q55d P3 lag from source publication | P3 lag is measured from the source's own publication timestamp for each position (the broker's durable watermark update, or the engine's commit resolution when the engine is the source), recorded by the source independently of ACK delivery, to the consumer's durable record. Every committed position is accounted (no sample dropped for a missing ACK; missing ones are counted and fail the run). EXP-P2Q's ACK-to-consumer figure is not the contracted measurement until recomputed. | round 7 finding 7 |
| Q55e domain fingerprint | Confirmed: the O-DOMAIN fingerprint pin changes only by a reviewed contract version; the evaluator owns the function argument and a claim cannot supply it. | round 7 finding 8 |

## Q56: V-O04b findings on O-REPLAY 0.4.1 (provisional, under the Q24 flag for Sam)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q56a unknown erase target (F3) | "Matches nothing" in Q49b means a well-formed entity or entity-plus-attribute selector with no assertions to erase, which commits with an empty change list. An erase naming an unknown assertion `target` or an unknown `id` is E-INVALID-VALUE, the same as retract (Q33f). | Q33f, Q49b |
| Q56b card-one with a readable and an erased value (F4.1) | An erased value is still a present assertion, so a card-one attribute holding a readable value and an erased value conflicts (E-CONFLICTING-VALUES) exactly as two readable values would; the remedy is to retract the erased assertion. | Q49c "present" |
| Q56c one of two equal supports erased (F4.2) | Answers after an erasure never depend on the erased value. A card-one attribute with a readable "SAME" and an erased support conflicts whatever the erased value was, so the read is E-CONFLICTING-VALUES even though the value read "SAME" before the erasure; returning "SAME" would reveal that the erased value equalled it. | TARGETS 7; Q24 |
| Q56d card-many marker position (F4.3) | In a card-many value list, erased markers come after the readable elements, ordered by assertion id, the same as ORDER BY (Q49c). | Q49c |
| Q56e Required over an erased value (F4.4) | Required is satisfied by an erased value, because the assertion is present. | Q49c |
| Q56f the `id` selector (F4.5) | Erase accepts the same selectors as retract, including `{"id": ...}`; SCHEMA.md documents it in 0.4.2. | Q33f |
| Q56g retract after erase (F4.6) | Retracting an already erased assertion by target commits; history shows the marker with the retraction's time. Erase then delete is a supported flow. | Q24 |
| Q56h synthetic values only (N1) | In-flight outputs list the old value as acceptable (Q49d), so oracle outputs can hold the pre-erasure value. Every oracle case, fixture and golden scenario uses synthetic values only; no real personal data enters the lab. | Q49d |
| Q56i pin | With Q56a-g ruled as the oracle answers, O-REPLAY 0.4.1 (a9c1327) pins unchanged once V-O04b converts its seven DERIVED-NOTE probes into checked probes and they pass. 0.4.2 adds Q52 and the SCHEMA.md note. | Q46d nextPin |
