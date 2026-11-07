1. **Critical — R6-1: PARTIAL. Valid schemas still admit invented evidence.**  
   I constructed records with invented case IDs, `selection:"all"`, `oracleExit:0`, and identical expected/observed objects containing `[]`. Every record passed `open_record` and `case_verdict`. No engine, oracle or independent verifier ran.

   With a simulated evaluator-frozen A0 entry and the actual oracle pins, the complete claim returned **QUALIFIED**. The real null A0 registry correctly returns DIAGNOSTIC.

   The remaining holes are concrete:

   - `case_verdict` compares two supplied hashes; it never establishes that the expected object came from the pinned oracle evaluating the pinned input. [build_contract.py:1283](/Users/sam/projects/triplex-db-2/lab/acceptance/build_contract.py:1283)
   - One invented case can cover an entire selector through its supplied `selection` field. [build_contract.py:1323](/Users/sam/projects/triplex-db-2/lab/acceptance/build_contract.py:1323)
   - Retaining arbitrary module bytes does not establish their relationship to the declared source tree. A verifier name and ACCEPT string do not establish independent verification.

   **Change:** resolve pinned manifests, require complete case × mode coverage, recompute expected answers with the accepted oracle, apply the declared comparator, and validate build/verifier provenance. Land EXP-E01; the checkout still contains its brief rather than `lab/bin/claim.mjs`.

2. **Major — R6-5: PARTIAL. Registry matching works; control provenance remains forgeable.**  
   An explicitly unregistered control tree was rejected. Missing workload fields also cannot match anymore. [build_contract.py:1357](/Users/sam/projects/triplex-db-2/lab/acceptance/build_contract.py:1357)

   However, my fabricated candidate binary qualified as the control when another manifest labelled it with the registered A0 tree. **Change:** independently verify the registered source-to-build relationship, rather than accepting that relationship from manifest labels. This is part of finding 1, not another registry-field requirement.

3. **Major — R6-6: CLOSED for the identified refusals.**  
   CS-MIGRATION and CS-WIDEN now propagate decimal-redeclaration refusal; my migration claim returned DIAGNOSTIC. Genuine retained exit-2/X-NOT-MODELED records are rejected. [build_contract.py:1428](/Users/sam/projects/triplex-db-2/lab/acceptance/build_contract.py:1428)

   I found no genuine refusal surviving `case_verdict`. Inventing or omitting the oracle execution remains finding 1.

4. **Minor — R6-7: CLOSED; no pending-authority path found.**  
   Regeneration verifies byte-identically. Pending IDs and their file hash are recorded with authority `none`; their text is not compiled into admission or closure rules. [build_contract.py:2840](/Users/sam/projects/triplex-db-2/lab/acceptance/build_contract.py:2840)

   Q50–Q53 therefore cannot excuse a failed current gate. In particular, Q50b’s narrower RYOW guarantee and longer native-query wait are **pending changes**, not existing contract semantics.

5. **Critical — The fault contract still confuses source publication with replica publication.**  
   Q31e permits ACK after the source is durably published and readable. A host log plus eligible overlay/log reader can satisfy that before QLever applies the frame.

   But the transition table defines QT4 through a query-visible publication marker and forbids success before QT4. [ACCEPTANCE.md:1111](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1111), [ACCEPTANCE.md:1126](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1126)

   Consequently, **G7.commit.protocol-transitions can reject a correct broker ACK** merely because its replica is behind. Relabelling log durability as the existing QT4 would instead weaken the marker evidence.

   **Change:** declare the source implementation explicitly and separate durable decision, source-readable publication and replica application. Bind broker/log identities and durability configuration alongside engine identities. Give each protocol variant its own witnessed transitions.

6. **Major — P2 repository RYOW does not establish all-surface current reads.**  
   **NS.P2 can pass** through repository overlays while ordinary native SPARQL still reads a lagging replica. Its success cannot establish the stronger native-surface guarantee in **G7.composition.ack-and-routed-ryow**. [ACCEPTANCE.md:2212](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:2212)

   The report explicitly leaves replica-unreachable pulls unresolved and reports a two-second Datalog wait followed by error. [REPORT.md:38](/Users/sam/projects/triplex-db-2/lab/experiments/EXP-P2Q-qlever-log-broker/REPORT.md:38) These are real gaps under the current contract.

   **Change:** freeze the guarantee per surface before comparison claims. Test replica-down fallback and require native/current reads to use the source’s published head, or enforce the explicitly approved alternative semantics. Pending Q50b cannot silently narrow the requirement.

7. **Major — The reported feed latency is not the contracted P3 measurement.**  
   P2Q reports **ACK-to-consumer** lag. [REPORT.md:29](/Users/sam/projects/triplex-db-2/lab/experiments/EXP-P2Q-qlever-log-broker/REPORT.md:29) NS.P3 requires **source-publication-to-durable-consumer** lag. [ACCEPTANCE.md:2732](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:2732)

   Delayed ACK delivery can understate lag; a consumer completing before the ACK is recorded can lose its timing sample. The branch harness explicitly counts `missingAck` while omitting those samples.

   **Change:** retain source-publication timestamps independently of ACK receipt and account for every committed position. Recompute before claiming the P3 bar. The shared-resident results also lack the frozen A0/full reader profile needed for qualified comparisons.

8. **Major — Domain blocking works in the current reference model.**  
   All **26 obligations declaring O-DOMAIN** remained DIAGNOSTIC with the actual null fingerprint, even with other prerequisites simulated as satisfied and a claimant-supplied fingerprint inserted into the claim.

   The claim body cannot change the contract’s W0 pin. Pinning requires a reviewed contract-version change; the optional function argument must remain evaluator-owned in EXP-E01. [build_contract.py:1368](/Users/sam/projects/triplex-db-2/lab/acceptance/build_contract.py:1368), [build_contract.py:1582](/Users/sam/projects/triplex-db-2/lab/acceptance/build_contract.py:1582)

**NOT READY for generation-2 comparisons.** Minimum changes:

- Finish evidence-backed admission, including pinned selection, oracle, build and verifier provenance.
- Reconcile broker source publication, replica application and per-surface read guarantees.
- Register verified A0 controls and measure P3 from source publication with complete accounting.

The domain fingerprint may remain null while domain claims stay blocked.